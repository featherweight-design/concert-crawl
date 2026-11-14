'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
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
  INSPECT_CSP,
  defaultInspectTab,
  goneReason,
  inspectTabs,
  isFeedPage,
  pageSrcDoc,
  pageText,
  parseBody,
  stoppedHerePage,
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

/**
 * The HTML tab's well: the box and the scroll live on a wrapper, so the
 * <pre> inside holds the raw body and nothing else (its textContent is the
 * page as fetched), and "Stopped here" can sit after it in the same well.
 */
const {
  padding: wellPadding,
  borderRadius: wellRadius,
  background: wellBackground,
  border: wellBorder,
  maxHeight: wellMaxHeight,
  overflowY: wellOverflowY,
  overflowX: wellOverflowX,
  ...PRE_TEXT_STYLE
} = SOURCE_STYLE;
const WELL_STYLE = {
  position: 'relative',
  padding: wellPadding,
  borderRadius: wellRadius,
  background: wellBackground,
  border: wellBorder,
  maxHeight: wellMaxHeight,
  overflowY: wellOverflowY,
  overflowX: wellOverflowX,
} as const;

/**
 * "Stopped here", where the next page never came: right after the body, in
 * the same well (`G2/inspect-fetched`). The board's highlighted line (the
 * next-page link) needs the stop's offset, which isn't stored (A3 §3b row
 * 27, Eng), so nothing is highlighted yet.
 */
const StoppedHere = ({
  page,
  markerRef,
}: {
  page: number;
  markerRef: RefObject<HTMLDivElement | null>;
}) => (
  <div
    ref={markerRef}
    data-testid="inspect-stopped-here"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      fontSize: 12,
      color: 'var(--warning)',
    }}
  >
    <Flag size={12} aria-hidden style={{ flex: 'none' }} />
    {COPY.stoppedHere(page)}
  </div>
);

// Venue pages assume a white page, whatever the admin theme.
const FRAME_BACKGROUND = '#fff';

/**
 * The Page tab: the defused copy (`pageSrcDoc`) in a frame that is never
 * part of the app's document. `sandbox=""` is every restriction: no scripts,
 * an opaque origin, no forms, popups or top navigation. A srcdoc frame has
 * no HTTP response to carry a policy, so the CSP that blocks subresources
 * rides twice: as the meta first in its head, and as the `csp` attribute
 * (CSP Embedded Enforcement, where the browser supports it). The ways to
 * navigate are out of the markup. A copy that can't be shown safely gets a
 * line instead of a frame.
 */
const PageFrame = ({
  srcDoc,
  page,
  phone,
}: {
  srcDoc: string | null;
  page: string;
  phone: boolean;
}) => {
  if (srcDoc === null) {
    return (
      <p
        data-testid="inspect-page-unsafe"
        style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}
      >
        {COPY.pageUnsafe}
      </p>
    );
  }
  return (
    <iframe
      data-testid="inspect-frame"
      title={COPY.frameTitle(page)}
      sandbox=""
      csp={INSPECT_CSP}
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      style={{
        display: 'block',
        width: '100%',
        height: phone ? 420 : 520,
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: FRAME_BACKGROUND,
      }}
    />
  );
};

const TabPanel = ({
  tab,
  html,
  page,
  phone,
  stopped,
  pageId,
}: {
  tab: InspectTab;
  html: string;
  page: string;
  phone: boolean;
  /** The page the run stopped at, after this one; null if it didn't. */
  stopped: number | null;
  /** The fetched page's id: the well opens at Stopped here once per page. */
  pageId: string;
}) => {
  // Parsed only when the Text tab is open, and once per body.
  const text = useMemo(
    () => (tab === 'text' ? pageText(html) : ''),
    [tab, html],
  );
  // Defused once per body, and only once the Page tab is opened: TabPanel
  // stays mounted across tab switches, so reopening Page reuses it.
  const srcDoc = useMemo(() => {
    let cached: { value: string | null } | null = null;
    return () => {
      cached ??= { value: pageSrcDoc(html) };
      return cached.value;
    };
  }, [html]);
  // "Opens at the highlight": the well scrolls to Stopped here once per page,
  // on the first HTML view, never again on a tab switch back. Only the well
  // scrolls, never the page: its `scrollTop` moves to the marker, whose
  // `offsetTop` is measured from the well (it is `position: relative`).
  const wellRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef<string | null>(null);
  // A layout effect: the well is scrolled in the same commit that draws the
  // marker, before paint, so it never shows the top and then jumps (and a
  // test that sees the marker sees the scroll).
  useLayoutEffect(() => {
    if (tab !== 'html' || stopped === null || openedAt.current === pageId) {
      return;
    }
    const well = wellRef.current;
    const marker = markerRef.current;
    if (well === null || marker === null) return;
    openedAt.current = pageId;
    well.scrollTop = marker.offsetTop;
  }, [tab, stopped, pageId]);
  if (tab === 'html') {
    // React text: escaped, never parsed as HTML.
    return (
      <div ref={wellRef} data-testid="inspect-html-well" style={WELL_STYLE}>
        <pre data-testid="inspect-html" style={PRE_TEXT_STYLE}>
          {html}
        </pre>
        {stopped !== null && (
          <StoppedHere page={stopped} markerRef={markerRef} />
        )}
      </div>
    );
  }
  if (tab === 'page') {
    return <PageFrame srcDoc={srcDoc()} page={page} phone={phone} />;
  }
  return (
    <div
      data-testid="inspect-text"
      style={{ ...SOURCE_STYLE, fontFamily: 'inherit', fontSize: 13 }}
    >
      {text === '' ? COPY.noText : text}
    </div>
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
 * Text and HTML. It opens on HTML, as the board does; a feed
 * (`fetch_mode = 'api'`) has no Page and opens on Text. Desktop is one
 * full-width column: What we read is HOLD (rule 5).
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
  const [tab, setTab] = useState<InspectTab>(defaultInspectTab(feed));
  const stopped = stoppedHerePage(pages, page.id);

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
          onChange={setTab}
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
          <TabPanel
            tab={tab}
            html={state.html}
            page={shortUrl(page.url, null)}
            phone={phone}
            stopped={stopped}
            pageId={page.id}
          />
        )}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {COPY.keptFor}
      </p>
    </section>
  );
};
