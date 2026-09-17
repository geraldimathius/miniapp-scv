import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { updateUserStatus, updateUserRole, deleteUserById, getUserById } from '@/app/lib/users';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Master User yang dapat mengubah akun.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, role } = body;

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (status) {
      await updateUserStatus(id, status);
    }

    if (role) {
      // Prevent self-demotion if current user is modifying own role
      if (id === currentUser.id && role !== 'master') {
        return NextResponse.json({ success: false, error: 'Anda tidak dapat mendemosi role diri sendiri.' }, { status: 400 });
      }
      await updateUserRole(id, role);
    }

    const updated = await getUserById(id);
    return NextResponse.json({
      success: true,
      message: 'Data user berhasil diperbarui.',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Master User yang dapat menghapus akun.' }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json({ success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' }, { status: 400 });
    }

    const success = await deleteUserById(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
