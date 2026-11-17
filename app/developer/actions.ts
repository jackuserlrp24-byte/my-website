'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser } from '@/lib/portal';
import { getMaintenance, saveMaintenance } from '@/lib/maintenance';
import { MAINTENANCE_PANELS, schedulePhase, type MaintenanceSchedule, type MaintenanceState } from '@/lib/maintenance-config';
import { deleteNotices, getSchedule, runScheduleEffects, saveSchedule, syncNotices } from '@/lib/maintenance-schedule';
import { postMessage } from '@/lib/discord';
import { syncDivisionsEmbed } from '@/lib/divisions-sync';
import { LOG_CHANNEL_ID } from '@/lib/training-config';
import type { ActionResult } from '@/lib/portal-types';

export async function updateMaintenance(next: MaintenanceState): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can change maintenance mode.' };

  const before = await getMaintenance({ overlay: false });
  const saved = await saveMaintenance(next, user.name);
  if (!saved) return { ok: false, message: 'Could not save. Make sure the portal_settings table exists (run supabase/full-setup.sql).' };

  // Log what changed
  const changes: string[] = [];
  const word = (e: { on: boolean; mode?: string }) => (!e.on ? 'reopened' : e.mode === 'coming_soon' ? 'set to COMING SOON' : 'put under MAINTENANCE');
  const same = (a: { on: boolean; mode?: string }, b: { on: boolean; mode?: string }) => a.on === b.on && (!a.on || a.mode === b.mode);
  if (!same(before.site, next.site)) changes.push(`**Whole website:** ${word(next.site)}`);
  for (const p of MAINTENANCE_PANELS) {
    const b = before.panels[p.key] ?? { on: false };
    const n = next.panels[p.key] ?? { on: false };
    if (!same(b, n)) changes.push(`**${p.label}:** ${word(n)}`);
  }
  if (changes.length) {
    await postMessage(LOG_CHANNEL_ID, {
      embeds: [
        {
          title: 'MAINTENANCE MODE CHANGED',
          color: next.site.on ? 15548997 : 16705372,
          description: changes.join('\n'),
          fields: [{ name: 'Changed by', value: `${user.name} (<@${user.id}>)`, inline: true }],
          timestamp: new Date().toISOString(),
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }

  // Keep the Discord "Division Application Status" message in step: maintenance text now, the real list again when reopened.
  const wasDown = before.site.on || before.panels.divisions?.on;
  const isDown = next.site.on || next.panels.divisions?.on;
  if (wasDown !== isDown || (isDown && (before.panels.divisions?.message !== next.panels.divisions?.message || before.panels.divisions?.mode !== next.panels.divisions?.mode))) {
    await syncDivisionsEmbed();
  }

  revalidatePath('/', 'layout');
  return { ok: true, message: changes.length ? 'Saved. Changes are live now.' : 'Saved.' };
}

/** Re-posts / refreshes the Discord "Division Application Status" message (moves it if the channel changed). */
export async function refreshDivisionsMessage(): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can do this.' };
  const ok = await syncDivisionsEmbed();
  return ok
    ? { ok: true, message: 'Division status message updated in Discord.' }
    : { ok: false, message: 'Could not post the status message - check the bot can view and send in that channel.' };
}

export interface ScheduleInput {
  start_at: string; // ISO
  end_at: string | null; // ISO
  message: string;
  site: boolean;
  panels: string[];
  fivem: boolean;
  discord_channels: string[];
}

/** Creates (or replaces) the one scheduled maintenance. Start = now means "begin straight away". */
export async function scheduleMaintenance(input: ScheduleInput): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can schedule maintenance.' };

  const start = new Date(input.start_at);
  const end = input.end_at ? new Date(input.end_at) : null;
  if (Number.isNaN(start.getTime())) return { ok: false, message: 'Pick a start date and time.' };
  if (end && (Number.isNaN(end.getTime()) || end <= start)) return { ok: false, message: 'The end must be after the start.' };
  if (end && end.getTime() <= Date.now()) return { ok: false, message: 'The end time has already passed.' };

  const validPanels = new Set<string>(MAINTENANCE_PANELS.map((p) => p.key));
  const channels = Array.from(new Set(input.discord_channels.map((c) => c.trim()).filter(Boolean)));
  if (channels.some((c) => !/^\d{15,25}$/.test(c))) return { ok: false, message: 'Discord channel IDs must be numbers (right-click the channel > Copy Channel ID).' };
  const panels = input.panels.filter((k) => validPanels.has(k));
  if (!input.site && !panels.length && !input.fivem && !channels.length) return { ok: false, message: 'Pick at least one thing to put under maintenance.' };

  // Replacing an old schedule: tidy its Discord notices first.
  const old = await getSchedule();
  if (old) await deleteNotices(old);

  const next: MaintenanceSchedule = {
    id: crypto.randomUUID(),
    start_at: start.toISOString(),
    end_at: end ? end.toISOString() : null,
    message: input.message.trim().slice(0, 500),
    site: input.site,
    panels,
    fivem: input.fivem,
    discord_channels: channels,
    discord_msgs: {},
    created_by: user.name,
    cancelled: false,
    started_done: false,
    ended_done: false,
  };

  // Advance notice in Discord now (edited in place when it starts and ends).
  if (schedulePhase(next) === 'scheduled') await syncNotices(next, 'scheduled');
  if (!(await saveSchedule(next))) return { ok: false, message: 'Could not save. Make sure the portal_settings table exists (run supabase/full-setup.sql).' };

  await runScheduleEffects(); // start time already reached -> goes live immediately
  revalidatePath('/', 'layout');
  return { ok: true, message: schedulePhase(next) === 'scheduled' ? 'Maintenance scheduled.' : 'Maintenance started.' };
}

/** Cancels a schedule that has not started, or ends one that is running (everything reopens, Discord notice says complete). */
export async function endSchedule(): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can do this.' };
  const s = await getSchedule();
  if (!s) return { ok: false, message: 'Nothing is scheduled.' };

  const phase = schedulePhase(s);
  if (phase === 'scheduled') {
    await deleteNotices(s);
    await saveSchedule(null);
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Scheduled maintenance cancelled.' };
  }
  if (phase === 'active') {
    await saveSchedule({ ...s, end_at: new Date().toISOString() });
    await runScheduleEffects();
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Maintenance ended. Everything is open again.' };
  }
  await saveSchedule(null);
  return { ok: true, message: 'Cleared.' };
}
