import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { getTasks } from '../lib/task-store';
import { getAllUsers } from '../lib/users';
import ProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [tasks, allUsers] = await Promise.all([
    getTasks(),
    user.role === 'master' ? getAllUsers() : Promise.resolve([]),
  ]);

  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;

  const myName = user.name.toLowerCase().trim();
  const myEmail = user.email.toLowerCase().trim();

  const assignedTasks = tasks.filter(t => {
    const pic = (t.PIC || t.Assignee || '').toLowerCase().trim();
    return pic === myName || pic === myEmail || pic.includes(myName) || (myEmail && pic.includes(myEmail));
  });

  return (
    <ProfileClient
      currentUser={user}
      assignedTasks={assignedTasks}
      pendingUsersCount={pendingUsersCount}
    />
  );
}
