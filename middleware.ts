import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from './lib/auth';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = authCookie?.value === AUTH_COOKIE_VALUE;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // API路由不需要重定向
  if (isApiRoute) {
    return NextResponse.next();
  }

  // 已登录访问登录页，重定向到首页
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 未登录访问非登录页，重定向到登录页
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

