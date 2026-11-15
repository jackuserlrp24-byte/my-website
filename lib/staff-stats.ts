import { supabaseAdmin } from '@/lib/portal';

export interface StaffStats {
  warns24: number;
  bans24: number;
  kicks24: number;
  actions7: number;
  openRequests: number;
  pendingAppeals: number;
  pendingGameActions: number;
}

const count = async (q: PromiseLike<{ count: number | null }>) => {
  try {
    return (await q).count ?? 0;
  } catch {
    return 0;
  }
};

/** Cheap head-only counts (no rows are downloaded). Any missing table just reads as 0. */
export async function getStaffStats(): Promise<StaffStats> {
  const now = Date.now();
  const d1 = new Date(now - 24 * 3600_000).toISOString();
  const d7 = new Date(now - 7 * 24 * 3600_000).toISOString();
  const logs = (type?: string, since = d1) => {
    let q = supabaseAdmin.from('moderation_logs').select('id', { count: 'exact', head: true }).gte('created_at', since);
    if (type) q = q.eq('action_type', type);
    return q;
  };
  const [warns24, bans24, kicks24, actions7, openRequests, pendingAppeals, pendingGameActions] = await Promise.all([
    count(logs('WARN')),
    count(logs('BAN')),
    count(logs('KICK')),
    count(logs(undefined, d7)),
    count(
      supabaseAdmin
        .from('staff_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .gte('created_at', new Date(now - 30 * 60_000).toISOString())
    ),
    count(supabaseAdmin.from('ban_appeals').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    count(supabaseAdmin.from('game_actions').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
  ]);
  return { warns24, bans24, kicks24, actions7, openRequests, pendingAppeals, pendingGameActions };
}
