import { NextResponse } from "next/server";
import { SentOrderModel } from "@/lib/database/models";
import { TaskModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    // Get the token from cookies
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the token and extract branch info
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }

    // Parse the request body to get the orderId
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json(
        { error: "OrderModel ID is required" },
        { status: 400 }
      );
    }

    // Find the sent order
    const sentOrder = await SentOrderModel.findOne({ orderId });
    if (!sentOrder) {
      return NextResponse.json(
        { error: "Sent order not found" },
        { status: 404 }
      );
    }

    // Verify that the order status is "Sent to BranchModel"
    if (sentOrder.status !== "Sent to BranchModel") {
      return NextResponse.json(
        { error: "OrderModel is not in 'Sent to BranchModel' status" },
        { status: 400 }
      );
    }

    // Verify that the branch matches the current user's branch
    if (sentOrder.sentBranch !== branchRecord.name) {
      return NextResponse.json(
        { error: "This order is not sent to your branch" },
        { status: 403 }
      );
    }

    // Find the associated task and update it
    const task = await TaskModel.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Associated task not found" },
        { status: 404 }
      );
    }

    // Update the task - set needsTransfer to false and status to Complete
    await TaskModel.findByIdAndUpdate(task._id, {
      needsTransfer: false,
      status: "Completed"
    });

    // Delete the sent order (or alternatively, you could update its status)
    await SentOrderModel.findByIdAndDelete(sentOrder._id);

    return NextResponse.json({
      success: true,
      message: "OrderModel received successfully"
    });
  } catch (error: any) {
    console.error("Error receiving order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}