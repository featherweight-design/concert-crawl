import { redirect } from 'next/navigation';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { ReviewPageClient } from '@/components/admin/review/ReviewPageClient';
import { fetchNeedsYouDecisions } from '@/components/admin/shell/needs-you-count';
import { type ReviewCounts } from '@/lib/queries/use-admin-review';
import { type PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions';
import { FETCH_PAGE_SIZE } from '@/lib/queries/admin-price-submissions.constants';
import {
  NEEDS_YOU_HREF,
  reviewRedirectsToNeedsYou,
} from '@/lib/admin/review-tabs';

interface CountedSubmissions {
  rows: PriceSubmissionHistoryRow[];
  total: number;
}

const firstParam = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : (value?.[0] ?? null);

/**
 * Review keeps three tabs (price coverage, submissions, all events). The
 * decision tabs live in Needs you, so a retired or missing `?tab=` redirects
 * there before any fetch. The legacy `?section=submissions` stays here.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  if (
    reviewRedirectsToNeedsYou(
      firstParam(params?.['tab']),
      firstParam(params?.['section']),
    )
  ) {
    redirect(NEEDS_YOU_HREF);
  }

  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  // Above-the-fold SSR: price submissions for the first paint, plus the
  // aggregate counts so the Submissions pill renders with its number.
  // PriceCoverageTable fetches client-side (below the fold).
  // Every seed below degrades to an empty fallback rather than throwing: each
  // one is only a first paint, and the client query that owns the surface
  // refetches on mount regardless. A silent fallback is indistinguishable
  // from genuinely empty data, so each logs before degrading.
  const [submissions, counts, decisions] = await Promise.all([
    // The Submissions tab walks the full set client-side; this first page is
    // only what it paints before that resolves. Shares FETCH_PAGE_SIZE with
    // the walker so the seed and its offset steps can't drift.
    apiClient
      .get<CountedSubmissions>(
        `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=0`,
        token,
      )
      .catch((err: unknown): CountedSubmissions => {
        console.error('admin review: submissions SSR seed failed', err);
        return { rows: [], total: 0 };
      }),
    apiClient
      .get<ReviewCounts>('/v1/admin/review/counts', token)
      .catch((err: unknown): ReviewCounts => {
        console.error('admin review: counts SSR seed failed', err);
        return { eventFlags: 0, prices: 0, missing: 0, priceContests: 0 };
      }),
    // The one Needs you number, the same source as the sidebar badge. A
    // failure hides the pending pill rather than showing a wrong number.
    fetchNeedsYouDecisions(token).catch((err: unknown): number => {
      console.error('admin review: needs-you count failed', err);
      return 0;
    }),
  ]);

  return (
    <ReviewPageClient
      initialSubmissions={submissions.rows}
      initialSubmissionsTotal={submissions.total}
      initialCounts={counts}
      decisions={decisions}
    />
  );
}
