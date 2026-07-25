'use client'

import type { CSSProperties, KeyboardEvent } from 'react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  VENDOR_CATCHALL,
  VENDOR_GROUPS,
  VENDOR_PINNED,
  type Vendor,
} from '@concert-crawl/types'

import { VENDOR_PICKER_COPY } from '@/components/consumer/definitions/copy'

const TYPEAHEAD_WINDOW_MS = 700
const POPOVER_GAP_PX = 8

const label = (vendor: Vendor): string => VENDOR_PICKER_COPY.vendors[vendor]

const inDropdown = (vendor: Vendor | null): vendor is Vendor =>
  vendor !== null && !VENDOR_PINNED.includes(vendor)

// Dropdown order, flattened. Drives roving tabindex, arrow keys and typeahead —
// the visual grouping is presentational, the keyboard walks one list.
const DROPDOWN_ORDER: readonly Vendor[] = [
  ...VENDOR_GROUPS.flatMap((group) => group.items),
  VENDOR_CATCHALL,
]

// ChipGroup's classes, plus `inline-flex items-center gap-1.5` so a chip can
// hold an icon beside its label. These chips sit one row below a ChipGroup in
// the same form, so any divergence beyond that superset reads as a bug.
const chipClass = (
  active: boolean,
  disabled: boolean,
  invalid: boolean,
): string =>
  [
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
    disabled
      ? 'border-border text-fg-muted cursor-not-allowed opacity-60'
      : active
        ? 'border-signal text-signal bg-signal/10'
        : invalid
          ? 'border-warning text-fg hover:border-fg-muted'
          : 'border-border-strong text-fg hover:border-fg-muted',
  ].join(' ')

const Caret = ({ open }: { open: boolean }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 12 12"
    aria-hidden="true"
    style={{
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform 0.18s ease',
      flexShrink: 0,
    }}
  >
    <path
      d="M2.5 4.5L6 8l3.5-3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 8.5l3 3 7-8"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

const ClearIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2.5 2.5l7 7M9.5 2.5l-7 7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

interface VendorListboxProps {
  value: Vendor | null
  onPick: (vendor: Vendor) => void
  onClose: () => void
  labelledBy: string
}

const VendorListbox = ({
  value,
  onPick,
  onClose,
  labelledBy,
}: VendorListboxProps) => {
  const startIndex = useMemo(
    () => Math.max(0, value === null ? 0 : DROPDOWN_ORDER.indexOf(value)),
    [value],
  )
  const [active, setActive] = useState(startIndex)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const typeahead = useRef({ buffer: '', at: 0 })

  useEffect(() => {
    itemRefs.current[startIndex]?.focus()
  }, [startIndex])

  const focusAt = useCallback((index: number) => {
    const next = (index + DROPDOWN_ORDER.length) % DROPDOWN_ORDER.length
    setActive(next)
    itemRefs.current[next]?.focus()
  }, [])

  const onKeyDown = (ev: KeyboardEvent) => {
    const key = ev.key
    if (key === 'ArrowDown') {
      ev.preventDefault()
      focusAt(active + 1)
    } else if (key === 'ArrowUp') {
      ev.preventDefault()
      focusAt(active - 1)
    } else if (key === 'Home') {
      ev.preventDefault()
      focusAt(0)
    } else if (key === 'End') {
      ev.preventDefault()
      focusAt(DROPDOWN_ORDER.length - 1)
    } else if (key === 'Escape') {
      ev.preventDefault()
      // ModalShell listens on `document`, and React dispatches synthetic
      // events from its own root container — so the synthetic stopPropagation
      // never reaches it. Only stopping the native event keeps the first
      // Escape from tearing down the whole submit modal.
      ev.nativeEvent.stopPropagation()
      onClose()
    } else if (key === 'Enter' || key === ' ') {
      ev.preventDefault()
      const picked = DROPDOWN_ORDER[active]
      if (picked) onPick(picked)
    } else if (key.length === 1 && /\S/.test(key)) {
      const now = Date.now()
      const state = typeahead.current
      state.buffer =
        now - state.at > TYPEAHEAD_WINDOW_MS ? key : state.buffer + key
      state.at = now
      const hit = DROPDOWN_ORDER.findIndex((vendor) =>
        label(vendor).toLowerCase().startsWith(state.buffer.toLowerCase()),
      )
      if (hit >= 0) focusAt(hit)
    }
  }

  const optionStyle = (selected: boolean): CSSProperties => ({
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    background: selected ? 'var(--signal-wash)' : 'transparent',
    color: selected ? 'var(--signal)' : 'var(--fg)',
    fontSize: 14.5,
    fontWeight: selected ? 700 : 500,
    letterSpacing: '-0.005em',
    textAlign: 'left',
  })

  const renderOption = (vendor: Vendor, index: number) => {
    const selected = value === vendor
    return (
      // A div, not a button: ARIA-in-HTML forbids role="option" on <button>,
      // and validators flag it. Enter and Space are already handled by the
      // listbox's own key handler, so nothing is lost.
      <div
        key={vendor}
        role="option"
        aria-selected={selected}
        ref={(node) => {
          itemRefs.current[index] = node
        }}
        tabIndex={active === index ? 0 : -1}
        onFocus={() => setActive(index)}
        onClick={() => onPick(vendor)}
        style={optionStyle(selected)}
      >
        <span
          style={{
            width: 14,
            display: 'inline-flex',
            justifyContent: 'center',
            color: 'var(--signal)',
            opacity: selected ? 1 : 0,
          }}
        >
          <Check />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{label(vendor)}</span>
      </div>
    )
  }

  let cursor = -1
  return (
    <div
      role="listbox"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        outline: 'none',
      }}
    >
      {VENDOR_GROUPS.map((group) => {
        const copy = VENDOR_PICKER_COPY.groups[group.id]
        return (
          <div
            key={group.id}
            role="group"
            // Named directly rather than via the visible header: the label and
            // caption are two elements, and the computed name runs them
            // together without the pause a listener needs.
            aria-label={`${copy.label}, ${copy.caption}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {/* Resale is marked once, in words — the only place in the product
                where the face-value distinction can be taught at the moment it
                matters. No per-row pill; it would compete with the checkmark. */}
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                flexWrap: 'wrap',
                padding: '0 2px 2px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:
                    group.id === 'resale'
                      ? 'var(--warning)'
                      : 'var(--fg-subtle)',
                }}
              >
                {copy.label}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '-0.005em',
                }}
              >
                {copy.caption}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {group.items.map((vendor) => {
                cursor += 1
                return renderOption(vendor, cursor)
              })}
            </div>
          </div>
        )
      })}

      {/* Catch-all — ungrouped and divided off. Text-free by policy: an unnamed
          vendor is a better data outcome than a wrong named one. */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {renderOption(VENDOR_CATCHALL, cursor + 1)}
      </div>
    </div>
  )
}

interface VendorFieldProps {
  value: Vendor | null
  onChange: (vendor: Vendor | null) => void
  error?: string | undefined
  disabled?: boolean
}

/**
 * "Where it's listed" — three pinned chips plus a disclosure onto the
 * remaining nine, grouped Primary / Resale. Closed set, no free text and no
 * URLs: a pasted URL is a phishing surface, which is why #1193 shipped as an
 * enum expansion rather than the literal ask.
 */
export const VendorField = ({
  value,
  onChange,
  error,
  disabled = false,
}: VendorFieldProps) => {
  const [open, setOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // Ids are per-instance: a second VendorField in the DOM would otherwise
  // duplicate them and silently break every aria-labelledby that points here.
  const instanceId = useId()
  const labelId = `${instanceId}-label`
  const popoverTitleId = `${instanceId}-popover-title`
  const sheetTitleId = `${instanceId}-sheet-title`

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 519px)')
    setIsNarrow(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setIsNarrow(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  // Locking the field while a surface is open would leave clickable options
  // behind a disabled control, so the payload could diverge from the UI.
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const pick = (vendor: Vendor) => {
    onChange(vendor)
    close()
  }

  // A pinned chip and the dropdown are one selection, so choosing a chip has to
  // dismiss an open surface. Focus stays where the click left it — on the chip.
  const pickPinned = (vendor: Vendor) => {
    onChange(vendor)
    setOpen(false)
  }

  // Roving tabindex: the radiogroup is one tab stop. The checked chip owns it;
  // with nothing checked the first chip does, per the ARIA radio-group pattern.
  const pinnedRefs = useRef<(HTMLButtonElement | null)[]>([])
  const checkedPinned = VENDOR_PINNED.findIndex((vendor) => vendor === value)
  const pinnedTabStop = checkedPinned === -1 ? 0 : checkedPinned

  const movePinned = (
    event: KeyboardEvent<HTMLButtonElement>,
    from: number,
  ) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    const next = (from + step + VENDOR_PINNED.length) % VENDOR_PINNED.length
    const vendor = VENDOR_PINNED[next]
    if (!vendor) return
    // A radiogroup selects as it moves — arrowing is the selection.
    pickPinned(vendor)
    pinnedRefs.current[next]?.focus()
  }

  // Clearing unmounts this button, so focus has to be handed back deliberately
  // or it falls to <body>.
  const clear = () => {
    onChange(null)
    close()
  }

  const fromDropdown = inDropdown(value)
  const triggerLabel = fromDropdown
    ? label(value)
    : VENDOR_PICKER_COPY.moreTrigger

  // Dismiss the popover on an outside click. The sheet has its own scrim.
  const shellRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open || isNarrow) return
    const onDocumentDown = (ev: PointerEvent) => {
      if (ev.target instanceof Node && !shellRef.current?.contains(ev.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocumentDown)
    return () => document.removeEventListener('pointerdown', onDocumentDown)
  }, [open, isNarrow])

  // Collision is measured, not assumed: the field can sit anywhere in a
  // scrolled modal, so the only honest input is where the chip actually is
  // and how tall the list actually rendered.
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [flipped, setFlipped] = useState(false)
  useLayoutEffect(() => {
    if (!open || isNarrow) return
    const shell = shellRef.current
    const popover = popoverRef.current
    if (!shell || !popover) return
    const rect = shell.getBoundingClientRect()
    const needed = popover.offsetHeight + POPOVER_GAP_PX
    setFlipped(
      rect.bottom + needed > window.innerHeight && rect.top - needed > 0,
    )
  }, [open, isNarrow, value])

  const listbox = (titleId: string) => (
    <VendorListbox
      value={value}
      onPick={pick}
      onClose={close}
      labelledBy={titleId}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      <span
        id={labelId}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: error ? 'var(--warning)' : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {VENDOR_PICKER_COPY.label}
        {/* aria-hidden keeps it out of name computation, so the radiogroup is
            announced as the question rather than "Where it's listed star". */}
        <span
          aria-hidden="true"
          style={{ color: 'var(--accent)', marginLeft: 4 }}
        >
          *
        </span>
      </span>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* The pinned three are a real radiogroup. `display: contents` keeps
            them in the parent's wrap flow — asserted in the component test,
            because browsers historically dropped such nodes from the a11y
            tree. */}
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          style={{ display: 'contents' }}
        >
          {VENDOR_PINNED.map((vendor, index) => {
            const active = value === vendor
            return (
              <button
                key={vendor}
                ref={(node) => {
                  pinnedRefs.current[index] = node
                }}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                tabIndex={index === pinnedTabStop ? 0 : -1}
                onClick={() => pickPinned(vendor)}
                onKeyDown={(event) => movePinned(event, index)}
                className={chipClass(active, disabled, Boolean(error))}
              >
                {label(vendor)}
              </button>
            )
          })}
        </div>

        {/* Fourth control — a disclosure, not a radio. Selection lands here in
            place, so the row never grows. */}
        <div
          ref={shellRef}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'stretch',
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={
              fromDropdown
                ? VENDOR_PICKER_COPY.selectedTriggerLabel.replace(
                    '{vendor}',
                    triggerLabel,
                  )
                : VENDOR_PICKER_COPY.moreTriggerLabel
            }
            onClick={() => setOpen((prev) => !prev)}
            onKeyDown={(event) => {
              // Same native-listener reason as the listbox handler above.
              if (event.key === 'Escape' && open) {
                event.nativeEvent.stopPropagation()
                close()
              }
            }}
            className={chipClass(fromDropdown, disabled, Boolean(error))}
            style={
              fromDropdown
                ? {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    paddingRight: 8,
                  }
                : undefined
            }
          >
            <span>{triggerLabel}</span>
            {!fromDropdown && <Caret open={open} />}
          </button>

          {fromDropdown && (
            <button
              type="button"
              disabled={disabled}
              aria-label={VENDOR_PICKER_COPY.clearLabel.replace(
                '{vendor}',
                triggerLabel,
              )}
              onClick={clear}
              className={chipClass(true, disabled, Boolean(error))}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeftWidth: 0,
                paddingLeft: 8,
                paddingRight: 10,
              }}
            >
              <ClearIcon />
            </button>
          )}

          {open && !isNarrow && (
            <div
              ref={popoverRef}
              role="group"
              aria-labelledby={popoverTitleId}
              style={{
                position: 'absolute',
                right: 0,
                ...(flipped
                  ? { bottom: `calc(100% + ${POPOVER_GAP_PX}px)` }
                  : { top: `calc(100% + ${POPOVER_GAP_PX}px)` }),
                zIndex: 20,
                width: 268,
                maxHeight: 380,
                overflowY: 'auto',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 12,
                padding: '12px 10px',
                boxShadow: '0 24px 60px -18px rgba(0, 0, 0, 0.65)',
              }}
            >
              <div
                id={popoverTitleId}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                  padding: '0 2px 10px',
                }}
              >
                {VENDOR_PICKER_COPY.popoverTitle}
              </div>
              {listbox(popoverTitleId)}
            </div>
          )}
        </div>
      </div>

      {error && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--warning)',
            marginTop: 2,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}
        >
          {error}
        </span>
      )}

      {/* Narrow surface: a sheet by shape, but deliberately NOT aria-modal.
          The field lives inside ModalShell, which is the single modal root —
          nesting a second modal dialog is the thing its own docs warn against.
          Focus is already trapped by the parent; Escape returns to the chip. */}
      {open && isNarrow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            onClick={close}
            style={{ flex: 1, background: 'rgba(0, 0, 0, 0.55)' }}
          />
          <div
            role="group"
            aria-labelledby={sheetTitleId}
            style={{
              background: 'var(--bg-elevated)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid var(--border-strong)',
              padding: '10px 16px 20px',
              maxHeight: '84%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -24px 60px -10px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-strong)',
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <div
              id={sheetTitleId}
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--fg)',
                letterSpacing: '-0.01em',
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: '1px solid var(--border)',
              }}
            >
              {VENDOR_PICKER_COPY.sheetTitle}
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: 2,
              }}
            >
              {listbox(sheetTitleId)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
