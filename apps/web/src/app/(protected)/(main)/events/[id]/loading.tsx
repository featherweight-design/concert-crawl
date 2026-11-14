// The event page while it loads (B+ rule 9, boards bp-s-load_event_m and _d).
// The stage keeps its real geometry, its back control and a quiet wash, so the
// page holds its shape when the data lands; only the data is a skeleton. Every
// block carries the one shared sweep, which holds still under reduced motion.
import { BackChip } from '@/components/consumer/back-chip/BackChip';
import {
  STAGE_CARD_RADIUS,
  STAGE_CARD_TILT,
  StageBackdrop,
  StageShell,
} from '@/components/consumer/event-stage';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

export default function EventDetailLoading() {
  return (
    <div
      data-testid="event-detail-skeleton"
      className="flex flex-1 flex-col overflow-x-clip"
    >
      <StageShell
        backdrop={<StageBackdrop />}
        back={<BackChip inline fallbackHref="/events" />}
        card={
          <div
            style={{
              transform: `rotate(${STAGE_CARD_TILT}deg)`,
              borderRadius: STAGE_CARD_RADIUS,
              boxShadow: '0 0 0 1px var(--border-strong)',
              aspectRatio: '4 / 5',
              overflow: 'hidden',
            }}
          >
            <SkeletonBlock height="100%" radius={STAGE_CARD_RADIUS} />
          </div>
        }
        // The countdown slot, so it takes the loaded pill's `-mt-7` overlap
        // of the card's foot on mobile.
        eyebrow={<SkeletonBlock width={120} height={24} radius={999} />}
      >
        {/* The name, its genre chips, then the date and venue line, in the
            loaded column's order and spacing (EventStage). The name is one
            line of the stage headline: `--stage-head` at the title block's
            1.12 line height. */}
        <span
          data-testid="stage-skeleton-title"
          className="block w-[min(230px,70%)] sm:w-full sm:max-w-[460px]"
        >
          <SkeletonBlock height="calc(var(--stage-head) * 1.12)" radius={10} />
        </span>
        <span data-testid="stage-skeleton-genres" className="mt-3 block">
          <SkeletonBlock width={128} height={20} radius={5} />
        </span>
        <span
          data-testid="stage-skeleton-meta"
          className="mt-3 block w-[140px] sm:w-[180px]"
        >
          <SkeletonBlock height={16} />
        </span>
      </StageShell>

      <div className="flex-1">
        <div className="mx-auto box-border w-full max-w-[824px] px-[18px] pb-24 pt-5 lg:px-8 lg:pb-16">
          {/* The Your move card. */}
          <div
            className="mt-3 flex flex-col gap-3 rounded-[14px] p-4"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
            }}
          >
            <SkeletonBlock width={60} height={9} />
            <SkeletonBlock width={110} height={30} radius={8} />
            <span className="block w-[65%]">
              <SkeletonBlock height={10} />
            </span>
          </div>
          {/* The bill block below it. */}
          <div className="mt-3">
            <SkeletonBlock height={50} radius={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
