'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser } from '@/lib/portal';
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
