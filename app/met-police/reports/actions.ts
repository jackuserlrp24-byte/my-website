'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { getOfficer } from '@/lib/met-access';
import { field, makeRef } from '@/lib/met-util';
import { REPORT_BY_KEY, type ReportKey } from '@/lib/met-report-types';

export async function submitReport(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const key = field(fd, 'type', 20) as ReportKey;
  const type = REPORT_BY_KEY[key];
  if (!type) return;

  const answers: Record<string, string> = {};
  for (const f of type.fields) {
    const v = field(fd, f.name, f.max ?? 300);
    if (f.required && !v) return; // the browser already enforces this; this is the server-side check
    if (f.kind === 'select' && v && !f.options?.includes(v)) return;
    if (v) answers[f.label] = v;
  }

  const summary = answers[type.fields.find((f) => f.name === type.summaryField)?.label ?? ''] ?? type.title;
  const { error } = await supabaseAdmin.from('met_reports').insert({
    reference: makeRef(type.prefix),
    type: type.key,
    summary: summary.slice(0, 160),
    fields: answers,
    incident_ref: field(fd, 'incident_ref', 20) || null,
    author_id: u.id,
    author_name: u.name,
  });
  if (error) console.error('Report insert failed:', error);
  revalidatePath('/met-police/reports');
}
