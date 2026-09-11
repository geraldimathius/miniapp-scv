'use client';

import React, { useState, useMemo } from 'react';

export type Task = {
  Project?: string;
  'Label ticket'?: string;
  'Link Ticket'?: string;
  Status?: string;
};

interface BoardViewProps {
  tasks: Task[];
  errorMsg?: string;
}

const COLUMNS_CONFIG = [
  { key: 'Ongoing', title: 'To Do / Ongoing', headerColor: 'bg-slate-200 text-slate-700' },
  { key: 'OnProgress', title: 'In Progress', headerColor: 'bg-indigo-100 text-indigo-700' },
  { key: 'Blocker', title: 'Blocker', headerColor: 'bg-rose-100 text-rose-700' },
  { key: 'Done', title: 'Done', headerColor: 'bg-emerald-100 text-emerald-700' },
] as const;

function FormattedDescription({ text }: { text?: string }) {
  if (!text || !text.trim()) {
    return <span className="text-slate-400 italic">No description provided.</span>;
  }

  // Normalize quotes and split by lines
  const cleanText = text.replace(/^["']|["']$/g, '');
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return <span className="text-slate-400 italic">No description provided.</span>;
  }

  return (
    <div className="space-y-1.5 text-slate-600 text-xs leading-relaxed">
      {lines.map((line, index) => {
        // Match bullet point formats: -, *, •
        const bulletMatch = line.match(/^[-*•]\s*(.*)$/);
        // Match numbered list formats: 1., 2), etc.
        const numberMatch = line.match(/^(\d+[.)])\s*(.*)$/);

        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
              <span className="flex-1 text-slate-600">{bulletMatch[1]}</span>
            </div>
          );
        }

        if (numberMatch) {
          return (
            <div key={index} className="flex items-start gap-1.5 pl-0.5">
              <span className="font-semibold text-indigo-600 flex-shrink-0 text-[11px] min-w-[14px]">
                {numberMatch[1]}
              </span>
              <span className="flex-1 text-slate-600">{numberMatch[2]}</span>
            </div>
          );
        }

        return (
          <div key={index} className="font-semibold text-slate-700 text-xs">
            {line}
          </div>
        );
      })}
    </div>
  );
}

export default function BoardView({ tasks, errorMsg }: BoardViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>('ALL');

  // Extract unique project list with task counts
  const projectStats = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const name = t.Project?.trim();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    const uniqueProjects = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return { counts, uniqueProjects };
  }, [tasks]);

  // Filter tasks based on selected project
  const filteredTasks = useMemo(() => {
    if (selectedProject === 'ALL') return tasks;
    return tasks.filter(task => task.Project?.trim() === selectedProject);
  }, [tasks, selectedProject]);

  // Group filtered tasks into kanban columns
  const columns = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      Ongoing: [],
      OnProgress: [],
      Blocker: [],
      Done: []
    };

    filteredTasks.forEach(row => {
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
  }, [filteredTasks]);

  return (
    <div className="bg-slate-50 font-sans text-slate-800 min-h-screen p-6 md:p-12">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Board</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live sync via Next.js Server Components
            </p>
          </div>

          {/* Project Filter Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label htmlFor="project-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Filter Project:
            </label>
            <div className="relative flex-1 md:w-64">
              <select
                id="project-filter"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3.5 py-2.5 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all"
              >
                <option value="ALL">All Projects ({tasks.length})</option>
                {projectStats.uniqueProjects.map(project => (
                  <option key={project} value={project}>
                    {project} ({projectStats.counts[project]})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>

            {selectedProject !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedProject('ALL')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </header>

        {errorMsg ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {COLUMNS_CONFIG.map(({ key, title, headerColor }) => {
              const items = columns[key] || [];

              return (
                <div key={key} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className={`text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg ${headerColor}`}>
                      {title}
                    </h2>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 mb-4 group flex flex-col gap-2.5"
                        >
                          {/* Project at the top */}
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-800 text-sm leading-snug">
                              {item.Project || 'Untitled Project'}
                            </span>
                            {item['Link Ticket'] && (
                              <a
                                href={item['Link Ticket']}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors opacity-70 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-slate-50 rounded"
                                title="Open ticket"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            )}
                          </div>

                          {/* Formatted description with bullet points & title */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                            <FormattedDescription text={item['Label ticket']} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400 italic text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                        No tasks found
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
