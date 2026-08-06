import { Shimmer, ShimmerKeyframes } from './CrewRowSkeleton'
import { InviteEyebrow, InviteShell } from './InviteShell'
import { CREWS_COPY } from './definitions/copy'

/**
 * Shape only. It renders neither the crew's name nor its patch: both would be
 * guesses before the token resolves, and a patch flashing the wrong identity
 * is worse than showing nothing at all.
 */
export const InviteLandingSkeleton = () => (
  <InviteShell>
    <ShimmerKeyframes />
    {/* A mobile/desktop pair rather than one scaled box: Shimmer carries its
        geometry in an inline style, which no class can override, and a
        skeleton that doesn't match the layout it resolves into is the jump it
        exists to prevent. */}
    <span className="sm:hidden">
      <Shimmer width={108} height={108} radius={30} />
    </span>
    <span className="hidden sm:block">
      <Shimmer width={132} height={132} radius={30} />
    </span>
    <span className="flex w-full max-w-[320px] flex-col items-center gap-[11px] sm:max-w-[520px]">
      <Shimmer width={110} height={10} />
      <span className="flex w-full flex-col items-center gap-[11px] sm:hidden">
        <Shimmer width="88%" height={24} />
        <Shimmer width="62%" height={24} />
      </span>
      <span className="hidden w-full flex-col items-center gap-[11px] sm:flex">
        <Shimmer width="88%" height={30} />
        <Shimmer width="62%" height={30} />
      </span>
      <Shimmer width={150} height={26} radius={99} />
    </span>
    <span className="sm:hidden">
      <Shimmer width={280} height={46} radius={10} />
    </span>
    <span className="hidden sm:block">
      <Shimmer width={340} height={46} radius={10} />
    </span>
    {/* Visible rather than sr-only: a live region that mounts with its text
        already in it is not reliably spoken, and this branch mounts loading. */}
    <span aria-live="polite">
      <InviteEyebrow tone="subtle">
        {CREWS_COPY.net.loadingInvite}
      </InviteEyebrow>
    </span>
  </InviteShell>
)
