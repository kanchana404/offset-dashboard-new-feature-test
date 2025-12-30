import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { maxAge: -1, path: '/' });
  return response;
}
