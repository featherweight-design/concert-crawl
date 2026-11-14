import { redirect } from 'next/navigation';
import { POSTERS_PATH, withSearchParams } from '@/lib/poster/posters-href';

/**
 * Posters moved under People (5b). The query carries the picked code, look
 * and tabs, so it is forwarded whole.
 */
export default async function AdminPostersRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(withSearchParams(POSTERS_PATH, (await searchParams) ?? {}));
}
