import { supabaseAdmin } from '@/lib/portal';
import { DIVISIONS_CHANNEL_ID, editMessage, postMessage } from '@/lib/discord';
import { divisionsMaintenancePayload, divisionsPayload } from '@/lib/embeds';
import { getMaintenance } from '@/lib/maintenance';
import type { Division } from '@/lib/portal-types';

const SETTING_KEY = 'divisions_message';

/**
 * Rebuilds the open/closed embed from the database and edits the existing
 * Discord message in place. If there is no message yet (or it was deleted),
 * a new one is posted and remembered.
 */
export async function syncDivisionsEmbed(): Promise<boolean> {
  const { data: divisions } = await supabaseAdmin
    .from('divisions')
    .select('*')
    .order('department', { ascending: true })
    .order('sort_order', { ascending: true });

  // While Divisions (or the whole website) is under maintenance the Discord message says so instead of the open / closed list.
  const maintenance = await getMaintenance();
  const down = maintenance.site.on || maintenance.panels.divisions?.on;
  const payload = down
    ? divisionsMaintenancePayload(maintenance.panels.divisions?.on ? maintenance.panels.divisions.message : maintenance.site.message)
    : divisionsPayload((divisions ?? []) as Division[]);

  const { data: setting } = await supabaseAdmin
    .from('portal_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle();

  const [savedChannel, savedMessage] = (setting?.value ?? '').split(':');
  if (savedMessage && savedChannel === DIVISIONS_CHANNEL_ID) {
    if (await editMessage(savedChannel, savedMessage, payload)) return true;
  }

  const messageId = await postMessage(DIVISIONS_CHANNEL_ID, payload);
  if (!messageId) return false;

  await supabaseAdmin
    .from('portal_settings')
    .upsert({ key: SETTING_KEY, value: `${DIVISIONS_CHANNEL_ID}:${messageId}`, updated_at: new Date().toISOString() });
  return true;
}
