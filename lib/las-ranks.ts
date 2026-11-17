// LAS rank roles, JUNIOR first and most senior last (the order they were given). Rank = the most senior of these a person holds.
// Names are shown without the "LAS | " / "LAA | " Discord prefix.
const LIST: { name: string; id: string }[] = [
  { name: 'Trainee Paramedic', id: '1556744746460774540' },
  { name: 'Student Specialist Paramedic', id: '1556744831961800734' },
  { name: 'Emergency Medical Technician', id: '1556744905211121765' },
  { name: 'Paramedic', id: '1556750720424738948' },
  { name: 'Advanced Paramedic', id: '1556750813848674445' },
  { name: 'Senior Paramedic', id: '1556750944795099237' },
  { name: 'Mental Health Consultant', id: '1556770178593980457' },
  { name: 'Deputy Team Leader', id: '1556751284583792751' },
  { name: 'Doctor', id: '1556756281728180234' },
  { name: 'Team Leader', id: '1545761111494889472' },
  { name: 'Consultant', id: '1556756377630679041' },
  { name: 'Team Manager', id: '1545760864701780019' },
  { name: 'Emergency Planning Support Officer', id: '1545761007098536016' },
  { name: 'Clinical Team Manager', id: '1545760905764278333' },
  { name: 'Deputy General Manager', id: '1556751482106155038' },
  { name: 'Incident Response Officer', id: '1545760953231216750' },
  { name: 'General Manager', id: '1545760513152258109' },
  { name: 'Operations Manager', id: '1545760478880469042' },
  { name: 'Deputy Director of Resilience and Specialist', id: '1556743018634154194' },
  { name: 'Deputy Director of 999 Operations', id: '1556755065531007046' },
  { name: 'Deputy Director of Clinical Education', id: '1545760430939578489' },
  { name: 'Deputy Director of Ambulance Operations', id: '1545760388665180241' },
  { name: 'Director of Resilience and Specialist', id: '1545760295702499388' },
  { name: 'Director of Clinical Education & Standards', id: '1545760249934512289' },
  { name: 'Director of 999 Operations', id: '1556754809225355285' },
  { name: 'Director of Ambulance Operations', id: '1545760213330558986' },
  { name: 'Chief Paramedic', id: '1545760357002256469' },
  { name: 'Chief Medical Officer', id: '1545760325322670222' },
  { name: 'Deputy Chief Executive', id: '1545760169210941480' },
  { name: 'Chief Executive Officer', id: '1545759916533350481' },
];

/** level 0 = most senior. */
export const LAS_RANKS: { name: string; id: string; level: number }[] = LIST.map((r, i) => ({ ...r, level: LIST.length - 1 - i }));

export const LAS_RANK_ROLE_IDS = LAS_RANKS.map((r) => r.id);

/** Most senior LAS rank among a person's role IDs, or null. */
export function lasRankFromRoles(roles: string[]): { rank: string; level: number } | null {
  let best: { rank: string; level: number } | null = null;
  for (const r of LAS_RANKS) if (roles.includes(r.id) && (!best || r.level < best.level)) best = { rank: r.name, level: r.level };
  return best;
}
