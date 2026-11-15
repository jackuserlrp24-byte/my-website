import { supabaseAdmin } from '@/lib/portal';
import {
  MAINTENANCE_PANELS,
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

/** Reads the maintenance settings. Any problem (no table, bad JSON) means "nothing is under maintenance". */
export async function getMaintenance(): Promise<MaintenanceState> {
  const base = emptyMaintenance();
  try {
    const { data } = await supabaseAdmin.from('portal_settings').select('value, updated_at').eq('key', KEY).maybeSingle();
    if (!data?.value) return base;
    const parsed = JSON.parse(data.value) as Partial<MaintenanceState>;
    return {
      site: entry(parsed.site, true),
      panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, entry(parsed.panels?.[p.key])])),
      updated_by: typeof parsed.updated_by === 'string' ? parsed.updated_by : null,
      updated_at: data.updated_at ?? null,
    };
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
