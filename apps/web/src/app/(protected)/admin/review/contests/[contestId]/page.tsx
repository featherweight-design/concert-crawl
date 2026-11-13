import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';

// /admin/review/contests/:contestId — the per-contest adjudication page now
// lives in Needs you. Old links (emails, notifications, bookmarks) land on
// that item's panel; the key matches NeedsYouClient's `?item=` format.

interface PageProps {
  // Next 15 App Router — dynamic route params arrive as a Promise.
  params: Promise<{ contestId: string }>;
}

export default async function ContestReviewPage({ params }: PageProps) {
  await requireAdminUser();
  const { contestId } = await params;
  redirect(
    `/admin/needs-you?item=${encodeURIComponent(`price-check:${contestId}`)}`,
  );
}
