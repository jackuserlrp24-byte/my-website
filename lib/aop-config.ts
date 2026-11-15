// Shared (server + client safe). Keep in step with the list in the CO-HudScript /aop menu.
export const AOP_AREAS = [
  'Enfield',
  'Barnet',
  'Brent',
  'Hackney',
  'RAF Northolt',
  'Hillingdon',
  'Haringey',
  'Kensington & Chelsea',
  'Westminster',
  'Hammersmith & Fulham',
  'Camden',
  'Southwark',
  'Lewisham',
  'Greenwich',
  'Heathrow Airport',
  'Royal London Docks',
  'Whole Map',
  'South Of Map',
  'North Of Map',
] as const;

/** The HUD shows the AOP in capitals, with the picked areas joined by " & ". */
export const formatAop = (areas: string[]) =>
  AOP_AREAS.filter((a) => areas.includes(a))
    .map((a) => (a === 'Royal London Docks' ? 'London Docks' : a))
    .join(' & ')
    .toUpperCase();

/** Turns a stored AOP string back into the list of areas it was made from (for pre-selecting the buttons). */
export function parseAop(aop: string | null): string[] {
  if (!aop) return [];
  let rest = aop.toUpperCase();
  const found: string[] = [];
  const byLength = [...AOP_AREAS].sort((a, b) => b.length - a.length);
  for (const area of byLength) {
    const key = (area === 'Royal London Docks' ? 'London Docks' : area).toUpperCase();
    if (rest.includes(key)) {
      found.push(area);
      rest = rest.replace(key, '');
    }
  }
  return AOP_AREAS.filter((a) => found.includes(a));
}
