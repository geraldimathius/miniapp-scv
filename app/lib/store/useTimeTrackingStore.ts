import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TrackedTask, TimeLog, TaskStatus } from '../types/time-tracking';

interface TimeTrackingState {
  tasks: TrackedTask[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (
    title: string, 
    taskDescription: string, 
    project?: string, 
    tags?: string, 
    ticketNumber?: string, 
    status?: TaskStatus, 
    progress?: number,
    taskUrl?: string,
    attachments?: string[]
  ) => string;
  updateTask: (taskId: string, updates: Partial<TrackedTask>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, progress?: number) => void;
  updateTaskTicket: (taskId: string, ticketNumber: string) => void;
  addTimeLog: (taskId: string, log: Omit<TimeLog, 'id' | 'taskId'>) => void;
  updateTimeLog: (taskId: string, logId: string, updates: Partial<TimeLog>) => void;
  deleteTimeLog: (taskId: string, logId: string) => void;
  deleteTask: (taskId: string) => void;
  importTasks: (newTasks: TrackedTask[], mode?: 'merge' | 'replace') => Promise<void>;
}

export const useTimeTrackingStore = create<TimeTrackingState>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      error: null,

      fetchTasks: async () => {
        set({ isLoading: true, isSyncing: true, error: null });
        try {
          const res = await fetch('/api/time-tracker');
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const dbTasks: TrackedTask[] = json.data;

            // Auto-Migration Check: If DB is empty, but LocalStorage has tasks, sync them to DB!
            const localTasks = get().tasks;
            if (dbTasks.length === 0 && localTasks.length > 0) {
              try {
                const syncRes = await fetch('/api/time-tracker/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tasks: localTasks, mode: 'merge' }),
                });
                const syncJson = await syncRes.json();
                if (syncJson.success && Array.isArray(syncJson.data)) {
                  set({ 
                    tasks: syncJson.data, 
                    isLoading: false, 
                    isSyncing: false, 
                    lastSyncedAt: new Date().toISOString() 
                  });
                  return;
                }
              } catch (syncErr) {
                console.warn('Auto-sync from local storage failed:', syncErr);
              }
            }

            set({ 
              tasks: dbTasks, 
              isLoading: false, 
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString() 
            });
          } else {
            set({ 
              isLoading: false, 
              isSyncing: false, 
              error: json.error || 'Gagal memuat task dari database' 
            });
          }
        } catch (err: any) {
          console.error('Failed to fetch tasks from Turso API:', err);
          set({ isLoading: false, isSyncing: false, error: err.message });
        }
      },
      
      addTask: (title, taskDescription, project, tags, ticketNumber, status = 'todo', progress = 0, taskUrl, attachments = []) => {
        const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newTask: TrackedTask = {
          id,
          title,
          taskDescription,
          status,
          progress,
          project: project || '',
          tags: tags || '',
          ticketNumber: ticketNumber || '',
          taskUrl: taskUrl || '',
          attachments: attachments || [],
          createdAt: new Date(),
          logs: []
        };

        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: [newTask, ...state.tasks],
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch('/api/time-tracker/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title,
            taskDescription,
            project,
            tags,
            ticketNumber,
            status,
            progress,
            taskUrl,
            attachments
          }),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to save task to Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });

        return id;
      },

      updateTask: (taskId, updates) => {
        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.map(t =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch(`/api/time-tracker/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to update task in Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      updateTaskStatus: (taskId, status, progress) => {
        let finalProgress = progress;
        const task = get().tasks.find(t => t.id === taskId);
        if (progress === undefined && task) {
          if (status === 'todo') finalProgress = 0;
          else if (status === 'in_progress') finalProgress = task.progress === 0 || task.progress === 100 ? 50 : task.progress;
          else if (status === 'review') finalProgress = 85;
          else if (status === 'done') finalProgress = 100;
        }

        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;
            return { ...t, status, progress: finalProgress !== undefined ? finalProgress : t.progress };
          }),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch(`/api/time-tracker/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, progress: finalProgress }),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to update task status in Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      updateTaskTicket: (taskId, ticketNumber) => {
        set((state) => ({
          tasks: state.tasks.map(t => 
            t.id === taskId ? { ...t, ticketNumber } : t
          ),
          isSyncing: true
        }));

        fetch(`/api/time-tracker/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketNumber }),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to update task ticket in Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      addTimeLog: (taskId, logData) => {
        const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newLog: TimeLog = {
          ...logData,
          id: logId,
          taskId: taskId
        };

        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;
            const newStatus = t.status === 'todo' ? 'in_progress' : t.status;
            const newProgress = t.status === 'todo' && t.progress === 0 ? 25 : t.progress;
            return { 
              ...t, 
              status: newStatus,
              progress: newProgress,
              logs: [newLog, ...t.logs] 
            };
          }),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch('/api/time-tracker/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: logId,
            taskId,
            ...logData
          }),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to save time log to Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      updateTimeLog: (taskId, logId, updates) => {
        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              logs: t.logs.map(l => l.id === logId ? { ...l, ...updates } : l)
            };
          }),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch(`/api/time-tracker/logs/${logId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to update time log in Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      deleteTimeLog: (taskId, logId) => {
        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;
            return { ...t, logs: t.logs.filter(l => l.id !== logId) };
          }),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch(`/api/time-tracker/logs/${logId}`, {
          method: 'DELETE',
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to delete time log from Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      deleteTask: (taskId) => {
        // Optimistic UI Update & mark syncing
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== taskId),
          isSyncing: true
        }));

        // Persist to Turso DB via API
        fetch(`/api/time-tracker/tasks/${taskId}`, {
          method: 'DELETE',
        })
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
            } else {
              set({ isSyncing: false, error: json.error });
            }
          })
          .catch(err => {
            console.error('Failed to delete task from Turso DB:', err);
            set({ isSyncing: false, error: err.message });
          });
      },

      importTasks: async (newTasks, mode = 'merge') => {
        set({ isSyncing: true, error: null });
        try {
          const res = await fetch('/api/time-tracker/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: newTasks, mode }),
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            set({ 
              tasks: json.data, 
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString() 
            });
          } else {
            // Fallback to local import if API fails
            const existingTasks = mode === 'replace' ? [] : [...get().tasks];
            for (const incoming of newTasks) {
              const matchIndex = existingTasks.findIndex(t => 
                (incoming.ticketNumber && t.ticketNumber === incoming.ticketNumber) ||
                (!incoming.ticketNumber && !t.ticketNumber && t.title.toLowerCase().trim() === incoming.title.toLowerCase().trim() && t.project?.toLowerCase().trim() === incoming.project?.toLowerCase().trim())
              );
              if (matchIndex >= 0) {
                const existing = existingTasks[matchIndex];
                const mergedLogs = [...existing.logs];
                for (const inLog of incoming.logs) {
                  const alreadyExists = mergedLogs.some(l => 
                    l.date === inLog.date && 
                    l.startTime === inLog.startTime && 
                    (l.logDescription || '').trim() === (inLog.logDescription || '').trim()
                  );
                  if (!alreadyExists) {
                    mergedLogs.push({ ...inLog, taskId: existing.id });
                  }
                }
                existingTasks[matchIndex] = {
                  ...existing,
                  logs: mergedLogs,
                  project: existing.project || incoming.project,
                  tags: existing.tags || incoming.tags,
                };
              } else {
                existingTasks.push(incoming);
              }
            }
            set({ 
              tasks: existingTasks, 
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString(),
              error: json.error || 'Sinkronisasi sebagian' 
            });
          }
        } catch (err: any) {
          console.error('Error importing tasks to Turso DB:', err);
          set({ isSyncing: false, error: err.message });
        }
      }
    }),
    {
      name: 'time-tracking-storage',
    }
  )
);
