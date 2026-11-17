'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { hasCommandRank } from '@/lib/met-access';
import { getOfficerOptions, nameFor } from '@/lib/met-officers';
import { endLoaEarly, submitLoa } from '@/lib/loa';
import type { ActionResult } from '@/lib/portal-types';

export async function requestLoa(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isCommand) return { ok: false, message: 'Only command can submit an LOA.' };

  const result = await submitLoa(user, {
    reason: String(formData.get('reason') ?? ''),
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
  });
  revalidatePath('/dashboard/command/loa');
  return result;
}

export async function returnFromLoa(id: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isCommand) return { ok: false, message: 'Only command can manage an LOA.' };
  const result = await endLoaEarly(user, id);
  revalidatePath('/dashboard/command/loa');
  return result;
}

// ---------- Duty rota (command rank only: Gold / Silver / Bronze, or management) ----------

const NO_RANK: ActionResult = { ok: false, message: 'The duty rota is for command rank only.' };

export async function addRotaShift(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isCommand || !hasCommandRank(user)) return NO_RANK;

  const date = String(formData.get('shiftDate') ?? '');
  const start = String(formData.get('startTime') ?? '');
  const end = String(formData.get('endTime') ?? '');
  const memberId = String(formData.get('memberId') ?? '');
  const note = String(formData.get('roleNote') ?? '').trim().slice(0, 120);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: 'Pick a valid date.' };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return { ok: false, message: 'Pick a start and end time.' };

  const name = nameFor(await getOfficerOptions(), memberId);
  if (!name) return { ok: false, message: 'Choose a whitelisted officer.' };

  const { error } = await supabaseAdmin.from('duty_rota').insert({
    shift_date: date,
    start_time: start,
    end_time: end,
    member_id: memberId,
    member_name: name,
    role_note: note || null,
    created_by_name: user.name,
  });
  if (error) {
    console.error('Rota insert failed:', error);
    return { ok: false, message: 'Could not save the shift. Have you run supabase/met-portal.sql?' };
  }
  revalidatePath('/dashboard/command/loa');
  return { ok: true, message: `Shift added for ${name}.` };
}

export async function removeRotaShift(id: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isCommand || !hasCommandRank(user)) return NO_RANK;
  await supabaseAdmin.from('duty_rota').delete().eq('id', id);
  revalidatePath('/dashboard/command/loa');
  return { ok: true, message: 'Shift removed.' };
}
