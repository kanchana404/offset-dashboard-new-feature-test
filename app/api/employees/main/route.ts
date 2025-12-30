// app\api\employees\main\route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";
import { EmployeeModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;

    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }

    // Same logic: fetch employees belonging to that branch
    const employees = await EmployeeModel.find({ branch: branchRecord.name });
    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees for branch:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
