import { NextRequest, NextResponse } from 'next/server';
import { getTasks, addTask, updateTask, deleteTask } from '@/app/lib/task-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body['Label ticket'] && !body.Project) {
      return NextResponse.json(
        { success: false, error: 'Project atau Judul Tiket harus diisi.' },
        { status: 400 }
      );
    }

    const newTask = await addTask(body);
    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID tiket diperlukan untuk update.' },
        { status: 400 }
      );
    }

    const updated = await updateTask(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Tiket tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Parameter ID diperlukan untuk menghapus tiket.' },
        { status: 400 }
      );
    }

    const success = await deleteTask(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Tiket tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Tiket berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
