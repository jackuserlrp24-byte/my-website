// Ready-to-send training templates. Edit the text freely - these just pre-fill the Post Training form.
export interface TrainingTemplate {
  key: string;
  name: string;
  title: string;
  durationMins: number;
  requiresIpp: boolean; // true = only members with IPP + Advanced can attend
  description: string;
}

export const TRAINING_TEMPLATES: TrainingTemplate[] = [
  {
    key: 'ipp-induction',
    name: 'IPP Induction',
    title: 'IPP Induction Training',
    durationMins: 60,
    requiresIpp: false,
    description:
      'Introduction to policing on the server: radio procedure, stop & search basics, arrests, and general conduct.\n\n**Requirements**\n• Working microphone\n• Be in the waiting VC 5 minutes before the start\n• Come in correct uniform',
  },
  {
    key: 'advanced-driver',
    name: 'Advanced Driver Course',
    title: 'Advanced Driver Course',
    durationMins: 90,
    requiresIpp: false,
    description:
      'Learn response driving, vehicle control and safe use of emergency equipment, finishing with a practical assessment.\n\n**Requirements**\n• IPP completed\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'tpac',
    name: 'TPAC Training',
    title: 'TPAC Training',
    durationMins: 90,
    requiresIpp: true,
    description:
      'Tactical Pursuit and Containment: authority to engage, tactical contact, containment and radio commentary.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'pursuit-tactical-advisor',
    name: 'Pursuit Tactical Advisor',
    title: 'Pursuit Tactical Advisor Qualification',
    durationMins: 90,
    requiresIpp: true,
    description:
      'Qualification for Pursuit Tactical Advisors: running and advising on pursuits, authorising tactics and directing units over the radio.\n\n**Requirements**\n• Hold the rank above Constable\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'roads-policing',
    name: 'Roads Policing Induction',
    title: 'Roads Policing Induction',
    durationMins: 60,
    requiresIpp: true,
    description:
      'Traffic enforcement, ANPR, motorway procedures and collision scenes.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'response-refresher',
    name: 'Response Driving Refresher',
    title: 'Response Driving Refresher',
    durationMins: 45,
    requiresIpp: true,
    description:
      'Refresher for qualified drivers: blue-light driving, junction procedure and vehicle positioning.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone',
  },
  {
    key: 'public-order-1',
    name: 'Public Order 1',
    title: 'Public Order 1 Training',
    durationMins: 90,
    requiresIpp: true,
    description:
      'Public Order Level 1: PSU basics, formations, shield tactics and radio discipline.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'public-order-2',
    name: 'Public Order 2',
    title: 'Public Order 2 Training',
    durationMins: 90,
    requiresIpp: true,
    description:
      'Public Order Level 2: advanced PSU tactics, dispersal authority and incident command.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
  {
    key: 'public-order-3',
    name: 'Public Order 3',
    title: 'Public Order 3 Training',
    durationMins: 90,
    requiresIpp: true,
    description:
      'Public Order Level 3: PSU command, planning and deployment of public order operations.\n\n**Requirements**\n• IPP + Advanced Driver\n• Working microphone\n• Be in the waiting VC 5 minutes before the start',
  },
];
