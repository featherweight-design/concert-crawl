'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  canShareFiles,
  type ShareCapabilities,
} from '@/lib/share/destinations';
import { track } from '@/lib/analytics';

const COPY = CONSUMER_COPY.passport;

export interface PassportShare {
  /** The card image, once fetched. */
  file: File | null;
  /** A blob URL for the Save link, once fetched. */
  objectUrl: string | null;
  failed: boolean;
  /** True while the card is still being drawn. */
  preparing: boolean;
  /** Whether this device can share the image file at all. */
  canShare: boolean;
  /** Opens the system share sheet. A no-op until `file` is in hand. */
  share: () => void;
}

/**
 * The Passport card's fetch and share, in one place so the phone top bar's
 * share icon and the Share and Save row run the same share off one fetch.
 *
 * The PNG is fetched on mount, not inside the click.
 *
 * `navigator.share` requires the transient user activation belonging to the
 * gesture that called it, and awaiting a multi-second card render inside the
 * handler spends it: the first share squeaks through on a fresh activation
 * and the second raises NotAllowedError. Prefetching also means the tap
 * itself is instant, which is the same defect wearing its other face.
 */
export const usePassportShare = (
  imageUrl: string | null,
  capabilities?: ShareCapabilities,
): PassportShare => {
  const [failed, setFailed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const caps: ShareCapabilities = useMemo(
    () => capabilities ?? (typeof navigator === 'undefined' ? {} : navigator),
    [capabilities],
  );

  // Read after mount, not during render: the server has no `navigator`, so a
  // render-time read would hydrate differently from what it served.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(canShareFiles(caps));
  }, [caps]);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setFile(null);
    setObjectUrl(null);
    setFailed(false);
    // Held until the caller has the live theme, so the card is fetched once.
    if (imageUrl === null) return;

    void (async () => {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        // The file first: it is what Share needs, and the object URL is only
        // the Save link's shortcut past a second render.
        setFile(new File([blob], COPY.downloadName, { type: 'image/png' }));
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      } catch (err) {
        if (cancelled) return;
        console.error('[passport] card fetch failed', { err });
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (created !== null) URL.revokeObjectURL(created);
    };
  }, [imageUrl]);

  // Synchronous up to the `share()` call — see the note above.
  const share = useCallback(() => {
    if (file === null) return;
    setFailed(false);
    // Not optional-chained: a missing `share` would make the call a silent
    // no-op and still record a share that never happened.
    if (
      typeof caps.share !== 'function' ||
      caps.canShare?.({ files: [file] }) !== true
    ) {
      setFailed(true);
      return;
    }
    // A dismissed OS sheet rejects with AbortError, which is a cancel rather
    // than a failure — telling the user to save instead would be wrong. The
    // name is logged because NotAllowedError and a genuine failure are
    // indistinguishable from the message alone.
    const onShareError = (err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[passport] share failed', {
        name: err instanceof Error ? err.name : 'unknown',
        err,
      });
      setFailed(true);
    };

    // `navigator.share` can throw synchronously as well as reject, and a throw
    // escaping the click handler would leave the button dead with no fallback
    // shown. `systemShare` in lib/share/destinations wraps it for the same
    // reason.
    try {
      caps
        .share({ title: COPY.pageTitle, files: [file] })
        .then(() => track('passport_shared', { destination: 'system' }))
        .catch(onShareError);
    } catch (err) {
      onShareError(err);
    }
  }, [caps, file]);

  return {
    file,
    objectUrl,
    failed,
    preparing: file === null && !failed,
    canShare,
    share,
  };
};
