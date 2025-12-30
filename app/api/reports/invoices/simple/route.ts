import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import TaskModel from "@/lib/database/models/Task";
import OrderModel from "@/lib/database/models/Order";

export const runtime = "nodejs";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Set timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000);
    });

    const operationPromise = (async () => {
      // Check authentication
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;
      
      if (!token) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      // Connect to database
      await connectToDatabase();
      
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const branch = searchParams.get('branch') || decoded.branch;
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 records
      
      // Build date filter
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      
      // Build branch filter
      let branchFilter = {};
      if (branch !== 'all') {
        branchFilter = { branch };
      }
      
      // Query for tasks that have any form of payment (advancePayment or paymentHistory)
      const taskQuery = {
        $or: [
          { paymentHistory: { $exists: true, $ne: [] } },
          { advancePayment: { $gt: 0 } },
          { fullPayment: { $gt: 0 } }
        ],
        ...branchFilter
      };
      
      // Get only essential fields with strict limits
      const tasksWithPayments = await TaskModel.find(taskQuery)
        .sort({ createdAt: 1 })
        .limit(limit * 3) // Increase limit since we'll filter by payment dates
        .lean()
        .select('orderId fullPayment endPrice totalPrice branch createdAt endTime startTime name invoiceData paymentHistory advancePayment');
      
      // Fetch customer information from Order table
      const orderIds = tasksWithPayments.map(task => task.orderId);
      const orders = await OrderModel.find({ orderId: { $in: orderIds } })
        .lean()
        .select('orderId customerName');
      
      // Create a mapping from orderId to customer information
      const customerInfoMap: Record<string, any> = {};
      orders.forEach((order: any) => {
        customerInfoMap[order.orderId] = {
          customerName: order.customerName || 'Unknown Customer'
        };
      });
      
      // Format invoices from payment history
      const invoices = [];
      
      for (const task of tasksWithPayments) {
        // Get customer information - prioritize invoiceData, then Order table
        let customerName = 'Unknown Customer';
        
        // First check if task has invoiceData with customerName
        if (task.invoiceData && task.invoiceData.customerName) {
          customerName = task.invoiceData.customerName;
        } else {
          // Fallback to Order table
          const customerInfo = customerInfoMap[task.orderId];
          customerName = customerInfo?.customerName || 'Unknown Customer';
        }
        
        // Case 1: Task has paymentHistory - process each payment
        if (task.paymentHistory && Array.isArray(task.paymentHistory) && task.paymentHistory.length > 0) {
          task.paymentHistory.forEach((payment: any, paymentIndex: number) => {
            // Skip if payment amount is 0 or negative (failed payments)
            if (!payment.amount || payment.amount <= 0) {
              return;
            }
            
            // Check if payment date falls within the selected date range
            const paymentDate = new Date(payment.date);
            let isInDateRange = true;
            
            if (Object.keys(dateFilter).length > 0) {
              if (dateFilter.$gte && paymentDate < dateFilter.$gte) {
                isInDateRange = false;
              }
              if (dateFilter.$lte && paymentDate > dateFilter.$lte) {
                isInDateRange = false;
              }
            }
            
            if (!isInDateRange) {
              return;
            }
            
            // Create invoice entry for this payment
            invoices.push({
              invoiceNo: `${task.orderId}-${paymentIndex + 1}`,
              invoiceDate: payment.date,
              orderCreatedDate: task.startTime || task.createdAt,
              cashierName: task.branch,
              customerName: customerName,
              invoiceAmount: payment.amount,
              type: 'Payment',
              branch: task.branch
            });
          });
        }
        // Case 2: Task has advancePayment or fullPayment but no paymentHistory
        else if ((task.advancePayment && task.advancePayment > 0) || (task.fullPayment && task.fullPayment > 0)) {
          // Use the task creation date as the payment date for legacy tasks
          const paymentDate = task.createdAt;
          let isInDateRange = true;
          
          if (Object.keys(dateFilter).length > 0) {
            if (dateFilter.$gte && paymentDate < dateFilter.$gte) {
              isInDateRange = false;
            }
            if (dateFilter.$lte && paymentDate > dateFilter.$lte) {
              isInDateRange = false;
            }
          }
          
          if (!isInDateRange) {
            continue;
          }
          
          // Determine payment amount
          const paymentAmount = task.fullPayment || task.advancePayment || 0;
          
          // Create invoice entry for this legacy payment
          invoices.push({
            invoiceNo: task.orderId,
            invoiceDate: paymentDate,
            orderCreatedDate: task.startTime || task.createdAt,
            cashierName: task.branch,
            customerName: customerName,
            invoiceAmount: paymentAmount,
            type: 'Payment',
            branch: task.branch
          });
        }
      }
      
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
      
      return NextResponse.json({
        success: true,
        invoices,
        total: invoices.length,
        totalAmount: totalAmount,
        message: "Simple invoice report (limited data)"
      });
    })();

    // Race between the operation and timeout
    return await Promise.race([operationPromise, timeoutPromise]);
    
  } catch (error: any) {
    console.error("Error fetching simple invoice report:", error);
    
    // Handle timeout specifically
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { error: "Request timeout - please try again" },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoice report" },
      { status: 500 }
    );
  }
}
