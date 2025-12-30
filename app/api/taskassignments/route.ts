// app/api/taskassignments/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { TaskAssignmentModel } from "@/lib/database/models";
import { BranchModel } from "@/lib/database/models";
import { connectToDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectToDatabase();
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: 'BranchModel not found' }, { status: 404 });
    }
    const branchName = branchRecord.name;
    const assignments = await TaskAssignmentModel.find({ branch: branchName })
      .populate('employee', 'name')
      .populate('task');
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error retrieving assignments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
