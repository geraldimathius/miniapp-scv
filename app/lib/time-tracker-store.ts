import { getTursoClient, ensureDbTables } from './turso';
import { TrackedTask, TimeLog, TaskStatus } from './types/time-tracking';
import { parseAttachments } from './task-store';

export function rowToTrackedTask(row: any, logs: TimeLog[] = []): TrackedTask {
  return {
    id: String(row.id || ''),
    title: String(row.title || '').trim(),
    taskDescription: String(row.task_description || '').trim(),
    status: (String(row.status || 'todo') as TaskStatus),
    progress: typeof row.progress === 'number' ? row.progress : Number(row.progress || 0),
    project: String(row.project || '').trim(),
    ticketNumber: String(row.ticket_number || '').trim(),
    taskUrl: String(row.task_url || '').trim(),
    tags: String(row.tags || '').trim(),
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    logs,
  };
}

export function rowToTimeLog(row: any): TimeLog {
  return {
    id: String(row.id || ''),
    taskId: String(row.task_id || ''),
    logDescription: String(row.log_description || '').trim(),
    date: String(row.date || ''),
    startTime: String(row.start_time || ''),
    endTime: row.end_time ? String(row.end_time) : undefined,
    durationString: String(row.duration_string || ''),
    durationMinutes: Number(row.duration_minutes || 0),
    person: row.person ? String(row.person) : undefined,
    billable: row.billable === 1 || row.billable === '1' || row.billable === true,
    tags: row.tags ? String(row.tags) : undefined,
    attachments: parseAttachments(row.attachments),
  };
}

/**
 * Fetch all tracked tasks and their associated logs from Turso.
 */
export async function getTimeTrackerTasks(userId?: string): Promise<TrackedTask[]> {
  await ensureDbTables();
  const client = getTursoClient();

  // Query tasks
  const tasksResult = await client.execute(`
    SELECT * FROM time_tracker_tasks
    ORDER BY created_at DESC, id DESC
  `);

  // Query all logs
  const logsResult = await client.execute(`
    SELECT * FROM time_logs
    ORDER BY date DESC, start_time DESC, created_at DESC
  `);

  const logsByTaskId: { [taskId: string]: TimeLog[] } = {};
  for (const row of logsResult.rows) {
    const log = rowToTimeLog(row);
    if (!logsByTaskId[log.taskId]) {
      logsByTaskId[log.taskId] = [];
    }
    logsByTaskId[log.taskId].push(log);
  }

  return tasksResult.rows.map(row => {
    const taskId = String(row.id || '');
    return rowToTrackedTask(row, logsByTaskId[taskId] || []);
  });
}

/**
 * Add a new task to Turso DB.
 */
export async function createTrackedTask(
  taskData: {
    id?: string;
    title: string;
    taskDescription: string;
    project?: string;
    tags?: string;
    ticketNumber?: string;
    status?: TaskStatus;
    progress?: number;
    taskUrl?: string;
    attachments?: string[];
  },
  userId?: string
): Promise<TrackedTask> {
  await ensureDbTables();
  const client = getTursoClient();

  const id = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const attachments = parseAttachments(taskData.attachments);

  await client.execute({
    sql: `
      INSERT INTO time_tracker_tasks (
        id, user_id, title, task_description, status, progress,
        project, ticket_number, task_url, tags, attachments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      userId || null,
      taskData.title.trim(),
      taskData.taskDescription.trim(),
      taskData.status || 'todo',
      taskData.progress ?? 0,
      taskData.project?.trim() || '',
      taskData.ticketNumber?.trim() || '',
      taskData.taskUrl?.trim() || '',
      taskData.tags?.trim() || '',
      JSON.stringify(attachments),
      now,
      now,
    ],
  });

  return {
    id,
    title: taskData.title.trim(),
    taskDescription: taskData.taskDescription.trim(),
    status: taskData.status || 'todo',
    progress: taskData.progress ?? 0,
    project: taskData.project?.trim() || '',
    ticketNumber: taskData.ticketNumber?.trim() || '',
    taskUrl: taskData.taskUrl?.trim() || '',
    tags: taskData.tags?.trim() || '',
    attachments,
    createdAt: new Date(now),
    logs: [],
  };
}

/**
 * Update an existing task in Turso DB.
 */
export async function updateTrackedTask(
  taskId: string,
  updates: Partial<TrackedTask>
): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();

  const check = await client.execute({
    sql: 'SELECT * FROM time_tracker_tasks WHERE id = ? LIMIT 1',
    args: [taskId],
  });

  if (check.rows.length === 0) {
    return false;
  }

  const existing = check.rows[0];
  const now = new Date().toISOString();

  const title = updates.title !== undefined ? updates.title.trim() : String(existing.title);
  const taskDescription = updates.taskDescription !== undefined ? updates.taskDescription.trim() : String(existing.task_description || '');
  const status = updates.status !== undefined ? updates.status : String(existing.status || 'todo');
  const progress = updates.progress !== undefined ? updates.progress : Number(existing.progress || 0);
  const project = updates.project !== undefined ? updates.project.trim() : String(existing.project || '');
  const ticketNumber = updates.ticketNumber !== undefined ? updates.ticketNumber.trim() : String(existing.ticket_number || '');
  const taskUrl = updates.taskUrl !== undefined ? updates.taskUrl.trim() : String(existing.task_url || '');
  const tags = updates.tags !== undefined ? updates.tags.trim() : String(existing.tags || '');
  const attachments = updates.attachments !== undefined ? parseAttachments(updates.attachments) : parseAttachments(existing.attachments);

  await client.execute({
    sql: `
      UPDATE time_tracker_tasks SET
        title = ?,
        task_description = ?,
        status = ?,
        progress = ?,
        project = ?,
        ticket_number = ?,
        task_url = ?,
        tags = ?,
        attachments = ?,
        updated_at = ?
      WHERE id = ?
    `,
    args: [
      title,
      taskDescription,
      status,
      progress,
      project,
      ticketNumber,
      taskUrl,
      tags,
      JSON.stringify(attachments),
      now,
      taskId,
    ],
  });

  return true;
}

/**
 * Delete a task and all its associated logs from Turso DB.
 */
export async function deleteTrackedTask(taskId: string): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();

  // Delete associated logs first (or let CASCADE handle it)
  await client.execute({
    sql: 'DELETE FROM time_logs WHERE task_id = ?',
    args: [taskId],
  });

  const res = await client.execute({
    sql: 'DELETE FROM time_tracker_tasks WHERE id = ?',
    args: [taskId],
  });

  return (res.rowsAffected || 0) > 0;
}

/**
 * Add a time log to a task.
 */
export async function createTimeLog(
  taskId: string,
  logData: Omit<TimeLog, 'id' | 'taskId'> & { id?: string },
  userId?: string
): Promise<TimeLog> {
  await ensureDbTables();
  const client = getTursoClient();

  const id = logData.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const attachments = parseAttachments(logData.attachments);
  const billableVal = logData.billable === false ? 0 : 1;

  await client.execute({
    sql: `
      INSERT INTO time_logs (
        id, task_id, user_id, date, start_time, end_time,
        duration_string, duration_minutes, log_description,
        billable, tags, person, attachments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      taskId,
      userId || null,
      logData.date || now.split('T')[0],
      logData.startTime || '',
      logData.endTime || null,
      logData.durationString || '',
      logData.durationMinutes || 0,
      logData.logDescription?.trim() || '',
      billableVal,
      logData.tags?.trim() || '',
      logData.person?.trim() || '',
      JSON.stringify(attachments),
      now,
      now,
    ],
  });

  // Also auto-update task status if task is currently 'todo'
  const taskRes = await client.execute({
    sql: 'SELECT status, progress FROM time_tracker_tasks WHERE id = ? LIMIT 1',
    args: [taskId],
  });

  if (taskRes.rows.length > 0) {
    const currentStatus = String(taskRes.rows[0].status || 'todo');
    const currentProgress = Number(taskRes.rows[0].progress || 0);
    if (currentStatus === 'todo') {
      await client.execute({
        sql: 'UPDATE time_tracker_tasks SET status = ?, progress = ?, updated_at = ? WHERE id = ?',
        args: ['in_progress', currentProgress === 0 ? 25 : currentProgress, now, taskId],
      });
    }
  }

  return {
    id,
    taskId,
    date: logData.date,
    startTime: logData.startTime,
    endTime: logData.endTime,
    durationString: logData.durationString,
    durationMinutes: logData.durationMinutes,
    logDescription: logData.logDescription,
    billable: logData.billable !== false,
    tags: logData.tags,
    person: logData.person,
    attachments,
  };
}

/**
 * Update a specific time log in Turso DB.
 */
export async function updateTimeLog(
  logId: string,
  updates: Partial<TimeLog>
): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();

  const check = await client.execute({
    sql: 'SELECT * FROM time_logs WHERE id = ? LIMIT 1',
    args: [logId],
  });

  if (check.rows.length === 0) {
    return false;
  }

  const existing = check.rows[0];
  const now = new Date().toISOString();

  const date = updates.date !== undefined ? updates.date : String(existing.date);
  const startTime = updates.startTime !== undefined ? updates.startTime : String(existing.start_time || '');
  const endTime = updates.endTime !== undefined ? updates.endTime : (existing.end_time ? String(existing.end_time) : null);
  const durationString = updates.durationString !== undefined ? updates.durationString : String(existing.duration_string || '');
  const durationMinutes = updates.durationMinutes !== undefined ? updates.durationMinutes : Number(existing.duration_minutes || 0);
  const logDescription = updates.logDescription !== undefined ? updates.logDescription.trim() : String(existing.log_description || '');
  const billableVal = updates.billable !== undefined ? (updates.billable ? 1 : 0) : Number(existing.billable);
  const tags = updates.tags !== undefined ? updates.tags.trim() : String(existing.tags || '');
  const person = updates.person !== undefined ? updates.person.trim() : String(existing.person || '');
  const attachments = updates.attachments !== undefined ? parseAttachments(updates.attachments) : parseAttachments(existing.attachments);

  await client.execute({
    sql: `
      UPDATE time_logs SET
        date = ?,
        start_time = ?,
        end_time = ?,
        duration_string = ?,
        duration_minutes = ?,
        log_description = ?,
        billable = ?,
        tags = ?,
        person = ?,
        attachments = ?,
        updated_at = ?
      WHERE id = ?
    `,
    args: [
      date,
      startTime,
      endTime,
      durationString,
      durationMinutes,
      logDescription,
      billableVal,
      tags,
      person,
      JSON.stringify(attachments),
      now,
      logId,
    ],
  });

  return true;
}

/**
 * Delete a specific time log from Turso DB.
 */
export async function deleteTimeLog(logId: string): Promise<boolean> {
  await ensureDbTables();
  const client = getTursoClient();

  const res = await client.execute({
    sql: 'DELETE FROM time_logs WHERE id = ?',
    args: [logId],
  });

  return (res.rowsAffected || 0) > 0;
}

/**
 * Bulk sync / import tasks and logs into Turso.
 */
export async function bulkSyncTimeTracker(
  tasks: TrackedTask[],
  userId?: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<TrackedTask[]> {
  await ensureDbTables();
  const client = getTursoClient();

  if (mode === 'replace') {
    await client.execute('DELETE FROM time_logs');
    await client.execute('DELETE FROM time_tracker_tasks');
  }

  for (const task of tasks) {
    const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const createdAtStr = task.createdAt instanceof Date ? task.createdAt.toISOString() : (task.createdAt ? String(task.createdAt) : now);
    const attachments = parseAttachments(task.attachments);

    // Check if task exists (by id or by matching ticket / title+project)
    let existingTaskId = '';
    const checkById = await client.execute({
      sql: 'SELECT id FROM time_tracker_tasks WHERE id = ? LIMIT 1',
      args: [taskId],
    });

    if (checkById.rows.length > 0) {
      existingTaskId = String(checkById.rows[0].id);
    } else if (task.ticketNumber && task.ticketNumber.trim()) {
      const checkByTicket = await client.execute({
        sql: 'SELECT id FROM time_tracker_tasks WHERE ticket_number = ? LIMIT 1',
        args: [task.ticketNumber.trim()],
      });
      if (checkByTicket.rows.length > 0) {
        existingTaskId = String(checkByTicket.rows[0].id);
      }
    } else if (task.title && task.title.trim()) {
      const checkByTitle = await client.execute({
        sql: 'SELECT id FROM time_tracker_tasks WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(project)) = LOWER(TRIM(?)) LIMIT 1',
        args: [task.title.trim(), (task.project || '').trim()],
      });
      if (checkByTitle.rows.length > 0) {
        existingTaskId = String(checkByTitle.rows[0].id);
      }
    }

    const targetTaskId = existingTaskId || taskId;

    if (existingTaskId) {
      await client.execute({
        sql: `
          UPDATE time_tracker_tasks SET
            title = ?,
            task_description = COALESCE(NULLIF(?, ''), task_description),
            status = ?,
            progress = ?,
            project = COALESCE(NULLIF(?, ''), project),
            ticket_number = COALESCE(NULLIF(?, ''), ticket_number),
            task_url = COALESCE(NULLIF(?, ''), task_url),
            tags = COALESCE(NULLIF(?, ''), tags),
            updated_at = ?
          WHERE id = ?
        `,
        args: [
          task.title.trim(),
          task.taskDescription?.trim() || '',
          task.status || 'todo',
          task.progress ?? 0,
          task.project?.trim() || '',
          task.ticketNumber?.trim() || '',
          task.taskUrl?.trim() || '',
          task.tags?.trim() || '',
          now,
          targetTaskId,
        ],
      });
    } else {
      await client.execute({
        sql: `
          INSERT INTO time_tracker_tasks (
            id, user_id, title, task_description, status, progress,
            project, ticket_number, task_url, tags, attachments, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          targetTaskId,
          userId || null,
          task.title.trim(),
          task.taskDescription?.trim() || '',
          task.status || 'todo',
          task.progress ?? 0,
          task.project?.trim() || '',
          task.ticketNumber?.trim() || '',
          task.taskUrl?.trim() || '',
          task.tags?.trim() || '',
          JSON.stringify(attachments),
          createdAtStr,
          now,
        ],
      });
    }

    // Process logs for this task
    if (Array.isArray(task.logs)) {
      for (const log of task.logs) {
        const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const logAttachments = parseAttachments(log.attachments);

        // Check if identical log already exists (same date, startTime, and description)
        const checkLog = await client.execute({
          sql: `
            SELECT id FROM time_logs 
            WHERE task_id = ? AND date = ? AND start_time = ? AND LOWER(TRIM(log_description)) = LOWER(TRIM(?))
            LIMIT 1
          `,
          args: [targetTaskId, log.date, log.startTime || '', (log.logDescription || '').trim()],
        });

        if (checkLog.rows.length === 0) {
          await client.execute({
            sql: `
              INSERT INTO time_logs (
                id, task_id, user_id, date, start_time, end_time,
                duration_string, duration_minutes, log_description,
                billable, tags, person, attachments, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              logId,
              targetTaskId,
              userId || null,
              log.date,
              log.startTime || '',
              log.endTime || null,
              log.durationString || '',
              log.durationMinutes || 0,
              log.logDescription?.trim() || '',
              log.billable === false ? 0 : 1,
              log.tags?.trim() || '',
              log.person?.trim() || '',
              JSON.stringify(logAttachments),
              now,
              now,
            ],
          });
        }
      }
    }
  }

  return getTimeTrackerTasks(userId);
}
