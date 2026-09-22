import { TrackedTask, ExportCSVOptions } from './types/time-tracking';

function escapeCSV(val: string | undefined | null): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDurationToTeamwork(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function filterTasksByDateRange(
  tasks: TrackedTask[],
  startDate?: string,
  endDate?: string
): TrackedTask[] {
  return tasks
    .map(task => {
      const filteredLogs = task.logs.filter(log => {
        if (startDate && log.date < startDate) return false;
        if (endDate && log.date > endDate) return false;
        return true;
      });
      return {
        ...task,
        logs: filteredLogs
      };
    })
    .filter(task => task.logs.length > 0);
}

export function getFilteredLogsCount(
  tasks: TrackedTask[],
  startDate?: string,
  endDate?: string
): number {
  return tasks.reduce((count, task) => {
    return (
      count +
      task.logs.filter(log => {
        if (startDate && log.date < startDate) return false;
        if (endDate && log.date > endDate) return false;
        return true;
      }).length
    );
  }, 0);
}

export function exportTasksToTeamworkCSV(
  tasks: TrackedTask[],
  options?: ExportCSVOptions
) {
  // 1. Definisikan header yang persis sesuai format Teamwork CSV Sample
  const headers = [
    'Project',
    'Task ID',
    'Person',
    'Date',
    'Time Spent',
    'Start Time',
    'Description',
    'Billable',
    'Tags'
  ];

  // 2. Filter tasks & logs berdasarkan rentang waktu (jika ada)
  const filteredTasks = filterTasksByDateRange(tasks, options?.startDate, options?.endDate);

  // 3. Flattening Data
  const rows: string[] = [];
  rows.push(headers.join(','));

  filteredTasks.forEach(task => {
    const project = task.project || options?.defaultProject || 'General';
    const taskId = task.ticketNumber || '';
    const taskTags = task.tags || '';

    task.logs.forEach(log => {
      const person = options?.defaultPerson?.trim() || log.person || 'developer@example.com';
      const date = log.date;
      const timeSpent = formatDurationToTeamwork(log.durationMinutes);
      const startTime = log.startTime || '';
      const description = log.logDescription || task.title;
      const billable = log.billable !== false ? 'yes' : 'no';
      const tags = log.tags || taskTags || '';

      const row = [
        escapeCSV(project),
        escapeCSV(taskId),
        escapeCSV(person),
        escapeCSV(date),
        escapeCSV(timeSpent),
        escapeCSV(startTime),
        escapeCSV(description),
        escapeCSV(billable),
        escapeCSV(tags)
      ];

      rows.push(row.join(','));
    });
  });

  // 4. Download file CSV
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  let filename = 'Teamwork-Time-Import.csv';
  if (options?.startDate && options?.endDate) {
    filename = `Teamwork-Time-Import_${options.startDate}_to_${options.endDate}.csv`;
  } else if (options?.startDate) {
    filename = `Teamwork-Time-Import_from_${options.startDate}.csv`;
  } else if (options?.endDate) {
    filename = `Teamwork-Time-Import_until_${options.endDate}.csv`;
  }

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

