// The panel header (#737). Ported from notifications-panel.jsx.
//
// The subtitle is the state readout: "3 new" in --signal while there is
// anything to read, "All caught up." in --fg-muted once there isn't. Mark all
// read disappears at zero rather than sitting disabled — a dead control is
// worse than no control.
//
// That same rule is why every control here is also gated on its handler being
// present, not just on its state: each prop is optional, so a caller that
// forgets to wire one would otherwise ship a button that looks live and does
// nothing. Every button in this panel follows this — see NotifStates and the
// load-more in NotifBody.
//
// The close button is 44×44 already. "Mark all read" is a text link as B+
// draws it (~30px); `.notif-hit44` gives it the 44px hit area without
// redrawing it.

import { NOTIFICATIONS_COPY } from './definitions/copy';
import { NMono } from './NMono';
import {
  NOTIFICATION_TABS,
  type NotificationTab,
} from './definitions/categories';

/** DOM id of a tab's button; the list region points back at it. */
export const notifTabId = (tab: NotificationTab): string => `notif-tab-${tab}`;
export const NOTIF_TABPANEL_ID = 'notif-tabpanel';

export const NotifHeader = ({
  count,
  settled = true,
  onMarkAll,
  onClose,
  showClose = false,
  tab,
  onTab,
}: {
  count: number;
  /**
   * The active tab. Supplied only when there is a list to filter (addendum 2,
   * item 1); with no list there is nothing to switch between, so no tabs.
   */
  tab?: NotificationTab | undefined;
  onTab?: ((next: NotificationTab) => void) | undefined;
  /**
   * Whether the first page has actually landed. "All caught up." while the
   * query is still in flight — or has failed outright — is a guess presented
   * as a fact, and it has been observed sitting directly above "Couldn't reach
   * the crawl." Same rule as InboxStrip's `settled`.
   */
  settled?: boolean | undefined;
  onMarkAll?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  showClose?: boolean | undefined;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 12px 12px 16px',
      background: 'var(--bg-elevated)',
      flexShrink: 0,
    }}
  >
    {/* B+ (`06-states/bp-s-notif_m`): the title is the page's heading, set
        large, with the count and Mark all read on one line beneath it. */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'Inter, system-ui',
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1.1,
          color: 'var(--fg)',
          letterSpacing: '-0.04em',
        }}
      >
        {NOTIFICATIONS_COPY.panelTitle}
      </span>
      {showClose && onClose !== undefined && (
        <button
          type="button"
          onClick={onClose}
          aria-label={NOTIFICATIONS_COPY.closeLabel}
          style={{
            all: 'unset',
            outline: 'revert',
            cursor: 'pointer',
            width: 44,
            height: 44,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            flexShrink: 0,
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 2.5l7 7m0-7l-7 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 32,
        paddingRight: 4,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {/* Nothing to claim until the query settles: the reassuring string
            is never the default. The board holds the count's place with an
            ellipsis, which is decoration and hidden from assistive tech. */}
        {count > 0 || settled ? (
          <NMono
            size={10.5}
            ls="0.18em"
            color={count > 0 ? 'var(--signal)' : 'var(--fg-muted)'}
          >
            {count > 0
              ? NOTIFICATIONS_COPY.panelSub(count)
              : NOTIFICATIONS_COPY.markedAll}
          </NMono>
        ) : (
          <span aria-hidden="true">
            <NMono size={10.5} color="var(--signal)">
              {NOTIFICATIONS_COPY.countPending}
            </NMono>
          </span>
        )}
      </span>
      {count > 0 && onMarkAll !== undefined && (
        <button
          type="button"
          className="notif-hit44"
          onClick={onMarkAll}
          style={{
            all: 'unset',
            // all:unset writes `outline` as an INLINE declaration, which beats
            // the `.notif-hit44:focus-visible` author rule in every state and
            // would leave this button keyboard-invisible. `revert` rolls the
            // property back to the UA sheet, restoring the native ring.
            outline: 'revert',
            // all:unset resets display to inline and position to static. The
            // inline value outranks `.notif-hit44 { position: relative }`, so
            // the 44px ::after would anchor outside the panel and swallow row
            // clicks.
            display: 'inline-flex',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            padding: '6px 2px',
            borderRadius: 7,
            fontFamily: 'Inter, system-ui',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--signal)',
            letterSpacing: '-0.01em',
          }}
        >
          {NOTIFICATIONS_COPY.markAll}
        </button>
      )}
    </div>
    {tab !== undefined && onTab !== undefined && (
      <div
        role="tablist"
        aria-label={NOTIFICATIONS_COPY.panelTitle}
        style={{ display: 'flex', gap: 4, marginTop: 6 }}
      >
        {NOTIFICATION_TABS.map((key) => {
          const selected = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={notifTabId(key)}
              aria-selected={selected}
              aria-controls={NOTIF_TABPANEL_ID}
              onClick={() => onTab(key)}
              style={{
                all: 'unset',
                outline: 'revert',
                cursor: 'pointer',
                boxSizing: 'border-box',
                minHeight: 32,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 8,
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: selected ? 700 : 600,
                color: selected ? 'var(--fg)' : 'var(--fg-muted)',
                border: '1px solid transparent',
                // B+ (addendum 2, `notif-*-m`): the selected tab is a pill
                // with a signal-to-accent hairline, the rest are bare text.
                ...(selected
                  ? {
                      background:
                        'linear-gradient(var(--border), var(--border)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
                    }
                  : {}),
              }}
            >
              {NOTIFICATIONS_COPY.segments[key]}
            </button>
          );
        })}
      </div>
    )}
  </div>
);
