import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { Task } from '../board-view';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

export async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
  }
}

// Generate a deterministic and guaranteed unique key for each Google Sheet row
function generateSheetTaskId(task: Task, index: number): string {
  const cleanProj = (task.Project || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
  const cleanLabel = (task['Label ticket'] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);

  if (task['Link Ticket'] && task['Link Ticket'].trim()) {
    const match = task['Link Ticket'].match(/\/tasks\/(\d+)/);
    if (match) return `sheet-tw-${match[1]}-${index}-${cleanLabel}`;
  }

  return `sheet-row-${index}-${cleanProj}-${cleanLabel}`;
}

// Helper to extract attachments from any sheet column format (Column 1, Lampiran, Cloudinary URLs)
export function extractAttachmentsFromSheetRow(row: any): string[] {
  const potentialKeys = [
    'attachments', 'Attachments', 'Lampiran', 'lampiran', 'Lampiran Gambar',
    'Images', 'images', 'Foto', 'foto', 'Files', 'files', 'File', 'file',
    'Column 1', 'Column 9', 'Column 10', 'Column_1', 'Column_9', 'Column_10'
  ];

  const rawList: any[] = [];
  for (const key of potentialKeys) {
    if (row[key]) {
      rawList.push(row[key]);
    }
  }

  // Also check any extra parsed values or any column containing cloudinary/http url
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && (v.includes('cloudinary.com') || v.includes('backblazeb2.com') || v.includes('http://') || v.includes('https://'))) {
      // Avoid taking Link Ticket as attachment
      if (k !== 'Link Ticket' && k !== 'Link' && !rawList.includes(v)) {
        rawList.push(v);
      }
    }
  }

  // Also check __parsed_extra
  if (Array.isArray(row.__parsed_extra)) {
    for (const val of row.__parsed_extra) {
      if (typeof val === 'string' && (val.includes('http') || val.includes('cloudinary'))) {
        rawList.push(val);
      }
    }
  }

  const allParsed = rawList.flatMap(val => parseAttachments(val));
  return Array.from(new Set(allParsed));
}

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

export async function fetchFromGoogleSheet(): Promise<Task[]> {
  const scriptUrl = process.env.GOOGLE_SHEET_SCRIPT_URL;
  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL;

  // 1. Try real-time Google Apps Script doGet if available (0s cache delay)
  if (scriptUrl) {
    try {
      const bustScriptUrl = `${scriptUrl}?_cb=${Date.now()}`;
      const scriptRes = await fetch(bustScriptUrl, {
        cache: 'no-store',
        redirect: 'follow',
      });
      if (scriptRes.ok) {
        const json = await scriptRes.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 1) {
          const [headerRow, ...dataRows] = json.data as any[][];
          const headers = headerRow.map((h: any) => String(h || '').trim());
          
          return dataRows
            .map((rowArr, index) => {
              const rowObj: Record<string, any> = {};
              headers.forEach((h: string, colIdx: number) => {
                rowObj[h] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]) : '';
              });

              if (!rowObj.Project && !rowObj.Status && !rowObj['Label ticket']) {
                return null;
              }

              const id = generateSheetTaskId(rowObj as Task, index);
              const attachments = extractAttachmentsFromSheetRow(rowObj);

              return {
                id,
                Project: (rowObj.Project || '').trim(),
                'Label ticket': (rowObj['Label ticket'] || '').trim(),
                'Link Ticket': (rowObj['Link Ticket'] || '').trim(),
                Status: (rowObj.Status || 'Ongoing').trim(),
                Tanggal: rowObj.Tanggal || rowObj.Date || rowObj['Tanggal Pengerjaan'] || '',
                'Waktu Pengerjaan': rowObj['Waktu Pengerjaan'] || rowObj.Durasi || rowObj['Time Spent'] || rowObj.Waktu || '',
                'Detail Pengerjaan': rowObj['Detail Pengerjaan'] || rowObj.Description || rowObj.Catatan || '',
                PIC: rowObj.PIC || rowObj.Assignee || '',
                attachments,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _source: 'google-sheet',
              } as Task;
            })
            .filter(Boolean) as Task[];
        }
      }
    } catch (e) {
      // Fallback to CSV
    }
  }

  // 2. Fallback to Google Sheet CSV Publish URL
  if (!sheetUrl) return [];

  try {
    const separator = sheetUrl.includes('?') ? '&' : '?';
    const bustUrl = `${sheetUrl}${separator}_cb=${Date.now()}`;

    const res = await fetch(bustUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch spreadsheet data: ${res.statusText}`);

    const csvText = await res.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rawData = parsed.data as Task[];

    return rawData
      .filter(t => t.Project || t.Status || t['Label ticket'])
      .map((t, index) => {
        const id = generateSheetTaskId(t, index);
        const attachments = extractAttachmentsFromSheetRow(t);
        return {
          id,
          Project: t.Project?.trim() || '',
          'Label ticket': t['Label ticket']?.trim() || '',
          'Link Ticket': t['Link Ticket']?.trim() || '',
          Status: t.Status?.trim() || 'Ongoing',
          Tanggal: t.Tanggal || t.Date || t['Tanggal Pengerjaan'] || '',
          'Waktu Pengerjaan': t['Waktu Pengerjaan'] || t.Durasi || t['Time Spent'] || t.Waktu || '',
          'Detail Pengerjaan': t['Detail Pengerjaan'] || t.Description || t.Catatan || '',
          PIC: t.PIC || t.Assignee || '',
          attachments,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          _source: 'google-sheet',
        };
      });
  } catch (error) {
    console.error('Error fetching live from Google Sheet:', error);
    return [];
  }
}

export async function readLocalTasks(): Promise<Task[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(TASKS_FILE, 'utf-8');
    const tasks = JSON.parse(fileContent);
    if (Array.isArray(tasks)) {
      return tasks;
    }
  } catch (err) {
    // File not found or invalid
  }
  return [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

/**
 * Merge live Google Sheet rows with local tasks.
 * - Tasks directly added/updated in Google Sheet will be synced.
 * - Local-only custom tasks (created via UI) are preserved.
 * - If user edited a task via UI, the local edit is preserved.
 */
export async function getTasks(): Promise<Task[]> {
  const [localTasks, sheetTasks] = await Promise.all([
    readLocalTasks(),
    fetchFromGoogleSheet(),
  ]);

  if (sheetTasks.length === 0) {
    return localTasks;
  }

  const localTaskMap = new Map<string, Task>();
  const localOnlyTasks: Task[] = [];

  for (const t of localTasks) {
    if (t.id) {
      localTaskMap.set(t.id, t);
      if (!t.id.startsWith('sheet-')) {
        localOnlyTasks.push(t);
      }
    }
  }

  // Merge sheet tasks
  const mergedSheetTasks: Task[] = sheetTasks.map(sheetTask => {
    const localVersion = sheetTask.id ? localTaskMap.get(sheetTask.id) : undefined;
    if (localVersion) {
      const sheetAttachments = parseAttachments(sheetTask.attachments);
      const localAttachments = parseAttachments(localVersion.attachments);
      // Prefer sheet attachments if available, otherwise keep local attachments
      const mergedAttachments = sheetAttachments.length > 0 ? sheetAttachments : localAttachments;

      return {
        ...sheetTask,
        ...localVersion,
        Project: localVersion.Project || sheetTask.Project,
        'Label ticket': localVersion['Label ticket'] || sheetTask['Label ticket'],
        'Link Ticket': localVersion['Link Ticket'] || sheetTask['Link Ticket'],
        Status: localVersion.Status || sheetTask.Status,
        Tanggal: localVersion.Tanggal || sheetTask.Tanggal,
        'Waktu Pengerjaan': localVersion['Waktu Pengerjaan'] || sheetTask['Waktu Pengerjaan'],
        'Detail Pengerjaan': localVersion['Detail Pengerjaan'] || sheetTask['Detail Pengerjaan'],
        PIC: localVersion.PIC || sheetTask.PIC,
        attachments: mergedAttachments,
      };
    }
    return sheetTask;
  });

  // Combine local custom tasks created via UI with Google Sheet tasks
  const combined = [...localOnlyTasks, ...mergedSheetTasks];

  // Save merged state to disk in background
  saveTasks(combined).catch(() => {});

  return combined;
}

// Helper to write changes directly to Google Sheet via Google Apps Script Web App
async function sendToGoogleSheetScript(action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
  const scriptUrl = process.env.GOOGLE_SHEET_SCRIPT_URL || process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!scriptUrl) return;

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    const text = await res.text();
    console.log('[GoogleSheet Webhook Response]:', text);
  } catch (err) {
    console.error('Failed to write directly to Google Sheet:', err);
  }
}

export async function addTask(newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const tasks = await getTasks();
  const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

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
    attachments: parseAttachments(newTaskData.attachments),
    createdAt: now,
    updatedAt: now,
    _source: 'local',
  };

  const updated = [task, ...tasks];
  await saveTasks(updated);

  // Write to Google Sheet if Web App Script URL is set
  const taskAttachments = parseAttachments(task.attachments);
  sendToGoogleSheetScript('CREATE', {
    task: {
      ...task,
      attachments: taskAttachments.join('\n'),
    },
  }).catch(() => {});

  return task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) return null;

  const now = new Date().toISOString();
  const existing = tasks[index];
  const updatedTask: Task = {
    ...existing,
    ...updates,
    attachments: updates.attachments !== undefined ? parseAttachments(updates.attachments) : existing.attachments,
    id: existing.id,
    updatedAt: now,
  };

  tasks[index] = updatedTask;
  await saveTasks(tasks);

  // Write update to Google Sheet if Web App Script URL is set
  const updatedAttachments = parseAttachments(updatedTask.attachments);
  sendToGoogleSheetScript('UPDATE', {
    task: {
      ...updatedTask,
      attachments: updatedAttachments.join('\n'),
    },
    originalTicketLink: existing['Link Ticket'],
    originalLabel: existing['Label ticket'],
    originalProject: existing.Project,
  }).catch(() => {});

  return updatedTask;
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await getTasks();
  const existing = tasks.find(t => t.id === id);
  const filtered = tasks.filter(t => t.id !== id);

  if (filtered.length === tasks.length) return false;

  await saveTasks(filtered);

  if (existing) {
    sendToGoogleSheetScript('DELETE', {
      task: existing,
      ticketLink: existing['Link Ticket'],
      label: existing['Label ticket'],
      project: existing.Project,
    }).catch(() => {});
  }

  return true;
}

export async function syncFromGoogleSheet(): Promise<Task[]> {
  return await getTasks();
}

