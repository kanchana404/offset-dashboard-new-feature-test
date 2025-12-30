// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { TaskModel, OrderModel, BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('Starting sales API request...');
    
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

    // Use the branch name for database queries since Orders and Tasks store branch as string
    const userBranchName = branchName;

    // Create dates at the start of the day to avoid timezone issues
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 days total including today
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of that day
    
    // For debugging: also check if we should extend the range
    console.log('Date Range Debug:', {
      today: today.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      todayFormatted: today.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      sevenDaysAgoFormatted: sevenDaysAgo.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      todayLocal: today.toLocaleString(),
      sevenDaysAgoLocal: sevenDaysAgo.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // 1. Get sales data from ORDERS (only count advance payments when order is created)
    const ordersSalesData = await OrderModel.aggregate([
      {
        $match: {
          orderDate: { $gte: sevenDaysAgo },
          branch: userBranchName,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%m-%d", date: "$orderDate" } },
          allRevenue: {
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

    // Also try a broader date range if no data found
    if (ordersSalesData.length === 0) {
      console.log('No orders in 7 days, trying broader range...');
      const broaderRange = new Date();
      broaderRange.setDate(today.getDate() - 30); // Last 30 days
      broaderRange.setHours(0, 0, 0, 0);
      
      const broaderOrdersData = await OrderModel.aggregate([
        {
          $match: {
            orderDate: { $gte: broaderRange },
            branch: userBranchName,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%m-%d", date: "$orderDate" } },
            allRevenue: {
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
      
      if (broaderOrdersData.length > 0) {
        console.log('Found orders in broader range:', broaderOrdersData);
        // Use the broader range data
        ordersSalesData.push(...broaderOrdersData);
      }
    }

    // 2. Get sales data from COMPLETED TASKS (count remaining amount after advance payment)
    const tasksSalesData = await TaskModel.aggregate([
      {
        $match: {
          startTime: { $gte: sevenDaysAgo },
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
          _id: { $dateToString: { format: "%m-%d", date: "$endTime" } },
          completedRevenue: {
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

    // Also try a broader date range if no data found
    if (tasksSalesData.length === 0) {
      console.log('No tasks in 7 days, trying broader range...');
      const broaderRange = new Date();
      broaderRange.setDate(today.getDate() - 30); // Last 30 days
      broaderRange.setHours(0, 0, 0, 0);
      
      const broaderTasksData = await TaskModel.aggregate([
        {
          $match: {
            startTime: { $gte: broaderRange },
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
            _id: { $dateToString: { format: "%m-%d", date: "$endTime" } },
            completedRevenue: {
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
              }
            },
          },
        },
      ]);
      
      if (broaderTasksData.length > 0) {
        console.log('Found tasks in broader range:', broaderTasksData);
        // Use the broader range data
        tasksSalesData.push(...broaderTasksData);
      }
    }

    // Debug: Log the raw data to see what we're getting
    console.log('Raw Orders Data:', ordersSalesData);
    console.log('Raw Tasks Data:', tasksSalesData);
    console.log('Date Range:', { sevenDaysAgo, today, userBranchName });

    // Combine sales data from both sources
    const combinedSalesMap = new Map();

    // Determine how many days to show based on data availability
    const maxDays = Math.max(7, Math.max(
      ordersSalesData.length > 0 ? ordersSalesData.length : 0,
      tasksSalesData.length > 0 ? tasksSalesData.length : 0
    ));
    
    const daysToShow = Math.max(7, maxDays);
    console.log(`Showing ${daysToShow} days based on data availability`);

    // Initialize all days with 0 values and debug info
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dayKey = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      const mongoFormat = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      combinedSalesMap.set(dayKey, { allRevenue: 0, completedRevenue: 0, mongoFormat });
      console.log(`Day ${i}: ${dayKey} (Mongo: ${mongoFormat})`);
    }
    
    // Debug: Show the initialized map
    console.log('Initialized Combined Sales Map:');
    combinedSalesMap.forEach((value, key) => {
      console.log(`Initialized Day ${key}: All Revenue: ${value.allRevenue}, Completed Revenue: ${value.completedRevenue}`);
    });

    // Add orders sales (All Revenue)
    console.log('Processing Orders Data:');
    ordersSalesData.forEach((d: any) => {
      console.log(`Order: ${d._id} -> Revenue: ${d.allRevenue}`);
      // Skip if _id is null or undefined
      if (!d._id) {
        console.log(`Skipping order with null _id: ${d._id}`);
        return;
      }
      // Convert MongoDB format (08-20) to chart format (08/20)
      const chartDayKey = d._id.replace('-', '/');
      const existing = combinedSalesMap.get(chartDayKey) || { allRevenue: 0, completedRevenue: 0 };
      existing.allRevenue = (existing.allRevenue || 0) + d.allRevenue;
      combinedSalesMap.set(chartDayKey, existing);
      console.log(`Mapped ${d._id} -> ${chartDayKey}, Revenue: ${existing.allRevenue}`);
    });

    // Add tasks sales (Completed Orders Revenue)
    console.log('Processing Tasks Data:');
    tasksSalesData.forEach((d: any) => {
      console.log(`Task: ${d._id} -> Revenue: ${d.completedRevenue}`);
      // Skip if _id is null or undefined
      if (!d._id) {
        console.log(`Skipping task with null _id: ${d._id}`);
        return;
      }
      // Convert MongoDB format (08-20) to chart format (08/20)
      const chartDayKey = d._id.replace('-', '/');
      const existing = combinedSalesMap.get(chartDayKey) || { allRevenue: 0, completedRevenue: 0 };
      existing.completedRevenue = (existing.completedRevenue || 0) + d.completedRevenue;
      combinedSalesMap.set(chartDayKey, existing);
      console.log(`Mapped ${d._id} -> ${chartDayKey}, Revenue: ${existing.completedRevenue}`);
    });

    // Debug: Show what's in the combinedSalesMap after processing
    console.log('Combined Sales Map after processing:');
    combinedSalesMap.forEach((value, key) => {
      console.log(`Day ${key}: All Revenue: ${value.allRevenue}, Completed Revenue: ${value.completedRevenue}`);
    });

    // Generate data for all days
    const formattedData = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dayKey = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      const dayData = combinedSalesMap.get(dayKey) || { allRevenue: 0, completedRevenue: 0 };
      
      formattedData.push({
        day: dayKey,
        allRevenue: Math.round(dayData.allRevenue * 100) / 100, // Round to 2 decimal places
        completedRevenue: Math.round(dayData.completedRevenue * 100) / 100, // Round to 2 decimal places
      });
      
      console.log(`Final Day ${dayKey}: All Revenue: ${dayData.allRevenue}, Completed Revenue: ${dayData.completedRevenue}`);
    }

    // Debug: Show final formatted data
    console.log('Final Formatted Data for Chart:');
    formattedData.forEach((day, index) => {
      console.log(`Chart Day ${index}: ${day.day} - All: ${day.allRevenue}, Completed: ${day.completedRevenue}`);
    });

    // Add console logging for debugging
    console.log('Sales API Debug Info:', {
      userBranch,
      userBranchStr: userBranchName, // Changed from userBranchStr to userBranchName
      branchName,
      ordersSalesData: ordersSalesData.length,
      tasksSalesData: tasksSalesData.length,
      totalDays: formattedData.length,
      formattedData,
      sampleDay: formattedData[0], // Show sample of formatted data
      sampleCompletedTask: await TaskModel.findOne({
        startTime: { $gte: sevenDaysAgo },
        status: "Completed",
        branch: userBranchName
      }).select('totalPrice productPrice productQuantity orderId status branch')
    });

    // If no data in 7 days, try to get some sample data for debugging
    if (ordersSalesData.length === 0 && tasksSalesData.length === 0) {
      console.log('No data in 7 days, checking for any recent data...');
      const recentOrder = await OrderModel.findOne({ branch: userBranchName }).sort({ orderDate: -1 });
      const recentTask = await TaskModel.findOne({ branch: userBranchName, status: "Completed" }).sort({ startTime: -1 });
      
      if (recentOrder) {
        console.log('Most recent order:', {
          orderId: recentOrder.orderId,
          orderDate: recentOrder.orderDate,
          totalPrice: recentOrder.totalPrice,
          branch: recentOrder.branch,
          orderDateISO: recentOrder.orderDate.toISOString(),
          orderDateLocal: recentOrder.orderDate.toLocaleString()
        });
      }
      
      if (recentTask) {
        console.log('Most recent completed task:', {
          orderId: recentTask.orderId,
          startTime: recentTask.startTime,
          totalPrice: recentTask.totalPrice,
          branch: recentTask.branch,
          startTimeISO: recentTask.startTime.toISOString(),
          startTimeLocal: recentTask.startTime.toLocaleString()
        });
      }
      
      // Try extending the range to 30 days to see if we get data
      console.log('Trying 30-day range...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of that day
      
      const orders30Days = await OrderModel.countDocuments({
        orderDate: { $gte: thirtyDaysAgo },
        branch: userBranchName
      });
      
      const tasks30Days = await TaskModel.countDocuments({
        startTime: { $gte: thirtyDaysAgo },
        status: "Completed",
        branch: userBranchName
      });
      
      console.log('30-day range results:', { orders30Days, tasks30Days });
    }

    return NextResponse.json({ 
      salesData: formattedData,
      branchName,
      userBranch,
      debugInfo: {
        ordersSalesData: ordersSalesData.length,
        tasksSalesData: tasksSalesData.length,
        totalDays: formattedData.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching sales data:", error);
    
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
