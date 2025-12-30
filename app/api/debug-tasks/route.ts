import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import TaskModel from "@/lib/database/models/Task";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const branch = searchParams.get('branch') || decoded.branch;
    
    // Build branch filter
    let branchFilter = {};
    if (branch !== 'all') {
      branchFilter = { branch };
    }
    
    console.log('Debug: Branch filter:', branchFilter);
    
    // Test 1: Get ALL tasks (no filters)
    const allTasks = await TaskModel.find(branchFilter)
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(20)
      .lean();
    
    console.log(`Found ${allTasks.length} total tasks`);
    
    // Test 2: Get tasks with advancePayment > 0
    const tasksWithAdvance = await TaskModel.find({
      ...branchFilter,
      advancePayment: { $gt: 0 }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(20)
      .lean();
    
    console.log(`Found ${tasksWithAdvance.length} tasks with advancePayment > 0`);
    
    // Test 3: Get tasks with fullPayment > 0
    const tasksWithFull = await TaskModel.find({
      ...branchFilter,
      fullPayment: { $gt: 0 }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(20)
      .lean();
    
    console.log(`Found ${tasksWithFull.length} tasks with fullPayment > 0`);
    
    // Test 4: Get tasks with paymentHistory
    const tasksWithPaymentHistory = await TaskModel.find({
      ...branchFilter,
      paymentHistory: { $exists: true, $ne: [] }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(20)
      .lean();
    
    console.log(`Found ${tasksWithPaymentHistory.length} tasks with paymentHistory`);
    
    // Test 5: Our current query
    const currentQuery = {
      $or: [
        { paymentHistory: { $exists: true, $ne: [] } },
        { advancePayment: { $gt: 0 } },
        { fullPayment: { $gt: 0 } }
      ],
      ...branchFilter
    };
    
    const tasksWithCurrentQuery = await TaskModel.find(currentQuery)
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(20)
      .lean();
    
    console.log(`Found ${tasksWithCurrentQuery.length} tasks with current query`);
    
    // Show sample data
    const sampleTasks = allTasks.slice(0, 5).map(task => ({
      orderId: task.orderId,
      status: task.status,
      advancePayment: task.advancePayment,
      fullPayment: task.fullPayment,
      hasPaymentHistory: task.paymentHistory && task.paymentHistory.length > 0,
      paymentHistoryLength: task.paymentHistory ? task.paymentHistory.length : 0,
      createdAt: task.createdAt
    }));
    
    return NextResponse.json({
      success: true,
      debug: {
        totalTasks: allTasks.length,
        tasksWithAdvance: tasksWithAdvance.length,
        tasksWithFull: tasksWithFull.length,
        tasksWithPaymentHistory: tasksWithPaymentHistory.length,
        tasksWithCurrentQuery: tasksWithCurrentQuery.length,
        branchFilter,
        currentQuery,
        sampleTasks
      }
    });
    
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error.message || "Debug failed" },
      { status: 500 }
    );
  }
}


