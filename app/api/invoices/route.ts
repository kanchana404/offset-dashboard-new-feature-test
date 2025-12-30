// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Task from "@/lib/database/models/Task";

// GET - Fetch all invoices with filters
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    let query: any = {};

    // Filter by status
    if (status) {
      if (status === "UNPAID") {
        query.balanceDue = { $gt: 0 };
        query.status = { $ne: "PAID" };
      } else if (status === "PAID") {
        query.status = "PAID";
      } else if (status === "IN_PROGRESS") {
        query.status = "IN_PROGRESS";
      } else if (status === "INVOICED") {
        query.status = "INVOICED";
      } else if (status === "COMPLETED") {
        query.status = "COMPLETED";
      }
    }

    // Filter by branch
    if (branch && branch !== "all") {
      query.branch = branch;
    }

    // Search by order ID or customer name
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Task.countDocuments(query);

    return NextResponse.json({
      success: true,
      invoices: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice/task status
export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { orderId, status, employeeId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const task = await Task.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Update status
    if (status) {
      task.status = status;
    }

    // If assigning to worker, set employee ID
    if (employeeId) {
      task.employeeId = employeeId;
      task.status = "IN_PROGRESS";
    }

    await task.save();

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}

