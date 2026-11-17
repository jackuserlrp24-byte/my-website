import { redirect } from 'next/navigation';

// The Leave of Absence page now lives inside the Met Police portal.
export default function OldLoaPage() {
  redirect('/command/loa');
}
