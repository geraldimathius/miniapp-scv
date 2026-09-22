import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { getTasks } from '../lib/task-store';
import { getAllUsers } from '../lib/users';
import AppNav from '../components/app-nav';
import { cookies } from 'next/headers';
import { getDictionary } from '../lib/i18n';
import { MdWavingHand } from 'react-icons/md';
import { FaCrown } from 'react-icons/fa';
import { FiCalendar, FiClock } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [tasks, allUsers, cookieStore] = await Promise.all([
    getTasks(),
    user.role === 'master' ? getAllUsers() : Promise.resolve([]),
    cookies(),
  ]);

  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'id';
  const dict = getDictionary(locale);

  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;

  // Compute metrics
  const myName = user.name.toLowerCase().trim();
  const myEmail = user.email.toLowerCase().trim();

  const myTasks = tasks.filter(t => {
    const pic = (t.PIC || t.Assignee || '').toLowerCase().trim();
    return pic === myName || pic === myEmail || pic.includes(myName) || (myEmail && pic.includes(myEmail));
  });

  let ongoingCount = 0;
  let testingCount = 0;
  let doneCount = 0;
  let pendingCount = 0;

  const projectCounts: Record<string, number> = {};

  for (const t of tasks) {
    const s = (t.Status || 'Ongoing').trim().toLowerCase();
    if (s.includes('done') || s.includes('selesai') || s.includes('closed')) {
      doneCount++;
    } else if (s.includes('test') || s.includes('qa') || s.includes('review') || s.includes('qc')) {
      testingCount++;
    } else if (s.includes('pending') || s.includes('hold') || s.includes('to do') || s.includes('todo')) {
      pendingCount++;
    } else {
      ongoingCount++;
    }

    const proj = (t.Project || 'General').trim();
    projectCounts[proj] = (projectCounts[proj] || 0) + 1;
  }

  const topProjects = Object.entries(projectCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppNav user={user} pendingUsersCount={pendingUsersCount} />

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-colors">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
                {dict.dashboard.greeting.replace('{name}', user.name)}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${user.role === 'master'
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60'
                  : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60'
                }`}>
                {user.role === 'master' && <FaCrown className="text-amber-500 text-[11px] shrink-0" />}
                <span>{user.role === 'master' ? dict.dashboard.role_master : dict.dashboard.role_member}</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 transition-colors">
              {dict.dashboard.welcome_desc}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Link
              href="/timelogs"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors w-full lg:w-auto"
            >
              <FiClock size={16} />
              <span>{dict.nav.timelogs}</span>
            </Link>
          </div>
        </div>

        {/* Master User Pending Alert */}
        {user.role === 'master' && pendingUsersCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in duration-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0 transition-colors">
                {pendingUsersCount}
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors">
                  {dict.dashboard.pending_alert_title.replace('{count}', pendingUsersCount.toString())}
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 transition-colors">
                  {dict.dashboard.pending_alert_desc}
                </p>
              </div>
            </div>
            <Link
              href="/users"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white shadow-xs transition-colors shrink-0"
            >
              {dict.dashboard.btn_review}
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{dict.dashboard.metric_total}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{tasks.length}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{dict.dashboard.metric_all}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-gradient-to-br from-white dark:from-slate-900 to-indigo-50/40 dark:to-indigo-900/10 shadow-xs flex flex-col justify-between transition-colors">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{dict.dashboard.metric_my}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-300">{myTasks.length}</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-bold">{dict.dashboard.metric_assigned}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">{dict.dashboard.metric_ongoing}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{ongoingCount}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{dict.dashboard.metric_worked}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{dict.dashboard.metric_testing}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{testingCount}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{dict.dashboard.metric_review}</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">{dict.dashboard.metric_done}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{doneCount}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{dict.dashboard.metric_done_sub}</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout: My Assigned Tasks vs Project Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Assigned Tasks Widget */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white transition-colors">
                  {dict.dashboard.widget_assigned_title.replace('{count}', myTasks.length.toString())}
                </h3>
              </div>
              <Link
                href="/timelogs"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
              >
                {dict.dashboard.widget_assigned_link}
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 mt-2 flex-1 transition-colors">
              {myTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 transition-colors">
                  <p className="text-xs font-semibold">{dict.dashboard.widget_assigned_empty}</p>
                  <Link
                    href="/timelogs"
                    className="inline-block mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {dict.dashboard.widget_assigned_btn}
                  </Link>
                </div>
              ) : (
                myTasks.slice(0, 6).map(task => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors">
                          {task.Project || 'General'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate transition-colors">
                          {task['Label ticket'] || 'Untitled Task'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-3 transition-colors">
                        <span className="flex items-center gap-1">
                          <FiCalendar size={12} />
                          {task.Tanggal || '-'}
                        </span>
                        {task['Waktu Pengerjaan'] && (
                          <span className="flex items-center gap-1">
                            <FiClock size={12} />
                            {task['Waktu Pengerjaan']}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${(task.Status || '').toLowerCase().includes('done')
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                        : (task.Status || '').toLowerCase().includes('test')
                          ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
                        } transition-colors`}>
                        {task.Status || 'Ongoing'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Project Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col transition-colors">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
              <div className="w-3 h-3 rounded-full bg-violet-600 dark:bg-violet-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white transition-colors">
                {dict.dashboard.widget_project_title.replace('{count}', topProjects.length.toString())}
              </h3>
            </div>

            <div className="space-y-4 mt-4 flex-1">
              {topProjects.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 transition-colors">{dict.dashboard.widget_project_empty}</p>
              ) : (
                topProjects.slice(0, 7).map(p => {
                  const percentage = Math.round((p.count / (tasks.length || 1)) * 100);
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300 truncate transition-colors">{p.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-semibold transition-colors">
                          {dict.dashboard.widget_project_ticket.replace('{count}', p.count.toString()).replace('{percentage}', percentage.toString())}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
