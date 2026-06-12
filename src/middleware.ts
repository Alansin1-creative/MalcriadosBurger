import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isAuthPath,
  isAdminPath,
  isClientPath,
  isPublicPath,
  defaultPathForRole,
} from '@/lib/auth/routes';

const SESSION_COOKIE = 'session_id';
const ROLE_COOKIE = 'user_role';
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register/start',
  '/api/auth/register/verify',
  '/api/auth/register/resend',
  '/api/health',
  '/api/local/disponibilidad',
  '/api/restaurant/status',
  '/api/webhooks/mercadopago',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith('/api')) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json({ ok: false, message: 'No autenticado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isAuthPath(pathname)) {
    if (session) {
      const role = request.cookies.get(ROLE_COOKIE)?.value as 'client' | 'admin' | undefined;
      const dest = defaultPathForRole(role === 'admin' ? 'admin' : 'client');
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  const role = request.cookies.get(ROLE_COOKIE)?.value;

  if (role === 'client' && isAdminPath(pathname)) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  if (role === 'admin' && isClientPath(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
