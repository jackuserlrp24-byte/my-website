import { supabaseAdmin } from '@/lib/portal';
import { DIVISIONS_CHANNEL_ID, editMessage, postMessage } from '@/lib/discord';
import { divisionsPayload } from '@/lib/embeds';
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

  const payload = divisionsPayload((divisions ?? []) as Division[]);

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
