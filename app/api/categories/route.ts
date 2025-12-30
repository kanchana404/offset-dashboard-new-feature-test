// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { CategoriesModel as Category } from "@/lib/database/models";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await Category.find({});
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
