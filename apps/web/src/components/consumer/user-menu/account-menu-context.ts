'use client'

import { createContext, useContext } from 'react'
import type { AvatarColor } from '@concert-crawl/types'

export interface AccountMenuState {
  open: boolean
  isSignedIn: boolean
  avatarHandle: string | null
  avatarColor: AvatarColor | null
  avatarLoaded: boolean
  /**
   * #737 — unread notifications, distributed from ONE query subscription in
   * the provider so the desktop trigger and bottom-nav slot 4 can never
   * disagree. This is the number the triggers ANNOUNCE — what is still waiting
   * inside the panel. Always 0 when signed out.
   */
  unreadCount: number
  /**
   * #737 — unread AND newer than the last panel open. This, not `unreadCount`,
   * is what DRAWS the pip: the dot means "something arrived since you last
   * looked", so opening the panel clears it while the unread rails survive.
   * Always 0 when signed out — an anonymous visitor must never see a pip.
   */
  unseenCount: number
  /** Opens the menu and records the trigger so focus can return to it. */
  openFrom: (trigger: HTMLElement | null) => void
  toggleFrom: (trigger: HTMLElement | null) => void
  close: () => void
}

// An inert default rather than a throw: the header disc and bottom-nav slot 4
// are rendered on their own in unit tests, where no provider sits above them.
// They still need to render, so an absent provider degrades to a menu that
// never opens.
const INERT: AccountMenuState = {
  open: false,
  isSignedIn: false,
  avatarHandle: null,
  avatarColor: null,
  avatarLoaded: true,
  unreadCount: 0,
  unseenCount: 0,
  openFrom: () => {},
  toggleFrom: () => {},
  close: () => {},
}

export const AccountMenuContext = createContext<AccountMenuState>(INERT)

export function useAccountMenu(): AccountMenuState {
  return useContext(AccountMenuContext)
}
