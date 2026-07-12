import { useEffect } from 'react'

// Failure/challenge surfaces need Escape to dismiss back to the picker —
// NOT close the whole sheet. ModalShell listens for Escape on the document
// in the bubble phase; a capture-phase listener runs first, and
// stopPropagation() there prevents the document bubble listener from
// firing at all. (a11y table: "Escape dismisses to the picker".)
export const useEscapeCapture = (
  active: boolean,
  onEscape: () => void,
): void => {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return
      keyEvent.stopPropagation()
      keyEvent.preventDefault()
      onEscape()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [active, onEscape])
}
