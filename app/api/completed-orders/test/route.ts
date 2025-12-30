// app/api/completed-orders/test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Completed orders test route working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}
