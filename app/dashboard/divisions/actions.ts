'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { addGuildRole, applicationsLogChannel, logEmbed } from '@/lib/discord';
import { GOLD_MANAGED_DEPARTMENTS } from '@/lib/departments';
import { GOLD_ROLE_ID } from '@/lib/training-config';
import { syncDivisionsEmbed } from '@/lib/divisions-sync';
import type { ActionResult, Division } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });
/** Management can manage every division. Gold Command can manage the LAS / LFB / Control recruitment divisions. */
function canManage(user: NonNullable<Awaited<ReturnType<typeof getPortalUser>>>, department: string | null | undefined) {
  if (user.isManagement) return true;
  return !!department && GOLD_MANAGED_DEPARTMENTS.includes(department) && !!GOLD_ROLE_ID && user.roles.includes(GOLD_ROLE_ID);
}

const field = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? '').trim().slice(0, max);

export async function setDivisionStatus(divisionId: string, status: 'open' | 'closed'): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');
  if (status !== 'open' && status !== 'closed') return fail('Invalid status.');
  const { data: target } = await supabaseAdmin.from('divisions').select('department').eq('id', divisionId).maybeSingle();
  if (!canManage(user, target?.department)) return fail('You do not have permission to change division status.');

  const { data, error } = await supabaseAdmin
    .from('divisions')
    .update({ status, updated_by: user.name, updated_at: new Date().toISOString() })
    .eq('id', divisionId)
    .select('name')
    .maybeSingle();

  if (error || !data) return fail('Could not update that division.');

  const synced = await syncDivisionsEmbed();

  revalidatePath('/dashboard/divisions');
  revalidatePath('/dashboard/command', 'layout');
  return {
    ok: true,
    message: `${data.name} is now ${status.toUpperCase()}.${synced ? '' : ' Discord embed could not be updated (check the bot token and channel permissions).'}`,
  };
}

/** Command / management: set the Google Form link that opens when someone clicks the division name. */
export async function setDivisionLink(divisionId: string, url: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isCommand && !user?.isManagement) return fail('You do not have permission to edit application links.');

  const link = String(url ?? '').trim().slice(0, 500);
  if (link && !/^https:\/\//i.test(link)) return fail('The link must start with https://');

  const { data, error } = await supabaseAdmin
    .from('divisions')
    .update({ application_url: link || null, updated_by: user.name, updated_at: new Date().toISOString() })
    .eq('id', divisionId)
    .select('name')
    .maybeSingle();

  if (error || !data) {
    console.error('Division link update failed:', error);
    return fail('Could not save the link. Have you run the latest supabase/full-setup.sql?');
  }

  const synced = await syncDivisionsEmbed();
  revalidatePath('/dashboard/divisions');
  return {
    ok: true,
    message: `${data.name}: ${link ? 'application link saved.' : 'application link removed.'}${synced ? '' : ' (Discord embed could not be updated.)'}`,
  };
}

export async function submitApplication(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');

  const divisionId = field(formData, 'divisionId', 60);
  const reason = field(formData, 'reason', 1500);
  const experience = field(formData, 'experience', 1000);
  const availability = field(formData, 'availability', 300);

  if (reason.length < 30) return fail('Tell us a bit more about why you want to join (at least 30 characters).');

  const { data: division } = await supabaseAdmin.from('divisions').select('*').eq('id', divisionId).maybeSingle();
  if (!division) return fail('Division not found.');
  if ((division as Division).status !== 'open') return fail('This division is currently closed to applications.');

  const { data: existing } = await supabaseAdmin
    .from('division_applications')
    .select('status')
    .eq('division_id', divisionId)
    .eq('discord_id', user.id)
    .in('status', ['pending', 'accepted'])
    .limit(1);

  if (existing?.length) {
    return fail(
      existing[0].status === 'accepted'
        ? 'You have already been accepted into this division.'
        : 'You already have a pending application for this division.'
    );
  }

  const { error } = await supabaseAdmin.from('division_applications').insert({
    division_id: divisionId,
    discord_id: user.id,
    applicant_name: user.name,
    reason,
    experience: experience || null,
    availability: availability || null,
  });

  if (error) {
    console.error('Application insert failed:', error);
    return fail('Could not submit your application. Please try again.');
  }

  await logEmbed('NEW DIVISION APPLICATION', `${user.name} has applied to **${(division as Division).name}**.`, [
    { name: 'Applicant', value: `${user.name} (<@${user.id}>)`, inline: true },
    { name: 'Division', value: (division as Division).name, inline: true },
    { name: 'Why they want to join', value: reason.slice(0, 1000) },
    ...(experience ? [{ name: 'Experience', value: experience.slice(0, 1000) }] : []),
    ...(availability ? [{ name: 'Availability', value: availability.slice(0, 300) }] : []),
  ], 5793266, applicationsLogChannel((division as Division).department));

  revalidatePath('/dashboard/divisions');
  return { ok: true, message: 'Application submitted. Management will review it.' };
}

export async function decideApplication(
  applicationId: string,
  decision: 'accepted' | 'rejected',
  note: string
): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');
  if (decision !== 'accepted' && decision !== 'rejected') return fail('Invalid decision.');

  const { data: app } = await supabaseAdmin
    .from('division_applications')
    .select('division_id, divisions(department)')
    .eq('id', applicationId)
    .maybeSingle();
  const dept = (app as { divisions?: { department?: string } | { department?: string }[] | null } | null)?.divisions;
  const department = Array.isArray(dept) ? dept[0]?.department : dept?.department;
  if (!canManage(user, department)) return fail('You do not have permission to review applications.');

  const { data, error } = await supabaseAdmin
    .from('division_applications')
    .update({
      status: decision,
      reviewed_by: user.name,
      review_note: note.trim().slice(0, 500) || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending')
    .select('*, divisions(name, discord_role_id, department)')
    .maybeSingle();

  if (error || !data) return fail('That application was already reviewed or no longer exists.');

  // Accepted into a division that has a Discord role set -> give them the role.
  let roleNote = '';
  const roleId = (data.divisions as { discord_role_id?: string | null } | null)?.discord_role_id;
  if (decision === 'accepted' && roleId) {
    const given = await addGuildRole(data.discord_id, roleId);
    roleNote = given
      ? ' Discord role given.'
      : ' (Could not give the Discord role - check the bot has Manage Roles and its role is above it.)';
  }

  await logEmbed(
    `APPLICATION ${decision.toUpperCase()}`,
    `${data.applicant_name}'s application to **${data.divisions?.name ?? data.division_id}** was ${decision}.`,
    [
      { name: 'Applicant', value: `<@${data.discord_id}>`, inline: true },
      { name: 'Reviewed By', value: user.name, inline: true },
      ...(data.review_note ? [{ name: 'Note', value: data.review_note }] : []),
    ],
    decision === 'accepted' ? 5763719 : 15548997,
    applicationsLogChannel((data.divisions as { department?: string | null } | null)?.department ?? department)
  );

  revalidatePath('/dashboard/divisions');
  revalidatePath('/dashboard/command', 'layout');
  return { ok: true, message: `Application ${decision}.${roleNote}` };
}
