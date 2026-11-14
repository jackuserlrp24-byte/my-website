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
  unattending: string[];
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
