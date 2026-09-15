import React from 'react';
import BoardView, { Task } from './board-view';
import { getTasks } from './lib/task-store';

// Force dynamic SSR so board data stays live
export const dynamic = 'force-dynamic';

export default async function ProjectBoard() {
  let tasks: Task[] = [];
  let errorMsg = '';

  try {
    tasks = await getTasks();
  } catch (error: any) {
    errorMsg = error.message || 'Gagal memuat data tiket.';
  }

  return <BoardView tasks={tasks} errorMsg={errorMsg} />;
}

