import { redirect } from 'next/navigation';

// Announcements now live under Communications (notices and bulletins).
export default function AnnouncementsPage() {
  redirect('/met-police/communications');
}
