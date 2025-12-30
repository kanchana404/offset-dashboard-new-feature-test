// app\api\sent-orders\main\route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";
import { SentOrderModel } from "@/lib/database/models";

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

    // If you want only the main branch to see "sentOrders", remove this check if not needed
    // For now, let's just fetch them for the branch we have:
    const sentOrders = await SentOrderModel.find({});

    return NextResponse.json({ sentOrders });
  } catch (error) {
    console.error("Error fetching sent orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
