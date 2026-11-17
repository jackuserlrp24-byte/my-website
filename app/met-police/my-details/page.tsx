import { getOfficer, canManageMet } from '@/lib/met-access';
import { getOfficerOptions } from '@/lib/met-officers';
import { supabaseAdmin } from '@/lib/portal';
import { BRONZE_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, hasRoleId } from '@/lib/training-config';
import { ui } from '@/lib/met-util';
import { forcedStation } from '@/lib/met-discord';
import { saveMyProfile, saveOfficerDetails } from './actions';

export const dynamic = 'force-dynamic';

const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <p className={ui.eyebrow}>{label}</p>
    <p className={`mt-1 text-lg font-bold ${value ? 'text-slate-900' : 'text-slate-300'}`}>{value || 'Not set'}</p>
  </div>
);

export default async function MyDetailsPage({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const { err, saved } = await searchParams;
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  const [wl, det] = await Promise.all([
    supabaseAdmin.from('user_whitelists').select('rp_name, collar_number, forename, surname').eq('discord_id', officer.id).maybeSingle(),
    supabaseAdmin.from('met_officer_details').select('rank, station, team, officer_name, warrant_card').eq('discord_id', officer.id).maybeSingle(),
  ]);

  const command = hasRoleId(officer.roles, GOLD_ROLE_ID) ? 'Gold Command' : hasRoleId(officer.roles, SILVER_ROLE_ID) ? 'Silver Command' : hasRoleId(officer.roles, BRONZE_ROLE_ID) ? 'Bronze Command' : null;

  // Command: everyone's details in one table.
  let team: { discord_id: string; label: string; rank: string | null; station: string | null; team: string | null }[] = [];
  let options: Awaited<ReturnType<typeof getOfficerOptions>> = [];
  if (manager) {
    options = await getOfficerOptions();
    const { data } = await supabaseAdmin.from('met_officer_details').select('discord_id, rank, station, team').limit(1000);
    const byId = new Map((data ?? []).map((d) => [d.discord_id as string, d]));
    team = options.map((o) => {
      const d = byId.get(o.discord_id);
      return { discord_id: o.discord_id, label: o.label, rank: d?.rank ?? null, station: d?.station ?? null, team: d?.team ?? null };
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>My Details</h1>
        <p className={ui.sub}>Your service record. Rank, station and team are set by command - ask them if something is wrong.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Name" value={det.data?.officer_name || wl.data?.rp_name || officer.name} />
        <Row label="Warrant card" value={det.data?.warrant_card || wl.data?.collar_number} />
        <Row label="Rank" value={det.data?.rank} />
        <Row label="Station" value={forcedStation(officer.roles) ?? det.data?.station} />
        <Row label="Team" value={det.data?.team} />
        <Row label="Command role" value={command ?? (officer.isManagement ? 'Management' : null)} />
      </div>
      {wl.error && <p className={ui.warn}>Could not read your whitelist record.</p>}

      {err && <p className={ui.warn}>{err}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">Profile saved.</p>}

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>{det.data?.officer_name ? 'Your officer profile' : 'Create your officer profile'}</h2>
        <form action={saveMyProfile} className={ui.panel}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ui.label}>Officer name</label>
              <input name="officer_name" required minLength={3} maxLength={60} defaultValue={det.data?.officer_name ?? ''} placeholder="e.g. James Carter" className={ui.input} />
            </div>
            <div>
              <label className={ui.label}>Warrant card number</label>
              <input name="warrant_card" required maxLength={12} defaultValue={det.data?.warrant_card ?? ''} placeholder="e.g. 4821" className={ui.input} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Your station is set for you: MO7 / MO8 officers are at Chadwell Heath Police Base, Frontline officers are shared evenly between Plumstead and Bexleyheath.
          </p>
          <button type="submit" className={ui.btn}>{det.data?.officer_name ? 'Update profile' : 'Create profile'}</button>
        </form>
      </section>

      {manager && (
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <h2 className={ui.eyebrow}>Command: set an officer&rsquo;s details</h2>
          <form action={saveOfficerDetails} className={ui.panel}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={ui.label}>Officer</label>
                <select name="discord_id" required defaultValue="" className={ui.input}>
                  <option value="" disabled>Choose an officer...</option>
                  {options.map((o) => (
                    <option key={o.discord_id} value={o.discord_id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={ui.label}>Rank</label>
                <input name="rank" maxLength={60} placeholder="e.g. Police Constable" className={ui.input} />
              </div>
              <div>
                <label className={ui.label}>Station</label>
                <input name="station" maxLength={80} placeholder="e.g. Mission Row" className={ui.input} />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Team</label>
                <input name="team" maxLength={80} placeholder="e.g. Response Team A" className={ui.input} />
              </div>
            </div>
            <button type="submit" className={ui.btn}>Save details</button>
          </form>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className={ui.th}>Officer</th>
                  <th className={ui.th}>Rank</th>
                  <th className={ui.th}>Station</th>
                  <th className={ui.th}>Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {team.map((t) => (
                  <tr key={t.discord_id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{t.label}</td>
                    <td className="px-4 py-2 text-slate-600">{t.rank || '-'}</td>
                    <td className="px-4 py-2 text-slate-600">{t.station || '-'}</td>
                    <td className="px-4 py-2 text-slate-600">{t.team || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
