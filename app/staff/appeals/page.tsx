import AppealsPage from '@/app/dashboard/appeals/page';

export const dynamic = 'force-dynamic';

// The appeals page does its own login + staff check.
export default function StaffAppealsPage() {
  return <AppealsPage />;
}
