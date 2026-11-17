// Force policies and operational guidance shown on /met-police/policies.
// These are STARTER entries written in plain English so the page works on day one.
// Edit, delete or add your own so they match the rules of your server. Keep each "body" short.
export interface Policy {
  category: 'Force policies' | 'Operational guidance';
  title: string;
  summary: string;
  body: string[]; // one paragraph / bullet per item
}

export const POLICIES: Policy[] = [
  {
    category: 'Force policies',
    title: 'Use of force',
    summary: 'Force must be necessary, proportionate and the minimum needed.',
    body: [
      'Use the lowest level of force that will achieve a lawful aim. Talk first where it is safe to do so.',
      'Every use of force must be justified by the threat you faced at that moment, not by what happened earlier.',
      'Give a warning before using a baton, spray or taser unless doing so would put someone at risk.',
      'Give first aid and call medical help as soon as it is safe, then complete a Use of Force report.',
    ],
  },
  {
    category: 'Force policies',
    title: 'Taser',
    summary: 'Only Taser-trained officers, and only against a person who is violent or threatening violence.',
    body: [
      'You must hold the Taser qualification (see Training).',
      'Do not use it on someone who is only running away, or on anyone in a position where a fall could cause serious harm.',
      'Always give a warning if possible. Record the serial number and report the discharge.',
    ],
  },
  {
    category: 'Force policies',
    title: 'Firearms',
    summary: 'Authorised firearms officers only. Authority comes from command.',
    body: [
      'Firearms are drawn only with command authority, or where there is an immediate threat to life.',
      'Challenge and warn before firing where practicable. Fire only to stop an imminent threat to life.',
      'After any discharge: make the scene safe, call medical help, inform command and write a Use of Force report.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Vehicle pursuits',
    summary: 'Pursuits must be authorised and constantly reassessed.',
    body: [
      'Tell control when you start a pursuit, and give your location, the vehicle and the reason.',
      'Only trained drivers may pursue. Stop if the risk to the public outweighs the need to catch the driver.',
      'Command can end a pursuit at any time. When told to stop, stop.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Stop and search',
    summary: 'You need a legal power and reasonable grounds, and you must record it.',
    body: [
      'State your name, station, the object of the search, your grounds and the legal power you are using.',
      'Searches must be carried out with respect and in as public a place as is safe.',
      'Complete a Stop and Search report straight afterwards.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Arrest and custody',
    summary: 'Arrest only when necessary, and caution everyone you arrest.',
    body: [
      'You must have a lawful reason for the arrest and believe it is necessary. Tell the person the offence and why.',
      'Caution: "You do not have to say anything. But it may harm your defence if you do not mention when questioned something which you later rely on in court. Anything you do say may be given in evidence."',
      'Record the arrest, the grounds, and any property taken.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Body-worn video',
    summary: 'Wear it, keep it working, and never delete footage.',
    body: [
      'Your camera must be on and working while you are on duty.',
      'Footage is evidence. Only command can delete footage; it is cleared automatically after 14 days.',
      'Tell people they are being recorded where practical.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Radio and communication',
    summary: 'Keep it short, clear and professional.',
    body: [
      'Use your callsign. Keep transmissions short and wait for the channel to be clear.',
      'Emergency traffic takes priority over everything else.',
    ],
  },
];
