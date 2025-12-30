// app\api\tasks\main\route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/database";
import { BranchModel, TaskModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;

    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Only load tasks if this is the main branch
    if (branchRecord.type !== "main") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only show IN_PROGRESS tasks (and legacy statuses for backward compatibility)
    const tasks = await TaskModel.find({ 
      branch: branchRecord.name,
      status: { $in: ["IN_PROGRESS", "In Progress", "Pending"] }
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error retrieving main branch tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
