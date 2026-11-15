'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { editMessage, logEmbed, postMessage, sendDm, TRAININGS_CHANNEL_ID } from '@/lib/discord';
import { logRoleRequest, reviewRoleRequest } from '@/lib/role-requests';
import { REQUESTABLE_ROLES, ROLE_REQUESTS_CHANNEL_ID } from '@/lib/training-config';
import { roleRequestPayload, trainingPayload } from '@/lib/embeds';
import { trainingKey } from '@/lib/training-key';
import { TRAINING_TEMPLATES } from '@/lib/training-templates';
import type { ActionResult, RoleRequest, Training } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });

const MAX_ROLES_PER_REQUEST = 15;

/** One request can ask for several roles at once: each role becomes its own request + Discord post so it can be approved / denied separately. */
export async function requestRole(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canRequestRoles) return fail('Only Bronze, Silver or Gold Command (and trainers) can request roles.');

  // Accept a raw ID or a pasted mention like <@123...>
  const rawTarget = String(formData.get('target') ?? '').trim();
  const targetId = rawTarget.replace(/[<@!>]/g, '');
  const roleKeys = Array.from(new Set(formData.getAll('roleKey').map(String)));
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);

  if (!/^\d{17,20}$/.test(targetId)) return fail("Enter the member's Discord ID (right click them > Copy User ID).");
  if (roleKeys.length === 0) return fail('Pick at least one role.');
  if (roleKeys.length > MAX_ROLES_PER_REQUEST) return fail(`You can request up to ${MAX_ROLES_PER_REQUEST} roles at once.`);
  const roles = roleKeys.map((k) => REQUESTABLE_ROLES.find((r) => r.key === k));
  if (roles.some((r) => !r)) return fail('One of the selected roles is not valid.');
  if (!reason) return fail('Add a reason or the training they passed.');

  // Make sure they are actually in the server and grab their display name.
  let targetName: string | null = null;
  const guild = process.env.DISCORD_GUILD_ID;
  if (guild && process.env.DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${targetId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: 'no-store',
    });
    if (res.status === 404) return fail('That user is not in the server.');
    if (res.ok) {
      const m = await res.json();
      targetName = m.nick || m.user?.global_name || m.user?.username || null;
    }
  }

  let saved = 0;
  let posted = 0;
  for (const role of roles as NonNullable<(typeof roles)[number]>[]) {
    const { data, error } = await supabaseAdmin
      .from('role_requests')
      .insert({
        target_discord_id: targetId,
        target_name: targetName,
        role_key: role.key,
        reason,
        requested_by: user.name,
        requested_by_id: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Role request insert failed:', error);
      continue;
    }
    saved++;

    const row = data as RoleRequest;
    await logRoleRequest('requested', row, role.label);
    const messageId = await postMessage(ROLE_REQUESTS_CHANNEL_ID, roleRequestPayload(row, role.label));
    if (messageId) {
      posted++;
      await supabaseAdmin.from('role_requests').update({ discord_message_id: messageId }).eq('id', row.id);
    }
  }

  revalidatePath('/dashboard/trainer');
  if (saved === 0) return fail('Could not save the request. Have you run supabase/trainer-panel.sql?');

  const noun = saved === 1 ? 'role request' : 'role requests';
  const partial = saved < roleKeys.length ? ` (${roleKeys.length - saved} could not be saved)` : '';
  return {
    ok: true,
    message:
      posted === saved
        ? `${saved} ${noun} sent to Silver / Gold Command in Discord${partial}.`
        : `${saved} ${noun} saved, but ${saved - posted} failed to post to Discord (check the bot token and channel permissions)${partial}.`,
  };
}

export async function decideRoleRequest(id: string, approve: boolean): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canReviewRoleRequests) return fail('Only Silver or Gold Command can approve or deny role requests.');

  const result = await reviewRoleRequest(id, approve, user.name);
  if (!result.ok) return fail(result.message);

  // Update the Discord post so the buttons disappear there too.
  if (result.row.discord_message_id) {
    await editMessage(ROLE_REQUESTS_CHANNEL_ID, result.row.discord_message_id, roleRequestPayload(result.row, result.label, false));
  }

  revalidatePath('/dashboard/trainer');
  return { ok: true, message: result.message };
}

/**
 * Trainers: bar someone from ONE kind of training (e.g. IPP). They can't join it until a new training of that kind is
 * posted (or a trainer lifts the bar early). They are also taken off any upcoming training of that kind they were booked on.
 */
export async function barFromTrainings(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can bar people from trainings.');

  const targetId = String(formData.get('target') ?? '').trim().replace(/[<@!>]/g, '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 300);
  const template = TRAINING_TEMPLATES.find((t) => t.key === String(formData.get('trainingKey') ?? ''));
  if (!template) return fail('Pick which training they are barred from.');
  if (!/^\d{17,20}$/.test(targetId)) return fail("Enter the member's Discord ID (right click them > Copy User ID).");
  if (!reason) return fail('Add a reason for the bar.');

  let targetName: string | null = null;
  const guild = process.env.DISCORD_GUILD_ID;
  if (guild && process.env.DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${targetId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: 'no-store',
    });
    if (res.status === 404) return fail('That user is not in the server.');
    if (res.ok) {
      const m = await res.json();
      targetName = m.nick || m.user?.global_name || m.user?.username || null;
    }
  }

  const { error } = await supabaseAdmin.from('training_bars').insert({
    discord_id: targetId,
    target_name: targetName,
    training_key: template.key,
    training_title: template.name,
    reason,
    barred_by: user.name,
    barred_by_id: user.id,
  });
  if (error) {
    if (error.code === '23505') return fail(`They are already barred from ${template.name}.`);
    console.error('Training bar insert failed:', error);
    return fail('Could not save the bar. Run supabase/full-setup.sql (adds the training_bars table) in Supabase.');
  }

  // Take them off anything upcoming they were already booked on.
  let removedFrom = 0;
  try {
    const { data } = await supabaseAdmin
      .from('trainings')
      .select('*')
      .contains('attending_ids', [targetId])
      .gte('ends_at', new Date().toISOString())
      .is('cancelled_at', null);
    for (const t of ((data ?? []) as Training[]).filter((x) => trainingKey(x) === template.key)) {
      const idx = (t.attending_ids ?? []).indexOf(targetId);
      const aligned = t.attending.length === (t.attending_ids ?? []).length;
      const attending = aligned ? t.attending.filter((_, i) => i !== idx) : t.attending.filter((n) => n !== targetName);
      const attendingIds = (t.attending_ids ?? []).filter((id) => id !== targetId);
      const { data: row } = await supabaseAdmin
        .from('trainings')
        .update({ attending, attending_ids: attendingIds })
        .eq('id', t.id)
        .select('*')
        .single();
      await supabaseAdmin.from('met_training_records').delete().eq('training_id', t.id).eq('target_discord_id', targetId);
      if (row && (row as Training).discord_message_id) {
        const tr = row as Training;
        let divName: string | null = null;
        if (tr.division_id) {
          const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', tr.division_id).maybeSingle();
          divName = div?.name ?? null;
        }
        await editMessage(tr.discord_channel_id || TRAININGS_CHANNEL_ID, tr.discord_message_id as string, trainingPayload(tr, divName));
      }
      removedFrom++;
    }
  } catch (err) {
    console.error('Removing barred member from trainings failed:', err);
  }

  await sendDm(targetId, {
    embeds: [
      {
        title: `You have been barred from ${template.name}`,
        description: `A trainer has barred you from **${template.name}**. You can book on again once a new ${template.name} training is posted.\n\n**Reason:** ${reason}`,
        color: 15548997,
        footer: { text: 'Central Operations Portal' },
      },
    ],
  });
  await logEmbed(
    'TRAINING BAR',
    `<@${targetId}> was barred from ${template.name}.`,
    [
      { name: 'Member', value: `${targetName ?? 'Unknown'}\n\`${targetId}\``, inline: true },
      { name: 'Training', value: template.name, inline: true },
      { name: 'Barred by', value: user.name, inline: true },
      { name: 'Reason', value: reason, inline: false },
    ],
    15548997
  );

  revalidatePath('/dashboard/trainer');
  revalidatePath('/dashboard/trainings');
  return {
    ok: true,
    message: `${targetName ?? targetId} is barred from ${template.name} until a new one is posted.${removedFrom ? ` Removed from ${removedFrom} upcoming ${template.name} session${removedFrom === 1 ? '' : 's'}.` : ''}`,
  };
}

/** Trainers: lift a bar early. */
export async function liftTrainingBar(id: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can lift a training bar.');

  const { data, error } = await supabaseAdmin
    .from('training_bars')
    .update({ lifted_at: new Date().toISOString(), lifted_by: user.name })
    .eq('id', id)
    .is('lifted_at', null)
    .select('*')
    .single();
  if (error || !data) return fail('That bar was already lifted.');

  await logEmbed(
    'TRAINING BAR LIFTED',
    `<@${data.discord_id}> can book ${data.training_title ?? 'that training'} again.`,
    [
      { name: 'Member', value: `${data.target_name ?? 'Unknown'}\n\`${data.discord_id}\``, inline: true },
      { name: 'Training', value: data.training_title ?? 'Unknown', inline: true },
      { name: 'Lifted by', value: user.name, inline: true },
    ],
    5763719
  );

  revalidatePath('/dashboard/trainer');
  return { ok: true, message: `${data.target_name ?? data.discord_id} can book ${data.training_title ?? 'that training'} again.` };
}
