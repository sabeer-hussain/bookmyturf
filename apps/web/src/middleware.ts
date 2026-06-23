import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/', '/login', '/register'];
const protectedPrefixes = [
  '/bookings',
  '/courts',
  '/slots',
  '/analytics',
  '/staff',
  '/settings',
  '/customers',
  '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith('/api/') || !isProtectedRoute;

  if (!isPublicRoute && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && refreshToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images).*)'],
};
