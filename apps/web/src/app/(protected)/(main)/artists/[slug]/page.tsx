// Artist page (#1115, PR-E).
//
// ⚠️ #794 — this route lives under `(protected)` on purpose, and making it
// genuinely public is NOT a one-line middleware edit. `(protected)/layout.tsx`
// renders signed-in-only gates (FeatureDropPillGate, OnboardingThemeFlush,
// FollowNudgeGate), so opening
// the vertical means MOVING this directory out of `(protected)` *and* carrying
// the matcher entry. `/artists(.*)` is in `isPublicOnceLaunched` — gated on
// isPublicBrowseEnabled(), exactly like `/venues(.*)` — never in
// `isAlwaysPublic`, which is what made a private-beta app publicly browsable.
//
// Data fetching is token-optional from day one so the flip changes the
// directory, not this file's logic.
import type {
  ArtistDetailResponse,
  ArtistInfoResponse,
} from '@concert-crawl/types';
import { notFound } from 'next/navigation';
import React from 'react';

import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent';
import { auth } from '@/lib/auth';
import { ApiError, apiClient, publicApiClient } from '@/lib/api';

/** The past-shows window, in nights. Matches the API's default and step. */
const PAST_STEP = 50;
const PAST_MAX = 500;

/**
 * "Show older" links to `?past=<window + 50>`, so the page re-renders on the
 * server with a bigger window and no client fetch. Anything that is not a
 * whole number of steps inside the API's bounds is the first window.
 */
const pastWindow = (raw: string | string[] | undefined): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) &&
    value > PAST_STEP &&
    value <= PAST_MAX &&
    value % PAST_STEP === 0
    ? value
    : PAST_STEP;
};

const fetchArtist = async (
  slug: string,
  token: string | null,
  past: number,
): Promise<ArtistDetailResponse | null> => {
  try {
    const path =
      past === PAST_STEP
        ? `/v1/artists/${slug}`
        : `/v1/artists/${slug}?pastLimit=${past}`;
    if (token) return await apiClient.get<ArtistDetailResponse>(path, token);
    return await publicApiClient.get<ArtistDetailResponse>(path);
  } catch (err) {
    // ONLY a genuine 404 means "no such artist". Swallowing everything here —
    // as the venue sibling does — tells a visitor the artist doesn't exist
    // when the truth is that the server broke. Anything else re-throws so
    // (protected)/error.tsx catches it and offers the retry.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

/**
 * The About block, the Commons photo and the identity line: garnish for an act
 * with nothing on the calendar. Any failure (a 404 for an act the info route
 * hides, a Wikimedia outage, a timeout) is "no info", never a broken page.
 */
const fetchInfo = async (slug: string): Promise<ArtistInfoResponse | null> => {
  try {
    return await publicApiClient.get<ArtistInfoResponse>(
      `/v1/artists/${slug}/info`,
    );
  } catch {
    return null;
  }
};

const ArtistPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ past?: string | string[] }>;
}) => {
  const { slug } = await params;
  const past = pastWindow((await searchParams)?.past);
  const { getToken } = await auth();
  const token = await getToken();

  const data = await fetchArtist(slug, token, past);
  if (!data) notFound();

  // Only an act with nothing upcoming reads from the info route; a booked
  // artist's page is as built.
  const info = data.shows.length === 0 ? await fetchInfo(slug) : null;

  return (
    <ArtistPageContent
      data={data}
      info={info}
      olderHref={data.pastHasMore ? `?past=${past + PAST_STEP}` : undefined}
    />
  );
};

export default ArtistPage;
