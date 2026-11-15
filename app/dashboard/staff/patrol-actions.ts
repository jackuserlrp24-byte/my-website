'use server';

import { getPortalUser } from '@/lib/portal';
import { postPatrol } from '@/lib/patrol-post';
import type { ActionResult } from '@/lib/portal-types';

/** Post a patrol from the Staff Panel > Patrols tab. Same people who can open that tab (staff, not limited accounts). */
export async function postStaffPatrol(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canStaff || user.limited) return { ok: false, message: 'You do not have permission to post patrols.' };
  return postPatrol(formData);
}
