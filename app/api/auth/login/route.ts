import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/app/lib/users';
import { verifyPassword, createSession, setSessionCookie } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Email atau password salah.' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Email atau password salah.' }, { status: 401 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Akun Anda masih berstatus Menunggu Persetujuan (Pending) dari Master User. Harap hubungi Master User untuk approval.',
        statusType: 'pending',
      }, { status: 403 });
    }

    if (user.status === 'rejected') {
      return NextResponse.json({
        success: false,
        error: 'Akun Anda telah ditolak atau dinonaktifkan oleh Master User.',
        statusType: 'rejected',
      }, { status: 403 });
    }

    // Generate session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // Return safe user object (without password hash)
    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      data: safeUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem saat login.' }, { status: 500 });
  }
}
