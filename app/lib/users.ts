import { getTursoClient, ensureDbTables } from './turso';

export type UserRole = 'master' | 'member';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserWithPassword = User & {
  passwordHash: string;
};

export function rowToUser(row: any): User {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    email: String(row.email || '').toLowerCase().trim(),
    role: (row.role as UserRole) || 'member',
    status: (row.status as UserStatus) || 'pending',
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export function rowToUserWithPassword(row: any): UserWithPassword {
  return {
    ...rowToUser(row),
    passwordHash: String(row.password_hash || ''),
  };
}

export async function countTotalUsers(): Promise<number> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute('SELECT COUNT(*) as count FROM users');
  return Number(res.rows[0]?.count || 0);
}

export async function getAllUsers(): Promise<User[]> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute(`
    SELECT id, name, email, role, status, avatar, created_at, updated_at
    FROM users
    ORDER BY 
      CASE WHEN status = 'pending' THEN 0 ELSE 1 END ASC,
      created_at DESC
  `);
  return res.rows.map(rowToUser);
}

export async function getApprovedUsers(): Promise<User[]> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute(`
    SELECT id, name, email, role, status, avatar, created_at, updated_at
    FROM users
    WHERE status = 'approved'
    ORDER BY name ASC
  `);
  return res.rows.map(rowToUser);
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToUser(res.rows[0]);
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT id, name, email, password_hash, role, status, avatar, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    args: [email.toLowerCase().trim()],
  });
  if (res.rows.length === 0) return null;
  return rowToUserWithPassword(res.rows[0]);
}

export async function createUser(data: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
}): Promise<User> {
  await ensureDbTables();
  const client = getTursoClient();
  const now = new Date().toISOString();

  await client.execute({
    sql: `
      INSERT INTO users (id, name, email, password_hash, role, status, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.id,
      data.name.trim(),
      data.email.toLowerCase().trim(),
      data.passwordHash,
      data.role,
      data.status,
      data.avatar || null,
      now,
      now,
    ],
  });

  return {
    id: data.id,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    role: data.role,
    status: data.status,
    avatar: data.avatar,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: 'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
    args: [status, now, id],
  });
  return (res.rowsAffected || 0) > 0;
}

export async function updateUserRole(id: string, role: UserRole): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    args: [role, now, id],
  });
  return (res.rowsAffected || 0) > 0;
}

export async function updateUserProfile(
  id: string,
  updates: { name?: string; avatar?: string; passwordHash?: string }
): Promise<User | null> {
  await ensureDbTables();
  const client = getTursoClient();
  const user = await getUserById(id);
  if (!user) return null;

  const now = new Date().toISOString();
  const newName = updates.name !== undefined ? updates.name.trim() : user.name;
  const newAvatar = updates.avatar !== undefined ? updates.avatar : (user.avatar || null);

  if (updates.passwordHash) {
    await client.execute({
      sql: 'UPDATE users SET name = ?, avatar = ?, password_hash = ?, updated_at = ? WHERE id = ?',
      args: [newName, newAvatar, updates.passwordHash, now, id],
    });
  } else {
    await client.execute({
      sql: 'UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?',
      args: [newName, newAvatar, now, id],
    });
  }

  return await getUserById(id);
}

export async function deleteUserById(id: string): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}
