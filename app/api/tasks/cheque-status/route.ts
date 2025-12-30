// app/api/tasks/cheque-status/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TaskModel } from "@/lib/database/models";
import { OrderModel } from "@/lib/database/models";
import { InventoryItemModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export const runtime = "nodejs";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

interface ChequeStatusPayload {
  taskId: string;
  action: 'successful' | 'return';
  notes?: string;
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();

    // Get token and branch info
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const branchId = decoded.branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }

    const { taskId, action, notes }: ChequeStatusPayload = await request.json();
    if (!taskId || !action) {
      return NextResponse.json({ error: "TaskModel ID and action are required" }, { status: 400 });
    }
    if (!['successful', 'return'].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'successful' or 'return'" }, { status: 400 });
    }

    // Find the task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }
    if (task.status !== "Temporary Completed") {
      return NextResponse.json({ error: "TaskModel is not in temporary completed status" }, { status: 400 });
    }

    // Find the corresponding order
    const order = await OrderModel.findOne({ orderId: task.orderId });
    if (!order) {
      return NextResponse.json({ error: "OrderModel not found" }, { status: 404 });
    }

    if (action === 'successful') {
      // Cheque cleared successfully → move to Completed
      task.status = "Completed";
      task.chequeStatus = 'cleared';
      task.chequeNotes = notes || 'Cheque cleared successfully';

      // ───> **NO inventory changes here** (already done in /complete when TaskModel first moved to Temporary Completed)
    }
    else if (action === 'return') {
      // Cheque returned → change status to "Returned"
      task.status = "Returned";
      task.chequeStatus = 'returned';
      task.chequeNotes = notes || 'Cheque returned by bank';

      // Reset payment fields so it's ready for a new payment
      const chequePaymentAmount = (task.fullPayment || 0) - (order.advancePayment || 0);
      order.advancePayment = (order.advancePayment || 0); // keep existing advance
      task.fullPayment = undefined;
      task.endPrice = undefined;
      task.endTime = undefined;
      task.readyForPayment = true;

      // Track the returned cheque reversal in paymentHistory
      if (!task.paymentHistory) {
        task.paymentHistory = [];
      }
      task.paymentHistory.push({
        method: 'cheque',
        amount: -chequePaymentAmount, // negative to indicate reversal
        date: new Date(),
        status: 'returned',
        notes: notes || 'Cheque returned by bank'
      });

      // ───> **Restore inventory when cheque is returned** (reverse the reduction done in /complete)
      if (task.products && task.products.length > 0) {
        for (const product of task.products) {
          await restoreInventoryForProduct(
            product.productType,
            product.productQuantity,
            branchRecord.name
          );
        }
      }
      // Backward compatibility for older single-product fields:
      else if (task.productType && task.productQuantity) {
        await restoreInventoryForProduct(
          task.productType,
          task.productQuantity,
          branchRecord.name
        );
      }
    }

    await order.save();
    const updatedTask = await task.save();

    const message = action === 'successful'
      ? "Cheque cleared successfully. TaskModel marked as Completed."
      : "Cheque returned. TaskModel moved to Returned; ready for new payment.";

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message,
      action
    });
  } catch (error: any) {
    console.error("Error updating cheque status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// Helper: restore inventory for a product (when payment fails)
async function restoreInventoryForProduct(productType: string, quantity: number, branchName: string) {
  if (!productType || productType === "N/A" || !quantity) {
    return;
  }

  let inventoryItem: any = null;

  // Try searching by ObjectId
  if (mongoose.Types.ObjectId.isValid(productType)) {
    try {
      inventoryItem = await InventoryItemModel.findOne({
        _id: productType,
        branch: branchName,
      });
    } catch (err) {
      console.warn("Error searching inventory by _id:", err);
    }
  }

  // If not found, try productId
  if (!inventoryItem) {
    try {
      inventoryItem = await InventoryItemModel.findOne({
        productId: productType,
        branch: branchName,
      });
    } catch (err) {
      console.warn("Error searching inventory by productId:", err);
    }
  }

  // If still not found, try productCode
  if (!inventoryItem) {
    try {
      inventoryItem = await InventoryItemModel.findOne({
        productCode: productType,
        branch: branchName,
      });
    } catch (err) {
      console.warn("Error searching inventory by productCode:", err);
    }
  }

  // Finally, if it's an ObjectId and we have a separate Product collection, attempt lookup there
  if (!inventoryItem && mongoose.Types.ObjectId.isValid(productType)) {
    try {
      const Product = mongoose.models.Product;
      if (Product) {
        const product = await Product.findById(productType);
        if (product) {
          const productIdentifier = product.productId || product.productCode || product.code;
          if (productIdentifier) {
            inventoryItem = await InventoryItemModel.findOne({
              $or: [
                { productId: productIdentifier },
                { productCode: productIdentifier },
              ],
              branch: branchName,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Error looking up inventory via Product reference:", err);
    }
  }

  if (inventoryItem) {
    inventoryItem.quantity = inventoryItem.quantity + quantity; // Add back the quantity
    if (inventoryItem.quantity <= 0) {
      inventoryItem.status = "Out of Stock";
    } else if (inventoryItem.quantity <= 10) {
      inventoryItem.status = "Low Stock";
    } else {
      inventoryItem.status = "In Stock";
    }
    await inventoryItem.save();
  } else {
    console.error("Failed to find matching inventory item for productType:", productType);
  }
}
