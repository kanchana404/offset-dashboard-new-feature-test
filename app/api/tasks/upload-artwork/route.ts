// app/api/tasks/upload-artwork/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { TaskModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { taskId, artworkImage } = await request.json();
    // Update only the artworkImage field; do not mark as complete.
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      { artworkImage },
      { new: true }
    );
    if (!updatedTask) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("Error uploading artwork for task:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
