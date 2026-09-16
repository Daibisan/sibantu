import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_OPTIONS, UserRoleGrant } from '@/lib/auth';

interface UserDbRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  status: string;
}

interface RoleGrantDbRow {
  role_code: string;
  role_name: string;
  disaster_event_id: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Query user from PostgreSQL by email
    const userResult = await query<UserDbRow>(
      `SELECT id, name, email, password_hash, status 
       FROM users 
       WHERE LOWER(email) = $1 
       LIMIT 1;`,
      [trimmedEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi salah.' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // 2. Check user status (only ACTIVE allowed)
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: `Akun tidak dapat digunakan (Status: ${user.status}). Hubungi administrator.`,
        },
        { status: 403 }
      );
    }

    // 3. Verify password against password_hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi salah.' },
        { status: 401 }
      );
    }

    // 4. Retrieve active role grants
    const roleGrantsResult = await query<RoleGrantDbRow>(
      `SELECT 
         r.code AS role_code, 
         r.name AS role_name, 
         rg.disaster_event_id
       FROM role_grants rg
       JOIN roles r ON r.id = rg.role_id
       WHERE rg.user_id = $1 AND rg.status = 'ACTIVE';`,
      [user.id]
    );

    const roles: UserRoleGrant[] = roleGrantsResult.rows.map((r) => ({
      roleCode: r.role_code,
      roleName: r.role_name,
      disasterEventId: r.disaster_event_id ? String(r.disaster_event_id) : null,
    }));

    // 5. Generate signed JWT session token (NEVER include password_hash)
    const sessionPayload = {
      userId: String(user.id),
      name: user.name,
      email: user.email,
      roles,
    };

    const token = await createSessionToken(sessionPayload);

    // 6. Set HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: sessionPayload,
    });

    response.cookies.set({
      ...SESSION_COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat proses login.' },
      { status: 500 }
    );
  }
}
