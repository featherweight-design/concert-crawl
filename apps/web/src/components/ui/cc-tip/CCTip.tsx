'use client'

// CCTip: the app-wide explainer tooltip, and the replacement for InfoTooltip.
//
//   Shell    desktop → anchored popover (hover-intent + focus + click-to-pin)
//            mobile  → bottom sheet (tap opens; content can be tall and rich)
//   Trigger  a small info disc by default, or whatever the call site passes as
//            children. Never the only affordance: the thing it explains always
//            carries its own visible label.
//   Content  declared as data (see definitions/copy.ts), never as JSX here.
//
// A11y: the trigger is a real <button> whose accessible name is the tip's short
// label, with the explanatory panel exposed separately via aria-describedby so
// the description isn't announced twice. Escape closes and returns focus. No
// native title= tooltips anywhere.

import { useId, type CSSProperties, type ReactNode } from 'react'
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import {
  CCOverlay,
  CCOverlayHost,
  useOverlayTrigger,
  type OverlayAlign,
  type OverlayPlacement,
} from '@/components/ui/cc-overlay'
import { CCTipBody } from './CCTipBody'
import { TIP_CONTENT, type TipKey } from './definitions/copy'
import type { TipContent } from './definitions/types'

interface CCTipProps {
  // A registry key, or a record built from a call site's own copy file.
  tip: TipKey | TipContent
  // Overrides the accessible name when the call site's visible affordance says
  // something shorter or different from the tip's header line.
  triggerLabel?: string
  placement?: OverlayPlacement
  align?: OverlayAlign
  width?: number
  defaultOpen?: boolean
  // Visible trigger content. Omit for the default info disc.
  children?: ReactNode
  triggerClassName?: string
  triggerStyle?: CSSProperties
}

const InfoDisc = ({ open }: { open: boolean }) => (
  <span
    aria-hidden
    className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full transition-colors"
    style={{
      color: open ? 'var(--signal)' : 'var(--fg-subtle)',
      background: open
        ? 'color-mix(in oklab, var(--signal) 12%, transparent)'
        : 'transparent',
    }}
  >
    <svg width={15} height={15} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="5.1" r="0.95" fill="currentColor" />
      <path
        d="M8 7.4v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  </span>
)

const isTipKey = (value: TipKey | TipContent): value is TipKey =>
  typeof value === 'string'

export const CCTip = ({
  tip,
  triggerLabel,
  placement = 'top',
  align = 'center',
  width,
  defaultOpen = false,
  children,
  triggerClassName,
  triggerStyle,
}: CCTipProps) => {
  const isMobile = useIsMobileViewport()
  const trigger = useOverlayTrigger({ isMobile, defaultOpen })
  const panelId = useId()

  const content: TipContent = isTipKey(tip) ? TIP_CONTENT[tip] : tip
  const label = triggerLabel ?? content.label
  // A one-line tip is its own header, so the popover drops the header row. The
  // sheet always keeps it: it carries the only accessible close control.
  const showPopoverHeader = content.variant !== 'text'
  // Only the headerless popover is a pure description. Once a header renders,
  // the panel also holds the title (already the trigger's name) and the close
  // control, and pointing a description at that subtree makes a screen reader
  // read both back as part of the trigger.
  const describedBy =
    trigger.open && !isMobile && !showPopoverHeader ? panelId : undefined
  const popoverWidth =
    width ??
    (content.variant === 'text' || content.variant === 'titled' ? 272 : 320)

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={trigger.hoverIn}
      onMouseLeave={trigger.hoverOut}
      onBlur={trigger.onBlur}
    >
      <button
        ref={trigger.triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={trigger.open}
        aria-controls={trigger.open ? panelId : undefined}
        aria-describedby={describedBy}
        onClick={trigger.toggle}
        onFocus={trigger.onFocus}
        className={`inline-flex flex-shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-1${
          triggerClassName ? ` ${triggerClassName}` : ''
        }`}
        style={{ font: 'inherit', ...triggerStyle }}
      >
        {children ?? <InfoDisc open={trigger.open} />}
        {/* 44px touch target without a 44px visual footprint. */}
        {isMobile && children === undefined && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
          />
        )}
      </button>

      {trigger.open &&
        (isMobile ? (
          <CCOverlayHost>
            <CCOverlay
              id={panelId}
              mode="sheet"
              title={content.label}
              onClose={trigger.close}
            >
              <CCTipBody tip={content} />
            </CCOverlay>
          </CCOverlayHost>
        ) : (
          <CCOverlay
            id={panelId}
            mode="popover"
            title={content.label}
            placement={placement}
            align={align}
            width={popoverWidth}
            showHeader={showPopoverHeader}
            onClose={trigger.close}
          >
            <CCTipBody tip={content} />
          </CCOverlay>
        ))}
    </span>
  )
}
