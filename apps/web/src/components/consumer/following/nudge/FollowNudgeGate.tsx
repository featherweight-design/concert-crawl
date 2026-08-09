'use client'

// The floating placement of the first-watch follow nudge (native following,
// PR 10). Mounted once at the (protected) layout, so a watch started from the
// browse hero card or an artist-page row still gets the introduction.
//
// ⚠️ It stands down on both event-detail routes. Those screens replace their
// watch strip with the same card in place (see WatchZone), and a gate that
// also fired there would put two cards on one screen for one watch. This
// exclusion is the ONLY thing keeping the two consumers of
// `useFirstWatchNudge` mutually exclusive.
//
// scaRegion is not resolvable here: the layout is static, and reading
// `headers()` to get the country would make every protected route dynamic for
// the sake of one legal line in a sheet almost nobody opens from this card.
// `true` is the fail-safe value (the same call FollowButton makes for its
// logged-out picker) — it shows the SCA disclosure to some viewers who did not
// need it, rather than withholding it from one who did.

import { usePathname } from 'next/navigation'

import { FollowNudgeCard } from './FollowNudgeCard'
import { useFirstWatchNudge } from './lib/use-first-watch-nudge'

// `/events/<id>` and `/e/<id>`, but not the `/events` index itself, which is
// browse and is exactly where this card is meant to float.
const isEventDetail = (pathname: string): boolean =>
  /^\/(events|e)\/[^/]+/.test(pathname)

export const FollowNudgeGate = () => {
  const pathname = usePathname()
  const stoodDown = pathname.startsWith('/admin') || isEventDetail(pathname)
  // Unscoped: any watch, from any control, on any route this gate serves.
  // `enabled` rather than a render guard, so a watch taken on event detail is
  // never held here and then floated after a navigation.
  const nudge = useFirstWatchNudge(undefined, !stoodDown)

  if (stoodDown) return null
  if (nudge.target === null) return null

  return (
    <FollowNudgeCard
      target={nudge.target}
      variant="floating"
      scaRegion
      onAnswer={nudge.answer}
    />
  )
}
