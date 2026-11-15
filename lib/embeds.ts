import { PORTAL_URL } from '@/lib/portal';
import type { Division, RoleRequest, Training } from '@/lib/portal-types';
import { TRAINING_VC_ID } from '@/lib/training-config';

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
  const delayed = (t.delayed_minutes ?? 0) > 0;
  const cantMake = t.unattending ?? [];

  const embed: Record<string, unknown> = {
    title: t.title,
    description: t.description || 'No additional details provided.',
    color: delayed ? 16705372 : 5793266,
    fields: [
      ...(delayed
        ? [
            {
              name: 'DELAYED',
              value:
                `Pushed back **${t.delayed_minutes} min**` +
                (t.original_starts_at ? ` (was <t:${unix(t.original_starts_at)}:t>)` : '') +
                (t.delay_reason ? `\nReason: ${t.delay_reason}` : ''),
              inline: false,
            },
          ]
        : []),
      { name: 'Training ID', value: t.id, inline: true },
      { name: 'Division', value: divisionName || 'General', inline: true },
      { name: 'Host', value: t.host || 'TBD', inline: true },
      { name: 'Starts', value: `<t:${start}:F>\n<t:${start}:R>`, inline: true },
      { name: 'Ends', value: `<t:${end}:t>`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: `Attending (${t.attending.length})`,
        value: rosterText(t.attending, 'No one attending yet.'),
        inline: false,
      },
      ...(cantMake.length
        ? [{ name: `Can't make it (${cantMake.length})`, value: rosterText(cantMake, 'None.'), inline: false }]
        : []),
      ...(t.requires_ipp
        ? [{ name: 'Requirements', value: 'IPP + trained driver (Advanced) only', inline: false }]
        : []),
      { name: 'Waiting VC', value: `<#${TRAINING_VC_ID}>`, inline: false },
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
          { type: 2, style: 3, label: 'Attend', custom_id: 'training_attend' },
          { type: 2, style: 4, label: "Can't Make It", custom_id: 'training_cant_make_it' },
          { type: 2, style: 5, label: 'View Portal', url: `${PORTAL_URL}/dashboard/trainings` },
        ],
      },
    ],
  };
}

// Services left out of the Discord status embed (they still exist in the portal).
const HIDDEN_FROM_EMBED = ['LAS', 'LFB', 'CONTROL'];

export function divisionsPayload(allDivisions: Division[]) {
  const divisions = allDivisions.filter((d) => !HIDDEN_FROM_EMBED.includes(d.department.toUpperCase()));
  const departments = Array.from(new Set(divisions.map((d) => d.department)));
  const fields: { name: string; value: string; inline: boolean }[] = [];

  for (const dept of departments) {
    const inDept = divisions.filter((d) => d.department === dept);
    const open = inDept.filter((d) => d.status === 'open');
    const closed = inDept.filter((d) => d.status === 'closed');
    fields.push(
      {
        name: `${dept} - OPEN (${open.length})`,
        value: open.length
          ? open.map((d) => (d.application_url ? `**[${d.name}](${d.application_url})**` : `**${d.name}**`)).join('\n')
          : 'None currently open.',
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
          'Click an OPEN division name to open its application form. Only divisions listed as OPEN are accepting applications.',
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

/** The DM a member gets when they click Attend. */
export function trainingDmPayload(t: Training, divisionName?: string | null) {
  const start = unix(t.starts_at);
  const vc = TRAINING_VC_ID;
  return {
    embeds: [
      {
        title: `You're booked on: ${t.title}`,
        description:
          `**Reminder:** be in the waiting voice channel <#${vc}> before the training starts. ` +
          `If you aren't there when it begins you may be removed from the session.`,
        color: 5763719,
        fields: [
          { name: 'Training ID', value: t.id, inline: true },
          { name: 'Division', value: divisionName || 'General', inline: true },
          { name: 'Host', value: t.host || 'TBD', inline: true },
          { name: 'Starts', value: `<t:${start}:F>\n<t:${start}:R>`, inline: false },
          { name: 'Wait in this VC', value: `<#${vc}>`, inline: false },
        ],
        footer: { text: 'Central Operations Portal' },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: 'Join Waiting VC', url: `https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/${vc}` },
        ],
      },
    ],
  };
}

/** DM sent to everyone booked on when a trainer delays the session. */
export function trainingDelayDmPayload(t: Training, divisionName?: string | null) {
  const start = unix(t.starts_at);
  return {
    embeds: [
      {
        title: `Training delayed: ${t.title}`,
        description:
          `This session has been pushed back by **${t.delayed_minutes} minutes**.` +
          (t.delay_reason ? `\n**Reason:** ${t.delay_reason}` : '') +
          `\n\nYou're still booked on - keep waiting in <#${TRAINING_VC_ID}>. If you can no longer make the new time, press **Can't Make It** on the training post or the portal.`,
        color: 16705372,
        fields: [
          { name: 'Training ID', value: t.id, inline: true },
          { name: 'Division', value: divisionName || 'General', inline: true },
          { name: 'New start', value: `<t:${start}:F>\n<t:${start}:R>`, inline: false },
        ],
        footer: { text: 'Central Operations Portal' },
      },
    ],
  };
}

export function roleRequestPayload(r: RoleRequest, roleLabel: string, pending = true) {
  const colour = r.status === 'approved' ? 5763719 : r.status === 'denied' ? 15548997 : 16705372;
  return {
    embeds: [
      {
        title: `Role Request - ${roleLabel}`,
        color: colour,
        fields: [
          { name: 'Member', value: `<@${r.target_discord_id}>${r.target_name ? ` (${r.target_name})` : ''}`, inline: true },
          { name: 'Role', value: roleLabel, inline: true },
          { name: 'Requested by', value: r.requested_by, inline: true },
          { name: 'Reason / Training', value: r.reason || 'No reason given.', inline: false },
          {
            name: 'Status',
            value:
              r.status === 'pending'
                ? 'Pending review'
                : `${r.status === 'approved' ? 'Approved' : 'Denied'} by ${r.reviewed_by ?? 'management'}`,
            inline: false,
          },
        ],
        footer: { text: `Request ${r.id}` },
        timestamp: r.created_at,
      },
    ],
    components: pending
      ? [
          {
            type: 1,
            components: [
              { type: 2, style: 3, label: 'Approve', custom_id: `rolereq_approve:${r.id}` },
              { type: 2, style: 4, label: 'Deny', custom_id: `rolereq_deny:${r.id}` },
            ],
          },
        ]
      : [],
    allowed_mentions: { parse: [] },
  };
}


/** What the Discord division status message shows while divisions / the website are under maintenance. */
export function divisionsMaintenancePayload(message: string) {
  return {
    embeds: [
      {
        title: 'DIVISION APPLICATION STATUS - UNDER MAINTENANCE',
        description: `${message}\n\nApplications will be back shortly. We apologise for any inconvenience.`,
        color: 16705372,
        footer: { text: 'Central Operations Portal - last updated' },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [],
  };
}
