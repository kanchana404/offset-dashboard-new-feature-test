// app/api/tasks/credit/route.ts
import { NextResponse } from "next/server";

import { OrderModel, CreditModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    }

    // 1) Look up the OrderModel to get whatsappNumber, customerName, customerEmail
    const order = await OrderModel.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: "OrderModel not found." }, { status: 404 });
    }

    const whatsappNumber = order.whatsappNumber;
    const customerName = order.customerName;
    const customerEmail = order.customerEmail;

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "OrderModel has no whatsappNumber on file." },
        { status: 400 }
      );
    }

    // 2) Try to find an existing Credit document
    let creditDoc = await CreditModel.findOne({ whatsappNumber });
    if (!creditDoc) {
      // 3) If none exists, create one now, copying name/email from the OrderModel
      creditDoc = await CreditModel.create({
        whatsappNumber,
        customerName,
        customerEmail,
        balance: 0,
        usedAmount: 0,
      });
    }

    return NextResponse.json({
      whatsappNumber: creditDoc.whatsappNumber,
      customerName: creditDoc.customerName,
      customerEmail: creditDoc.customerEmail,
      balance: creditDoc.balance,
      usedAmount: creditDoc.usedAmount,
    });
  } catch (err: any) {
    console.error("GET /api/tasks/credit:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { orderId, amount } = (await req.json()) as {
      orderId: string;
      amount: number;
    };

    if (!orderId || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Must provide orderId and numeric amount." },
        { status: 400 }
      );
    }

    // 1) Find the OrderModel → to extract whatsappNumber, customerName, customerEmail
    const order = await OrderModel.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: "OrderModel not found." }, { status: 404 });
    }
    const whatsappNumber = order.whatsappNumber;
    const customerName = order.customerName;
    const customerEmail = order.customerEmail;

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "OrderModel has no whatsappNumber on file." },
        { status: 400 }
      );
    }

    // 2) Fetch (or create) that Credit doc, populating name/email if newly created
    let creditDoc = await CreditModel.findOne({ whatsappNumber });
    if (!creditDoc) {
      creditDoc = new CreditModel({
        whatsappNumber,
        customerName,
        customerEmail,
        balance: 0,
        usedAmount: 0,
      });
    }

    // 3) If deducting (amount < 0), ensure enough balance
    if (amount < 0 && creditDoc.balance + amount < 0) {
      return NextResponse.json(
        {
          error: `Insufficient credits (need ₹${(-amount).toFixed(
            2
          )}, but only ₹${creditDoc.balance.toFixed(2)} available).`,
        },
        { status: 400 }
      );
    }

    // 4) Apply the change
    creditDoc.balance += amount;
    if (amount < 0) {
      creditDoc.usedAmount += -amount;
    }
    // 5) If customerName/email changed in OrderModel since the last time, keep them in sync:
    creditDoc.customerName = customerName;
    creditDoc.customerEmail = customerEmail;
    await creditDoc.save();

    return NextResponse.json({
      whatsappNumber: creditDoc.whatsappNumber,
      customerName: creditDoc.customerName,
      customerEmail: creditDoc.customerEmail,
      balance: creditDoc.balance,
      usedAmount: creditDoc.usedAmount,
    });
  } catch (err: any) {
    console.error("POST /api/tasks/credit:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
