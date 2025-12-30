// app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { TaskModel, OrderModel, SentOrderModel, BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('Starting metrics API request...');
    
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }
    
    // Ensure database connection is established
    console.log('Connecting to database...');
    await connectToDatabase();
    
    console.log('Database connection established');
    
    // Get the authenticated user's branch from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token found" },
        { status: 401 }
      );
    }

    // Verify the session and get user info
    const verifyRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify`, {
      headers: {
        Cookie: `token=${token}`
      }
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    const userData = await verifyRes.json();
    const userBranch = userData.user?.branch;

    if (!userBranch) {
      return NextResponse.json(
        { error: "User branch not found" },
        { status: 400 }
      );
    }

    // Get branch details for display and get the actual branch name
    const branchDetails = await BranchModel.findById(userBranch).select('name type location');
    const branchName = branchDetails?.name || 'Unknown Branch';
    const branchType = branchDetails?.type || 'Unknown';
    const branchLocation = branchDetails?.location || 'Unknown Location';

    // Use the branch name for database queries since Orders and Tasks store branch as string
    const userBranchName = branchName;

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // 1. ALL REVENUE: Calculate revenue from ORDERS (only count advance payments when order is created)
    const allRevenueAgg = await OrderModel.aggregate([
      {
        $match: {
          orderDate: { $gte: thirtyDaysAgo },
          branch: userBranchName,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { 
              $cond: {
                if: { $ne: ["$advancePayment", null] },
                then: { $toDouble: "$advancePayment" },
                else: { $toDouble: "$totalPrice" }
              }
            },
          },
        },
      },
    ]);
    const allRevenue = allRevenueAgg[0]?.totalRevenue || 0;

    // 2. COMPLETED ORDERS REVENUE: Calculate revenue from COMPLETED TASKS (count remaining amount after advance payment)
    const completedOrdersRevenueAgg = await TaskModel.aggregate([
      {
        $match: {
          startTime: { $gte: thirtyDaysAgo },
          status: "Completed",
          branch: userBranchName,
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "orderId",
          as: "orderInfo"
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: {
                if: { $ne: ["$totalPrice", null] },
                then: {
                  $let: {
                    vars: {
                      totalPrice: { $toDouble: "$totalPrice" },
                      advancePayment: { 
                        $cond: {
                          if: { $and: [{ $isArray: "$orderInfo" }, { $gt: [{ $size: "$orderInfo" }, 0] }] },
                          then: { $toDouble: { $arrayElemAt: ["$orderInfo.advancePayment", 0] } },
                          else: 0
                        }
                      }
                    },
                    in: { $subtract: ["$$totalPrice", "$$advancePayment"] }
                  }
                },
                else: {
                  $cond: {
                    if: { $and: [{ $ne: ["$productPrice", null] }, { $ne: ["$productQuantity", null] }] },
                    then: {
                      $let: {
                        vars: {
                          calculatedPrice: { $multiply: [{ $toDouble: "$productPrice" }, { $toDouble: "$productQuantity" }] },
                          advancePayment: { 
                            $cond: {
                              if: { $and: [{ $isArray: "$orderInfo" }, { $gt: [{ $size: "$orderInfo" }, 0] }] },
                              then: { $toDouble: { $arrayElemAt: ["$orderInfo.advancePayment", 0] } },
                              else: 0
                            }
                          }
                        },
                        in: { $subtract: ["$$calculatedPrice", "$$advancePayment"] }
                      }
                    },
                    else: 0
                  }
                }
              }
            },
          },
        },
      },
    ]);
    const completedOrdersRevenue = completedOrdersRevenueAgg[0]?.totalRevenue || 0;
    
    // Debug logging for completed orders revenue calculation
    console.log('Completed Orders Revenue Calculation:', {
      userBranchName,
      completedOrdersRevenueAgg,
      completedOrdersRevenue,
      sampleTask: await TaskModel.findOne({
        startTime: { $gte: thirtyDaysAgo },
        status: "Completed",
        branch: userBranchName
      }).select('totalPrice productPrice productQuantity orderId status branch')
    });

    // 3. Total Orders: count of all orders in the last 30 days
    const totalOrders = await OrderModel.countDocuments({
      orderDate: { $gte: thirtyDaysAgo },
      branch: userBranchName,
    });

    // 4. New Customers: count of unique customers from orders in the last 30 days
    const newCustomers = (
      await OrderModel.distinct("customerEmail", {
        orderDate: { $gte: thirtyDaysAgo },
        branch: userBranchName,
        customerEmail: { $exists: true, $ne: "" }
      })
    ).length;

    // 5. Growth Rate: comparing orders in current 30 days vs previous 30 days
    const previous30Days = new Date();
    previous30Days.setDate(thirtyDaysAgo.getDate() - 30);
    const previousOrders = await OrderModel.countDocuments({
      orderDate: { $gte: previous30Days, $lt: thirtyDaysAgo },
      branch: userBranchName,
    });
    const growthRate =
      previousOrders > 0
        ? (((totalOrders - previousOrders) / previousOrders) * 100).toFixed(1)
        : "N/A";

    // 6. Total Waste: sum of waste from completed tasks in the last 30 days
    const wasteAgg = await TaskModel.aggregate([
      {
        $match: {
          startTime: { $gte: thirtyDaysAgo },
          status: "Completed",
          branch: userBranchName,
          totalWaste: { $exists: true, $ne: null }
        },
      },
      {
        $group: {
          _id: null,
          totalWaste: {
            $sum: { $toDouble: "$totalWaste" },
          },
        },
      },
    ]);
    const totalWaste = wasteAgg[0]?.totalWaste || 0;

    // 7. Additional metrics for debugging
    const debugInfo = {
      allRevenue,
      completedOrdersRevenue,
      ordersCount: totalOrders,
      completedTasksCount: await TaskModel.countDocuments({
        startTime: { $gte: thirtyDaysAgo },
        status: "Completed",
        branch: userBranchName,
      }),
      totalTasksCount: await TaskModel.countDocuments({
        startTime: { $gte: thirtyDaysAgo },
        branch: userBranchName,
      }),
      userBranchName,
      userBranchId: userBranch,
      calculationMethod: "Using totalPrice for completed tasks, fallback to productPrice * productQuantity",
      sampleCompletedTask: await TaskModel.findOne({
        startTime: { $gte: thirtyDaysAgo },
        status: "Completed",
        branch: userBranchName,
        totalPrice: { $exists: true, $ne: null }
      }).select('totalPrice productPrice productQuantity orderId')
    };

    // Add console logging for debugging
    console.log('Metrics API Debug Info:', {
      userBranch,
      userBranchName,
      branchName,
      allRevenue,
      completedOrdersRevenue,
      totalOrders,
      newCustomers,
      debugInfo
    });

    return NextResponse.json({
      allRevenue,
      completedOrdersRevenue,
      totalOrders,
      newCustomers,
      growthRate,
      totalWaste,
      userBranch: userBranch,
      branchName,
      branchType,
      branchLocation,
      debugInfo,
    });
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    
    // Check for specific database connection errors
    if (error.name === 'MongoNotConnectedError' || error.message?.includes('Client must be connected')) {
      console.error('Database connection failed:', error.message);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
