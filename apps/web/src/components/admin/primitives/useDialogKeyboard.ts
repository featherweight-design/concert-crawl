'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

// `:not([disabled])` is load-bearing, not tidiness. A disabled button cannot
// take focus, so counting one as a trap member breaks the trap twice over:
// the opening `.focus()` silently no-ops, and a disabled element as the tail
// means the Tab-wrap comparison never matches and Tab leaves the dialog. Four
// callers disable BOTH footer buttons while pending, and BulkDeleteConfirm
// disables its confirm until the token is typed — the state it is in for most
// of its life.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, oldest first: only the newest handles Escape and Tab. */
const OPEN_DIALOGS: object[] = [];

export interface UseDialogKeyboardOptions {
  /**
   * False while the dialog is not on screen. Callers that render their panel
   * inline behind an `open` flag need this: an unconditional hook would keep
   * a document-level Escape listener attached whenever the component is
   * mounted, so Escape anywhere on the page would fire the dialog's dismiss.
   * Callers whose panel is its own component, mounted only when open, can
   * leave it alone.
   */
  enabled?: boolean;
  /**
   * When false, Escape is inert. Callers pass their pending flag here: a
   * dialog mid-request has already committed, so dismissing it would leave
   * the admin believing they cancelled something that is still running.
   * Focus containment stays on either way — the background is still inert.
   */
  dismissible?: boolean;
}

/**
 * Escape, focus containment and focus restore for a hand-rolled modal.
 *
 * `aria-modal="true"` is a claim that the background is inert. Without this
 * the claim is false: focus stays wherever it was when the dialog mounted,
 * Tab walks straight back out into the page behind it, and Escape does
 * nothing. Assistive technology is told one thing and the keyboard does
 * another.
 *
 * Split from AdminDialog so a modal that cannot use the shared chrome —
 * MergeEventDialog is a search-and-pick flow, not a confirmation — still gets
 * the behaviour rather than reimplementing it or going without.
 *
 * Focus lands on the first ENABLED focusable element, or on the panel itself
 * when a caller has disabled everything. Note that "first" is whatever the
 * caller renders first, and that is not always an inert control: a panel
 * that leads with a checkbox opens focus on a toggle. No current caller opens on its destructive confirm, which
 * matters because these dialogs guard irreversible work — but this hook
 * cannot enforce that, so it is a thing to re-check when reordering a panel.
 */
export const useDialogKeyboard = (
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  { dismissible = true, enabled = true }: UseDialogKeyboardOptions = {},
): void => {
  // Held in a ref so the effect does not depend on the callback's identity.
  // Callers routinely pass a plain function declaration or an inline arrow —
  // DeleteVenueConfirm's `handleClose` is redeclared every render — and with
  // `onDismiss` in the dep array the effect tore down and rebuilt on every
  // keystroke, blurring to the opener and refocusing the input each time.
  // That cancels IME composition mid-word.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  // Read through a ref too, so a busy flip doesn't re-run the effect: that
  // would restore focus to the opener and then refocus the panel's head.
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!enabled) return;
    const token = {};
    OPEN_DIALOGS.push(token);
    const previouslyFocused = document.activeElement;
    const focusable = (): HTMLElement[] =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );

    // A panel can name its field to open on (`data-autofocus`), so focus
    // lands where the typing happens rather than on ⋯ or ✕.
    const opening =
      panelRef.current?.querySelector<HTMLElement>(
        '[data-autofocus]:not([disabled])',
      ) ?? focusable()[0];
    if (opening) opening.focus();
    else if (panelRef.current) {
      // Everything is disabled — mid-request, usually. Focus the panel so it
      // never sits outside a dialog that still claims the page is inert.
      panelRef.current.tabIndex = -1;
      panelRef.current.focus();
    }

    const onKeyDown = (evt: KeyboardEvent) => {
      // A confirm opened over a panel owns the keyboard until it closes.
      if (OPEN_DIALOGS[OPEN_DIALOGS.length - 1] !== token) return;
      if (evt.key === 'Escape') {
        if (dismissibleRef.current) dismissRef.current();
        return;
      }
      if (evt.key !== 'Tab') return;
      const panel = panelRef.current;
      // Boundary wrapping alone is not containment: it only fires when focus
      // is already ON the head or tail. Focus can sit outside the panel —
      // returning from browser chrome, or anything that moves it
      // programmatically — and from there Tab walks into the page behind a
      // dialog still claiming it is inert. Pull it back in first.
      if (panel && !panel.contains(document.activeElement)) {
        evt.preventDefault();
        const entry = focusable()[0];
        if (entry) entry.focus();
        else {
          panel.tabIndex = -1;
          panel.focus();
        }
        return;
      }
      const items = focusable();
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) {
        // Nothing focusable left to cycle between; keep Tab inside anyway.
        evt.preventDefault();
        return;
      }
      if (evt.shiftKey && document.activeElement === head) {
        evt.preventDefault();
        tail.focus();
      } else if (!evt.shiftKey && document.activeElement === tail) {
        evt.preventDefault();
        head.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      OPEN_DIALOGS.splice(OPEN_DIALOGS.indexOf(token), 1);
      document.removeEventListener('keydown', onKeyDown);
      // Returning focus to the control that opened the dialog is the other
      // half of the contract: without it focus falls back to <body> and a
      // keyboard user restarts their traversal from the top of the page.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [panelRef, enabled]);

  // The background is inert to the pointer too: the shared, ref-counted page
  // scroll lock, held for exactly as long as the keyboard contract is. Every
  // admin modal (AdminDialog, AdminSheet, SidePanel and the hand-rolled
  // confirms) comes through here.
  useBodyScrollLock(enabled);
};
