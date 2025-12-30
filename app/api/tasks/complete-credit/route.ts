import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import { TaskModel, OrderModel } from "@/lib/database/models";

interface JwtPayload {
  branch: string;
  email: string;
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();

    // Get token and branch info
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const branchId = decoded.branch;

    // Get request data
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Find the task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify this is a credit payment in Temporary Completed status
    if (task.status !== "Temporary Completed") {
      return NextResponse.json({ 
        error: "Task is not in Temporary Completed status" 
      }, { status: 400 });
    }

    // Check if this is a credit payment
    const isCreditPayment = task.lastPaymentMethod === "credits" || 
      (task.paymentHistory && task.paymentHistory.some(p => 
        p.method === "credits" || p.method === "credit"
      )) ||
      (task.lastPaymentMethod === "cheque" && task.paymentHistory?.some(p => 
        p.chequeNumber === "CREDIT_ADJUSTMENT" || p.bankName === "INTERNAL"
      ));

    if (!isCreditPayment) {
      return NextResponse.json({ 
        error: "This task is not paid via credit" 
      }, { status: 400 });
    }

    // Update the task to Completed status
    task.status = "Completed";
    
    // Clear cheque status if it exists (for legacy credit payments)
    if (task.chequeStatus) {
      task.chequeStatus = undefined;
    }

    await task.save();

    // Find and update the corresponding order
    const order = await OrderModel.findOne({ orderId: task.orderId });
    if (order) {
      order.status = "Completed";
      await order.save();
    }

    return NextResponse.json({ 
      success: true, 
      task,
      message: "Credit payment completed successfully. Task moved to Completed status."
    });
  } catch (error: any) {
    console.error("Error completing credit payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}


