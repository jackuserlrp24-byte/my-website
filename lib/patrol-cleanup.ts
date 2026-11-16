import { supabaseAdmin } from '@/lib/portal';
import { deleteMessageChecked } from '@/lib/discord';
import { londonLocalToUtc } from '@/lib/london-time';

// Same channel lib/patrol-post.ts posts to.
const PATROL_CHANNEL_ID = '1532786346920247398';
const PAUSE_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Patrol dates are free text ("Friday, 2 Oct", "2026-10-02", "02/10"). Best effort -> YYYY-MM-DD, or null. */
function parsePatrolDate(text: string | null, createdAt: Date): string | null {
  const t = (text || '').trim();
  if (!t) return null;
  const baseYear = createdAt.getUTCFullYear();

  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;

  let x = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }

  if (d === null) {
    x = t.match(/(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/);
    if (x) { d = +x[1]; m = +x[2]; if (x[3]) y = +x[3] < 100 ? 2000 + +x[3] : +x[3]; }
  }
  if (d === null) {
    x = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,9})/);
    if (x && MONTHS.includes(x[2].slice(0, 3).toLowerCase())) { d = +x[1]; m = MONTHS.indexOf(x[2].slice(0, 3).toLowerCase()) + 1; }
  }
  if (d === null) {
    x = t.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?/);
    if (x && MONTHS.includes(x[1].slice(0, 3).toLowerCase())) { m = MONTHS.indexOf(x[1].slice(0, 3).toLowerCase()) + 1; d = +x[2]; }
  }
  if (d === null || m === null || m < 1 || m > 12 || d < 1 || d > 31) return null;

  if (y === null) {
    const yearInText = t.match(/\b(20\d{2})\b/);
    y = yearInText ? +yearInText[1] : baseYear;
    // no year written: a date that is long before the post was made means next year
    if (!yearInText && Date.UTC(y, m - 1, d) < createdAt.getTime() - 45 * 86400_000) y += 1;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

const parseClock = (s: string | undefined): string | null => {
  const x = (s || '').match(/(\d{1,2})[:.]?(\d{2})/);
  if (!x || +x[1] > 23 || +x[2] > 59) return null;
  return `${pad(+x[1])}:${pad(+x[2])}`;
};

/** When the patrol is over. Unreadable date -> 24h after it was posted (same window the portal shows it for). */
function patrolEnd(p: { date: string | null; time: string | null; created_at: string }): Date {
  const created = new Date(p.created_at);
  const date = parsePatrolDate(p.date, created);
  if (!date) return new Date(created.getTime() + 24 * 3600_000);

  const [startRaw, endRaw] = (p.time || '').split('\n');
  const start = parseClock(startRaw);
  const end = parseClock(endRaw);
  if (!end) return londonLocalToUtc(date, '23:59');

  let endAt = londonLocalToUtc(date, end);
  if (start && end <= start) endAt = new Date(endAt.getTime() + 24 * 3600_000); // runs past midnight
  return endAt;
}

export interface PatrolCleanupResult {
  patrols: number; // finished patrols whose Discord post was removed
  failed: number;
}

/**
 * Clears the patrol channel of patrols that are concluded or whose end time has passed.
 * Only the patrol's own Discord post is deleted; the patrol stays on the website. Safe to run often.
 */
export async function clearFinishedPatrolPosts(): Promise<PatrolCleanupResult> {
  const result: PatrolCleanupResult = { patrols: 0, failed: 0 };

  const { data, error } = await supabaseAdmin
    .from('patrols')
    .select('id, discord_message_id, date, time, status, created_at')
    .not('discord_message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error || !data?.length) return result;

  const now = Date.now();
  for (const p of data as { id: string; discord_message_id: string; date: string | null; time: string | null; status: string | null; created_at: string }[]) {
    const finished = p.status === 'CONCLUDED' || patrolEnd(p).getTime() <= now;
    if (!finished) continue;

    if (await deleteMessageChecked(PATROL_CHANNEL_ID, p.discord_message_id)) {
      await supabaseAdmin.from('patrols').update({ discord_message_id: null }).eq('id', p.id);
      result.patrols++;
    } else {
      result.failed++; // left in place so tomorrow's run tries again
    }
    await sleep(PAUSE_MS);
  }
  return result;
}
