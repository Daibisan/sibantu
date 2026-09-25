import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "@/lib/db";
import { cookies } from "next/headers";

const SESSION_MAX_AGE = 60 * 60 * 24; // 1 hari

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET belum diset");
  }

  return secret;
}

function createSignature(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export async function authenticateUser(
  email: string,
  password: string
) {
  const result = await db.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.password_hash,
      u.status,
      r.code AS role_code,
      r.name AS role_name
    FROM users u
    JOIN role_grants rg
      ON rg.user_id = u.id
    JOIN roles r
      ON r.id = rg.role_id
    WHERE LOWER(u.email) = LOWER($1)
      AND u.status = 'ACTIVE'
      AND rg.status = 'ACTIVE'
    LIMIT 1
    `,
    [email.trim()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  const passwordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    role: {
      code: user.role_code,
      name: user.role_name,
    },
  };
}

export function createSession(userId: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  const payload = `${userId}.${expiresAt}`;
  const signature = createSignature(payload);

  return `${payload}.${signature}`;
}

export function verifySession(session: string): number | null {
  try {
    const parts = session.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [userId, expiresAt, signature] = parts;

    const payload = `${userId}.${expiresAt}`;
    const expectedSignature = createSignature(payload);

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length) {
      return null;
    }

    const validSignature = crypto.timingSafeEqual(sigBuf, expBuf);

    if (!validSignature) {
      return null;
    }

    if (Number(expiresAt) < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return Number(userId);
  } catch {
    return null;
  }
}

export async function getUserById(userId: number) {
  const result = await db.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.status,
      r.code AS role_code,
      r.name AS role_name
    FROM users u
    JOIN role_grants rg
      ON rg.user_id = u.id
    JOIN roles r
      ON r.id = rg.role_id
    WHERE u.id = $1
      AND u.status = 'ACTIVE'
      AND rg.status = 'ACTIVE'
    LIMIT 1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    role: {
      code: user.role_code,
      name: user.role_name,
    },
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const session = cookieStore.get("sibantu_session")?.value;

  if (!session) {
    return null;
  }

  const userId = verifySession(session);

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}