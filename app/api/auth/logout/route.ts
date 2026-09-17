import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie, deleteSession, SESSION_COOKIE_NAME } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      await deleteSession(sessionToken);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: 'Berhasil keluar (logout).' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
