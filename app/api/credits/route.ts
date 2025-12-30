import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Credit from "@/lib/database/models/Credits";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all customers with their credit information
    const customers = await Credit.find({}).sort({ customerName: 1 });

    // Transform the data to match the expected interface
    const customersWithCredit = customers.map((customer) => ({
      whatsappNumber: customer.whatsappNumber,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      balance: customer.balance,
      usedAmount: customer.usedAmount,
    }));

    return NextResponse.json({
      success: true,
      customers: customersWithCredit,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer credits",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { whatsappNumber, customerName, customerEmail, amount } = body;

    // Validate required fields
    if (!whatsappNumber || !customerName || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: whatsappNumber, customerName, and amount are required",
        },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number",
        },
        { status: 400 }
      );
    }

    // Check if customer already exists
    let customer = await Credit.findOne({ whatsappNumber });

    if (customer) {
      // Update existing customer's balance
      customer.balance += creditAmount;
      await customer.save();
    } else {
      // Create new customer with credit
      customer = new Credit({
        whatsappNumber,
        customerName,
        customerEmail: customerEmail || "",
        balance: creditAmount,
        usedAmount: 0,
      });
      await customer.save();
    }

    return NextResponse.json({
      success: true,
      message: `Credit of ₹${creditAmount.toFixed(2)} added successfully`,
      customer: {
        whatsappNumber: customer.whatsappNumber,
        customerName: customer.customerName,
        customerEmail: customer.customerEmail,
        balance: customer.balance,
        usedAmount: customer.usedAmount,
      },
    });
  } catch (error) {
    console.error("Error adding credit:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add credit",
      },
      { status: 500 }
    );
  }
}

