'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { canShareFiles, type ShareCapabilities } from '@/lib/share/destinations'
import { track } from '@/lib/analytics'

const COPY = CONSUMER_COPY.passport

export interface PassportActionsProps {
  /** The authenticated PNG route for this card. */
  imageUrl: string
  /**
   * Injected so both branches of the destination list are reachable from a
   * test. Defaults to the real `navigator` in the browser.
   */
  capabilities?: ShareCapabilities
}

/**
 * Share and save for the Passport.
 *
 * Deliberately NOT `ShareSheet`: that sheet's whole configuration is the shape
 * picker and the public-mirror link, and the Passport has neither — one ratio,
 * and no public URL to copy. Two destinations do not need a bottom sheet.
 *
 * `systemShare` from `lib/share/destinations` is not reused either, because it
 * always attaches a URL — correct for a poster that must link back to the show,
 * wrong for a card whose only URL is behind the owner's session.
 */
export const PassportActions = ({
  imageUrl,
  capabilities,
}: PassportActionsProps) => {
  const [failed, setFailed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const caps: ShareCapabilities = useMemo(
    () => capabilities ?? (typeof navigator === 'undefined' ? {} : navigator),
    [capabilities],
  )

  // The PNG is fetched on mount, not inside the click.
  //
  // `navigator.share` requires the transient user activation belonging to the
  // gesture that called it, and awaiting a multi-second card render inside the
  // handler spends it: the first share squeaks through on a fresh activation
  // and the second raises NotAllowedError. Prefetching also means the tap
  // itself is instant, which is the same defect wearing its other face.
  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    setFile(null)
    setObjectUrl(null)
    setFailed(false)

    void (async () => {
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setFile(new File([blob], COPY.downloadName, { type: 'image/png' }))
        setObjectUrl(created)
      } catch (err) {
        if (cancelled) return
        console.error('[passport] card fetch failed', { err })
        setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (created !== null) URL.revokeObjectURL(created)
    }
  }, [imageUrl])

  // Synchronous up to the `share()` call — see the effect above.
  const share = useCallback(() => {
    if (file === null) return
    setFailed(false)
    // Not optional-chained: a missing `share` would make the call a silent
    // no-op and still record a share that never happened.
    if (
      typeof caps.share !== 'function' ||
      caps.canShare?.({ files: [file] }) !== true
    ) {
      setFailed(true)
      return
    }
    caps
      .share({ title: COPY.pageTitle, files: [file] })
      .then(() => track('passport_shared', { destination: 'system' }))
      .catch((err: unknown) => {
        // A dismissed OS sheet rejects with AbortError, which is a cancel
        // rather than a failure — telling the user to save instead would be
        // wrong. The name is logged because NotAllowedError and a genuine
        // failure are indistinguishable from the message alone.
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[passport] share failed', {
          name: err instanceof Error ? err.name : 'unknown',
          err,
        })
        setFailed(true)
      })
  }, [caps, file])

  const preparing = file === null && !failed

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Gated on file support, not on the sheet merely existing: this card
            has no URL to fall back to, so a button that cannot carry the image
            has nothing left to do but apologise. */}
        {canShareFiles(caps) && (
          <button
            type="button"
            onClick={share}
            disabled={file === null}
            aria-busy={preparing}
            className="min-h-[44px] rounded-[10px] border border-border-strong bg-surface-3 px-5 text-sm font-bold text-fg disabled:opacity-60"
          >
            {preparing ? COPY.preparingLabel : COPY.shareLabel}
          </button>
        )}
        {/* Always present. The OS sheet is missing on every desktop browser,
            so a save that depended on it would leave those users no way out.
            Falls back to the route so the link still works if the prefetch
            did not — slowly, but a slow download beats a dead one. */}
        <a
          href={objectUrl ?? imageUrl}
          download={COPY.downloadName}
          aria-busy={preparing}
          onClick={() =>
            track('passport_shared', { destination: 'save-image' })
          }
          className="inline-flex min-h-[44px] items-center rounded-[10px] border border-border px-5 text-sm font-bold text-fg no-underline"
        >
          {COPY.saveLabel}
        </a>
      </div>
      {failed && (
        <p role="status" className="text-xs text-fg-muted">
          {COPY.shareFailed}
        </p>
      )}
    </div>
  )
}
