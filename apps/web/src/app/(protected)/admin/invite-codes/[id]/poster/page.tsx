import { notFound } from 'next/navigation';
import type { InviteCode, VenuePublic } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { siteOrigin } from '@/lib/share/site-origin';
import {
  isPrintable,
  posterJoinUrl,
  posterTypedUrl,
  posterVenueLine,
  posterVenues,
  qrPath,
  seatsTaken,
} from '@/lib/poster/poster-rule';
import { PosterFit } from '@/components/admin/invite-codes/PosterFit';
import { PosterPrintBar } from '@/components/admin/invite-codes/PosterPrintBar';
import {
  PosterSheet,
  type PosterLook,
} from '@/components/admin/invite-codes/PosterSheet';
import './poster.css';

/**
 * `/admin/invite-codes/[id]/poster`: a code's printable poster at US Letter,
 * with the QR drawn here on the server. Night without tabs unless the URL
 * asks for `?look=paper` or `?tabs=1`; any other value is ignored. The venue
 * count and names come from the crawled venues at render time, never
 * hard-coded. An unknown, revoked, expired or full code is a 404: there is
 * nothing worth printing.
 */
export default async function InviteCodePosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) notFound();

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const look: PosterLook = query.look === 'paper' ? 'paper' : 'night';
  const tabs = query.tabs === '1';

  const codes = await apiClient.get<InviteCode[]>(
    '/v1/admin/invite-codes',
    token,
  );
  const code = codes.find((row) => row.id === id);
  if (!code || !isPrintable(code, new Date())) notFound();

  // The public list holds active venues only. If it fails, the sheet still
  // prints: no venue line, and a sub without a count.
  const venues = posterVenues(
    await apiClient
      .get<VenuePublic[]>('/v1/venues', token)
      .catch((): VenuePublic[] => []),
  );

  const origin = siteOrigin();
  const url = posterJoinUrl(origin, code.code);
  const qr = qrPath(url);
  const seatsLeft = code.maxUses - seatsTaken(code);
  const venueLine = posterVenueLine(venues);

  return (
    <div className="poster-page" data-testid="poster-page">
      <PosterPrintBar
        label={code.label}
        code={code.code}
        seatsLeft={seatsLeft}
        qr={qr}
      />
      <PosterFit>
        <PosterSheet
          url={url}
          typedUrl={posterTypedUrl(origin)}
          code={code.code}
          qr={qr}
          seats={seatsLeft}
          venueCount={venues.length}
          venueNames={venueLine.names}
          moreVenues={venueLine.more}
          look={look}
          tabs={tabs}
        />
      </PosterFit>
    </div>
  );
}
