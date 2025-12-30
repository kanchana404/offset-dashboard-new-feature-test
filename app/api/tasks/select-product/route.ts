// app/api/tasks/select-product/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { TaskModel } from "@/lib/database/models";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const { taskId, newProduct, advancePayment, fullPayment } = await request.json();
    
    if (!taskId || !newProduct) {
      return NextResponse.json({ error: "taskId and newProduct are required" }, { status: 400 });
    }

    // Find the task first
    const task = await TaskModel.findById(taskId);
    
    if (!task) {
      return NextResponse.json({ error: "TaskModel not found" }, { status: 404 });
    }

    // Initialize products array if it doesn't exist
    if (!task.products) {
      task.products = [];
    }

    // Check if the product already exists in the products array
    const existingProductIndex = task.products.findIndex(
      product => product.productType === newProduct.productType
    );

    if (existingProductIndex >= 0) {
      // Update the existing product's quantity and other values
      task.products[existingProductIndex].productQuantity += newProduct.productQuantity;
      
      // Only update other fields if they're provided
      if (newProduct.productPrice) {
        task.products[existingProductIndex].productPrice = newProduct.productPrice;
      }
      
      if (newProduct.totalWaste !== undefined) {
        task.products[existingProductIndex].totalWaste = newProduct.totalWaste;
      }
    } else {
      // Add the new product to the products array
      task.products.push(newProduct);
    }

    // Also update any payment info
    if (advancePayment) {
      task.advancePayment = advancePayment;
    }
    
    if (fullPayment) {
      task.fullPayment = fullPayment;
    }

    // Set status to In Progress if it's Pending
    if (task.status === "Pending") {
      task.status = "In Progress";
    }

    // Save the task
    const updatedTask = await task.save();
    
    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("Error updating task with selected product:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}