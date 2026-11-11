import type {
  ArtistReportReason,
  ArtistReportSummary,
} from '@concert-crawl/types';

import { apiClient } from '@/lib/api';

export interface ArtistReportInput {
  reason: ArtistReportReason;
  /** Blank means none; the server parses and validates the link. */
  spotifyLink?: string;
  note?: string;
}

export const fileArtistReport = (
  slug: string,
  body: ArtistReportInput,
  token: string,
): Promise<ArtistReportSummary> =>
  apiClient.post<ArtistReportSummary>(
    `/v1/artists/${encodeURIComponent(slug)}/reports`,
    token,
    body,
  );

export const withdrawArtistReport = async (
  slug: string,
  token: string,
): Promise<void> => {
  await apiClient.delete<void>(
    `/v1/artists/${encodeURIComponent(slug)}/reports/mine`,
    token,
  );
};
