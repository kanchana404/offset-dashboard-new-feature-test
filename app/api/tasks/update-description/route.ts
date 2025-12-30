import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import { TaskModel } from "@/lib/database/models";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

interface RequestPayload {
  taskId: string;
  description: string;
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();

    // Get token and verify authentication
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Get request data
    const { taskId, description }: RequestPayload = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "TaskModel ID is required" }, { status: 400 });
    }
    
    if (description === undefined || description === null) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Find the task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    // Update the task description
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      {
        $set: {
          description: description
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "TaskModel description updated successfully",
      task: updatedTask
    });

  } catch (error: any) {
    console.error("Error updating task description:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task description" },
      { status: 500 }
    );
  }
} 