import { supabaseAdmin } from '@/lib/portal';
import { postMessage, editMessage, deleteMessage } from '@/lib/discord';
import { LOG_CHANNEL_ID } from '@/lib/training-config';
import { syncDivisionsEmbed } from '@/lib/divisions-sync';
import { MAINTENANCE_PANELS, SCHEDULE_KEY, parseSchedule, schedulePhase, type MaintenanceSchedule } from '@/lib/maintenance-config';

const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

export async function getSchedule(): Promise<MaintenanceSchedule | null> {
  try {
    const { data } = await supabaseAdmin.from('portal_settings').select('value').eq('key', SCHEDULE_KEY).maybeSingle();
    return parseSchedule(data?.value);
  } catch {
    return null;
  }
}

export async function saveSchedule(s: MaintenanceSchedule | null): Promise<boolean> {
  const { error } = s
    ? await supabaseAdmin.from('portal_settings').upsert({ key: SCHEDULE_KEY, value: JSON.stringify(s), updated_at: new Date().toISOString() })
    : await supabaseAdmin.from('portal_settings').delete().eq('key', SCHEDULE_KEY);
  if (error) console.error('saveSchedule failed:', error);
  return !error;
}

// ---------- Discord notice (one message per channel, edited through scheduled -> active -> done) ----------

function noticePayload(s: MaintenanceSchedule, phase: 'scheduled' | 'active' | 'ended' | 'cancelled') {
  const start = unix(s.start_at);
  const end = s.end_at ? unix(s.end_at) : null;
  const scope = [
    s.site ? 'Whole website' : null,
    ...s.panels.map((k) => MAINTENANCE_PANELS.find((p) => p.key === k)?.label ?? k),
    s.fivem ? 'FiveM server' : null,
  ].filter(Boolean) as string[];
  const note = s.message.trim();

  const base = {
    scheduled: { title: 'SCHEDULED MAINTENANCE', color: 16705372, text: `Maintenance is scheduled to begin <t:${start}:R>.` },
    active: { title: 'UNDER MAINTENANCE', color: 15548997, text: 'We are currently under maintenance. Sorry for any inconvenience - please check back soon.' },
    ended: { title: 'MAINTENANCE COMPLETE', color: 5763719, text: 'Maintenance is finished and everything is back online. Thank you for your patience.' },
    cancelled: { title: 'MAINTENANCE CANCELLED', color: 5793266, text: 'The scheduled maintenance has been cancelled.' },
  }[phase];

  const fields = [
    { name: 'Starts', value: `<t:${start}:F>`, inline: true },
    { name: 'Expected back', value: end ? `<t:${end}:F>` : 'To be confirmed', inline: true },
    ...(scope.length ? [{ name: 'Affected', value: scope.map((x) => `• ${x}`).join('\n'), inline: false }] : []),
    ...(note ? [{ name: 'Note', value: note, inline: false }] : []),
  ];

  return {
    embeds: [{ title: base.title, description: base.text, color: base.color, fields, footer: { text: 'Central Operations' }, timestamp: new Date().toISOString() }],
    allowed_mentions: { parse: [] },
  };
}

type Phase = Parameters<typeof noticePayload>[1];

/** Posts the notice in every channel (or edits the one already there). Stores the message IDs on the schedule. */
export async function syncNotices(s: MaintenanceSchedule, phase: Phase): Promise<void> {
  const payload = noticePayload(s, phase);
  for (const ch of s.discord_channels) {
    const existing = s.discord_msgs[ch];
    if (existing && (await editMessage(ch, existing, payload))) continue;
    const id = await postMessage(ch, payload);
    if (id) s.discord_msgs[ch] = id;
  }
}

export async function deleteNotices(s: MaintenanceSchedule): Promise<void> {
  for (const [ch, id] of Object.entries(s.discord_msgs)) await deleteMessage(ch, id);
  s.discord_msgs = {};
}

async function logSchedule(title: string, s: MaintenanceSchedule, color: number) {
  await postMessage(LOG_CHANNEL_ID, {
    embeds: [
      {
        title,
        color,
        description: `Starts <t:${unix(s.start_at)}:F>${s.end_at ? ` - ends <t:${unix(s.end_at)}:F>` : ''}`,
        fields: [{ name: 'Scheduled by', value: s.created_by, inline: true }],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });
}

/**
 * Runs the Discord / log side of a schedule when its start or end time has passed. Safe to call from anywhere, as
 * often as you like: it claims the work with an optimistic update so two callers never post twice.
 * (The website + FiveM side needs no trigger: it is worked out from the clock on every request.)
 */
export async function runScheduleEffects(): Promise<void> {
  const { data } = await supabaseAdmin.from('portal_settings').select('value, updated_at').eq('key', SCHEDULE_KEY).maybeSingle();
  const s = parseSchedule(data?.value);
  if (!s || !data) return;

  const phase = schedulePhase(s);
  const needStart = phase === 'active' && !s.started_done;
  const needEnd = phase === 'ended' && !s.ended_done;
  if (!needStart && !needEnd) return;

  // Claim it: only one caller can move updated_at forward from the value it read.
  const next: MaintenanceSchedule = { ...s, discord_msgs: { ...s.discord_msgs }, started_done: true, ended_done: phase === 'ended' ? true : s.ended_done };
  const { data: claimed } = await supabaseAdmin
    .from('portal_settings')
    .update({ value: JSON.stringify(next), updated_at: new Date().toISOString() })
    .eq('key', SCHEDULE_KEY)
    .eq('updated_at', data.updated_at)
    .select('key');
  if (!claimed?.length) return;

  const wasLive = s.started_done;
  if (needStart || (needEnd && wasLive)) {
    await syncNotices(next, phase === 'ended' ? 'ended' : 'active');
    if (needStart) await logSchedule('SCHEDULED MAINTENANCE STARTED', next, 15548997);
    else await logSchedule('SCHEDULED MAINTENANCE ENDED', next, 5763719);
  }
  // The Discord "Division Application Status" message follows the maintenance state.
  if (next.site || next.panels.includes('divisions')) await syncDivisionsEmbed();

  await supabaseAdmin.from('portal_settings').update({ value: JSON.stringify(next) }).eq('key', SCHEDULE_KEY);
}
