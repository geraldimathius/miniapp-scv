import { NextResponse } from 'next/server';
import { syncFromGoogleSheet } from '@/app/lib/task-store';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const tasks = await syncFromGoogleSheet();
    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${tasks.length} tiket dari Google Sheet.`,
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
