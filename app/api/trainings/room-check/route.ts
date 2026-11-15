import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { getVoiceChannelId } from '@/lib/discord';
import { markTrainingComplete } from '@/lib/training-complete';
import type { Training } from '@/lib/portal-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EMPTY_FOR_MS = 2 * 60 * 1000; // the room must stay empty this long, so a quick reconnect doesn't end the session

// Hit this every minute (Vercel Cron on a plan that allows it, or a free pinger such as cron-job.org).
// For each training that has started and has a room, it checks whether the instructor and everyone booked on are
// still in that voice channel. Once the room has been used and then stays empty, the training is marked complete
// and the instructor is DMed "did anyone leave?".
// If you set CRON_SECRET in Vercel, send it as "Authorization: Bearer <secret>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = Date.now();
  const { data, error } = await supabaseAdmin
    .from('trainings')
    .select('*')
    .not('room_id', 'is', null)
    .is('completed_at', null)
    .is('cancelled_at', null)
    .lte('starts_at', new Date(now).toISOString())
    .gte('starts_at', new Date(now - 12 * 3600 * 1000).toISOString());
  if (error) return NextResponse.json({ ok: true, checked: 0, note: 'room columns missing - run supabase/training-rooms.sql' });

  let completed = 0;
  const trainings = (data ?? []) as Training[];
  for (const t of trainings) {
    const people = Array.from(new Set([...(t.attending_ids ?? []), ...(t.host_id ? [t.host_id] : [])]));
    if (!people.length || !t.room_id) continue;

    const where = await Promise.all(people.map((id) => getVoiceChannelId(id)));
    if (where.some((w) => w === undefined)) continue; // Discord couldn't tell us - never act on a guess
    const inRoom = where.some((w) => w === t.room_id);

    if (inRoom) {
      if (!t.room_seen || t.room_empty_since) {
        await supabaseAdmin.from('trainings').update({ room_seen: true, room_empty_since: null }).eq('id', t.id);
      }
      continue;
    }

    if (!t.room_seen) continue; // nobody has used the room yet (training hasn't really begun)
    if (!t.room_empty_since) {
      await supabaseAdmin.from('trainings').update({ room_empty_since: new Date(now).toISOString() }).eq('id', t.id);
      continue;
    }
    if (now - new Date(t.room_empty_since).getTime() < EMPTY_FOR_MS) continue;
    if (!t.host_id) continue; // no instructor to DM - a trainer can still press Complete by hand

    const out = await markTrainingComplete(t.id, 'Auto (everyone left the room)');
    if (out.ok) completed++;
  }

  return NextResponse.json({ ok: true, checked: trainings.length, completed });
}
