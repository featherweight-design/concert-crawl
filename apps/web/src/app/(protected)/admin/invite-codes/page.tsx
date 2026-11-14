import { redirect } from 'next/navigation';
import { INVITE_CODES_HREF, withSearchParams } from '@/lib/poster/posters-href';

/** Codes moved under People (5b); old links and bookmarks land there. */
export default async function AdminInviteCodesRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(withSearchParams(INVITE_CODES_HREF, (await searchParams) ?? {}));
}
