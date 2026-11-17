import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import VideoClient, { type Clip } from './VideoClient';

export const dynamic = 'force-dynamic';

export default async function BodyWornVideoPage({ searchParams }: { searchParams: Promise<{ clip?: string }> }) {
  const { clip } = await searchParams;
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  let q = supabaseAdmin
    .from('bodycam_incidents')
    .select('id, created_at, officer_name, target_name, trigger, serial, coords, total_ms, segments')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(60);
  if (!manager) q = q.eq('officer_discord_id', officer.id);
  const { data, error } = await q;

  const clips: Clip[] = (data ?? []).map(({ segments, ...rest }) => ({ ...rest, segment_count: Array.isArray(segments) ? segments.length : 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Body-Worn Video</h1>
        <p className="text-sm text-slate-500 mt-1">
          {manager ? 'Footage uploaded by every officer.' : 'Your uploaded footage.'} The last 3 minutes, with audio, is saved automatically when your camera is triggered.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">Body-worn video is not set up yet. Run supabase/bodycam.sql in Supabase.</p>
      ) : (
        <VideoClient clips={clips} canDelete={manager} showOfficer={manager} initialId={clip ?? null} />
      )}
    </div>
  );
}
