// Shared helpers for the MDT-linked pages (Incidents, PNC, E-Forms).
import { createHash, timingSafeEqual } from 'crypto';

export interface MdtRemark { stamp?: string; by?: string; text?: string; system?: boolean }
export interface MdtOfficer { callsign?: string; name?: string; status?: string }
export interface MdtIncident {
  cad_ref: string;
  response_grade: string | null;
  call_type: string | null;
  title: string | null;
  location: string | null;
  caller: string | null;
  details: string | null;
  frequency: string | null;
  status: string;
  received: string | null;
  received_date: string | null;
  last_updated: string | null;
  officers: MdtOfficer[];
  remarks: MdtRemark[];
}

/** I / S / E grade letter, same as the MDT. */
export const gradeLetter = (g: string | null) => (g === 'Urgent' ? 'S' : g === 'Routine' ? 'E' : 'I');
export const gradeLabel = (g: string | null, callType: string | null) => {
  const label = ({ Immediate: 'I Grade', Urgent: 'S Grade', Routine: 'E Grade' } as Record<string, string>)[g ?? ''] || g || 'I Grade';
  return (callType === '101' || callType === '111' ? `${callType} - ` : '') + label;
};

/** CAD refs look like 1000/261026. A slash does not survive in a URL path, so links use a dash instead. */
export const refToSlug = (ref: string) => ref.replace(/\//g, '-');
export const slugToRef = (slug: string) => decodeURIComponent(slug).replace(/-/g, '/');

export const normVrm = (s: string) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const digitsOnly = (s: string) => String(s ?? '').replace(/\D/g, '');

/** Lower case text stored beside each PNC record so a search is one database query. */
export function pncSearchText(kind: 'person' | 'vehicle', d: Record<string, any>): string {
  if (kind === 'vehicle') return [normVrm(d.vrm), d.make, d.model, d.colour].join(' ').toLowerCase();
  return [d.last, d.first, digitsOnly(d.dob), d.identId, d.id].join(' ').toLowerCase();
}

/** The API key the game uses. Set MDT_API_KEY in Vercel and the same value in server.cfg (comdt_web_key). */
export function validMdtKey(given: string | null): boolean {
  const want = process.env.MDT_API_KEY;
  if (!want || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

export const EFORM_STATUS: Record<string, [string, string]> = {
  waiting: ['Waiting to be reviewed', 'text-amber-700'],
  changes: ['Changes requested', 'text-red-700'],
  edited: ['Edited - waiting to be reviewed', 'text-blue-700'],
  signed: ['Signed off', 'text-green-700'],
};

/** Warning markers exactly as the MDT builds them: stored warnings + warrants + markers (+ stolen / uninsured for vehicles). */
export function warningsFor(kind: 'person' | 'vehicle', d: Record<string, any>): string[] {
  const w: string[] = [...(d.warnings ?? [])];
  if (kind === 'vehicle') {
    if (d.stolen) w.push('STOLEN VEHICLE');
    if (d.insurance === 'Uninsured') w.push('NO INSURANCE');
  } else {
    for (const wr of d.warrants ?? []) w.push(`WARRANT: ${wr?.reason ?? ''}`);
  }
  for (const m of d.markers ?? []) w.push(m);
  return w;
}

export const personName = (d: Record<string, any>) => `${d.first ?? ''} ${d.last ?? ''}`.trim();
