// app/api/sent-orders/complete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import { 
  OrderModel, 
  SentOrderModel, 
  TaskModel, 
  BranchModel,
  InventoryItemModel 
} from "@/lib/database/models";
import mongoose from "mongoose";

export const runtime = "nodejs";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

interface RequestPayload {
  orderId: string;
  paidAmount: number;
  paymentMethod: "cash" | "card" | "cheque" | "credits" | "online";
  totalPrice: number;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  billNumber?: string;
}

interface CompleteTemporaryPayload {
  orderId: string;
}

export async function PUT(request: Request) {
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

    // Parse the request body
    const {
      orderId,
      paidAmount,
      paymentMethod,
      totalPrice,
      chequeNumber,
      bankName,
      chequeDate,
      billNumber
    }: RequestPayload = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "OrderModel ID is required" },
        { status: 400 }
      );
    }

    if (!paidAmount || paidAmount <= 0) {
      return NextResponse.json(
        { error: "Valid paid amount is required" },
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

    // Verify that the branch matches the current user's branch
    if (sentOrder.sentBranch !== branchRecord.name) {
      return NextResponse.json(
        { error: "This order is not sent to your branch" },
        { status: 403 }
      );
    }

    // Find the associated task
    const task = await TaskModel.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Associated task not found" },
        { status: 404 }
      );
    }

    // Create payment history entry
    const paymentHistory = {
      amount: paidAmount,
      method: paymentMethod,
      date: new Date(),
      chequeNumber,
      bankName,
      chequeDate,
      billNumber
    };

    // Update the task with payment information
    const updatedTask = await TaskModel.findByIdAndUpdate(
      task._id,
      {
        $set: {
          status: paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "online" ? "Completed" : "Temporary Completed",
          fullPayment: paidAmount,
          lastPaymentMethod: paymentMethod,
          totalPrice: totalPrice
        },
        $push: { paymentHistory: paymentHistory }
      },
      { new: true }
    );

    // Update the sent order status
    await SentOrderModel.findOneAndUpdate(
      { orderId },
      {
        $set: {
          status: paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "online" ? "Completed" : "Temporary Completed",
          fullPayment: paidAmount,
          lastPaymentMethod: paymentMethod,
          totalPrice: totalPrice
        }
      }
    );

    // Update the order total price
    await OrderModel.findOneAndUpdate(
      { orderId },
      {
        $set: { totalPrice: totalPrice }
      }
    );

    // ───> **Reduce inventory for all products in the task**
    if (task.products && task.products.length > 0) {
      for (const product of task.products) {
        await updateInventoryForProduct(
          product.productType,
          product.productQuantity + (product.totalWaste || 0),
          branchRecord.name
        );
      }
    }
    // Backward compatibility for older single-product fields:
    else if (task.productType && task.productQuantity) {
      await updateInventoryForProduct(
        task.productType,
        task.productQuantity + (task.totalWaste || 0),
        branchRecord.name
      );
    }

    let message = "Payment processed successfully";
    let status = paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "online" ? "Completed" : "Temporary Completed";
    
    if (paymentMethod === "cheque") {
      message = `Payment recorded with ${paymentMethod}. OrderModel moved to Temporary Completed status until payment is confirmed.`;
    }

    return NextResponse.json({
      success: true,
      message: message,
      status: status,
      task: updatedTask
    });

  } catch (error: any) {
    console.error("Error completing sent order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// New endpoint to mark temporary completed orders as fully completed
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

    // Parse the request body
    const { orderId }: CompleteTemporaryPayload = await request.json();

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

    // Verify that the order is in Temporary Completed status
    if (sentOrder.status !== "Temporary Completed") {
      return NextResponse.json(
        { error: "OrderModel is not in Temporary Completed status" },
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

    // Find the associated task
    const task = await TaskModel.findOne({ orderId });
    if (!task) {
      return NextResponse.json(
        { error: "Associated task not found" },
        { status: 404 }
      );
    }

    // Update the task status to Completed
    const updatedTask = await TaskModel.findByIdAndUpdate(
      task._id,
      {
        $set: {
          status: "Completed"
        }
      },
      { new: true }
    );

    // Update the sent order status to Completed
    await SentOrderModel.findOneAndUpdate(
      { orderId },
      {
        $set: {
          status: "Completed"
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "OrderModel has been marked as fully completed",
      status: "Completed",
      task: updatedTask
    });

  } catch (error: any) {
    console.error("Error completing temporary order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper: reduce inventory for a product
async function updateInventoryForProduct(productType: string, quantity: number, branchName: string) {
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
    inventoryItem.quantity = inventoryItem.quantity - quantity;
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