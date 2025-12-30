import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import InventoryItem from "@/lib/database/models/InventoryItem";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const productId = params.id;
    
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Find the product by ID
    const product = await InventoryItem.findById(productId);
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        productId: product.productId,
        productCode: product.productCode,
        price: product.price,
        quantity: product.quantity,
        branch: product.branch
      }
    });

  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
