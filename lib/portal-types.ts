export type ActionResult = { ok: boolean; message: string };

export interface Division {
  id: string;
  name: string;
  department: string;
  description: string | null;
  sort_order: number;
  status: 'open' | 'closed';
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
  unattending: string[]; // legacy, no longer used
  requires_ipp: boolean;
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
  divisions?: { name: string } | null;
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
