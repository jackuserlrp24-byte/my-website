import { DEVELOPER_ROLE_IDS } from '@/lib/portal';
import { GOLD_ROLE_ID, LAS_GOLD_ROLE_ID } from '@/lib/training-config';

// Departments that have their own Command suite besides the Met Police one.
// Met Police Gold Command + management can open all of them. Each department can also have its own command roles:
//   LAS: LAS Gold Command (built in, 1545762280199688252) and optionally DISCORD_LAS_COMMAND_ROLE_ID, plus the developer roles.
//   LFB: optionally DISCORD_LFB_COMMAND_ROLE_ID.
export const LAS_COMMAND_ROLE_ID = process.env.DISCORD_LAS_COMMAND_ROLE_ID || '';
export const LFB_COMMAND_ROLE_ID = process.env.DISCORD_LFB_COMMAND_ROLE_ID || '';

export interface CommandDepartment {
  slug: 'las' | 'lfb';
  title: string;
  short: string;
  /** `divisions.department` values managed from this command suite. Control recruitment is shared by both suites. */
  divisionDepartments: string[];
  /** Roles that open just this department's suite. */
  commandRoleIds: string[];
  /** Developer roles can open this suite too (used for LAS). */
  developersAllowed: boolean;
  accent: string;
}

export const COMMAND_DEPARTMENTS: Record<string, CommandDepartment> = {
  las: {
    slug: 'las',
    title: 'London Ambulance Service Command',
    short: 'LAS',
    divisionDepartments: ['LAS', 'CONTROL'],
    commandRoleIds: [LAS_GOLD_ROLE_ID, LAS_COMMAND_ROLE_ID].filter(Boolean),
    developersAllowed: true,
    accent: 'bg-emerald-600',
  },
  lfb: {
    slug: 'lfb',
    title: 'London Fire Brigade Command',
    short: 'LFB',
    divisionDepartments: ['LFB', 'CONTROL'],
    commandRoleIds: [LFB_COMMAND_ROLE_ID].filter(Boolean),
    developersAllowed: false,
    accent: 'bg-amber-600',
  },
};

/** Departments whose recruitment Gold Command may run (open/close, review applications). */
export const GOLD_MANAGED_DEPARTMENTS = ['LAS', 'LFB', 'CONTROL'];

const isDeveloper = (roles: string[]) => roles.some((r) => DEVELOPER_ROLE_IDS.includes(r));

/** LAS Gold Command (or the LAS command role) holders and developers: the people who can use the LAS suite. */
export const hasLasAccess = (roles: string[]) =>
  isDeveloper(roles) || COMMAND_DEPARTMENTS.las.commandRoleIds.some((id) => roles.includes(id));

/** Can this member open the given department's command suite? Gold command, management, that department's own role, or (LAS) a developer. */
export function canOpenDepartment(roles: string[], isManagement: boolean, dept: CommandDepartment): boolean {
  return (
    isManagement ||
    (!!GOLD_ROLE_ID && roles.includes(GOLD_ROLE_ID)) ||
    dept.commandRoleIds.some((id) => roles.includes(id)) ||
    (dept.developersAllowed && isDeveloper(roles))
  );
}

/** LAS Gold Command + developers can run LAS and Control recruitment (open / close, links, deadlines, applications). */
export function canManageLasDepartment(roles: string[], department: string | null | undefined): boolean {
  return !!department && COMMAND_DEPARTMENTS.las.divisionDepartments.includes(department) && hasLasAccess(roles);
}
