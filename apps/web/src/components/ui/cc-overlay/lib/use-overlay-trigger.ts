'use client'

// Open/close state shared by every overlay trigger.
//
//   hover in     → open (unpinned) after a short intent delay
//   hover out    → close ONLY if unpinned
//   click        → toggle pinned; a pinned panel survives mouse-out
//   focus        → open (unpinned)
//   blur past it → close if unpinned
//   Escape       → close, unpin, return focus to the trigger
//
// Mobile has no hover, so tap is the only transition there.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from 'react'

const HOVER_IN_MS = 110
const HOVER_OUT_MS = 140

interface OverlayTrigger {
  open: boolean
  pinned: boolean
  // A callback ref rather than a RefObject: the popover is portalled and has to
  // measure this element, and a ref assignment alone would not re-render the
  // panel that needs it. Matters for defaultOpen, where the panel's first
  // render is also the trigger's.
  triggerRef: (node: HTMLButtonElement | null) => void
  triggerNode: HTMLButtonElement | null
  close: () => void
  toggle: () => void
  hoverIn: () => void
  hoverOut: () => void
  onFocus: () => void
  onBlur: (ev: FocusEvent<HTMLElement>) => void
}

export const useOverlayTrigger = ({
  isMobile,
  defaultOpen = false,
}: {
  isMobile: boolean
  defaultOpen?: boolean
}): OverlayTrigger => {
  const [open, setOpen] = useState(defaultOpen)
  const [pinned, setPinnedState] = useState(defaultOpen)
  // Mirrored in a ref because the deferred hover-out timer has to read the
  // value as of when it fires, not the one captured when it was scheduled.
  const pinnedRef = useRef(defaultOpen)
  const setPinned = useCallback((next: boolean) => {
    pinnedRef.current = next
    setPinnedState(next)
  }, [])
  const [triggerNode, setTriggerNode] = useState<HTMLButtonElement | null>(null)
  const triggerEl = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerEl.current = node
    setTriggerNode(node)
  }, [])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Escape returns focus to the trigger, and on desktop focus opens the panel.
  // Without this latch the dismissal immediately re-opens what it just closed.
  const suppressFocusOpen = useRef(false)

  // Every transition clears the pending hover timer FIRST. Without it a
  // hover-out immediately followed by a click fires the stale close ~140ms
  // later and shuts the panel the click just pinned.
  const clearPending = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clearPending, [clearPending])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      clearPending()
      setOpen(false)
      setPinned(false)
      suppressFocusOpen.current = true
      triggerEl.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, clearPending, setPinned])

  // Explicit dismissal: the header's close button and the scrim, both of which
  // unmount the element holding focus. Returning it to the trigger is the same
  // contract Escape has, and it is safe to share because hover-out never routes
  // through here — it has its own timer path and must not steal focus.
  const close = useCallback(() => {
    clearPending()
    setOpen(false)
    setPinned(false)
    suppressFocusOpen.current = true
    triggerEl.current?.focus()
  }, [clearPending, setPinned])

  // Tap and click land on the same transition: a tapped sheet is pinned by
  // definition, since mobile has no hover to unpin it.
  const toggle = useCallback(() => {
    clearPending()
    const next = !pinnedRef.current
    setPinned(next)
    setOpen(next)
  }, [clearPending, setPinned])

  const hoverIn = useCallback(() => {
    if (isMobile) return
    clearPending()
    timer.current = setTimeout(() => setOpen(true), HOVER_IN_MS)
  }, [clearPending, isMobile])

  const hoverOut = useCallback(() => {
    if (isMobile) return
    clearPending()
    timer.current = setTimeout(() => {
      // Reads the live pinned value: a click between hover-out and this firing
      // pins the panel, and a pinned panel survives the mouse leaving.
      if (!pinnedRef.current) setOpen(false)
    }, HOVER_OUT_MS)
  }, [clearPending, isMobile])

  const onFocus = useCallback(() => {
    if (isMobile) return
    if (suppressFocusOpen.current) {
      suppressFocusOpen.current = false
      return
    }
    clearPending()
    setOpen(true)
  }, [clearPending, isMobile])

  const onBlur = useCallback(
    (ev: FocusEvent<HTMLElement>) => {
      if (isMobile || pinned) return
      if (ev.currentTarget.contains(ev.relatedTarget)) return
      clearPending()
      setOpen(false)
    },
    [clearPending, isMobile, pinned],
  )

  return {
    open,
    pinned,
    triggerRef,
    triggerNode,
    close,
    toggle,
    hoverIn,
    hoverOut,
    onFocus,
    onBlur,
  }
}
