// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Payment from "@/lib/database/models/Payment";
import Task from "@/lib/database/models/Task";

// GET - Fetch payments for an order
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });
    
    // Calculate totals
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return NextResponse.json({
      success: true,
      payments,
      totalPaid,
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST - Add a new payment
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      orderId,
      amount,
      paymentType,
      paymentDate,
      notes,
      receivedBy,
      chequeNumber,
      transactionId,
      branch,
    } = body;

    // Validate required fields
    if (!orderId || !amount || !paymentType || !branch) {
      return NextResponse.json(
        { error: "Order ID, amount, payment type, and branch are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Find the task/order
    const task = await Task.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if payment exceeds balance due
    const currentBalanceDue = task.balanceDue || task.totalAmount || 0;
    if (amount > currentBalanceDue) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds balance due (${currentBalanceDue})` },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = new Payment({
      orderId,
      amount: parseFloat(amount),
      paymentType,
      paymentDate: paymentDate || new Date(),
      notes,
      receivedBy,
      chequeNumber,
      transactionId,
      branch,
      chequeStatus: paymentType === "CHEQUE" ? "PENDING" : undefined,
    });

    await payment.save();

    // Update task payment tracking
    const newPaidAmount = (task.paidAmount || 0) + parseFloat(amount);
    const newBalanceDue = (task.totalAmount || 0) - newPaidAmount;

    task.paidAmount = newPaidAmount;
    task.balanceDue = newBalanceDue;

    // Update status to PAID if balance is 0
    if (newBalanceDue <= 0) {
      task.status = "PAID";
    }

    // Add to payment history
    if (!task.paymentHistory) {
      task.paymentHistory = [];
    }
    task.paymentHistory.push({
      amount: parseFloat(amount),
      paymentType,
      date: paymentDate || new Date(),
      notes,
      receivedBy,
    });

    await task.save();

    return NextResponse.json({
      success: true,
      payment,
      task: {
        orderId: task.orderId,
        totalAmount: task.totalAmount,
        paidAmount: task.paidAmount,
        balanceDue: task.balanceDue,
        status: task.status,
      },
    });
  } catch (error: any) {
    console.error("Error adding payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add payment" },
      { status: 500 }
    );
  }
}

