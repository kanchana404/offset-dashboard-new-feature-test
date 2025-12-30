// app/api/completed-orders/simple/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TaskModel, BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  console.log('Simple completed orders API called');
  
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        error: "Database configuration error - MONGODB_URI missing",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ 
        error: "Server configuration error - JWT_SECRET missing",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    await connectToDatabase();
    
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ 
        error: "Not authenticated",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json({ 
        error: "Invalid token",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const branchId = (decoded as any).branch;
    if (!branchId) {
      return NextResponse.json({ 
        error: "Invalid token - no branch ID",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ 
        error: "Branch not found",
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }
    
    const branchName = branchRecord.name;
    
    // Get completed tasks with minimal processing
    const completedTasks = await TaskModel.find({ 
      branch: branchName, 
      status: "Completed" 
    })
    .sort({ endTime: -1, startTime: -1 })
    .limit(50)
    .lean()
    .select('name orderId priority branch status startTime endTime description totalPrice endPrice fullPayment lastPaymentMethod createdAt updatedAt');
    
    return NextResponse.json({ 
      completedOrders: completedTasks,
      timestamp: new Date().toISOString(),
      totalCount: completedTasks.length
    });
  } catch (error: any) {
    console.error("Error in simple completed orders:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: "Failed to fetch completed orders",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
