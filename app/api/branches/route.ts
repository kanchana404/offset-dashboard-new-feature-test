import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";

export async function GET() {
  try {
    console.log("Branches API: Connecting to database...");
    await connectToDatabase();
    
    console.log("Branches API: Fetching branches from database...");
    
    // First, let's see all branches in the database
    const allBranches = await BranchModel.find({ isActive: true }).sort({ name: 1 });
    console.log("Branches API: All active branches in DB:", allBranches.map(b => b.name));
    
    const branches = await BranchModel.find({ 
      isActive: true,
      name: { 
        $nin: ["workshop", "test", "Workshop", "Test", "Sales"]
      }
    }).sort({ name: 1 });
    
    console.log("Branches API: Found branches after filtering:", branches.length);
    console.log("Branches API: Filtered branch names:", branches.map(b => b.name));
    
    // Transform the data to match the expected format
    const formattedBranches = branches.map(branch => ({
      _id: branch._id,
      name: branch.name,
      type: branch.type,
      location: branch.location,
      contact: branch.contact,
      allowedProducts: branch.allowedProducts,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    }));
    
    console.log("Branches API: Returning formatted branches:", formattedBranches.length);
    
    return NextResponse.json({
      success: true,
      branches: formattedBranches,
      count: formattedBranches.length
    });
    
  } catch (error) {
    console.error("Branches API Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch branches",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
