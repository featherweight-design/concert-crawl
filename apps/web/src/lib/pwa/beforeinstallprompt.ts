// The beforeinstallprompt event is not in the DOM lib. Declare it via
// interface merging rather than casting.
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt: () => Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ Safari reports a "Macintosh" UA but, unlike a real Mac, exposes
  // multi-touch — the canonical way to tell an iPad apart from a desktop Mac.
  const isIpadOs = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  const isIos = /iPad|iPhone|iPod/.test(ua) || isIpadOs
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isSafari
}

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false
  // iOS Safari exposes standalone via navigator.standalone (no display-mode support
  // on older versions); check both so the install hint hides once installed.
  // Annotate (not cast) to reach the non-standard prop without an `as`.
  const nav: Navigator & { standalone?: boolean } = window.navigator
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}
