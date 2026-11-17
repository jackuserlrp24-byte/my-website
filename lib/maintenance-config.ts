// Shared (server + client safe) maintenance types and the list of panels that can be switched off.
// Each one can be shown as "Under maintenance" or "Coming soon".

export type MaintenanceMode = 'maintenance' | 'coming_soon';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'This section is currently under maintenance. We apologise for any inconvenience - please check back soon.';
export const DEFAULT_SITE_MESSAGE =
  'The Central Operations website is currently under maintenance. We apologise for any inconvenience - please check back soon.';
export const DEFAULT_COMING_SOON_MESSAGE = 'This section is coming soon. Keep an eye on Discord for the announcement.';
export const DEFAULT_COMING_SOON_SITE_MESSAGE = 'The Central Operations website is coming soon. Keep an eye on Discord for the announcement.';

export const defaultMessage = (mode: MaintenanceMode, site = false) =>
  mode === 'coming_soon'
    ? site ? DEFAULT_COMING_SOON_SITE_MESSAGE : DEFAULT_COMING_SOON_MESSAGE
    : site ? DEFAULT_SITE_MESSAGE : DEFAULT_MAINTENANCE_MESSAGE;

export const isDefaultMessage = (m: string) =>
  [DEFAULT_MAINTENANCE_MESSAGE, DEFAULT_SITE_MESSAGE, DEFAULT_COMING_SOON_MESSAGE, DEFAULT_COMING_SOON_SITE_MESSAGE].includes(m.trim());

// ADD EVERY NEW PAGE / SECTION HERE (and wrap it in <PanelGate panel="...">, e.g. with a layout.tsx in its folder).
// It then shows up in the Developer panel automatically, where it can be set to Under maintenance or Coming soon.
// `exact` = only that exact path (not the pages under it). Longer paths take priority over shorter ones.
export const MAINTENANCE_PANELS = [
  { key: 'home', label: 'Dashboard home', path: '/dashboard', exact: true },
  { key: 'profile', label: 'Profile', path: '/dashboard/profile' },
  { key: 'trainings', label: 'Trainings', path: '/dashboard/trainings' },
  { key: 'divisions', label: 'Divisions', path: '/dashboard/divisions' },
  { key: 'patrols', label: 'Patrols', path: '/dashboard/patrols' },
  { key: 'staff', label: 'Staff Panel', path: '/staff' },
  { key: 'appeals', label: 'Ban Appeals (staff dashboard)', path: '/dashboard/appeals' },
  { key: 'trainer', label: 'Trainer Panel', path: '/dashboard/trainer' },
  { key: 'command', label: 'Command (everything inside)', path: '/dashboard/command' },
  { key: 'command-met', label: 'Command: Metropolitan Police (old command page)', path: '/dashboard/command/met-police' },
  { key: 'command-las', label: 'Command: London Ambulance Service (LAS)', path: '/dashboard/command/las' },
  { key: 'command-lfb', label: 'Command: London Fire Brigade (LFB)', path: '/dashboard/command/lfb' },
  { key: 'command-loa', label: 'Command: Leave of Absence (LOA)', path: '/dashboard/command/loa' },
  // Met Police officer portal (/met-police). "Whole portal" covers every tab below it; the tabs can also be switched one by one.
  { key: 'met-portal', label: 'Met Police portal (whole portal)', path: '/met-police' },
  { key: 'met-incidents', label: 'Met Police: Incidents', path: '/met-police/incidents' },
  { key: 'met-eforms', label: 'Met Police: E-Forms', path: '/met-police/eforms' },
  { key: 'met-pnc', label: 'Met Police: PNC', path: '/met-police/pnc' },
  { key: 'met-evidence', label: 'Met Police: Evidence', path: '/met-police/evidence' },
  { key: 'met-roster', label: 'Met Police: Chain of Command', path: '/met-police/roster' },
  { key: 'met-policies', label: 'Met Police: Policies', path: '/met-police/policies' },
  { key: 'met-communications', label: 'Met Police: Communications', path: '/met-police/communications' },
  { key: 'met-command', label: 'Met Police: Command (everything inside)', path: '/command' },
  { key: 'met-collisions', label: 'Met Police: Command - Police Collisions', path: '/command/collisions' },
  { key: 'met-firearms', label: 'Met Police: Command - Firearms PIP', path: '/command/firearms' },
  { key: 'met-acat', label: 'Met Police: Command - Anti-Corruption & Abuse Team', path: '/command/acat' },
  { key: 'met-loa', label: 'Met Police: Command - Leave of Absence', path: '/command/loa' },
  { key: 'met-my-details', label: 'Met Police: My Details', path: '/met-police/my-details' },
  { key: 'whitelist', label: 'Whitelist process', path: '/whitelistprocess' },
  { key: 'appeal', label: 'Ban Appeal form (public)', path: '/appeal' },
] as const;

export type PanelKey = (typeof MAINTENANCE_PANELS)[number]['key'];

/** Every panel whose path covers this URL (e.g. /dashboard/command/las is covered by "command" and "command-las"). */
export function panelsForPath(path: string): PanelKey[] {
  return MAINTENANCE_PANELS.filter((p) => ('exact' in p && p.exact ? path === p.path : path === p.path || path.startsWith(`${p.path}/`))).map((p) => p.key);
}

export interface MaintenanceEntry {
  on: boolean;
  mode: MaintenanceMode;
  message: string;
}

export interface MaintenanceState {
  site: MaintenanceEntry;
  panels: Record<string, MaintenanceEntry>;
  updated_by: string | null;
  updated_at: string | null;
}

export const emptyMaintenance = (): MaintenanceState => ({
  site: { on: false, mode: 'maintenance', message: DEFAULT_SITE_MESSAGE },
  panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, { on: false, mode: 'maintenance' as MaintenanceMode, message: DEFAULT_MAINTENANCE_MESSAGE }])),
  updated_by: null,
  updated_at: null,
});

// ---------- Scheduled maintenance ----------

/** Discord roles that can still join / stay on the FiveM server while it is under maintenance. */
export const FIVEM_MAINTENANCE_BYPASS_ROLE_IDS = ['1497557905275224151', '1497557905275224148', '1497557905250193506'];

export interface MaintenanceSchedule {
  id: string;
  start_at: string; // ISO
  end_at: string | null; // ISO, null = stays on until ended manually
  message: string; // '' = stock message
  site: boolean; // whole website
  panels: string[]; // panel keys
  fivem: boolean; // FiveM server maintenance
  discord_channels: string[]; // channel IDs that get the notice
  discord_msgs: Record<string, string>; // channelId -> messageId
  created_by: string;
  cancelled: boolean;
  started_done: boolean; // Discord / log effects for the start have run
  ended_done: boolean; // Discord / log effects for the end have run
}

export type SchedulePhase = 'scheduled' | 'active' | 'ended' | 'cancelled';

export function schedulePhase(s: MaintenanceSchedule, now = Date.now()): SchedulePhase {
  if (s.cancelled) return 'cancelled';
  if (now < new Date(s.start_at).getTime()) return 'scheduled';
  if (s.end_at && now >= new Date(s.end_at).getTime()) return 'ended';
  return 'active';
}

export const SCHEDULE_FIVEM_MESSAGE = 'The server is currently under maintenance. We apologise for any inconvenience.';

export const SCHEDULE_KEY = 'maintenance_schedule';



export function parseSchedule(raw: string | null | undefined): MaintenanceSchedule | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<MaintenanceSchedule>;
    if (!r.id || !r.start_at || Number.isNaN(new Date(r.start_at).getTime())) return null;
    const validPanels = new Set<string>(MAINTENANCE_PANELS.map((p) => p.key));
    return {
      id: r.id,
      start_at: r.start_at,
      end_at: r.end_at && !Number.isNaN(new Date(r.end_at).getTime()) ? r.end_at : null,
      message: typeof r.message === 'string' ? r.message.slice(0, 500) : '',
      site: r.site === true,
      panels: Array.isArray(r.panels) ? r.panels.filter((k) => validPanels.has(k)) : [],
      fivem: r.fivem === true,
      discord_channels: Array.isArray(r.discord_channels) ? r.discord_channels.filter((c) => /^\d{15,25}$/.test(c)) : [],
      discord_msgs: r.discord_msgs && typeof r.discord_msgs === 'object' ? r.discord_msgs : {},
      created_by: typeof r.created_by === 'string' ? r.created_by : 'Unknown',
      cancelled: r.cancelled === true,
      started_done: r.started_done === true,
      ended_done: r.ended_done === true,
    };
  } catch {
    return null;
  }
}


/** What a viewer / FiveM player is told while the schedule is active. */
export function scheduleMessage(s: MaintenanceSchedule, site: boolean): string {
  return s.message.trim() || defaultMessage('maintenance', site);
}

