// app/api/tasks/ready-for-payment/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { TaskModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Find the task and update its readyForPayment status
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      { readyForPayment: true },
      { new: true }
    );
    
    if (!updatedTask) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      task: updatedTask,
      message: "TaskModel is now ready for payment"
    });
  } catch (error: any) {
    console.error("Error setting task ready for payment:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}