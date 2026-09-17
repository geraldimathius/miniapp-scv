import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { getAllUsers, getApprovedUsers } from '@/app/lib/users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // If requesting all users (management view), verify master role
    if (type === 'all') {
      if (user.role !== 'master') {
        return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Master User yang dapat melihat semua akun.' }, { status: 403 });
      }
      const users = await getAllUsers();
      return NextResponse.json({ success: true, data: users });
    }

    // Default: return approved users for assignee dropdowns
    const approvedUsers = await getApprovedUsers();
    return NextResponse.json({ success: true, data: approvedUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
