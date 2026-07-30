'use client'

import { createContext, useContext } from 'react'
import type { AvatarColor } from '@concert-crawl/types'

export interface AccountMenuState {
  open: boolean
  isSignedIn: boolean
  avatarHandle: string | null
  avatarColor: AvatarColor | null
  avatarLoaded: boolean
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
  openFrom: () => {},
  toggleFrom: () => {},
  close: () => {},
}

export const AccountMenuContext = createContext<AccountMenuState>(INERT)

export function useAccountMenu(): AccountMenuState {
  return useContext(AccountMenuContext)
}
