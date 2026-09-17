import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { getTasks } from '../lib/task-store';
import { getApprovedUsers, getAllUsers } from '../lib/users';
import BoardView from '../board-view';

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [tasks, approvedUsers, allUsers] = await Promise.all([
    getTasks(),
    getApprovedUsers(),
    user.role === 'master' ? getAllUsers() : Promise.resolve([]),
  ]);

  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;

  return (
    <BoardView
      tasks={tasks}
      currentUser={user}
      usersList={approvedUsers}
      pendingUsersCount={pendingUsersCount}
    />
  );
}
