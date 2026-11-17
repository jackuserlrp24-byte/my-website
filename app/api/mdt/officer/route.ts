import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { getMemberRank } from '@/lib/met-discord';

export const dynamic = 'force-dynamic';

// Called by CO-MDT (web_bridge.lua) when an officer shows their warrant card with the third eye.
// GET /api/mdt/officer?discord=<discord id>   header: x-mdt-key = MDT_API_KEY
export async function GET(req: NextRequest) {
  if (!process.env.MDT_API_KEY || req.headers.get('x-mdt-key') !== process.env.MDT_API_KEY) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('discord') ?? '';
  if (!/^\d{15,25}$/.test(id)) return NextResponse.json({ ok: false, error: 'bad discord id' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('met_officer_details')
    .select('officer_name, warrant_card, rank, station, team')
    .eq('discord_id', id)
    .maybeSingle();
  if (!data || !data.officer_name || !data.warrant_card) return NextResponse.json({ ok: false, error: 'no profile' }, { status: 404 });

  const rank = data.rank || (await getMemberRank(id));
  return NextResponse.json({
    ok: true,
    profile: { officerName: data.officer_name, warrantCard: data.warrant_card, rank, station: data.station, division: data.team },
  });
}
