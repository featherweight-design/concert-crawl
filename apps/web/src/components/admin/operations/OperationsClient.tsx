'use client';

import { FeedbackView } from '@/components/admin/feedback/FeedbackView';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminTabs, useIsPhoneResolved } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.operations;

/** The Activity log and Emails join Feedback once their tabs are built. */
export const OPERATIONS_TABS = ['feedback'] as const;
export type OperationsTab = (typeof OPERATIONS_TABS)[number];

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
 * inbox, which drops its own heading here so the page has one h1.
 */
export const OperationsClient = ({
  feedbackUnread,
}: {
  /** The Feedback tab's count; null (or 0) draws none. */
  feedbackUnread: number | null;
}) => {
  // Null until the media query is read: the chrome waits for it, so a phone
  // never paints the desktop title and underline tabs for a frame.
  const resolvedPhone = useIsPhoneResolved();
  const isPhone = resolvedPhone === true;
  const tab: OperationsTab = 'feedback';

  const tabs = OPERATIONS_TABS.map((key) => ({
    key,
    label: (
      <>
        {COPY.tabs[key]}
        {feedbackUnread !== null && feedbackUnread > 0 && (
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
          onChange={() => undefined}
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
        <FeedbackView embedded />
      </div>
    </div>
  );
};
