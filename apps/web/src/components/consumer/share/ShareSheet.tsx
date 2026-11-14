'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  DEFAULT_SHARE_RATIO,
  SC_RATIOS,
  SHARE_RATIOS,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios';
import {
  canShareFiles,
  canSystemShare,
  copyLink,
  fetchPosterFile,
  posterFileName,
  posterImageUrl,
  publicEventUrl,
  systemShare,
  type ShareCapabilities,
} from '@/lib/share/destinations';
import type { PosterEvent } from '@/lib/share/poster-event';
import { posterStateLabel } from '@/lib/share/taglines';
import { track } from '@/lib/analytics';
import { wasServedFromCache } from '@/lib/analytics/resource-cache';
import { useTheme } from '@/theme/ThemeProvider';

const COPY = CONSUMER_COPY.share;

/**
 * The preview's drawn width per shape, in px (the ring sits outside it). The
 * boards draw story at 150 (more-r3-share_d), square at 202 and wide at 302
 * (more-r3-share_m_square, more-r3-share_m); each is drawn on one viewport
 * only and reused on the other. `max-w-full` lets wide shrink at 320.
 */
const PREVIEW_WIDTH: Record<ShareRatio, number> = {
  story: 150,
  square: 202,
  link: 302,
};

/** The outline glyph on each SHAPE tile, as drawn: width × height in px. */
const GLYPH: Record<ShareRatio, { width: number; height: number }> = {
  story: { width: 12, height: 20 },
  square: { width: 18, height: 18 },
  link: { width: 26, height: 14 },
};

const SIGNAL_TO_ACCENT_ROW =
  'linear-gradient(90deg, var(--signal), var(--accent))';

const TILE =
  'flex h-16 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border text-[13px] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)]';

// Drawn 38px tall. The ::after is positioned against the 36px padding box
// (inside the 1px borders) and reaches 4px past it top and bottom, so the hit
// area is 44px without a 44px visible box. The 10px row gap above absorbs it.
const GHOST_PILL_HIT =
  "after:absolute after:-inset-y-[4px] after:inset-x-0 after:content-['']";
const GHOST_PILL = `relative flex h-[38px] min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-transparent px-3 text-[15px] font-bold text-fg ${GHOST_PILL_HIT}`;

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  event: PosterEvent;
  /** The sharer's handle, or null for an anonymous poster. */
  handle: string | null;
  /**
   * Injected so every branch of the destination list is reachable from a test.
   * Defaults to the real `navigator` in the browser.
   */
  capabilities?: ShareCapabilities;
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
  const [ratio, setRatio] = useState<ShareRatio>(DEFAULT_SHARE_RATIO);
  const [status, setStatus] = useState<string | null>(null);
  // The poster is rendered on demand and takes seconds, so the preview needs a
  // real pending state.
  const [preview, setPreview] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  );
  // Which URL the current `preview` describes. Reset during render rather than
  // in an effect so the new shape is `loading` in the *same* render that
  // changes the src — an effect would let one frame paint the previous
  // outcome first, and a cached image can fire `onLoad` before the effect
  // runs, wiping a result that was correct.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The poster PNG fetched ahead of a Share… tap, tagged with its URL so a
  // file for another shape or theme is never handed over. See the prefetch.
  const [posterFile, setPosterFile] = useState<{
    url: string;
    file: File;
  } | null>(null);

  // The sheet stays mounted while `open` toggles (ShareButton renders it
  // unconditionally), so every piece of state here outlives a close unless it
  // is reset. Stale "Link copied" reads as if the action fired again; a stale
  // `ratio` reopens the sheet on whatever shape was picked last; and a stale
  // failure shows the error message before the retry it describes has started.
  useEffect(() => {
    if (open) return;
    setStatus(null);
    setRatio(DEFAULT_SHARE_RATIO);
    setPreview('loading');
    setPreviewUrl(null);
    // The PNG is a few hundred KB held only for the next Share… tap.
    setPosterFile(null);
  }, [open]);

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
  );

  // The poster is tinted by whatever theme the app is currently wearing.
  // Without this the route silently falls back to its default and the card a
  // Jade user shares comes back Electric.
  const { theme } = useTheme();
  const imageUrl = posterImageUrl({
    eventId: event.id,
    ratio,
    theme,
    by: handle,
  });
  // Every change of `imageUrl` starts a fresh attempt: the `key` below remounts
  // the img and the browser refetches. Returning to a shape that previously
  // settled must therefore show `loading` again, not the outcome of the earlier
  // attempt — otherwise leaving a slow shape before it lands brings the old
  // shape's failure message back while its retry is still in flight.
  // Guarded on `open` because the sheet stays mounted while closed: unguarded,
  // this would re-adopt the current url on the very next render and undo the
  // close reset above, leaving that reset dead and writing state for an img
  // that isn't rendered.
  //
  // Deliberately a render-phase adjustment (React's documented "reset state
  // when a prop changes"), not an effect and not a `settledUrl === imageUrl`
  // derivation. That derivation is what this replaced: it keeps one settled
  // record, so returning to a shape whose result is still stored — while a
  // slower shape never settled — replays that stored outcome over an img that
  // is refetching. An effect would instead let one frame paint the previous
  // outcome first. The condition below is idempotent and self-clearing, so it
  // is safe under Strict Mode and concurrent rendering.
  if (open && previewUrl !== imageUrl) {
    setPreviewUrl(imageUrl);
    setPreview('loading');
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const linkUrl = publicEventUrl(event.id, origin);
  const title = `${event.artist} · ${event.venue}`;
  const altText = COPY.altTemplate
    .replace('{artist}', event.artist)
    .replace('{venue}', event.venue)
    .replace('{date}', event.dateShort)
    .replace('{state}', posterStateLabel(event.state));

  // The PNG is fetched as a File when a shape is picked, never inside the
  // Share click: `navigator.share` needs that click's transient activation,
  // and awaiting a multi-second render first spends it (the Passport's
  // "worked once, then couldn't share", #1446). Skipped where the platform
  // cannot take a file, since the share is the link alone there anyway.
  //
  // Started only once the preview <img> has loaded that same URL, so the fetch
  // is answered from the HTTP cache (the route is cacheable with an ETag)
  // rather than racing the img into a second multi-second render on a cold
  // cache. Aborted when the shape or theme changes and on close; a result for
  // an aborted request is dropped.
  const fileName = posterFileName(event);
  const wantsFile = open && preview === 'ready' && canShareFiles(caps);
  useEffect(() => {
    if (!wantsFile) return;
    const controller = new AbortController();
    void fetchPosterFile(imageUrl, fileName, {
      signal: controller.signal,
    }).then((file) => {
      if (!controller.signal.aborted && file !== null) {
        setPosterFile({ url: imageUrl, file });
      }
    });
    return () => {
      controller.abort();
    };
  }, [wantsFile, imageUrl, fileName]);

  // ⚠ Synchronous up to `share()`: `systemShare` reaches it before its first
  // await. A file for another shape is never handed over; until this shape's
  // lands, the share is the link.
  const onSystemShare = () => {
    track('share_destination_selected', {
      eventId: event.id,
      destination: 'system',
    });
    void systemShare(caps, {
      title,
      url: linkUrl,
      file: posterFile?.url === imageUrl ? posterFile.file : null,
    }).then((outcome) => {
      setStatus(
        outcome === 'failed' || outcome === 'unsupported'
          ? COPY.shareFailed
          : null,
      );
    });
  };

  const onCopyLink = useCallback(async () => {
    track('share_destination_selected', {
      eventId: event.id,
      destination: 'copy-link',
    });
    const outcome = await copyLink(caps, linkUrl);
    setStatus(outcome === 'shared' ? COPY.copyLinkDone : COPY.shareFailed);
  }, [caps, linkUrl, event.id]);

  return (
    // Boards: more-r3-share_m / _m_square (phone sheet) and more-r3-share_d
    // (the 440px centred dialog): blue-to-pink top edge on both, raised fill,
    // the muted SHARE THIS SHOW eyebrow opposite the boxed close.
    <BottomSheet
      open={open}
      onClose={onClose}
      title={COPY.sheetTitle}
      maxWidth={440}
      edgeFromSm
      raised
      inset="phone-tight"
      eyebrow={COPY.sheetTitle}
      eyebrowTone="subtle"
    >
      {/* Grabber: decorative, phone only. The sheet closes by its ×, Escape,
          the backdrop or a drag, all of which BottomSheet owns. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[11px] h-1 w-10 -translate-x-1/2 rounded-full bg-border-strong lg:hidden"
      />
      <div className="flex flex-col" data-testid="share-sheet">
        {/* Live preview — the same route the destinations hand out, so what is
            previewed is byte-for-byte what gets shared. */}
        <div className="mb-12 mt-7 flex justify-center lg:mb-7 lg:mt-1">
          {/* The frame carries the selected shape's own aspect, so the
              placeholder occupies exactly the footprint the poster will, and
              the controls below never jump when it lands. The ring is the
              boards' signal frame: a 2px signal line, a faint 4px band
              outside it and a glow. */}
          <div
            data-testid="share-preview-ring"
            className="max-w-full rounded-[16px] p-1"
            style={{
              width: PREVIEW_WIDTH[ratio] + 8,
              background: 'color-mix(in oklch, var(--signal) 14%, transparent)',
              boxShadow:
                '0 0 56px color-mix(in oklch, var(--signal) 26%, transparent)',
            }}
          >
            <div
              className="relative w-full overflow-hidden rounded-xl border-2 border-signal"
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
                onLoad={() => {
                  setPreview('ready');
                  // Read the timing entry before React re-renders and the `key`
                  // has any chance to swap the img — the entry is keyed by url,
                  // so a later read could describe a different shape's fetch.
                  track('share_card_rendered', {
                    eventId: event.id,
                    ratio,
                    theme,
                    cacheHit: wasServedFromCache(imageUrl),
                  });
                }}
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
        </div>

        <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
          <legend className="mb-2.5 p-0 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-fg-muted">
            {COPY.ratioLabel}
          </legend>
          <div className="flex gap-2">
            {SHARE_RATIOS.map((option) => {
              const selected = option === ratio;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`share-shape-${option}`}
                  onClick={() => setRatio(option)}
                  // Selected: a blue-to-pink border drawn as a border-box
                  // gradient under a padding-box fill, bold label, signal glyph.
                  className={`${TILE} ${
                    selected
                      ? 'border-transparent font-bold text-fg'
                      : 'border-border bg-transparent font-medium text-fg-muted'
                  }`}
                  style={
                    selected
                      ? {
                          background: `linear-gradient(var(--surface-3), var(--surface-3)) padding-box, ${SIGNAL_TO_ACCENT_ROW} border-box`,
                        }
                      : undefined
                  }
                >
                  <ShapeGlyph
                    ratio={option}
                    className={selected ? 'text-signal' : 'text-fg-subtle'}
                  />
                  {COPY.ratios[option]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {canSystemShare(caps) && (
          <button
            type="button"
            onClick={onSystemShare}
            className="mt-3.5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[15px] font-bold text-fg-on-accent"
            style={{
              background: SIGNAL_TO_ACCENT_ROW,
              boxShadow:
                '0 8px 24px color-mix(in oklch, var(--signal) 22%, transparent)',
            }}
          >
            <Share2 size={16} strokeWidth={2.25} aria-hidden="true" />
            {COPY.destinations.systemShare}
          </button>
        )}
        <div className="mt-2 flex gap-2">
          <a
            href={imageUrl}
            download={fileName}
            onClick={() => {
              track('share_destination_selected', {
                eventId: event.id,
                destination: 'save-image',
              });
            }}
            className={GHOST_PILL}
          >
            {COPY.destinations.saveImage}
          </a>
          <button
            type="button"
            onClick={() => {
              void onCopyLink();
            }}
            className={GHOST_PILL}
          >
            {COPY.destinations.copyLink}
          </button>
        </div>

        {/* Polite rather than assertive: a copy confirmation should not
            interrupt whatever the user is already reading. Not drawn on the
            boards; kept from the pre-B+ sheet. */}
        <p
          aria-live="polite"
          className="m-0 mt-2 min-h-4 text-xs text-fg-muted"
        >
          {status}
        </p>
      </div>
    </BottomSheet>
  );
};

/** The outline rectangle over each SHAPE label: tall, square or wide. */
const ShapeGlyph = ({
  ratio,
  className,
}: {
  ratio: ShareRatio;
  className: string;
}) => {
  const { width, height } = GLYPH[ratio];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      data-glyph={ratio}
      className={className}
    >
      <rect
        x="0.75"
        y="0.75"
        width={width - 1.5}
        height={height - 1.5}
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};
