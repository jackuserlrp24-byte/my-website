import { supabaseAdmin } from '@/lib/portal';

export interface OfficerOption {
  discord_id: string;
  label: string; // "[1234] RP Name"
}

/** Whitelisted officers for "assign to" / "send to" drop-downs. */
export async function getOfficerOptions(): Promise<OfficerOption[]> {
  const { data } = await supabaseAdmin.from('user_whitelists').select('discord_id, rp_name, collar_number').order('collar_number', { ascending: true }).limit(1000);
  return (data ?? [])
    .filter((r) => r.discord_id)
    .map((r) => ({ discord_id: String(r.discord_id), label: `${r.collar_number ? `[${r.collar_number}] ` : ''}${r.rp_name || 'Unknown'}` }));
}

/** Look up one officer's name by Discord ID (used when command picks someone from a list). */
export const nameFor = (options: OfficerOption[], id: string) => options.find((o) => o.discord_id === id)?.label ?? null;
