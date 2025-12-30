// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { OrderModel, TaskModel, SentOrderModel, BranchModel } from "@/lib/database/models";
import { generateNextOrderId } from "@/utils/orderIdGenerator";
import { parseCurrency } from "@/lib/currency";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Get branch info from token
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    const branchName = branchRecord.name;

    // Validate required due_date
    if (!data.expectedEndDate) {
      return NextResponse.json({ error: "Expected completion date is required" }, { status: 400 });
    }

    // Generate the next order ID automatically
    console.log(`Generating order ID for branch: ${branchName}`);
    let orderId = await generateNextOrderId(branchName);
    console.log(`Generated order ID: ${orderId}`);

    if (!orderId) {
      return NextResponse.json({ error: "Failed to generate order ID" }, { status: 500 });
    }

    // Check if the generated order ID already exists (extra safety check)
    const existingOrder = await OrderModel.findOne({ orderId });
    if (existingOrder) {
      console.error(`Order ID collision detected: ${orderId}`);
      console.error(`Existing order details:`, {
        orderId: existingOrder.orderId,
        customerName: existingOrder.customerName,
        createdAt: existingOrder.createdAt
      });
      
      // Try to generate a new order ID with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let newOrderId = orderId;
      
      while (retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Retrying order ID generation (attempt ${retryCount}/${maxRetries})...`);
        
        // Wait a bit before retry to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        
        newOrderId = await generateNextOrderId(branchName);
        console.log(`🆔 New generated order ID: ${newOrderId}`);
        
        // Check if the new ID is also taken
        const newExistingOrder = await OrderModel.findOne({ orderId: newOrderId });
        if (!newExistingOrder) {
          console.log(`✅ New order ID ${newOrderId} is available`);
          orderId = newOrderId;
          break;
        } else {
          console.warn(`⚠️ New order ID ${newOrderId} is also taken`);
        }
      }
      
      if (retryCount >= maxRetries) {
        return NextResponse.json({ 
          error: "Unable to generate unique order ID after multiple attempts. Please try again." 
        }, { status: 500 });
      }
    }

    // Prepare order data with the generated order ID
    const orderData = {
      orderId: orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail || "",
      whatsappNumber: data.whatsappNumber,
      category: data.category,
      description: data.description,
      images: data.images || [],
      orderItems: data.orderItems || [],
      totalPrice: data.fullPayment || 0, // Use full payment as totalPrice
      advancePayment: parseCurrency(data.advancePayment),
      sendToMainBranch: data.sendToMainBranch,
      assignTask: data.assignTask !== undefined ? data.assignTask : true,
      sentToMainBranch: data.sendToMainBranch,
      orderDate: data.orderDate || new Date(),
      due_date: new Date(data.expectedEndDate), // Store expected completion date as due_date
      branch: branchName,
    };

    console.log(`Creating order with data:`, {
      orderId,
      customerName: orderData.customerName,
      branch: branchName
    });

    // Create the order with additional error handling
    let createdOrder;
    try {
      createdOrder = await OrderModel.create(orderData);
      console.log(`✅ Order created successfully in database: ${orderId}`);
    } catch (createError: any) {
      console.error(`❌ Failed to create order in database: ${createError.message}`);
      
      // If it's a duplicate key error, we need to handle it specially
      if (createError.name === 'MongoError' && createError.code === 11000) {
        console.error(`🔄 Duplicate order ID detected during creation: ${orderId}`);
        
        // Try to generate a new order ID and retry
        const newOrderId = await generateNextOrderId(branchName);
        console.log(`🆔 Generated new order ID for retry: ${newOrderId}`);
        
        // Update the order data with new ID
        orderData.orderId = newOrderId;
        
        // Try to create again
        createdOrder = await OrderModel.create(orderData);
        console.log(`✅ Order created successfully with new ID: ${newOrderId}`);
        
        // Update the orderId variable for the rest of the function
        orderId = newOrderId;
      } else {
        throw createError; // Re-throw other errors
      }
    }

    // Determine task status and needsTransfer based on sendToMainBranch flag.
    const taskStatus = data.sendToMainBranch ? "Sent to Main Branch" : "INVOICED"; // Changed to INVOICED
    const needsTransfer = data.sendToMainBranch;

    // Calculate payment amounts
    const totalAmount = parseCurrency(data.fullPayment) || parseCurrency(data.totalPrice) || 0;
    const advanceAmount = parseCurrency(data.advancePayment) || 0;
    const balanceDue = totalAmount - advanceAmount;

    // Create a task with the determined status and needsTransfer field
    const taskData = {
      name: data.customerName || `Order ${orderId}`, // Use customer name
      orderId: orderId, // This will use the potentially updated orderId
      // Store product information in the new products array format
      products: data.orderItems ? data.orderItems.map((item: any) => ({
        productType: item.product,
        productPrice: item.unitPrice,
        productQuantity: item.quantity,
        totalWaste: item.totalWaste
      })) : [],
      priority: "Normal",
      branch: branchName,
      status: taskStatus,
      startTime: new Date(),
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
      description: data.description || "No description",
      images: data.images || [],
      needsTransfer: needsTransfer,
      // New payment tracking fields
      totalAmount: totalAmount,
      paidAmount: advanceAmount, // If advance was paid
      balanceDue: balanceDue,
      // Legacy fields (keep for backward compatibility)
      advancePayment: advanceAmount,
      fullPayment: totalAmount,
      invoiceCreated: true, // Auto-created
      invoiceData: {
        orderId: orderId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        whatsappNumber: data.whatsappNumber,
        totalAmount: totalAmount,
        advancePayment: advanceAmount,
        balanceDue: balanceDue,
        createdAt: new Date(),
      },
    };

    const createdTask = await TaskModel.create(taskData);

    // Create a SentOrder record if the order should be sent to the workshop (main branch)
    if (data.sendToMainBranch) {
      const sentOrderData = {
        orderId: orderId,
        customerName: data.customerName,
        orderDate: data.orderDate || new Date(),
        expectedEndDate: data.expectedEndDate,
        totalPrice: data.fullPayment || 0, // Use full payment as totalPrice
        sentBranch: branchName,
        status: "Sent to Main Branch",
        images: data.images || [],
        // Include product information from orderItems
        products: data.orderItems || [],
        level: 1,
        invoiceCreated: false,
        fullPayment: data.fullPayment || 0,
        advancePayment: data.advancePayment || 0
      };
      await SentOrderModel.create(sentOrderData);
    }

    console.log(`Order created successfully: ${orderId}`);

    return NextResponse.json({ 
      order: createdOrder, 
      task: createdTask,
      generatedOrderId: orderId // Return the generated ID for the frontend
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    
    // Provide more specific error messages
    if (error.name === 'MongoError' && error.code === 11000) {
      console.error(`MongoDB duplicate key error: ${error.message}`);
      return NextResponse.json(
        { error: "Order ID already exists. Please try again." },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      console.error(`Validation error: ${error.message}`);
      return NextResponse.json(
        { error: `Validation failed: ${error.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET method for fetching orders
export async function GET() {
  try {
    await connectToDatabase();

    const orders = await OrderModel.find({})
      .select("orderId customerName customerEmail whatsappNumber category description totalPrice advancePayment orderDate due_date branch")
      .sort({ createdAt: -1 }); // Sort by newest first

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}