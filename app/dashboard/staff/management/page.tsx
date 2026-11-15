import { redirect } from 'next/navigation';

// Old address - Management is now a tab inside the Staff Panel.
export default function Page() {
  redirect('/dashboard/staff?view=management');
}
