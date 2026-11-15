import { supabaseAdmin } from '@/lib/portal';
import type { GameAction } from '@/lib/portal-types';

export type GameActionType = GameAction['action'];

/** Puts a warn / kick / ban / unban in the queue. The CO-StaffMenu FiveM resource collects it within a few seconds. */
export async function queueGameAction(input: {
  action: GameActionType;
  targetDiscordId: string;
  targetName: string | null;
  reason: string;
  durationHours?: number;
  requestedBy: string;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const { data, error } = await supabaseAdmin
    .from('game_actions')
    .insert({
      action: input.action,
      target_discord_id: input.targetDiscordId,
      target_name: input.targetName,
      reason: input.reason,
      duration_hours: Math.max(0, Math.round(input.durationHours ?? 0)),
      requested_by: input.requestedBy,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('game_actions insert failed:', error);
    return { ok: false };
  }
  return { ok: true, id: data.id as string };
}
