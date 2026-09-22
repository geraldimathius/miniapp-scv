'use client';

import React, { useState, FormEvent } from 'react';
import { User } from '../lib/users';
import { Task } from '../board-view';
import AppNav from '../components/app-nav';
import { FaCrown } from 'react-icons/fa';
import { FiCheckCircle, FiUpload } from 'react-icons/fi';

interface ProfileClientProps {
  currentUser: User;
  assignedTasks: Task[];
  pendingUsersCount?: number;
}

export default function ProfileClient({
  currentUser,
  assignedTasks,
  pendingUsersCount = 0,
}: ProfileClientProps) {
  const [user, setUser] = useState<User>(currentUser);
  const [name, setName] = useState<string>(currentUser.name);
  const [avatar, setAvatar] = useState<string>(currentUser.avatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setAvatar(data.url);
        showToast('Foto profil berhasil diupload!');
      } else {
        setErrorMessage(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saat mengunggah foto.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data);
        showToast('Profil berhasil diperbarui!');
      } else {
        setErrorMessage(data.error || 'Gagal memperbarui profil.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error jaringan.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal 6 karakter.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Kata sandi berhasil diubah!');
      } else {
        setErrorMessage(data.error || 'Gagal mengubah kata sandi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error jaringan.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map(x => x[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppNav user={user} pendingUsersCount={pendingUsersCount} />

      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pengaturan Profil & Keamanan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1">
            Kelola informasi data diri, foto avatar, dan kata sandi akun Anda.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Overview */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-50 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl ring-4 ring-indigo-50 shadow-md">
                  {getInitials(user.name)}
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                  Upload...
                </div>
              )}
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{user.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{user.email}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${user.role === 'master'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}>
                  {user.role === 'master' ? 'Master User' : 'Team Member'}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FiCheckCircle size={12} />
                  Aktif
                </span>
              </div>
            </div>

            {/* Upload Button */}
            <div className="w-full pt-2">
              <label className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                <FiUpload size={14} />
                <span>{isUploadingAvatar ? 'Mengunggah...' : 'Ganti Foto Avatar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Stats */}
            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Tiket Ditugaskan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{assignedTasks.length} Tiket</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Bergabung:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Edit Name & Profile Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                Informasi Data Diri
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Email (Tidak dapat diubah)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                Ubah Kata Sandi
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kata Sandi Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kata Sandi Baru (Min. 6 Karakter)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
