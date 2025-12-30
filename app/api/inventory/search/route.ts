// app/api/inventory/search/route.ts
import { NextResponse } from "next/server";
import { InventoryItemModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    // Get token from cookies
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Decode token and extract branch id
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const branchId = decoded.branch;

    // Get branch details from branch id
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }
    const branchName = branchRecord.name;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";

    // Find products for the branch based on branch name
    const results = await InventoryItemModel.find({
      branch: branchName,
      $or: [
        { productCode: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    }).limit(5);

    // Console log all products for the signed-in branch
    console.log(`Products for branch "${branchName}":`, results);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error searching inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
