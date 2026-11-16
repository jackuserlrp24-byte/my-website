import { supabaseAdmin } from '@/lib/portal';
import { postMessage } from '@/lib/discord';
import { AOP_LOG_CHANNEL_ID } from '@/lib/training-config';

const KEY = 'aop';

export type AopState = { aop: string; by: string | null; stamp: string };

/** The AOP currently set for the FiveM server (null until somebody has set one). */
export async function getAop(): Promise<AopState | null> {
  try {
    const { data } = await supabaseAdmin.from('portal_settings').select('value, updated_at').eq('key', KEY).maybeSingle();
    if (!data?.value) return null;
    const parsed = JSON.parse(data.value) as { aop?: unknown; by?: unknown };
    if (typeof parsed.aop !== 'string' || !parsed.aop) return null;
    return { aop: parsed.aop, by: typeof parsed.by === 'string' ? parsed.by : null, stamp: String(data.updated_at) };
  } catch {
    return null;
  }
}

/** Saves the AOP. The game server picks it up within ~10 seconds. Returns the new version stamp, or null on failure. */
export async function saveAop(aop: string, by: string): Promise<string | null> {
  const stamp = new Date().toISOString();
  const prior = await getAop();
  const { error } = await supabaseAdmin
    .from('portal_settings')
    .upsert({ key: KEY, value: JSON.stringify({ aop: aop.slice(0, 200), by: by.slice(0, 80) }), updated_at: stamp });
  if (error) {
    console.error('saveAop failed:', error);
    return null;
  }

  // AOP log (staff panel and in-game changes both end up here). Never blocks or fails the save.
  try {
    const previous = prior?.aop;
    await postMessage(AOP_LOG_CHANNEL_ID, {
      embeds: [
        {
          title: 'AOP CHANGED',
          color: 5793266,
          fields: [
            { name: 'New AOP', value: aop.slice(0, 200), inline: true },
            ...(previous ? [{ name: 'Previous AOP', value: previous.slice(0, 200), inline: true }] : []),
            { name: 'Changed by', value: by.slice(0, 80), inline: true },
          ],
          timestamp: stamp,
        },
      ],
      allowed_mentions: { parse: [] },
    });
  } catch (err) {
    console.error('AOP log failed:', err);
  }
  return stamp;
}
