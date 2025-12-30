// app/api/completed-orders/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TaskModel, OrderModel, BranchModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  
  try {
    // Check environment variables first
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      return NextResponse.json({ 
        error: "Database configuration error - MONGODB_URI missing",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment variables');
      return NextResponse.json({ 
        error: "Server configuration error - JWT_SECRET missing",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    await connectToDatabase();
    
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ 
        error: "Not authenticated",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ 
        error: "Invalid token",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const branchId = (decoded as any).branch;
    
    if (!branchId) {
      return NextResponse.json({ 
        error: "Invalid token - no branch ID",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ 
        error: "Branch not found",
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }
    
    const branchName = branchRecord.name;
    
    // Get all completed tasks for this branch, sorted by endTime (latest first)
    const completedTasks = await TaskModel.find({ branch: branchName, status: "Completed" })
      .sort({ endTime: -1, startTime: -1 })
      .limit(50) // Limit to 50 to prevent timeout
      .lean(); // Use lean() for better performance
    
    // Get all order IDs from completed tasks
    const orderIds = completedTasks.map(task => task.orderId).filter(Boolean);
    
    // Fetch all order details in a single query
    const orderDetails = await OrderModel.find({ orderId: { $in: orderIds } }).lean();
    
    // Create a map for quick lookup
    const orderMap = new Map();
    orderDetails.forEach(order => {
      orderMap.set(order.orderId, order);
    });
    
    const completedOrders = [];
    
    // Process tasks with the order details from the map
    for (const task of completedTasks) {
      try {
        const totalCost = (task.productPrice || 0) * (task.productQuantity || 0);
        const advance = task.advancePayment || 0;
        const balanceDue = totalCost - advance;
        
        // Get order details from the map
        const orderData = orderMap.get(task.orderId);
        
        const enhancedOrder = {
          ...task,
          totalCost,
          balanceDue,
          // Order details from Order table (if any)
          customerName: orderData?.customerName,
          customerEmail: orderData?.customerEmail,
          whatsappNumber: orderData?.whatsappNumber,
          category: orderData?.category,
          orderDescription: orderData?.description,
          orderDate: orderData?.orderDate,
          // Include both order images and task images
          orderImages: orderData?.images || [], // Original order images
          taskImages: task.images || [], // Task-specific images
          artworkImage: task.artworkImage || null, // Artwork image from task
          // Legacy images field - combine all images for backward compatibility
          images: [
            ...(orderData?.images || []),
            ...(task.images || []),
            ...(task.artworkImage ? [task.artworkImage] : [])
          ],
        };
        
        completedOrders.push(enhancedOrder);
      } catch (taskError) {
        console.error('Error processing task:', taskError);
        // Continue with other tasks
      }
    }
    
    return NextResponse.json({ 
      completedOrders,
      timestamp: new Date().toISOString(),
      totalCount: completedTasks.length
    });
  } catch (error: any) {
    console.error("Error fetching completed orders:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    
    // Return a more detailed error response
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: "Failed to fetch completed orders",
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
