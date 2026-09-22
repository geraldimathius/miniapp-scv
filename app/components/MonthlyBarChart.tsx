'use client';

import React, { useState, useMemo } from 'react';
import { TrackedTask, TimeLog } from '../lib/types/time-tracking';
import { useTimeTrackingStore } from '../lib/store/useTimeTrackingStore';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiCalendar, 
  FiClock, 
  FiDollarSign, 
  FiFolder, 
  FiFileText,
  FiTrendingUp,
  FiFilter,
  FiEdit3,
  FiTrash2,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiArrowRight,
  FiZap,
  FiPlus,
  FiCoffee
} from 'react-icons/fi';

import { 
  parseTimeToMinutes, 
  minutesToTimeString, 
  formatDurationFromMinutes, 
  parseDurationInputToMinutes, 
  parseTimeRangeString 
} from '../lib/time-utils';

interface MonthlyBarChartProps {
  tasks: TrackedTask[];
  onSelectTask?: (taskId: string) => void;
  onAddLogForDay?: (dateStr: string, taskId?: string) => void;
}

// Fallback helper for chart rendering
function timeToMinutes(timeStr?: string): number {
  const m = parseTimeToMinutes(timeStr);
  return m !== null ? m : 9 * 60;
}

function minutesToTime(mins: number): string {
  return minutesToTimeString(mins);
}

export default function MonthlyBarChart({ tasks, onSelectTask, onAddLogForDay }: MonthlyBarChartProps) {
  const { updateTimeLog, deleteTimeLog } = useTimeTrackingStore();

  // Current month initial state (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [hoveredDay, setHoveredDay] = useState<{
    dayNumber: number;
    dateStr: string;
    totalMinutes: number;
    logs: Array<{ task: TrackedTask; log: TimeLog }>;
  } | null>(null);

  // Day selected via clicking a bar in the chart
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  // Edit Log State (for full modal edit)
  const [editingLogItem, setEditingLogItem] = useState<{
    task: TrackedTask;
    log: TimeLog;
  } | null>(null);
  const [editLogDesc, setEditLogDesc] = useState('');
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogStartTime, setEditLogStartTime] = useState('');
  const [editLogEndTime, setEditLogEndTime] = useState('');
  const [editLogTimeRange, setEditLogTimeRange] = useState('');
  const [editLogDurationManual, setEditLogDurationManual] = useState('');
  const [editLogBillable, setEditLogBillable] = useState(true);
  const [editLogTags, setEditLogTags] = useState('');

  // Auto-Align & Break Time Configuration Modal State
  const [isAutoAlignModalOpen, setIsAutoAlignModalOpen] = useState(false);
  const [alignWorkStartTime, setAlignWorkStartTime] = useState('09:00');
  const [alignIncludeBreak, setAlignIncludeBreak] = useState(true);
  const [alignBreakStartTime, setAlignBreakStartTime] = useState('12:00');
  const [alignBreakEndTime, setAlignBreakEndTime] = useState('13:00');
  const [alignBreakRangeInput, setAlignBreakRangeInput] = useState('12:00 - 13:00');

  const [filterProject, setFilterProject] = useState<string>('all');

  // Parse Year and Month
  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m];
  }, [selectedMonth]);

  // Month navigation
  const handlePrevMonth = () => {
    let newM = monthNum - 1;
    let newY = yearNum;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
    setSelectedDayNumber(null);
  };

  const handleNextMonth = () => {
    let newM = monthNum + 1;
    let newY = yearNum;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
    setSelectedDayNumber(null);
  };

  const monthName = useMemo(() => {
    const d = new Date(yearNum, monthNum - 1, 1);
    return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  }, [yearNum, monthNum]);

  // Days in month
  const daysInMonth = useMemo(() => {
    return new Date(yearNum, monthNum, 0).getDate();
  }, [yearNum, monthNum]);

  // Flatten and filter logs for the selected month
  const monthlyLogs = useMemo(() => {
    const result: Array<{ task: TrackedTask; log: TimeLog }> = [];
    tasks.forEach(task => {
      task.logs.forEach(log => {
        if (log.date.startsWith(selectedMonth)) {
          if (filterProject === 'all' || (task.project || 'General') === filterProject) {
            result.push({ task, log });
          }
        }
      });
    });
    return result;
  }, [tasks, selectedMonth, filterProject]);

  // Unique projects in this month
  const projectsList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(task => {
      task.logs.forEach(log => {
        if (log.date.startsWith(selectedMonth)) {
          set.add(task.project || 'General');
        }
      });
    });
    return Array.from(set).sort();
  }, [tasks, selectedMonth]);

  // Total statistics for the month
  const totalMinutes = useMemo(() => {
    return monthlyLogs.reduce((acc, item) => acc + item.log.durationMinutes, 0);
  }, [monthlyLogs]);

  const billableMinutes = useMemo(() => {
    return monthlyLogs
      .filter(item => item.log.billable !== false)
      .reduce((acc, item) => acc + item.log.durationMinutes, 0);
  }, [monthlyLogs]);

  // Group by day of month (1 to daysInMonth)
  const dailyData = useMemo(() => {
    const data: Array<{
      dayNumber: number;
      dateStr: string;
      totalMinutes: number;
      hoursDecimal: number;
      isWeekend: boolean;
      logs: Array<{ task: TrackedTask; log: TimeLog }>;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const d = new Date(yearNum, monthNum - 1, day);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayLogs = monthlyLogs.filter(item => item.log.date === dateStr);
      const dayTotalMins = dayLogs.reduce((acc, item) => acc + item.log.durationMinutes, 0);

      data.push({
        dayNumber: day,
        dateStr,
        totalMinutes: dayTotalMins,
        hoursDecimal: +(dayTotalMins / 60).toFixed(1),
        isWeekend,
        logs: dayLogs
      });
    }
    return data;
  }, [daysInMonth, selectedMonth, yearNum, monthNum, monthlyLogs]);

  // Selected Day Data
  const selectedDayData = useMemo(() => {
    if (selectedDayNumber === null) return null;
    return dailyData.find(d => d.dayNumber === selectedDayNumber) || null;
  }, [dailyData, selectedDayNumber]);

  // Detect time collisions/overlaps on the selected day
  const dayConflicts = useMemo(() => {
    if (!selectedDayData || selectedDayData.logs.length <= 1) return {};

    const conflicts: Record<string, Array<{
      collidingLogId: string;
      collidingTaskTitle: string;
      collidingTicket?: string;
      collidingTime: string;
    }>> = {};

    const items = selectedDayData.logs.map(({ task, log }) => {
      const startMin = timeToMinutes(log.startTime || '09:00');
      let endMin = log.endTime ? timeToMinutes(log.endTime) : startMin + log.durationMinutes;
      if (endMin <= startMin) {
        endMin = startMin + (log.durationMinutes || 60);
      }
      return {
        taskId: task.id,
        taskTitle: task.title,
        ticketNumber: task.ticketNumber,
        logId: log.id,
        startTime: log.startTime || minutesToTime(startMin),
        endTime: log.endTime || minutesToTime(endMin),
        startMin,
        endMin
      };
    });

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];

        // Conflict condition: Interval A overlaps Interval B
        // startA < endB && endA > startB
        if (a.startMin < b.endMin && a.endMin > b.startMin) {
          if (!conflicts[a.logId]) conflicts[a.logId] = [];
          if (!conflicts[b.logId]) conflicts[b.logId] = [];

          conflicts[a.logId].push({
            collidingLogId: b.logId,
            collidingTaskTitle: b.taskTitle,
            collidingTicket: b.ticketNumber,
            collidingTime: `${b.startTime} - ${b.endTime}`
          });

          conflicts[b.logId].push({
            collidingLogId: a.logId,
            collidingTaskTitle: a.taskTitle,
            collidingTicket: a.ticketNumber,
            collidingTime: `${a.startTime} - ${a.endTime}`
          });
        }
      }
    }

    return conflicts;
  }, [selectedDayData]);

  const totalConflictsCount = useMemo(() => {
    return Object.keys(dayConflicts).length;
  }, [dayConflicts]);

  // Find max hours in a single day for scaling chart
  const maxDailyHours = useMemo(() => {
    const max = Math.max(...dailyData.map(d => d.hoursDecimal), 8); // at least 8h scale
    return Math.ceil(max);
  }, [dailyData]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyLogs.forEach(({ task, log }) => {
      const p = task.project || 'General';
      map[p] = (map[p] || 0) + log.durationMinutes;
    });
    return Object.entries(map)
      .map(([name, mins]) => ({
        name,
        minutes: mins,
        hours: (mins / 60).toFixed(1),
        percentage: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [monthlyLogs, totalMinutes]);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  // Open Log Editor Modal
  const handleOpenEditLog = (task: TrackedTask, log: TimeLog, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLogItem({ task, log });
    setEditLogDesc(log.logDescription);
    setEditLogDate(log.date);
    const start = log.startTime || '08:00';
    const end = log.endTime || '09:00';
    setEditLogStartTime(start);
    setEditLogEndTime(end);
    setEditLogTimeRange(`${start} - ${end}`);
    setEditLogDurationManual(log.durationString || '1:00');
    setEditLogBillable(log.billable !== false);
    setEditLogTags(log.tags || '');
  };

  // Direct Inline Edit of Start Time for a day log (Updates Duration)
  const handleInlineStartTime = (taskId: string, log: TimeLog, newStart: string) => {
    const startMins = parseTimeToMinutes(newStart);
    const endMins = parseTimeToMinutes(log.endTime || '10:00');
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      updateTimeLog(taskId, log.id, {
        startTime: newStart,
        durationMinutes: diff,
        durationString: formatDurationFromMinutes(diff)
      });
    } else {
      updateTimeLog(taskId, log.id, {
        startTime: newStart
      });
    }
  };

  // Direct Inline Edit of End Time for a day log (Updates Duration)
  const handleInlineEndTime = (taskId: string, log: TimeLog, newEnd: string) => {
    const startMins = parseTimeToMinutes(log.startTime || '09:00');
    const endMins = parseTimeToMinutes(newEnd);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      updateTimeLog(taskId, log.id, {
        endTime: newEnd,
        durationMinutes: diff,
        durationString: formatDurationFromMinutes(diff)
      });
    } else {
      updateTimeLog(taskId, log.id, {
        endTime: newEnd
      });
    }
  };

  // Direct Inline Edit of Duration for a day log
  const handleInlineDuration = (taskId: string, log: TimeLog, newDurStr: string) => {
    const durationMins = parseDurationInputToMinutes(newDurStr);
    if (durationMins > 0) {
      const startMins = parseTimeToMinutes(log.startTime || '09:00') ?? (9 * 60);
      const endMins = (startMins + durationMins) % 1440;
      const newEnd = minutesToTimeString(endMins);

      updateTimeLog(taskId, log.id, {
        endTime: newEnd,
        durationMinutes: durationMins,
        durationString: formatDurationFromMinutes(durationMins)
      });
    } else {
      updateTimeLog(taskId, log.id, {
        durationString: newDurStr
      });
    }
  };

  // Direct Inline Edit of Combined Range for a day log (e.g. "08.30 - 10.00")
  const handleInlineTimeRange = (taskId: string, log: TimeLog, rangeStr: string) => {
    const parsed = parseTimeRangeString(rangeStr);
    if (parsed) {
      updateTimeLog(taskId, log.id, {
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        durationMinutes: parsed.durationMinutes,
        durationString: parsed.durationString
      });
    }
  };

  // Quick Nudge Time by Minutes (+15m, -15m, etc.)
  const handleNudgeTime = (taskId: string, log: TimeLog, deltaMins: number) => {
    const currentStartMins = parseTimeToMinutes(log.startTime || '09:00') ?? (9 * 60);
    const startMins = currentStartMins + deltaMins;
    const durationMins = log.durationMinutes || 60;
    const endMins = startMins + durationMins;

    updateTimeLog(taskId, log.id, {
      startTime: minutesToTimeString(startMins),
      endTime: minutesToTimeString(endMins)
    });
  };

  // Handlers for Break Time in Auto-Align Modal
  const handleAlignBreakRangeChange = (val: string) => {
    setAlignBreakRangeInput(val);
    const parsed = parseTimeRangeString(val);
    if (parsed) {
      setAlignBreakStartTime(parsed.startTime);
      setAlignBreakEndTime(parsed.endTime);
    }
  };

  const handleAlignBreakStartChange = (val: string) => {
    setAlignBreakStartTime(val);
    setAlignBreakRangeInput(`${val} - ${alignBreakEndTime}`);
  };

  const handleAlignBreakEndChange = (val: string) => {
    setAlignBreakEndTime(val);
    setAlignBreakRangeInput(`${alignBreakStartTime} - ${val}`);
  };

  // Auto-align schedule sequentially with optional break time window
  const handleExecuteAutoAlign = () => {
    if (!selectedDayData || selectedDayData.logs.length === 0) return;

    const parsedStart = parseTimeToMinutes(alignWorkStartTime);
    let currentStartMin = parsedStart !== null ? parsedStart : 9 * 60;

    let breakStartMin: number | null = null;
    let breakEndMin: number | null = null;

    if (alignIncludeBreak) {
      const bStart = parseTimeToMinutes(alignBreakStartTime);
      const bEnd = parseTimeToMinutes(alignBreakEndTime);
      if (bStart !== null && bEnd !== null && bEnd > bStart) {
        breakStartMin = bStart;
        breakEndMin = bEnd;
      }
    }

    selectedDayData.logs.forEach(({ task, log }) => {
      const dur = log.durationMinutes || 60;

      // If we have a break time configured
      if (breakStartMin !== null && breakEndMin !== null) {
        // If current start is inside break time, skip to end of break
        if (currentStartMin >= breakStartMin && currentStartMin < breakEndMin) {
          currentStartMin = breakEndMin;
        }
        // If task starts before break but overflows into break, shift task after break
        else if (currentStartMin < breakStartMin && (currentStartMin + dur) > breakStartMin) {
          currentStartMin = breakEndMin;
        }
      }

      const startStr = minutesToTimeString(currentStartMin);
      const endMin = currentStartMin + dur;
      const endStr = minutesToTimeString(endMin);

      updateTimeLog(task.id, log.id, {
        startTime: startStr,
        endTime: endStr
      });

      // Advance start time for next log
      currentStartMin = endMin;

      // If next start falls directly into break time, skip to end of break
      if (breakStartMin !== null && breakEndMin !== null) {
        if (currentStartMin >= breakStartMin && currentStartMin < breakEndMin) {
          currentStartMin = breakEndMin;
        }
      }
    });

    setIsAutoAlignModalOpen(false);
  };

  // Handler for duration manual edit in Edit Log modal
  const handleEditDurationChange = (val: string) => {
    setEditLogDurationManual(val);
    const durationMins = parseDurationInputToMinutes(val);
    if (durationMins > 0 && editLogStartTime) {
      const startMins = parseTimeToMinutes(editLogStartTime);
      if (startMins !== null) {
        const totalEndMins = (startMins + durationMins) % 1440;
        const newEnd = minutesToTimeString(totalEndMins);
        setEditLogEndTime(newEnd);
        setEditLogTimeRange(`${editLogStartTime} - ${newEnd}`);
      }
    }
  };

  const handleEditStartTimeChange = (val: string) => {
    setEditLogStartTime(val);
    const startMins = parseTimeToMinutes(val);
    const endMins = parseTimeToMinutes(editLogEndTime);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setEditLogDurationManual(formatDurationFromMinutes(diff));
      setEditLogTimeRange(`${val} - ${editLogEndTime}`);
    }
  };

  const handleEditEndTimeChange = (val: string) => {
    setEditLogEndTime(val);
    const startMins = parseTimeToMinutes(editLogStartTime);
    const endMins = parseTimeToMinutes(val);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setEditLogDurationManual(formatDurationFromMinutes(diff));
      setEditLogTimeRange(`${editLogStartTime} - ${val}`);
    }
  };

  const handleEditTimeRangeChange = (val: string) => {
    setEditLogTimeRange(val);
    const parsed = parseTimeRangeString(val);
    if (parsed) {
      setEditLogStartTime(parsed.startTime);
      setEditLogEndTime(parsed.endTime);
      setEditLogDurationManual(parsed.durationString);
    }
  };

  // Save edited log from modal
  const handleSaveEditedLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogItem) return;

    const startMins = parseTimeToMinutes(editLogStartTime);
    const endMins = parseTimeToMinutes(editLogEndTime);
    let durationMins = parseDurationInputToMinutes(editLogDurationManual);

    if (durationMins <= 0 && startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      durationMins = diff;
    }
    if (durationMins <= 0) durationMins = 60;

    const finalStart = startMins !== null ? minutesToTimeString(startMins) : editLogStartTime;
    const finalEnd = endMins !== null ? minutesToTimeString(endMins) : editLogEndTime;
    const finalDurationStr = formatDurationFromMinutes(durationMins);

    updateTimeLog(editingLogItem.task.id, editingLogItem.log.id, {
      logDescription: editLogDesc.trim() || 'Work logged',
      date: editLogDate,
      startTime: finalStart,
      endTime: finalEnd,
      durationString: finalDurationStr,
      durationMinutes: durationMins,
      billable: editLogBillable,
      tags: editLogTags.trim() || undefined
    });

    setEditingLogItem(null);
  };

  // Delete Log
  const handleDeleteLog = (taskId: string, logId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus catatan log waktu ini?')) {
      deleteTimeLog(taskId, logId);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Month Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FiTrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">
              {monthName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analisis & Diagram Batang Log Waktu Developer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <FiFilter className="text-slate-400" />
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                setSelectedDayNumber(null);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Semua Project</option>
              {projectsList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-28 text-center capitalize">
              {new Date(yearNum, monthNum - 1).toLocaleString('id-ID', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Waktu</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FiClock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatHours(totalMinutes)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {(totalMinutes / 60).toFixed(1)} jam di bulan ini
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Billable Hours</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FiDollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatHours(billableMinutes)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0}% rasio billable
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Log Entri</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FiFileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {monthlyLogs.length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            Catatan aktivitas waktu
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Project Terbanyak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiFolder size={16} />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
            {projectBreakdown[0]?.name || '-'}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {projectBreakdown[0] ? `${projectBreakdown[0].hours} jam (${projectBreakdown[0].percentage}%)` : 'Belum ada data'}
          </p>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-indigo-500" />
              Diagram Batang Harian ({monthName})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klik pada batang tanggal untuk melihat dan mengedit semua jadwal task hari tersebut (deteksi waktu tabrakan).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-600" />
              <span className="text-slate-600 dark:text-slate-300 font-semibold">Hari Kerja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-200 dark:bg-slate-800" />
              <span className="text-slate-600 dark:text-slate-300 font-semibold">Weekend / Kosong</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="relative h-64 pt-6 pb-4">
          {/* Background Grid Lines */}
          <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full flex items-center justify-end pr-1">
              <span className="text-[9px] text-slate-400 font-mono -mt-3">{maxDailyHours}h</span>
            </div>
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full flex items-center justify-end pr-1">
              <span className="text-[9px] text-slate-400 font-mono -mt-3">{(maxDailyHours * 0.75).toFixed(0)}h</span>
            </div>
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full flex items-center justify-end pr-1">
              <span className="text-[9px] text-slate-400 font-mono -mt-3">{(maxDailyHours * 0.5).toFixed(0)}h</span>
            </div>
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full flex items-center justify-end pr-1">
              <span className="text-[9px] text-slate-400 font-mono -mt-3">{(maxDailyHours * 0.25).toFixed(0)}h</span>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-800 w-full flex items-center justify-end pr-1">
              <span className="text-[9px] text-slate-400 font-mono -mt-3">0h</span>
            </div>
          </div>

          {/* Bar Columns */}
          <div className="relative h-full flex items-end justify-between gap-0.5 sm:gap-1 z-10 px-2">
            {dailyData.map((item) => {
              const heightPercent = maxDailyHours > 0 ? (item.hoursDecimal / maxDailyHours) * 100 : 0;
              const isSelected = selectedDayNumber === item.dayNumber;
              const hasLogs = item.logs.length > 0;

              return (
                <div
                  key={item.dayNumber}
                  onClick={() => setSelectedDayNumber(prev => prev === item.dayNumber ? null : item.dayNumber)}
                  onMouseEnter={() => setHoveredDay(item)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer relative flex-1 min-w-0"
                >
                  {/* Tooltip on Hover */}
                  {hoveredDay?.dayNumber === item.dayNumber && !isSelected && (
                    <div className="absolute bottom-full mb-3 z-30 bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs w-52 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="font-extrabold border-b border-slate-700 pb-1 mb-1.5 flex justify-between">
                        <span>{item.dayNumber} {new Date(yearNum, monthNum - 1).toLocaleString('id-ID', { month: 'short' })}</span>
                        <span className="text-emerald-400 font-black">{item.hoursDecimal} Jam</span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-semibold mb-1">
                        {item.logs.length} catatan log • Klik untuk kelola waktu
                      </div>
                      {item.logs.length === 0 ? (
                        <p className="text-[11px] text-slate-400">Tidak ada log waktu.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {item.logs.map(({ task, log }) => (
                            <div key={log.id} className="text-[11px] bg-slate-800/80 dark:bg-slate-700/80 p-1.5 rounded">
                              <div className="font-bold truncate text-slate-200">{task.title}</div>
                              <div className="flex justify-between text-slate-400 text-[10px] mt-0.5">
                                <span>{log.startTime}-{log.endTime || 'auto'}</span>
                                <span className="font-mono text-indigo-300 font-bold">{log.durationString}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Uniform Bar Container */}
                  <div className="w-full flex-1 flex items-end justify-center min-h-0">
                    <div
                      style={{ height: `${Math.max(hasLogs ? heightPercent : 4, 4)}%` }}
                      className={`w-full max-w-[14px] sm:max-w-[20px] md:max-w-[24px] rounded-t-sm sm:rounded-t-md transition-all duration-200 ${
                        isSelected
                          ? 'bg-indigo-500 ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 shadow-lg scale-110 z-20'
                          : hasLogs
                          ? 'bg-indigo-600 group-hover:bg-indigo-500 shadow-sm'
                          : item.isWeekend
                          ? 'bg-slate-200/50 dark:bg-slate-800/40'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[10px] font-bold mt-2 w-full text-center truncate select-none ${
                    isSelected 
                      ? 'text-indigo-600 dark:text-indigo-400 font-black scale-110' 
                      : item.isWeekend 
                      ? 'text-rose-500 dark:text-rose-400' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Interactive Multi-task & Conflict Inspector Panel */}
        {selectedDayData && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-indigo-600/30">
                  {selectedDayData.dayNumber}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    Jadwal Log Tanggal {new Date(yearNum, monthNum - 1, selectedDayData.dayNumber).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono rounded-full font-black">
                      {formatHours(selectedDayData.totalMinutes)} ({selectedDayData.hoursDecimal} Jam)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>Edit jam mulai, selesai, dan durasi secara langsung di bawah ini untuk memperbaiki waktu yang tabrakan.</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAddLogForDay && onAddLogForDay(selectedDayData.dateStr)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Tambah log waktu baru pada tanggal ini"
                >
                  <FiPlus size={14} className="stroke-[3]" />
                  <span>+ Log Time</span>
                </button>

                {selectedDayData.logs.length > 1 && (
                  <button
                    onClick={() => setIsAutoAlignModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                    title="Atur jam berurutan & kosongkan jam istirahat"
                  >
                    <FiZap size={14} className="text-amber-500" />
                    <span>Auto-susun Jam (Urutkan)</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedDayNumber(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Rincian Hari"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Overlap / Collision Warning Banner */}
            {totalConflictsCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-bold animate-in fade-in">
                <FiAlertTriangle className="text-amber-500 shrink-0 text-base" />
                <div>
                  <span className="font-extrabold">Perhatian:</span> Ada {totalConflictsCount} entri waktu yang bertabrakan (overlapping) pada hari ini. Silakan sesuaikan jam mulai / selesai pada kartu di bawah.
                </div>
              </div>
            )}

            {selectedDayData.logs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 space-y-2.5">
                <p>Tidak ada log waktu tercatat pada tanggal ini.</p>
                <button
                  onClick={() => onAddLogForDay && onAddLogForDay(selectedDayData.dateStr)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FiPlus size={14} className="stroke-[3]" />
                  <span>+ Catat Log di Tanggal Ini</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedDayData.logs.map(({ task, log }) => {
                  const conflicts = dayConflicts[log.id];
                  const hasConflict = conflicts && conflicts.length > 0;

                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between gap-3 ${
                        hasConflict
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-400/50'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Card Top Badges & Actions */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.ticketNumber && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded font-mono">
                                #{task.ticketNumber}
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                              {task.project || 'General'}
                            </span>
                            {log.billable !== false ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded">
                                Billable
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                                Non-Billable
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onAddLogForDay && onAddLogForDay(selectedDayData.dateStr, task.id)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                              title="Tambah log waktu lagi untuk task ini"
                            >
                              <FiPlus size={14} />
                              <span className="hidden sm:inline">+ Log</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenEditLog(task, log, e)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                              title="Edit Lengkap Log Waktu Ini"
                            >
                              <FiEdit3 size={14} />
                              <span className="hidden sm:inline">Edit Detail</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteLog(task.id, log.id, e)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Log Waktu"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Task Title */}
                        <h5 
                          onClick={() => onSelectTask && onSelectTask(task.id)}
                          className="text-xs font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors line-clamp-1 mb-1"
                        >
                          {task.title}
                        </h5>

                        {/* Conflict Warning Badge on Task Card */}
                        {hasConflict && (
                          <div className="mb-2 p-2 bg-rose-100/90 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                            <FiAlertTriangle className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span>Waktu tabrakan dengan:</span>
                              {conflicts.map(c => (
                                <div key={c.collidingLogId} className="font-semibold text-[10px] text-rose-800 dark:text-rose-200">
                                  • {c.collidingTicket ? `[#${c.collidingTicket}] ` : ''}{c.collidingTaskTitle} ({c.collidingTime})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description field */}
                        <div className="mb-3">
                          <textarea
                            value={log.logDescription}
                            onChange={(e) => {
                              updateTimeLog(task.id, log.id, {
                                logDescription: e.target.value
                              });
                            }}
                            rows={2}
                            placeholder="Deskripsi pekerjaan..."
                            className="w-full text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                          />
                        </div>
                      </div>

                      {/* DIRECT TIME INPUT CONTROLS (Rentang Jam Manual, Jam Mulai, Jam Selesai, Durasi, Quick Nudge) */}
                      <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
                        {/* Quick Combined Manual Range Input */}
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                            Rentang Jam:
                          </label>
                          <input
                            type="text"
                            defaultValue={`${log.startTime || '09:00'} - ${log.endTime || '10:00'}`}
                            key={`${log.id}-${log.startTime}-${log.endTime}`}
                            onBlur={(e) => handleInlineTimeRange(task.id, log, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineTimeRange(task.id, log, e.currentTarget.value);
                              }
                            }}
                            placeholder="08.30 - 10.00"
                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            title="Ketik misal 08.30 - 10.00 lalu tekan Enter"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              Jam Mulai
                            </label>
                            <input
                              type="text"
                              value={log.startTime || '09:00'}
                              onChange={(e) => handleInlineStartTime(task.id, log, e.target.value)}
                              placeholder="08.30"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                              Jam Selesai
                            </label>
                            <input
                              type="text"
                              value={log.endTime || '10:00'}
                              onChange={(e) => handleInlineEndTime(task.id, log, e.target.value)}
                              placeholder="10.00"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                              Durasi
                            </label>
                            <input
                              type="text"
                              value={log.durationString || '1:00'}
                              onChange={(e) => handleInlineDuration(task.id, log, e.target.value)}
                              placeholder="1:30"
                              className="w-full bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1.5 text-xs font-mono font-black text-center text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Quick Time Nudge & Duration buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium">Geser Jam:</span>
                            <button
                              type="button"
                              onClick={() => handleNudgeTime(task.id, log, -30)}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 rounded text-slate-600 dark:text-slate-300 font-mono font-bold"
                              title="Mundurkan 30 Menit"
                            >
                              -30m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgeTime(task.id, log, -15)}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 rounded text-slate-600 dark:text-slate-300 font-mono font-bold"
                              title="Mundurkan 15 Menit"
                            >
                              -15m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgeTime(task.id, log, +15)}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 rounded text-slate-600 dark:text-slate-300 font-mono font-bold"
                              title="Majukan 15 Menit"
                            >
                              +15m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgeTime(task.id, log, +30)}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 rounded text-slate-600 dark:text-slate-300 font-mono font-bold"
                              title="Majukan 30 Menit"
                            >
                              +30m
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {['0:30', '1:00', '2:00'].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleInlineDuration(task.id, log, d)}
                                className={`px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                                  log.durationString === d
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Breakdown Progress Bars & List of Month Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-1">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <FiFolder className="text-indigo-500" />
            Distribusi Project ({monthName})
          </h3>
          {projectBreakdown.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada log waktu di bulan ini.
            </div>
          ) : (
            <div className="space-y-4">
              {projectBreakdown.map((item, idx) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200 truncate pr-2">{item.name}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">{item.hours}h ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-indigo-600' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List of Month Logs */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FiFileText className="text-indigo-500" />
              Daftar Log Waktu Bulan Ini ({monthlyLogs.length})
            </h3>
          </div>

          <div className="flex-1 max-h-96 overflow-y-auto space-y-2 pr-1">
            {monthlyLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Tidak ada log waktu ditemukan untuk {monthName}.
              </div>
            ) : (
              monthlyLogs.map(({ task, log }) => (
                <div 
                  key={log.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-indigo-400 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">
                        {log.date}
                      </span>
                      {task.ticketNumber && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded">
                          #{task.ticketNumber}
                        </span>
                      )}
                      <span 
                        onClick={() => onSelectTask && onSelectTask(task.id)}
                        className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {task.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {log.logDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                        {log.durationString}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {log.startTime} - {log.endTime || 'auto'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onAddLogForDay && onAddLogForDay(log.date, task.id)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                        title="Tambah log waktu untuk task ini di tanggal ini"
                      >
                        <FiPlus size={15} />
                      </button>
                      <button
                        onClick={(e) => handleOpenEditLog(task, log, e)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                        title="Edit Log Waktu"
                      >
                        <FiEdit3 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Edit Log Modal (Clean manual inputs, no slider) */}
      {editingLogItem && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FiEdit3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Edit Catatan Log Waktu
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Task: {editingLogItem.task.title} {editingLogItem.task.ticketNumber ? `(#${editingLogItem.task.ticketNumber})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingLogItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLog} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Log Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Pekerjaan
                </label>
                <textarea
                  rows={3}
                  value={editLogDesc}
                  onChange={(e) => setEditLogDesc(e.target.value)}
                  placeholder="Deskripsi pekerjaan yang dilakukan..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Log
                </label>
                <input
                  type="date"
                  value={editLogDate}
                  onChange={(e) => setEditLogDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Combined Range Input & Time fields */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FiClock className="text-indigo-500" />
                      Rentang Jam Manual
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Auto-kalkulasi durasi</span>
                  </div>
                  <input
                    type="text"
                    value={editLogTimeRange}
                    onChange={(e) => handleEditTimeRangeChange(e.target.value)}
                    placeholder="misal: 08.30 - 10.00 atau 09:00 - 11:30"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Bisa format titik (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-indigo-500">08.30</code>) atau titik dua (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-indigo-500">08:30</code>).
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={editLogStartTime}
                      onChange={(e) => handleEditStartTimeChange(e.target.value)}
                      placeholder="08.30"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={editLogEndTime}
                      onChange={(e) => handleEditEndTimeChange(e.target.value)}
                      placeholder="10.00"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      Durasi (Jam:Mnt)
                    </label>
                    <input
                      type="text"
                      value={editLogDurationManual}
                      onChange={(e) => handleEditDurationChange(e.target.value)}
                      placeholder="1:30"
                      className="w-full px-3 py-2 text-sm bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tags & Billable */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editLogTags}
                    onChange={(e) => setEditLogTags(e.target.value)}
                    placeholder="design, frontend"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editLogBillable}
                      onChange={(e) => setEditLogBillable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Billable Hours
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLogItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <FiCheck size={14} />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Align Schedule Modal with Break Time Option */}
      {isAutoAlignModalOpen && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-amber-50/50 dark:from-indigo-950/40 dark:to-amber-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <FiZap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Auto-susun Jam Kerja
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Urutkan {selectedDayData.logs.length} log waktu tanpa bentrok ({selectedDayData.dateStr})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoAlignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Jam Mulai Hari */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FiClock size={12} />
                  <span>Jam Mulai Kerja</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={alignWorkStartTime}
                    onChange={(e) => setAlignWorkStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-28 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 text-center"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {['08:00', '08:30', '09:00', '09:30'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAlignWorkStartTime(preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          alignWorkStartTime === preset
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggle Jam Istirahat */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      <FiCoffee size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Kosongkan Jam Istirahat
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Task tidak akan dijadwalkan pada jam istirahat
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={alignIncludeBreak}
                    onChange={(e) => setAlignIncludeBreak(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                </label>

                {/* Break Time Inputs if Active */}
                {alignIncludeBreak && (
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Input Rentang Istirahat (contoh: 12.00 - 13.00)
                      </label>
                      <input
                        type="text"
                        value={alignBreakRangeInput}
                        onChange={(e) => handleAlignBreakRangeChange(e.target.value)}
                        placeholder="12:00 - 13:00"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Mulai Istirahat
                        </label>
                        <input
                          type="text"
                          value={alignBreakStartTime}
                          onChange={(e) => handleAlignBreakStartChange(e.target.value)}
                          placeholder="12:00"
                          className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Selesai Istirahat
                        </label>
                        <input
                          type="text"
                          value={alignBreakEndTime}
                          onChange={(e) => handleAlignBreakEndChange(e.target.value)}
                          placeholder="13:00"
                          className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 text-center"
                        />
                      </div>
                    </div>

                    {/* Quick Presets for Break Time */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Preset:</span>
                      {[
                        { label: '12:00 - 13:00', start: '12:00', end: '13:00' },
                        { label: "11:30 - 13:00 (Jum'at)", start: '11:30', end: '13:00' },
                        { label: '12:00 - 12:30 (30m)', start: '12:00', end: '12:30' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setAlignBreakStartTime(item.start);
                            setAlignBreakEndTime(item.end);
                            setAlignBreakRangeInput(`${item.start} - ${item.end}`);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                            alignBreakStartTime === item.start && alignBreakEndTime === item.end
                              ? 'bg-amber-500 text-white border-amber-500 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAutoAlignModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAutoAlign}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <FiZap size={14} className="text-amber-300" />
                <span>Terapkan Auto-susun</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
