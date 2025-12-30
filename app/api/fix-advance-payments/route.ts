import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { OrderModel, TaskModel } from "@/lib/database/models";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Connect to database
    await connectToDatabase();
    
    console.log('Starting advance payment migration...');
    
    // Find all orders with advance payments
    const ordersWithAdvance = await OrderModel.find({
      advancePayment: { $gt: 0 }
    }).lean();
    
    console.log(`Found ${ordersWithAdvance.length} orders with advance payments`);
    
    let fixedCount = 0;
    const results = [];
    
    for (const order of ordersWithAdvance) {
      // Find the corresponding task
      const task = await TaskModel.findOne({ orderId: order.orderId });
      
      if (task) {
        // Check if task already has advance payment
        if (!task.advancePayment || task.advancePayment === 0) {
          // Update task with advance payment from order
          await TaskModel.findByIdAndUpdate(task._id, {
            advancePayment: order.advancePayment
          });
          
          fixedCount++;
          results.push({
            orderId: order.orderId,
            orderAdvancePayment: order.advancePayment,
            taskAdvancePayment: 'updated',
            status: 'fixed'
          });
          
          console.log(`Fixed ${order.orderId}: ${order.advancePayment}`);
        } else {
          results.push({
            orderId: order.orderId,
            orderAdvancePayment: order.advancePayment,
            taskAdvancePayment: task.advancePayment,
            status: 'already_had_advance_payment'
          });
        }
      } else {
        results.push({
          orderId: order.orderId,
          orderAdvancePayment: order.advancePayment,
          taskAdvancePayment: 'no_task_found',
          status: 'no_task'
        });
      }
    }
    
    console.log(`Migration completed. Fixed ${fixedCount} tasks.`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} tasks with missing advance payments`,
      totalOrdersWithAdvance: ordersWithAdvance.length,
      fixedCount,
      results: results.slice(0, 10) // Show first 10 results
    });
    
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
