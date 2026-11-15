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

// `exact` = only that exact path (not the pages under it). Longer paths take priority over shorter ones.
export const MAINTENANCE_PANELS = [
  { key: 'home', label: 'Dashboard home', path: '/dashboard', exact: true },
  { key: 'profile', label: 'Profile', path: '/dashboard/profile' },
  { key: 'trainings', label: 'Trainings', path: '/dashboard/trainings' },
  { key: 'divisions', label: 'Divisions', path: '/dashboard/divisions' },
  { key: 'patrols', label: 'Patrols', path: '/dashboard/patrols' },
  { key: 'staff', label: 'Staff Panel', path: '/dashboard/staff' },
  { key: 'appeals', label: 'Ban Appeals (staff dashboard)', path: '/dashboard/appeals' },
  { key: 'trainer', label: 'Trainer Panel', path: '/dashboard/trainer' },
  { key: 'management', label: 'Management', path: '/dashboard/management' },
  { key: 'command', label: 'Command (everything inside)', path: '/dashboard/command' },
  { key: 'command-met', label: 'Command: Metropolitan Police', path: '/dashboard/command/met-police' },
  { key: 'command-las', label: 'Command: London Ambulance Service (LAS)', path: '/dashboard/command/las' },
  { key: 'command-lfb', label: 'Command: London Fire Brigade (LFB)', path: '/dashboard/command/lfb' },
  { key: 'command-loa', label: 'Command: Leave of Absence (LOA)', path: '/dashboard/command/loa' },
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
