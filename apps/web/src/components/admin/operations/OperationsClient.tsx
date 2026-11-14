'use client';

import FeedbackPage from '@/app/(protected)/admin/feedback/page';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminTabs, useIsPhone } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.operations;

/** The Activity log and Emails join Feedback once their tabs are built. */
export const OPERATIONS_TABS = ['feedback'] as const;
export type OperationsTab = (typeof OPERATIONS_TABS)[number];

/**
 * `07/activity-log`: Operations' title, subtitle and tabs. Feedback is the
 * existing feedback page, unchanged.
 */
export const OperationsClient = ({
  feedbackUnread,
}: {
  /** The Feedback tab's count; null (or 0) draws none. */
  feedbackUnread: number | null;
}) => {
  const isPhone = useIsPhone();
  const tab: OperationsTab = 'feedback';

  const tabs = OPERATIONS_TABS.map((key) => ({
    key,
    label: (
      <>
        {COPY.tabs[key]}
        {feedbackUnread !== null && feedbackUnread > 0 && (
          <span
            style={{
              fontSize: isPhone ? 11 : 12,
              color: 'var(--fg-subtle)',
              marginLeft: isPhone ? 5 : 6,
            }}
          >
            {feedbackUnread}
          </span>
        )}
      </>
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* The phone header carries the title, and the tab as its subtitle. */}
      {!isPhone && (
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
      <AdminTabs
        tabs={tabs}
        value={tab}
        onChange={() => undefined}
        label={COPY.tabsLabel}
        tabId={(key) => `operations-tab-${key}`}
        panelId={() => 'operations-panel'}
        variant={isPhone ? 'segments' : 'underline'}
        phone={isPhone}
        gap={4}
        testId="operations-tabs"
      />
      <div
        id="operations-panel"
        role="tabpanel"
        aria-labelledby={`operations-tab-${tab}`}
      >
        <FeedbackPage />
      </div>
    </div>
  );
};
