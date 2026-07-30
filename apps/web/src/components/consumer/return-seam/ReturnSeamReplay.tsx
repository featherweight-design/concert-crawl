'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  decodeIntent,
  sanitizeDestinationLabel,
  stripIntentParams,
} from '@/lib/auth/intent'
import { useWatching } from '@/lib/queries/use-watching'
import { useWatchToggle } from '@/lib/queries/use-watch-toggle'
import { ReturnStrip } from './ReturnStrip'

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
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { data: watchedShows } = useWatching()
  const { mutate } = useWatchToggle()

  const rawIntent = params.get('intent')
  // Arrives from an editable URL, so it is capped and de-controlled before it
  // reaches a one-line strip.
  const rawLabel = sanitizeDestinationLabel(params.get('label'))

  const [replayed, setReplayed] = useState(false)
  const [failed, setFailed] = useState(false)
  // The strip outlives the params it was built from: stripping the URL is what
  // stops a refresh replaying, so the label has to be captured before that.
  const [label, setLabel] = useState<string | null>(null)
  // Captured with the label, and for the same reason: the strip's own link must
  // point at the destination as the visitor sees it, query included.
  const [href, setHref] = useState<string | null>(null)
  // The effect must fire exactly once per intent: `useWatchToggle` is a toggle,
  // so a second run would quietly un-watch the show it just watched.
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!rawIntent || handled.current === rawIntent) return
    const intent = decodeIntent(rawIntent)

    // `usePathname` excludes the fragment, so it is read off the location.
    const hash = window.location.hash

    if (!intent) {
      // A malformed intent must not survive in a shareable URL, and it needs no
      // watch state to decide that.
      handled.current = rawIntent
      router.replace(stripIntentParams(pathname, params, hash))
      return
    }

    // The endpoint is a toggle and a cold cache reads as "not watching", so
    // firing before the list loads would un-watch a show the visitor already
    // had. Wait for it — the effect re-runs when the cache resolves.
    if (watchedShows === undefined) return

    const stripped = stripIntentParams(pathname, params, hash)
    handled.current = rawIntent
    setLabel(rawLabel)
    setHref(stripped)
    // A second intent in the same SPA session starts clean: a stale `failed`
    // would suppress this replay's strip outright, and a stale `replayed` would
    // flash the previous show's confirmation while this one is in flight.
    setReplayed(false)
    setFailed(false)
    router.replace(stripped)

    // Watching is idempotent from the visitor's point of view but the endpoint
    // is a toggle, so an already-watched show is left alone.
    if (watchedShows.some((show) => show.eventId === intent.eventId)) {
      setReplayed(true)
      return
    }

    mutate(intent.eventId, {
      onSuccess: () => setReplayed(true),
      onError: (err) => {
        // Sold out, unlinked, or deleted mid-flow. The visitor stays on the
        // destination with no strip and no error — never a bounce to `/`.
        console.warn('return-seam: replay failed', err)
        setFailed(true)
      },
    })
  }, [rawIntent, rawLabel, pathname, params, router, mutate, watchedShows])

  if (!replayed || failed) return null

  return <ReturnStrip artist={label} href={href ?? pathname} />
}
