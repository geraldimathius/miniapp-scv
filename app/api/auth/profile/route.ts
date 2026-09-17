import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword } from '@/app/lib/auth';
import { getUserByEmail, updateUserProfile } from '@/app/lib/users';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Harap login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatar, currentPassword, newPassword } = body;

    const updates: { name?: string; avatar?: string; passwordHash?: string } = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }

    if (avatar !== undefined) {
      updates.avatar = avatar || '';
    }

    // Password change request
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: 'Password saat ini wajib diisi untuk mengubah password.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }

      const fullUser = await getUserByEmail(user.email);
      if (!fullUser) {
        return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
      }

      const isMatch = await verifyPassword(currentPassword, fullUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Password saat ini salah.' }, { status: 400 });
      }

      updates.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await updateUserProfile(user.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
