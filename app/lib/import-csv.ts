import { TrackedTask, TimeLog, TaskStatus } from './types/time-tracking';
import { parseAttachments } from './task-store';
import { parseTimeRangeString, parseTimeToMinutes, formatDurationFromMinutes } from './time-utils';

// Robust CSV Line/Field Parser handling multiline quotes and commas
export function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Convert MM/DD/YYYY or YYYY-MM-DD or other formats to YYYY-MM-DD
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const trimmed = dateStr.trim();
  
  // Format: MM/DD/YYYY or M/D/YYYY
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts.map(p => p.trim());
      const fullYear = y.length === 2 ? `20${y}` : y;
      return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  return trimmed;
}

// Extract HH:mm from strings like "08/28/2026 10:00" or "10:00" or "10:00:00"
function extractTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const trimmed = dateTimeStr.trim();
  if (trimmed.includes(' ')) {
    const timePart = trimmed.split(' ')[1];
    return timePart ? timePart.slice(0, 5) : '';
  }
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return '';
}

// Helper to convert duration string / decimal to minutes
function parseDurationToMinutes(durationStr: string, hours?: string, mins?: string, decimalHours?: string): number {
  if (hours !== undefined || mins !== undefined) {
    const h = parseInt(hours || '0', 10) || 0;
    const m = parseInt(mins || '0', 10) || 0;
    if (h > 0 || m > 0) return h * 60 + m;
  }

  if (decimalHours && !isNaN(parseFloat(decimalHours))) {
    return Math.round(parseFloat(decimalHours) * 60);
  }

  if (durationStr) {
    const trimmed = durationStr.trim();
    if (trimmed.includes(':')) {
      const [h, m] = trimmed.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (num < 10 && trimmed.includes('.')) {
        return Math.round(num * 60);
      }
      if (num >= 60) {
        return Math.round(num);
      }
      return Math.round(num * 60);
    }
  }

  return 60; // default 1 hour
}

export interface ParsedImportResult {
  tasks: TrackedTask[];
  totalLogsCount: number;
  formatDetected: 'teamwork_report' | 'teamwork_import' | 'scv_export' | 'generic';
}

export function parseTeamworkCSV(csvText: string): ParsedImportResult {
  const rows = parseCSVText(csvText);
  if (rows.length < 2) {
    return { tasks: [], totalLogsCount: 0, formatDetected: 'generic' };
  }

  const rawHeaders = rows[0].map(h => h.trim().toLowerCase());

  // Detect Format A: "All Time Report" Export from Teamwork
  const isTeamworkReport = rawHeaders.includes('date/time') || rawHeaders.includes('task list') || rawHeaders.includes('project category') || rawHeaders.includes('decimal hours');

  // Detect Format B: "SCV / TaskHub Export CSV"
  const isScvExport = rawHeaders.includes('label_ticket') || rawHeaders.includes('detail_pengerjaan') || rawHeaders.includes('waktu_pengerjaan');

  // Detect Format C: "Teamwork Time Import Sample"
  const isTeamworkImport = rawHeaders.includes('time spent') && rawHeaders.includes('task id');

  const taskMap: Record<string, TrackedTask> = {};
  let totalLogs = 0;

  if (isScvExport) {
    const colMap: Record<string, number> = {};
    rows[0].forEach((h, idx) => {
      colMap[h.trim().toLowerCase()] = idx;
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every(cell => !cell.trim())) continue;

      const project = row[colMap['project']] || 'General';
      const taskTitle = row[colMap['label_ticket']] || 'Untitled Task';
      const taskUrl = row[colMap['link_ticket']] || '';
      const statusRaw = (row[colMap['status']] || 'done').toLowerCase();
      const status: TaskStatus = statusRaw.includes('done') 
        ? 'done' 
        : statusRaw.includes('test') || statusRaw.includes('review') 
        ? 'review' 
        : statusRaw.includes('progress') || statusRaw.includes('ongoing') 
        ? 'in_progress' 
        : 'todo';
      const progress = status === 'done' ? 100 : status === 'review' ? 85 : status === 'in_progress' ? 50 : 0;
      const dateRaw = row[colMap['tanggal']] || row[colMap['created_at']] || '';
      const date = normalizeDate(dateRaw);
      const waktu = row[colMap['waktu_pengerjaan']] || '';
      const description = row[colMap['detail_pengerjaan']] || taskTitle;
      const pic = row[colMap['pic']] || '';
      const attachments = parseAttachments(row[colMap['attachments']]);

      // Extract ticket number from link_ticket or title
      let ticketNumber = '';
      const twMatch = taskUrl.match(/\/tasks\/(\d+)/i);
      if (twMatch) {
        ticketNumber = twMatch[1];
      } else {
        const titleMatch = taskTitle.match(/#(\d+)/);
        if (titleMatch) ticketNumber = titleMatch[1];
      }

      // Parse time / duration from waktu_pengerjaan
      let startTime = '09:00';
      let endTime: string | undefined = '10:00';
      let durationMinutes = 60;
      let durationString = '1:00';

      const parsedRange = parseTimeRangeString(waktu);
      if (parsedRange) {
        startTime = parsedRange.startTime;
        endTime = parsedRange.endTime;
        durationMinutes = parsedRange.durationMinutes;
        durationString = parsedRange.durationString;
      } else if (waktu.toLowerCase().includes('menit') || waktu.toLowerCase().includes('jam')) {
        const durMins = parseDurationToMinutes(waktu);
        if (durMins > 0) {
          durationMinutes = durMins;
          durationString = formatDurationFromMinutes(durMins);
        }
      }

      const taskKey = `${project}__${ticketNumber}__${taskTitle}`;
      if (!taskMap[taskKey]) {
        taskMap[taskKey] = {
          id: row[colMap['id']] || crypto.randomUUID(),
          title: taskTitle.trim(),
          taskDescription: description.trim(),
          status,
          progress,
          project: project.trim(),
          ticketNumber: ticketNumber.trim() || undefined,
          taskUrl: taskUrl.trim() || undefined,
          attachments,
          createdAt: new Date(),
          logs: []
        };
      }

      const logItem: TimeLog = {
        id: crypto.randomUUID(),
        taskId: taskMap[taskKey].id,
        logDescription: description.trim(),
        date,
        startTime,
        endTime,
        durationString,
        durationMinutes,
        billable: true,
        person: pic.trim() || undefined,
      };

      taskMap[taskKey].logs.push(logItem);
      totalLogs++;
    }

    return {
      tasks: Object.values(taskMap),
      totalLogsCount: totalLogs,
      formatDetected: 'scv_export'
    };
  }

  if (isTeamworkReport) {
    // Map column indices
    const colMap: Record<string, number> = {};
    rows[0].forEach((h, idx) => {
      colMap[h.trim().toLowerCase()] = idx;
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every(cell => !cell.trim())) continue;

      const project = row[colMap['project']] || 'General';
      const taskTitle = row[colMap['task']] || row[colMap['parent task']] || row[colMap['task list']] || 'General Support';
      const ticketNumber = row[colMap['task id']] || '';
      const dateRaw = row[colMap['date']] || '';
      const startDateTimeRaw = row[colMap['date/time']] || '';
      const endDateTimeRaw = row[colMap['end date/time']] || '';
      const description = row[colMap['description']] || taskTitle;
      const billableRaw = row[colMap['is it billable?']] || '';
      const hoursRaw = row[colMap['hours']];
      const minsRaw = row[colMap['minutes']];
      const decimalHoursRaw = row[colMap['decimal hours']];
      const tags = row[colMap['tags']] || row[colMap['task tags']] || '';
      const who = row[colMap['who']] || '';

      const date = normalizeDate(dateRaw || startDateTimeRaw.split(' ')[0]);
      const startTime = extractTime(startDateTimeRaw) || '08:00';
      const endTime = extractTime(endDateTimeRaw) || '09:00';
      const durationMinutes = parseDurationToMinutes('', hoursRaw, minsRaw, decimalHoursRaw);
      const h = Math.floor(durationMinutes / 60);
      const m = durationMinutes % 60;
      const durationString = `${h}:${m.toString().padStart(2, '0')}`;
      const billable = billableRaw === '1' || billableRaw.toLowerCase() === 'yes' || billableRaw.toLowerCase() === 'true';

      // Group by Task
      const taskKey = `${project}__${ticketNumber}__${taskTitle}`;
      if (!taskMap[taskKey]) {
        taskMap[taskKey] = {
          id: crypto.randomUUID(),
          title: taskTitle.trim(),
          taskDescription: description.trim(),
          status: 'done',
          progress: 100,
          project: project.trim(),
          ticketNumber: ticketNumber.trim() || undefined,
          tags: tags.trim() || undefined,
          createdAt: new Date(),
          logs: []
        };
      }

      const logItem: TimeLog = {
        id: crypto.randomUUID(),
        taskId: taskMap[taskKey].id,
        logDescription: description.trim(),
        date,
        startTime,
        endTime,
        durationString,
        durationMinutes,
        billable,
        person: who.trim() || undefined,
        tags: tags.trim() || undefined,
      };

      taskMap[taskKey].logs.push(logItem);
      totalLogs++;
    }

    return {
      tasks: Object.values(taskMap),
      totalLogsCount: totalLogs,
      formatDetected: 'teamwork_report'
    };
  }

  // Format B or Generic
  const colMap: Record<string, number> = {};
  rows[0].forEach((h, idx) => {
    colMap[h.trim().toLowerCase()] = idx;
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(cell => !cell.trim())) continue;

    const project = row[colMap['project']] || 'General';
    const ticketNumber = row[colMap['task id']] || '';
    const person = row[colMap['person']] || '';
    const dateRaw = row[colMap['date']] || '';
    const timeSpentRaw = row[colMap['time spent']] || '';
    const startTimeRaw = row[colMap['start time']] || '';
    const description = row[colMap['description']] || 'Task work';
    const billableRaw = row[colMap['billable']] || '';
    const tags = row[colMap['tags']] || '';

    const date = normalizeDate(dateRaw);
    const startTime = extractTime(startTimeRaw) || '08:00';
    const durationMinutes = parseDurationToMinutes(timeSpentRaw);
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    const durationString = `${h}:${m.toString().padStart(2, '0')}`;

    // Compute end time from start time and duration
    let endTime = '09:00';
    if (startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) {
        const totalEnd = (sh * 60 + sm + durationMinutes) % 1440;
        const eh = Math.floor(totalEnd / 60);
        const em = totalEnd % 60;
        endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      }
    }

    const billable = billableRaw.toLowerCase() === 'yes' || billableRaw === '1' || billableRaw.toLowerCase() === 'true';
    const taskTitle = description.split('\n')[0].slice(0, 60) || `Task #${ticketNumber || 'General'}`;

    const taskKey = `${project}__${ticketNumber}__${taskTitle}`;
    if (!taskMap[taskKey]) {
      taskMap[taskKey] = {
        id: crypto.randomUUID(),
        title: taskTitle.trim(),
        taskDescription: description.trim(),
        status: 'done',
        progress: 100,
        project: project.trim(),
        ticketNumber: ticketNumber.trim() || undefined,
        tags: tags.trim() || undefined,
        createdAt: new Date(),
        logs: []
      };
    }

    const logItem: TimeLog = {
      id: crypto.randomUUID(),
      taskId: taskMap[taskKey].id,
      logDescription: description.trim(),
      date,
      startTime,
      endTime,
      durationString,
      durationMinutes,
      billable,
      person: person.trim() || undefined,
      tags: tags.trim() || undefined,
    };

    taskMap[taskKey].logs.push(logItem);
    totalLogs++;
  }

  return {
    tasks: Object.values(taskMap),
    totalLogsCount: totalLogs,
    formatDetected: isTeamworkImport ? 'teamwork_import' : 'generic'
  };
}
