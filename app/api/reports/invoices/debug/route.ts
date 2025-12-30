import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import TaskModel from "@/lib/database/models/Task";
import OrderModel from "@/lib/database/models/Order";
import BranchModel from "@/lib/database/models/Branch";
import BranchesLoginModel from "@/lib/database/models/Branches_login";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Connect to database
    await connectToDatabase();
    
    // Get sample data from both collections
    const sampleTasks = await TaskModel.find({})
      .limit(10)
      .sort({ createdAt: -1 });
      
    const sampleOrders = await OrderModel.find({})
      .limit(10)
      .sort({ orderDate: -1 });
      
    // Get unique branches from both collections
    const taskBranches = await TaskModel.distinct('branch');
    const orderBranches = await OrderModel.distinct('branch');
    
    // Get branch mapping info
    let actualBranchName = null;
    try {
      const branchDoc = await BranchModel.findById(decoded.branch);
      if (branchDoc && branchDoc.name) {
        actualBranchName = branchDoc.name;
      }
    } catch (error) {
      console.log('Could not find branch by ID');
    }
    
    if (!actualBranchName) {
      const branchByName = await BranchModel.findOne({ name: decoded.branch });
      if (branchByName) {
        actualBranchName = branchByName.name;
      } else {
        actualBranchName = decoded.branch;
      }
    }
    
    const user = await BranchesLoginModel.findOne({ branch: decoded.branch });
    
    // Get counts
    const taskCount = await TaskModel.countDocuments({});
    const completedTaskCount = await TaskModel.countDocuments({ status: 'Completed' });
    const orderCount = await OrderModel.countDocuments({});
    
    // Get counts for the specific branch
    const branchTaskCount = await TaskModel.countDocuments({ branch: actualBranchName });
    const branchOrderCount = await OrderModel.countDocuments({ branch: actualBranchName });
    
    // Get unique statuses
    const taskStatuses = await TaskModel.distinct('status');
    
    return NextResponse.json({
      debug: true,
      decodedBranch: decoded.branch,
      actualBranchName,
      userInfo: user,
      counts: {
        totalTasks: taskCount,
        completedTasks: completedTaskCount,
        totalOrders: orderCount,
        branchTasks: branchTaskCount,
        branchOrders: branchOrderCount
      },
      branches: {
        taskBranches,
        orderBranches
      },
      taskStatuses,
      sampleTasks: sampleTasks.map(task => ({
        orderId: task.orderId,
        status: task.status,
        branch: task.branch,
        fullPayment: task.fullPayment,
        endPrice: task.endPrice,
        readyForPayment: task.readyForPayment,
        invoiceCreated: task.invoiceCreated,
        createdAt: task.createdAt,
        endTime: task.endTime,
        products: task.products?.length || 0
      })),
      sampleOrders: sampleOrders.map(order => ({
        orderId: order.orderId,
        customerName: order.customerName,
        branch: order.branch,
        totalPrice: order.totalPrice,
        orderDate: order.orderDate,
        createdAt: order.createdAt
      }))
    });
    
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error.message || "Debug failed" },
      { status: 500 }
    );
  }
}
