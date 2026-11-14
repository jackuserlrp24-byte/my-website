import { PORTAL_URL } from '@/lib/portal';
import type { Division, Training } from '@/lib/portal-types';

const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

export function rosterText(names: string[], empty: string): string {
  if (!names.length) return empty;
  let out = '';
  for (let i = 0; i < names.length; i++) {
    const line = `• ${names[i]}\n`;
    if (out.length + line.length > 980) return `${out}+${names.length - i} more`;
    out += line;
  }
  return out.trimEnd();
}

export function trainingPayload(t: Training, divisionName?: string | null) {
  const start = unix(t.starts_at);
  const end = unix(t.ends_at);

  const embed: Record<string, unknown> = {
    title: t.title,
    description: t.description || 'No additional details provided.',
    color: 5793266,
    fields: [
      { name: 'Training ID', value: t.id, inline: true },
      { name: 'Division', value: divisionName || 'General', inline: true },
      { name: 'Host', value: t.host || 'TBD', inline: true },
      { name: 'Starts', value: `<t:${start}:F>\n<t:${start}:R>`, inline: true },
      { name: 'Ends', value: `<t:${end}:t>`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: `Booked On (${t.attending.length})`,
        value: rosterText(t.attending, 'No personnel booked on yet.'),
        inline: true,
      },
      {
        name: `Not Attending (${t.unattending.length})`,
        value: rosterText(t.unattending, 'No personnel marked absent.'),
        inline: true,
      },
    ],
    footer: { text: 'Central Operations Portal' },
    timestamp: t.created_at,
  };
  if (t.image_url) embed.image = { url: t.image_url };

  return {
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: 'Book On', custom_id: 'training_book_on' },
          { type: 2, style: 4, label: 'Not Attending', custom_id: 'training_not_attending' },
          { type: 2, style: 5, label: 'View Portal', url: `${PORTAL_URL}/dashboard/trainings` },
        ],
      },
    ],
  };
}

export function divisionsPayload(divisions: Division[]) {
  const departments = Array.from(new Set(divisions.map((d) => d.department)));
  const fields: { name: string; value: string; inline: boolean }[] = [];

  for (const dept of departments) {
    const inDept = divisions.filter((d) => d.department === dept);
    const open = inDept.filter((d) => d.status === 'open');
    const closed = inDept.filter((d) => d.status === 'closed');
    fields.push(
      {
        name: `${dept} - OPEN (${open.length})`,
        value: open.length ? open.map((d) => `**${d.name}**`).join('\n') : 'None currently open.',
        inline: true,
      },
      {
        name: `${dept} - CLOSED (${closed.length})`,
        value: closed.length ? closed.map((d) => d.name).join('\n') : 'None.',
        inline: true,
      }
    );
  }

  const anyOpen = divisions.some((d) => d.status === 'open');

  return {
    embeds: [
      {
        title: 'DIVISION APPLICATION STATUS',
        description:
          'Applications are made on the Central Operations Portal. Only divisions listed as OPEN are accepting applications.',
        color: anyOpen ? 5763719 : 15548997,
        fields,
        footer: { text: 'Central Operations Portal - last updated' },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [{ type: 2, style: 5, label: 'Apply on Portal', url: `${PORTAL_URL}/dashboard/divisions` }],
      },
    ],
  };
}
