import React from 'react';
import Papa from 'papaparse';
import BoardView, { Task } from './board-view';

// Force dynamic SSR so board data stays live with Google Sheets
export const dynamic = 'force-dynamic';

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

  return <BoardView tasks={tasks} errorMsg={errorMsg} />;
}
