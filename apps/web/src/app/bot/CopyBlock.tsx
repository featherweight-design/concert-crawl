'use client'

import { useEffect, useRef, useState } from 'react'

import { BOT_COPY } from './definitions/copy'

interface CopyBlockProps {
  /** Rendered one per line, and joined with newlines for the clipboard. */
  lines: string[]
  /** Describes the string being copied, for screen readers. */
  ariaLabel: string
}

export function CopyBlock({ lines, ariaLabel }: CopyBlockProps) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const text = lines.join('\n')

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  // Only confirm on a resolved write. writeText rejects in an insecure context,
  // and a "Copied" that lied would send an operator away with an empty clipboard
  // and no reason to look at the selectable text sitting next to the button.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      // A second click otherwise inherits the first click's remaining time and
      // clears the confirmation early.
      clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), 1600)
    } catch (err) {
      console.warn('Clipboard write failed; the string is selectable.', err)
    }
  }

  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-border bg-surface-1 py-2.5 pl-3 pr-2.5">
      <code className="min-w-0 flex-1 select-all whitespace-pre-wrap break-all font-mono text-[12.5px] font-medium leading-[1.7] text-fg">
        {text}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={ariaLabel}
        className={`inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-[7px] border border-border px-2.5 py-[7px] font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] transition-colors ${
          copied
            ? 'bg-signal text-fg-on-accent'
            : 'bg-surface-2 text-fg-muted hover:text-fg'
        }`}
      >
        {copied ? BOT_COPY.copyButton.copied : BOT_COPY.copyButton.idle}
      </button>
      {/* The button's accessible name stays `ariaLabel`, so the visible
          "Copied" swap is silent to a screen reader. Announce the success
          here instead: renaming the button on click would change what the
          control claims to do at the moment it was used. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? BOT_COPY.copyButton.copied : ''}
      </span>
    </div>
  )
}
