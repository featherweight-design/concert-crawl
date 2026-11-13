'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Flag } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminTabs } from '@/components/admin/primitives';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { apiClient } from '@/lib/api';
import type { RunPage } from '@/components/admin/crawl-runs/run-data';
import { shortUrl } from '@/components/admin/crawl-runs/runs-rules';
import { InspectCouldntLoad, PagesGone } from './InspectStates';
import {
  defaultInspectTab,
  goneReason,
  inspectTabs,
  isFeedPage,
  pageText,
  parseBody,
  stoppedHerePage,
  withCsp,
  type GoneReason,
  type InspectTab,
} from './inspect-rules';

const COPY = ADMIN_COPY.inspect;

type BodyState =
  | { key: string; kind: 'loaded'; html: string }
  | { key: string; kind: 'gone'; reason: GoneReason }
  | { key: string; kind: 'failed' };

/**
 * One page's stored body, fetched on the client. The result is keyed by page
 * and attempt, so a stale answer never shows under another page and loading
 * is derived rather than set. `getToken` sits in a ref, as `useRunPages` does:
 * Clerk may hand over a new function on any render.
 */
const useInspectBody = (pageId: string) => {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BodyState | null>(null);
  const key = `${pageId}:${attempt}`;
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const token = await tokenRef.current();
        if (!token) throw new Error('No session token');
        const raw = await apiClient.get<unknown>(
          `/v1/admin/crawl/pages/${encodeURIComponent(pageId)}/body`,
          token,
        );
        const html = parseBody(raw);
        if (html === null) throw new Error('Unexpected body shape');
        if (live) setState({ key, kind: 'loaded', html });
      } catch (err: unknown) {
        const reason = goneReason(err);
        if (reason === null) {
          console.error('Inspect: could not load the page body', {
            pageId,
            err,
          });
        }
        if (!live) return;
        setState(
          reason === null
            ? { key, kind: 'failed' }
            : { key, kind: 'gone', reason },
        );
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [pageId, key]);
  return {
    state: state?.key === key ? state : null,
    retry: () => setAttempt((count) => count + 1),
  };
};

/** Source and text: monospace, wrapping, never a sideways scroll at 320. */
const SOURCE_STYLE = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11.5,
  lineHeight: 1.6,
  color: 'var(--fg-muted)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  maxHeight: '70vh',
  overflowY: 'auto',
  overflowX: 'hidden',
} as const;

const StoppedHere = ({ page }: { page: number }) => (
  <div
    data-testid="inspect-stopped-here"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12.5,
      color: 'var(--warning)',
    }}
  >
    <Flag size={12} aria-hidden />
    {COPY.stoppedHere(page)}
  </div>
);

const TabPanel = ({
  tab,
  html,
  host,
}: {
  tab: InspectTab;
  html: string;
  host: string;
}) => {
  // Parsed only when the Text tab is open, and once per body.
  const text = useMemo(
    () => (tab === 'text' ? pageText(html) : ''),
    [tab, html],
  );
  if (tab === 'html') {
    // React text: escaped, never parsed as HTML.
    return (
      <pre data-testid="inspect-html" style={SOURCE_STYLE}>
        {html}
      </pre>
    );
  }
  if (tab === 'text') {
    return (
      <div
        data-testid="inspect-text"
        style={{ ...SOURCE_STYLE, fontFamily: 'inherit', fontSize: 13 }}
      >
        {text === '' ? COPY.noText : text}
      </div>
    );
  }
  // sandbox="" is every restriction: no scripts, an opaque origin, no forms,
  // popups or top navigation. The CSP meta stops every network load.
  return (
    <iframe
      data-testid="inspect-frame"
      title={COPY.frameTitle(host)}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={withCsp(html)}
      style={{
        display: 'block',
        width: '100%',
        height: '70vh',
        minHeight: 320,
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: '#fff',
      }}
    />
  );
};

const BodySkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    data-testid="inspect-body-loading"
    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
  >
    <span className="sr-only">{COPY.loading}</span>
    {['90%', '76%', '84%', '62%', '70%'].map((width) => (
      <SkeletonBlock key={width} width={width} height={11} radius={6} />
    ))}
  </div>
);

/**
 * What we fetched (`04/inspect-a-fetched-page`, `G2/inspect-fetched`): Page,
 * Text and HTML. A feed (`fetch_mode = 'api'`) opens on Text and has no
 * Page. Desktop is one full-width column: What we read is HOLD (rule 5).
 */
export const InspectFetched = ({
  page,
  pages,
  liveUrl,
  latestRunHref,
  phone,
}: {
  page: RunPage;
  pages: readonly RunPage[];
  liveUrl: string;
  latestRunHref: string | null;
  phone: boolean;
}) => {
  const { state, retry } = useInspectBody(page.id);
  const feed = isFeedPage(page);
  const tabs = inspectTabs(feed);
  const [chosen, setChosen] = useState<InspectTab>(defaultInspectTab(feed));
  // A tab this page lacks (Page on a feed) reads as the default.
  const tab = tabs.includes(chosen) ? chosen : defaultInspectTab(feed);
  const stopped = stoppedHerePage(pages, page.id);
  const host = shortUrl(page.url, null);

  if (state?.kind === 'gone') {
    return (
      <PagesGone
        kind={state.reason}
        liveUrl={liveUrl}
        latestRunHref={latestRunHref}
        phone={phone}
      />
    );
  }
  if (state?.kind === 'failed') {
    return (
      <InspectCouldntLoad liveUrl={liveUrl} onRetry={retry} phone={phone} />
    );
  }

  const panelId = 'inspect-fetched-panel';
  const tabId = (key: InspectTab) => `inspect-tab-${key}`;
  return (
    <section
      data-testid="inspect-fetched"
      style={{
        minWidth: 0,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        padding: phone ? 12 : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: phone ? 'column' : 'row',
          alignItems: phone ? 'stretch' : 'center',
          gap: phone ? 10 : 8,
        }}
      >
        <h2 style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 700 }}>
          {COPY.fetched}
        </h2>
        <AdminTabs
          tabs={tabs.map((key) => ({ key, label: COPY.tabs[key] }))}
          value={tab}
          onChange={setChosen}
          label={COPY.tabsLabel}
          tabId={tabId}
          panelId={() => panelId}
          variant="segments"
          testId="inspect-tabs"
        />
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 0,
        }}
      >
        {state === null ? (
          <BodySkeleton />
        ) : (
          <>
            {tab === 'html' && stopped !== null && (
              <StoppedHere page={stopped} />
            )}
            <TabPanel tab={tab} html={state.html} host={host} />
          </>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {COPY.keptFor}
      </p>
    </section>
  );
};
