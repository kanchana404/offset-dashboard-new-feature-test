// app/api/tasks/main/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";
import { TaskModel } from "@/lib/database/models";
import { OrderModel } from "@/lib/database/models";

export const runtime = "nodejs";

// Define interface for JWT decoded data
interface JwtPayload {
  branch: string;
  [key: string]: any;
}

export async function GET() {
  try {
    await connectToDatabase();

    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use proper type assertion for decoded JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const branchId = decoded.branch;

    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }

    // Fetch tasks for the branch - only show IN_PROGRESS tasks (and legacy statuses for backward compatibility)
    const tasks = await TaskModel.find({ 
      branch: branchRecord.name,
      status: { $in: ["IN_PROGRESS", "In Progress", "Pending"] } // Include Pending for backward compatibility
    }).lean();

    // Extract unique orderIds from tasks
    const orderIds = tasks.map((task) => task.orderId);

    // Fetch orders with these orderIds
    const orders = await OrderModel.find({ orderId: { $in: orderIds } }).lean();

    // Create a mapping from orderId to order information
    const orderInfoMap: Record<string, any> = {};
    
    orders.forEach((order) => {
      // Store all relevant order information in the map, keyed by orderId
      orderInfoMap[order.orderId] = {
        category: order.category || "",
        totalPrice: order.totalPrice || 0,
        advancePayment: order.advancePayment || 0,
        customerName: order.customerName || "Unknown Customer",
        whatsappNumber: order.whatsappNumber || "",
        customerEmail: order.customerEmail || "",
        description: order.description || "",
        orderItems: order.orderItems || []
      };
    });

    // Merge task data with order data and return
    const tasksWithOrderInfo = tasks.map((task: any) => {
      const orderId = task.orderId as string;
      const orderInfo = orderInfoMap[orderId] || {};

      // Ensure we have products array initialized
      let products = task.products || [];
      
      // For backward compatibility, if task has old single-product structure but no products array
      if ((!products || products.length === 0) && task.productType && task.productType !== "N/A") {
        products = [{
          productType: task.productType,
          productPrice: task.productPrice || 0,
          productQuantity: task.productQuantity || 0,
          totalWaste: task.totalWaste || 0
        }];
      }
      
      // Calculate product total from products array
      const productTotal = products.reduce((total: number, product: any) => {
        return total + ((product.productPrice || 0) * (product.productQuantity || 1));
      }, 0);
      
      // Determine the total price based on different available sources
      let totalPrice = 0;
      
      // First priority: TaskModel's fullPayment field (if set, this is the final agreed price)
      if (task.fullPayment !== undefined && task.fullPayment > 0) {
        totalPrice = task.fullPayment;
      }
      // Second priority: OrderModel's totalPrice field (if available)
      else if (orderInfo.totalPrice !== undefined && orderInfo.totalPrice > 0) {
        totalPrice = orderInfo.totalPrice;
      }
      // Last priority: Calculate from products
      else {
        totalPrice = productTotal;
      }
      
      // Determine the advance payment from both sources
      const advancePayment = task.advancePayment !== undefined && task.advancePayment > 0 
        ? task.advancePayment 
        : (orderInfo.advancePayment || 0);
      
      // Return the enhanced task object with all needed information
      return {
        ...task,
        // Ensure products array exists
        products: products,
        
        // Basic task fields with fallbacks to order info
        category: task.category || orderInfo.category || "Unknown",
        description: task.description || orderInfo.description || "",
        
        // Customer details from order
        customerName: orderInfo.customerName || "Unknown Customer",
        whatsappNumber: orderInfo.whatsappNumber || "",
        customerEmail: orderInfo.customerEmail || "",
        
        // Payment information - CRITICAL for payment modal
        totalPrice: totalPrice,
        advancePayment: advancePayment, 
        productTotal: productTotal,
        
        // Make sure readyForPayment is initialized
        readyForPayment: task.readyForPayment || false
      };
    });

    // Return tasks along with branch information
    return NextResponse.json({ 
      tasks: tasksWithOrderInfo,
      branchInfo: {
        name: branchRecord.name,
        location: branchRecord.location,
        contact: branchRecord.contact || [],
        type: branchRecord.type
      }
    });
  } catch (error) {
    console.error("Error retrieving tasks for branch:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}