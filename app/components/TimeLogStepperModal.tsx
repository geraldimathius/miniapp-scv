import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrackedTask, TimeLog } from '../lib/types/time-tracking';
import { 
  parseTimeToMinutes, 
  minutesToTimeString, 
  formatDurationFromMinutes, 
  parseDurationInputToMinutes, 
  parseTimeRangeString 
} from '../lib/time-utils';
import { FiX, FiCheck, FiArrowRight, FiArrowLeft, FiClock, FiFileText, FiTag, FiHash, FiCalendar } from 'react-icons/fi';

interface TimeLogStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TrackedTask[];
  initialTaskId?: string | null;
  initialDate?: string | null;
  currentUserEmail?: string;
  onSaveLog: (taskId: string, logData: Omit<TimeLog, 'id' | 'taskId'>) => void;
  onCreateTaskAndLog: (taskData: { title: string; description: string; ticketNumber?: string; project?: string; tags?: string }, logData: Omit<TimeLog, 'id' | 'taskId'>) => void;
}

export default function TimeLogStepperModal({
  isOpen,
  onClose,
  tasks,
  initialTaskId,
  initialDate,
  currentUserEmail = 'developer@example.com',
  onSaveLog,
  onCreateTaskAndLog,
}: TimeLogStepperModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Ticket / Task
  const [ticketNumber, setTicketNumber] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [projectName, setProjectName] = useState('');

  // Step 2: Description
  const [logDescription, setLogDescription] = useState('');

  // Step 3: Time Details (Manual inputs, no spinners)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [timeRangeInput, setTimeRangeInput] = useState('08:00 - 09:00');
  const [timeSpentManual, setTimeSpentManual] = useState('1:00'); // Manual HH:MM format
  const [billable, setBillable] = useState(true);
  const [tags, setTags] = useState('');

  // Find all existing time logs on the selected date across all tasks
  const existingLogsOnDate = useMemo(() => {
    const list: Array<{
      taskId: string;
      taskTitle: string;
      ticketNumber?: string;
      project?: string;
      log: TimeLog;
    }> = [];
    tasks.forEach(task => {
      task.logs.forEach(log => {
        if (log.date === date) {
          list.push({
            taskId: task.id,
            taskTitle: task.title,
            ticketNumber: task.ticketNumber,
            project: task.project,
            log
          });
        }
      });
    });

    // Sort chronologically by startTime
    return list.sort((a, b) => {
      const startA = parseTimeToMinutes(a.log.startTime) ?? 0;
      const startB = parseTimeToMinutes(b.log.startTime) ?? 0;
      return startA - startB;
    });
  }, [tasks, date]);

  const formattedSelectedDate = useMemo(() => {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return date;
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [date]);

  // Extract unique existing projects
  const existingProjects: string[] = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.project && t.project.trim()) {
        set.add(t.project.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Tasks filtered by selected project (if project is filled, otherwise all)
  const projectMatchedTasks = useMemo(() => {
    if (!projectName.trim()) return tasks;
    return tasks.filter(t => (t.project || '').toLowerCase().trim() === projectName.toLowerCase().trim());
  }, [tasks, projectName]);

  // Suggested Task Titles based on current project
  const suggestedTaskTitles: string[] = useMemo(() => {
    const set = new Set<string>();
    projectMatchedTasks.forEach(t => {
      if (t.title && t.title.trim()) {
        set.add(t.title.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projectMatchedTasks]);

  // Suggested Ticket Numbers based on current project
  const suggestedTicketNumbers: Array<{ ticket: string; title: string }> = useMemo(() => {
    const list: Array<{ ticket: string; title: string }> = [];
    const seen = new Set<string>();
    projectMatchedTasks.forEach(t => {
      if (t.ticketNumber && t.ticketNumber.trim() && !seen.has(t.ticketNumber.trim())) {
        seen.add(t.ticketNumber.trim());
        list.push({ ticket: t.ticketNumber.trim(), title: t.title });
      }
    });
    return list;
  }, [projectMatchedTasks]);

  // Auto-fill when Task Title is selected/changed
  const handleTaskTitleSelect = (titleStr: string) => {
    setTaskTitle(titleStr);
    const cleanTitle = titleStr.trim().toLowerCase();
    if (!cleanTitle) return;

    const matched = tasks.find(t => {
      const matchTitle = t.title.toLowerCase().trim() === cleanTitle;
      if (projectName.trim()) {
        return matchTitle && (t.project || '').toLowerCase().trim() === projectName.toLowerCase().trim();
      }
      return matchTitle;
    }) || tasks.find(t => t.title.toLowerCase().trim() === cleanTitle);

    if (matched) {
      setSelectedTaskId(matched.id);
      if (matched.ticketNumber) {
        setTicketNumber(matched.ticketNumber);
      }
      if (!projectName.trim() && matched.project) {
        setProjectName(matched.project);
      }
      if (matched.tags) setTags(matched.tags);
    }
  };

  // Auto-fill when Ticket Number is selected/changed
  const handleTicketSelect = (ticketStr: string) => {
    setTicketNumber(ticketStr);
    const cleanTicket = ticketStr.replace(/^#/, '').trim().toLowerCase();
    if (!cleanTicket) return;

    const matched = tasks.find(t => {
      const tNum = (t.ticketNumber || '').replace(/^#/, '').toLowerCase().trim();
      if (projectName.trim()) {
        return tNum === cleanTicket && (t.project || '').toLowerCase().trim() === projectName.toLowerCase().trim();
      }
      return tNum === cleanTicket;
    }) || tasks.find(t => (t.ticketNumber || '').replace(/^#/, '').toLowerCase().trim() === cleanTicket);

    if (matched) {
      setSelectedTaskId(matched.id);
      setTaskTitle(matched.title);
      if (!projectName.trim() && matched.project) {
        setProjectName(matched.project);
      }
      if (matched.tags) setTags(matched.tags);
    }
  };

  // Input refs for auto focus
  const step1InputRef = useRef<HTMLInputElement>(null);
  const step2InputRef = useRef<HTMLTextAreaElement>(null);
  const step3InputRef = useRef<HTMLInputElement>(null);

  // Reset and initialize when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTaskId) {
        const found = tasks.find(t => t.id === initialTaskId);
        if (found) {
          setSelectedTaskId(found.id);
          setTicketNumber(found.ticketNumber || '');
          setTaskTitle(found.title);
          setProjectName(found.project || '');
          setTags(found.tags || '');
        }
        // Direct to Step 2 (Description) because ticket/task is already known
        setStep(2);
      } else {
        setSelectedTaskId('');
        setTicketNumber('');
        setTaskTitle('');
        setProjectName('');
        setTags('');
        setStep(1);
      }
      setLogDescription('');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setStartTime('08:00');
      setEndTime('09:00');
      setTimeRangeInput('08:00 - 09:00');
      setTimeSpentManual('1:00');
      setBillable(true);

      setTimeout(() => {
        if (initialTaskId) {
          step2InputRef.current?.focus();
        } else {
          step1InputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, initialTaskId, initialDate, tasks]);

  // Focus next inputs on step change
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => step1InputRef.current?.focus(), 50);
    } else if (step === 2) {
      setTimeout(() => step2InputRef.current?.focus(), 50);
    } else if (step === 3) {
      setTimeout(() => step3InputRef.current?.focus(), 50);
    }
  }, [step]);

  // Helper to parse duration string (e.g. "2:30", "1.5", "45") to minutes
  const parseDurationStringToMinutes = (val: string): number => {
    if (!val) return 0;
    const trimmed = val.trim();
    if (trimmed.includes(':')) {
      const [h, m] = trimmed.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (num < 10 && trimmed.includes('.')) {
        return Math.round(num * 60); // 1.5 -> 90 mins
      }
      if (num >= 60) {
        return Math.round(num); // 120 -> 120 mins
      }
      return Math.round(num * 60); // 2 -> 120 mins
    }
    return 0;
  };

  // Calculate duration from Start & End manual inputs
  const calculateDurationMinutes = (): number => {
    const minsFromManual = parseDurationInputToMinutes(timeSpentManual);
    if (minsFromManual > 0) return minsFromManual;

    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      return diff;
    }
    return 60; // default 1 hour
  };

  // Handler when user edits Durasi Manual: Automatically updates End Time and Range Input!
  const handleDurationManualChange = (val: string) => {
    setTimeSpentManual(val);
    const durationMins = parseDurationInputToMinutes(val);
    if (durationMins > 0 && startTime) {
      const startMins = parseTimeToMinutes(startTime);
      if (startMins !== null) {
        const totalEndMins = (startMins + durationMins) % 1440;
        const newEnd = minutesToTimeString(totalEndMins);
        setEndTime(newEnd);
        setTimeRangeInput(`${startTime} - ${newEnd}`);
      }
    }
  };

  // Handler when user edits Start Time: Updates Duration and Range Input
  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const startMins = parseTimeToMinutes(val);
    const endMins = parseTimeToMinutes(endTime);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setTimeSpentManual(formatDurationFromMinutes(diff));
      setTimeRangeInput(`${val} - ${endTime}`);
    }
  };

  // Handler when user edits End Time: Updates Duration and Range Input
  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(val);
    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440;
      setTimeSpentManual(formatDurationFromMinutes(diff));
      setTimeRangeInput(`${startTime} - ${val}`);
    }
  };

  // Handler when user edits combined Range Input (e.g. "08.30 - 10.00" or "09:00 - 12:00")
  const handleTimeRangeChange = (val: string) => {
    setTimeRangeInput(val);
    const parsed = parseTimeRangeString(val);
    if (parsed) {
      setStartTime(parsed.startTime);
      setEndTime(parsed.endTime);
      setTimeSpentManual(parsed.durationString);
    }
  };

  // Keyboard Enter handlers
  const handleStep1Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketNumber.trim() && !taskTitle.trim() && !selectedTaskId) {
      setTicketNumber('12345');
      setTaskTitle('General Task');
    }
    setStep(2);
  };

  const handleStep2Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!logDescription.trim()) {
      alert('Silakan masukkan deskripsi pekerjaan.');
      return;
    }
    setStep(3);
  };

  const handleStep3Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const durationMins = calculateDurationMinutes();
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    const durationStr = `${h}h ${m}m`;

    const parsedStart = parseTimeToMinutes(startTime);
    const parsedEnd = parseTimeToMinutes(endTime);
    const finalStart = parsedStart !== null ? minutesToTimeString(parsedStart) : startTime;
    const finalEnd = parsedEnd !== null ? minutesToTimeString(parsedEnd) : endTime;

    const logPayload: Omit<TimeLog, 'id' | 'taskId'> = {
      date,
      startTime: finalStart,
      endTime: finalEnd,
      durationMinutes: durationMins,
      durationString: durationStr,
      logDescription: logDescription.trim(),
      person: currentUserEmail,
      billable,
      tags: tags.trim() || undefined,
    };

    if (selectedTaskId) {
      onSaveLog(selectedTaskId, logPayload);
    } else {
      // Create task on the fly
      onCreateTaskAndLog(
        {
          title: taskTitle.trim() || `Task #${ticketNumber || 'General'}`,
          description: logDescription.trim(),
          ticketNumber: ticketNumber.trim() || undefined,
          project: projectName.trim() || 'General',
          tags: tags.trim() || undefined,
        },
        logPayload
      );
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold shadow-xs">
              <FiClock size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Quick Log Time</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Tekan Enter untuk lanjut ke langkah berikutnya</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-5 pt-3 pb-2 shrink-0 border-b border-slate-50 dark:border-slate-800/50">
          <div className="flex items-center justify-between mb-1">
            <div className={`flex items-center gap-1.5 text-xs font-extrabold ${step === 1 ? 'text-indigo-600 dark:text-indigo-400' : step > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {step > 1 ? <FiCheck size={10} /> : '1'}
              </span>
              1. Tiket
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
            <div className={`flex items-center gap-1.5 text-xs font-extrabold ${step === 2 ? 'text-indigo-600 dark:text-indigo-400' : step > 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-indigo-600 text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {step > 2 ? <FiCheck size={10} /> : '2'}
              </span>
              2. Deskripsi
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step > 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
            <div className={`flex items-center gap-1.5 text-xs font-extrabold ${step === 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                3
              </span>
              3. Waktu
            </div>
          </div>
        </div>

        {/* Form Body - Scrollable so it never overflows or gets cut off */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          
          {/* STEP 1: Project, Task & Ticket */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              
              {/* 1. Project Name */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FiTag className="text-indigo-500" />
                  Project Name
                </label>
                <input
                  type="text"
                  list="stepper-project-suggestions"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Pilih atau ketik nama project (e.g. Website Redesign)"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <datalist id="stepper-project-suggestions">
                  {existingProjects.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>

                {existingProjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1 max-h-16 overflow-y-auto">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Project:</span>
                    {existingProjects.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProjectName(p)}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer ${
                          projectName === p
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Task Title & Ticket Number side by side with smart suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Task Title */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiFileText className="text-indigo-500" />
                    Task Title
                  </label>
                  <input
                    type="text"
                    list="stepper-task-title-suggestions"
                    value={taskTitle}
                    onChange={(e) => handleTaskTitleSelect(e.target.value)}
                    placeholder="e.g. Homepage layout work"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <datalist id="stepper-task-title-suggestions">
                    {suggestedTaskTitles.map(title => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </div>

                {/* Ticket Number / Task ID */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiHash className="text-indigo-500" />
                    Nomor Tiket / Task ID
                  </label>
                  <input
                    ref={step1InputRef}
                    type="text"
                    list="stepper-ticket-suggestions"
                    value={ticketNumber}
                    onChange={(e) => handleTicketSelect(e.target.value)}
                    placeholder="e.g. 12345 atau #TW-102"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <datalist id="stepper-ticket-suggestions">
                    {suggestedTicketNumbers.map(({ ticket, title }) => (
                      <option key={ticket} value={ticket}>
                        {title}
                      </option>
                    ))}
                  </datalist>
                </div>

              </div>

              {/* Quick Select Task Dropdown (filtered by project) */}
              {projectMatchedTasks.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Atau pilih langsung dari daftar task {projectName ? `project "${projectName}"` : 'yang sudah ada'}:
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setSelectedTaskId(selId);
                      const t = tasks.find(x => x.id === selId);
                      if (t) {
                        setTicketNumber(t.ticketNumber || '');
                        setTaskTitle(t.title);
                        setProjectName(t.project || projectName || 'General');
                        setTags(t.tags || '');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Buat Task Baru / Bebas --</option>
                    {projectMatchedTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.ticketNumber ? `[#${t.ticketNumber}] ` : ''}{t.title} ({t.project || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Enter ↵</kbd> untuk lanjut</span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  Lanjut ke Deskripsi <FiArrowRight />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Description */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FiFileText className="text-indigo-500" />
                  Deskripsi Pekerjaan (Log Description)
                </label>
                <textarea
                  ref={step2InputRef}
                  placeholder="Contoh: Homepage layout work, API integration login&#10;Shift+Enter untuk baris baru"
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleStep2Submit();
                    }
                  }}
                  rows={3}
                  className="w-full px-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-y min-h-[72px]"
                  autoFocus
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Tiket:</span> #{ticketNumber || 'General'} | <span className="font-bold text-slate-700 dark:text-slate-300">Project:</span> {projectName}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <FiArrowLeft /> Kembali
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  Lanjut ke Waktu <FiArrowRight />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Manual Time Inputs */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FiCalendar size={13} className="text-indigo-500" />
                  Tanggal Pengerjaan
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Existing Logs on Selected Date Inspector */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiClock className="text-indigo-500" />
                    Jadwal Terisi pada {formattedSelectedDate} ({existingLogsOnDate.length} log)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {existingLogsOnDate.length > 0 ? 'Cek slot jam kosong' : 'Belum ada jadwal'}
                  </span>
                </div>

                {existingLogsOnDate.length === 0 ? (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 font-medium">
                    <FiCheck size={13} />
                    <span>Seluruh jam pada tanggal ini masih kosong dan siap diisi.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {existingLogsOnDate.map(({ taskId, taskTitle, ticketNumber, project, log }) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {ticketNumber && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded font-mono shrink-0">
                                #{ticketNumber}
                              </span>
                            )}
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                              {taskTitle}
                            </span>
                            {project && (
                              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                                {project}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            {log.startTime} - {log.endTime || 'auto'} ({log.durationString || `${log.durationMinutes}m`})
                          </span>
                        </div>
                        {log.logDescription && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {log.logDescription}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Time, End Time & Duration */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                {/* Combined Manual Range Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FiClock className="text-indigo-500" />
                      Input Cepat Rentang Jam (Manual Range)
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Auto-sync jam & durasi</span>
                  </div>
                  <input
                    type="text"
                    placeholder="misal: 08.30 - 10.00 atau 09:00 - 11:30"
                    value={timeRangeInput}
                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Bisa pakai tanda titik (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-indigo-500">08.30</code>) atau titik dua (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-indigo-500">08:30</code>).
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Jam Mulai
                    </label>
                    <input
                      type="text"
                      placeholder="08.30"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Jam Selesai
                    </label>
                    <input
                      type="text"
                      placeholder="10.00"
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      Durasi (Jam:Mnt)
                    </label>
                    <input
                      ref={step3InputRef}
                      type="text"
                      placeholder="1:30"
                      value={timeSpentManual}
                      onChange={(e) => handleDurationManualChange(e.target.value)}
                      className="w-full bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center shadow-xs"
                    />
                  </div>
                </div>

                {/* Quick duration presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Durasi:</span>
                  {['0:15', '0:30', '1:00', '1:30', '2:00', '3:00', '4:00'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleDurationManualChange(dur)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition-colors"
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags & Billable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <FiTag size={12} /> Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional (misal: frontend, bugfix)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="inline-flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={billable}
                      onChange={(e) => setBillable(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {billable ? 'Billable (Yes)' : 'Non-billable (No)'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <FiArrowLeft /> Kembali
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <FiCheck size={14} /> Simpan Time Log
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
