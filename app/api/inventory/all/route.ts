// app/api/inventory/all/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { SelectedItemModel, InventoryItemModel } from "@/lib/database/models";

export async function GET(request: Request) {
  console.log('Inventory API called');
  
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId") || "";
    const sessionId = searchParams.get("sessionId") || "";
    
    console.log('Search params:', { search, userId, sessionId });
    
    // Build the base query
    let query: any = {};
    
    // Add user/session filtering if provided
    if (userId) {
      query.userId = userId;
    }
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    // Add search functionality for SelectedItems fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    // Get selected items with populated inventory data to get images
    console.log('Fetching selected items...');
    const selectedItems = await SelectedItemModel.find(query)
      .populate({
        path: 'inventoryItemId',
        select: 'image name status' // Select only the fields we need
      })
      .sort({ createdAt: -1 });
      
    console.log(`Found ${selectedItems.length} selected items`);
    
    // Transform the data to include image from populated inventory item
    const transformedItems = selectedItems.map(item => ({
      ...item.toObject(),
      image: item.inventoryItemId?.image || null, // Get image from populated inventory item
      inventoryStatus: item.inventoryItemId?.status || 'Unknown' // Optional: add inventory status
    }));
    
    console.log('Returning transformed items');
    return NextResponse.json(transformedItems);
  } catch (error: any) {
    console.error("Inventory API Error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    
    // Return a more detailed error response
    return NextResponse.json({ 
      error: error.message,
      details: "Failed to fetch selected inventory items",
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}