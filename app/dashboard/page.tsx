import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { getTasks } from '../lib/task-store';
import { getAllUsers } from '../lib/users';
import AppNav from '../components/app-nav';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [tasks, allUsers] = await Promise.all([
    getTasks(),
    user.role === 'master' ? getAllUsers() : Promise.resolve([]),
  ]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppNav user={user} pendingUsersCount={pendingUsersCount} />

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Halo, {user.name} 👋
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                user.role === 'master' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {user.role === 'master' ? '👑 Master User' : 'Team Member'}
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Selamat datang di pusat kendali aktivitas tiket dan proyek tim Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/board"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Buka Kanban Board</span>
            </Link>
          </div>
        </div>

        {/* Master User Pending Alert */}
        {user.role === 'master' && pendingUsersCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {pendingUsersCount}
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Ada {pendingUsersCount} Pengguna Menunggu Persetujuan
                </h4>
                <p className="text-[11px] text-amber-700">
                  Pendaftar baru belum dapat login sebelum Anda menyetujui akun mereka.
                </p>
              </div>
            </div>
            <Link
              href="/users"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors shrink-0"
            >
              Tinjau Sekarang →
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tiket</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{tasks.length}</span>
              <span className="text-xs text-slate-400 font-semibold">Semua</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/40 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Tiket Saya</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600">{myTasks.length}</span>
              <span className="text-xs text-indigo-500 font-bold">Ditugaskan</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Ongoing</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{ongoingCount}</span>
              <span className="text-xs text-slate-400 font-semibold">Dikerjakan</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Testing / QA</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-purple-600">{testingCount}</span>
              <span className="text-xs text-slate-400 font-semibold">Review</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Selesai</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{doneCount}</span>
              <span className="text-xs text-slate-400 font-semibold">Done</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout: My Assigned Tasks vs Project Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Assigned Tasks Widget */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Tiket yang Ditugaskan ke Saya ({myTasks.length})
                </h3>
              </div>
              <Link
                href="/board"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Lihat di Board →
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2 flex-1">
              {myTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-xs font-semibold">Saat ini belum ada tiket yang ditugaskan ke Anda.</p>
                  <Link
                    href="/board"
                    className="inline-block mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Buka Board untuk Ambil Tiket
                  </Link>
                </div>
              ) : (
                myTasks.slice(0, 6).map(task => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {task.Project || 'General'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {task['Label ticket'] || 'Untitled Task'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>📅 {task.Tanggal || '-'}</span>
                        {task['Waktu Pengerjaan'] && <span>⏱️ {task['Waktu Pengerjaan']}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        (task.Status || '').toLowerCase().includes('done')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (task.Status || '').toLowerCase().includes('test')
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {task.Status || 'Ongoing'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Project Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="w-3 h-3 rounded-full bg-violet-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Distribusi per Proyek ({topProjects.length})
              </h3>
            </div>

            <div className="space-y-4 mt-4 flex-1">
              {topProjects.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada proyek.</p>
              ) : (
                topProjects.slice(0, 7).map(p => {
                  const percentage = Math.round((p.count / (tasks.length || 1)) * 100);
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 truncate">{p.name}</span>
                        <span className="text-slate-500 font-semibold">{p.count} tiket ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
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
