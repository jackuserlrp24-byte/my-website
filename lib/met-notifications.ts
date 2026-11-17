import { supabaseAdmin } from '@/lib/portal';

export interface NoticeItem {
  id: string;
  type: 'message' | 'notice' | 'bulletin';
  title: string;
  meta: string;
  created_at: string;
  href: string;
}

/** Unread messages for this officer plus notices / bulletins from the last 14 days. */
export async function loadNotifications(officerId: string): Promise<NoticeItem[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  try {
    const [msgs, ann] = await Promise.all([
      supabaseAdmin.from('met_messages').select('id, created_at, from_name, subject').eq('to_id', officerId).is('read_at', null).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('met_announcements').select('id, created_at, title, kind, author').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    ]);
    const items: NoticeItem[] = [
      ...(msgs.data ?? []).map((m) => ({
        id: `m-${m.id}`,
        type: 'message' as const,
        title: String(m.subject),
        meta: `Message from ${m.from_name || 'an officer'}`,
        created_at: String(m.created_at),
        href: '/met-police/communications?tab=messages',
      })),
      ...(ann.data ?? []).map((a) => ({
        id: `a-${a.id}`,
        type: a.kind === 'bulletin' ? ('bulletin' as const) : ('notice' as const),
        title: String(a.title),
        meta: `${a.kind === 'bulletin' ? 'Bulletin' : 'Notice'} from ${a.author || 'Command'}`,
        created_at: String(a.created_at),
        href: '/met-police/communications',
      })),
    ];
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
  } catch {
    return [];
  }
}
