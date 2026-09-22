import { NextRequest, NextResponse } from 'next/server';
import { updateTimeLog, deleteTimeLog } from '@/app/lib/time-tracker-store';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const ok = await updateTimeLog(id, body);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Log waktu tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating time log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengupdate log waktu' },
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
    const ok = await deleteTimeLog(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Log waktu tidak ditemukan atau sudah dihapus' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting time log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus log waktu' },
      { status: 500 }
    );
  }
}
