'use client';

import React, { useState, useEffect } from 'react';

// Helpers
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function minutesToTime(totalMins: number): string {
  // Handle overflow if > 24 hours by just wrapping or let it be (for standard cases, < 24h)
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface TimeEntryFormProps {
  initialPerson?: string;
  defaultTags?: string;
  onSubmit: (data: {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    durationString: string;
    logDescription: string;
    person?: string;
    billable?: boolean;
    tags?: string;
  }) => void;
  onCancel?: () => void;
}

export default function TimeEntryForm({ initialPerson, defaultTags, onSubmit, onCancel }: TimeEntryFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logDescription, setLogDescription] = useState('');
  const [person, setPerson] = useState(initialPerson || '');
  const [billable, setBillable] = useState(true);
  const [tags, setTags] = useState(defaultTags || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  
  const [durHours, setDurHours] = useState(1);
  const [durMinutes, setDurMinutes] = useState(0);

  // Sync logic: Start + End changes -> Update Duration
  useEffect(() => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60; // if crosses midnight
    
    setDurHours(Math.floor(diff / 60));
    setDurMinutes(diff % 60);
  }, [startTime, endTime]);

  // Handle manual change of duration
  const handleDurationChange = (newHours: number, newMinutes: number) => {
    // Snap minutes to 0, 15, 30, 45 if possible, but let the user type if they want? 
    // The prompt says "jika user menekan tombol panah... bertambah/berkurang kelipatan 15"
    // So we'll handle the step in the input's onKeyDown.
    setDurHours(newHours);
    setDurMinutes(newMinutes);

    // Auto calculate End Time
    const startMins = timeToMinutes(startTime);
    const totalDurationMins = newHours * 60 + newMinutes;
    setEndTime(minutesToTime(startMins + totalDurationMins));
  };

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      let nextMin = durMinutes + 15;
      let nextHr = durHours;
      if (nextMin >= 60) {
        nextMin = nextMin % 60;
        nextHr += 1;
      }
      handleDurationChange(nextHr, nextMin);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let nextMin = durMinutes - 15;
      let nextHr = durHours;
      if (nextMin < 0) {
        if (nextHr > 0) {
          nextMin = 60 + nextMin;
          nextHr -= 1;
        } else {
          nextMin = 0;
        }
      }
      handleDurationChange(nextHr, nextMin);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDescription.trim()) {
      alert("Description is required");
      return;
    }
    const totalMins = durHours * 60 + durMinutes;
    onSubmit({
      date,
      startTime,
      endTime,
      durationMinutes: totalMins,
      durationString: `${durHours}h ${durMinutes}m`,
      logDescription,
      person: person.trim() || undefined,
      billable,
      tags: tags.trim() || undefined,
    });
    // Reset
    setLogDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Add Time Log</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Date</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Log Description</label>
          <input 
            type="text"
            value={logDescription}
            onChange={(e) => setLogDescription(e.target.value)}
            placeholder="e.g., Homepage layout work"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
          <input 
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
          <input 
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Duration (h : m)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input 
                type="number"
                min="0"
                value={durHours}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0, durMinutes)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">h</span>
            </div>
            <span className="font-bold text-slate-400">:</span>
            <div className="flex-1 relative">
              <input 
                type="number"
                min="0"
                max="59"
                value={durMinutes}
                onChange={(e) => handleDurationChange(durHours, parseInt(e.target.value) || 0)}
                onKeyDown={handleMinKeyDown}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">m</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Use Up/Down arrows to step by 15m</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tags</label>
          <input 
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Opsional (misal: frontend, bugfix)"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Person (Email)</label>
          <input 
            type="email"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder="e.g. alice@example.com"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Billable</label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {billable ? 'Yes (Billable)' : 'No (Non-billable)'}
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit"
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
        >
          Save Log
        </button>
      </div>
    </form>
  );
}

