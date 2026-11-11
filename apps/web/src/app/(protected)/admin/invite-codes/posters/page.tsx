import type { InviteCode } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { siteOrigin } from '@/lib/share/site-origin';
import {
  inviteStatus,
  posterJoinUrl,
  posterTypedUrl,
  qrPath,
  seatsTaken,
} from '@/lib/poster/poster-rule';
import { loadPosterVenues } from '@/lib/poster/load-poster-venues';
import {
  PostersTab,
  type PosterCodeCard,
} from '@/components/admin/invite-codes/PostersTab';
import { readSelection } from './posters-href';
import './poster.css';

/**
 * `/admin/invite-codes/posters`: pick a live multi-seat code, pick the look,
 * print. Live multi-seat codes are listed newest first; full ones stay listed
 * but can't be picked, personal (1-seat) codes are left out. QRs are drawn
 * here on the server, one per printable code. The selection lives in the URL
 * (`?code=<id>&look=paper&tabs=1`), so a reload keeps it.
 */
export default async function InviteCodePostersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const codes = await apiClient.get<InviteCode[]>(
    '/v1/admin/invite-codes',
    token,
  );
  const now = new Date();
  const origin = siteOrigin();
  const cards: PosterCodeCard[] = codes
    .filter((code) => code.maxUses > 1)
    .map((code) => ({ code, status: inviteStatus(code, now) }))
    .filter(({ status }) => status === 'active' || status === 'redeemed')
    .sort((left, right) =>
      right.code.createdAt.localeCompare(left.code.createdAt),
    )
    .map(({ code, status }) => {
      const url = posterJoinUrl(origin, code.code);
      return {
        id: code.id,
        code: code.code,
        label: code.label,
        taken: seatsTaken(code),
        max: code.maxUses,
        expiresAt: code.expiresAt,
        full: status === 'redeemed',
        url,
        qr: status === 'active' ? qrPath(url) : null,
      };
    });

  return (
    <PostersTab
      cards={cards}
      typedUrl={posterTypedUrl(origin)}
      venues={await loadPosterVenues(token)}
      initial={readSelection((await searchParams) ?? {})}
    />
  );
}
