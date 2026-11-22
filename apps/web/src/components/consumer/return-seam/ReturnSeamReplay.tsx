'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import { useInvalidateFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  decodeIntent,
  sanitizeDestinationLabel,
  stripIntentParams,
  type IntentAction,
} from '@/lib/auth/intent';
import { useWatching } from '@/lib/queries/use-watching';
import { useWatchToggle } from '@/lib/queries/use-watch-toggle';

const copy = CONSUMER_COPY.returnSeam;

// How long the welcome-back strip stays (logged-out UX deliverable 7).
const STRIP_MS = 6000;

/**
 * Replays the action a visitor started before they had an account, once they are
 * back at their destination.
 *
 * The replay is client-side on purpose. Doing it server-side would satisfy
 * "filled on first paint" literally, but the destination is reached by
 * navigation — a render that mutates watch state would be re-run by any refresh,
 * prefetch, or crawler, with no idempotency key available. Keeping it in a POST
 * here preserves first-paint anyway, because `useWatchToggle` seeds the query
 * cache optimistically before the request resolves.
 *
 * Mounted once in the app layout rather than per page, so every destination the
 * seam can land on is covered by the same code path.
 */
export const ReturnSeamReplay = () => {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: watchedShows } = useWatching();
  const { mutate } = useWatchToggle();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const invalidateFollowedNames = useInvalidateFollowedArtistNames();

  const rawIntent = params.get('intent');
  // Arrives from an editable URL, so it is capped and de-controlled before it
  // reaches a toast.
  const rawLabel = sanitizeDestinationLabel(params.get('label'));

  const [replayed, setReplayed] = useState(false);
  const [failed, setFailed] = useState(false);
  // The confirmation outlives the params it was built from: stripping the URL
  // is what stops a refresh replaying, so the label and the verb have to be
  // captured before that.
  const [label, setLabel] = useState<string | null>(null);
  const [action, setAction] = useState<IntentAction | null>(null);
  // The effect must fire exactly once per intent: `useWatchToggle` is a toggle,
  // so a second run would quietly un-watch the show it just watched.
  const handled = useRef<string | null>(null);

  // The follow endpoint only ever follows (POST follows, DELETE unfollows), so
  // replaying it twice is harmless, unlike the watch toggle. On success the
  // page is asked for again: it was rendered a moment ago, before the follow
  // existed, and would otherwise still draw the Follow button at rest.
  const followArtist = useCallback(
    async (slug: string) => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await apiClient.post<unknown>(`/v1/artists/${slug}/follow`, token, {});
        invalidateFollowedNames();
        setReplayed(true);
        router.refresh();
      } catch (err) {
        // A plan that cannot follow, a hidden artist, a network drop: the
        // visitor stays on the page with no toast and no error, as for a
        // failed watch.
        console.warn('return-seam: follow replay failed', err);
        setFailed(true);
      }
    },
    [getToken, router, invalidateFollowedNames],
  );

  useEffect(() => {
    if (!rawIntent || handled.current === rawIntent) return;
    const intent = decodeIntent(rawIntent);

    // `usePathname` excludes the fragment, so it is read off the location.
    const hash = window.location.hash;

    if (!intent) {
      // A malformed intent must not survive in a shareable URL, and it needs no
      // watch state to decide that.
      handled.current = rawIntent;
      router.replace(stripIntentParams(pathname, params, hash));
      return;
    }

    // The endpoint is a toggle and a cold cache reads as "not watching", so
    // firing before the list loads would un-watch a show the visitor already
    // had. Wait for it — the effect re-runs when the cache resolves.
    if (intent.action === 'watch' && watchedShows === undefined) return;

    if (intent.action === 'follow') {
      // A follow needs the session: coming back from sign-in the layout can
      // mount this before Clerk has one, and the params are about to be
      // stripped, so there would be no second chance. Wait for it.
      if (!isLoaded || !isSignedIn) return;
      // It follows the artist whose page this is, and nothing else: a link
      // that names another artist (or sits on another page) is only a URL.
      if (pathname !== `/artists/${intent.artistSlug}`) {
        handled.current = rawIntent;
        router.replace(stripIntentParams(pathname, params, hash));
        return;
      }
    }

    const stripped = stripIntentParams(pathname, params, hash);
    handled.current = rawIntent;
    setLabel(rawLabel);
    setAction(intent.action);
    // A second intent in the same SPA session starts clean: a stale `failed`
    // would suppress this replay's strip outright, and a stale `replayed` would
    // flash the previous show's confirmation while this one is in flight.
    setReplayed(false);
    setFailed(false);
    router.replace(stripped);

    if (intent.action === 'follow') {
      void followArtist(intent.artistSlug);
      return;
    }

    // Watching is idempotent from the visitor's point of view but the endpoint
    // is a toggle, so an already-watched show is left alone.
    if (watchedShows?.some((show) => show.eventId === intent.eventId)) {
      setReplayed(true);
      return;
    }

    mutate(intent.eventId, {
      onSuccess: () => setReplayed(true),
      onError: (err) => {
        // Sold out, unlinked, or deleted mid-flow. The visitor stays on the
        // destination with no strip and no error — never a bounce to `/`.
        console.warn('return-seam: replay failed', err);
        setFailed(true);
      },
    });
  }, [
    rawIntent,
    rawLabel,
    pathname,
    params,
    router,
    mutate,
    watchedShows,
    followArtist,
    isLoaded,
    isSignedIn,
  ]);

  // The confirmation is the drawn inline strip, not a toast: the filled eye or
  // the Following button further down does not read as a *change* on a page the
  // visitor has never seen signed in, so this says "that happened while you
  // were away". Once per replayed intent, only when it can be named, announced
  // once, and gone after STRIP_MS or on any navigation.
  const [strip, setStrip] = useState<{
    action: IntentAction;
    label: string;
  } | null>(null);
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!replayed || failed || !label || !action) return;
    const key = `${action}:${label}`;
    if (shown.current === key) return;
    shown.current = key;
    setStrip({ action, label });
  }, [replayed, failed, label, action]);

  useEffect(() => {
    if (strip === null) return;
    const timer = window.setTimeout(() => setStrip(null), STRIP_MS);
    return () => window.clearTimeout(timer);
  }, [strip]);

  // Any navigation dismisses it. The replay's own URL strip keeps the pathname,
  // so only a real move away changes it.
  const landedAt = useRef(pathname);
  useEffect(() => {
    if (pathname !== landedAt.current) setStrip(null);
  }, [pathname]);

  if (strip === null) return null;
  return (
    <div className="mx-auto w-full max-w-[640px] px-[14px] pt-2">
      <div
        role="status"
        aria-live="polite"
        data-testid="return-seam-strip"
        className="flex items-center gap-2.5 rounded-[11px] border px-3 py-[11px]"
        style={{
          background:
            'color-mix(in oklch, var(--signal) 13%, var(--surface-1))',
          borderColor: 'color-mix(in oklch, var(--signal) 45%, transparent)',
        }}
      >
        <Eye
          size={17}
          fill="currentColor"
          aria-hidden="true"
          style={{ color: 'var(--signal)', flexShrink: 0 }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="ph-no-capture"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12.5,
              fontWeight: 800,
              color: 'var(--fg)',
            }}
          >
            {strip.action === 'watch'
              ? copy.watching(strip.label)
              : copy.following(strip.label)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'var(--fg-muted)',
            }}
          >
            {copy.kept}
          </span>
        </div>
        {strip.action === 'watch' && (
          <Link
            href="/watching"
            className="flex min-h-11 items-center rounded-sm uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--signal)',
              textDecoration: 'none',
            }}
          >
            {copy.view}
          </Link>
        )}
      </div>
    </div>
  );
};
