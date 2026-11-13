import {
  Eye,
  EyeOff,
  Info,
  Pause,
  Play,
  Sparkle,
  Trash2,
  X,
} from 'lucide-react';
import type {
  VenueDeleteBlockers,
  VenueWithCrawlHealth,
} from '@concert-crawl/types';
import type { RowMenuItem } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AUTO_PAUSE_FAILURES } from '@/lib/admin/venue-status';
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time';
import { pausedStateLine } from './pause-rules';
import { deleteRefused } from './delete-rules';

const COPY = ADMIN_COPY.venueHeader;

const shortDate = (iso: string): string =>
  formatISODate(iso, DENVER_TIME_ZONE, { month: 'short', day: 'numeric' });

/**
 * The ⋯ menu's drawn states (`A3/03/venue-menu-states`), plus `removed`: a
 * venue taken down at its request (`removedAt`), which has no board. Flagship
 * isn't a state of its own: it only swaps Make flagship for Remove flagship.
 * A blocked venue shares the auto-paused menu only while its crawl is paused,
 * since Resume clears the pause and nothing else.
 */
export type VenueMenuState =
  'crawling' | 'paused' | 'autoPaused' | 'hidden' | 'removed';

const isAutoPaused = (venue: VenueWithCrawlHealth): boolean =>
  venue.blockedAt !== null ||
  // As `pausedStateLine`: an auto-pause is a reasonless pause at 3 failures.
  ((venue.crawlPauseReason ?? null) === null &&
    venue.consecutiveFailures >= AUTO_PAUSE_FAILURES);

export const venueMenuState = (venue: VenueWithCrawlHealth): VenueMenuState => {
  // Taken down wins over everything: `removedAt` is set with `active` false.
  if (venue.removedAt !== null) return 'removed';
  if (!venue.active) return 'hidden';
  if (venue.crawlPausedAt === null) return 'crawling';
  return isAutoPaused(venue) ? 'autoPaused' : 'paused';
};

/** "Hidden by @hugh, Nov 2: venue closed." Null while the venue is live. */
export const hiddenStateLine = (venue: VenueWithCrawlHealth): string | null => {
  if (venue.removedAt !== null)
    return COPY.takenDown(shortDate(venue.removedAt));
  if (venue.active) return null;
  const hiddenAt = venue.hiddenAt ?? null;
  if (hiddenAt === null) return COPY.hiddenNoRecord;
  const date = shortDate(hiddenAt);
  const reason = venue.hiddenReason ?? null;
  const why =
    reason === 'other'
      ? venue.hiddenNote?.trim().replace(/\.+$/, '') || null
      : reason === null
        ? null
        : COPY.hiddenReasons[reason];
  const name = venue.hiddenByName ?? null;
  return name === null
    ? COPY.hiddenSince(date, why)
    : COPY.hiddenBy(name, date, why);
};

export interface VenueMenuActions {
  pause: () => void;
  resume: () => void;
  flagship: () => void;
  hide: () => void;
  takeDown: () => void;
  show: () => void;
  remove: () => void;
}

/**
 * The header ⋯ per state. Delete is offered only on a hidden or taken-down
 * venue; when the guard would refuse it, the row stays, disabled, and says why
 * (`A3/03/delete-refused`). `refused` is a 409's counts, which win over the
 * page's own until it reloads. `busy` holds the rows that run at once while
 * one of them is in flight, so a second press can't send a second request.
 */
export const venueMenuItems = (
  venue: VenueWithCrawlHealth,
  act: VenueMenuActions,
  refused: VenueDeleteBlockers | null = null,
  busy = false,
): RowMenuItem[] => {
  const state = venueMenuState(venue);
  const takeDown: RowMenuItem = {
    key: 'take-down',
    icon: X,
    label: COPY.menu.takeDown,
    hint: COPY.menu.takeDownHint,
    danger: true,
    onSelect: act.takeDown,
  };
  // Pausing never touches `active`, so a hidden venue keeps its crawl row,
  // as the old danger zone did.
  const crawl: RowMenuItem =
    venue.crawlPausedAt === null
      ? {
          key: 'pause',
          icon: Pause,
          label: COPY.menu.pause,
          hint: COPY.menu.pauseHint,
          onSelect: act.pause,
        }
      : {
          key: 'resume',
          icon: Play,
          label: COPY.menu.resume,
          hint: pausedStateLine(venue) ?? '',
          disabled: busy,
          onSelect: act.resume,
        };

  if (state === 'hidden' || state === 'removed') {
    const blockers = refused ?? venue.deleteBlockers;
    const remove: RowMenuItem = deleteRefused(blockers)
      ? {
          key: 'delete',
          icon: Trash2,
          label: COPY.menu.deleteRefusedLabel,
          hint: ADMIN_COPY.venueConfirms.deleteRefused(
            blockers.pastShows,
            blockers.upcomingShows,
            blockers.watchers,
          ),
          danger: true,
          disabled: true,
          divided: true,
          onSelect: act.remove,
        }
      : {
          key: 'delete',
          icon: Trash2,
          label: COPY.menu.delete,
          hint: COPY.menu.deleteHint,
          danger: true,
          divided: true,
          onSelect: act.remove,
        };
    const line = hiddenStateLine(venue) ?? '';
    // Taken down at the venue's request: the menu offers no Show, Resume,
    // crawl row or second Take down, only the line saying so and Delete.
    return state === 'removed'
      ? [
          {
            key: 'taken-down',
            icon: Info,
            label: line,
            hint: COPY.takenDownRestore,
            muted: true,
            disabled: true,
            onSelect: () => undefined,
          },
          remove,
        ]
      : [
          {
            key: 'show',
            icon: Eye,
            label: COPY.menu.show,
            hint: line,
            disabled: busy,
            onSelect: act.show,
          },
          crawl,
          remove,
          takeDown,
        ];
  }

  return [
    crawl,
    {
      key: 'flagship',
      icon: Sparkle,
      label: venue.featured ? COPY.menu.removeFlagship : COPY.menu.makeFlagship,
      hint: venue.featured
        ? COPY.menu.removeFlagshipHint
        : COPY.menu.makeFlagshipHint,
      disabled: busy,
      onSelect: act.flagship,
    },
    {
      key: 'hide',
      icon: EyeOff,
      label: COPY.menu.hide,
      hint: COPY.menu.hideHint(
        state === 'autoPaused'
          ? null
          : (venue.deleteBlockers?.upcomingShows ?? null),
      ),
      warning: true,
      divided: true,
      onSelect: act.hide,
    },
    takeDown,
  ];
};
