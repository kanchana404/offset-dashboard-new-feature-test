// app/api/tasks/send-to-main/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { TaskModel } from "@/lib/database/models";
import { SentOrderModel } from "@/lib/database/models";
import { OrderModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json(
        { error: "TaskModel ID is required" },
        { status: 400 }
      );
    }

    // Update the task: mark it as sent
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      { status: "Sent to Main Branch", isSent: true },
      { new: true }
    );
    if (!updatedTask) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    // Attempt to retrieve order details for this task
    const order = await OrderModel.findOne({ orderId: updatedTask.orderId });

    // Create a new SentOrderModel record with product information
    await SentOrderModel.create({
      orderId: updatedTask.orderId,
      customerName: order ? order.customerName : "Unknown",
      orderDate: order ? order.orderDate : new Date(),
      totalPrice: order ? order.totalPrice : 0,
      sentBranch: updatedTask.branch,
      status: "Sent to Main Branch",
      // Include product information from the task
      products: updatedTask.products || [],
      // Include additional task-specific information
      level: 1,
      invoiceCreated: updatedTask.invoiceCreated || false,
      invoiceData: updatedTask.invoiceData || null,
      fullPayment: updatedTask.fullPayment || 0,
      lastPaymentMethod: updatedTask.lastPaymentMethod || null,
      paymentHistory: updatedTask.paymentHistory || []
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("Error sending task to main branch:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
