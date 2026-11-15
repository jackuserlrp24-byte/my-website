import { supabaseAdmin } from '@/lib/portal';
import {
  TRAININGS_CHANNEL_ID,
  deleteMessageChecked,
  getBotUserId,
  listChannelMessages,
} from '@/lib/discord';
import type { Training } from '@/lib/portal-types';

const PAUSE_MS = 400; // stay well inside Discord's rate limits
const MAX_SCAN_PAGES = 5; // 5 x 100 recent messages looked at for the bot's ping/delay replies
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TrainingCleanupResult {
  trainings: number; // finished trainings whose Discord post was removed
  replies: number; // the bot's delay/cancel ping replies removed with them
  failed: number;
}

/**
 * Clears the trainings channel of finished trainings.
 * - A training is "finished" once its end time has passed. Anything that ends in the future
 *   (a later date, or later today) is left completely alone.
 * - Only the training's own Discord post and the bot's replies to it (delay/cancel pings) are deleted.
 *   Other messages in the channel are never touched.
 * - The training stays on the website (history/calendar); only the Discord post goes.
 * Safe to run as often as you like.
 */
export async function clearFinishedTrainingPosts(): Promise<TrainingCleanupResult> {
  const result: TrainingCleanupResult = { trainings: 0, replies: 0, failed: 0 };

  const { data, error } = await supabaseAdmin
    .from('trainings')
    .select('id, discord_message_id, discord_channel_id, ends_at')
    .not('discord_message_id', 'is', null)
    .lte('ends_at', new Date().toISOString());
  if (error || !data?.length) return result;

  const finished = data as Pick<Training, 'id' | 'discord_message_id' | 'discord_channel_id' | 'ends_at'>[];

  // 1. The bot's delay/cancel ping replies that point at a finished training post.
  const finishedMessageIds = new Set(finished.map((t) => t.discord_message_id as string));
  const botId = await getBotUserId();
  if (botId) {
    let before: string | undefined;
    for (let page = 0; page < MAX_SCAN_PAGES; page++) {
      const msgs = await listChannelMessages(TRAININGS_CHANNEL_ID, before);
      if (!msgs.length) break;
      for (const m of msgs) {
        if (m.authorId === botId && m.referencesId && finishedMessageIds.has(m.referencesId)) {
          if (await deleteMessageChecked(TRAININGS_CHANNEL_ID, m.id)) result.replies++;
          else result.failed++;
          await sleep(PAUSE_MS);
        }
      }
      before = msgs[msgs.length - 1].id;
      if (msgs.length < 100) break;
    }
  }

  // 2. The training posts themselves.
  for (const t of finished) {
    const ok = await deleteMessageChecked(t.discord_channel_id || TRAININGS_CHANNEL_ID, t.discord_message_id as string);
    if (ok) {
      await supabaseAdmin.from('trainings').update({ discord_message_id: null }).eq('id', t.id);
      result.trainings++;
    } else {
      result.failed++; // left in place so tomorrow's run tries again
    }
    await sleep(PAUSE_MS);
  }

  return result;
}
