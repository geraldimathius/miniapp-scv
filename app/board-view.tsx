'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { User } from './lib/users';
import AppNav from './components/app-nav';
import { useTranslation } from './lib/i18n/LanguageProvider';
import { FiUser, FiGlobe } from 'react-icons/fi';

export type Task = {
  id?: string;
  Project?: string;
  'Label ticket'?: string;
  'Link Ticket'?: string;
  Status?: string;
  Tanggal?: string;
  Date?: string;
  'Tanggal Pengerjaan'?: string;
  'Waktu Pengerjaan'?: string;
  'Detail Pengerjaan'?: string;
  Description?: string;
  Catatan?: string;
  Durasi?: string;
  'Time Spent'?: string;
  Waktu?: string;
  PIC?: string;
  Assignee?: string;
  attachments?: string[] | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export type ParsedTask = Task & {
  _date: Date | null;
  _dateRaw: string;
  _originalIndex: number;
  _attachments: string[];
};

export interface BoardViewProps {
  tasks: Task[];
  currentUser?: User;
  usersList?: User[];
  pendingUsersCount?: number;
  errorMsg?: string;
}

type DateFilterPreset = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM';
type SortOption = 'NEWEST' | 'OLDEST' | 'PROJECT_ASC';
type ViewMode = 'KANBAN' | 'TIMELINE';

const COLUMNS_CONFIG = [
  { key: 'Ongoing', title: 'To Do / Ongoing', headerColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300' },
  { key: 'OnProgress', title: 'In Progress', headerColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'Blocker', title: 'Blocker', headerColor: 'bg-rose-50 text-rose-700 border-rose-200', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'Done', title: 'Done', headerColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
] as const;

// Helper to safely parse attachments
function extractAttachments(val: any): string[] {
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

// Helper to parse date from various field names & date formats
function parseTaskDate(task: Task): { date: Date | null; rawString: string } {
  const rawDate =
    task.Tanggal ||
    task.Date ||
    task['Tanggal Pengerjaan'] ||
    task['Created At'] ||
    task['Updated At'] ||
    '';

  if (!rawDate || !rawDate.trim()) {
    return { date: null, rawString: '' };
  }

  const clean = rawDate.trim();

  // Try ISO format or Standard Date format (e.g. 2026-09-15)
  const isoParsed = Date.parse(clean);
  if (!isNaN(isoParsed)) {
    return { date: new Date(isoParsed), rawString: clean };
  }

  // Try DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return { date: d, rawString: clean };
    }
  }

  return { date: null, rawString: clean };
}

// Helper to extract clean title and detail description from task
function extractTaskContent(task: Task) {
  const explicitDetail = task['Detail Pengerjaan'] || task.Description || task.Catatan;
  const label = (task['Label ticket'] || '').trim().replace(/^["']|["']$/g, '');

  let title = '';
  let detailText = '';

  if (explicitDetail && explicitDetail.trim()) {
    title = label || 'Untitled Task';
    detailText = explicitDetail.trim();
  } else {
    const lines = label.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      title = lines[0];
      if (lines.length > 1) {
        detailText = lines.slice(1).join('\n');
      }
    } else {
      title = 'Untitled Task';
    }
  }

  const timeSpent = task['Waktu Pengerjaan'] || task.Durasi || task['Time Spent'] || task.Waktu || '';
  const assignee = task.PIC || task.Assignee || '';

  return {
    title,
    detailText,
    timeSpent: timeSpent.trim(),
    assignee: assignee.trim(),
  };
}

// Format date into human-readable Indonesian string
function formatDisplayDate(d: Date | null, fallback: string = ''): string {
  if (!d) return fallback;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Formatted rich description component
function FormattedDescription({ text }: { text?: string }) {
  if (!text || !text.trim()) {
    return <span className="text-slate-400 dark:text-slate-500 italic text-xs">Tidak ada detail pengerjaan tambahan.</span>;
  }

  const cleanText = text.replace(/^["']|["']$/g, '');
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return <span className="text-slate-400 dark:text-slate-500 italic text-xs">Tidak ada detail pengerjaan tambahan.</span>;
  }

  return (
    <div className="space-y-1.5 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
      {lines.map((line, index) => {
        const bulletMatch = line.match(/^[-*•]\s*(.*)$/);
        const numberMatch = line.match(/^(\d+[.)])\s*(.*)$/);

        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
              <span className="flex-1 text-slate-700 dark:text-slate-300">{bulletMatch[1]}</span>
            </div>
          );
        }

        if (numberMatch) {
          return (
            <div key={index} className="flex items-start gap-1.5 pl-0.5">
              <span className="font-semibold text-indigo-700 flex-shrink-0 text-[11px] min-w-[16px]">
                {numberMatch[1]}
              </span>
              <span className="flex-1 text-slate-700 dark:text-slate-300">{numberMatch[2]}</span>
            </div>
          );
        }

        return (
          <div key={index} className="text-slate-700 dark:text-slate-300 font-medium">
            {line}
          </div>
        );
      })}
    </div>
  );
}

// Lightbox Modal for full image view
function ImageLightboxModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (imageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrl, handleKeyDown]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Tutup preview gambar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <img
          src={imageUrl}
          alt="Attachment preview"
          className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
        />

        <div className="mt-3 flex items-center gap-3">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Buka Resolusi Penuh</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// Task Detail Modal Component
function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenImage,
}: {
  task: ParsedTask | null;
  onClose: () => void;
  onEdit: (task: ParsedTask) => void;
  onDelete: (task: ParsedTask) => void;
  onStatusChange: (task: ParsedTask, newStatus: string) => void;
  onOpenImage: (url: string) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (task) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [task, handleKeyDown]);

  if (!task) return null;

  const content = extractTaskContent(task);
  const statusRaw = task.Status ? task.Status.trim().toLowerCase() : 'ongoing';
  let statusBadgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300';
  const statusLabel = task.Status || 'Ongoing';

  if (statusRaw.includes('done')) {
    statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (statusRaw.includes('blocker')) {
    statusBadgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (statusRaw.includes('progress')) {
    statusBadgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-300';
  }

  const formattedDate = formatDisplayDate(task._date, task._dateRaw);
  const attachments = task._attachments || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-task-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {task.Project || 'General Project'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${statusBadgeColor}`}>
                {statusLabel}
              </span>
            </div>
            <h2 id="modal-task-title" className="text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
              {content.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              title="Edit Tiket"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700/60 p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Tutup modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500">Pindahkan Status:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'Ongoing', label: 'To Do / Ongoing', activeClass: 'bg-slate-700 text-white' },
                { key: 'On Progress', label: 'In Progress', activeClass: 'bg-indigo-600 text-white' },
                { key: 'Blocker', label: 'Blocker', activeClass: 'bg-rose-600 text-white' },
                { key: 'Done', label: 'Done', activeClass: 'bg-emerald-600 text-white' },
              ].map(st => {
                const isActive = (task.Status || 'Ongoing').toLowerCase().includes(st.key.toLowerCase().replace(' ', ''));
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => onStatusChange(task, st.key)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      isActive
                        ? st.activeClass + ' shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata Grid (Waktu & PIC) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Tanggal Pengerjaan</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {formattedDate || 'Belum dicantumkan'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Waktu / Durasi</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {content.timeSpent || 'Sesuai timeline tiket'}
                </div>
              </div>
            </div>

            {content.assignee && (
              <div className="flex items-center gap-2.5 sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">PIC / Assignee</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{content.assignee}</div>
                </div>
              </div>
            )}
          </div>

          {/* Attachments Gallery */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span>Lampiran Gambar ({attachments.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Klik gambar untuk memperbesar</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {attachments.map((url, imgIdx) => (
                  <div
                    key={imgIdx}
                    onClick={() => onOpenImage(url)}
                    className="group relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer transition-all shadow-xs"
                  >
                    <img
                      src={url}
                      alt={`Lampiran ${imgIdx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detail Pengerjaan Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Rincian & Detail Pengerjaan
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700/90 max-h-60 overflow-y-auto">
              <FormattedDescription text={content.detailText || task['Label ticket']} />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {task['Link Ticket'] ? (
              <a
                href={task['Link Ticket']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Buka Tiket Teamwork</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => onDelete(task)}
              className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Hapus Tiket
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Form for Creating or Editing a Task (with Image Upload)
function TaskFormModal({
  isOpen,
  mode,
  initialData,
  existingProjects,
  usersList = [],
  onClose,
  onSubmit,
  isSaving,
  workspaceMode,
  currentUser,
}: {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Task | null;
  existingProjects: string[];
  usersList?: User[];
  onClose: () => void;
  onSubmit: (formData: Partial<Task>) => Promise<void>;
  isSaving: boolean;
  workspaceMode: 'INDIVIDUAL' | 'GROUP';
  currentUser?: User;
}) {
  const [project, setProject] = useState('');
  const [labelTicket, setLabelTicket] = useState('');
  const [linkTicket, setLinkTicket] = useState('');
  const [status, setStatus] = useState('Ongoing');
  const [tanggal, setTanggal] = useState('');
  const [waktuPengerjaan, setWaktuPengerjaan] = useState('');
  const [detailPengerjaan, setDetailPengerjaan] = useState('');
  const [pic, setPic] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { t } = useTranslation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      const content = extractTaskContent(initialData);
      setProject(initialData.Project || '');
      setLabelTicket(content.title || initialData['Label ticket'] || '');
      setLinkTicket(initialData['Link Ticket'] || '');
      setStatus(initialData.Status || 'Ongoing');
      setTanggal(initialData.Tanggal || initialData.Date || '');
      setWaktuPengerjaan(content.timeSpent || initialData['Waktu Pengerjaan'] || '');
      setDetailPengerjaan(content.detailText || initialData['Detail Pengerjaan'] || '');
      setPic(workspaceMode === 'INDIVIDUAL' && currentUser ? currentUser.name : (content.assignee || initialData.PIC || ''));
      setAttachments(extractAttachments(initialData.attachments));
      setUploadError(null);
    } else if (mode === 'create') {
      const todayIso = new Date().toISOString().split('T')[0];
      setProject(existingProjects[0] || '');
      setLabelTicket('');
      setLinkTicket('');
      setStatus('Ongoing');
      setTanggal(todayIso);
      setWaktuPengerjaan('');
      setDetailPengerjaan('');
      setPic(workspaceMode === 'INDIVIDUAL' && currentUser ? currentUser.name : '');
      setAttachments([]);
      setUploadError(null);
    }
  }, [initialData, mode, isOpen, existingProjects, workspaceMode, currentUser]);

  if (!isOpen) return null;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setAttachments(prev => [...prev, ...data.data]);
      } else {
        setUploadError(data.error || 'Gagal mengunggah file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error upload ke storage.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelTicket.trim() && !project.trim()) return;

    await onSubmit({
      Project: project.trim(),
      'Label ticket': labelTicket.trim(),
      'Link Ticket': linkTicket.trim(),
      Status: status,
      Tanggal: tanggal.trim(),
      'Waktu Pengerjaan': waktuPengerjaan.trim(),
      'Detail Pengerjaan': detailPengerjaan.trim(),
      PIC: pic.trim(),
      attachments,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? 'Tambah Tiket / Tugas Baru' : 'Edit Informasi Tiket'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 p-1.5 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="project-suggestions"
                required
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Pilih atau ketik nama project"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
              />
              <datalist id="project-suggestions">
                {existingProjects.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {existingProjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5 max-h-16 overflow-y-auto">
                  <span className="text-[10px] text-slate-400 font-medium">Pilih:</span>
                  {existingProjects.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProject(p)}
                      className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer ${
                        project === p
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

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
              >
                <option value="Ongoing">To Do / Ongoing</option>
                <option value="On Progress">In Progress</option>
                <option value="Blocker">Blocker</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Ticket Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Judul Tiket / Tugas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={labelTicket}
              onChange={e => setLabelTicket(e.target.value)}
              placeholder="Contoh: POS - Issue duplicate customer phone number"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
            />
          </div>

          {/* Link Ticket */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Link Tiket (Teamwork / Jira URL)
            </label>
            <input
              type="url"
              value={linkTicket}
              onChange={e => setLinkTicket(e.target.value)}
              placeholder="https://teamwork.icubeonline.com/app/tasks/..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tanggal Pengerjaan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pengerjaan
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
              />
            </div>

            {/* Waktu / Durasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Waktu / Durasi
              </label>
              <input
                type="text"
                value={waktuPengerjaan}
                onChange={e => setWaktuPengerjaan(e.target.value)}
                placeholder="Contoh: 3 jam / 09:00 - 12:00"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
              />
            </div>

            {/* PIC */}
            {workspaceMode === 'GROUP' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIC / Assignee
                </label>
                <input
                  type="text"
                  list="users-assignee-datalist"
                  value={pic}
                  onChange={e => setPic(e.target.value)}
                  placeholder="Pilih user terdaftar atau ketik nama"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
                />
                <datalist id="users-assignee-datalist">
                  {usersList.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.email} ({u.role === 'master' ? 'Master' : 'Member'})
                    </option>
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {/* Upload Attachments Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Lampiran Gambar (Multiple Images)
            </label>

            {/* Dropzone Container */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={e => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isUploading ? (
                    <span className="text-indigo-600 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      Sedang mengunggah ke Cloudinary...
                    </span>
                  ) : (
                    <span>Klik untuk pilih beberapa gambar atau tarik ke sini</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Format JPG, PNG, WEBP, GIF (Maks. 15MB per file)</p>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                {uploadError}
              </p>
            )}

            {/* Attachments Preview Grid */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {attachments.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={url} alt={`Lampiran ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-md p-1 shadow-sm opacity-90 hover:opacity-100 hover:scale-110 transition-all"
                      title="Hapus gambar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Pengerjaan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Rincian & Detail Pengerjaan (Catatan teknis / bullet points)
            </label>
            <textarea
              rows={4}
              value={detailPengerjaan}
              onChange={e => setDetailPengerjaan(e.target.value)}
              placeholder="- Langkah perbaikan&#10;- Catatan bug & solusi&#10;- Endpoint yang disentuh"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{mode === 'create' ? 'Buat Tiket' : 'Simpan Perubahan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Dialog
function DeleteConfirmModal({
  isOpen,
  task,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}) {
  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Tiket?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
            Apakah Anda yakin ingin menghapus tiket <span className="font-semibold text-slate-800 dark:text-slate-200">"{task['Label ticket'] || task.Project}"</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoardView({
  tasks: initialTasks,
  currentUser,
  usersList = [],
  pendingUsersCount = 0,
  errorMsg,
}: BoardViewProps) {
  const [taskList, setTaskList] = useState<Task[]>(initialTasks);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('NEWEST');
  const { t } = useTranslation();

  // Mode toggles;
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [workspaceMode, setWorkspaceMode] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');

  // Load workspaceMode from localStorage if available
  useEffect(() => {
    const savedMode = localStorage.getItem('scv_workspace_mode');
    if (savedMode === 'INDIVIDUAL' || savedMode === 'GROUP') {
      setWorkspaceMode(savedMode);
    }
  }, []);

  const handleWorkspaceModeChange = (mode: 'INDIVIDUAL' | 'GROUP') => {
    setWorkspaceMode(mode);
    localStorage.setItem('scv_workspace_mode', mode);
  };

  // Assignee Filter States (Default to assigned to logged-in user if authenticated)
  const [filterOnlyMyTasks, setFilterOnlyMyTasks] = useState<boolean>(!!currentUser);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  // Modals state
  const [activeDetailTask, setActiveDetailTask] = useState<ParsedTask | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state if initialTasks changes
  useEffect(() => {
    setTaskList(initialTasks);
  }, [initialTasks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Drag and drop column drop handler
  const handleDropTaskToColumn = async (taskId: string, targetColKey: string) => {
    let newStatus = 'Ongoing';
    if (targetColKey === 'OnProgress') newStatus = 'On Progress';
    else if (targetColKey === 'Blocker') newStatus = 'Blocker';
    else if (targetColKey === 'Done') newStatus = 'Done';
    else newStatus = 'Ongoing';

    const existing = taskList.find(t => t.id === taskId);
    if (!existing) return;
    if (existing.Status === newStatus) return;

    // Optimistic UI update
    setTaskList(prev => prev.map(t => (t.id === taskId ? { ...t, Status: newStatus } : t)));
    showToast(`Status tiket berhasil diubah ke "${newStatus}"`);

    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, Status: newStatus }),
      });
    } catch (err: any) {
      console.error('Failed to sync drag and drop status:', err);
    }
  };

  // Normalize tasks with parsed date, index, and attachments
  const normalizedTasks: ParsedTask[] = useMemo(() => {
    return taskList.map((t, idx) => {
      const { date, rawString } = parseTaskDate(t);
      const atts = extractAttachments(t.attachments);
      return {
        ...t,
        _date: date,
        _dateRaw: rawString,
        _originalIndex: idx,
        _attachments: atts,
      };
    });
  }, [taskList]);

  // Extract unique project list with task counts
  const projectStats = useMemo(() => {
    const counts: Record<string, number> = {};
    normalizedTasks.forEach(t => {
      const name = t.Project?.trim();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    const uniqueProjects = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return { counts, uniqueProjects };
  }, [normalizedTasks]);

  // Filter tasks based on Project, Search Query, Assignee, and Date Range
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return normalizedTasks.filter(task => {
      // 1. Assignee / PIC Filter
      if (workspaceMode === 'INDIVIDUAL' && currentUser) {
        // In individual mode, strictly filter only my tasks
        const myName = currentUser.name.toLowerCase().trim();
        const myEmail = currentUser.email.toLowerCase().trim();
        const pic = (task.PIC || task.Assignee || '').toLowerCase().trim();
        const isMine = pic === myName || pic === myEmail || pic.includes(myName) || (myEmail && pic.includes(myEmail));
        if (!isMine) return false;
      } else if (filterOnlyMyTasks && currentUser) {
        const myName = currentUser.name.toLowerCase().trim();
        const myEmail = currentUser.email.toLowerCase().trim();
        const pic = (task.PIC || task.Assignee || '').toLowerCase().trim();
        const isMine = pic === myName || pic === myEmail || pic.includes(myName) || (myEmail && pic.includes(myEmail));
        if (!isMine) return false;
      } else if (selectedAssignee !== 'ALL') {
        const cleanSel = selectedAssignee.toLowerCase().trim();
        const pic = (task.PIC || task.Assignee || '').toLowerCase().trim();
        if (!pic.includes(cleanSel)) return false;
      }

      // 2. Project Filter
      if (selectedProject !== 'ALL' && task.Project?.trim() !== selectedProject) {
        return false;
      }

      // 3. Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const projectMatch = task.Project?.toLowerCase().includes(q);
        const labelMatch = task['Label ticket']?.toLowerCase().includes(q);
        const detailMatch = task['Detail Pengerjaan']?.toLowerCase().includes(q);
        const picMatch = task.PIC?.toLowerCase().includes(q);
        if (!projectMatch && !labelMatch && !detailMatch && !picMatch) {
          return false;
        }
      }

      // 4. Date Filter
      if (dateFilter === 'ALL') {
        return true;
      }

      if (!task._date) {
        return false;
      }

      const taskDateOnly = new Date(task._date);
      taskDateOnly.setHours(0, 0, 0, 0);

      if (dateFilter === 'TODAY') {
        return taskDateOnly.getTime() === today.getTime();
      }

      if (dateFilter === 'LAST_7_DAYS') {
        return taskDateOnly >= sevenDaysAgo && taskDateOnly <= today;
      }

      if (dateFilter === 'THIS_MONTH') {
        return taskDateOnly >= startOfMonth;
      }

      if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (taskDateOnly < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (taskDateOnly > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [
    normalizedTasks,
    selectedProject,
    searchQuery,
    dateFilter,
    customStartDate,
    customEndDate,
    filterOnlyMyTasks,
    selectedAssignee,
    currentUser,
  ]);

  // Sort tasks (Default: NEWEST FIRST)
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];

    if (sortOption === 'NEWEST') {
      list.sort((a, b) => {
        if (a._date && b._date) {
          return b._date.getTime() - a._date.getTime();
        }
        if (a._date && !b._date) return -1;
        if (!a._date && b._date) return 1;
        return b._originalIndex - a._originalIndex;
      });
    } else if (sortOption === 'OLDEST') {
      list.sort((a, b) => {
        if (a._date && b._date) {
          return a._date.getTime() - b._date.getTime();
        }
        if (a._date && !b._date) return 1;
        if (!a._date && b._date) return -1;
        return a._originalIndex - b._originalIndex;
      });
    } else if (sortOption === 'PROJECT_ASC') {
      list.sort((a, b) => (a.Project || '').localeCompare(b.Project || ''));
    }

    return list;
  }, [filteredTasks, sortOption]);

  // Group sorted tasks into Kanban columns
  const columns = useMemo(() => {
    const grouped: Record<string, ParsedTask[]> = {
      Ongoing: [],
      OnProgress: [],
      Blocker: [],
      Done: [],
    };

    sortedTasks.forEach(row => {
      if (!row.Project && !row.Status && !row['Label ticket']) return;

      const statusRaw = row.Status ? row.Status.trim().toLowerCase() : 'ongoing';
      let statusKey = 'Ongoing';

      if (statusRaw.includes('done')) statusKey = 'Done';
      else if (statusRaw.includes('blocker')) statusKey = 'Blocker';
      else if (statusRaw.includes('progress')) statusKey = 'OnProgress';

      if (grouped[statusKey]) {
        grouped[statusKey].push(row);
      } else {
        grouped.Ongoing.push(row);
      }
    });

    return grouped;
  }, [sortedTasks]);

  // CRUD Handlers
  const handleCreateTask = async (formData: Partial<Task>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTaskList(prev => [data.data, ...prev]);
        setIsCreateOpen(false);
        showToast('Tiket baru berhasil ditambahkan!');
      } else {
        showToast(`Gagal menambahkan tiket: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTask = async (formData: Partial<Task>) => {
    if (!editingTask?.id) {
      const matched = taskList.find(
        t => t.Project === editingTask?.Project && t['Label ticket'] === editingTask?.['Label ticket']
      );
      if (matched) formData.id = matched.id;
    } else {
      formData.id = editingTask.id;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTaskList(prev => prev.map(t => (t.id === data.data.id ? data.data : t)));
        setEditingTask(null);
        if (activeDetailTask) {
          const { date, rawString } = parseTaskDate(data.data);
          const atts = extractAttachments(data.data.attachments);
          setActiveDetailTask({
            ...data.data,
            _date: date,
            _dateRaw: rawString,
            _originalIndex: activeDetailTask._originalIndex,
            _attachments: atts,
          });
        }
        showToast('Perubahan tiket berhasil disimpan!');
      } else {
        showToast(`Gagal mengubah tiket: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (task: ParsedTask, newStatus: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, Status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTaskList(prev => prev.map(t => (t.id === task.id ? { ...t, Status: newStatus } : t)));
        if (activeDetailTask && activeDetailTask.id === task.id) {
          setActiveDetailTask(prev => (prev ? { ...prev, Status: newStatus } : null));
        }
        showToast(`Status tiket diubah menjadi: ${newStatus}`);
      }
    } catch (err: any) {
      showToast(`Gagal mengubah status: ${err.message}`);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask?.id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tasks?id=${encodeURIComponent(deletingTask.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTaskList(prev => prev.filter(t => t.id !== deletingTask.id));
        setDeletingTask(null);
        setActiveDetailTask(null);
        showToast('Tiket berhasil dihapus!');
      } else {
        showToast(`Gagal menghapus tiket: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasActiveFilters =
    selectedProject !== 'ALL' ||
    searchQuery.trim() !== '' ||
    dateFilter !== 'ALL' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    filterOnlyMyTasks ||
    selectedAssignee !== 'ALL';

  const resetFilters = () => {
    setSelectedProject('ALL');
    setSearchQuery('');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setFilterOnlyMyTasks(false);
    setSelectedAssignee('ALL');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppNav user={currentUser} pendingUsersCount={pendingUsersCount} />

      <div className="max-w-[1500px] w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6 flex-1">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <header className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('board', 'title')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Turso DB & Cloudinary
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1">
              {t('board', 'desc')}
            </p>
          </div>

          {/* Action Bar (Add Task, View Toggles) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>{t('board', 'btn_add')}</span>
            </button>

            {/* Workspace Mode Toggles */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 ml-2">
              <button
                type="button"
                onClick={() => handleWorkspaceModeChange('INDIVIDUAL')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  workspaceMode === 'INDIVIDUAL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 font-bold shadow-xs border border-indigo-100'
                    : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{t('board', 'mode_individual')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleWorkspaceModeChange('GROUP')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  workspaceMode === 'GROUP'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 font-bold shadow-xs border border-indigo-100'
                    : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>{t('board', 'mode_group')}</span>
              </button>
            </div>

            {/* View Mode Buttons */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => setViewMode('KANBAN')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'KANBAN'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="18" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="18" rx="1"></rect>
                </svg>
                <span>{t('board', 'view_kanban')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TIMELINE')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'TIMELINE'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>{t('board', 'view_list')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filter & Control Bar */}
        <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
          {/* Row 1: Assignee quick toggle & Search & Filters */}
          {workspaceMode === 'GROUP' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              {/* Quick Assignee Toggle */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOnlyMyTasks(true);
                      setSelectedAssignee('ALL');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      filterOnlyMyTasks
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                    }`}
                  >
                    <FiUser size={14} />
                    {t('board', 'filter_my')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterOnlyMyTasks(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    !filterOnlyMyTasks && selectedAssignee === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white'
                  }`}
                >
                  <FiGlobe size={14} />
                  {t('board', 'filter_all', { count: taskList.length })}
                </button>
              </div>

              {/* Assignee PIC Dropdown Filter */}
              {usersList.length > 0 && (
                <div className="relative">
                  <select
                    value={filterOnlyMyTasks ? 'MY_TASKS' : selectedAssignee}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'MY_TASKS') {
                        setFilterOnlyMyTasks(true);
                        setSelectedAssignee('ALL');
                      } else {
                        setFilterOnlyMyTasks(false);
                        setSelectedAssignee(val);
                      }
                    }}
                    className="appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="ALL">{t('board', 'filter_pic_all')}</option>
                    {currentUser && <option value="MY_TASKS">{t('board', 'filter_pic_my', { name: currentUser.name })}</option>}
                    {usersList.map(u => (
                      <option key={u.id} value={u.name}>
                        PIC: {u.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 dark:text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="search-input" className="sr-only">Cari Tiket / Detail</label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari project, tiket, PIC, detail..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
              />
            </div>

            {/* Project Filter */}
            <div className="relative">
              <label htmlFor="project-filter" className="sr-only">Filter Project</label>
              <select
                id="project-filter"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 cursor-pointer transition-all"
              >
                <option value="ALL">{t('board', 'filter_proj_all')} ({taskList.length})</option>
                {projectStats.uniqueProjects.map(project => (
                  <option key={project} value={project}>
                    {project} ({projectStats.counts[project]})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>

            {/* Sort Options */}
            <div className="relative">
              <label htmlFor="sort-filter" className="sr-only">Urutkan Berdasarkan</label>
              <select
                id="sort-filter"
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 cursor-pointer transition-all"
              >
                <option value="NEWEST">Urutkan: Pengerjaan Terbaru</option>
                <option value="OLDEST">Urutkan: Pengerjaan Terlama</option>
                <option value="PROJECT_ASC">Urutkan: Nama Project (A-Z)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>

            {/* Quick Reset Button */}
            <div className="flex items-center">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Reset Filter</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500 italic px-2">
                  Total {sortedTasks.length} dari {taskList.length} tiket
                </span>
              )}
            </div>
          </div>

          {/* Date Filter Presets & Custom Range */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mr-1">Filter Tanggal:</span>
              {(
                [
                  { id: 'ALL', label: 'Semua Waktu' },
                  { id: 'TODAY', label: 'Hari Ini' },
                  { id: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
                  { id: 'THIS_MONTH', label: 'Bulan Ini' },
                  { id: 'CUSTOM', label: 'Pilih Rentang Tanggal' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-slate-700/80 hover:text-slate-900 dark:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs if CUSTOM is active */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                  aria-label="Tanggal Awal"
                />
                <span className="text-slate-400 dark:text-slate-500">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                  aria-label="Tanggal Akhir"
                />
              </div>
            )}
          </div>
        </section>

        {/* Error Message if fetch failed */}
        {errorMsg ? (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-sm">
            <p className="font-semibold">Terjadi kesalahan sinkronisasi:</p>
            <p className="mt-1">{errorMsg}</p>
          </div>
        ) : viewMode === 'KANBAN' ? (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {COLUMNS_CONFIG.map(({ key, title, headerColor, badgeColor }) => {
              const items = columns[key] || [];

              return (
                <div
                  key={key}
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverColKey !== key) setDragOverColKey(key);
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverColKey(null);
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    if (taskId) {
                      handleDropTaskToColumn(taskId, key);
                    }
                    setDragOverColKey(null);
                    setDraggedTaskId(null);
                  }}
                  className={`rounded-2xl p-4 border flex flex-col h-full transition-all duration-200 ${
                    dragOverColKey === key
                      ? 'bg-indigo-50/90 ring-2 ring-indigo-400 ring-dashed shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${headerColor}`}>
                      {title}
                    </h2>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border bg-white dark:bg-slate-900 shadow-xs ${badgeColor}`}>
                      {items.length}
                    </span>
                  </div>

                  {/* Tasks Container */}
                  <div className="flex-1 space-y-3.5 overflow-y-auto">
                    {items.length > 0 ? (
                      items.map((item, idx) => {
                        const content = extractTaskContent(item);
                        const formattedDate = formatDisplayDate(item._date, item._dateRaw);
                        const attachmentsCount = item._attachments?.length || 0;

                        return (
                          <div
                            key={item.id ? `${item.id}-${idx}` : `item-${idx}`}
                            draggable={true}
                            onDragStart={e => {
                              e.dataTransfer.setData('text/plain', item.id || '');
                              setDraggedTaskId(item.id || null);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverColKey(null);
                            }}
                            onClick={() => setActiveDetailTask(item)}
                            className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700/80 hover:shadow-md hover:border-indigo-300 transition-all duration-200 group flex flex-col gap-3 cursor-grab active:cursor-grabbing relative select-none ${
                              draggedTaskId === item.id ? 'opacity-40 ring-2 ring-indigo-500 ring-dashed scale-95' : ''
                            }`}
                          >
                            {/* Project Name & Actions */}
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                                {item.Project || 'Untitled Project'}
                              </span>

                              <div className="flex items-center gap-1">
                                {item['Link Ticket'] && (
                                  <a
                                    href={item['Link Ticket']}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors p-1 hover:bg-slate-50 dark:bg-slate-950 rounded"
                                    title="Buka tiket eksternal"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <polyline points="15 3 21 3 21 9"></polyline>
                                      <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Ticket Title */}
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                              {content.title}
                            </div>

                            {/* Formatted description preview */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 max-h-24 overflow-hidden relative">
                              <FormattedDescription text={content.detailText || item['Label ticket']} />
                              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                            </div>

                            {/* Footer Badges (Waktu, Tanggal & Attachments) */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {formattedDate ? (
                                  <span className="inline-flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 dark:text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="16" y1="2" x2="16" y2="6"></line>
                                      <line x1="8" y1="2" x2="8" y2="6"></line>
                                      <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    {formattedDate}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">Terbaru</span>
                                )}

                                {attachmentsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                    </svg>
                                    {attachmentsCount}
                                  </span>
                                )}
                              </div>

                              {content.timeSpent && (
                                <span className="inline-flex items-center gap-1 font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                  {content.timeSpent}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-10 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white/50">
                        Tidak ada tiket di status ini
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Timeline / List View */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Timeline Riwayat Pengerjaan ({sortedTasks.length} Tiket)
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Urutan: Terbaru ke Terlama</span>
            </div>

            {sortedTasks.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTasks.map((task, idx) => {
                  const content = extractTaskContent(task);
                  const formattedDate = formatDisplayDate(task._date, task._dateRaw);
                  const statusRaw = task.Status ? task.Status.trim().toLowerCase() : 'ongoing';
                  const attachmentsCount = task._attachments?.length || 0;

                  let statusBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                  if (statusRaw.includes('done')) statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  else if (statusRaw.includes('blocker')) statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                  else if (statusRaw.includes('progress')) statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';

                  return (
                    <div
                      key={task.id ? `timeline-${task.id}-${idx}` : `timeline-${idx}`}
                      onClick={() => setActiveDetailTask(task)}
                      className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                            {task.Project || 'General'}
                          </span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${statusBadge}`}>
                            {task.Status || 'Ongoing'}
                          </span>
                          {formattedDate && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              {formattedDate}
                            </span>
                          )}
                          {attachmentsCount > 0 && (
                            <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                              </svg>
                              <span>{attachmentsCount} Foto</span>
                            </span>
                          )}
                          {content.timeSpent && (
                            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                              {content.timeSpent}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {content.title}
                        </h3>

                        {content.detailText && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-1 font-normal">
                            {content.detailText.replace(/\r?\n/g, ' ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {task['Link Ticket'] && (
                          <a
                            href={task['Link Ticket']}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                          >
                            <span>Tiket</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </a>
                        )}

                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          Detail &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                Tidak ada tiket yang cocok dengan filter saat ini.
              </div>
            )}
          </div>
        )}

        {/* Task Detail Modal */}
        <TaskDetailModal
          task={activeDetailTask}
          onClose={() => setActiveDetailTask(null)}
          onEdit={task => {
            setEditingTask(task);
            setIsCreateOpen(false);
          }}
          onDelete={task => {
            setDeletingTask(task);
          }}
          onStatusChange={handleQuickStatusChange}
          onOpenImage={url => setPreviewLightboxUrl(url)}
        />

        {/* Create Task Modal */}
        <TaskFormModal
          isOpen={isCreateOpen}
          mode="create"
          existingProjects={projectStats.uniqueProjects}
          usersList={usersList}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateTask}
          isSaving={isSaving}
          workspaceMode={workspaceMode}
          currentUser={currentUser}
        />

        {/* Edit Task Modal */}
        <TaskFormModal
          isOpen={Boolean(editingTask)}
          mode="edit"
          initialData={editingTask}
          existingProjects={projectStats.uniqueProjects}
          usersList={usersList}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
          isSaving={isSaving}
          workspaceMode={workspaceMode}
          currentUser={currentUser}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={Boolean(deletingTask)}
          task={deletingTask}
          onClose={() => setDeletingTask(null)}
          onConfirm={handleDeleteTask}
          isDeleting={isSaving}
        />

        {/* Full Image Lightbox */}
        <ImageLightboxModal
          imageUrl={previewLightboxUrl}
          onClose={() => setPreviewLightboxUrl(null)}
        />
      </div>
    </div>
  );
}
