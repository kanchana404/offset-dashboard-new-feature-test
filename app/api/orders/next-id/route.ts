// app/api/orders/next-id/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { getBranchOrderStatus } from "@/utils/orderIdGenerator";

export const runtime = "nodejs";

// Enhanced connection function with retry logic
async function ensureConnection() {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log("🔌 Establishing new MongoDB connection...");
      await connectToDatabase();
    } else if (mongoose.connection.readyState === 2) {
      console.log("⏳ Waiting for existing MongoDB connection...");
      // Wait for connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 10000);
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        mongoose.connection.once('error', () => {
          clearTimeout(timeout);
          reject(new Error("Connection failed"));
        });
      });
    } else if (mongoose.connection.readyState === 3) {
      console.log("🔄 Reconnecting to MongoDB...");
      await connectToDatabase();
    }
    
    console.log(`✅ MongoDB connection ready (state: ${mongoose.connection.readyState})`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

export async function GET() {
  try {
    await ensureConnection();

    // Get branch info from token
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    
    console.log(`🔍 Looking up branch: ${branchId}`);
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }

    const branchName = branchRecord.name;
    console.log(`📍 Found branch: ${branchName}`);

    // Get the branch order status including next order ID
    const orderStatus = await getBranchOrderStatus(branchName);

    return NextResponse.json({
      success: true,
      branchName: branchName,
      nextOrderId: orderStatus.nextOrderId,
      branchPrefix: orderStatus.branchPrefix,
      nextOrderNumber: orderStatus.nextOrderNumber,
      lastOrderId: orderStatus.lastOrderId,
      lastOrderNumber: orderStatus.lastOrderNumber
    });

  } catch (error: any) {
    console.error("Error getting next order ID:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get next order ID" },
      { status: 500 }
    );
  }
}