// Law Book entries shown on /met-police/law-book (search + category filter).
// These are STARTER entries based on real England & Wales offences. Edit, delete or add your own so the book
// matches the rules of your server. Keep each "summary" short and in plain English.
export interface LawEntry {
  category: string;
  offence: string;
  law: string;
  summary: string;
}

export const LAW_BOOK: LawEntry[] = [
  // Offences against the person
  { category: 'Offences against the person', offence: 'Common assault', law: 'Criminal Justice Act 1988, s.39', summary: 'Intentionally or recklessly making someone fear immediate unlawful violence, or applying unlawful force to them.' },
  { category: 'Offences against the person', offence: 'Assault occasioning actual bodily harm (ABH)', law: 'Offences Against the Person Act 1861, s.47', summary: 'An assault that causes actual bodily harm, such as bruising or a minor injury.' },
  { category: 'Offences against the person', offence: 'Wounding / grievous bodily harm (GBH)', law: 'Offences Against the Person Act 1861, s.20', summary: 'Unlawfully and maliciously wounding someone or inflicting really serious harm.' },
  { category: 'Offences against the person', offence: 'Wounding / GBH with intent', law: 'Offences Against the Person Act 1861, s.18', summary: 'Wounding or causing grievous bodily harm with the intention of causing really serious harm.' },
  { category: 'Offences against the person', offence: 'Assault on an emergency worker', law: 'Assaults on Emergency Workers (Offences) Act 2018, s.1', summary: 'Common assault against a police officer, paramedic, firefighter or other emergency worker acting in their role.' },

  // Theft and property
  { category: 'Theft and property', offence: 'Theft', law: 'Theft Act 1968, s.1', summary: 'Dishonestly taking property belonging to someone else, intending to permanently deprive them of it.' },
  { category: 'Theft and property', offence: 'Robbery', law: 'Theft Act 1968, s.8', summary: 'Theft where force, or the threat of force, is used at the time or just before to steal.' },
  { category: 'Theft and property', offence: 'Burglary', law: 'Theft Act 1968, s.9', summary: 'Entering a building as a trespasser intending to steal, cause damage or inflict harm, or stealing once inside.' },
  { category: 'Theft and property', offence: 'Taking a vehicle without consent (TWOC)', law: 'Theft Act 1968, s.12', summary: 'Taking a vehicle without the owner\'s permission, or driving or allowing yourself to be carried in one you know was taken.' },
  { category: 'Theft and property', offence: 'Going equipped', law: 'Theft Act 1968, s.25', summary: 'Having an item with you away from home that is intended for use in a burglary or theft.' },
  { category: 'Theft and property', offence: 'Criminal damage', law: 'Criminal Damage Act 1971, s.1', summary: 'Destroying or damaging someone else\'s property without lawful excuse, intentionally or recklessly.' },

  // Weapons and drugs
  { category: 'Weapons and drugs', offence: 'Possession of an offensive weapon', law: 'Prevention of Crime Act 1953, s.1', summary: 'Having an offensive weapon in a public place without lawful authority or reasonable excuse.' },
  { category: 'Weapons and drugs', offence: 'Possession of a bladed or pointed article', law: 'Criminal Justice Act 1988, s.139', summary: 'Having a bladed or sharply pointed article in a public place without good reason.' },
  { category: 'Weapons and drugs', offence: 'Possession of a firearm without a certificate', law: 'Firearms Act 1968, s.1', summary: 'Possessing, buying or acquiring a firearm or ammunition without holding the required certificate.' },
  { category: 'Weapons and drugs', offence: 'Possession of a controlled drug', law: 'Misuse of Drugs Act 1971, s.5(2)', summary: 'Having a controlled drug in your possession without lawful authority.' },
  { category: 'Weapons and drugs', offence: 'Possession with intent to supply', law: 'Misuse of Drugs Act 1971, s.5(3)', summary: 'Possessing a controlled drug with the intention of supplying it to someone else.' },

  // Public order
  { category: 'Public order', offence: 'Affray', law: 'Public Order Act 1986, s.3', summary: 'Using or threatening unlawful violence in a way that would make a reasonable person present fear for their safety.' },
  { category: 'Public order', offence: 'Fear or provocation of violence', law: 'Public Order Act 1986, s.4', summary: 'Using threatening or abusive words or behaviour intending to cause fear of, or provoke, immediate violence.' },
  { category: 'Public order', offence: 'Harassment, alarm or distress', law: 'Public Order Act 1986, s.5', summary: 'Using threatening or abusive words or behaviour within the sight or hearing of someone likely to be caused harassment, alarm or distress.' },

  // Road traffic
  { category: 'Road traffic', offence: 'Dangerous driving', law: 'Road Traffic Act 1988, s.2', summary: 'Driving far below the standard of a competent and careful driver, in a way that would be obvious as dangerous.' },
  { category: 'Road traffic', offence: 'Careless or inconsiderate driving', law: 'Road Traffic Act 1988, s.3', summary: 'Driving without due care and attention, or without reasonable consideration for other road users.' },
  { category: 'Road traffic', offence: 'Driving while disqualified', law: 'Road Traffic Act 1988, s.103', summary: 'Driving a motor vehicle on a road while disqualified from holding or obtaining a licence.' },
  { category: 'Road traffic', offence: 'Driving without insurance', law: 'Road Traffic Act 1988, s.143', summary: 'Using, or allowing someone to use, a motor vehicle on a road without the required insurance.' },
  { category: 'Road traffic', offence: 'Failing to stop after a collision', law: 'Road Traffic Act 1988, s.170', summary: 'A driver involved in a collision causing injury or damage must stop and give their details, or report it to police.' },
  { category: 'Road traffic', offence: 'Driving or in charge with excess alcohol', law: 'Road Traffic Act 1988, s.5', summary: 'Driving, attempting to drive or being in charge of a vehicle with alcohol above the prescribed limit.' },

  // Police powers
  { category: 'Police powers', offence: 'Stop and search', law: 'Police and Criminal Evidence Act 1984, s.1', summary: 'Power to stop and search a person or vehicle in a public place where there are reasonable grounds to suspect stolen or prohibited articles.' },
  { category: 'Police powers', offence: 'Arrest without warrant', law: 'Police and Criminal Evidence Act 1984, s.24', summary: 'Power to arrest anyone who is about to commit, is committing or has committed an offence, where arrest is necessary.' },
  { category: 'Police powers', offence: 'Assaulting or resisting a constable', law: 'Police Act 1996, s.89(1)', summary: 'Assaulting a constable in the execution of their duty, or assisting someone to do so.' },
  { category: 'Police powers', offence: 'Obstructing a constable', law: 'Police Act 1996, s.89(2)', summary: 'Resisting or wilfully obstructing a constable in the execution of their duty.' },
];
