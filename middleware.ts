import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // Always allow access to signin page and API routes
  if (pathname.startsWith('/signin')) {
    return NextResponse.next();
  }

  // If no token exists, redirect to signin
  if (!token) {
    const url = new URL('/signin', request.url);
    return NextResponse.redirect(url);
  }

  // If token exists, allow the request
  return NextResponse.next();
}