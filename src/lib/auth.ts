import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'sibantu_session';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'sibantu-hackathon-disaster-logistics-session-secret-2026'
);

export interface UserRoleGrant {
  roleCode: string;
  roleName: string;
  disasterEventId: string | null;
}

export interface AuthSessionPayload {
  userId: string;
  name: string;
  email: string;
  roles: UserRoleGrant[];
}

/**
 * Creates a signed JWT string for user session
 */
export async function createSessionToken(payload: AuthSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verifies a session JWT string and extracts the payload
 */
export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });

    return {
      userId: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
      roles: (payload.roles as UserRoleGrant[]) || [],
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session user from incoming request cookies
 * Safe for Server Components, Server Actions, and Route Handlers
 */
export async function getCurrentSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return verifySessionToken(sessionToken);
}

export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};
