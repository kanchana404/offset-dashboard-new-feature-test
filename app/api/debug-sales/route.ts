import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import OrderModel from "@/lib/database/models/Order";
import TaskModel from "@/lib/database/models/Task";
import BranchModel from "@/lib/database/models/Branch";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Test with hardcoded branch for debugging
    const testBranch = "test";
    
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    console.log('Debug Sales - Date Range:', {
      today: today.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      testBranch
    });
    
    // Get all orders for the test branch
    const allOrders = await OrderModel.find({ branch: testBranch }).sort({ orderDate: -1 }).limit(5);
    const allTasks = await TaskModel.find({ branch: testBranch, status: "Completed" }).sort({ startTime: -1 }).limit(5);
    
    // Get orders in date range
    const ordersInRange = await OrderModel.find({
      orderDate: { $gte: sevenDaysAgo },
      branch: testBranch
    });
    
    // Get tasks in date range
    const tasksInRange = await TaskModel.find({
      startTime: { $gte: sevenDaysAgo },
      status: "Completed",
      branch: testBranch
    });
    
    return NextResponse.json({
      debug: {
        dateRange: { today, sevenDaysAgo },
        testBranch,
        allOrders: allOrders.map(o => ({
          orderId: o.orderId,
          orderDate: o.orderDate,
          totalPrice: o.totalPrice,
          branch: o.branch
        })),
        allTasks: allTasks.map(t => ({
          orderId: t.orderId,
          startTime: t.startTime,
          totalPrice: t.totalPrice,
          productPrice: t.products?.[0]?.productPrice,
          productQuantity: t.products?.[0]?.productQuantity,
          branch: t.branch
        })),
        ordersInRange: ordersInRange.length,
        tasksInRange: tasksInRange.length,
        ordersInRangeDetails: ordersInRange.map(o => ({
          orderId: o.orderId,
          orderDate: o.orderDate,
          totalPrice: o.totalPrice
        })),
        tasksInRangeDetails: tasksInRange.map(t => ({
          orderId: t.orderId,
          startTime: t.startTime,
          totalPrice: t.totalPrice
        }))
      }
    });
    
  } catch (error: any) {
    console.error("Debug Sales Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
