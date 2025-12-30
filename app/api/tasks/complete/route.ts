// app/api/tasks/complete/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TaskModel } from "@/lib/database/models";
import { OrderModel } from "@/lib/database/models";
import { InventoryItemModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { OnlinePaymentModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { parseCurrency, addCurrency } from "@/lib/currency";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export const runtime = "nodejs";

// Define interface for JWT payload
interface JwtPayload {
  branch: string;
  [key: string]: any;
}

// Define interface for request body
interface RequestPayload {
  taskId: string;
  paidAmount: string | number;
  paymentMethod: 'cash' | 'card' | 'cheque' | 'credits' | 'online';
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  billNumber?: string;
  totalPrice?: number;
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

    // Get request data
    const { 
      taskId, 
      paidAmount, 
      paymentMethod = 'cash',
      chequeNumber,
      bankName,
      chequeDate,
      billNumber,
      totalPrice
    }: RequestPayload = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "TaskModel ID is required" }, { status: 400 });
    }
    if (!paymentMethod || !['cash', 'card', 'cheque', 'credits', 'online'].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // If paymentMethod is cheque, require chequeNumber + bankName
    if (paymentMethod === 'cheque') {
      if (!chequeNumber || !bankName) {
        return NextResponse.json({ 
          error: "Cheque number and bank name are required for cheque payments" 
        }, { status: 400 });
      }
    }

    // If paymentMethod is online, require billNumber + bankName
    if (paymentMethod === 'online') {
      if (!billNumber || !bankName) {
        return NextResponse.json({ 
          error: "Bill number and bank name are required for online payments" 
        }, { status: 400 });
      }
    }

    // Find the task to complete
    const task = await TaskModel.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    // Find the corresponding order using task.orderId
    const order = await OrderModel.findOne({ orderId: task.orderId });
    if (!order) {
      return NextResponse.json({ error: "OrderModel not found" }, { status: 404 });
    }

    // Calculate product total from task.products (could be multiple)
    const productTotal = task.products && task.products.length > 0
      ? task.products.reduce((total: number, product: any) => {
          return total + (product.productPrice * product.productQuantity);
        }, 0)
      : (task.productPrice && task.productQuantity) 
          ? task.productPrice * task.productQuantity 
          : 0;
    
    // Use totalPrice from request if provided; else fallback to max(order.totalPrice, productTotal)
    const finalTotalPrice = totalPrice || Math.max(order.totalPrice || 0, productTotal);
    
    // If order.totalPrice is 0 or not set, update it now
    if (!order.totalPrice || order.totalPrice === 0) {
      order.totalPrice = finalTotalPrice;
    }

    const currentAdvance = parseCurrency(order.advancePayment);
    const additionalPayment = parseCurrency(paidAmount?.toString());
    const totalPaid = addCurrency(currentAdvance, additionalPayment);

    // Build payment object to push into task.paymentHistory
    const paymentInfo: any = {
      method: paymentMethod,
      amount: additionalPayment,
      date: new Date(),
    };
    if (paymentMethod === 'cheque') {
      paymentInfo.chequeDetails = {
        chequeNumber,
        bankName,
        chequeDate: chequeDate ? new Date(chequeDate) : new Date(),
        status: 'pending',
      };
    }
    if (paymentMethod === 'online') {
      paymentInfo.onlineDetails = {
        billNumber,
        bankName,
        status: 'pending',
      };
    }

    // Initialize paymentHistory if needed
    if (!task.paymentHistory) {
      task.paymentHistory = [];
    }
    task.paymentHistory.push(paymentInfo);

    // Create online payment record if payment method is online
    if (paymentMethod === 'online') {
      await OnlinePaymentModel.create({
        taskId: task._id,
        orderId: task.orderId,
        amount: additionalPayment,
        bankName,
        billNumber,
        paymentDate: new Date(),
        status: 'pending',
        branch: branchRecord.name,
        customerName: order.customerName,
        customerWhatsapp: order.whatsappNumber
      });
    }

    // Case A: Partial payment (still < finalTotalPrice)
    if (totalPaid < finalTotalPrice) {
      order.advancePayment = totalPaid;
      task.advancePayment = totalPaid;
      // TaskModel remains "In Progress" → “payment pending”
    }
    // Case B: Full or overpayment
    else {
      order.advancePayment = finalTotalPrice;
      task.fullPayment = finalTotalPrice;
      task.endPrice = finalTotalPrice;
      task.endTime = new Date();

      // If it's a cheque or credit, move straight into Temporary Completed
      if (paymentMethod === 'cheque' || paymentMethod === 'credits') {
        task.status = "Temporary Completed";
        if (paymentMethod === 'cheque') {
          task.chequeStatus = 'pending';
        }
        task.lastPaymentMethod = paymentMethod;

        // ───> **Immediately reduce inventory here** (since we've effectively "delivered" the goods)
        if (task.products && task.products.length > 0) {
          for (const product of task.products) {
            await updateInventoryForProduct(
              product.productType,
              product.productQuantity + (product.totalWaste || 0),
              branchRecord.name
            );
          }
        }
        // Backward compatibility for older single‐product fields:
        else if (task.productType && task.productQuantity) {
          await updateInventoryForProduct(
            task.productType,
            task.productQuantity + (task.totalWaste || 0),
            branchRecord.name
          );
        }
      }
      // If it's cash, card, or online, mark fully Completed and reduce inventory now:
      else {
        task.status = "Completed";
        task.lastPaymentMethod = paymentMethod;

        if (task.products && task.products.length > 0) {
          for (const product of task.products) {
            await updateInventoryForProduct(
              product.productType,
              product.productQuantity + (product.totalWaste || 0),
              branchRecord.name
            );
          }
        } else if (task.productType && task.productQuantity) {
          await updateInventoryForProduct(
            task.productType,
            task.productQuantity + (task.totalWaste || 0),
            branchRecord.name
          );
        }
      }
    }

    await order.save();
    const updatedTask = await task.save();

    let message = "";
    if (totalPaid < finalTotalPrice) {
      message = "Partial payment recorded.";
    } else {
      if (paymentMethod === 'cheque' || paymentMethod === 'credits') {
        const paymentType = paymentMethod === 'cheque' ? 'cheque' : 'credit';
        message = `Full payment received → task moved to Temporary Completed (pending ${paymentType} clearance).`;
      } else {
        message = "Payment completed and task marked as Completed.";
      }
    }

    return NextResponse.json({ 
      success: true, 
      task: updatedTask,
      message,
      isTemporaryCompleted: task.status === "Temporary Completed"
    });
  } catch (error: any) {
    console.error("Error completing task:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
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

  // Finally, if it’s an ObjectId and we have a separate Product collection, attempt lookup there
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
