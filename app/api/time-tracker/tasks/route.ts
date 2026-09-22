import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { createTrackedTask } from '@/app/lib/time-tracker-store';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (!body.title || !body.taskDescription) {
      return NextResponse.json(
        { success: false, error: 'Judul dan deskripsi task wajib diisi.' },
        { status: 400 }
      );
    }

    const task = await createTrackedTask(body, user?.id);
    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat task' },
      { status: 500 }
    );
  }
}
