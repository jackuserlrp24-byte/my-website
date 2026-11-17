import { getLasMember } from '@/lib/las-access';
import { getLasRoster } from '@/lib/las-discord';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <p className={ui.eyebrow}>{label}</p>
    <p className={`mt-1 text-lg font-bold ${value ? 'text-slate-900' : 'text-slate-300'}`}>{value || 'Not set'}</p>
  </div>
);

export default async function LasMyDetailsPage() {
  const member = (await getLasMember())!;
  const [{ rows }, wl] = await Promise.all([
    getLasRoster(),
    supabaseAdmin.from('user_whitelists').select('rp_name').eq('discord_id', member.id).maybeSingle(),
  ]);
  const me = rows.find((r) => r.id === member.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>My Details</h1>
        <p className={ui.sub}>Copied from your Discord name and roles. Ask command if something is wrong.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Name" value={wl.data?.rp_name || me?.name || member.name} />
        <Row label="Number" value={me?.callsign} />
        <Row label="Rank" value={me?.rank} />
        <Row label="Command tier" value={me?.tier} />
      </div>
    </div>
  );
}
