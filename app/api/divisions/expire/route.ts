import { NextResponse } from 'next/server';
import { closeExpiredDivisions } from '@/lib/division-deadlines';

export const dynamic = 'force-dynamic';

// Called daily by Vercel Cron (see vercel.json): closes divisions whose "closes on" date has passed.
// If you set CRON_SECRET in Vercel, only requests carrying it are accepted.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const closed = await closeExpiredDivisions();
  return NextResponse.json({ ok: true, closed });
}
