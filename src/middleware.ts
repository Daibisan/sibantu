import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'sibantu_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'sibantu-hackathon-disaster-logistics-session-secret-2026'
);

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET_KEY, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSession = await isValidSession(sessionToken);

  // 1. Redirect pengguna yang sudah login agar tidak bisa buka halaman login lagi
  if (pathname === '/login') {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 2. Proteksi seluruh rute yang tertangkap oleh matcher (selain /login)
  if (!hasValidSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/bpbd', '/gudang', '/scanner', '/posko'],
};