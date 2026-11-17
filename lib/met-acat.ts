// Categories inside the Anti-Corruption & Abuse Team (ACAT) area. Add, remove or rename them here.
export const ACAT_CATEGORIES = [
  { slug: 'cases', title: 'Case Files', text: 'Open and closed ACAT investigations.' },
  { slug: 'referrals', title: 'Referrals & Complaints', text: 'Reports of corruption or abuse of position passed to ACAT.' },
  { slug: 'intelligence', title: 'Intelligence', text: 'Intelligence and information received about officers.' },
  { slug: 'integrity', title: 'Integrity Checks', text: 'Audits and checks on systems use, conduct and records.' },
  { slug: 'welfare', title: 'Victim & Welfare Support', text: 'Support for victims and officers affected by abuse.' },
] as const;

export const ACAT_STATUS = ['open', 'under_review', 'closed'] as const;
export const ACAT_STATUS_LABEL: Record<string, string> = { open: 'Open', under_review: 'Under review', closed: 'Closed' };
export const ACAT_STATUS_STYLE: Record<string, string> = {
  open: 'text-amber-700 border-amber-200 bg-amber-50',
  under_review: 'text-sky-700 border-sky-200 bg-sky-50',
  closed: 'text-slate-500 border-slate-200 bg-slate-50',
};

export const acatCategory = (slug: string) => ACAT_CATEGORIES.find((c) => c.slug === slug) ?? null;
