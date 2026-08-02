'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BACK_CHIP_COPY } from './definitions/copy'

/**
 * The 44px hit target is 8px wider and taller than the 36px visual disc, so the
 * button is positioned 4px up and 4px left of where the disc should land. With
 * `top` at the handoff's 56px the button sits at 52px and `left-2.5` (10px)
 * puts the disc back at 14px — exactly where it rendered before the hit area
 * grew. Do not "simplify" either offset away: the disc must not move.
 */
const HIT_AREA_OFFSET_PX = 4

interface BackChipProps {
  /** Distance from the top of the positioned ancestor, px. 56 under device chrome, 14 without. */
  top?: number
  /** Route pushed when there is no history entry to pop. Defaults to `'/events'`. */
  fallbackHref?: string
  /**
   * Lay the chip out in flow instead of over artwork — for bars that already
   * provide their own background (the artist page's sticky sub-header). `top`
   * is ignored in this mode.
   */
  inline?: boolean
  className?: string
}

export function BackChip({
  top = 56,
  fallbackHref = '/events',
  inline = false,
  className,
}: BackChipProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        // Prefer history-aware back so query state (filters, scroll position)
        // on the previous page is restored. Falls back to `fallbackHref` only
        // when this tab has no prior history (e.g., a direct link opened in a
        // fresh tab). For all other entries — including external referrers —
        // `router.back()` returns the user to wherever they came from, which
        // matches the browser's own back affordance. (#637)
        if (window.history.length <= 1) {
          router.push(fallbackHref)
        } else {
          router.back()
        }
      }}
      aria-label={BACK_CHIP_COPY.label}
      className={cn(
        'z-10 flex h-11 w-11 items-center justify-center',
        inline ? 'relative shrink-0' : 'absolute left-2.5',
        className,
      )}
      style={inline ? undefined : { top: top - HIT_AREA_OFFSET_PX }}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          // `--scrim` is a dark wash on every theme, which puts dark ink on a
          // dark disc in Light mode over light artwork — the chevron all but
          // disappeared. A background mixed from `--bg` is opposite the
          // foreground in every theme by construction, so the chevron holds
          // contrast wherever the chip lands.
          background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path
            d="M8 2L2 8l6 6"
            stroke="var(--fg)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
