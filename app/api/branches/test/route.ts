import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { BranchModel } from "@/lib/database/models";

export async function GET() {
  try {
    console.log("Branches Test API: Starting test...");
    
    // Test database connection
    console.log("Branches Test API: Testing database connection...");
    await connectToDatabase();
    console.log("Branches Test API: Database connection successful");
    
    // Test model availability
    console.log("Branches Test API: Testing BranchModel availability...");
    if (!BranchModel) {
      throw new Error("BranchModel is not available");
    }
    console.log("Branches Test API: BranchModel is available");
    
    // Test basic query
    console.log("Branches Test API: Testing basic query...");
    const count = await BranchModel.countDocuments({});
    console.log("Branches Test API: Total branches in database:", count);
    
    // Test finding branches
    console.log("Branches Test API: Testing branch retrieval...");
    const branches = await BranchModel.find({}).limit(5);
    console.log("Branches Test API: Sample branches:", branches.map(b => ({ id: b._id, name: b.name, type: b.type })));
    
    return NextResponse.json({
      success: true,
      message: "Branches API test successful",
      databaseConnected: true,
      modelAvailable: true,
      totalBranches: count,
      sampleBranches: branches.map(b => ({
        _id: b._id,
        name: b.name,
        type: b.type,
        location: b.location,
        isActive: b.isActive
      }))
    });
    
  } catch (error) {
    console.error("Branches Test API Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Branches API test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
