import { Task } from '../board-view';
import { getTursoClient, ensureTasksTable, rowToTask } from './turso';

// Helper to safely parse attachments string or array into string[]
export function parseAttachments(val: any): string[] {
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

/**
 * Fetch all tasks directly from Turso database.
 */
export async function getTasks(): Promise<Task[]> {
  try {
    await ensureTasksTable();
    const client = getTursoClient();
    const result = await client.execute(`
      SELECT * FROM tasks 
      ORDER BY 
        CASE 
          WHEN tanggal IS NOT NULL AND tanggal != '' THEN tanggal 
          ELSE '1970-01-01' 
        END DESC,
        created_at DESC, 
        id DESC
    `);

    return result.rows.map(rowToTask);
  } catch (error: any) {
    console.error('Error fetching tasks from Turso:', error);
    throw new Error(`Gagal mengambil tiket dari database Turso: ${error.message}`);
  }
}

/**
 * Add a new task to Turso database.
 */
export async function addTask(newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  await ensureTasksTable();
  const client = getTursoClient();

  const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const attachments = parseAttachments(newTaskData.attachments);

  const task: Task = {
    id,
    Project: newTaskData.Project?.trim() || 'General',
    'Label ticket': newTaskData['Label ticket']?.trim() || 'Untitled Task',
    'Link Ticket': newTaskData['Link Ticket']?.trim() || '',
    Status: newTaskData.Status?.trim() || 'Ongoing',
    Tanggal: newTaskData.Tanggal?.trim() || new Date().toISOString().split('T')[0],
    'Waktu Pengerjaan': newTaskData['Waktu Pengerjaan']?.trim() || '',
    'Detail Pengerjaan': newTaskData['Detail Pengerjaan']?.trim() || '',
    PIC: newTaskData.PIC?.trim() || '',
    attachments,
    createdAt: now,
    updatedAt: now,
    _source: 'turso',
  };

  await client.execute({
    sql: `
      INSERT INTO tasks (
        id, project, label_ticket, link_ticket, status, tanggal,
        waktu_pengerjaan, detail_pengerjaan, pic, attachments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      task.id || id,
      task.Project || '',
      task['Label ticket'] || '',
      task['Link Ticket'] || '',
      task.Status || 'Ongoing',
      task.Tanggal || '',
      task['Waktu Pengerjaan'] || '',
      task['Detail Pengerjaan'] || '',
      task.PIC || '',
      JSON.stringify(task.attachments || []),
      task.createdAt || now,
      task.updatedAt || now,
    ],
  });

  return task;
}

/**
 * Update an existing task in Turso database.
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  await ensureTasksTable();
  const client = getTursoClient();

  const check = await client.execute({
    sql: 'SELECT * FROM tasks WHERE id = ? LIMIT 1',
    args: [id],
  });

  if (check.rows.length === 0) {
    return null;
  }

  const existing = rowToTask(check.rows[0]);
  const now = new Date().toISOString();

  const mergedTask: Task = {
    ...existing,
    ...updates,
    attachments: updates.attachments !== undefined ? parseAttachments(updates.attachments) : existing.attachments,
    id: existing.id,
    updatedAt: now,
  };

  await client.execute({
    sql: `
      UPDATE tasks SET
        project = ?,
        label_ticket = ?,
        link_ticket = ?,
        status = ?,
        tanggal = ?,
        waktu_pengerjaan = ?,
        detail_pengerjaan = ?,
        pic = ?,
        attachments = ?,
        updated_at = ?
      WHERE id = ?
    `,
    args: [
      mergedTask.Project?.trim() || '',
      mergedTask['Label ticket']?.trim() || '',
      mergedTask['Link Ticket']?.trim() || '',
      mergedTask.Status?.trim() || 'Ongoing',
      mergedTask.Tanggal || '',
      mergedTask['Waktu Pengerjaan'] || '',
      mergedTask['Detail Pengerjaan'] || '',
      mergedTask.PIC || '',
      JSON.stringify(mergedTask.attachments || []),
      mergedTask.updatedAt || now,
      id,
    ],
  });

  return mergedTask;
}

/**
 * Delete task from Turso database.
 */
export async function deleteTask(id: string): Promise<boolean> {
  await ensureTasksTable();
  const client = getTursoClient();

  const result = await client.execute({
    sql: 'DELETE FROM tasks WHERE id = ?',
    args: [id],
  });

  return (result.rowsAffected || 0) > 0;
}
