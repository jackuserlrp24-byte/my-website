import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { normVrm, pncSearchText, validMdtKey } from '@/lib/mdt';

export const dynamic = 'force-dynamic';

const s = (v: unknown, max = 500) => (v === undefined || v === null ? null : String(v).slice(0, max));
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const deny = () => NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 });

/**
 * The in-game MDT (web_bridge.lua) sends its data here. Every request needs the x-mdt-key header = MDT_API_KEY.
 * POST { kind: 'incidents' | 'pnc' | 'eforms' | 'eform_defs', items: [...] }
 * GET  ?pull=pnc  -> PNC records made on the website that the game has not collected yet
 */
export async function POST(req: Request) {
  if (!validMdtKey(req.headers.get('x-mdt-key'))) return deny();

  let body: { kind?: string; items?: any[]; ack?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  if (!items.length) return NextResponse.json({ ok: true, saved: 0 });

  let error: { message: string } | null = null;

  if (body.kind === 'incidents') {
    const rows = items
      .filter((i) => i && i.cadRef)
      .map((i) => ({
        cad_ref: s(i.cadRef, 40)!,
        response_grade: s(i.responseGrade, 20),
        call_type: s(i.callType, 6),
        title: s(i.title, 200),
        location: s(i.location, 200),
        caller: s(i.author, 120),
        details: s(i.details, 3000),
        frequency: s(i.frequency, 40),
        status: s(i.status, 30) || 'New',
        received: s(i.received, 10),
        received_date: s(i.receivedDate, 12),
        last_updated: s(i.lastUpdated, 10),
        officers: arr(i.officers).slice(0, 40).map((o: any) => ({ callsign: s(o?.callsign, 30), name: s(o?.name, 60), status: s(o?.status, 30) })),
        remarks: arr(i.remarks).slice(-100).map((r: any) => ({ stamp: s(r?.stamp, 24), by: s(r?.by, 60), text: s(r?.text, 400), system: r?.system === true })),
        updated_at: new Date().toISOString(),
      }));
    ({ error } = await supabaseAdmin.from('mdt_incidents').upsert(rows, { onConflict: 'cad_ref' }));
  } else if (body.kind === 'pnc') {
    const rows = items
      .map((i) => {
        const kind = i?.kind === 'vehicle' ? 'vehicle' : 'person';
        const d = i?.data && typeof i.data === 'object' ? i.data : null;
        const key = kind === 'vehicle' ? normVrm(d?.vrm) : String(d?.id ?? '');
        if (!d || !key) return null;
        return { kind, key, search: pncSearchText(kind, d), data: d, web_edited: false, updated_at: new Date().toISOString() };
      })
      .filter(Boolean) as any[];
    // A record that was changed on the website and not collected yet is never overwritten by an older copy from the game.
    const { data: pending } = await supabaseAdmin.from('mdt_pnc_records').select('kind, key').eq('web_edited', true);
    const skip = body.ack ? new Set<string>() : new Set((pending ?? []).map((p: any) => `${p.kind}:${p.key}`));
    ({ error } = await supabaseAdmin.from('mdt_pnc_records').upsert(rows.filter((r) => !skip.has(`${r.kind}:${r.key}`)), { onConflict: 'kind,key' }));
  } else if (body.kind === 'eforms') {
    const rows = items
      .filter((i) => i && i.ref)
      .map((i) => ({
        ref: s(i.ref, 30)!,
        type: s(i.type, 40) || 'form',
        title: s(i.title, 120) || 'Form',
        form_date: s(i.date, 12),
        form_time: s(i.time, 10),
        callsign: s(i.callsign, 30),
        officer_name: s(i.name, 80),
        author_id: s(i.discordId, 30),
        fields: i.fields && typeof i.fields === 'object' ? i.fields : {},
        photos: Array.isArray(i.photos) ? i.photos.length : Number(i.photos) || 0,
        status: ['waiting', 'changes', 'edited', 'signed'].includes(i.status) ? i.status : 'waiting',
        ask: s(i.ask, 1000),
      }));
    ({ error } = await supabaseAdmin.from('mdt_eforms').upsert(rows, { onConflict: 'ref' }));
  } else if (body.kind === 'eform_defs') {
    const rows = items.filter((i) => i && i.id && Array.isArray(i.fields)).map((i) => ({ id: s(i.id, 40)!, def: { title: s(i.title, 120), prefix: s(i.prefix, 6), desc: s(i.desc, 400), fields: i.fields } }));
    ({ error } = await supabaseAdmin.from('mdt_eform_defs').upsert(rows, { onConflict: 'id' }));
  } else {
    return NextResponse.json({ ok: false, error: 'Unknown kind' }, { status: 400 });
  }

  if (error) {
    console.error('MDT sync failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not save. Have you run supabase/met-portal.sql?' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, saved: items.length });
}

export async function GET(req: Request) {
  if (!validMdtKey(req.headers.get('x-mdt-key'))) return deny();
  if (new URL(req.url).searchParams.get('pull') !== 'pnc') return NextResponse.json({ ok: false, error: 'Unknown request' }, { status: 400 });
  const { data } = await supabaseAdmin.from('mdt_pnc_records').select('kind, key, data').eq('web_edited', true).limit(100);
  return NextResponse.json({ ok: true, items: data ?? [] });
}
