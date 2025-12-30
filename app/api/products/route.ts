// app/api/products/route.ts
import { NextResponse } from "next/server";
import { OrderModel } from "@/lib/database/models";
import { connectToDatabase } from "@/lib/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    // Unwind orderItems and group by Item Name,
    // summing up the quantity sold (or revenue, as desired).
    const productData = await OrderModel.aggregate([
      { $match: { orderDate: { $gte: sevenDaysAgo } } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          value: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { value: -1 } },
    ]);

    const formattedData = productData.map((d: any) => ({
      name: d._id,
      value: d.value,
    }));

    return NextResponse.json({ productData: formattedData });
  } catch (error: any) {
    console.error("Error fetching product data:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
