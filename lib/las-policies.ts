// Policies and guidance shown on /las/policies.
// STARTER entries so the page works on day one. Edit, delete or add your own to match your server.
export interface LasPolicy {
  category: 'Service policies' | 'Operational guidance';
  title: string;
  summary: string;
  body: string[];
}

export const LAS_POLICIES: LasPolicy[] = [
  {
    category: 'Service policies',
    title: 'Patient care and conduct',
    summary: 'Treat every patient with dignity, whatever the call.',
    body: [
      'Introduce yourself, explain what you are doing and keep the patient informed.',
      'Treat everyone on their clinical need, not on who they are or what they have done.',
      'Stay professional on scene and on the radio at all times.',
    ],
  },
  {
    category: 'Service policies',
    title: 'Scene safety',
    summary: 'Your safety comes before the patient\u2019s. Do not enter an unsafe scene.',
    body: [
      'Wait for police to make a scene safe where there are weapons, violence or a hostile crowd.',
      'Park so the vehicle can leave quickly and so you do not block other emergency vehicles.',
      'If a scene becomes unsafe, withdraw and request support.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Responding and driving',
    summary: 'Drive for the conditions. Blue lights are a request, not a right.',
    body: [
      'Only use blue lights and sirens when the call grade justifies it.',
      'Slow down at junctions and red lights, and never assume others have seen you.',
      'Report any collision to command straight away.',
    ],
  },
  {
    category: 'Operational guidance',
    title: 'Working with other services',
    summary: 'Share information early and work alongside police and fire.',
    body: [
      'Tell Control your status and location as soon as you are on scene.',
      'Request police or fire support early rather than late.',
      'Hand over to the receiving hospital or crew with a clear, short report.',
    ],
  },
];
