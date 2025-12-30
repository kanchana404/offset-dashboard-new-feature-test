// app/api/notices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { NoticeModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { EmployeeModel } from "@/lib/database/models";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { 
          success: false, 
          error: "MongoDB URI not configured",
          notices: []
        },
        { status: 500 }
      );
    }

    // Ensure database connection is established
    await connectToDatabase();
    
    // Verify connection is ready
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Database connection not ready",
          notices: []
        },
        { status: 500 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    // Build filter object
    const filter: any = {};
    
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (priority) {
      filter.priority = priority;
    }

    // Fetch notices from database
    const notices = await NoticeModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent notices

    return NextResponse.json({
      success: true,
      notices: notices,
      count: notices.length
    });

  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch notices",
        notices: []
      },
      { status: 500 }
    );
  }
}
