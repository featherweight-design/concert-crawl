'use client'

import { useCallback, useMemo, useState } from 'react'
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
  const caps: ShareCapabilities = useMemo(
    () => capabilities ?? (typeof navigator === 'undefined' ? {} : navigator),
    [capabilities],
  )

  const share = useCallback(async () => {
    setFailed(false)
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const file = new File([blob], COPY.downloadName, { type: 'image/png' })
      // Not optional-chained: a missing `share` would make the call a silent
      // no-op and still record a share that never happened.
      if (
        typeof caps.share !== 'function' ||
        caps.canShare?.({ files: [file] }) !== true
      ) {
        throw new Error('files unsupported')
      }
      await caps.share({ title: COPY.pageTitle, files: [file] })
      track('passport_shared', { destination: 'system' })
    } catch (err) {
      // A dismissed OS sheet rejects with AbortError, which is a cancel rather
      // than a failure — telling the user to save instead would be wrong.
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('[passport] share failed', { err })
      setFailed(true)
    }
  }, [caps, imageUrl])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Gated on file support, not on the sheet merely existing: this card
            has no URL to fall back to, so a button that cannot carry the image
            has nothing left to do but apologise. */}
        {canShareFiles(caps) && (
          <button
            type="button"
            onClick={() => void share()}
            className="min-h-[44px] rounded-[10px] border border-border-strong bg-surface-3 px-5 text-sm font-bold text-fg"
          >
            {COPY.shareLabel}
          </button>
        )}
        {/* Always present. The OS sheet is missing on every desktop browser,
            so a save that depended on it would leave those users no way out. */}
        <a
          href={imageUrl}
          download={COPY.downloadName}
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
