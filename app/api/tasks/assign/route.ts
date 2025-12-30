// app/api/tasks/assign/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TaskAssignmentModel } from "@/lib/database/models";
import { TaskModel } from "@/lib/database/models";
import { EmployeeModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const { taskId, employeeId } = await request.json();

    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!);

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "EmployeeModel not found" }, { status: 404 });
    }

    // Update the task status to "In Progress"
    const updatedTask = await TaskModel.findByIdAndUpdate(taskId, { status: "In Progress", employeeId }, { new: true });

    if (!updatedTask) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    // Create a new TaskAssignmentModel record
    await TaskAssignmentModel.create({
      task: taskId,
      employee: employeeId,
      branch: employee.branch,
    });

    // Return the updated task with the assigned employee's name
    updatedTask.employeeName = employee.name;
    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error assigning task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
