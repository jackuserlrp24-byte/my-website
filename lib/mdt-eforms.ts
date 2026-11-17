import { supabaseAdmin } from '@/lib/portal';
import { EFORM_DEFS, EFORM_ORDER, type EFormDef } from '@/lib/mdt-eforms-defs';

/** Built-in MDT forms, plus any forms the MDT form builder made (synced into mdt_eform_defs). */
export async function getEformDefs(): Promise<{ defs: Record<string, EFormDef>; order: string[] }> {
  const defs: Record<string, EFormDef> = { ...EFORM_DEFS };
  const order = [...EFORM_ORDER];
  try {
    const { data } = await supabaseAdmin.from('mdt_eform_defs').select('id, def').limit(100);
    for (const row of data ?? []) {
      const d = row.def as EFormDef;
      if (d?.title && Array.isArray(d.fields) && !defs[row.id]) {
        defs[row.id] = { title: d.title, prefix: d.prefix || 'XX', desc: d.desc, fields: d.fields };
        order.push(row.id);
      }
    }
  } catch {}
  return { defs, order };
}
