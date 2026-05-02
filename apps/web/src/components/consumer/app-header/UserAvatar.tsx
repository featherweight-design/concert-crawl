'use client'

import { useUser } from '@clerk/nextjs'

export function UserAvatar() {
  const { user } = useUser()

  let initials = '?'
  if (user) {
    const first = user.firstName?.charAt(0) ?? ''
    const last = user.lastName?.charAt(0) ?? ''
    if (first || last) {
      initials = (first + last).toUpperCase()
    } else {
      initials = (
        user.emailAddresses[0]?.emailAddress.charAt(0) ?? '?'
      ).toUpperCase()
    }
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2">
      <span className="text-[13px] font-bold text-fg-muted">{initials}</span>
    </div>
  )
}
