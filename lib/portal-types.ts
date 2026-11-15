export type ActionResult = { ok: boolean; message: string };

export interface Division {
  id: string;
  name: string;
  department: string;
  description: string | null;
  sort_order: number;
  status: 'open' | 'closed';
  application_url: string | null; // Google Form link, opened when someone clicks the division name
  closes_on?: string | null; // YYYY-MM-DD (UK date). The division closes itself once this day has finished.
  discord_role_id?: string | null; // given to the applicant on the Discord server when their application is accepted
}

export interface Training {
  id: string;
  title: string;
  division_id: string | null;
  host: string | null;
  starts_at: string;
  ends_at: string;
  description: string | null;
  image_url: string | null;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  attending: string[];
  attending_ids: string[]; // Discord IDs of everyone in `attending` (used to DM them on delays)
  unattending: string[]; // students who pressed "Can't make it"
  requires_ipp: boolean;
  delayed_minutes: number; // total minutes the session has been pushed back (0 = on time)
  delay_reason: string | null;
  original_starts_at: string | null; // set the first time a training is delayed
  cancelled_at?: string | null; // set when a trainer cancels the session
  cancel_reason?: string | null;
  created_at: string;
}

export interface DivisionApplication {
  id: string;
  division_id: string;
  discord_id: string;
  applicant_name: string;
  reason: string;
  experience: string | null;
  availability: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  divisions?: { name: string; department?: string } | null;
}

export interface RoleRequest {
  id: string;
  target_discord_id: string;
  target_name: string | null;
  role_key: string;
  reason: string | null;
  requested_by: string;
  requested_by_id: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  discord_message_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export type ModerationAction = 'NOTE' | 'WARN' | 'KICK' | 'BAN' | 'UNBAN';

// Same table the Management > Moderation Logs tab reads.
export interface ModerationLog {
  id: string | number;
  discord_id: string;
  username: string | null;
  action_type: ModerationAction;
  reason: string;
  moderator_name: string | null;
  created_at: string;
}

export interface GameAction {
  id: string;
  action: 'warn' | 'kick' | 'ban' | 'unban';
  target_discord_id: string;
  target_name: string | null;
  reason: string;
  duration_hours: number;
  requested_by: string;
  status: 'pending' | 'sent' | 'done' | 'failed' | 'expired';
  result: string | null;
  created_at: string;
  completed_at: string | null;
}
