import { supabaseAdmin, type PortalUser } from '@/lib/portal';
import { getGuildMember, getMemberNick, postMessage, sendDm, setMemberNickname } from '@/lib/discord';
import { daysBetween, londonToday } from '@/lib/london-time';
import { LOA_LOG_CHANNEL_ID } from '@/lib/training-config';

export interface LoaRequest {
  id: string;
  discord_id: string;
  username: string | null;
  display_name: string | null;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'approved' | 'active' | 'declined' | 'ended' | 'cancelled';
  decision_note: string | null;
  original_nick: string | null;
  applied_nick: string | null;
  nickname_changed: boolean;
  created_at: string;
  ended_at: string | null;
}

export const LOA_TAG = ' [LOA]';
export const LOA_MAX_DAYS = 28; // longest single LOA
export const LOA_MAX_ADVANCE_DAYS = 14; // how far ahead it can start
const NICK_MAX = 32;

const COLOUR = { approved: 5763719, declined: 15548997, ended: 9807270 };
const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);

// ---------- "Is this good enough?" ----------

const LOW_EFFORT = ['idk', 'none', 'na', 'n a', 'nothing', 'personal', 'busy', 'because', 'just because', 'no reason', 'not sure', 'test', 'asdf', 'dont want to', 'break'];

/** Returns why a reason is not good enough, or null if it is fine. */
export function assessReason(reason: string): string | null {
  const r = reason.trim();
  if (r.length < 20) return 'The reason is too short - explain why you will be away (at least 20 characters).';

  const words = r.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 4) return 'The reason needs at least 4 words so command understands why you are away.';
  if (new Set(words).size < 4) return 'The reason repeats the same words - write a proper explanation.';
  if ((r.match(/[a-z]/gi) ?? []).length / r.length < 0.6) return 'The reason does not look like a real explanation.';
  if (/(.)\1{4,}/.test(r)) return 'The reason looks like spam - write a proper explanation.';

  const noVowel = words.filter((w) => w.length > 3 && !/[aeiouy]/.test(w)).length;
  if (noVowel / words.length > 0.4) return 'The reason does not look like real words.';

  const plain = r.toLowerCase().replace(/[^a-z' ]/g, '').trim();
  if (LOW_EFFORT.includes(plain)) return 'The reason is too vague - say what is keeping you away.';
  return null;
}

export interface LoaInput {
  reason: string;
  startDate: string;
  endDate: string;
}

/** All the automatic checks. Returns a decline reason, or null when the LOA is good enough to authorise. */
export async function assessLoa(userId: string, input: LoaInput): Promise<string | null> {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(input.startDate) || !iso.test(input.endDate)) return 'Pick a valid start and end date.';

  const today = londonToday();
  const fromToday = daysBetween(today, input.startDate);
  const length = daysBetween(input.startDate, input.endDate) + 1;

  if (fromToday < 0) return 'The start date cannot be in the past.';
  if (fromToday > LOA_MAX_ADVANCE_DAYS) return `An LOA can start at most ${LOA_MAX_ADVANCE_DAYS} days from now.`;
  if (length < 1) return 'The end date must be on or after the start date.';
  if (length > LOA_MAX_DAYS) return `An LOA can be at most ${LOA_MAX_DAYS} days. For longer, speak to management.`;

  const badReason = assessReason(input.reason);
  if (badReason) return badReason;

  const { data: existing } = await supabaseAdmin
    .from('loa_requests')
    .select('start_date,end_date')
    .eq('discord_id', userId)
    .in('status', ['approved', 'active']);
  const overlaps = (existing ?? []).some((e) => input.startDate <= e.end_date && input.endDate >= e.start_date);
  if (overlaps) return 'You already have an LOA that covers some of these dates.';

  return null;
}

// ---------- Nickname handling ----------

const stripTag = (nick: string) => (nick.endsWith(LOA_TAG) ? nick.slice(0, -LOA_TAG.length) : nick);

async function applyNickname(row: LoaRequest, fallbackName: string) {
  const current = await getMemberNick(row.discord_id);
  if (current === undefined) return { changed: false, original: null as string | null, applied: null as string | null };
  const base = stripTag(current ?? fallbackName);
  const applied = `${base.slice(0, NICK_MAX - LOA_TAG.length)}${LOA_TAG}`;
  const changed = await setMemberNickname(row.discord_id, applied);
  return { changed, original: current ? stripTag(current) : null, applied: changed ? applied : null };
}

async function restoreNickname(row: LoaRequest): Promise<boolean | null> {
  if (!row.nickname_changed || !row.applied_nick) return null; // nothing was changed
  const current = await getMemberNick(row.discord_id);
  if (current === undefined) return null; // they left the server
  if (current !== row.applied_nick) return null; // they already changed it themselves - leave it alone
  return setMemberNickname(row.discord_id, row.original_nick);
}

// ---------- Logging + DMs ----------

async function logLoa(kind: 'approved' | 'declined' | 'ended', row: LoaRequest, extra: { title: string; lines: string[]; nickname?: string }) {
  await postMessage(LOA_LOG_CHANNEL_ID, {
    embeds: [
      {
        title: extra.title,
        description: extra.lines.join('\n'),
        color: COLOUR[kind],
        fields: [
          { name: 'Command member', value: `<@${row.discord_id}>\n${row.username ? `@${row.username}` : ''} (\`${row.discord_id}\`)`, inline: true },
          { name: 'Dates', value: `${row.start_date} → ${row.end_date}`, inline: true },
          { name: 'Reason', value: clip(row.reason, 1000), inline: false },
          ...(extra.nickname ? [{ name: 'Discord name', value: extra.nickname, inline: false }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });
}

async function dmLoa(row: LoaRequest, title: string, text: string, kind: 'approved' | 'declined' | 'ended') {
  await sendDm(row.discord_id, { embeds: [{ title, description: text, color: COLOUR[kind] }] });
}

// ---------- Submit ----------

export async function submitLoa(user: PortalUser, input: LoaInput): Promise<{ ok: boolean; message: string }> {
  const reason = input.reason.trim().slice(0, 500);
  const clean = { ...input, reason };
  const declineReason = await assessLoa(user.id, clean);
  const member = await getGuildMember(user.id);

  const base = {
    discord_id: user.id,
    username: member?.username ?? null,
    display_name: user.name,
    reason,
    start_date: clean.startDate,
    end_date: clean.endDate,
  };

  // Malformed dates can't be stored - tell the user without a record.
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean.startDate) === false || /^\d{4}-\d{2}-\d{2}$/.test(clean.endDate) === false) {
    return { ok: false, message: declineReason ?? 'Pick a valid start and end date.' };
  }

  if (declineReason) {
    const { data } = await supabaseAdmin.from('loa_requests').insert({ ...base, status: 'declined', decision_note: declineReason }).select('*').single();
    if (data) {
      const row = data as LoaRequest;
      await logLoa('declined', row, { title: 'LOA declined', lines: [`**${user.name}** asked for an LOA and the portal declined it.`, `**Why:** ${declineReason}`] });
      await dmLoa(row, 'Your LOA was declined', `${declineReason}\n\nFix it and submit again on the portal (Command > Leave of Absence).`, 'declined');
    }
    return { ok: false, message: `LOA declined: ${declineReason}` };
  }

  const { data, error } = await supabaseAdmin
    .from('loa_requests')
    .insert({ ...base, status: 'approved', decision_note: 'Passed the automatic checks.' })
    .select('*')
    .single();
  if (error || !data) {
    console.error('LOA insert failed:', error);
    return { ok: false, message: 'Could not save the LOA. Have you run supabase/full-setup.sql?' };
  }

  // Starts today? Activate straight away (puts [LOA] on their Discord name). Otherwise it activates on its start date.
  await syncLoas();
  const { data: fresh } = await supabaseAdmin.from('loa_requests').select('*').eq('id', (data as LoaRequest).id).single();
  const row = (fresh ?? data) as LoaRequest;

  const startsToday = row.status === 'active';
  const nickLine = startsToday
    ? row.nickname_changed
      ? `Discord name changed to **${row.applied_nick}**.`
      : 'Could not change the Discord name (the bot needs Manage Nicknames and a role above theirs).'
    : `Their Discord name will get [LOA] on ${row.start_date}.`;

  await logLoa('approved', row, {
    title: 'LOA approved',
    lines: [`**${user.name}** is on leave. The portal checked and authorised it.`, nickLine],
    nickname: row.applied_nick ?? undefined,
  });
  await dmLoa(row, 'Your LOA was approved', `${row.start_date} → ${row.end_date}.\n${nickLine}\n\nYour name goes back to normal automatically when it ends.`, 'approved');

  return { ok: true, message: `LOA approved (${row.start_date} → ${row.end_date}). ${nickLine}` };
}

// ---------- Activate / expire ----------

/** Starts approved LOAs whose date has arrived and ends active ones that are over. Safe to call as often as you like. */
export async function syncLoas(): Promise<void> {
  const today = londonToday();

  // 1. Start
  const { data: due } = await supabaseAdmin.from('loa_requests').select('*').eq('status', 'approved').lte('start_date', today);
  for (const r of (due ?? []) as LoaRequest[]) {
    if (r.end_date < today) {
      await supabaseAdmin.from('loa_requests').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', r.id).eq('status', 'approved');
      continue;
    }
    // Claim it first so two page loads can't both apply it.
    const { data: claimed } = await supabaseAdmin.from('loa_requests').update({ status: 'active' }).eq('id', r.id).eq('status', 'approved').select('*').maybeSingle();
    if (!claimed) continue;
    const { changed, original, applied } = await applyNickname(r, r.display_name || r.username || 'Member');
    await supabaseAdmin.from('loa_requests').update({ nickname_changed: changed, original_nick: original, applied_nick: applied }).eq('id', r.id);
  }

  // 2. End
  const { data: over } = await supabaseAdmin.from('loa_requests').select('*').eq('status', 'active').lt('end_date', today);
  for (const r of (over ?? []) as LoaRequest[]) await finishLoa(r, 'ended', 'LOA ended', `<@${r.discord_id}>'s leave has finished.`);
}

async function finishLoa(r: LoaRequest, status: 'ended' | 'cancelled', title: string, line: string) {
  const { data: claimed } = await supabaseAdmin
    .from('loa_requests')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', r.id)
    .in('status', ['active', 'approved'])
    .select('*')
    .maybeSingle();
  if (!claimed) return;

  const restored = await restoreNickname(r);
  const nickLine = restored === true ? 'Discord name restored.' : restored === false ? 'Could not restore the Discord name - please remove [LOA] manually.' : 'Discord name left as it is.';
  await logLoa('ended', r, { title, lines: [line, nickLine] });
  await dmLoa(r, title, `${nickLine}`, 'ended');
}

/** Member (or management) ends their LOA early. */
export async function endLoaEarly(user: PortalUser, id: string): Promise<{ ok: boolean; message: string }> {
  const { data } = await supabaseAdmin.from('loa_requests').select('*').eq('id', id).maybeSingle();
  if (!data) return { ok: false, message: 'LOA not found.' };
  const r = data as LoaRequest;
  if (r.discord_id !== user.id && !user.isManagement) return { ok: false, message: 'You can only end your own LOA.' };
  if (r.status !== 'active' && r.status !== 'approved') return { ok: false, message: 'This LOA is not running.' };
  await finishLoa(r, 'cancelled', 'LOA ended early', `<@${r.discord_id}> is back from leave early.`);
  return { ok: true, message: 'LOA ended. Welcome back.' };
}
