import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from './lib/auth';
import { cookies } from 'next/headers';
import { getDictionary } from './lib/i18n';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'id';
  const dict = getDictionary(locale);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* Background glowing gradients */}
      <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-indigo-600/20 dark:from-indigo-600/30 via-violet-600/15 dark:via-violet-600/20 to-emerald-500/10 dark:to-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[400px] bg-gradient-to-br from-indigo-500/10 dark:from-indigo-500/15 to-teal-500/10 dark:to-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform">
              S
            </div>
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="font-black text-slate-900 dark:text-white tracking-tight text-base sm:text-lg leading-none truncate">
                SCV TimeHub
              </span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold tracking-wider uppercase truncate mt-0.5">
                Developer Time Tracker & Cloud DB
              </span>
            </div>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {currentUser ? (
              <>
                <Link
                  href="/timelogs"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all"
                  title={dict.landing.btn_timelogs}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="hidden xs:inline">{dict.landing.btn_timelogs}</span>
                  <span className="xs:hidden">Tracker</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-105 max-w-[120px] sm:max-w-[180px] truncate"
                >
                  <span className="truncate">{currentUser.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 hidden sm:inline">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  {dict.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all hover:scale-105"
                >
                  {dict.nav.register}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 max-w-6xl mx-auto text-center w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] sm:text-xs font-semibold mb-6 sm:mb-8 shadow-inner transition-colors max-w-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="truncate">{dict.landing.badge}</span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.18] sm:leading-[1.15] transition-colors max-w-4xl">
          {dict.landing.hero_title_1}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            {dict.landing.hero_title_2}
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed transition-colors px-2">
          {dict.landing.hero_desc}
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col xs:flex-row items-stretch xs:items-center justify-center gap-3 sm:gap-4 w-full xs:w-auto px-4 xs:px-0">
          {currentUser ? (
            <>
              <Link
                href="/timelogs"
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{dict.landing.btn_timelogs}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-sm font-extrabold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all hover:scale-105"
              >
                <span>{dict.landing.btn_dashboard.replace('{name}', currentUser.name)}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <span>{dict.landing.btn_login}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-sm font-extrabold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all hover:scale-105"
              >
                <span>{dict.landing.btn_register}</span>
              </Link>
            </>
          )}
        </div>

        {/* Highlight Stats Bar */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">{dict.landing.stat_sync}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{dict.landing.stat_sync_desc}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">{dict.landing.stat_teamwork}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{dict.landing.stat_teamwork_desc}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-200/60 dark:border-violet-800/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">{dict.landing.stat_monthly}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{dict.landing.stat_monthly_desc}</div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (4 Features) */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          {/* Card 1: Time Tracker & Monthly Kanban */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/50 shadow-sm transition-all hover:-translate-y-1">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-200/50 dark:border-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{dict.landing.feat_1_title}</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
              {dict.landing.feat_1_desc}
            </p>
          </div>

          {/* Card 2: Turso Cloud Database */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/50 shadow-sm transition-all hover:-translate-y-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-200/50 dark:border-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{dict.landing.feat_2_title}</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
              {dict.landing.feat_2_desc}
            </p>
          </div>

          {/* Card 3: Teamwork CSV Import/Export */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-violet-500/50 shadow-sm transition-all hover:-translate-y-1">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4 border border-violet-200/50 dark:border-violet-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{dict.landing.feat_3_title}</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
              {dict.landing.feat_3_desc}
            </p>
          </div>

          {/* Card 4: Visual Analytics & Conflict Inspector */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-pink-500/50 shadow-sm transition-all hover:-translate-y-1">
            <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-600/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4 border border-pink-200/50 dark:border-pink-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{dict.landing.feat_4_title}</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
              {dict.landing.feat_4_desc}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-600 transition-colors">
        <p>{dict.landing.footer.replace('{year}', new Date().getFullYear().toString())}</p>
      </footer>
    </div>
  );
}
