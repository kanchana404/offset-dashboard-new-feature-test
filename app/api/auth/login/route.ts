import { NextResponse } from 'next/server';
import { BranchesLoginModel, BranchModel } from "@/lib/database/models";
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/database';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    console.log('Received login request:', { username });

    // Ensure database connection
    try {
      await connectToDatabase();
      console.log('Database connection established');
    } catch (dbError) {
      console.error('Failed to connect to database:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' }, 
        { status: 500 }
      );
    }

    // Add a small delay to ensure connection is fully established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the connection is ready
    if (!BranchesLoginModel.db.readyState || BranchesLoginModel.db.readyState !== 1) {
      console.error('Database not ready, current state:', BranchesLoginModel.db.readyState);
      return NextResponse.json(
        { error: 'Database not ready' }, 
        { status: 500 }
      );
    }

    console.log('Attempting to find user:', username);
    const branchLogin = await BranchesLoginModel.findOne({ username }).populate('branch', 'name type location');
    console.log('User query result:', branchLogin ? 'Found' : 'Not found');

    if (!branchLogin) {
      console.log('Invalid username:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (branchLogin.password !== password) {
      console.log('Invalid password for user:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { 
        id: branchLogin._id, 
        username: branchLogin.username, 
        branch: branchLogin.branch._id,
        branchName: branchLogin.branch.name,
        branchType: branchLogin.branch.type,
        branchLocation: branchLogin.branch.location
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const response = NextResponse.json({ 
      success: true,
      user: {
        username: branchLogin.username,
        branch: branchLogin.branch._id,
        branchName: branchLogin.branch.name,
        branchType: branchLogin.branch.type,
        branchLocation: branchLogin.branch.location
      }
    });

    // Set the token in an HTTP-only cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours in seconds
      path: '/',
    });

    console.log('Login successful for user:', username);
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    
    // More specific error handling
    if (error.name === 'MongoNotConnectedError') {
      return NextResponse.json(
        { error: 'Database connection failed' }, 
        { status: 500 }
      );
    } else if (error.name === 'MongoTimeoutError') {
      return NextResponse.json(
        { error: 'Database timeout' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}