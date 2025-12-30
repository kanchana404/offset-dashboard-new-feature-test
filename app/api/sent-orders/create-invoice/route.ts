// app/api/sent-orders/create-invoice/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { SentOrderModel } from "@/lib/database/models";
import { TaskModel } from "@/lib/database/models";
import { OrderModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

interface RequestPayload {
  orderId: string;
  products: Array<{
    productType: string;
    productPrice: number;
    productQuantity: number;
    totalWaste?: number;
    dimensions?: string;
  }>;
  totalAmount: number;
}

export async function PUT(request: Request) {
  try {
    // Set timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 25 seconds')), 25000);
    });

    const operationPromise = (async () => {
      await connectToDatabase();

      // Get token and verify authentication
      const cookieStore = cookies();
      const token = (await cookieStore).get("token")?.value;
      if (!token) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      // Get request data
      const { orderId, products, totalAmount }: RequestPayload = await request.json();
      
      if (!orderId) {
        return NextResponse.json({ error: "OrderModel ID is required" }, { status: 400 });
      }
      
      if (!products || products.length === 0) {
        return NextResponse.json({ error: "Products are required" }, { status: 400 });
      }
      
      if (!totalAmount || totalAmount <= 0) {
        return NextResponse.json({ error: "Valid total amount is required" }, { status: 400 });
      }

      // Use Promise.all to run queries in parallel for better performance
      const [sentOrder, order] = await Promise.all([
        SentOrderModel.findOne({ orderId }).lean(),
        OrderModel.findOne({ orderId }).lean()
      ]);

      if (!sentOrder) {
        return NextResponse.json({ error: "Sent order not found" }, { status: 404 });
      }

      if (!order) {
        return NextResponse.json({ error: "OrderModel not found" }, { status: 404 });
      }

      // Create invoice data
      const invoiceData = {
        createdAt: new Date(),
        products: products,
        totalAmount: totalAmount,
        customerName: order.customerName,
        orderId: orderId,
        createdBy: decoded.branch
      };

      // Use bulk operations for better performance
      const updatePromises = [
        SentOrderModel.findOneAndUpdate(
          { orderId },
          {
            $set: {
              invoiceCreated: true,
              invoiceData: invoiceData,
              products: products,
              totalPrice: totalAmount
            }
          },
          { new: true, lean: true }
        )
      ];

      // Only update order if needed
      if (!order.totalPrice || order.totalPrice !== totalAmount) {
        updatePromises.push(
          OrderModel.findByIdAndUpdate(order._id, {
            $set: { totalPrice: totalAmount }
          }, { lean: true })
        );
      }

      const [updatedSentOrder] = await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        message: "Invoice created successfully",
        sentOrder: updatedSentOrder,
        invoice: invoiceData
      });
    })();

    // Race between the operation and timeout
    return await Promise.race([operationPromise, timeoutPromise]);

  } catch (error: any) {
    console.error("Error creating invoice:", error);
    
    // Handle timeout specifically
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { error: "Request timeout - please try again" },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}