import { NextResponse } from 'next/server';
import { getMaintenance } from '@/lib/maintenance';
import { runScheduleEffects } from '@/lib/maintenance-schedule';

export const dynamic = 'force-dynamic';

/** Public, tiny on/off status polled by every open page so they update the moment a developer hits Apply. No messages / names in here. */
export async function GET() {
  await runScheduleEffects(); // posts the Discord start / end notices the moment a schedule's time is reached
  const m = await getMaintenance();
  return NextResponse.json(
    {
      site: m.site.on,
      panels: Object.fromEntries(Object.entries(m.panels).map(([k, v]) => [k, v.on])),
      // which kind of switch-off each panel is, so menus can label a tab "Maintenance" or "Coming soon"
      modes: Object.fromEntries(Object.entries(m.panels).filter(([, v]) => v.on).map(([k, v]) => [k, v.mode])),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
