'use client';

import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../lib/users';
import AppNav from '../components/app-nav';
import { useTranslation } from '../lib/i18n/LanguageProvider';
import { FaCrown } from 'react-icons/fa';
import { FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

export interface UsersClientProps {
  currentUser: User;
  initialUsers: User[];
}

export default function UsersClient({ currentUser, initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(prev => prev.map(u => (u.id === userId ? data.data : u)));
        showToast(`Status user berhasil diubah menjadi ${newStatus}.`);
      } else {
        showToast(`Gagal: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(prev => prev.map(u => (u.id === userId ? data.data : u)));
        showToast(`Role user berhasil diubah menjadi ${newRole}.`);
      } else {
        showToast(`Gagal: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user "${userName}"?`)) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        showToast(`User "${userName}" berhasil dihapus.`);
      } else {
        showToast(`Gagal: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;

  const filteredUsers = users.filter(u => {
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    const matchQuery =
      searchQuery.trim() === '' ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppNav user={currentUser} pendingUsersCount={pendingCount} />

      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('users', 'title')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                {t('users', 'subtitle')}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1">
              {t('users', 'desc')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
            <span>{t('users', 'total', { count: users.length })}</span>
            <span>•</span>
            <span className={pendingCount > 0 ? 'text-amber-600 font-extrabold' : ''}>
              {t('users', 'pending', { count: pendingCount })}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                }`}
            >
              {t('users', 'tab_all', { count: users.length })}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                }`}
            >
              {t('users', 'tab_pending', { count: pendingCount })}
              {pendingCount > 0 && (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-1.5 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                }`}
            >
              {t('users', 'tab_approved', { count: users.filter(u => u.status === 'approved').length })}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                }`}
            >
              {t('users', 'tab_rejected', { count: users.filter(u => u.status === 'rejected').length })}
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('users', 'search_placeholder')}
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
            />
          </div>
        </div>

        {/* Users Table / List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t('users', 'th_user')}</th>
                  <th className="py-3.5 px-4">{t('users', 'th_email')}</th>
                  <th className="py-3.5 px-4">{t('users', 'th_role')}</th>
                  <th className="py-3.5 px-4">{t('users', 'th_status')}</th>
                  <th className="py-3.5 px-4">{t('users', 'th_date')}</th>
                  <th className="py-3.5 px-4 text-right">{t('users', 'th_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                      {t('users', 'empty')}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isSelf = u.id === currentUser.id;
                    const isLoading = actionLoadingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
                                {getInitials(u.name)}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                    {t('users', 'you')}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{u.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
                          {u.email}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.role === 'master'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}>
                            {u.role === 'master' ? <FaCrown size={12} /> : null}
                            {u.role === 'master' ? 'Master' : 'Member'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : u.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {u.status === 'approved' && <FiCheckCircle size={12} />}
                            {u.status === 'pending' && <FiClock size={12} />}
                            {u.status === 'rejected' && <FiXCircle size={12} />}
                            {u.status === 'approved' ? t('users', 'status_approved') : u.status === 'pending' ? t('users', 'status_pending') : t('users', 'status_rejected')}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {isLoading ? (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">{t('users', 'processing')}</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* If Pending: Show Approve & Reject */}
                              {u.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(u.id, 'approved')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                                    title="Setujui pengguna"
                                  >
                                    {t('users', 'btn_approve')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(u.id, 'rejected')}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                                    title="Tolak pendaftaran"
                                  >
                                    {t('users', 'btn_reject')}
                                  </button>
                                </>
                              )}

                              {/* If Rejected: Show Re-Approve */}
                              {u.status === 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(u.id, 'approved')}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] transition-colors"
                                >
                                  {t('users', 'btn_reapprove')}
                                </button>
                              )}

                              {/* Role Toggle for other approved users */}
                              {u.status === 'approved' && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRole(u.id, u.role === 'master' ? 'member' : 'master')}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                                  title={u.role === 'master' ? 'Ubah ke Member biasa' : 'Jadikan Master User'}
                                >
                                  {u.role !== 'master' && <FaCrown size={12} />}
                                  {u.role === 'master' ? t('users', 'btn_make_member') : t('users', 'btn_make_master')}
                                </button>
                              )}

                              {/* Delete Button (cannot delete self) */}
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                  title="Hapus user ini"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
