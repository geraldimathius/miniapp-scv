import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';
import { getAllUsers } from '../lib/users';
import UsersClient from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Only master role can view this page
  if (user.role !== 'master') {
    redirect('/dashboard');
  }

  const allUsers = await getAllUsers();

  return <UsersClient currentUser={user} initialUsers={allUsers} />;
}
