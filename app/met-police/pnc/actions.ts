'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { normVrm, pncSearchText } from '@/lib/mdt';
import { field } from '@/lib/met-util';

const up = (s: string) => s.toUpperCase();

/** New person / new vehicle, same rules as the MDT. The game collects it the next time it syncs. */
export async function createRecord(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const kind = field(fd, 'kind', 10) === 'vehicle' ? 'vehicle' : 'person';
  const back = `/met-police/pnc?type=${kind}`;

  if (kind === 'vehicle') {
    const vrm = normVrm(field(fd, 'vrm', 10));
    if (vrm.length < 2 || vrm.length > 8) redirect(`${back}&err=${encodeURIComponent('Invalid VRM')}`);
    const exists = await supabaseAdmin.from('mdt_pnc_records').select('key').eq('kind', 'vehicle').eq('key', vrm).maybeSingle();
    if (exists.data) redirect(`${back}&err=${encodeURIComponent('VRM already exists')}`);

    let keeperId: number | null = null;
    const k = field(fd, 'keeperId', 10);
    if (k) {
      const keeper = await supabaseAdmin.from('mdt_pnc_records').select('key').eq('kind', 'person').eq('key', k).maybeSingle();
      if (!keeper.data) redirect(`${back}&err=${encodeURIComponent('Keeper PNC # not found')}`);
      keeperId = Number(k);
    }
    const data = {
      vrm, make: up(field(fd, 'make', 30) || 'UNKNOWN'), model: up(field(fd, 'model', 30) || 'UNKNOWN'), colour: up(field(fd, 'colour', 20) || 'UNKNOWN'),
      keeperId, tax: 'Taxed', mot: 'Valid', insurance: 'Insured', warnings: [], info: [], history: [], intel: [],
    };
    await supabaseAdmin.from('mdt_pnc_records').insert({ kind, key: vrm, search: pncSearchText('vehicle', data), data, web_edited: true });
    revalidatePath('/met-police/pnc');
    redirect(`/met-police/pnc/vehicle/${vrm}`);
  }

  const first = field(fd, 'first', 30);
  const last = field(fd, 'last', 30);
  const dob = field(fd, 'dob', 10);
  if (!first || !last) redirect(`${back}&err=${encodeURIComponent('Forename and surname required')}`);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) redirect(`${back}&err=${encodeURIComponent('DOB must be DD/MM/YYYY')}`);

  const { data: all } = await supabaseAdmin.from('mdt_pnc_records').select('key').eq('kind', 'person').limit(20000);
  const id = Math.max(0, ...(all ?? []).map((r: any) => Number(r.key) || 0)) + 1;
  const data = {
    id, identId: null, first, last, dob, sex: field(fd, 'sex', 10) === 'Female' ? 'Female' : 'Male', address: field(fd, 'address', 80),
    warnings: [], info: [], history: [], intel: [],
  };
  await supabaseAdmin.from('mdt_pnc_records').insert({ kind, key: String(id), search: pncSearchText('person', data), data, web_edited: true });
  revalidatePath('/met-police/pnc');
  redirect(`/met-police/pnc/person/${id}`);
}

/** Command can add a line to a record's warning markers, information markers, history or intelligence. */
export async function addEntry(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;
  const kind = field(fd, 'kind', 10) === 'vehicle' ? 'vehicle' : 'person';
  const key = field(fd, 'key', 20);
  const tab = field(fd, 'tab', 12);
  const text = field(fd, 'text', 300);
  if (!key || !text || !['warnings', 'info', 'history', 'intel'].includes(tab)) return;

  const { data: row } = await supabaseAdmin.from('mdt_pnc_records').select('data').eq('kind', kind).eq('key', key).maybeSingle();
  if (!row) return;
  const d = row.data as Record<string, any>;
  const stamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const list: any[] = Array.isArray(d[tab]) ? d[tab] : [];
  // Warning and information markers are plain lines; history and intelligence carry a date, like in the MDT.
  d[tab] = tab === 'warnings' || tab === 'info' ? [...list, text] : [{ date: stamp, text: `${text} (${u.name})` }, ...list].slice(0, 50);

  await supabaseAdmin.from('mdt_pnc_records').update({ data: d, web_edited: true, updated_at: new Date().toISOString() }).eq('kind', kind).eq('key', key);
  revalidatePath(`/met-police/pnc/${kind}/${key}`);
}
