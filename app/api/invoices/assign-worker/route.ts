// app/api/invoices/assign-worker/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Task from "@/lib/database/models/Task";
import TaskAssignment from "@/lib/database/models/TaskAssignment";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { orderId, employeeId, employeeName } = body;

    if (!orderId || !employeeId) {
      return NextResponse.json(
        { error: "Order ID and Employee ID are required" },
        { status: 400 }
      );
    }

    // Find the task
    const task = await Task.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Update task with employee and change status to IN_PROGRESS
    task.employeeId = employeeId;
    task.status = "IN_PROGRESS";
    await task.save();

    // Create task assignment record (if your system uses it)
    try {
      const existingAssignment = await TaskAssignment.findOne({ 
        taskId: task._id 
      });

      if (!existingAssignment) {
        const assignment = new TaskAssignment({
          taskId: task._id,
          taskOrderId: orderId,
          employeeId,
          employeeName: employeeName || "Unknown",
          assignedAt: new Date(),
          status: "assigned",
        });
        await assignment.save();
      }
    } catch (assignmentError) {
      console.warn("TaskAssignment creation skipped:", assignmentError);
    }

    return NextResponse.json({
      success: true,
      task,
      message: `Task ${orderId} assigned to worker successfully`,
    });
  } catch (error: any) {
    console.error("Error assigning worker:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign worker" },
      { status: 500 }
    );
  }
}

