import { NextRequest, NextResponse } from "next/server";
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
    
    // Get invoice data from request body
    const { invoices, startDate, endDate, paymentOption } = await request.json();
    
    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json({ error: "Invalid invoice data" }, { status: 400 });
    }
    
    // Generate PDF HTML
    const html = generateInvoiceReportHTML(invoices, startDate, endDate, decoded.branch, paymentOption);
    
    return NextResponse.json({
      success: true,
      html
    });
    
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function generateInvoiceReportHTML(invoices: any[], startDate: string, endDate: string, branchName: string, paymentOption: string = 'all') {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = currentDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Calculate total amount
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
  
  // Format date range for display
  const dateRangeText = startDate && endDate 
    ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
    : 'All Dates';
  
  // Format payment filter for display
  const paymentFilterText = paymentOption !== 'all' 
    ? `Payment Method: ${paymentOption.charAt(0).toUpperCase() + paymentOption.slice(1)}`
    : 'All Payment Methods';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Report - Solid Graphic</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        
        @media print {
            body { 
                background-color: white !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                margin: 0;
                padding: 10px;
            }
            .no-print {
                display: none !important;
            }
            @page {
                size: A4;
                margin: 10mm;
            }
        }
        
        .report-container {
            max-width: 1000px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .logo-img {
            width: 60px;
            height: 60px;
            margin-right: 15px;
            object-fit: contain;
        }
        
        .report-title {
            font-size: 24px;
            font-weight: bold;
            margin: 15px 0;
            color: #333;
        }
        
        .report-info {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            font-size: 14px;
            color: #666;
        }
        
        .date-range {
            font-weight: bold;
            color: #333;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 18px;
        }
        
        .invoice-table th {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            color: #333;
        }
        
        .invoice-table td {
            border: 1px solid #ddd;
            padding: 10px 8px;
            color: #555;
        }
        
        .invoice-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .invoice-table tr:hover {
            background-color: #f5f5f5;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .summary-section {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
            border: 1px solid #ddd;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 20px;
        }
        
        .summary-label {
            font-weight: bold;
            color: #555;
        }
        
        .summary-value {
            font-weight: bold;
            color: #333;
        }
        
        .total-row {
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 22px;
        }
        
        .total-row .summary-value {
            color: #000;
            font-size: 24px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <img src="/logo.jpg" alt="Solid Graphic Logo" class="logo-img" onerror="this.style.display='none'" />
                Solid Graphic (Pvt) Ltd
            </div>
            <div class="report-title">INVOICE REPORT</div>
            <div class="report-info">
                <div>
                    <div><strong>Generated By:</strong> ${branchName}</div>
                    <div><strong>Date:</strong> ${formattedDate} ${formattedTime}</div>
                </div>
                <div class="date-range">
                    <div><strong>Report Period:</strong></div>
                    <div>${dateRangeText}</div>
                    <div><strong>${paymentFilterText}</strong></div>
                </div>
            </div>
        </div>
        
        <!-- Invoice Table -->
        ${invoices.length > 0 ? `
        <table class="invoice-table">
            <thead>
                <tr>
                    <th style="width: 5%">#</th>
                    <th style="width: 12%">Order ID</th>
                    <th style="width: 18%">Payment Date & Time</th>
                    <th style="width: 12%">Cashier Name</th>
                    <th style="width: 20%">Customer</th>
                    <th style="width: 13%">Payment Method</th>
                    <th style="width: 20%" class="text-right">Revenue (Rs)</th>
                </tr>
            </thead>
            <tbody>
                ${invoices.map((invoice, index) => {
                  // Extract order ID from invoice number (format: ORD001-1, ORD001-advance, ORD001-final, or ORD001)
                  let orderId = invoice.invoiceNo;
                  if (invoice.invoiceNo.includes('-')) {
                    const parts = invoice.invoiceNo.split('-');
                    // If second part is 'advance' or 'final', only use first part
                    if (parts[1] === 'advance' || parts[1] === 'final') {
                      orderId = parts[0];
                    } else {
                      // For numbered invoices like ORD001-1, ORD001-2
                      orderId = parts[0];
                    }
                  }
                  
                  return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${orderId}</td>
                    <td>${new Date(invoice.invoiceDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</td>
                    <td>${invoice.cashierName}</td>
                    <td>${invoice.customerName}</td>
                    <td class="text-center">${invoice.paymentMethod ? invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1) : 'Cash'}</td>
                    <td class="text-right">${invoice.invoiceAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                </tr>
                `;
                }).join('')}
            </tbody>
        </table>
        
        <!-- Summary Section -->
        <div class="summary-section">
            <div class="summary-row">
                <span class="summary-label">Total Invoices:</span>
                <span class="summary-value">${invoices.length}</span>
            </div>
            <div class="summary-row total-row">
                <span class="summary-label">Total Revenue:</span>
                <span class="summary-value">Rs ${totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>
        </div>
        ` : `
        <div class="no-data">
            No invoices found for the selected period.
        </div>
        `}
        
        <!-- Footer -->
        <div class="footer">
            <p>This is a computer-generated report. No signature required.</p>
            <p>Solid Graphic (Pvt) Ltd - All rights reserved</p>
        </div>
    </div>
</body>
</html>
  `;
}
