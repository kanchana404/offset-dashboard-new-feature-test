  import { NextResponse } from "next/server";
  import { SentOrderModel, TaskModel } from "@/lib/database/models";
  import { connectToDatabase } from "@/lib/database";
  import { BranchModel } from "@/lib/database/models";
  import jwt from "jsonwebtoken";
  import { cookies } from "next/headers";

  export const runtime = "nodejs";

  export async function GET(request: Request) {
  try {
    await connectToDatabase();

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;
    const searchTerm = searchParams.get('search') || '';

    // Get the token from cookies
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the token and extract branch info
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "BranchModel not found" }, { status: 404 });
    }
    const branchName = branchRecord.name;
    const branchType = branchRecord.type;

    // Build base query based on branch type
    // If main branch (workshop), show ALL orders sent to workshop
    // If sub branch, show only orders sent FROM this branch
    let baseQuery: any;
    if (branchType === 'main') {
      // Main branch should see all orders sent to workshop
      // Orders with status "Sent to Main Branch" or "Sent to Branch" are sent to workshop
      baseQuery = {
        $or: [
          { status: "Sent to Main Branch" },
          { status: "Sent to Branch" },
          { status: "In Progress" },
          { status: "Completed" },
          { status: "Temporary Completed" }
        ]
      };
    } else {
      // Sub branches see orders they sent
      baseQuery = { sentBranch: branchName };
    }

    // Add search filter if search term is provided
    let query: any = { ...baseQuery };
    if (searchTerm.trim()) {
      const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };
      query.$and = [
        baseQuery,
        {
          $or: [
            { orderId: searchRegex },
            { customerName: searchRegex },
            { sentBranch: searchRegex }
          ]
        }
      ];
    }

    // Get total count for pagination
    const totalOrders = await SentOrderModel.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch sent orders with pagination, sorted by latest first
    const sentOrders = await SentOrderModel.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    // Fetch corresponding tasks to get artwork images
    const orderIds = sentOrders.map(order => order.orderId);
    const tasks = await TaskModel.find({ orderId: { $in: orderIds } })
      .select('orderId artworkImage images');

    // Create a map of orderId to artwork/image data
    const taskDataMap = new Map();
    tasks.forEach(task => {
      taskDataMap.set(task.orderId, {
        artworkImage: task.artworkImage,
        images: task.images || []
      });
    });

    // Enhance sent orders with artwork data
    const enhancedOrders = sentOrders.map(order => {
      const taskData = taskDataMap.get(order.orderId);
      return {
        ...order.toObject(),
        artworkImage: taskData?.artworkImage || null,
        taskImages: taskData?.images || []
      };
    });

    return NextResponse.json({ 
      sentOrders: enhancedOrders,
      branchInfo: {
        name: branchRecord.name,
        location: branchRecord.location,
        contact: branchRecord.contact,
        type: branchRecord.type
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        ordersPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    } catch (error: any) {
      console.error("Error fetching sent orders:", error);
      return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
      );
    }
  }
