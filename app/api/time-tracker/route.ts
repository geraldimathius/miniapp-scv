import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { getTimeTrackerTasks } from '@/app/lib/time-tracker-store';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tasks = await getTimeTrackerTasks(user?.id);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error fetching time tracker tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data time tracker' },
      { status: 500 }
    );
  }
}
