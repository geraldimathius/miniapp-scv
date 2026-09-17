import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getTursoClient, ensureDbTables } from './turso';
import { User, rowToUser } from './users';

const SESSION_COOKIE_NAME = 'scv_session_token';
const SESSION_DURATION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  await ensureDbTables();
  const client = getTursoClient();

  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await client.execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    args: [sessionId, userId, expiresAt, now.toISOString()],
  });

  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await ensureDbTables();
  const client = getTursoClient();
  await client.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [sessionId],
  });
}

export async function getSessionUser(sessionId?: string): Promise<User | null> {
  if (!sessionId) return null;
  await ensureDbTables();
  const client = getTursoClient();
  const now = new Date().toISOString();

  const res = await client.execute({
    sql: `
      SELECT u.id, u.name, u.email, u.role, u.status, u.avatar, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
      LIMIT 1
    `,
    args: [sessionId, now],
  });

  if (res.rows.length === 0) {
    return null;
  }

  return rowToUser(res.rows[0]);
}

/**
 * Server-side helper to get currently authenticated user from incoming cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return null;
    return await getSessionUser(sessionToken);
  } catch (error) {
    return null;
  }
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export { SESSION_COOKIE_NAME };
