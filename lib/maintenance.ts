import { supabaseAdmin } from '@/lib/portal';
import {
  MAINTENANCE_PANELS,
  SCHEDULE_KEY,
  parseSchedule,
  scheduleMessage,
  schedulePhase,
  defaultMessage,
  emptyMaintenance,
  type MaintenanceEntry,
  type MaintenanceState,
} from '@/lib/maintenance-config';

const KEY = 'maintenance';

const entry = (raw: unknown, site = false): MaintenanceEntry => {
  const r = (raw ?? {}) as Partial<MaintenanceEntry>;
  const mode = r.mode === 'coming_soon' ? 'coming_soon' : 'maintenance';
  const msg = typeof r.message === 'string' ? r.message.trim().slice(0, 500) : '';
  return { on: r.on === true, mode, message: msg || defaultMessage(mode, site) };
};

/**
 * Reads the maintenance settings. Any problem (no table, bad JSON) means "nothing is under maintenance".
 * By default an ACTIVE scheduled maintenance is laid over the saved settings, so every gate, the watcher and the
 * Discord sync see it with no extra wiring. The Developer panel asks for `{ overlay: false }` so saving the manual
 * switches never copies the schedule into them.
 */
export async function getMaintenance(opts: { overlay?: boolean } = {}): Promise<MaintenanceState> {
  const base = emptyMaintenance();
  try {
    const { data: rows } = await supabaseAdmin.from('portal_settings').select('key, value, updated_at').in('key', [KEY, SCHEDULE_KEY]);
    const main = rows?.find((r) => r.key === KEY);
    let state = base;
    if (main?.value) {
      const parsed = JSON.parse(main.value) as Partial<MaintenanceState>;
      state = {
        site: entry(parsed.site, true),
        panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, entry(parsed.panels?.[p.key])])),
        updated_by: typeof parsed.updated_by === 'string' ? parsed.updated_by : null,
        updated_at: main.updated_at ?? null,
      };
    }
    if (opts.overlay === false) return state;

    const sched = parseSchedule(rows?.find((r) => r.key === SCHEDULE_KEY)?.value);
    if (sched && schedulePhase(sched) === 'active') {
      if (sched.site) state.site = { on: true, mode: 'maintenance', message: scheduleMessage(sched, true) };
      for (const k of sched.panels) if (state.panels[k]) state.panels[k] = { on: true, mode: 'maintenance', message: scheduleMessage(sched, false) };
    }
    return state;
  } catch {
    return base;
  }
}

export async function saveMaintenance(state: MaintenanceState, by: string): Promise<boolean> {
  const clean: MaintenanceState = {
    site: entry(state.site, true),
    panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, entry(state.panels?.[p.key])])),
    updated_by: by,
    updated_at: null,
  };
  const { error } = await supabaseAdmin
    .from('portal_settings')
    .upsert({ key: KEY, value: JSON.stringify(clean), updated_at: new Date().toISOString() });
  if (error) console.error('saveMaintenance failed:', error);
  return !error;
}
