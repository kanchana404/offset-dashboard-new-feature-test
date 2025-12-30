import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import InventoryItem from "@/lib/database/models/InventoryItem";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { productIds } = await request.json();
    
    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      );
    }

    // Find all products by IDs
    const products = await InventoryItem.find({
      _id: { $in: productIds }
    });

    // Create an object for quick lookup (JSON serializable)
    const productMap: Record<string, any> = {};
    products.forEach(product => {
      productMap[product._id.toString()] = {
        _id: product._id,
        name: product.name,
        productId: product.productId,
        productCode: product.productCode,
        price: product.price,
        quantity: product.quantity,
        branch: product.branch
      };
    });

    return NextResponse.json({
      success: true,
      products: productMap
    });

  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
