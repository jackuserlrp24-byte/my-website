// E-form definitions copied from the MDT (CO-MDT html/apps/policesystem/eforms.js). Keep the two in step if you add a form.
export interface EField { k: string; l: string; t: string; o?: string[]; req?: number; max?: number; w?: string }
export interface EFormDef { title: string; prefix: string; desc?: string; fields: EField[]; photos?: boolean }
export const EFORM_DEFS: Record<string, EFormDef> = {
 "custody": {
  "title": "Custody Record",
  "prefix": "CU",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12
   },
   {
    "k": "detainee",
    "l": "Detainee name",
    "t": "text",
    "req": 1
   },
   {
    "k": "dob",
    "l": "Date of birth",
    "t": "text",
    "max": 10
   },
   {
    "k": "arrestloc",
    "l": "Arrest location",
    "t": "text",
    "req": 1
   },
   {
    "k": "officer",
    "l": "Arresting officer / callsign",
    "t": "text",
    "req": 1
   },
   {
    "k": "arrtime",
    "l": "Time of arrest",
    "t": "text",
    "max": 8
   },
   {
    "k": "custtime",
    "l": "Time arrived in custody",
    "t": "text",
    "max": 8
   },
   {
    "k": "offence",
    "l": "Offence(s) arrested for",
    "t": "text",
    "req": 1
   },
   {
    "k": "leg",
    "l": "Legislation / power relied on",
    "t": "checks",
    "o": [
     "PACE 1984 s.24 (power of arrest)",
     "PACE 1984 s.37 (duty of custody officer)",
     "PACE 1984 s.41 (detention limits)",
     "PACE 1984 s.54 (search of detained persons)",
     "Mental Health Act 1983 s.136",
     "Other"
    ],
    "req": 1
   },
   {
    "k": "legother",
    "l": "Other legislation / details",
    "t": "text",
    "max": 200
   },
   {
    "k": "grounds",
    "l": "Grounds for detention",
    "t": "area",
    "req": 1
   },
   {
    "k": "solicitor",
    "l": "Solicitor requested",
    "t": "select",
    "o": [
     "No",
     "Yes - duty solicitor",
     "Yes - own solicitor"
    ]
   },
   {
    "k": "informed",
    "l": "Rights & entitlements given",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "codes",
    "l": "PACE Codes of Practice offered",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "aa",
    "l": "Appropriate adult required",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "interp",
    "l": "Interpreter required",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "risk",
    "l": "Risk assessment",
    "t": "select",
    "o": [
     "Low",
     "Medium",
     "High"
    ],
    "req": 1
   },
   {
    "k": "medical",
    "l": "Medical attention required",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "injuries",
    "l": "Injuries / condition on arrival",
    "t": "area"
   },
   {
    "k": "property",
    "l": "Property held",
    "t": "area"
   },
   {
    "k": "outcome",
    "l": "Outcome",
    "t": "select",
    "o": [
     "In custody",
     "Charged",
     "Released under investigation",
     "Released on bail",
     "Released NFA",
     "Remanded",
     "Other"
    ]
   },
   {
    "k": "notes",
    "l": "Notes",
    "t": "area"
   }
  ]
 },
 "taser": {
  "title": "Taser Discharge",
  "prefix": "TD",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1
   },
   {
    "k": "subject",
    "l": "Subject name / description",
    "t": "text",
    "req": 1
   },
   {
    "k": "mode",
    "l": "Mode of use",
    "t": "select",
    "o": [
     "Drawn only",
     "Red-dot / laser painted",
     "Arc display",
     "Drive stun",
     "Probes fired"
    ],
    "req": 1
   },
   {
    "k": "cartridges",
    "l": "Cartridges fired",
    "t": "number"
   },
   {
    "k": "hit",
    "l": "Probes made contact",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "effective",
    "l": "Effective",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "warned",
    "l": "Warning given before use",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "injuries",
    "l": "Injuries to subject",
    "t": "text"
   },
   {
    "k": "medical",
    "l": "Medical attention / aftercare given",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "leg",
    "l": "Legislation / power relied on",
    "t": "checks",
    "o": [
     "Criminal Law Act 1967 s.3",
     "Common law (self-defence / defence of others)",
     "Criminal Justice and Immigration Act 2008 s.76",
     "PACE 1984 s.24 (power of arrest)",
     "PACE 1984 s.117 (reasonable force)",
     "Mental Health Act 1983 s.136",
     "Other"
    ],
    "req": 1
   },
   {
    "k": "legother",
    "l": "Other legislation / details",
    "t": "text",
    "max": 200
   },
   {
    "k": "circ",
    "l": "Circumstances",
    "t": "area",
    "req": 1
   },
   {
    "k": "just",
    "l": "Justification (necessity / proportionality)",
    "t": "area",
    "req": 1
   }
  ]
 },
 "firearms": {
  "title": "Firearms PIP",
  "prefix": "FP",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1
   },
   {
    "k": "authoriser",
    "l": "Authorising officer / commander",
    "t": "text"
   },
   {
    "k": "weapon",
    "l": "Weapon type",
    "t": "text",
    "req": 1
   },
   {
    "k": "rounds",
    "l": "Rounds fired",
    "t": "number"
   },
   {
    "k": "status",
    "l": "Subject status",
    "t": "select",
    "o": [
     "No subject struck",
     "Uninjured",
     "Injured",
     "Fatal"
    ]
   },
   {
    "k": "safe",
    "l": "Weapon(s) made safe and secured",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "separated",
    "l": "Officers separated",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "scene",
    "l": "Scene preserved",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "firstaid",
    "l": "First aid given",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "psd",
    "l": "PSD / IOPC notified",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "leg",
    "l": "Legislation / power relied on",
    "t": "checks",
    "o": [
     "Criminal Law Act 1967 s.3",
     "Common law (self-defence / defence of others)",
     "Criminal Justice and Immigration Act 2008 s.76",
     "PACE 1984 s.24 (power of arrest)",
     "PACE 1984 s.117 (reasonable force)",
     "Mental Health Act 1983 s.136",
     "Other"
    ],
    "req": 1
   },
   {
    "k": "legother",
    "l": "Other legislation / details",
    "t": "text",
    "max": 200
   },
   {
    "k": "summary",
    "l": "Summary of incident",
    "t": "area",
    "req": 1
   }
  ]
 },
 "collision": {
  "title": "Police Collision Report",
  "prefix": "PC",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1
   },
   {
    "k": "vrm",
    "l": "Police vehicle VRM / callsign",
    "t": "text",
    "req": 1
   },
   {
    "k": "driver",
    "l": "Driver",
    "t": "text",
    "req": 1
   },
   {
    "k": "response",
    "l": "On a response / emergency call",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "speed",
    "l": "Approx. speed (mph)",
    "t": "number"
   },
   {
    "k": "conditions",
    "l": "Road / weather conditions",
    "t": "select",
    "o": [
     "Dry",
     "Wet",
     "Icy",
     "Fog",
     "Night - lit",
     "Night - unlit"
    ]
   },
   {
    "k": "other",
    "l": "Other party VRM / details",
    "t": "text"
   },
   {
    "k": "injuries",
    "l": "Injuries",
    "t": "text"
   },
   {
    "k": "damage",
    "l": "Damage",
    "t": "text"
   },
   {
    "k": "leg",
    "l": "Legislation / exemption relied on",
    "t": "checks",
    "o": [
     "Road Traffic Regulation Act 1984 s.87 (emergency exemption)",
     "Road Traffic Act 1988 ss.2-3 (dangerous / careless driving)",
     "Road Traffic Act 1988 s.170 (duty to stop / report)",
     "Other"
    ]
   },
   {
    "k": "legother",
    "l": "Other legislation / details",
    "t": "text",
    "max": 200
   },
   {
    "k": "circ",
    "l": "Circumstances of collision",
    "t": "area",
    "req": 1
   }
  ],
  "photos": true
 },
 "force": {
  "title": "Use of Force",
  "prefix": "UF",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1
   },
   {
    "k": "subject",
    "l": "Subject name / description",
    "t": "text",
    "req": 1
   },
   {
    "k": "tactics",
    "l": "Tactics used",
    "t": "checks",
    "o": [
     "Handcuffing",
     "Unarmed skills",
     "Limb restraints",
     "Baton",
     "PAVA / incapacitant spray",
     "Taser",
     "Shield",
     "Police dog",
     "Other"
    ],
    "req": 1
   },
   {
    "k": "reason",
    "l": "Reason for force",
    "t": "select",
    "o": [
     "Protect self",
     "Protect another person",
     "Prevent escape",
     "Prevent crime / breach of peace",
     "Make an arrest",
     "Protect property"
    ],
    "req": 1
   },
   {
    "k": "resisted",
    "l": "Subject resisted / was violent",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "sinjury",
    "l": "Injury to subject",
    "t": "text"
   },
   {
    "k": "oinjury",
    "l": "Injury to officer(s)",
    "t": "text"
   },
   {
    "k": "medical",
    "l": "Medical attention given",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "leg",
    "l": "Legislation / power relied on",
    "t": "checks",
    "o": [
     "Criminal Law Act 1967 s.3",
     "Common law (self-defence / defence of others)",
     "Criminal Justice and Immigration Act 2008 s.76",
     "PACE 1984 s.24 (power of arrest)",
     "PACE 1984 s.117 (reasonable force)",
     "Mental Health Act 1983 s.136",
     "Other"
    ],
    "req": 1
   },
   {
    "k": "legother",
    "l": "Other legislation / details",
    "t": "text",
    "max": 200
   },
   {
    "k": "circ",
    "l": "Circumstances",
    "t": "area",
    "req": 1
   },
   {
    "k": "just",
    "l": "Justification (necessity / proportionality)",
    "t": "area",
    "req": 1
   }
  ]
 },
 "incident": {
  "title": "Incident Report",
  "prefix": "IR",
  "desc": "Report on a CAD incident. Pick an open incident above to fill in the CAD details.",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12,
    "req": 1
   },
   {
    "k": "title",
    "l": "Incident",
    "t": "text",
    "req": 1
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1
   },
   {
    "k": "grade",
    "l": "Response grade",
    "t": "select",
    "o": [
     "Immediate",
     "Urgent",
     "Routine"
    ]
   },
   {
    "k": "units",
    "l": "Units / officers attending",
    "t": "text"
   },
   {
    "k": "summary",
    "l": "Summary of incident",
    "t": "area",
    "req": 1
   },
   {
    "k": "actions",
    "l": "Action taken",
    "t": "area",
    "req": 1
   },
   {
    "k": "outcome",
    "l": "Outcome",
    "t": "select",
    "o": [
     "Resolved on scene",
     "Arrest made",
     "Report / crime reference created",
     "Referred to another agency",
     "No further action",
     "Ongoing"
    ],
    "req": 1
   },
   {
    "k": "injuries",
    "l": "Injuries / welfare issues",
    "t": "text"
   },
   {
    "k": "followup",
    "l": "Follow-up required",
    "t": "area"
   }
  ],
  "photos": true
 },
 "supvreview": {
  "title": "Supervisor Incident Review",
  "prefix": "SR",
  "desc": "Supervisor review of how an incident was handled.",
  "fields": [
   {
    "k": "cad",
    "l": "CAD reference",
    "t": "text",
    "max": 12,
    "req": 1
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text"
   },
   {
    "k": "officers",
    "l": "Officer(s) reviewed",
    "t": "text",
    "req": 1
   },
   {
    "k": "policy",
    "l": "Policy / procedure followed",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ],
    "req": 1
   },
   {
    "k": "bwv",
    "l": "Body worn video reviewed",
    "t": "select",
    "o": [
     "N/A",
     "Yes",
     "No"
    ]
   },
   {
    "k": "welfare",
    "l": "Officer welfare checked",
    "t": "select",
    "o": [
     "Yes",
     "No"
    ]
   },
   {
    "k": "review",
    "l": "Outcome of review",
    "t": "select",
    "o": [
     "Satisfactory",
     "Satisfactory - learning identified",
     "Concerns identified",
     "Referred to PSD"
    ],
    "req": 1
   },
   {
    "k": "findings",
    "l": "Findings",
    "t": "area",
    "req": 1
   },
   {
    "k": "actions",
    "l": "Actions / learning",
    "t": "area"
   },
   {
    "k": "signoff",
    "l": "Sign-off",
    "t": "select",
    "o": [
     "Approved",
     "Returned for amendment",
     "Escalated"
    ],
    "req": 1
   }
  ]
 },
 "nip": {
  "title": "Notice of Intended Prosecution",
  "prefix": "NP",
  "desc": "Metropolitan Police - Camera Processing Services / Met Prosecutions. The reference is given on submit; the passcode is generated for you.",
  "fields": [
   {
    "k": "h1",
    "l": "Notice",
    "t": "heading"
   },
   {
    "k": "passcode",
    "l": "Passcode",
    "t": "text",
    "max": 10,
    "req": 1
   },
   {
    "k": "noticedate",
    "l": "Date of notice",
    "t": "date",
    "req": 1
   },
   {
    "k": "h2",
    "l": "Addressee",
    "t": "heading"
   },
   {
    "k": "to",
    "l": "Name (Mr / Mrs / Ms ...)",
    "t": "text",
    "req": 1,
    "w": "full"
   },
   {
    "k": "address",
    "l": "Address",
    "t": "area",
    "req": 1
   },
   {
    "k": "n0",
    "l": "(If the addressee is a limited company, this form is for the attention of the company secretary, or other responsible person if no company secretary.)",
    "t": "note"
   },
   {
    "k": "h3",
    "l": "Under Section 1 of the Road Traffic Offenders Act 1988, we intend to take proceedings against the driver of the following motor vehicle",
    "t": "heading"
   },
   {
    "k": "vrm",
    "l": "VRM",
    "t": "text",
    "max": 10,
    "req": 1
   },
   {
    "k": "make",
    "l": "Vehicle make",
    "t": "text"
   },
   {
    "k": "model",
    "l": "Vehicle model",
    "t": "text"
   },
   {
    "k": "h4",
    "l": "Alleged offence",
    "t": "heading"
   },
   {
    "k": "offence",
    "l": "Alleged offence",
    "t": "select",
    "req": 1,
    "o": [
     "Exceeding the speed limit - contrary to a local traffic order and ss.84 & 89(1) Road Traffic Regulation Act 1984 and Sch. 2 Road Traffic Offenders Act 1988",
     "Failing to comply with a traffic light signal - contrary to s.36 Road Traffic Act 1988 and Sch. 2 Road Traffic Offenders Act 1988",
     "Other (describe below)"
    ]
   },
   {
    "k": "details",
    "l": "Alleged offence details",
    "t": "area",
    "req": 1
   },
   {
    "k": "speed",
    "l": "Recorded speed (mph)",
    "t": "number"
   },
   {
    "k": "limit",
    "l": "Speed limit (mph)",
    "t": "number"
   },
   {
    "k": "time",
    "l": "Time",
    "t": "time",
    "req": 1
   },
   {
    "k": "date",
    "l": "Date",
    "t": "date",
    "req": 1
   },
   {
    "k": "location",
    "l": "Location",
    "t": "text",
    "req": 1,
    "w": "full"
   },
   {
    "k": "h5",
    "l": "Requirement for name and address of driver",
    "t": "heading"
   },
   {
    "k": "n1",
    "l": "This allegation can be supported by photographic evidence in court from a device approved by the Home Office.",
    "t": "note"
   },
   {
    "k": "n2",
    "l": "Under Section 172 of the Road Traffic Act 1988 you must provide the information asked for on the back of this form within 28 days. If you do not, you could be fined up to £1000, receive six penalty points on your licence, or be disqualified from driving (s.172(3)).",
    "t": "note"
   },
   {
    "k": "n3",
    "l": "Only fill this form in if you are the person it is addressed to. If you were the driver, fill in Sections 1, 2 and 5 over the page; if you were not the driver, give any information that could identify the driver (Sections 1, 3, 4 and 5). The driver may be offered an educational course instead of a fine and penalty points. You can also reply online at acdp.met.police.uk using the notice reference and passcode above.",
    "t": "note"
   },
   {
    "k": "n4",
    "l": "Please return the filled-in and signed document to Camera Processing Services, Met Prosecutions.",
    "t": "note"
   },
   {
    "k": "issuer",
    "l": "Issued by (on behalf of the Commissioner of Police of the Metropolis)",
    "t": "text",
    "req": 1
   },
   {
    "k": "service",
    "l": "Unit / callsign",
    "t": "text",
    "max": 20
   }
  ],
  "photos": true
 }
};

// Order of the "New form" buttons (same as the MDT). Supervision and custody forms follow.
export const EFORM_ORDER = ["taser", "firearms", "collision", "force", "nip", "incident", "supvreview", "custody"];
