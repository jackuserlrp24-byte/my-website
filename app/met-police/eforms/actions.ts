'use server';

import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/portal';
import { getOfficer } from '@/lib/met-access';
import { getEformDefs } from '@/lib/mdt-eforms';
import { field } from '@/lib/met-util';

export async function submitEform(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const type = field(fd, '_type', 40);
  const { defs } = await getEformDefs();
  const def = defs[type];
  if (!def) return;

  const fields: Record<string, string> = {};
  let missing = false;
  for (const f of def.fields) {
    if (f.t === 'heading' || f.t === 'note') continue;
    const v = f.t === 'checks' ? fd.getAll(f.k).map((x) => String(x).slice(0, 200)).join(', ') : field(fd, f.k, f.t === 'area' ? 3000 : 500);
    fields[f.k] = v;
    if (f.req && !v) missing = true;
  }
  if (missing) redirect(`/met-police/eforms/new/${type}?err=${encodeURIComponent('Complete all fields marked *')}`);

  const ref = `${def.prefix}-W${Math.floor(100000 + Math.random() * 900000)}`;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date());
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  const { error } = await supabaseAdmin.from('mdt_eforms').insert({
    ref,
    type,
    title: def.title,
    form_date: `${p('day')}/${p('month')}/${p('year')}`,
    form_time: `${p('hour')}:${p('minute')}:${p('second')}`,
    officer_name: u.name,
    author_id: u.id,
    fields,
    status: 'waiting',
  });
  if (error) redirect(`/met-police/eforms/new/${type}?err=${encodeURIComponent('Could not save. Have you run supabase/met-portal.sql?')}`);
  redirect(`/met-police/eforms/view/${ref}`);
}
