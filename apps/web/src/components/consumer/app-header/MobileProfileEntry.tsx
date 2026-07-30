'use client'

import { useRef } from 'react'
import { Avatar } from '@/components/settings/Avatar'
import { useAccountMenu } from '@/components/consumer/user-menu/account-menu-context'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { AnonDisc } from './AnonDisc'

/**
 * The mobile header's account entry. Signed in it shows the avatar, signed out
 * the anonymous disc — same trigger, same position, same behavior; only the
 * accessible name and the glyph change.
 */
export function MobileProfileEntry() {
  const {
    open,
    isSignedIn,
    avatarHandle,
    avatarColor,
    avatarLoaded,
    toggleFrom,
  } = useAccountMenu()
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <button
      ref={triggerRef}
      type="button"
      data-testid="mobile-profile-entry"
      onClick={() => toggleFrom(triggerRef.current)}
      aria-label={
        isSignedIn
          ? CONSUMER_COPY.userMenu.ariaLabels.accountMenu
          : CONSUMER_COPY.userMenu.ariaLabels.accountMenuSignedOut
      }
      aria-expanded={open}
      aria-haspopup="dialog"
      className="flex shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      {isSignedIn ? (
        <Avatar
          handle={avatarHandle}
          avatarColor={avatarColor}
          size={36}
          loading={!avatarLoaded}
        />
      ) : (
        <AnonDisc size={36} />
      )}
    </button>
  )
}
