import { NextResponse } from 'next/server';
import { syncLoas } from '@/lib/loa';

export const dynamic = 'force-dynamic';

// Called daily by Vercel Cron (see vercel.json): puts [LOA] on names when an LOA starts and removes it when it ends.
// If you set CRON_SECRET in Vercel, only requests carrying it are accepted.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await syncLoas();
  return NextResponse.json({ ok: true });
}
