'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser } from '@/lib/portal';
import { getMaintenance, saveMaintenance } from '@/lib/maintenance';
import { MAINTENANCE_PANELS, type MaintenanceState } from '@/lib/maintenance-config';
import { postMessage } from '@/lib/discord';
import { syncDivisionsEmbed } from '@/lib/divisions-sync';
import { LOG_CHANNEL_ID } from '@/lib/training-config';
import type { ActionResult } from '@/lib/portal-types';

export async function updateMaintenance(next: MaintenanceState): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can change maintenance mode.' };

  const before = await getMaintenance();
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
