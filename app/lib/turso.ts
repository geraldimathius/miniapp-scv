import { createClient, Client } from '@libsql/client';
import { Task } from '../board-view';

let clientInstance: Client | null = null;

export function getTursoClient(): Client {
  if (!clientInstance) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not defined in environment variables.');
    }

    clientInstance = createClient({
      url,
      authToken,
    });
  }
  return clientInstance;
}

// Ensure all database tables exist
let tablesInitialized = false;
export async function ensureDbTables() {
  if (tablesInitialized) return;
  const client = getTursoClient();

  // Create tasks table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project TEXT,
      label_ticket TEXT,
      link_ticket TEXT,
      status TEXT DEFAULT 'Ongoing',
      tanggal TEXT,
      waktu_pengerjaan TEXT,
      detail_pengerjaan TEXT,
      pic TEXT,
      attachments TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Create users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      avatar TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create sessions table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create time_tracker_tasks table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS time_tracker_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      task_description TEXT,
      status TEXT DEFAULT 'todo',
      progress INTEGER DEFAULT 0,
      project TEXT,
      ticket_number TEXT,
      task_url TEXT,
      tags TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create time_logs table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration_string TEXT,
      duration_minutes INTEGER NOT NULL,
      log_description TEXT,
      billable INTEGER DEFAULT 1,
      tags TEXT,
      person TEXT,
      attachments TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES time_tracker_tasks(id) ON DELETE CASCADE
    );
  `);

  tablesInitialized = true;
}

export async function ensureTasksTable() {
  return ensureDbTables();
}

function parseAttachments(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {}
    }
    return trimmed.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export function rowToTask(row: any): Task {
  return {
    id: String(row.id || ''),
    Project: String(row.project || '').trim(),
    'Label ticket': String(row.label_ticket || '').trim(),
    'Link Ticket': String(row.link_ticket || '').trim(),
    Status: String(row.status || 'Ongoing').trim(),
    Tanggal: String(row.tanggal || ''),
    'Waktu Pengerjaan': String(row.waktu_pengerjaan || ''),
    'Detail Pengerjaan': String(row.detail_pengerjaan || ''),
    PIC: String(row.pic || ''),
    attachments: parseAttachments(row.attachments),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    _source: 'turso',
  };
}
