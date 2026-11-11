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
  qrPath,
  seatsTaken,
} from '@/lib/poster/poster-rule';
import { PosterFit } from '@/components/admin/invite-codes/PosterFit';
import { PosterPrintBar } from '@/components/admin/invite-codes/PosterPrintBar';
import { PosterSheet } from '@/components/admin/invite-codes/PosterSheet';
import './poster.css';

/**
 * `/admin/invite-codes/[id]/poster`: a code's printable poster at US Letter,
 * Night look, with the QR drawn here on the server. The venue count and names
 * come from the active venues at render time, never hard-coded. An unknown,
 * revoked, expired or full code is a 404: there is nothing worth printing.
 */
export default async function InviteCodePosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) notFound();

  const { id } = await params;
  const [codes, venues] = await Promise.all([
    apiClient.get<InviteCode[]>('/v1/admin/invite-codes', token),
    // The public list: active venues only, the ones the calendar shows.
    apiClient.get<VenuePublic[]>('/v1/venues', token),
  ]);
  const code = codes.find((row) => row.id === id);
  if (!code || !isPrintable(code, new Date())) notFound();

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
        />
      </PosterFit>
    </div>
  );
}
