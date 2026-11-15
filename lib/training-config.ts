// Role + channel IDs used by trainings and the trainer panel.
// Set the role IDs in your env (Vercel) so you never have to edit code:
//   DISCORD_IPP_ROLE_ID, DISCORD_ADVANCED_ROLE_ID, DISCORD_TRAINER_ROLE_ID
export const IPP_ROLE_ID = process.env.DISCORD_IPP_ROLE_ID || '1534127812787703828';
export const ADVANCED_ROLE_ID = process.env.DISCORD_ADVANCED_ROLE_ID || '1534123913125036093';
export const TRAINER_ROLE_ID = process.env.DISCORD_TRAINER_ROLE_ID || '';

// Command tiers (set these in env):
//   Gold   - sees the trainer panel and approves role requests (the bot then gives the role on Discord)
//   Silver - posts trainings and can view division applications
//   Bronze - posts trainings
export const GOLD_ROLE_ID = process.env.DISCORD_GOLD_COMMAND_ROLE_ID || '1532828658979569894';
export const SILVER_ROLE_ID = process.env.DISCORD_SILVER_COMMAND_ROLE_ID || '1532828760410427432';
export const BRONZE_ROLE_ID = process.env.DISCORD_BRONZE_COMMAND_ROLE_ID || '1532828869944545410';

// Optional extra role (e.g. "Met Police Command") that can see the Command tab. Set DISCORD_MET_COMMAND_ROLE_ID in env.
export const MET_COMMAND_ROLE_ID = process.env.DISCORD_MET_COMMAND_ROLE_ID || '';
const COMMAND_MANAGEMENT_ROLE_IDS = ['1497557905275224149', '1497557905275224148'];

/** Who can see the Command tab and open /dashboard/command: management, Gold/Silver/Bronze command, or the Met Command role. */
export function hasCommandAccess(roles: string[]): boolean {
  return (
    roles.some((r) => COMMAND_MANAGEMENT_ROLE_IDS.includes(r)) ||
    [GOLD_ROLE_ID, SILVER_ROLE_ID, BRONZE_ROLE_ID, MET_COMMAND_ROLE_ID].some((id) => !!id && roles.includes(id))
  );
}

export const hasRoleId = (roles: string[], id: string) => !!id && roles.includes(id);

// Voice channel people wait in before a training starts.
export const TRAINING_VC_ID = process.env.DISCORD_TRAINING_VC_ID || '1497557910283223266';

// ONE channel for every log: staff warn / kick / ban / notes, in-game moderation, ban appeals,
// division applications and maintenance changes. Change it with DISCORD_LOG_CHANNEL_ID.
// (The old per-type variables are ignored on purpose so nothing can still point at an old channel.)
export const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID || '1571300231021203476';
export const MODERATION_LOG_CHANNEL_ID = LOG_CHANNEL_ID;

// Role requests must never be posted into the moderation log channel, even if an env var points at it.
const ROLE_REQUESTS_FALLBACK = '1532786346920247398';
const roleRequestsEnv = process.env.DISCORD_ROLE_REQUESTS_CHANNEL_ID || ROLE_REQUESTS_FALLBACK;
export const ROLE_REQUESTS_CHANNEL_ID =
  roleRequestsEnv === MODERATION_LOG_CHANNEL_ID ? ROLE_REQUESTS_FALLBACK : roleRequestsEnv;

export const REQUIREMENT_MESSAGE =
  'You need to be IPP and a trained driver first before you can attend this training.';

/** True only if the member holds BOTH the IPP and Advanced roles. Fails closed if the IDs aren't set. */
export function meetsTrainingRequirements(roles: string[]): boolean {
  if (!IPP_ROLE_ID || !ADVANCED_ROLE_ID) {
    console.error('DISCORD_IPP_ROLE_ID / DISCORD_ADVANCED_ROLE_ID are not set - blocking restricted training.');
    return false;
  }
  return roles.includes(IPP_ROLE_ID) && roles.includes(ADVANCED_ROLE_ID);
}

export const isTrainerRoles = (roles: string[]) => !!TRAINER_ROLE_ID && roles.includes(TRAINER_ROLE_ID);

// Roles a trainer can request for someone. Roles without an ID configured are manual (management assigns by hand).
export const CED_ROLE_ID = process.env.DISCORD_CED_ROLE_ID || '1534127946011512913';
export const PLAIN_CLOTHES_ROLE_ID = process.env.DISCORD_PLAIN_CLOTHES_ROLE_ID || '1534128120645292112';
export const BLUE_TICKET_ROLE_ID = process.env.DISCORD_BLUE_TICKET_ROLE_ID || '1534128153339891793';

export interface RequestableRole {
  group: string;
  key: string;
  label: string;
  roleId: string;
}
const R = (group: string, key: string, label: string, roleId: string): RequestableRole => ({ group, key, label, roleId });

export const REQUESTABLE_ROLES: RequestableRole[] = [
  R('Qualifications', 'ipp', 'IPP', IPP_ROLE_ID),
  R('Qualifications', 'advanced', 'Advanced Driver', ADVANCED_ROLE_ID),
  R('Qualifications', 'ced', 'CED (Taser)', CED_ROLE_ID),
  R('Qualifications', 'first-responder', 'First Responder (Basic)', '1534128053419249714'),
  R('Qualifications', 'd13-medic', 'D13 Medic', '1534128085908197436'),
  R('Qualifications', 'plain-clothes', 'Plain Clothes', PLAIN_CLOTHES_ROLE_ID),
  R('Qualifications', 'blue-ticket', 'Firearms Ticket (Blue Ticket)', BLUE_TICKET_ROLE_ID),
  R('Qualifications', 'd1-carrier', 'D1 Carrier Ticket', '1559217596014927892'),
  R('Qualifications', 'po-l3', 'Public Order Level 3', '1534128215684288632'),
  R('Qualifications', 'po-l2', 'Public Order Level 2', '1534128241265086574'),
  R('Qualifications', 'po-l1', 'Public Order Level 1', '1534128258289893489'),
  R('Qualifications', 'po-medic', 'Public Order Medic', '1534128319862276197'),
  R('Qualifications', 'cbrn', 'CBRN', '1559215552411730011'),
  R('Frontline Policing', 'fp-erpt', 'FP | Emergency Response & Patrol Team', '1533023096922050750'),
  R('Frontline Policing', 'fp-vsu', 'FP | Violence Suppression Unit', '1534121522506104905'),
  R('Frontline Policing', 'fp-snt', 'FP | Safer Neighbourhoods Team', '1534121640622034984'),
  R('Frontline Policing', 'fp-area-driver', 'FP | Area Driver', '1534121681562636340'),
  R('MET Operations', 'mo2', 'MO2 | Criminal Investigation Department', '1533023647617257542'),
  R('MET Operations', 'mo3', 'MO3 | Covert Policing', '1533023725690032148'),
  R('MET Operations', 'mo4', 'MO4 | Forensic Services', '1533023743709024347'),
  R('MET Operations', 'mo6', 'MO6 | Public Order Planning', '1533023766454468702'),
  R('MET Operations', 'mo7', 'MO7 | Taskforce', '1533023754253373560'),
  R('MET Operations', 'mo8', 'MO8 | Roads Transport Policing Command', '1533024098098352169'),
  R('MET Operations', 'mo9', 'MO9 | Met Detention', '1533024109930479616'),
  R('MET Operations', 'mo12', 'MO12 | MetCC', '1533031933347495986'),
  R('MET Operations', 'mo19-afo', 'MO19 | Authorised Firearms Officer', '1547627701056053458'),
  R('MO2 Sub-Divisions', 'mo2-hcn', 'MO2 | Hostage & Crisis Negotiator', '1534122222958936195'),
  R('MO2 Sub-Divisions', 'mo2-gvm', 'MO2 | Gang Violence Matrix', '1534122306539094066'),
  R('MO2 Sub-Divisions', 'mo2-spider', 'MO2 | Spider', '1534122316982784010'),
  R('MO2 Sub-Divisions', 'mo2-grits', 'MO2 | GRITS', '1534122295566536725'),
  R('MO2 Sub-Divisions', 'mo2-ops-support', 'MO2 | Operational Support', '1534122451653623958'),
  R('MO2 Sub-Divisions', 'mo2-priority-desks', 'MO2 | Priority Desks', '1534122530367868938'),
  R('MO3 Sub-Divisions', 'mo3-uco', 'MO3 | Undercover Operations', '1534122790238687263'),
  R('MO3 Sub-Divisions', 'mo3-ss', 'MO3 | Specialist Surveillance', '1534122938473906286'),
  R('MO3 Sub-Divisions', 'mo3-idt', 'MO3 | Intelligence Development Team', '1534122981993742446'),
  R('MO3 Sub-Divisions', 'mo3-asi', 'MO3 | Armed Surveillance and Intelligence', '1534127033440014446'),
  R('MO6 Sub-Divisions', 'mo6-poct', 'MO6 | Public Order Crime Team', '1566862217612370021'),
  R('MO6 Sub-Divisions', 'mo6-motu', 'MO6 | Major Operations & Training Unit (MPSTC)', '1566862807692083401'),
  R('MO7 Sub-Divisions', 'mo7-dsu', 'MO7 | DSU', '1534123141104799744'),
  R('MO7 Sub-Divisions', 'mo7-tst', 'MO7 | TST', '1534123261091119114'),
  R('MO7 Sub-Divisions', 'mo7-interceptor', 'MO7 | Interceptor', '1534123250072948826'),
  R('MO7 Sub-Divisions', 'mo7-mpu', 'MO7 | MPU', '1534123421179318293'),
  R('MO7 Sub-Divisions', 'mo7-tsg', 'MO7 | TSG', '1534123519074631810'),
  R('MO7 Sub-Divisions', 'mo7-air', 'MO7 | Air Support Unit', '1559218253887447130'),
  R('MO8 Sub-Divisions', 'mo8-motorbike', 'MO8 | Motorbike Trained', '1534124033732378685'),
  R('MO8 Sub-Divisions', 'mo8-cvu', 'MO8 | Commercial Vehicle Unit', '1534124061674832025'),
  R('MO8 Sub-Divisions', 'mo8-rdrt', 'MO8 | Road Danger Reduction Team', '1566866933826195536'),
  R('MO8 Sub-Divisions', 'mo8-sci', 'MO8 | Serious Collision Investigation', '1566867102948663466'),
  R('MO19 / SO Sub-Divisions', 'mo19-ofc', 'MO19 | OFC', '1534124654791360632'),
  R('MO19 / SO Sub-Divisions', 'mo19-tfc', 'MO19 | TFC', '1534124584717258772'),
  R('MO19 / SO Sub-Divisions', 'mo19-sfc', 'MO19 | SFC', '1534124152556884130'),
  R('MO19 / SO Sub-Divisions', 'mo19-sfo', 'MO19 | SFO', '1534126256830808145'),
  R('MO19 / SO Sub-Divisions', 'mo19-tro', 'MO19 | TRO', '1534126688202395648'),
  R('MO19 / SO Sub-Divisions', 'so14-rasp', 'SO14 | RASP', '1534124721715679322'),
  R('MO19 / SO Sub-Divisions', 'so14-seg', 'SO14 | SEG', '1534125054177316864'),
  R('MO19 / SO Sub-Divisions', 'so14-seg-tl', 'SO14 | SEG Team Leader', '1534126377094221875'),
  R('MO19 / SO Sub-Divisions', 'so14-seg-rp', 'SO14 | SEG Route Planning', '1534126530396160131'),
  R('MO19 / SO Sub-Divisions', 'so14-seg-scout', 'SO14 | SEG Scout Biker', '1534126595487305799'),
  R('MO19 / SO Sub-Divisions', 'so14-cpo', 'SO14 | Close Protection Officer', '1534126997578584064'),
  R('MO19 / SO Sub-Divisions', 'so15-ctsfo', 'SO15 | CTSFO', '1534126011887779850'),
  R('MO19 / SO Sub-Divisions', 'so15-eod', 'SO15 | EOD', '1534127082307715264'),
  R('MO19 / SO Sub-Divisions', 'so16-padp', 'SO16 | PADP', '1534125298147131474'),
  R('MO19 / SO Sub-Divisions', 'so18-soap', 'SO18 | SOAP', '1534125561449021643'),
  R('MPS Departments', 'mps-dsd', 'MPS | Driving Standards Department', '1559219008744726598'),
  R('MPS Departments', 'mps-acat', 'MPS | Anti-Corruption & Abuse Team', '1566858721340948641'),
  R('MPS Departments', 'mps-psd', 'MPS | Professional Standards Department', '1559219128559079516'),
  R('MPS Departments', 'mps-ld-hendon', 'MPS | L&D Hendon Instructor', '1567278429446086666'),
  R('Other', 'other', 'Other (management assigns manually)', ''),
];
