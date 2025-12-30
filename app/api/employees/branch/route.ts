// app/api/employees/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { EmployeeModel } from "@/lib/database/models";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Get the JWT from cookies
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify token and extract the branch ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;

    // Parse the request body
    const { name, position, contactNumber } = await request.json();

    // Validate required fields
    if (!name || !position || !contactNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // (Optional) You may want to lookup the branch record to get the branch name.
    // For simplicity, we assign a default branch name. Replace this with your lookup if needed.
    const branchName = "Default BranchModel";

    // Set a default salary (since your EmployeeModel model requires salary).
    const salary = 0;

    // Create the new employee record.
    const employee = await EmployeeModel.create({
      branchId,
      name,
      position,
      contactNumber, // Ensure your EmployeeModel model includes this field or adjust accordingly.
      branch: branchName,
      salary,
      skills: [],
      isAvailable: true,
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error("Error adding employee:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
