import React from 'react';
import Papa from 'papaparse';

// Force dynamic SSR so board data stays live with Google Sheets
export const dynamic = 'force-dynamic';

type Task = {
  Project?: string;
  'Label ticket'?: string;
  'Link Ticket'?: string;
  Status?: string;
};

export default async function ProjectBoard() {
  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL;
  let tasks: Task[] = [];
  let errorMsg = '';

  if (!sheetUrl) {
    errorMsg = 'Missing GOOGLE_SHEET_CSV_URL environment variable.';
  } else {
    try {
      const res = await fetch(sheetUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch spreadsheet data.');

      const csvText = await res.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      tasks = parsed.data as Task[];
    } catch (error: any) {
      errorMsg = error.message;
    }
  }

  // Group tasks into kanban columns based on status
  const columns = {
    Ongoing: { title: "To Do / Ongoing", headerColor: "bg-slate-200 text-slate-700", items: [] as Task[] },
    OnProgress: { title: "In Progress", headerColor: "bg-indigo-100 text-indigo-700", items: [] as Task[] },
    Blocker: { title: "Blocker", headerColor: "bg-rose-100 text-rose-700", items: [] as Task[] },
    Done: { title: "Done", headerColor: "bg-emerald-100 text-emerald-700", items: [] as Task[] }
  };

  tasks.forEach(row => {
    if (!row.Project && !row.Status) return;

    let statusRaw = row.Status ? row.Status.trim().toLowerCase() : 'ongoing';
    let statusKey: keyof typeof columns = 'Ongoing';

    if (statusRaw.includes('done')) statusKey = 'Done';
    else if (statusRaw.includes('blocker')) statusKey = 'Blocker';
    else if (statusRaw.includes('progress')) statusKey = 'OnProgress';

    columns[statusKey].items.push(row);
  });

  return (
    <div className="bg-slate-50 font-sans text-slate-800 min-h-screen p-6 md:p-12">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Board</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live sync via Next.js Server Components
            </p>
          </div>
        </header>

        {errorMsg ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Object.entries(columns).map(([key, col]) => (
              <div key={key} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col h-full shadow-inner">
                <div className="flex items-center justify-between mb-5 px-1">
                  <h2 className={`text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg ${col.headerColor}`}>
                    {col.title}
                  </h2>
                  <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                    {col.items.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {col.items.length > 0 ? (
                    col.items.map((item, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 mb-4 group">
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 uppercase">
                            {item['Label ticket'] || 'Unlabeled'}
                          </span>
                          {item['Link Ticket'] && (
                            <a
                              href={item['Link Ticket']}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
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
                        <h3 className="font-bold text-slate-800 text-[15px] leading-snug">
                          {item.Project || 'Untitled Task'}
                        </h3>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400 italic text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                      No tasks found
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
