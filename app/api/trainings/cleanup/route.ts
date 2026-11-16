import { NextResponse } from 'next/server';
import { clearFinishedTrainingPosts } from '@/lib/training-cleanup';
import { clearFinishedPatrolPosts } from '@/lib/patrol-cleanup';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const londonHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

// Clears finished / completed trainings AND finished patrols out of their Discord channels.
// Called by Vercel Cron (see vercel.json) at 23:00 and 00:00 UTC. Only the run that lands on
// midnight UK time (GMT or BST) does anything, so it is always midnight in London.
// Add ?force=1 (with the CRON_SECRET if you set one) to run it by hand for testing.
// If you set CRON_SECRET in Vercel, only requests carrying it are accepted.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  if (!force && londonHour() !== 0) {
    return NextResponse.json({ ok: true, skipped: 'not midnight in London' });
  }

  const [trainings, patrols] = await Promise.all([clearFinishedTrainingPosts(), clearFinishedPatrolPosts()]);
  return NextResponse.json({ ok: true, ...trainings, patrolPosts: patrols.patrols, patrolsFailed: patrols.failed });
}
