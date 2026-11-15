import { redirect } from 'next/navigation';

// Old address - the management tools now sit on the Staff Panel page.
export default function Page() {
  redirect('/dashboard/staff');
}
