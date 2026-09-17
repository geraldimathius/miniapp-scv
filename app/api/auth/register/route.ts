import { NextRequest, NextResponse } from 'next/server';
import { countTotalUsers, getUserByEmail, createUser } from '@/app/lib/users';
import { hashPassword, createSession, setSessionCookie } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, avatar } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Email yang valid wajib diisi.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await getUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
    }

    const totalUsers = await countTotalUsers();
    const isFirstUser = totalUsers === 0;

    const role = isFirstUser ? 'master' : 'member';
    const status = isFirstUser ? 'approved' : 'pending';

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      status,
      avatar: avatar || undefined,
    });

    // If first user, auto approve & auto login
    if (isFirstUser) {
      const sessionId = await createSession(userId);
      await setSessionCookie(sessionId);

      return NextResponse.json({
        success: true,
        message: 'Registrasi berhasil! Anda terdaftar sebagai Master User pertama.',
        data: newUser,
        autoLogin: true,
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda sedang menunggu persetujuan (approval) dari Master User.',
      data: newUser,
      autoLogin: false,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem saat registrasi.' }, { status: 500 });
  }
}
