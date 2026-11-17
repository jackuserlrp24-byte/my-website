'use server';

import { getPortalUser } from '@/lib/portal';
import { postMessage } from '@/lib/discord';
import { assessReason } from '@/lib/loa';
import { daysBetween, londonToday } from '@/lib/london-time';
import { STAFF_LOA_CHANNEL_ID, STAFF_LOA_MAX_ADVANCE_DAYS, STAFF_LOA_MAX_DAYS } from '@/lib/staff-loa';
import type { ActionResult } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });
const lastSent = new Map<string, number>(); // stops double-clicks posting the same request twice
const stamp = (date: string) => `<t:${Math.floor(Date.parse(`${date}T12:00:00Z`) / 1000)}:D>`;

export async function requestStaffLoa(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');
  if (!user.canStaff) return fail('Only staff can send a staff LOA.');

  const startDate = String(formData.get('start_date') ?? '').trim();
  const endDate = String(formData.get('end_date') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 1000);

  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(startDate) || !iso.test(endDate)) return fail('Pick a valid start and end date.');

  const fromToday = daysBetween(londonToday(), startDate);
  const length = daysBetween(startDate, endDate) + 1;
  if (fromToday < 0) return fail('The start date cannot be in the past.');
  if (fromToday > STAFF_LOA_MAX_ADVANCE_DAYS) return fail(`An LOA can start at most ${STAFF_LOA_MAX_ADVANCE_DAYS} days from now.`);
  if (length < 1) return fail('The end date must be on or after the start date.');
  if (length > STAFF_LOA_MAX_DAYS) return fail(`An LOA can be at most ${STAFF_LOA_MAX_DAYS} days. For longer, speak to management.`);

  const badReason = assessReason(reason);
  if (badReason) return fail(badReason);

  const last = lastSent.get(user.id) ?? 0;
  if (Date.now() - last < 30_000) return fail('Your request was just sent. Give it a moment before sending another.');
  lastSent.set(user.id, Date.now());

  const id = await postMessage(STAFF_LOA_CHANNEL_ID, {
    allowed_mentions: { parse: [] }, // shows the name, never pings anyone
    embeds: [
      {
        title: 'STAFF LOA REQUEST',
        color: 5793266,
        fields: [
          { name: 'Staff member', value: `${user.name} (<@${user.id}>)`, inline: false },
          { name: 'From', value: stamp(startDate), inline: true },
          { name: 'To', value: stamp(endDate), inline: true },
          { name: 'Length', value: `${length} day${length === 1 ? '' : 's'}`, inline: true },
          { name: 'Reason', value: reason },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!id) {
    lastSent.delete(user.id);
    return fail('Could not send your request to Discord. Please try again, or tell a developer.');
  }
  return { ok: true, message: 'Your LOA request has been sent to the staff LOA channel.' };
}
