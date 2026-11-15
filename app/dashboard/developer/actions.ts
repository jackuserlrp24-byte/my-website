'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser } from '@/lib/portal';
import { getMaintenance, saveMaintenance } from '@/lib/maintenance';
import { MAINTENANCE_PANELS, type MaintenanceState } from '@/lib/maintenance-config';
import { postMessage } from '@/lib/discord';
import { MODERATION_LOG_CHANNEL_ID } from '@/lib/training-config';
import type { ActionResult } from '@/lib/portal-types';

export async function updateMaintenance(next: MaintenanceState): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isDeveloper) return { ok: false, message: 'Only founders and developers can change maintenance mode.' };

  const before = await getMaintenance();
  const saved = await saveMaintenance(next, user.name);
  if (!saved) return { ok: false, message: 'Could not save. Make sure the portal_settings table exists (run supabase/full-setup.sql).' };

  // Log what changed
  const changes: string[] = [];
  if (before.site.on !== next.site.on) changes.push(`**Whole website:** ${next.site.on ? 'put under maintenance' : 'reopened'}`);
  for (const p of MAINTENANCE_PANELS) {
    if (before.panels[p.key]?.on !== !!next.panels[p.key]?.on) {
      changes.push(`**${p.label}:** ${next.panels[p.key]?.on ? 'closed for maintenance' : 'reopened'}`);
    }
  }
  if (changes.length) {
    await postMessage(MODERATION_LOG_CHANNEL_ID, {
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

  revalidatePath('/', 'layout');
  return { ok: true, message: changes.length ? 'Saved. Changes are live now.' : 'Saved.' };
}
