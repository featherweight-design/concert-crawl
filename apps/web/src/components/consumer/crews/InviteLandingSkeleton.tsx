import { Shimmer, ShimmerKeyframes } from './CrewRowSkeleton';
import {
  INVITE_MARK_SIZE,
  InviteCard,
  InviteEyebrow,
  InviteShell,
} from './InviteShell';
import { CREWS_COPY } from './definitions/copy';

/**
 * Shape only. It renders neither the crew's name nor its patch: both would be
 * guesses before the token resolves, and a patch flashing the wrong identity
 * is worse than showing nothing at all. It holds the open invite's full stack
 * (eyebrow, two-line title, count, two-line body, privacy note, Join), the
 * tallest state the landing resolves into, so the card never grows on resolve.
 */
export const InviteLandingSkeleton = () => (
  <InviteShell>
    <ShimmerKeyframes />
    <InviteCard
      mark={
        <Shimmer
          width={INVITE_MARK_SIZE}
          height={INVITE_MARK_SIZE}
          radius={27}
        />
      }
    >
      <span className="flex w-full flex-col items-center gap-[11px]">
        <Shimmer width={110} height={10} />
        <Shimmer width="88%" height={28} />
        <Shimmer width="62%" height={28} />
        <Shimmer width={80} height={10} />
        <Shimmer width="84%" height={14} />
        <Shimmer width="58%" height={14} />
      </span>
      <span
        className="flex w-full flex-col items-center gap-2"
        style={{
          padding: '12px 14px',
          borderRadius: 14,
          border: '1px dashed var(--border-strong)',
        }}
      >
        <Shimmer width="90%" height={12} />
        <Shimmer width="66%" height={12} />
      </span>
      <Shimmer width="100%" height={52} radius={16} />
    </InviteCard>
    {/* Visible rather than sr-only: a live region that mounts with its text
        already in it is not reliably spoken, and this branch mounts loading. */}
    <span aria-live="polite">
      <InviteEyebrow tone="subtle">
        {CREWS_COPY.net.loadingInvite}
      </InviteEyebrow>
    </span>
  </InviteShell>
);
