'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface TimeRangeSliderProps {
  startTime?: string; // "HH:mm" e.g. "08:00"
  endTime?: string;   // "HH:mm" e.g. "09:00"
  onChange: (startTime: string, endTime: string, durationString: string, durationMinutes: number) => void;
  stepMinutes?: number; // default 15
  compact?: boolean;
  showPresets?: boolean;
}

export default function TimeRangeSlider({
  startTime = '08:00',
  endTime = '09:00',
  onChange,
  stepMinutes = 15,
  compact = false,
  showPresets = true,
}: TimeRangeSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | 'bar' | null>(null);

  const dragStartData = useRef<{
    initialX: number;
    initialStartMins: number;
    initialEndMins: number;
  }>({ initialX: 0, initialStartMins: 0, initialEndMins: 0 });

  // Convert "HH:mm" to minutes (0 - 1440)
  const timeToMinutes = useCallback((tStr: string, defaultVal: number = 0): number => {
    if (!tStr) return defaultVal;
    const [h, m] = tStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return defaultVal;
    return Math.max(0, Math.min(1440, h * 60 + m));
  }, []);

  // Convert minutes (0 - 1440) to "HH:mm"
  const minutesToTime = useCallback((mins: number): string => {
    const clamped = Math.max(0, Math.min(1440, Math.round(mins / stepMinutes) * stepMinutes));
    const h = Math.floor(clamped / 60) % 24;
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [stepMinutes]);

  const startMins = timeToMinutes(startTime, 480); // 08:00 = 480
  const endMins = timeToMinutes(endTime, 540);     // 09:00 = 540

  // 24-HOUR FULL SCROLLABLE TIMELINE: 00:00 (0) to 24:00 (1440)
  // With generous spacing per hour (65px per hour -> 1560px track width)
  const minMins = 0;
  const maxMins = 1440;
  const totalRangeMins = 1440;
  const pxPerHour = 65;
  const trackWidthPx = 24 * pxPerHour; // 1560px

  // Calculate duration
  let diff = endMins - startMins;
  if (diff < 0) diff += 1440;
  const durationMinutes = diff;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationRestMinutes = durationMinutes % 60;
  const durationString = `${durationHours}:${String(durationRestMinutes).padStart(2, '0')}`;

  // Percentage for CSS positions on the scale (0% to 100%)
  const startPercent = Math.min(100, Math.max(0, (startMins / 1440) * 100));
  const endPercent = Math.min(100, Math.max(0, (endMins / 1440) * 100));

  // Generate hour tick marks (00:00 to 24:00)
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let h = 0; h <= 24; h++) {
      ticks.push(h * 60);
    }
    return ticks;
  }, []);

  // Generate 15-minute sub-ticks for clear visual precision
  const subTicks15m = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 0; m <= 1440; m += 15) {
      ticks.push(m);
    }
    return ticks;
  }, []);

  // Auto-center scroll on the active start time when component mounts
  useEffect(() => {
    if (scrollContainerRef.current) {
      const startRatio = startMins / 1440;
      const targetScrollLeft = startRatio * trackWidthPx - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  }, []);

  // Pan scroll helper buttons
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  // Center scroll on specific minutes (e.g. after clicking a preset)
  const centerScrollOn = (mins: number) => {
    if (scrollContainerRef.current) {
      const ratio = mins / 1440;
      const targetScrollLeft = ratio * trackWidthPx - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  };

  // Handle pointer down on start handle, end handle, or middle bar
  const handlePointerDown = (type: 'start' | 'end' | 'bar', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDrag(type);
    dragStartData.current = {
      initialX: e.clientX,
      initialStartMins: startMins,
      initialEndMins: endMins,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentMins = ratio * 1440;
    const snappedMins = Math.round(currentMins / stepMinutes) * stepMinutes;

    if (activeDrag === 'start') {
      let newStart = Math.max(0, Math.min(1440, snappedMins));
      let newEnd = endMins;
      if (newStart > newEnd) {
        newEnd = Math.min(1440, newStart + stepMinutes);
      }
      const newStartStr = minutesToTime(newStart);
      const newEndStr = minutesToTime(newEnd);
      const curDiff = newEnd - newStart;
      const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
      onChange(newStartStr, newEndStr, dStr, curDiff);
    } else if (activeDrag === 'end') {
      let newStart = startMins;
      let newEnd = Math.max(0, Math.min(1440, snappedMins));
      if (newEnd < newStart) {
        newStart = Math.max(0, newEnd - stepMinutes);
      }
      const newStartStr = minutesToTime(newStart);
      const newEndStr = minutesToTime(newEnd);
      const curDiff = newEnd - newStart;
      const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
      onChange(newStartStr, newEndStr, dStr, curDiff);
    } else if (activeDrag === 'bar') {
      const deltaX = e.clientX - dragStartData.current.initialX;
      const deltaMins = Math.round(((deltaX / rect.width) * 1440) / stepMinutes) * stepMinutes;
      const duration = dragStartData.current.initialEndMins - dragStartData.current.initialStartMins;

      let newStart = Math.max(0, Math.min(1440 - duration, dragStartData.current.initialStartMins + deltaMins));
      let newEnd = newStart + duration;

      const newStartStr = minutesToTime(newStart);
      const newEndStr = minutesToTime(newEnd);
      const dStr = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
      onChange(newStartStr, newEndStr, dStr, duration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDrag(null);
    }
  };

  // Direct click on the track to quickly set start or end
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeDrag || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedMins = ratio * 1440;
    const snappedMins = Math.round(clickedMins / stepMinutes) * stepMinutes;

    const distToStart = Math.abs(snappedMins - startMins);
    const distToEnd = Math.abs(snappedMins - endMins);

    if (distToStart <= distToEnd) {
      const newStart = Math.min(snappedMins, endMins - stepMinutes);
      const newStartStr = minutesToTime(Math.max(0, newStart));
      const curDiff = endMins - Math.max(0, newStart);
      const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
      onChange(newStartStr, endTime, dStr, curDiff);
    } else {
      const newEnd = Math.max(snappedMins, startMins + stepMinutes);
      const newEndStr = minutesToTime(Math.min(1440, newEnd));
      const curDiff = Math.min(1440, newEnd) - startMins;
      const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
      onChange(startTime, newEndStr, dStr, curDiff);
    }
  };

  // Preset setter
  const applyPreset = (sStr: string, eStr: string) => {
    const s = timeToMinutes(sStr);
    const e = timeToMinutes(eStr);
    const curDiff = Math.max(15, e - s);
    const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
    onChange(sStr, eStr, dStr, curDiff);
    centerScrollOn(s);
  };

  const addDuration = (minsToAdd: number) => {
    const newEndMins = Math.min(1440, endMins + minsToAdd);
    const newEndStr = minutesToTime(newEndMins);
    const curDiff = newEndMins - startMins;
    const dStr = `${Math.floor(curDiff / 60)}:${String(curDiff % 60).padStart(2, '0')}`;
    onChange(startTime, newEndStr, dStr, curDiff);
  };

  return (
    <div className={`space-y-2 select-none ${compact ? 'text-xs' : ''}`}>
      
      {/* 1. TOP BAR: MULAI, PAN CONTROLS, SELESAI */}
      <div className="flex items-center justify-between p-2 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl h-10">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mulai:</span>
          <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            {startTime}
          </span>
        </div>

        {/* Quick Pan Scroll Buttons */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleScrollLeft}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors cursor-pointer"
            title="Geser Timeline ke Kiri"
          >
            <FiChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-bold text-slate-400 px-1">Scroll ◀ ▶</span>
          <button
            type="button"
            onClick={handleScrollRight}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors cursor-pointer"
            title="Geser Timeline ke Kanan"
          >
            <FiChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Selesai:</span>
          <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            {endTime}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
        </div>
      </div>

      {/* 2. HORIZONTALLY SCROLLABLE TIMELINE TRACK CONTAINER (TIDAK DEMPET) */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden pb-2 pt-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 px-4"
      >
        <div 
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ width: `${trackWidthPx}px` }}
          className="relative h-9 bg-slate-200/90 dark:bg-slate-800 rounded-full cursor-pointer touch-none shadow-inner border border-slate-300 dark:border-slate-700 my-2"
        >
          {/* Work hours standard zone highlight (08:00 to 18:00) */}
          <div 
            className="absolute top-0 bottom-0 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full pointer-events-none"
            style={{ 
              left: `${(480 / 1440) * 100}%`, 
              width: `${((1080 - 480) / 1440) * 100}%` 
            }}
          />

          {/* 15-Minute Sub-Tick Marks across whole 24h track */}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            {subTicks15m.map((m) => {
              const isHour = m % 60 === 0;
              const isHalfHour = m % 30 === 0 && !isHour;
              const percent = (m / 1440) * 100;

              return (
                <div
                  key={m}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${percent}%` }}
                >
                  <div
                    className={`rounded-full ${
                      isHour
                        ? 'w-0.5 h-4 bg-slate-400 dark:bg-slate-500'
                        : isHalfHour
                        ? 'w-0.5 h-2.5 bg-slate-300 dark:bg-slate-600'
                        : 'w-px h-1.5 bg-slate-300/80 dark:bg-slate-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Active Highlight Range Bar (draggable to shift window) */}
          <div
            onPointerDown={(e) => handlePointerDown('bar', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`absolute top-0 bottom-0 rounded-full cursor-grab active:cursor-grabbing transition-colors duration-75 flex items-center justify-center z-10 ${
              activeDrag === 'bar'
                ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-500 shadow-md ring-2 ring-indigo-300'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400'
            }`}
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(1.5, endPercent - startPercent)}%`,
            }}
          >
            {(endPercent - startPercent) > 4 && (
              <span className="text-[10px] text-white font-mono font-black tracking-tighter truncate px-1.5 drop-shadow-xs">
                {durationString}
              </span>
            )}
          </div>

          {/* Left Thumb Handle: Start Time (Batas Bawah) */}
          <div
            onPointerDown={(e) => handlePointerDown('start', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-lg cursor-ew-resize flex items-center justify-center z-20 transition-transform ${
              activeDrag === 'start' ? 'scale-125 ring-4 ring-indigo-400/40' : 'hover:scale-110'
            }`}
            style={{ left: `${startPercent}%` }}
            title={`Batas Bawah (Mulai): ${startTime}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          </div>

          {/* Right Thumb Handle: End Time (Batas Atas) */}
          <div
            onPointerDown={(e) => handlePointerDown('end', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-lg cursor-ew-resize flex items-center justify-center z-20 transition-transform ${
              activeDrag === 'end' ? 'scale-125 ring-4 ring-indigo-400/40' : 'hover:scale-110'
            }`}
            style={{ left: `${endPercent}%` }}
            title={`Batas Atas (Selesai): ${endTime}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          </div>
        </div>

        {/* SPACIOUS 1-HOUR TICK LABELS (65px Lebar per Jam, Sangat Lega) */}
        <div style={{ width: `${trackWidthPx}px` }} className="relative h-4 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          {hourTicks.map((m) => {
            const h = Math.floor(m / 60);
            const percent = (m / 1440) * 100;

            return (
              <div
                key={m}
                className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${percent}%` }}
              >
                <span className="font-bold text-[10px] bg-slate-100 dark:bg-slate-800/80 px-1 py-0.2 rounded text-slate-700 dark:text-slate-300">
                  {String(h === 24 ? 24 : h).padStart(2, '0')}:00
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM BAR: TOTAL WAKTU (Stabil, Jelas & Kompak) */}
      <div className="flex items-center justify-between p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl h-9">
        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
          <FiClock className="text-indigo-500" size={13} />
          <span>Total Durasi:</span>
        </div>

        <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-2.5 py-0.5 rounded-md font-black text-xs shadow-2xs">
          <span className="font-mono tracking-wide">
            {durationHours > 0 ? `${durationHours} Jam ` : ''}{durationRestMinutes > 0 ? `${durationRestMinutes} Menit` : durationHours === 0 ? '0 Menit' : ''}
          </span>
          <span className="text-[10px] opacity-80 font-mono">({durationString})</span>
        </div>
      </div>

      {/* 4. PRESETS & DURATION BUTTONS */}
      {showPresets && (
        <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-slate-400 font-bold text-[9px] mr-0.5">Preset:</span>
            <button
              type="button"
              onClick={() => applyPreset('08:00', '09:00')}
              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 rounded font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              08:00-09:00 (1h)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('08:00', '12:00')}
              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 rounded font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              08:00-12:00 (4h)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('13:00', '17:00')}
              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 rounded font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              13:00-17:00 (4h)
            </button>
          </div>

          {/* Quick Duration Extenders (+15m, +30m, +1h) */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-bold text-[9px] mr-0.5">+Durasi:</span>
            <button
              type="button"
              onClick={() => addDuration(15)}
              className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded font-mono font-bold transition-colors cursor-pointer"
              title="Tambah 15 menit"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => addDuration(30)}
              className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded font-mono font-bold transition-colors cursor-pointer"
              title="Tambah 30 menit"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => addDuration(60)}
              className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded font-mono font-bold transition-colors cursor-pointer"
              title="Tambah 1 jam"
            >
              +1h
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
