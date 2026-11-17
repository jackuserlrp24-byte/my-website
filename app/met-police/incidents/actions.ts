'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { getOfficerOptions, nameFor } from '@/lib/met-officers';
import { field, makeRef } from '@/lib/met-util';

export async function createIncident(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const title = field(fd, 'title', 120);
  if (!title) return;

  // Officers log incidents against themselves. Command can hand one to somebody else.
  let assignedId = u.id;
  let assignedName: string | null = u.name;
  const pick = field(fd, 'assignee', 30);
  if (pick && pick !== u.id && canManageMet(u)) {
    const label = nameFor(await getOfficerOptions(), pick);
    if (label) {
      assignedId = pick;
      assignedName = label;
    }
  }

  const priority = ['low', 'normal', 'high'].includes(field(fd, 'priority', 10)) ? field(fd, 'priority', 10) : 'normal';
  await supabaseAdmin.from('met_incidents').insert({
    reference: makeRef('INC'),
    title,
    location: field(fd, 'location', 160) || null,
    details: field(fd, 'details', 3000) || null,
    priority,
    assigned_to_id: assignedId,
    assigned_to_name: assignedName,
    created_by_id: u.id,
    created_by_name: u.name,
  });
  revalidatePath('/met-police/incidents');
}

async function canTouch(userId: string, manager: boolean, incidentId: string) {
  const { data } = await supabaseAdmin.from('met_incidents').select('assigned_to_id, created_by_id').eq('id', incidentId).maybeSingle();
  if (!data) return false;
  return manager || data.assigned_to_id === userId || data.created_by_id === userId;
}

export async function addIncidentUpdate(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const body = field(fd, 'body', 2000);
  if (!id || !body || !(await canTouch(u.id, canManageMet(u), id))) return;

  await supabaseAdmin.from('met_incident_updates').insert({ incident_id: id, author_id: u.id, author_name: u.name, body });
  revalidatePath('/met-police/incidents');
}

export async function setIncidentStatus(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const status = field(fd, 'status', 10) === 'closed' ? 'closed' : 'open';
  if (!id || !(await canTouch(u.id, canManageMet(u), id))) return;

  await supabaseAdmin.from('met_incidents').update({ status }).eq('id', id);
  await supabaseAdmin.from('met_incident_updates').insert({
    incident_id: id,
    author_id: u.id,
    author_name: u.name,
    body: status === 'closed' ? 'Incident closed.' : 'Incident reopened.',
  });
  revalidatePath('/met-police/incidents');
}
