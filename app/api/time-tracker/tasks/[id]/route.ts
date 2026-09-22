import { NextRequest, NextResponse } from 'next/server';
import { updateTrackedTask, deleteTrackedTask } from '@/app/lib/time-tracker-store';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const ok = await updateTrackedTask(id, body);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Task tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengupdate task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteTrackedTask(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Task tidak ditemukan atau sudah dihapus' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus task' },
      { status: 500 }
    );
  }
}
