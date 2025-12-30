import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/database";
import TaskModel from "@/lib/database/models/Task";
import OrderModel from "@/lib/database/models/Order";
import BranchesLoginModel from "@/lib/database/models/Branches_login";
import BranchModel from "@/lib/database/models/Branch";

export const runtime = "nodejs";

interface JwtPayload {
  branch: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Set timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
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
    const paymentOption = searchParams.get('paymentOption') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100'); // Limit results
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter.$lte = end;
    }
    
    // Get user info to check permissions and find the actual branch name
    const user = await BranchesLoginModel.findOne({ branch: decoded.branch });
    const isAdmin = user?.role === 'admin';
    
    // Get the actual branch name from the Branch collection
    let actualBranchName = null;
    try {
      const branchDoc = await BranchModel.findById(decoded.branch);
      if (branchDoc && branchDoc.name) {
        actualBranchName = branchDoc.name;
      }
    } catch (error) {
      console.log('Could not find branch by ID, trying direct lookup');
    }
    
    // If no branch found by ID, try to find by the decoded branch as a name
    if (!actualBranchName) {
      const branchByName = await BranchModel.findOne({ name: decoded.branch });
      if (branchByName) {
        actualBranchName = branchByName.name;
      } else {
        // Fallback: use the decoded branch as is
        actualBranchName = decoded.branch;
      }
    }
    
    console.log('User info:', user);
    console.log('Is admin:', isAdmin);
    console.log('Decoded branch:', decoded.branch);
    console.log('Actual branch name:', actualBranchName);
    console.log('Branch parameter:', branch);
    
    // Build branch filter properly
    let branchFilter = {};
    if (isAdmin && branch === 'all') {
      // Admin viewing all branches - no filter
      branchFilter = {};
    } else if (isAdmin && branch !== 'all' && branch !== 'current') {
      // Admin can filter by specific branch
      branchFilter = { branch };
    } else {
      // Regular user or admin viewing current branch - ALWAYS filter by current branch
      branchFilter = { branch: actualBranchName };
    }
    
    console.log('Fetching invoices with filters:', {
      branch: branchFilter,
      dateFilter,
      startDate,
      endDate,
      paymentOption,
      isAdmin,
      actualBranchName,
      branchParam: branch
    });

    // Helper function to determine payment method
    const getPaymentMethod = (task: any) => {
      if (task.lastPaymentMethod) {
        return task.lastPaymentMethod;
      }
      
      // Check for online payment
      if (task.onlinePaymentStatus === 'confirmed') {
        return 'online';
      }
      
      // Check for cheque
      if (task.chequeStatus === 'cleared') {
        return 'cheque';
      }
      
      // Check payment history for clues
      if (task.paymentHistory && task.paymentHistory.length > 0) {
        const lastPayment = task.paymentHistory[task.paymentHistory.length - 1];
        if (lastPayment.method) {
          return lastPayment.method;
        }
      }
      
      // Default to cash if no other method is identified
      return 'cash';
    };

      // Fetch tasks that have any form of payment (advancePayment or paymentHistory)
      const taskQuery = {
        $or: [
          { paymentHistory: { $exists: true, $ne: [] } },
          { advancePayment: { $gt: 0 } },
          { fullPayment: { $gt: 0 } }
        ],
        ...branchFilter
      };
      
      console.log('Task query:', JSON.stringify(taskQuery, null, 2));
      
      // Fetch tasks with payment history for invoice reports
      const tasksWithPayments = await TaskModel.find(taskQuery)
        .sort({ orderId: 1 }) // Sort by orderId to get all tasks in order
        .limit(1000) // Much higher limit to ensure we get all tasks
        // .skip(skip) // Temporarily remove skip to get all tasks
        .lean()
        .select('orderId status fullPayment endPrice products totalPrice branch createdAt endTime startTime readyForPayment invoiceData paymentHistory advancePayment');
      
      console.log(`Found ${tasksWithPayments.length} tasks with payment history`);
      
      // Debug: Check ALL TES orders (not just ones with payments)
      const allTesOrders = await TaskModel.find({
        ...branchFilter,
        orderId: { $regex: /^TES/ }
      })
        .select('orderId status advancePayment fullPayment paymentHistory createdAt')
        .sort({ orderId: 1 })
        .lean();
      
      console.log(`Found ${allTesOrders.length} total TES orders:`, allTesOrders.map(t => ({
        orderId: t.orderId,
        status: t.status,
        advancePayment: t.advancePayment,
        fullPayment: t.fullPayment,
        hasPaymentHistory: t.paymentHistory && t.paymentHistory.length > 0
      })));
      
      // Debug: Check if TES0040 exists
      const tes0040 = await TaskModel.findOne({ orderId: 'TES0040' })
        .select('orderId status advancePayment fullPayment paymentHistory createdAt branch')
        .lean();
      
      console.log('TES0040 check:', tes0040 ? {
        orderId: tes0040.orderId,
        status: tes0040.status,
        advancePayment: tes0040.advancePayment,
        fullPayment: tes0040.fullPayment,
        hasPaymentHistory: tes0040.paymentHistory && tes0040.paymentHistory.length > 0,
        branch: tes0040.branch
      } : 'TES0040 NOT FOUND');
      
      // Debug: Log task statuses and payment info
      if (tasksWithPayments.length > 0) {
        console.log('Sample tasks found:');
        tasksWithPayments.slice(0, 10).forEach((task, index) => {
          console.log(`Task ${index + 1}:`, {
            orderId: task.orderId,
            status: task.status,
            advancePayment: task.advancePayment,
            fullPayment: task.fullPayment,
            hasPaymentHistory: task.paymentHistory && task.paymentHistory.length > 0,
            paymentHistoryLength: task.paymentHistory ? task.paymentHistory.length : 0,
            createdAt: task.createdAt
          });
        });
        
        // Count by status
        const statusCounts = tasksWithPayments.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Tasks found by status:', statusCounts);
        
        // Show orderId range
        const orderIds = tasksWithPayments.map(t => t.orderId).sort();
        console.log('OrderId range:', {
          first: orderIds[0],
          last: orderIds[orderIds.length - 1],
          total: orderIds.length
        });
      } else {
        console.log('NO TASKS FOUND WITH PAYMENTS!');
      }
      
      // Fetch customer information from Order table
      const orderIds = tasksWithPayments.map(task => task.orderId);
      const orders = await OrderModel.find({ orderId: { $in: orderIds } })
        .lean()
        .select('orderId customerName customerEmail whatsappNumber');
      
      // Create a mapping from orderId to customer information
      const customerInfoMap: Record<string, any> = {};
      orders.forEach((order: any) => {
        customerInfoMap[order.orderId] = {
          customerName: order.customerName || 'Unknown Customer',
          customerEmail: order.customerEmail || '',
          whatsappNumber: order.whatsappNumber || ''
        };
      });
      
      // Debug: Log some sample data to see what branches are being returned
      if (tasksWithPayments.length > 0) {
        console.log('Sample task branches:', tasksWithPayments.slice(0, 3).map(t => ({ orderId: t.orderId, branch: t.branch })));
      }
    
    // Format the response data
    const invoices = [];
    
    // Process tasks and create invoice entries from payment history
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
          
          // Apply payment method filter
          if (paymentOption !== 'all' && payment.method !== paymentOption) {
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
            branch: task.branch,
            paymentMethod: payment.method || 'cash'
          });
          
          console.log(`Created invoice for ${task.orderId} payment ${paymentIndex + 1}: ${payment.amount} on ${payment.date}`);
        });
      }
      // Case 2: Task has advancePayment or fullPayment but no paymentHistory
      else if ((task.advancePayment && task.advancePayment > 0) || (task.fullPayment && task.fullPayment > 0)) {
        // Use the task creation date as the payment date for legacy tasks
        const paymentDate = task.createdAt;
        let isInDateRange = true;
        
        console.log(`Checking legacy task ${task.orderId}: paymentDate=${paymentDate}, dateFilter=`, dateFilter);
        
        if (Object.keys(dateFilter).length > 0) {
          if (dateFilter.$gte && paymentDate < dateFilter.$gte) {
            isInDateRange = false;
            console.log(`Task ${task.orderId} filtered out: paymentDate ${paymentDate} < startDate ${dateFilter.$gte}`);
          }
          if (dateFilter.$lte && paymentDate > dateFilter.$lte) {
            isInDateRange = false;
            console.log(`Task ${task.orderId} filtered out: paymentDate ${paymentDate} > endDate ${dateFilter.$lte}`);
          }
        }
        
        if (!isInDateRange) {
          continue;
        }
        
        // For legacy tasks, check if we need to split advance and full payment
        const advancePayment = task.advancePayment || 0;
        const fullPayment = task.fullPayment || 0;
        
        // If there's both advance and full payment, create separate entries
        if (advancePayment > 0 && fullPayment > advancePayment) {
          const paymentMethod = getPaymentMethod(task);
          
          // Apply payment method filter
          if (paymentOption !== 'all' && paymentMethod !== paymentOption) {
            continue;
          }
          
          // Create entry for advance payment (use order creation date)
          const orderCreatedDate = task.startTime || task.createdAt || task.createdAt;
          invoices.push({
            invoiceNo: `${task.orderId}-advance`,
            invoiceDate: orderCreatedDate,
            orderCreatedDate: orderCreatedDate,
            cashierName: task.branch,
            customerName: customerName,
            invoiceAmount: advancePayment,
            type: 'Payment',
            branch: task.branch,
            paymentMethod: paymentMethod
          });
          
          // Create entry for remaining payment (use end time if available)
          const remainingAmount = fullPayment - advancePayment;
          const paymentDate = task.endTime || task.endTime || task.createdAt;
          invoices.push({
            invoiceNo: `${task.orderId}-final`,
            invoiceDate: paymentDate,
            orderCreatedDate: orderCreatedDate,
            cashierName: task.branch,
            customerName: customerName,
            invoiceAmount: remainingAmount,
            type: 'Payment',
            branch: task.branch,
            paymentMethod: paymentMethod
          });
          
          console.log(`Created split invoice for ${task.orderId}: advance=${advancePayment}, remaining=${remainingAmount}`);
        } else {
          // Single payment case
          const paymentAmount = fullPayment || advancePayment || 0;
          const paymentMethod = getPaymentMethod(task);
          
          // Apply payment method filter
          if (paymentOption !== 'all' && paymentMethod !== paymentOption) {
            continue;
          }
          
          // Create invoice entry for this legacy payment
          invoices.push({
            invoiceNo: task.orderId,
            invoiceDate: paymentDate,
            orderCreatedDate: task.startTime || task.createdAt,
            cashierName: task.branch,
            customerName: customerName,
            invoiceAmount: paymentAmount,
            type: 'Payment',
            branch: task.branch,
            paymentMethod: paymentMethod
          });
          
          console.log(`Created legacy invoice for ${task.orderId}: ${paymentAmount} on ${paymentDate}`);
        }
      }
    }
    
    
    // Sort all invoices by date (oldest first)
    invoices.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
    
    // Final safety filter: ensure we only return invoices from the current branch
    // This is a safety measure in case the database queries didn't filter properly
    const filteredInvoices = invoices.filter(invoice => {
      const invoiceBranch = invoice.branch || invoice.cashierName;
      return invoiceBranch === actualBranchName;
    });
    
    console.log(`After final branch filter: ${filteredInvoices.length} invoices (was ${invoices.length})`);
    console.log('Filtered out invoices:', invoices.filter(inv => {
      const invoiceBranch = inv.branch || inv.cashierName;
      return invoiceBranch !== actualBranchName;
    }).map(inv => ({ orderId: inv.invoiceNo, branch: inv.branch, cashierName: inv.cashierName })));
    
    // Log summary for debugging
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
    console.log(`Invoice Summary: ${filteredInvoices.length} invoices, Total: ${totalAmount}`);
    
    // Debug: Show sample invoices
    if (filteredInvoices.length > 0) {
      console.log('Sample invoices created:');
      filteredInvoices.slice(0, 3).forEach((inv, index) => {
        console.log(`Invoice ${index + 1}:`, {
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          invoiceAmount: inv.invoiceAmount,
          paymentMethod: inv.paymentMethod,
          customerName: inv.customerName
        });
      });
    }
    
      return NextResponse.json({
        success: true,
        invoices: filteredInvoices,
        total: filteredInvoices.length,
        totalAmount: totalAmount,
        pagination: {
          page,
          limit,
          hasMore: filteredInvoices.length === limit
        }
      });
    })();

    // Race between the operation and timeout
    return await Promise.race([operationPromise, timeoutPromise]);
    
  } catch (error: any) {
    console.error("Error fetching invoice report:", error);
    
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
