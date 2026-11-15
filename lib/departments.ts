import { GOLD_ROLE_ID } from '@/lib/training-config';

// Departments that have their own Command suite besides the Met Police one.
// Met Police Gold Command + management can open all of them. Optionally give a department its own command role
// via env (DISCORD_LAS_COMMAND_ROLE_ID / DISCORD_LFB_COMMAND_ROLE_ID) so those commanders can open just theirs.
export const LAS_COMMAND_ROLE_ID = process.env.DISCORD_LAS_COMMAND_ROLE_ID || '';
export const LFB_COMMAND_ROLE_ID = process.env.DISCORD_LFB_COMMAND_ROLE_ID || '';

export interface CommandDepartment {
  slug: 'las' | 'lfb';
  title: string;
  short: string;
  /** `divisions.department` values managed from this command suite. Control recruitment is shared by both suites. */
  divisionDepartments: string[];
  commandRoleId: string;
  accent: string;
}

export const COMMAND_DEPARTMENTS: Record<string, CommandDepartment> = {
  las: {
    slug: 'las',
    title: 'London Ambulance Service Command',
    short: 'LAS',
    divisionDepartments: ['LAS', 'CONTROL'],
    commandRoleId: LAS_COMMAND_ROLE_ID,
    accent: 'bg-emerald-600',
  },
  lfb: {
    slug: 'lfb',
    title: 'London Fire Brigade Command',
    short: 'LFB',
    divisionDepartments: ['LFB', 'CONTROL'],
    commandRoleId: LFB_COMMAND_ROLE_ID,
    accent: 'bg-amber-600',
  },
};

/** Departments whose recruitment Gold Command may run (open/close, review applications). */
export const GOLD_MANAGED_DEPARTMENTS = ['LAS', 'LFB', 'CONTROL'];

/** Can this member open the given department's command suite? Gold command, management, or that department's own role. */
export function canOpenDepartment(roles: string[], isManagement: boolean, dept: CommandDepartment): boolean {
  return (
    isManagement ||
    (!!GOLD_ROLE_ID && roles.includes(GOLD_ROLE_ID)) ||
    (!!dept.commandRoleId && roles.includes(dept.commandRoleId))
  );
}
