'use client';

/**
 * Add a venue, step 2: Source (`05/step-2-source` and its state boards). The
 * page is tested the moment the step opens, with the real crawler and the real
 * rules, and nothing it finds is published (plan decision 3). A robots.txt
 * refusal stops here.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { StatusBadge } from '@/components/admin/primitives';
import {
  Card,
  errorStyle,
  fieldLabel,
  inputStyle,
  linkButton,
} from '@/components/admin/venues/source/source-parts';
import {
  readTestCrawl,
  testCrawlVenue,
  updateVenue,
} from '@/lib/actions/venues';
import {
  hostAndPath,
  normalizeWebsite,
  sampleDateLabel,
  viaOf,
} from './add-venue-rules';
import { SAMPLE_LIMIT, testStateOf, type TestState } from './source-test-rules';

const COPY = ADMIN_COPY.addVenue;
const SOURCE = COPY.source;
const POLL_MS = 2000;
// A test crawl waits its turn in the crawler's queue; past this it is called
// slow rather than watched forever.
const POLL_MAX_MS = 180_000;
const PAGE_ID = 'add-venue-source-page';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const lineStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.45,
  margin: 0,
};

interface SourceStepProps {
  phone: boolean;
  venueId: string;
  venueName: string;
  /** The saved calendar page, a full link. */
  pageUrl: string;
  /** The page link as saved by this step, so the flow keeps Basics in step. */
  onPageSaved: (url: string) => void;
}

const costLabel = (usd: number): string =>
  usd > 0 ? `$${usd.toFixed(2)}` : SOURCE.test.noCost;

const TestBody = ({
  state,
  pageUrl,
}: {
  state: TestState;
  pageUrl: string;
}) => {
  const test = SOURCE.test;
  if (state.kind === 'idle') {
    return <p style={lineStyle}>{test.idle}</p>;
  }
  if (state.kind === 'running') {
    return (
      <>
        <StatusBadge kind="signal" dot>
          {test.running}
        </StatusBadge>
        <p style={{ ...lineStyle, color: 'var(--fg)' }}>{test.runningSub}</p>
      </>
    );
  }
  if (state.kind === 'found') {
    const { result } = state;
    const samples = result.samples.slice(0, SAMPLE_LIMIT);
    const more = result.found - samples.length;
    return (
      <>
        <StatusBadge kind="success" dot>
          {test.passed}
        </StatusBadge>
        <p style={{ ...lineStyle, color: 'var(--fg)' }}>
          {test.found(
            result.found,
            SOURCE.via[viaOf(result.counts)],
            costLabel(result.costUsd),
          )}
        </p>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {samples.map((sample) => (
            <li
              key={`${sample.date}-${sample.artist}`}
              style={{ display: 'flex', gap: 12, fontSize: 13 }}
            >
              <span style={{ color: 'var(--fg-muted)', minWidth: 78 }}>
                {sampleDateLabel(sample.date)}
              </span>
              <span style={{ overflowWrap: 'anywhere' }}>{sample.artist}</span>
            </li>
          ))}
        </ul>
        {more > 0 && <p style={lineStyle}>{test.more(more)}</p>}
      </>
    );
  }
  if (state.kind === 'none') {
    return (
      <>
        <StatusBadge kind="warning" dot>
          {test.noneBadge}
        </StatusBadge>
        <strong style={{ fontSize: 14 }}>{test.noneTitle}</strong>
        <p style={lineStyle}>{test.noneBody}</p>
      </>
    );
  }
  if (state.kind === 'robots') {
    const { host, path } = hostAndPath(pageUrl);
    return (
      <>
        <StatusBadge kind="warning" dot>
          {SOURCE.robots.badge}
        </StatusBadge>
        <strong style={{ fontSize: 14 }}>{SOURCE.robots.title}</strong>
        <p style={lineStyle}>{SOURCE.robots.body(host, path)}</p>
      </>
    );
  }
  if (state.kind === 'refused') {
    return <p style={lineStyle}>{SOURCE.refused[state.code]}</p>;
  }
  if (state.kind === 'timedOut') {
    return <p style={lineStyle}>{test.timedOut}</p>;
  }
  return (
    <>
      <StatusBadge kind="warning" dot>
        {test.noneBadge}
      </StatusBadge>
      <strong style={{ fontSize: 14 }}>{test.failedTitle}</strong>
      <p style={lineStyle}>{test.failedBody}</p>
    </>
  );
};

export const SourceStep = ({
  phone,
  venueId,
  venueName,
  pageUrl,
  onPageSaved,
}: SourceStepProps) => {
  const [page, setPage] = useState(pageUrl);
  const [saved, setSaved] = useState(pageUrl);
  const [pageError, setPageError] = useState<string | null>(null);
  const [state, setState] = useState<TestState>(
    // An unusable saved link has nothing to test until the admin fixes it.
    normalizeWebsite(pageUrl) === null ? { kind: 'idle' } : { kind: 'running' },
  );
  const running = useRef(false);
  const cancelled = useRef(false);

  const run = async () => {
    if (running.current) return;
    const url = normalizeWebsite(page);
    if (url === null) {
      setPageError(COPY.errors.websiteInvalid);
      setState({ kind: 'idle' });
      return;
    }
    running.current = true;
    setPageError(null);
    setState({ kind: 'running' });
    try {
      if (url !== saved) {
        const formData = new FormData();
        formData.set('websiteUrl', url);
        const outcome = await updateVenue(venueId, formData);
        if (!outcome.success) {
          setPageError(COPY.errors.saveFailed);
          setState({ kind: 'idle' });
          return;
        }
        setSaved(url);
        setPage(url);
        onPageSaved(url);
      }
      const started = await testCrawlVenue(venueId);
      if (!started.ok) {
        setState(
          started.code === 'robots_disallowed'
            ? { kind: 'robots' }
            : { kind: 'refused', code: started.code },
        );
        return;
      }
      const deadline = Date.now() + POLL_MAX_MS;
      while (!cancelled.current && Date.now() < deadline) {
        await sleep(POLL_MS);
        const trigger = await readTestCrawl(started.triggerId);
        if (trigger?.status === 'done' || trigger?.status === 'failed') {
          setState(testStateOf(trigger.testResult ?? null));
          return;
        }
      }
      if (!cancelled.current) setState({ kind: 'timedOut' });
    } catch (err: unknown) {
      console.error('SourceStep: test crawl failed', { venueId, err });
      setState({ kind: 'failed' });
    } finally {
      running.current = false;
    }
  };

  // The test starts when the step opens. The cleanup only stops the poll;
  // StrictMode's second mount clears the flag again.
  useEffect(() => {
    cancelled.current = false;
    void run();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open: `run` reads the page as first shown
  }, []);

  const busy = state.kind === 'running';
  return (
    <>
      <div>
        <h1 style={{ margin: 0, fontSize: phone ? 20 : 22, fontWeight: 800 }}>
          {SOURCE.title(venueName.trim() || COPY.rail.unnamed)}
        </h1>
        <p style={{ ...lineStyle, marginTop: 6 }}>{SOURCE.sub}</p>
      </div>
      <Card
        title={SOURCE.where}
        phone={phone}
        testId="add-venue-source-where"
        actions={
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            data-testid="add-venue-test-again"
            style={{
              ...linkButton,
              opacity: busy ? 0.5 : 1,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {SOURCE.testAgain}
          </button>
        }
      >
        <div>
          <label htmlFor={PAGE_ID} style={fieldLabel}>
            {SOURCE.calendarPage}
          </label>
          <input
            id={PAGE_ID}
            type="url"
            value={page}
            disabled={busy}
            aria-invalid={pageError !== null}
            aria-describedby={
              pageError === null ? undefined : `${PAGE_ID}-error`
            }
            onChange={(event) => {
              setPage(event.target.value);
              setPageError(null);
            }}
            style={{
              ...inputStyle(pageError !== null, true),
              // iOS Safari zooms a focused input under 16px.
              ...(phone ? { fontSize: 16 } : {}),
            }}
          />
          {pageError !== null && (
            <div id={`${PAGE_ID}-error`} role="alert" style={errorStyle}>
              {pageError}
            </div>
          )}
        </div>
      </Card>
      <Card
        title={
          state.kind === 'running'
            ? SOURCE.test.runningTitle(venueName.trim() || COPY.rail.unnamed)
            : SOURCE.test.title
        }
        phone={phone}
        testId="add-venue-source-test"
        warning={state.kind === 'robots'}
      >
        <div
          aria-live="polite"
          data-state={state.kind}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <TestBody state={state} pageUrl={saved} />
        </div>
      </Card>
    </>
  );
};
