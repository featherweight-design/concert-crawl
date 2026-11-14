import { permanentRedirect } from 'next/navigation';
import { withSearchParams } from '@/lib/poster/posters-href';

/** Feedback is Operations' first tab now; old links and bookmarks land there. */
export default async function AdminFeedbackRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    withSearchParams('/admin/operations', (await searchParams) ?? {}),
  );
}
