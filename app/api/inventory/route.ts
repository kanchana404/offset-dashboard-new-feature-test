import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { InventoryItemModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

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
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }
    const branchName = branchRecord.name;
    const inventoryItems = await InventoryItemModel.find({ branch: branchName });
    return NextResponse.json({ inventory: inventoryItems });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }
    const branchName = branchRecord.name;
    
    // Check if an inventory item with the same productCode exists for this branch
    const existingItem = await InventoryItemModel.findOne({
      branch: branchName,
      productCode: data.productCode,
    });
    
    if (existingItem) {
      // Update the existing item by increasing its quantity and updating price if provided
      existingItem.quantity += parseInt(data.quantity);
      if(data.price) {
        existingItem.price = parseFloat(data.price);
      }
      await existingItem.save();
      return NextResponse.json(existingItem);
    }
    
    if (!data.price) {
      return NextResponse.json({ error: "Missing required field: price" }, { status: 400 });
    }
    
    // Create new inventory item if it doesn't exist
    const newItemData = {
      name: data.name,
      branch: branchName,
      quantity: parseInt(data.quantity),
      image: data.image,
      status: parseInt(data.quantity) > 100 ? "In Stock" : "Low Stock",
      productId: data.productCode, // assign productId using productCode
      productCode: data.productCode,
      price: parseFloat(data.price),
    };
    const created = await InventoryItemModel.create(newItemData);
    return NextResponse.json(created);
  } catch (error: any) {
    console.error("Error adding inventory:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
