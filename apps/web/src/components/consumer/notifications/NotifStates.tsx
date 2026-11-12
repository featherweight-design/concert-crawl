// The panel's three non-list states (#737, restyled for B+ in B19): loading,
// empty, error.
//
// LOADING is a skeleton that holds a real row's shape (README rule 9) under a
// "Catching up…" divider (`06-states/bp-s-notif_load_m`), and the rows fade
// down the panel the way the board draws them. The sweep is the app's one
// skeleton sweep (`SkeletonBlock`), static under reduced motion. The spoken
// form is one visually-hidden sentence inside a single role="status"/aria-busy
// region, not one per skeleton.
//
// EMPTY and ERROR are the B+ state card (`bp-s-notif_empty_m`,
// `bp-s-notif_error_m`). Both actions render only when their handler is wired:
// the props are optional, so an unwired caller would otherwise draw a
// live-looking control that does nothing, and an inert Retry is a worse error
// state than one that only explains itself. Same rule as NotifHeader's
// controls. The card's action is 44px tall as drawn, so it needs no
// `.notif-hit44` overlay.

import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { StateCard } from '@/components/consumer/empty-state/StateCard';
import { NOTIFICATIONS_COPY } from './definitions/copy';
import { NotifDayDivider } from './NotifDayDivider';
import { NotifGlyph } from './glyphs';
import type { NotificationTab } from './definitions/categories';

/** Each skeleton row fades a step further, so the list trails off. */
const ROW_FADE = 0.16;

export const NotifSkeletonRow = ({
  opacity = 1,
}: {
  opacity?: number | undefined;
}) => (
  <div
    aria-hidden="true"
    style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '14px 16px 14px 14px',
      minHeight: 64,
      borderLeft: '2px solid transparent',
      borderBottom: '1px solid var(--border)',
      opacity,
    }}
  >
    <SkeletonBlock width={30} height={30} radius={10} />
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <SkeletonBlock width="66%" height={12} radius={6} />
      <SkeletonBlock width="86%" height={10} radius={5} />
      <SkeletonBlock width={60} height={8} radius={4} />
    </div>
  </div>
);

export const NotifLoading = ({ rows = 5 }: { rows?: number | undefined }) => (
  <div role="status" aria-busy="true" aria-live="polite">
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
      }}
    >
      {NOTIFICATIONS_COPY.loading}
    </span>
    {/* The hidden sentence above is the spoken form; the visible divider is
        decoration, so it is hidden from assistive tech rather than read as a
        second loading message. */}
    <div aria-hidden="true">
      <NotifDayDivider label={NOTIFICATIONS_COPY.loadingVisible} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <NotifSkeletonRow key={i} opacity={Math.max(0.2, 1 - i * ROW_FADE)} />
    ))}
  </div>
);

export const NotifEmpty = ({
  onAction,
}: {
  onAction?: (() => void) | undefined;
}) => (
  <div style={{ padding: '16px 16px 24px' }}>
    <StateCard
      icon={<NotifGlyph name="bell" size={24} />}
      eyebrow={NOTIFICATIONS_COPY.emptyEyebrow}
      title={NOTIFICATIONS_COPY.emptyTitle}
      body={NOTIFICATIONS_COPY.emptyBody}
      action={
        onAction === undefined
          ? undefined
          : { label: NOTIFICATIONS_COPY.emptyAction, onClick: onAction }
      }
    />
  </div>
);

/** One tab with nothing in it (B19a `notif-tab-empty-m`): ring, tab eyebrow, one line. */
export const NotifTabEmpty = ({ tab }: { tab: NotificationTab }) => (
  <div style={{ padding: '16px 16px 24px' }}>
    <StateCard
      icon={<NotifGlyph name="bell" size={24} />}
      eyebrow={NOTIFICATIONS_COPY.segments[tab]}
      title={NOTIFICATIONS_COPY.tabEmpty[tab]}
    />
  </div>
);

export const NotifError = ({
  onRetry,
}: {
  onRetry?: (() => void) | undefined;
}) => (
  <div style={{ padding: '16px 16px 24px' }}>
    <StateCard
      role="alert"
      tone="danger"
      framed={false}
      icon={<NotifGlyph name="bell" size={24} />}
      eyebrow={NOTIFICATIONS_COPY.errorEyebrow}
      title={NOTIFICATIONS_COPY.error}
      body={NOTIFICATIONS_COPY.errorBody}
      action={
        onRetry === undefined
          ? undefined
          : { label: NOTIFICATIONS_COPY.errorAction, onClick: onRetry }
      }
    />
  </div>
);
