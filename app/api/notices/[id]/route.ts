// app/api/notices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { NoticeModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { EmployeeModel } from "@/lib/database/models";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    // TODO: Replace 'your_jwt_secret' with your actual secret
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  } catch {
    return null;
  }
}

function isMainBranchUser(user: any): boolean {
  // user can be string or JwtPayload
  if (typeof user === 'object' && user !== null && 'branch' in user) {
    return user.branch === 'main';
  }
  return false;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!isMainBranchUser(user)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { 
          success: false, 
          error: "MongoDB URI not configured"
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
          error: "Database connection not ready"
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      teamName,
      teamMembers,
      branchId,
      employeeId,
      employeeName,
      priority,
      isActive,
      startDate,
      endDate,
      createdBy
    } = body;

    // Find and update the notice
    const updatedNotice = await NoticeModel.findByIdAndUpdate(
      params.id,
      {
        type,
        title,
        description,
        teamName,
        teamMembers: teamMembers || [],
        branchId,
        employeeId,
        employeeName,
        priority,
        isActive,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        createdBy
      },
      { new: true, runValidators: true }
    );

    if (!updatedNotice) {
      return NextResponse.json(
        { 
          success: false, 
          error: "NoticeModel not found" 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notice: updatedNotice,
      message: "NoticeModel updated successfully"
    });

  } catch (error) {
    console.error("Error updating notice:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update notice" 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!isMainBranchUser(user)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { 
          success: false, 
          error: "MongoDB URI not configured"
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
          error: "Database connection not ready"
        },
        { status: 500 }
      );
    }

    const deletedNotice = await NoticeModel.findByIdAndDelete(params.id);

    if (!deletedNotice) {
      return NextResponse.json(
        { 
          success: false, 
          error: "NoticeModel not found" 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "NoticeModel deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to delete notice" 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { 
          success: false, 
          error: "MongoDB URI not configured"
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
          error: "Database connection not ready"
        },
        { status: 500 }
      );
    }

    const notice = await NoticeModel.findById(params.id);

    if (!notice) {
      return NextResponse.json(
        { 
          success: false, 
          error: "NoticeModel not found" 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notice: notice
    });

  } catch (error) {
    console.error("Error fetching notice:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch notice" 
      },
      { status: 500 }
    );
  }
}
