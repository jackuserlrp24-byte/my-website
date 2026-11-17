// Firearms PIP = Post Incident Procedure. The checklist command ticks off after a firearms incident.
export const PIP_STEPS: { key: string; label: string }[] = [
  { key: 'scene_secured', label: 'Scene secured and preserved' },
  { key: 'weapons_secured', label: 'Weapons made safe, seized and logged' },
  { key: 'welfare_checked', label: 'Officer welfare checked' },
  { key: 'accounts_separated', label: 'Officers separated, no conferring' },
  { key: 'statements_started', label: 'Initial accounts / statements started' },
  { key: 'debrief_done', label: 'Debrief completed' },
];

export const PIP_STATUS = ['open', 'under_review', 'closed'] as const;
export const COLLISION_SEVERITY = ['minor', 'moderate', 'serious', 'fatal'] as const;
export const COLLISION_STATUS = ['open', 'under_review', 'closed'] as const;

export const STATUS_LABEL: Record<string, string> = { open: 'Open', under_review: 'Under review', closed: 'Closed' };
export const STATUS_STYLE: Record<string, string> = {
  open: 'text-amber-700 border-amber-200 bg-amber-50',
  under_review: 'text-sky-700 border-sky-200 bg-sky-50',
  closed: 'text-slate-600 border-slate-200 bg-slate-50',
};
