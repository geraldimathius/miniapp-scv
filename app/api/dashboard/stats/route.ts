import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { getTasks } from '@/app/lib/task-store';
import { getApprovedUsers } from '@/app/lib/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const [tasks, users] = await Promise.all([
      getTasks(),
      getApprovedUsers(),
    ]);

    // Aggregate statistics
    const totalTasks = tasks.length;
    let ongoingCount = 0;
    let testingCount = 0;
    let doneCount = 0;
    let pendingCount = 0;
    let codeReviewCount = 0;
    let otherCount = 0;

    const myTasks = tasks.filter(t => {
      const pic = (t.PIC || t.Assignee || '').toLowerCase().trim();
      const myName = currentUser.name.toLowerCase().trim();
      const myEmail = currentUser.email.toLowerCase().trim();
      return pic === myName || pic === myEmail || pic.includes(myName) || (myEmail && pic.includes(myEmail));
    });

    const projectCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const t of tasks) {
      const s = (t.Status || 'Ongoing').trim().toLowerCase();
      if (s.includes('done') || s.includes('selesai') || s.includes('closed')) {
        doneCount++;
      } else if (s.includes('test') || s.includes('qa') || s.includes('qc') || s.includes('uat')) {
        testingCount++;
      } else if (s.includes('review')) {
        codeReviewCount++;
      } else if (s.includes('pending') || s.includes('hold') || s.includes('backlog') || s.includes('to do') || s.includes('todo')) {
        pendingCount++;
      } else if (s.includes('ongoing') || s.includes('in progress') || s.includes('progress') || s.includes('develop')) {
        ongoingCount++;
      } else {
        otherCount++;
      }

      const proj = (t.Project || 'General').trim();
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;

      const rawStatus = (t.Status || 'Ongoing').trim();
      statusCounts[rawStatus] = (statusCounts[rawStatus] || 0) + 1;
    }

    // Top projects sorted by task count
    const topProjects = Object.entries(projectCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Recent 6 tasks
    const recentTasks = tasks.slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        totalTasks,
        myTasksCount: myTasks.length,
        myTasks: myTasks.slice(0, 10),
        statusBreakdown: {
          ongoing: ongoingCount,
          testing: testingCount,
          done: doneCount,
          pending: pendingCount,
          codeReview: codeReviewCount,
          other: otherCount,
        },
        topProjects,
        recentTasks,
        teamCount: users.length,
        user: currentUser,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
