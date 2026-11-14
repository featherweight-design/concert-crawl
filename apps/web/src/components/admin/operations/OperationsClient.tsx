'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FeedbackView,
  type FeedbackCounts,
} from '@/components/admin/feedback/FeedbackView';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminTabs, useIsPhoneResolved } from '@/components/admin/primitives';
import { ActivityLog } from './ActivityLog';
import { OPERATIONS_TABS, type OperationsTab } from './operations-tabs';

export { OPERATIONS_TABS, operationsTabOf } from './operations-tabs';
export type { OperationsTab } from './operations-tabs';

const COPY = ADMIN_COPY.operations;

const PANEL_ID = 'operations-panel';
const tabId = (key: OperationsTab) => `operations-tab-${key}`;

/** The tab's unread count: a bare number on screen, "4 unread" when read out. */
const UnreadCount = ({ count, phone }: { count: number; phone: boolean }) => (
  <>
    <span className="sr-only">{COPY.unreadCountLabel(count)}</span>
    <span
      aria-hidden
      data-testid="operations-feedback-unread"
      style={{
        fontSize: phone ? 11 : 12,
        color: 'var(--fg-subtle)',
        marginLeft: phone ? 5 : 6,
      }}
    >
      {count}
    </span>
  </>
);

/**
 * `07/activity-log`: Operations' title, subtitle and tabs over the Feedback
 * inbox or, at `?tab=log`, the Activity log. The inbox has no heading of its
 * own so the page has one h1. The Feedback tab's count is the inbox's own,
 * reported once it has loaded; until then (or at 0) the tab draws none.
 */
export const OperationsClient = ({
  initialTab = 'feedback',
}: {
  initialTab?: OperationsTab;
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<OperationsTab>(initialTab);
  const [feedbackUnread, setFeedbackUnread] = useState<number | null>(null);
  const handleFeedbackCounts = useCallback(
    ({ unread }: FeedbackCounts) => setFeedbackUnread(unread),
    [],
  );
  // Null until the media query is read: the chrome waits for it, so a phone
  // never paints the desktop title and underline tabs for a frame.
  const resolvedPhone = useIsPhoneResolved();
  const isPhone = resolvedPhone === true;

  // A link to `?tab=` while the page is mounted changes the prop, not the mount.
  useEffect(() => setTab(initialTab), [initialTab]);

  const onTab = (next: OperationsTab) => {
    setTab(next);
    router.replace(
      next === 'feedback'
        ? '/admin/operations'
        : `/admin/operations?tab=${next}`,
    );
  };

  const tabs = OPERATIONS_TABS.map((key) => ({
    key,
    label: (
      <>
        {isPhone ? COPY.phoneTabs[key] : COPY.tabs[key]}
        {key === 'feedback' &&
          feedbackUnread !== null &&
          feedbackUnread > 0 && (
            <UnreadCount count={feedbackUnread} phone={isPhone} />
          )}
      </>
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* The phone header carries the title, and the tab as its subtitle. */}
      {resolvedPhone === false && (
        <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-muted)' }}>
            {COPY.subtitle}
          </p>
        </header>
      )}
      {resolvedPhone !== null && (
        <AdminTabs
          tabs={tabs}
          value={tab}
          onChange={onTab}
          label={COPY.tabsLabel}
          tabId={tabId}
          panelId={() => PANEL_ID}
          variant={isPhone ? 'segments' : 'underline'}
          phone={isPhone}
          gap={4}
          testId="operations-tabs"
        />
      )}
      <div
        id={PANEL_ID}
        // A tabpanel only once the tab that labels it is drawn.
        role={resolvedPhone === null ? undefined : 'tabpanel'}
        aria-labelledby={resolvedPhone === null ? undefined : tabId(tab)}
      >
        {tab === 'feedback' ? (
          <FeedbackView onCounts={handleFeedbackCounts} />
        ) : (
          // The log's rows and cards differ by viewport, so it waits too.
          resolvedPhone !== null && <ActivityLog isPhone={isPhone} />
        )}
      </div>
    </div>
  );
};
