import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { createTimeLog } from '@/app/lib/time-tracker-store';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (!body.taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId wajib disertakan.' },
        { status: 400 }
      );
    }

    const { taskId, ...logData } = body;
    const log = await createTimeLog(taskId, logData, user?.id);
    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    console.error('Error creating time log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menambahkan log waktu' },
      { status: 500 }
    );
  }
}
