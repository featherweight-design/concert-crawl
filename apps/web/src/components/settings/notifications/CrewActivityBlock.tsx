'use client';

// Settings ▸ Notifications ▸ Crew activity (#1226 PR-7).
//
// One switch per crew. Mounted OUTSIDE the push master switch on purpose:
// crew activity is bell-only — the three `crew.*` categories are absent from
// PUSH_ELIGIBLE_CATEGORIES and can never become a push — so gating these rows
// on push would hide the only control for a channel push does not carry.
//
// THE SWITCH IS "AM I GETTING THIS", NOT "AM I MUTED". Checked means unmuted,
// which is the default. A switch labelled with a negative reads backwards to
// everyone, and the mute is stored as row-presence anyway (there is no muted
// boolean to mirror).

import { ToggleSwitch } from '../connections/ToggleSwitch';
import { useCrews, useCrewMuteToggle } from '@/lib/queries/use-crew-mutes';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { NOTIFICATIONS_COPY } from './definitions/copy';
import {
  GroupHeading,
  ROW_CARD,
  ROW_DETAIL,
  ROW_LABEL,
} from './NotificationRow';

const COPY = NOTIFICATIONS_COPY.crew;

export const CrewActivityBlock = () => {
  const { enabled: crewsEnabled } = useFeatureFlag('crews');
  const { data: crews, isLoading, isError } = useCrews();
  const toggle = useCrewMuteToggle();

  // Deliberately NOT role="alert": the push half of this section already owns
  // the section's one alert, and two live regions announcing at once on a
  // settings page is noise, not information.
  const body = isError ? (
    <p className={ROW_DETAIL}>{COPY.loadError}</p>
  ) : isLoading ? (
    <div className="h-10 rounded-2xl bg-surface-1" />
  ) : crews === undefined || crews.length === 0 ? (
    <p className={ROW_DETAIL}>{COPY.empty}</p>
  ) : (
    <div className="flex flex-col gap-2">
      {crews.map((crew) => {
        const audible = !crew.muted;
        return (
          <div key={crew.id} className={ROW_CARD}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`${ROW_LABEL} truncate`}>{crew.name}</span>
              <span className={ROW_DETAIL}>{audible ? COPY.on : COPY.off}</span>
            </div>
            <ToggleSwitch
              checked={audible}
              // `next` is "keep hearing it", so the mute is its inverse.
              onChange={(next) =>
                toggle.mutate({ crewId: crew.id, muted: !next })
              }
              ariaLabel={COPY.rowLabel(crew.name)}
              disabled={toggle.isPending}
            />
          </div>
        );
      })}
    </div>
  );

  // Gated here rather than at the three mount sites in NotificationsSection,
  // which render it from separate error, loading and settled branches.
  if (!crewsEnabled) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <GroupHeading text={COPY.heading} />
      <p className="text-[14px] leading-snug text-fg-muted">{COPY.detail}</p>
      {body}
    </div>
  );
};
