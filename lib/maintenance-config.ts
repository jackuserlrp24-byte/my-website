// Shared (server + client safe) maintenance types and the list of panels that can be switched off.

export const DEFAULT_MAINTENANCE_MESSAGE =
  'This section is currently under maintenance. We apologise for any inconvenience - please check back soon.';
export const DEFAULT_SITE_MESSAGE =
  'The Central Operations website is currently under maintenance. We apologise for any inconvenience - please check back soon.';

export const MAINTENANCE_PANELS = [
  { key: 'trainings', label: 'Trainings', path: '/dashboard/trainings' },
  { key: 'divisions', label: 'Divisions', path: '/dashboard/divisions' },
  { key: 'patrols', label: 'Patrols', path: '/dashboard/patrols' },
  { key: 'staff', label: 'Staff Panel', path: '/dashboard/staff' },
  { key: 'appeals', label: 'Ban Appeals (staff dashboard)', path: '/dashboard/appeals' },
  { key: 'trainer', label: 'Trainer Panel', path: '/dashboard/trainer' },
  { key: 'management', label: 'Management', path: '/dashboard/management' },
  { key: 'command', label: 'Command', path: '/dashboard/command' },
  { key: 'appeal', label: 'Ban Appeal form (public)', path: '/appeal' },
] as const;

export type PanelKey = (typeof MAINTENANCE_PANELS)[number]['key'];

export interface MaintenanceEntry {
  on: boolean;
  message: string;
}

export interface MaintenanceState {
  site: MaintenanceEntry;
  panels: Record<string, MaintenanceEntry>;
  updated_by: string | null;
  updated_at: string | null;
}

export const emptyMaintenance = (): MaintenanceState => ({
  site: { on: false, message: DEFAULT_SITE_MESSAGE },
  panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, { on: false, message: DEFAULT_MAINTENANCE_MESSAGE }])),
  updated_by: null,
  updated_at: null,
});
