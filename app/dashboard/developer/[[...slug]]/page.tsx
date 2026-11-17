import { redirect } from 'next/navigation';

// The panel moved to its own page. Old links and bookmarks end up here.
export default async function Moved({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  redirect(`/developer${slug?.length ? `/${slug.join('/')}` : ''}`);
}
