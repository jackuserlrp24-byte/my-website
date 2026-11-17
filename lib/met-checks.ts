import { supabaseAdmin } from '@/lib/portal';

export interface PncPerson {
  id: string;
  full_name: string;
  dob: string | null;
  address: string | null;
  markers: string | null;
  notes: string | null;
}
export interface PncVehicle {
  id: string;
  registration: string;
  make_model: string | null;
  colour: string | null;
  keeper: string | null;
  status: string | null;
  markers: string | null;
  notes: string | null;
}

/** "ab12 cde" -> "AB12CDE" */
export const normaliseReg = (v: string) => v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12);

/** Escape the characters that mean something inside an ILIKE pattern. */
const likeSafe = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchPersons(q: string): Promise<PncPerson[]> {
  const { data } = await supabaseAdmin.from('met_pnc_persons').select('id, full_name, dob, address, markers, notes').ilike('full_name', `%${likeSafe(q.trim())}%`).limit(10);
  return (data ?? []) as PncPerson[];
}

export async function searchVehicles(q: string): Promise<PncVehicle[]> {
  const reg = normaliseReg(q);
  if (!reg) return [];
  const { data } = await supabaseAdmin.from('met_pnc_vehicles').select('id, registration, make_model, colour, keeper, status, markers, notes').eq('registration', reg).limit(10);
  return (data ?? []) as PncVehicle[];
}
