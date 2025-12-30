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
    const orderId = searchParams.get('orderId') || 'TES0040';
    
    // Test: Find specific order
    const specificTask = await TaskModel.findOne({ orderId })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt branch')
      .lean();
    
    console.log(`Looking for order ${orderId}:`, specificTask);
    
    // Test: Find all orders around TES0040
    const nearbyTasks = await TaskModel.find({
      orderId: { $regex: /^TES00[3-4][0-9]$/ }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt branch')
      .sort({ orderId: 1 })
      .lean();
    
    console.log(`Found ${nearbyTasks.length} tasks around TES0040`);
    
    // Test: Find all TES orders
    const allTesTasks = await TaskModel.find({
      orderId: { $regex: /^TES/ }
    })
      .select('orderId status advancePayment fullPayment paymentHistory createdAt branch')
      .sort({ orderId: 1 })
      .limit(20)
      .lean();
    
    console.log(`Found ${allTesTasks.length} TES tasks`);
    
    return NextResponse.json({
      success: true,
      results: {
        specificOrder: specificTask,
        nearbyOrders: nearbyTasks,
        allTesOrders: allTesTasks,
        searchedFor: orderId
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


