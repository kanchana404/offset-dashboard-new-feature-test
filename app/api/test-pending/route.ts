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
    
    // Test: Get ALL pending tasks
    const pendingTasks = await TaskModel.find({
      ...branchFilter,
      status: 'Pending'
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(10)
      .lean();
    
    console.log(`Found ${pendingTasks.length} pending tasks`);
    
    // Test: Get pending tasks with advancePayment
    const pendingWithAdvance = await TaskModel.find({
      ...branchFilter,
      status: 'Pending',
      advancePayment: { $gt: 0 }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(10)
      .lean();
    
    console.log(`Found ${pendingWithAdvance.length} pending tasks with advancePayment > 0`);
    
    // Test: Get ALL tasks with advancePayment (any status)
    const anyStatusWithAdvance = await TaskModel.find({
      ...branchFilter,
      advancePayment: { $gt: 0 }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt')
      .limit(10)
      .lean();
    
    console.log(`Found ${anyStatusWithAdvance.length} tasks (any status) with advancePayment > 0`);
    
    return NextResponse.json({
      success: true,
      results: {
        totalPendingTasks: pendingTasks.length,
        pendingWithAdvance: pendingWithAdvance.length,
        anyStatusWithAdvance: anyStatusWithAdvance.length,
        branchFilter,
        samplePendingTasks: pendingTasks.slice(0, 3),
        samplePendingWithAdvance: pendingWithAdvance.slice(0, 3),
        sampleAnyStatusWithAdvance: anyStatusWithAdvance.slice(0, 3)
      }
    });
    
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}


