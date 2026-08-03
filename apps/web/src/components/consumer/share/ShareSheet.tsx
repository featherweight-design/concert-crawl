'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/pwa/BottomSheet'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  DEFAULT_SHARE_RATIO,
  SC_RATIOS,
  SHARE_RATIOS,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios'
import {
  canSystemShare,
  copyLink,
  posterFileName,
  posterImageUrl,
  publicEventUrl,
  systemShare,
  type ShareCapabilities,
} from '@/lib/share/destinations'
import type { PosterEvent } from '@/lib/share/poster-event'
import { posterStateLabel } from '@/lib/share/taglines'
import { useTheme } from '@/theme/ThemeProvider'

const COPY = CONSUMER_COPY.share

export interface ShareSheetProps {
  open: boolean
  onClose: () => void
  event: PosterEvent
  /** The sharer's handle, or null for an anonymous poster. */
  handle: string | null
  /**
   * Injected so every branch of the destination list is reachable from a test.
   * Defaults to the real `navigator` in the browser.
   */
  capabilities?: ShareCapabilities
}

/**
 * The share sheet.
 *
 * Deliberately built on `components/pwa/BottomSheet` rather than a new dialog:
 * that component already owns the focus trap, the Escape handler, the
 * return-focus behaviour and the mobile-sheet → centred-dialog switch, and a
 * second implementation of any of those is a second thing to get wrong.
 *
 * There is no direction switcher — only the Poster direction ships — so the
 * shape picker is the whole of the sheet's configuration.
 */
export const ShareSheet = ({
  open,
  onClose,
  event,
  handle,
  capabilities,
}: ShareSheetProps) => {
  const [ratio, setRatio] = useState<ShareRatio>(DEFAULT_SHARE_RATIO)
  const [status, setStatus] = useState<string | null>(null)
  // The poster is rendered on demand and takes seconds, so the preview needs a
  // real pending state.
  const [preview, setPreview] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  )
  // Which URL the current `preview` describes. Reset during render rather than
  // in an effect so the new shape is `loading` in the *same* render that
  // changes the src — an effect would let one frame paint the previous
  // outcome first, and a cached image can fire `onLoad` before the effect
  // runs, wiping a result that was correct.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // The sheet stays mounted while `open` toggles (ShareButton renders it
  // unconditionally), so every piece of state here outlives a close unless it
  // is reset. Stale "Link copied" reads as if the action fired again; a stale
  // `ratio` reopens the sheet on whatever shape was picked last; and a stale
  // failure shows the error message before the retry it describes has started.
  useEffect(() => {
    if (open) return
    setStatus(null)
    setRatio(DEFAULT_SHARE_RATIO)
    setPreview('loading')
    setPreviewUrl(null)
  }, [open])

  // Memoised because the destination callbacks depend on it: rebuilt every
  // render, it would re-bind `navigator.share` on each keystroke elsewhere in
  // the tree and invalidate them all.
  const caps: ShareCapabilities = useMemo(
    () =>
      capabilities ??
      (typeof navigator === 'undefined'
        ? {}
        : {
            ...(typeof navigator.share === 'function' && {
              share: navigator.share.bind(navigator),
            }),
            ...(typeof navigator.canShare === 'function' && {
              canShare: navigator.canShare.bind(navigator),
            }),
            ...(navigator.clipboard !== undefined && {
              clipboard: navigator.clipboard,
            }),
          }),
    [capabilities],
  )

  // The poster is tinted by whatever theme the app is currently wearing.
  // Without this the route silently falls back to its default and the card a
  // Jade user shares comes back Electric.
  const { theme } = useTheme()
  const imageUrl = posterImageUrl({
    eventId: event.id,
    ratio,
    theme,
    by: handle,
  })
  // Every change of `imageUrl` starts a fresh attempt: the `key` below remounts
  // the img and the browser refetches. Returning to a shape that previously
  // settled must therefore show `loading` again, not the outcome of the earlier
  // attempt — otherwise leaving a slow shape before it lands brings the old
  // shape's failure message back while its retry is still in flight.
  if (previewUrl !== imageUrl) {
    setPreviewUrl(imageUrl)
    setPreview('loading')
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const linkUrl = publicEventUrl(event.id, origin)
  const title = `${event.artist} · ${event.venue}`
  const altText = COPY.altTemplate
    .replace('{artist}', event.artist)
    .replace('{venue}', event.venue)
    .replace('{date}', event.dateShort)
    .replace('{state}', posterStateLabel(event.state))

  const onSystemShare = useCallback(async () => {
    const outcome = await systemShare(caps, {
      title,
      url: linkUrl,
      imageUrl,
      fileName: posterFileName(event),
    })
    if (outcome === 'failed' || outcome === 'unsupported') {
      setStatus(COPY.shareFailed)
    } else {
      setStatus(null)
    }
  }, [caps, title, linkUrl, imageUrl, event])

  const onCopyLink = useCallback(async () => {
    const outcome = await copyLink(caps, linkUrl)
    setStatus(outcome === 'shared' ? COPY.copyLinkDone : COPY.shareFailed)
  }, [caps, linkUrl])

  return (
    <BottomSheet open={open} onClose={onClose} title={COPY.sheetTitle}>
      <div className="flex flex-col gap-4">
        {/* Grabber. Decorative — the sheet is dismissed by Escape or the
            backdrop, both of which BottomSheet already owns. */}
        <div
          aria-hidden="true"
          className="mx-auto h-[5px] w-11 rounded-full"
          style={{ background: 'var(--border-strong)' }}
        />

        {/* Live preview — the same route the destinations hand out, so what is
            previewed is byte-for-byte what gets shared. */}
        <div className="flex justify-center">
          {/* The frame carries the selected shape's own aspect, so the
              placeholder occupies exactly the footprint the poster will, and
              the destinations below never jump when it lands. A single
              tallest-shape box would leave `link` (1200×628) floating in dead
              space; deriving it per ratio costs nothing and is honest about
              what the shape picker is picking. */}
          <div
            className="relative w-40 overflow-hidden rounded-lg border border-border"
            style={{
              aspectRatio: `${SC_RATIOS[ratio].width} / ${SC_RATIOS[ratio].height}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image
                would optimise a PNG that is already the render target, and the
                route is not in the images allowlist. */}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={altText}
              onLoad={() => setPreview('ready')}
              onError={() => setPreview('failed')}
              className={`h-full w-full object-contain ${
                preview === 'ready' ? '' : 'hidden'
              }`}
            />
            {preview !== 'ready' && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-fg-muted"
                style={
                  preview === 'loading'
                    ? { background: 'var(--surface-2)' }
                    : undefined
                }
              >
                {preview === 'loading'
                  ? COPY.previewLoading
                  : COPY.previewFailed}
              </div>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-fg-muted">
            {COPY.ratioLabel}
          </legend>
          <div className="flex gap-2">
            {SHARE_RATIOS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === ratio}
                onClick={() => setRatio(option)}
                className={`min-h-11 flex-1 rounded-full border px-3 text-sm ${
                  option === ratio
                    ? 'border-accent bg-accent text-fg-on-accent'
                    : 'border-border text-fg-muted'
                }`}
              >
                {COPY.ratios[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          {canSystemShare(caps) && (
            <button
              type="button"
              onClick={() => {
                void onSystemShare()
              }}
              className="min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-fg-on-accent"
            >
              {COPY.destinations.systemShare}
            </button>
          )}
          <a
            href={imageUrl}
            download={posterFileName(event)}
            className="flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-fg"
          >
            {COPY.destinations.saveImage}
          </a>
          <button
            type="button"
            onClick={() => {
              void onCopyLink()
            }}
            className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-fg"
          >
            {COPY.destinations.copyLink}
          </button>
        </div>

        {/* Polite rather than assertive: a copy confirmation should not
            interrupt whatever the user is already reading. */}
        <p aria-live="polite" className="min-h-4 text-xs text-fg-muted">
          {status}
        </p>
      </div>
    </BottomSheet>
  )
}
