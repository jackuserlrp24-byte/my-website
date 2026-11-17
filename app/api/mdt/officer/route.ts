import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { getMemberRank } from '@/lib/met-discord';
import { getOrCreateWarrant } from '@/lib/warrant';

export const dynamic = 'force-dynamic';

// Called by CO-MDT (web_bridge.lua) when an officer shows their warrant card with the third eye.
// GET /api/mdt/officer?discord=<discord id>   header: x-mdt-key = MDT_API_KEY
export async function GET(req: NextRequest) {
  if (!process.env.MDT_API_KEY || req.headers.get('x-mdt-key') !== process.env.MDT_API_KEY) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('discord') ?? '';
  if (!/^\d{15,25}$/.test(id)) return NextResponse.json({ ok: false, error: 'bad discord id' }, { status: 400 });

  const warrant = await getOrCreateWarrant(id);
  if (!warrant) return NextResponse.json({ ok: false, error: 'could not create a warrant number' }, { status: 500 });

  const { data } = await supabaseAdmin
    .from('met_officer_details')
    .select('officer_name, rank, station, team')
    .eq('discord_id', id)
    .maybeSingle();

  // photo (uniform photo taken in game, or uploaded on the website) - shown on the warrant card
  const { data: ph } = await supabaseAdmin.from('met_officer_photos').select('photo').eq('discord_id', id).maybeSingle();

  const rank = data?.rank || (await getMemberRank(id));
  return NextResponse.json({
    ok: true,
    profile: {
      officerName: data?.officer_name ?? null,   // empty until they fill in My Details; the game then uses the MDT name
      warrantCard: warrant, rank, station: data?.station ?? null, division: data?.team ?? null, photo: ph?.photo ?? null,
    },
  });
}
