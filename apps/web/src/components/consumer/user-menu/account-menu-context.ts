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
   * disagree about whether the pip is up. Always 0 when signed out: an
   * anonymous visitor has no notifications and must never see a pip.
   */
  unreadCount: number
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
  openFrom: () => {},
  toggleFrom: () => {},
  close: () => {},
}

export const AccountMenuContext = createContext<AccountMenuState>(INERT)

export function useAccountMenu(): AccountMenuState {
  return useContext(AccountMenuContext)
}
