import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { bulkSyncTimeTracker } from '@/app/lib/time-tracker-store';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const mode = body.mode === 'replace' ? 'replace' : 'merge';

    const result = await bulkSyncTimeTracker(tasks, user?.id, mode);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error syncing time tracker:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyinkronkan data time tracker' },
      { status: 500 }
    );
  }
}
