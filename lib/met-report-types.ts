// The three report types on /met-police/reports. Each field becomes a labelled answer saved with the report.
export type ReportKey = 'crime' | 'use_of_force' | 'stop_search';

export interface ReportField {
  name: string;
  label: string;
  kind?: 'text' | 'textarea' | 'select' | 'datetime';
  options?: string[];
  required?: boolean;
  max?: number;
}

export interface ReportType {
  key: ReportKey;
  prefix: string;
  title: string;
  blurb: string;
  summaryField: string; // which field is used as the one-line summary in lists
  fields: ReportField[];
}

export const REPORT_TYPES: ReportType[] = [
  {
    key: 'crime',
    prefix: 'CR',
    title: 'Crime report',
    blurb: 'Record an offence that has been reported to you or that you have witnessed.',
    summaryField: 'offence',
    fields: [
      { name: 'offence', label: 'Offence', required: true, max: 160 },
      { name: 'occurred', label: 'Date and time of offence', kind: 'datetime', required: true },
      { name: 'location', label: 'Location', required: true, max: 160 },
      { name: 'victim', label: 'Victim (name / details)', max: 200 },
      { name: 'suspect', label: 'Suspect (name / description)', max: 300 },
      { name: 'description', label: 'What happened', kind: 'textarea', required: true, max: 4000 },
      { name: 'action', label: 'Action taken', kind: 'textarea', max: 2000 },
    ],
  },
  {
    key: 'use_of_force',
    prefix: 'UOF',
    title: 'Use of force',
    blurb: 'Every use of force must be recorded and justified. Include what you used and why it was necessary.',
    summaryField: 'subject',
    fields: [
      { name: 'subject', label: 'Subject (person force was used on)', required: true, max: 160 },
      { name: 'occurred', label: 'Date and time', kind: 'datetime', required: true },
      { name: 'location', label: 'Location', required: true, max: 160 },
      { name: 'tactic', label: 'Force used', kind: 'select', required: true, options: ['Handcuffing', 'Empty hand / restraint', 'Baton', 'PAVA / incapacitant spray', 'Taser', 'Firearm drawn', 'Firearm discharged', 'Other'] },
      { name: 'necessity', label: 'Why was force necessary, proportionate and lawful?', kind: 'textarea', required: true, max: 4000 },
      { name: 'injuries', label: 'Injuries (subject / officer)', kind: 'textarea', max: 1000 },
      { name: 'medical', label: 'Medical attention given or requested', max: 300 },
    ],
  },
  {
    key: 'stop_search',
    prefix: 'SS',
    title: 'Stop and search',
    blurb: 'Record the legal power, your grounds and the outcome of every stop and search.',
    summaryField: 'subject',
    fields: [
      { name: 'subject', label: 'Person searched', required: true, max: 160 },
      { name: 'occurred', label: 'Date and time', kind: 'datetime', required: true },
      { name: 'location', label: 'Location', required: true, max: 160 },
      { name: 'power', label: 'Legal power', kind: 'select', required: true, options: ['PACE 1984, s.1', 'Misuse of Drugs Act 1971, s.23', 'Criminal Justice and Public Order Act 1994, s.60', 'Terrorism Act 2000, s.43', 'Other'] },
      { name: 'object', label: 'Object of the search', required: true, max: 200 },
      { name: 'grounds', label: 'Grounds for the search', kind: 'textarea', required: true, max: 3000 },
      { name: 'outcome', label: 'Outcome', kind: 'select', required: true, options: ['Nothing found', 'Items found', 'Arrest', 'Other'] },
      { name: 'items', label: 'Items found / action taken', kind: 'textarea', max: 1500 },
    ],
  },
];

export const REPORT_BY_KEY = Object.fromEntries(REPORT_TYPES.map((t) => [t.key, t])) as Record<ReportKey, ReportType>;
