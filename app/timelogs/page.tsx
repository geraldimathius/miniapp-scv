'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTimeTrackingStore } from '../lib/store/useTimeTrackingStore';
import { exportTasksToTeamworkCSV, getFilteredLogsCount } from '../lib/export-csv';
import { parseTeamworkCSV, ParsedImportResult } from '../lib/import-csv';
import { TaskStatus, TrackedTask } from '../lib/types/time-tracking';
import TimeLogStepperModal from '../components/TimeLogStepperModal';
import MonthlyBarChart from '../components/MonthlyBarChart';
import { 
  parseTimeToMinutes, 
  minutesToTimeString, 
  formatDurationFromMinutes, 
  parseDurationInputToMinutes, 
  parseTimeRangeString 
} from '../lib/time-utils';
import { 
  FiPlus, 
  FiDownload, 
  FiClock, 
  FiX, 
  FiTrash2, 
  FiFileText, 
  FiCalendar, 
  FiTag, 
  FiFolder, 
  FiUser, 
  FiCheckCircle,
  FiGrid,
  FiBarChart2,
  FiArrowRight,
  FiEdit3,
  FiCheck,
  FiLayers,
  FiLink,
  FiPaperclip,
  FiImage,
  FiUploadCloud,
  FiExternalLink,
  FiAlertCircle,
  FiRefreshCw,
  FiDatabase,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiSearch
} from 'react-icons/fi';
import AppNav from '../components/app-nav';

const COLUMNS: Array<{ id: TaskStatus; title: string; color: string; badgeBg: string; border: string }> = [
  { id: 'todo', title: 'To Do', color: 'text-slate-700 dark:text-slate-300', badgeBg: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
  { id: 'in_progress', title: 'In Progress', color: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-900/50' },
  { id: 'review', title: 'Review / Testing', color: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-900/50' },
  { id: 'done', title: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/50' },
];

export default function TimeLogsPage() {
  const { 
    tasks, 
    isLoading,
    isSyncing,
    lastSyncedAt,
    error: syncError,
    fetchTasks,
    addTask, 
    updateTask, 
    updateTaskStatus, 
    addTimeLog, 
    updateTimeLog, 
    deleteTimeLog, 
    deleteTask,
    importTasks
  } = useTimeTrackingStore();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);

  // View Mode: 'board' | 'chart'
  const [viewMode, setViewMode] = useState<'board' | 'chart'>('board');

  // Board View Filter & Month State (default: current month YYYY-MM)
  const [boardSelectedMonth, setBoardSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [boardFilterProject, setBoardFilterProject] = useState<string>('all');
  const [boardSearchQuery, setBoardSearchQuery] = useState<string>('');

  // Quick Stepper Modal
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [stepperTaskId, setStepperTaskId] = useState<string | null>(null);
  const [stepperDate, setStepperDate] = useState<string | null>(null);

  // New Task Modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskTicket, setNewTaskTicket] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');

  // Edit Task Modal
  const [editingTask, setEditingTask] = useState<TrackedTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editTicket, setEditTicket] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editProgress, setEditProgress] = useState(0);
  const [editTaskUrl, setEditTaskUrl] = useState('');
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Task Detail / Drawer
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Editing Individual Time Log inside Task Detail Modal
  const [editingDetailLogId, setEditingDetailLogId] = useState<string | null>(null);
  const [detailEditLogDate, setDetailEditLogDate] = useState('');
  const [detailEditLogStartTime, setDetailEditLogStartTime] = useState('');
  const [detailEditLogEndTime, setDetailEditLogEndTime] = useState('');
  const [detailEditLogTimeRange, setDetailEditLogTimeRange] = useState('');
  const [detailEditLogDuration, setDetailEditLogDuration] = useState('');
  const [detailEditLogDesc, setDetailEditLogDesc] = useState('');
  const [detailEditLogBillable, setDetailEditLogBillable] = useState(true);
  const [detailEditLogTags, setDetailEditLogTags] = useState('');

  // Export Modal
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportPerson, setExportPerson] = useState('');

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importParsedResult, setImportParsedResult] = useState<ParsedImportResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportSuccess, setIsImportSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Hydration & fetch user & fetch tasks from Turso DB
  useEffect(() => {
    setMounted(true);
    fetchTasks();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          setExportPerson(data.user.email || 'developer@example.com');
          if (data.user.role === 'master') {
            fetch('/api/users')
              .then(uRes => uRes.json())
              .then(uData => {
                if (uData?.data) {
                  const pending = uData.data.filter((u: any) => u.status === 'pending').length;
                  setPendingUsersCount(pending);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        setExportPerson('developer@example.com');
      });
  }, [fetchTasks]);

  // Extract unique existing projects for auto-suggesting
  const existingProjects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.project && t.project.trim()) {
        set.add(t.project.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Tasks filtered by selected newTaskProject
  const projectMatchedTasksForNew = useMemo(() => {
    if (!newTaskProject.trim()) return tasks;
    return tasks.filter(t => (t.project || '').toLowerCase().trim() === newTaskProject.toLowerCase().trim());
  }, [tasks, newTaskProject]);

  // Suggested Task Titles based on current newTaskProject
  const suggestedTitlesForNew: string[] = useMemo(() => {
    const set = new Set<string>();
    projectMatchedTasksForNew.forEach(t => {
      if (t.title && t.title.trim()) set.add(t.title.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projectMatchedTasksForNew]);

  // Suggested Tickets based on current newTaskProject
  const suggestedTicketsForNew: Array<{ ticket: string; title: string }> = useMemo(() => {
    const list: Array<{ ticket: string; title: string }> = [];
    const seen = new Set<string>();
    projectMatchedTasksForNew.forEach(t => {
      if (t.ticketNumber && t.ticketNumber.trim() && !seen.has(t.ticketNumber.trim())) {
        seen.add(t.ticketNumber.trim());
        list.push({ ticket: t.ticketNumber.trim(), title: t.title });
      }
    });
    return list;
  }, [projectMatchedTasksForNew]);

  // Handler to select suggested task title for New Task Modal
  const handleSelectTitleForNew = (titleStr: string) => {
    setNewTaskTitle(titleStr);
    const cleanTitle = titleStr.trim().toLowerCase();
    if (!cleanTitle) return;

    const matched = tasks.find(t => {
      const match = t.title.toLowerCase().trim() === cleanTitle;
      if (newTaskProject.trim()) {
        return match && (t.project || '').toLowerCase().trim() === newTaskProject.toLowerCase().trim();
      }
      return match;
    }) || tasks.find(t => t.title.toLowerCase().trim() === cleanTitle);

    if (matched) {
      if (!newTaskProject.trim() && matched.project) setNewTaskProject(matched.project);
      if (matched.ticketNumber) setNewTaskTicket(matched.ticketNumber);
      if (matched.taskUrl) setNewTaskUrl(matched.taskUrl);
      if (matched.tags) setNewTaskTags(matched.tags);
      // Description is intentionally left empty per user preference
    }
  };

  // Handler to select suggested ticket for New Task Modal
  const handleSelectTicketForNew = (ticketStr: string) => {
    setNewTaskTicket(ticketStr);
    const cleanTicket = ticketStr.replace(/^#/, '').trim().toLowerCase();
    if (!cleanTicket) return;

    const matched = tasks.find(t => {
      const tNum = (t.ticketNumber || '').replace(/^#/, '').toLowerCase().trim();
      if (newTaskProject.trim()) {
        return tNum === cleanTicket && (t.project || '').toLowerCase().trim() === newTaskProject.toLowerCase().trim();
      }
      return tNum === cleanTicket;
    }) || tasks.find(t => (t.ticketNumber || '').replace(/^#/, '').toLowerCase().trim() === cleanTicket);

    if (matched) {
      if (!newTaskTitle) setNewTaskTitle(matched.title);
      if (!newTaskProject.trim() && matched.project) setNewTaskProject(matched.project);
      if (matched.taskUrl) setNewTaskUrl(matched.taskUrl);
      if (matched.tags) setNewTaskTags(matched.tags);
      // Description is intentionally left empty per user preference
    }
  };

  // Board Month Parsing and Navigation Handlers
  const [boardYearNum, boardMonthNum] = useMemo(() => {
    if (boardSelectedMonth === 'all') {
      const d = new Date();
      return [d.getFullYear(), d.getMonth() + 1];
    }
    const [y, m] = boardSelectedMonth.split('-').map(Number);
    return [y || new Date().getFullYear(), m || new Date().getMonth() + 1];
  }, [boardSelectedMonth]);

  const handlePrevBoardMonth = () => {
    let newM = boardMonthNum - 1;
    let newY = boardYearNum;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setBoardSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handleNextBoardMonth = () => {
    let newM = boardMonthNum + 1;
    let newY = boardYearNum;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setBoardSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const boardMonthName = useMemo(() => {
    if (boardSelectedMonth === 'all') return 'Semua Periode (All Time)';
    const d = new Date(boardYearNum, boardMonthNum - 1, 1);
    return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  }, [boardSelectedMonth, boardYearNum, boardMonthNum]);

  // Tasks Filtered for Board View by Month, Project, and Search Query
  const filteredBoardTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by project
      if (boardFilterProject !== 'all' && (task.project || 'General').toLowerCase().trim() !== boardFilterProject.toLowerCase().trim()) {
        return false;
      }

      // Filter by search query
      if (boardSearchQuery.trim()) {
        const q = boardSearchQuery.toLowerCase().trim();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchTicket = (task.ticketNumber || '').toLowerCase().includes(q);
        const matchDesc = (task.taskDescription || '').toLowerCase().includes(q);
        const matchProject = (task.project || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTicket && !matchDesc && !matchProject) return false;
      }

      // Filter by month
      if (boardSelectedMonth === 'all') return true;

      // Match if any log is in this month
      const hasLogThisMonth = task.logs && task.logs.some(l => l.date && l.date.startsWith(boardSelectedMonth));
      if (hasLogThisMonth) return true;

      // Or if task has NO logs, check if createdAt matches this month
      if (!task.logs || task.logs.length === 0) {
        const createdAtStr = task.createdAt instanceof Date 
          ? task.createdAt.toISOString().slice(0, 7)
          : String(task.createdAt || '').slice(0, 7);
        return createdAtStr === boardSelectedMonth;
      }

      return false;
    });
  }, [tasks, boardSelectedMonth, boardFilterProject, boardSearchQuery]);

  // Total Hours for Filtered Board Tasks in this Month
  const boardTotalMinutes = useMemo(() => {
    return filteredBoardTasks.reduce((sum, t) => {
      const logsToCount = boardSelectedMonth === 'all' 
        ? t.logs 
        : t.logs.filter(l => l.date && l.date.startsWith(boardSelectedMonth));
      return sum + logsToCount.reduce((lSum, l) => lSum + l.durationMinutes, 0);
    }, 0);
  }, [filteredBoardTasks, boardSelectedMonth]);

  const boardTotalHoursFormatted = useMemo(() => {
    const h = Math.floor(boardTotalMinutes / 60);
    const m = boardTotalMinutes % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  }, [boardTotalMinutes]);

  // Group filtered tasks by status for Board View
  const tasksByStatus = useMemo(() => ({
    todo: filteredBoardTasks.filter(t => (t.status || 'todo') === 'todo'),
    in_progress: filteredBoardTasks.filter(t => t.status === 'in_progress'),
    review: filteredBoardTasks.filter(t => t.status === 'review'),
    done: filteredBoardTasks.filter(t => t.status === 'done'),
  }), [filteredBoardTasks]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDesc.trim()) return;
    addTask(
      newTaskTitle.trim(),
      newTaskDesc.trim(),
      newTaskProject.trim() || 'General',
      newTaskTags.trim() || undefined,
      newTaskTicket.trim() || undefined,
      newTaskStatus,
      newTaskStatus === 'done' ? 100 : newTaskStatus === 'review' ? 85 : newTaskStatus === 'in_progress' ? 50 : 0,
      newTaskUrl.trim() || undefined
    );
    setIsNewTaskOpen(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskTicket('');
    setNewTaskTags('');
    setNewTaskUrl('');
  };

  const handleOpenEditTask = (task: TrackedTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.taskDescription);
    setEditProject(task.project || 'General');
    setEditTicket(task.ticketNumber || '');
    setEditTags(task.tags || '');
    setEditStatus(task.status || 'todo');
    setEditProgress(task.progress || 0);
    setEditTaskUrl(task.taskUrl || '');
    setEditAttachments(task.attachments || []);
  };

  const handleSaveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    updateTask(editingTask.id, {
      title: editTitle.trim(),
      taskDescription: editDesc.trim(),
      project: editProject.trim() || 'General',
      ticketNumber: editTicket.trim() || undefined,
      tags: editTags.trim() || undefined,
      status: editStatus,
      progress: editProgress,
      taskUrl: editTaskUrl.trim() || undefined,
      attachments: editAttachments,
    });
    setEditingTask(null);
  };

  const handleFileUpload = async (files: FileList | null, target: 'edit' | 'detail') => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success && json.data) {
        const urls = json.data as string[];
        if (target === 'edit') {
          setEditAttachments(prev => [...prev, ...urls]);
        } else if (target === 'detail' && detailTaskId) {
          const task = tasks.find(t => t.id === detailTaskId);
          if (task) {
            updateTask(detailTaskId, { attachments: [...(task.attachments || []), ...urls] });
          }
        }
      } else {
        alert(json.error || 'Gagal mengunggah file.');
      }
    } catch {
      alert('Gagal mengunggah file. Pastikan konfigurasi Cloudinary sudah benar.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (url: string, target: 'edit' | 'detail') => {
    if (target === 'edit') {
      setEditAttachments(prev => prev.filter(a => a !== url));
    } else if (target === 'detail' && detailTaskId) {
      const task = tasks.find(t => t.id === detailTaskId);
      if (task) {
        updateTask(detailTaskId, { attachments: (task.attachments || []).filter(a => a !== url) });
      }
    }
  };

  const handleOpenStepperForTask = (taskId: string, date?: string) => {
    setStepperTaskId(taskId);
    setStepperDate(date || null);
    setIsStepperOpen(true);
  };

  const handleQuickLogTime = (date?: string, taskId?: string) => {
    setStepperTaskId(taskId || null);
    setStepperDate(date || null);
    setIsStepperOpen(true);
  };

  // Handlers for Editing Individual Time Log inside Task Detail Modal
  const handleStartEditDetailLog = (log: { id: string; date: string; startTime?: string; endTime?: string; durationMinutes: number; durationString?: string; logDescription: string; billable?: boolean; tags?: string }) => {
    setEditingDetailLogId(log.id);
    setDetailEditLogDate(log.date);
    const start = log.startTime || '08:00';
    const end = log.endTime || '09:00';
    setDetailEditLogStartTime(start);
    setDetailEditLogEndTime(end);
    setDetailEditLogTimeRange(`${start} - ${end}`);
    const durStr = log.durationString || (log.durationMinutes ? formatDurationFromMinutes(log.durationMinutes) : '1:00');
    setDetailEditLogDuration(durStr);
    setDetailEditLogDesc(log.logDescription || '');
    setDetailEditLogBillable(log.billable !== false);
    setDetailEditLogTags(log.tags || '');
  };

  const handleCancelEditDetailLog = () => {
    setEditingDetailLogId(null);
  };

  const handleDetailEditStartTimeChange = (val: string) => {
    setDetailEditLogStartTime(val);
    const startMins = parseTimeToMinutes(val);
    const endMins = parseTimeToMinutes(detailEditLogEndTime);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setDetailEditLogDuration(formatDurationFromMinutes(diff));
      setDetailEditLogTimeRange(`${val} - ${detailEditLogEndTime}`);
    }
  };

  const handleDetailEditEndTimeChange = (val: string) => {
    setDetailEditLogEndTime(val);
    const startMins = parseTimeToMinutes(detailEditLogStartTime);
    const endMins = parseTimeToMinutes(val);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setDetailEditLogDuration(formatDurationFromMinutes(diff));
      setDetailEditLogTimeRange(`${detailEditLogStartTime} - ${val}`);
    }
  };

  const handleDetailEditDurationChange = (val: string) => {
    setDetailEditLogDuration(val);
    const durationMins = parseDurationInputToMinutes(val);
    if (durationMins > 0 && detailEditLogStartTime) {
      const startMins = parseTimeToMinutes(detailEditLogStartTime);
      if (startMins !== null) {
        const totalEndMins = (startMins + durationMins) % 1440;
        const newEnd = minutesToTimeString(totalEndMins);
        setDetailEditLogEndTime(newEnd);
        setDetailEditLogTimeRange(`${detailEditLogStartTime} - ${newEnd}`);
      }
    }
  };

  const handleDetailEditTimeRangeChange = (val: string) => {
    setDetailEditLogTimeRange(val);
    const parsed = parseTimeRangeString(val);
    if (parsed) {
      setDetailEditLogStartTime(parsed.startTime);
      setDetailEditLogEndTime(parsed.endTime);
      setDetailEditLogDuration(parsed.durationString);
    }
  };

  const handleSaveDetailLog = (taskId: string, logId: string) => {
    const startMins = parseTimeToMinutes(detailEditLogStartTime);
    const endMins = parseTimeToMinutes(detailEditLogEndTime);
    let durationMins = parseDurationInputToMinutes(detailEditLogDuration);

    if (durationMins <= 0 && startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      durationMins = diff;
    }
    if (durationMins <= 0) durationMins = 60;

    const finalStart = startMins !== null ? minutesToTimeString(startMins) : detailEditLogStartTime;
    const finalEnd = endMins !== null ? minutesToTimeString(endMins) : detailEditLogEndTime;
    const finalDurationStr = formatDurationFromMinutes(durationMins);

    updateTimeLog(taskId, logId, {
      date: detailEditLogDate,
      startTime: finalStart,
      endTime: finalEnd,
      durationMinutes: durationMins,
      durationString: finalDurationStr,
      logDescription: detailEditLogDesc.trim() || 'Work logged',
      billable: detailEditLogBillable,
      tags: detailEditLogTags.trim() || undefined
    });

    setEditingDetailLogId(null);
  };

  // Quick Date Preset Handlers for Export
  const handleSetPreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'all') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'all') {
      setExportStartDate('');
      setExportEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatDate(now);
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (preset === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setExportStartDate(formatDate(startOfWeek));
      setExportEndDate(formatDate(now));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setExportStartDate(formatDate(startOfMonth));
      setExportEndDate(formatDate(now));
    } else if (preset === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setExportStartDate(formatDate(startOfLastMonth));
      setExportEndDate(formatDate(endOfLastMonth));
    }
  };

  const matchingLogsCount = getFilteredLogsCount(
    tasks,
    exportStartDate || undefined,
    exportEndDate || undefined
  );

  const handleExecuteExport = () => {
    exportTasksToTeamworkCSV(tasks, {
      startDate: exportStartDate || undefined,
      endDate: exportEndDate || undefined,
      defaultPerson: exportPerson.trim() || undefined
    });
    setIsExportOpen(false);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);
    setIsImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseTeamworkCSV(text);
        if (result.tasks.length === 0 || result.totalLogsCount === 0) {
          setImportError('Tidak ada data task atau log waktu yang valid ditemukan dalam file CSV ini.');
          setImportParsedResult(null);
        } else {
          setImportParsedResult(result);
        }
      } catch (err: any) {
        setImportError(err.message || 'Gagal memproses file CSV.');
        setImportParsedResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importParsedResult || importParsedResult.tasks.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      await importTasks(importParsedResult.tasks, importMode);
      setIsImportSuccess(true);
      setTimeout(() => {
        setIsImportOpen(false);
        setIsImportSuccess(false);
        setIsImporting(false);
        setImportParsedResult(null);
        setImportFileName('');
      }, 1500);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err.message || 'Gagal menyimpan hasil import ke database.');
      setIsImporting(false);
    }
  };

  const detailTask = tasks.find(t => t.id === detailTaskId);

  // Total Task Duration Helper
  const getTaskTotalHours = (task: TrackedTask) => {
    const totalMinutes = task.logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppNav user={currentUser} pendingUsersCount={pendingUsersCount} />

      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 shrink-0">
              <FiClock size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Time Tracker
                </h1>

                {/* Cloud Sync Status Indicator Badge */}
                {isLoading || isSyncing ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-bold shadow-xs animate-pulse shrink-0">
                    <FiRefreshCw size={11} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>Syncing Turso DB...</span>
                  </div>
                ) : syncError ? (
                  <button
                    onClick={() => fetchTasks()}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-full text-[11px] font-bold shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shrink-0"
                    title="Gagal sync ke database. Klik untuk mencoba lagi"
                  >
                    <FiAlertCircle size={11} className="text-amber-600 dark:text-amber-400" />
                    <span>Sync Terkendala (Retry)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => fetchTasks()}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-bold shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer transition-all group shrink-0"
                    title="Data tersinkron dengan Turso Database. Klik untuk me-refresh data terbaru."
                  >
                    <FiCheckCircle size={11} className="text-emerald-500 group-hover:hidden" />
                    <FiRefreshCw size={11} className="text-emerald-500 hidden group-hover:inline-block" />
                    <span>Turso DB Synced</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Kelola tiket, log waktu pengerjaan developer, dan export Teamwork CSV
              </p>
            </div>
          </div>

          {/* Controls: View Switcher & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* View Mode Switcher */}
            <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FiGrid size={13} />
                <span>Board View</span>
              </button>

              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FiBarChart2 size={13} />
                <span>Diagram Batang</span>
              </button>
            </div>

            {/* Action Buttons: 2x2 grid on mobile, flex on sm */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              {/* Single Fast 1-Click Log Time Stepper Button */}
              <button
                onClick={() => handleQuickLogTime()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FiClock size={14} />
                <span>+ Log Time</span>
              </button>

              {/* Add Task Button */}
              <button
                onClick={() => setIsNewTaskOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
              >
                <FiPlus size={14} />
                <span>+ Buat Task</span>
              </button>

              {/* Export CSV Button */}
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FiDownload size={14} />
                <span className="truncate">Export CSV</span>
              </button>

              {/* Import CSV Button */}
              <button
                onClick={() => {
                  setIsImportOpen(true);
                  setImportError(null);
                  setIsImportSuccess(false);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
              >
                <FiUploadCloud size={14} className="text-indigo-500" />
                <span className="truncate">Import CSV</span>
              </button>
            </div>

          </div>
        </div>

        {/* VIEW 1: BOARD VIEW (Kanban with Monthly Filtering) */}
        {viewMode === 'board' && (
          <div className="space-y-4">
            
            {/* Board Month & Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Left: Month Stepper & Quick Switch */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevBoardMonth}
                    disabled={boardSelectedMonth === 'all'}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                    title="Bulan Sebelumnya"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1.5 px-2.5">
                    <FiCalendar size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-28 sm:min-w-36 text-center capitalize">
                      {boardMonthName}
                    </span>
                  </div>
                  <button
                    onClick={handleNextBoardMonth}
                    disabled={boardSelectedMonth === 'all'}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                    title="Bulan Berikutnya"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>

                {/* Quick Switch to Current Month */}
                {boardSelectedMonth !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      setBoardSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0"
                  >
                    Bulan Ini
                  </button>
                )}

                <button
                  onClick={() => {
                    if (boardSelectedMonth === 'all') {
                      const d = new Date();
                      setBoardSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    } else {
                      setBoardSelectedMonth('all');
                    }
                  }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    boardSelectedMonth === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {boardSelectedMonth === 'all' ? 'Mode Per Bulan' : 'Semua Periode'}
                </button>
              </div>

              {/* Right: Search, Project Filter & Total Stats */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[130px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  <input
                    type="text"
                    value={boardSearchQuery}
                    onChange={(e) => setBoardSearchQuery(e.target.value)}
                    placeholder="Cari task / ticket..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {boardSearchQuery && (
                    <button
                      onClick={() => setBoardSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </div>

                {/* Project Filter */}
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <select
                    value={boardFilterProject}
                    onChange={(e) => setBoardFilterProject(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[140px] truncate"
                  >
                    <option value="all">Semua Project</option>
                    {existingProjects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Summary Pill Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                    {filteredBoardTasks.length} <span className="text-[10px] font-normal text-slate-400">Task</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    {boardTotalHoursFormatted}
                  </span>
                </div>

              </div>

            </div>

            {/* Kanban Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-start">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus[col.id] || [];
              const totalColMinutes = colTasks.reduce(
                (sum, t) => sum + t.logs.reduce((lSum, l) => lSum + l.durationMinutes, 0),
                0
              );
              const colHoursFormatted = `${Math.floor(totalColMinutes / 60)}h ${totalColMinutes % 60}m`;

              return (
                <div 
                  key={col.id} 
                  className="bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800/80 flex flex-col h-[540px] sm:h-[620px] max-h-[calc(100vh-230px)] min-h-[380px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-extrabold text-sm ${col.color}`}>
                        {col.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                        {colTasks.length}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {colHoursFormatted}
                    </span>
                  </div>

                  {/* Task Cards - Internal Scroll with bounded height */}
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 sm:pr-1.5 custom-scrollbar min-h-0">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-400">
                        Belum ada task di kolom {col.title}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all group relative"
                        >
                          {/* Project & Ticket Badge */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.project && (
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold rounded-md flex items-center gap-1 truncate max-w-[140px]">
                                  <FiFolder size={9} className="shrink-0" />
                                  <span className="truncate">{task.project}</span>
                                </span>
                              )}
                              {task.ticketNumber && (
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-md shrink-0">
                                  #{task.ticketNumber}
                                </span>
                              )}
                              {task.taskUrl && (
                                <a
                                  href={task.taskUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold rounded-md flex items-center gap-0.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors shrink-0"
                                  title={task.taskUrl}
                                >
                                  <FiExternalLink size={9} />
                                  Link
                                </a>
                              )}
                            </div>

                            {/* Progress Label Badge */}
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              task.progress >= 100 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                                : task.progress >= 50 
                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {task.progress || 0}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.progress >= 100 ? 'bg-emerald-500' : task.progress >= 50 ? 'bg-indigo-600' : 'bg-slate-400'
                              }`}
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>

                          {/* Task Title & Description */}
                          <h4 
                            onClick={() => setDetailTaskId(task.id)}
                            className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1"
                          >
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                            {task.taskDescription}
                          </p>

                          {/* Tags */}
                          {task.tags && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.tags.split(',').map((tag, idx) => (
                                <span key={idx} className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold rounded">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer: Log Time Info & Actions */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs gap-2">
                            <div 
                              onClick={() => setDetailTaskId(task.id)}
                              className="flex items-center gap-1 font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer shrink-0"
                              title="Total jam & jumlah log"
                            >
                              <FiClock size={12} className="text-indigo-500" />
                              <span>{getTaskTotalHours(task)}</span>
                              <span className="text-[10px] text-slate-400">({task.logs.length})</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Edit Task Icon Button */}
                              <button
                                onClick={(e) => handleOpenEditTask(task, e)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Detail Task"
                              >
                                <FiEdit3 size={13} />
                              </button>

                              {/* Quick Move Status */}
                              <select
                                value={task.status || 'todo'}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                              </select>

                              {/* High-Contrast Quick Log Button */}
                              <button
                                onClick={() => handleOpenStepperForTask(task.id)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[11px] rounded-lg shadow-xs shadow-indigo-500/20 flex items-center gap-1 transition-all cursor-pointer"
                                title="Catat waktu untuk task ini"
                              >
                                <FiPlus size={13} className="stroke-[3]" />
                                <span>Log</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* VIEW 2: MONTHLY BAR CHART (Diagram Batang Per Bulan) */}
        {viewMode === 'chart' && (
          <MonthlyBarChart 
            tasks={tasks} 
            onSelectTask={(id) => setDetailTaskId(id)} 
            onAddLogForDay={(dateStr, taskId) => handleQuickLogTime(dateStr, taskId)}
          />
        )}

      </main>

      {/* STEP-BY-STEP FAST 1-CLICK POPUP MODAL */}
      <TimeLogStepperModal
        isOpen={isStepperOpen}
        onClose={() => {
          setIsStepperOpen(false);
          setStepperDate(null);
        }}
        tasks={tasks}
        initialTaskId={stepperTaskId}
        initialDate={stepperDate}
        currentUserEmail={currentUser?.email || 'developer@example.com'}
        onSaveLog={(taskId, logData) => addTimeLog(taskId, logData)}
        onCreateTaskAndLog={(taskData, logData) => {
          const newTaskId = addTask(
            taskData.title,
            taskData.description,
            taskData.project,
            taskData.tags,
            taskData.ticketNumber,
            'in_progress',
            25
          );
          addTimeLog(newTaskId, logData);
        }}
      />

      {/* CREATE NEW TASK MODAL */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FiLayers className="text-indigo-600" />
                Buat Task Baru
              </h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Name (Opsional)</label>
                <input
                  type="text"
                  list="new-task-project-suggestions"
                  placeholder="e.g. Website Redesign, Mobile App"
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="new-task-project-suggestions">
                  {existingProjects.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>

                {existingProjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 max-h-20 overflow-y-auto">
                    <span className="text-[11px] text-slate-400 font-medium">Pilih Project:</span>
                    {existingProjects.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskProject(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          newTaskProject === p
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  list="new-task-title-suggestions"
                  placeholder="e.g. Homepage layout work"
                  value={newTaskTitle}
                  onChange={(e) => handleSelectTitleForNew(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <datalist id="new-task-title-suggestions">
                  {suggestedTitlesForNew.map(title => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi pengerjaan..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Tiket / Task ID</label>
                  <input
                    type="text"
                    list="new-task-ticket-suggestions"
                    placeholder="e.g. 12345"
                    value={newTaskTicket}
                    onChange={(e) => handleSelectTicketForNew(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <datalist id="new-task-ticket-suggestions">
                    {suggestedTicketsForNew.map(({ ticket, title }) => (
                      <option key={ticket} value={ticket}>
                        {title}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Awal</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tags (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="Opsional (misal: frontend, bugfix)"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1"><FiLink size={12} className="text-cyan-600" /> Task URL (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://projects.teamwork.com/app/tasks/..."
                  value={newTaskUrl}
                  onChange={(e) => setNewTaskUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FiEdit3 className="text-indigo-600" />
                Edit Detail Task
              </h3>
              <button onClick={() => setEditingTask(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  list="edit-task-project-suggestions"
                  placeholder="e.g. Website Redesign"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <datalist id="edit-task-project-suggestions">
                  {existingProjects.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>

                {existingProjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 max-h-20 overflow-y-auto">
                    <span className="text-[11px] text-slate-400 font-medium">Pilih Project:</span>
                    {existingProjects.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditProject(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          editProject === p
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Homepage layout work"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi pengerjaan..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Tiket / Task ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 12345"
                    value={editTicket}
                    onChange={(e) => setEditTicket(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Progress Pengerjaan</label>
                  <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">{editProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tags</label>
                <input
                  type="text"
                  placeholder="Opsional (misal: frontend, bugfix)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1"><FiLink size={12} className="text-cyan-600" /> Task URL (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://projects.teamwork.com/app/tasks/..."
                  value={editTaskUrl}
                  onChange={(e) => setEditTaskUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attachments / Media Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <FiPaperclip size={12} className="text-indigo-500" /> Dokumentasi / Media
                </label>
                
                {editAttachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {editAttachments.map((url, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                        <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(url, 'edit')}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <FiX size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                  isUploading 
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-950'
                }`}>
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <FiUploadCloud size={16} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Klik untuk upload gambar / screenshot</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'edit')}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* TASK DETAILS / TIME LOG DRAWER */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold rounded-md">
                    {detailTask.project || 'General'}
                  </span>
                  {detailTask.ticketNumber && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black rounded-md">
                      #{detailTask.ticketNumber}
                    </span>
                  )}
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                    {detailTask.status} ({detailTask.progress}%)
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{detailTask.title}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{detailTask.taskDescription}</p>

                {detailTask.taskUrl && (
                  <a
                    href={detailTask.taskUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 text-xs font-bold rounded-lg border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors mb-2"
                  >
                    <FiExternalLink size={12} />
                    <span className="truncate max-w-[280px]">{detailTask.taskUrl}</span>
                  </a>
                )}
                
                {/* Progress Control */}
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-xs font-bold text-slate-500">Progress:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={detailTask.progress || 0}
                    onChange={(e) => updateTaskStatus(detailTask.id, detailTask.status, Number(e.target.value))}
                    className="w-48 accent-indigo-600"
                  />
                  <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {detailTask.progress || 0}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenStepperForTask(detailTask.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FiClock size={13} /> + Log
                </button>
                <button
                  onClick={() => {
                    if (confirm('Hapus task ini dan semua riwayat lognya?')) {
                      deleteTask(detailTask.id);
                      setDetailTaskId(null);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Hapus Task"
                >
                  <FiTrash2 size={16} />
                </button>
                <button onClick={() => setDetailTaskId(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Logs List in Detail */}
            <div className="p-6 flex-1 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/50">

              {/* Attachments Gallery */}
              {((detailTask.attachments && detailTask.attachments.length > 0) || true) && (
                <div className="mb-5">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <FiImage size={13} className="text-indigo-500" />
                    Dokumentasi / Lampiran
                    {detailTask.attachments && detailTask.attachments.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {detailTask.attachments.length}
                      </span>
                    )}
                  </h3>
                  
                  {detailTask.attachments && detailTask.attachments.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                      {detailTask.attachments.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Doc ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </a>
                          <button
                            onClick={() => handleRemoveAttachment(url, 'detail')}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <FiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                    isUploading 
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-900'
                  }`}>
                    {isUploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        <span className="text-xs font-bold text-indigo-600">Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <FiUploadCloud size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Upload dokumentasi / screenshot</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files, 'detail')}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              )}
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Riwayat Log Waktu ({detailTask.logs.length})</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  Total: {getTaskTotalHours(detailTask)}
                </span>
              </h3>

              {detailTask.logs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  Belum ada catatan waktu untuk task ini. Klik tombol <b>+ Log</b> di atas untuk mencatat.
                </div>
              ) : (
                detailTask.logs.map((log) => {
                  const isEditingThis = editingDetailLogId === log.id;

                  if (isEditingThis) {
                    return (
                      <div
                        key={log.id}
                        className="p-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border-2 border-indigo-500/60 dark:border-indigo-600/70 shadow-md space-y-3 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                            <FiEdit3 size={14} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Edit Log Waktu Ini</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelEditDetailLog}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                            title="Batal Edit"
                          >
                            <FiX size={15} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <FiCalendar size={12} className="text-indigo-500" />
                              Tanggal Log
                            </label>
                            <input
                              type="date"
                              value={detailEditLogDate}
                              onChange={(e) => setDetailEditLogDate(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center pt-2 sm:pt-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <input
                                type="checkbox"
                                checked={detailEditLogBillable}
                                onChange={(e) => setDetailEditLogBillable(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {detailEditLogBillable ? 'Billable (Yes)' : 'Non-billable (No)'}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Combined Manual Range Input */}
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <FiClock size={12} className="text-indigo-500" />
                              Input Cepat Rentang Jam
                            </label>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Auto-kalkulasi durasi</span>
                          </div>
                          <input
                            type="text"
                            value={detailEditLogTimeRange}
                            onChange={(e) => handleDetailEditTimeRangeChange(e.target.value)}
                            placeholder="misal: 08.30 - 10.00"
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* 3 Columns: Start Time, End Time, Duration */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              Jam Mulai
                            </label>
                            <input
                              type="text"
                              value={detailEditLogStartTime}
                              onChange={(e) => handleDetailEditStartTimeChange(e.target.value)}
                              placeholder="08.30"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              Jam Selesai
                            </label>
                            <input
                              type="text"
                              value={detailEditLogEndTime}
                              onChange={(e) => handleDetailEditEndTimeChange(e.target.value)}
                              placeholder="10.00"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                              Durasi
                            </label>
                            <input
                              type="text"
                              value={detailEditLogDuration}
                              onChange={(e) => handleDetailEditDurationChange(e.target.value)}
                              placeholder="1:30"
                              className="w-full px-2 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 rounded-xl font-mono text-center font-black text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Description textarea */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <FiFileText size={12} className="text-indigo-500" />
                            Deskripsi Log Pekerjaan
                          </label>
                          <textarea
                            value={detailEditLogDesc}
                            onChange={(e) => setDetailEditLogDesc(e.target.value)}
                            rows={2}
                            placeholder="Deskripsi pekerjaan yang dilakukan..."
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-medium"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                          <button
                            type="button"
                            onClick={handleCancelEditDetailLog}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveDetailLog(detailTask.id, log.id)}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <FiCheck size={13} />
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded flex items-center gap-1">
                            <FiCalendar size={10} />
                            {log.date}
                          </span>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {log.startTime} {log.endTime ? `- ${log.endTime}` : ''}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {log.durationString || `${Math.floor(log.durationMinutes / 60)}:${(log.durationMinutes % 60).toString().padStart(2, '0')}`}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${log.billable !== false ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>
                            {log.billable !== false ? 'Billable' : 'Non-billable'}
                          </span>
                          {log.person && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <FiUser size={10} /> {log.person}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {log.logDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditDetailLog(log)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit log waktu ini"
                        >
                          <FiEdit3 size={13} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTimeLog(detailTask.id, log.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Hapus log ini"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* EXPORT TEAMWORK CSV MODAL */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <FiDownload size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Export Teamwork CSV</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih rentang waktu untuk filter log time sebelum di-export</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExportOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Preset Rentang Waktu</label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetPreset('all')}
                    className={`px-2 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${!exportStartDate && !exportEndDate ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('today')}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('this_week')}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('this_month')}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('last_month')}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Bulan Lalu
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Dari Tanggal (Start Date)</label>
                  <input 
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Sampai Tanggal (End Date)</label>
                  <input 
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Person Email */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Email Pengguna (Person)</label>
                <input 
                  type="email"
                  value={exportPerson}
                  onChange={(e) => setExportPerson(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* CSV Preview Count */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiCheckCircle className="text-emerald-500" />
                    Data yang akan diexport:
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md">
                    {matchingLogsCount} Time Log(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Headers: Project, Task ID, Person, Date, Time Spent, Start Time, Description, Billable, Tags
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setIsExportOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleExecuteExport}
                disabled={matchingLogsCount === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FiDownload size={14} />
                Download CSV ({matchingLogsCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FiUploadCloud size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Import Data Time Log CSV</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Support format Teamwork All Time Report & Teamwork Import</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* File Input Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Pilih File CSV
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center hover:border-indigo-400 transition-colors bg-slate-50 dark:bg-slate-950/60">
                  <FiUploadCloud className="mx-auto text-3xl text-indigo-500 mb-2" />
                  <input 
                    type="file" 
                    accept=".csv,text/csv" 
                    id="csv-file-import-input"
                    onChange={handleImportFileChange}
                    className="hidden" 
                  />
                  <label 
                    htmlFor="csv-file-import-input"
                    className="cursor-pointer inline-block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 transition-colors"
                  >
                    {importFileName ? 'Ganti File CSV' : 'Pilih File .CSV'}
                  </label>
                  {importFileName && (
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 truncate">
                      📄 {importFileName}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format yang didukung: Teamwork All Time Report CSV / Standard CSV
                  </p>
                </div>
              </div>

              {/* Error Box */}
              {importError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <FiAlertCircle size={16} />
                  <span>{importError}</span>
                </div>
              )}

              {/* Loading Indicator */}
              {isImporting && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-3 animate-pulse">
                  <FiRefreshCw size={18} className="animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">Sedang mengimpor & menyimpan ke database Turso...</p>
                    <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300 mt-0.5">Mohon tunggu sebentar, data sedang disinkronkan.</p>
                  </div>
                </div>
              )}

              {/* Success Notification */}
              {isImportSuccess && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <FiCheckCircle size={18} className="text-emerald-500 shrink-0" />
                  <span>Berhasil mengimpor {importParsedResult?.tasks.length} task ({importParsedResult?.totalLogsCount} catatan waktu) ke database!</span>
                </div>
              )}

              {/* Parsed Summary Preview */}
              {importParsedResult && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Format Terdeteksi:</span>
                    <span className="text-[11px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold rounded">
                      {importParsedResult.formatDetected === 'teamwork_report' 
                        ? 'Teamwork All Time Report' 
                        : importParsedResult.formatDetected === 'scv_export'
                        ? 'SCV / TaskHub Export CSV'
                        : 'Teamwork Import / Generic'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Task:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{importParsedResult.tasks.length} Task</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Log Waktu:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{importParsedResult.totalLogsCount} Log Entri</span>
                    </div>
                  </div>

                  {/* Mode Option */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Metode Import:
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          disabled={isImporting}
                          className="text-indigo-600"
                        />
                        <span>Gabungkan dengan data yang ada (Merge & hindari duplikasi)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          disabled={isImporting}
                          className="text-indigo-600"
                        />
                        <span>Ganti semua data sekarang dengan data CSV ini (Replace All)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setIsImportOpen(false)}
                disabled={isImporting}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleExecuteImport}
                disabled={!importParsedResult || importParsedResult.tasks.length === 0 || isImportSuccess || isImporting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <FiRefreshCw size={14} className="animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : isImportSuccess ? (
                  <>
                    <FiCheck size={14} />
                    <span>Berhasil Diimpor!</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={14} />
                    <span>Proses Import ({importParsedResult?.totalLogsCount || 0} Logs)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

