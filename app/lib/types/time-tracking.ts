export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface TimeLog {
  id: string;
  taskId: string;
  logDescription: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  durationString: string; // e.g., "1h 30m"
  durationMinutes: number;
  person?: string; // email, e.g. "alice@example.com"
  billable?: boolean; // default true
  tags?: string;
  attachments?: string[]; // URLs for media/screenshots
}

export interface TrackedTask {
  id: string;
  title: string;
  taskDescription: string;
  status: TaskStatus;
  progress: number; // 0 - 100
  project?: string; // e.g. "Website Redesign"
  ticketNumber?: string; // Task ID in Teamwork, e.g. "12345"
  taskUrl?: string; // External URL to Teamwork/Jira/GitHub task
  tags?: string;
  attachments?: string[]; // Documentation images/files
  createdAt: Date;
  logs: TimeLog[];
}

export interface ExportCSVOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  defaultProject?: string;
  defaultPerson?: string;
}
