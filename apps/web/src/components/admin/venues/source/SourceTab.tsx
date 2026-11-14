'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Flag,
} from 'lucide-react';
import {
  CRAWLER_USER_AGENT,
  type PlatformProbeResult,
  type Venue,
} from '@concert-crawl/types';
import { updateVenue, probeVenuePlatform } from '@/lib/actions/venues';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { WAIT_UNTIL_VALUES } from '@/components/admin/definitions/constants';
import {
  AdminButton,
  SaveFailedToast,
  useIsPhone,
} from '@/components/admin/primitives';
import { runWhen } from '../overview/overview-rules';
import {
  FEED_SELLERS,
  PAGE_LOADINGS,
  READERS,
  READ_MODES,
  columnsOf,
  crawlModeOf,
  dirtyColumns,
  draftOf,
  isStoredManual,
  paceLine,
  pageLoadingOf,
  readModeOf,
  robotsStateOf,
  sellerName,
  sourceColumnsOf,
  sourceFieldOf,
  sourceFormData,
  stillSavedLine,
  validateSource,
  type ReadMode,
  type SourceColumns,
  type SourceDraft,
  type SourceErrors,
} from './source-rules';

const COPY = ADMIN_COPY.venueSource;
const PROBE = COPY.read.probe;
/** "ConcertCrawl/1.0", the product part of the one user agent. */
const AGENT_NAME = CRAWLER_USER_AGENT.split(' ')[0] ?? CRAWLER_USER_AGENT;

export type SourceVenue = SourceColumns &
  Pick<
    Venue,
    'id' | 'name' | 'crawlDelayMs' | 'robotsTxtAllowed' | 'robotsTxtCheckedAt'
  >;

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const fieldLabel: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
  display: 'block',
};
const hintStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--fg-subtle)',
  marginTop: 5,
};
const errorStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--danger)',
  marginTop: 5,
};
const inputStyle = (invalid: boolean, mono = false): CSSProperties => ({
  width: '100%',
  height: 38,
  boxSizing: 'border-box',
  borderRadius: 10,
  border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
  background: 'var(--bg)',
  color: 'var(--fg)',
  padding: '0 12px',
  fontSize: mono ? 12.5 : 13.5,
  fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
  minWidth: 0,
});

/** A card: title, then its body (`04/venue-source`). */
const Card = ({
  title,
  phone,
  testId,
  warning = false,
  children,
}: {
  title: string;
  phone: boolean;
  testId: string;
  warning?: boolean;
  children: ReactNode;
}) => (
  <section
    data-testid={testId}
    aria-label={title}
    style={{
      borderRadius: 14,
      border: `1px solid ${
        warning
          ? 'color-mix(in srgb, var(--warning) 45%, transparent)'
          : 'var(--border)'
      }`,
      background: warning
        ? 'color-mix(in srgb, var(--warning) 5%, var(--bg-elevated))'
        : 'var(--bg-elevated)',
      padding: phone ? 14 : '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 0,
    }}
  >
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
    {children}
  </section>
);

/** A read-only row: label left, value right, a rule above. */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 13,
      padding: '8px 0',
      borderTop: '1px solid var(--border)',
    }}
  >
    <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
    <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
      {children}
    </span>
  </div>
);

/** Native radios, drawn as a segmented control (`G4/source-advanced-open`). */
function Segments<T extends string>({
  name,
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  disabled: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'flex',
        padding: 3,
        gap: 3,
        borderRadius: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <label
            key={option.value}
            style={{
              position: 'relative',
              flex: 1,
              textAlign: 'center',
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: on ? 'var(--bg-elevated)' : 'transparent',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              style={visuallyHidden}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

/** One of How we read it's radios. */
const ModeRadio = ({
  name,
  mode,
  checked,
  sub,
  disabled,
  onPick,
}: {
  name: string;
  mode: ReadMode;
  checked: boolean;
  sub: string;
  disabled: boolean;
  onPick: (mode: ReadMode) => void;
}) => (
  <label
    style={{
      position: 'relative',
      display: 'flex',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...(checked
        ? {
            border: '1px solid transparent',
            background:
              'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
          }
        : { border: '1px solid var(--border)' }),
    }}
  >
    <input
      type="radio"
      name={name}
      value={mode}
      checked={checked}
      disabled={disabled}
      onChange={() => onPick(mode)}
      aria-labelledby={`${name}-${mode}-label`}
      aria-describedby={`${name}-${mode}-sub`}
      style={visuallyHidden}
    />
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        marginTop: 2,
        flex: 'none',
        borderRadius: '50%',
        border: `1.5px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--signal)',
          }}
        />
      )}
    </span>
    <span>
      <span
        id={`${name}-${mode}-label`}
        style={{ display: 'block', fontSize: 14, fontWeight: 600 }}
      >
        {COPY.read.modes[mode].label}
      </span>
      <span
        id={`${name}-${mode}-sub`}
        style={{
          display: 'block',
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          marginTop: 2,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </span>
    </span>
  </label>
);

type ProbeStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; result: PlatformProbeResult }
  | { kind: 'error'; message: string };

const probeReason = (
  reason: 'missing_config' | 'fetch_error' | 'schema_error',
): string =>
  reason === 'missing_config'
    ? PROBE.reasons.missingConfig
    : reason === 'schema_error'
      ? PROBE.reasons.schemaError
      : PROBE.reasons.fetchError;

/** What went wrong on the last save, for the toast. */
type Failure = { attempt: SourceDraft | null; saved: string };

/**
 * The venue page's Source tab (3b part 6): how we read the venue, its
 * robots.txt standing, and the crawl rules, with its own Save bar. Only the
 * Source columns are ever sent; the crawl rules are shown, never edited.
 */
export const SourceTab = ({ venue }: { venue: SourceVenue }) => {
  const router = useRouter();
  const phone = useIsPhone();
  const ids = useId();

  const fromServer = sourceColumnsOf(venue);
  const serverKey = JSON.stringify(fromServer);
  const [baseline, setBaseline] = useState<SourceColumns>(fromServer);
  const [draft, setDraft] = useState<SourceDraft>(() => draftOf(fromServer));
  const [seenKey, setSeenKey] = useState(serverKey);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState<SourceErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [probe, setProbe] = useState<ProbeStatus>({ kind: 'idle' });

  const changed = dirtyColumns(draft, baseline);
  const dirty = changed.length > 0;

  // A fresh server row (after a save, or another tab's) becomes the baseline.
  // An unsaved edit here survives it; a clean draft follows it.
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setBaseline(fromServer);
    if (!dirty) setDraft(draftOf(fromServer));
  }

  const edit = (patch: Partial<SourceDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const discard = () => {
    setDraft(draftOf(baseline));
    setErrors({});
    setFailure(null);
    setProbe({ kind: 'idle' });
  };

  const save = async (attempt: SourceDraft) => {
    const invalid = validateSource(attempt);
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid);
      return;
    }
    const target = columnsOf(attempt, baseline);
    const keys = dirtyColumns(attempt, baseline);
    if (keys.length === 0) return;
    setErrors({});
    setFailure(null);
    setSaving(true);
    try {
      const result = await updateVenue(venue.id, sourceFormData(target, keys));
      if (result.success) {
        setBaseline(target);
        setDraft(draftOf(target));
        router.refresh();
        return;
      }
      const field = sourceFieldOf(result.field);
      if (field !== null && result.error !== undefined) {
        // A refusal names its input; a retry would only be refused again.
        setErrors({ [field]: result.error });
        setFailure({ attempt: null, saved: stillSavedLine(baseline) });
        return;
      }
      // Rule 10: snap back to what is saved, and offer Try again.
      setDraft(draftOf(baseline));
      setFailure({ attempt, saved: stillSavedLine(baseline) });
    } catch {
      setDraft(draftOf(baseline));
      setFailure({ attempt, saved: stillSavedLine(baseline) });
    } finally {
      setSaving(false);
    }
  };

  const runProbe = async () => {
    const seller = draft.seller;
    if (seller !== 'aeg' && seller !== 'livenation') return;
    if (draft.feedId.trim() === '') {
      setErrors({ feedId: COPY.read.feedId.required(sellerName(seller)) });
      return;
    }
    setProbe({ kind: 'pending' });
    try {
      const result = await probeVenuePlatform(venue.id, {
        platform: seller,
        platformVenueId: draft.feedId.trim(),
      });
      setProbe(
        result.success && result.data
          ? { kind: 'done', result: result.data }
          : { kind: 'error', message: result.error ?? PROBE.requestFailed },
      );
    } catch {
      setProbe({ kind: 'error', message: PROBE.requestFailed });
    }
  };

  const column: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  };
  const radioName = `${ids}-mode`;
  const robots = robotsStateOf(venue.robotsTxtAllowed);

  // Desktop's feed is read-only (#175 HOLD): a venue already on a feed shows
  // it, naming the seller and ID, and can't move to or from it; any other
  // venue sees no feed option at all. Phone keeps the full feed fields.
  const onFeed = readModeOf(baseline) === 'feed';
  const modes =
    phone || onFeed ? READ_MODES : READ_MODES.filter((mode) => mode !== 'feed');
  const modeLocked = !phone && onFeed;

  const feedSub =
    !phone && draft.seller !== null
      ? COPY.read.modes.feed.subNamed(sellerName(draft.seller), draft.feedId)
      : COPY.read.modes.feed.sub;

  const calendarPage = (
    <div>
      <label htmlFor={`${ids}-url`} style={fieldLabel}>
        {COPY.read.calendarPage.label}
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          id={`${ids}-url`}
          type="url"
          value={draft.websiteUrl}
          disabled={saving}
          aria-invalid={errors.websiteUrl !== undefined}
          onChange={(evt) => edit({ websiteUrl: evt.target.value })}
          style={{ ...inputStyle(errors.websiteUrl !== undefined), flex: 1 }}
        />
        {isSafeHttpUrl(draft.websiteUrl.trim()) && (
          <a
            href={draft.websiteUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={COPY.read.calendarPage.open}
            style={{ color: 'var(--fg-muted)', display: 'flex' }}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      {errors.websiteUrl === undefined ? (
        <div style={hintStyle}>{COPY.read.calendarPage.hint}</div>
      ) : (
        <div role="alert" style={errorStyle}>
          {errors.websiteUrl}
        </div>
      )}
    </div>
  );

  const seller = draft.seller;
  // The feed's fields are drawn on phone only; desktop's are held (#175).
  const feedFields = phone && draft.mode === 'feed' && (
    <div
      data-testid="source-feed-fields"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div>
        <span style={fieldLabel}>{COPY.read.seller.label}</span>
        <Segments
          name={`${ids}-seller`}
          label={COPY.read.seller.label}
          options={FEED_SELLERS.map((value) => ({
            value,
            label: sellerName(value),
          }))}
          value={seller}
          disabled={saving}
          onChange={(value) => {
            edit({ seller: value, feedId: '' });
            setProbe({ kind: 'idle' });
          }}
        />
      </div>
      {seller !== null && (
        <div>
          <label htmlFor={`${ids}-feed-id`} style={fieldLabel}>
            {COPY.read.feedId.label(venue.name, sellerName(seller))}
          </label>
          <input
            id={`${ids}-feed-id`}
            value={draft.feedId}
            disabled={saving}
            aria-invalid={errors.feedId !== undefined}
            onChange={(evt) => {
              edit({ feedId: evt.target.value });
              setProbe({ kind: 'idle' });
            }}
            style={inputStyle(errors.feedId !== undefined, true)}
          />
          {errors.feedId === undefined ? (
            <div style={hintStyle}>{COPY.read.feedId.hints[seller]}</div>
          ) : (
            <div role="alert" style={errorStyle}>
              {errors.feedId}
            </div>
          )}
        </div>
      )}
      {/* The probe has no board: kept under the ID until 3c's Test it now
          takes it over (spec, Probe platform). VenuePilot has no probe. */}
      {(seller === 'aeg' || seller === 'livenation') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <AdminButton
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || probe.kind === 'pending'}
              onClick={() => void runProbe()}
            >
              {probe.kind === 'pending' ? PROBE.buttonPending : PROBE.button}
            </AdminButton>
          </div>
          {probe.kind === 'done' && (
            <div
              data-testid="source-probe-result"
              style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}
            >
              {probe.result.ok
                ? `${PROBE.okPrefix} ${probe.result.eventsFound} ${PROBE.okEvents} ${probe.result.fetchLatencyMs}ms`
                : `${PROBE.failedPrefix} ${probeReason(probe.result.reason)}`}
            </div>
          )}
          {probe.kind === 'error' && (
            <div role="alert" style={errorStyle}>
              {probe.message}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const advancedId = `${ids}-advanced`;
  const advanced = (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        aria-expanded={advancedOpen}
        aria-controls={advancedId}
        onClick={() => setAdvancedOpen((open) => !open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '12px 0',
          background: 'none',
          border: 'none',
          color: 'var(--fg)',
          cursor: 'pointer',
          textAlign: 'left',
          flexWrap: 'wrap',
        }}
      >
        {advancedOpen ? (
          <ChevronDown size={14} color="var(--fg-muted)" aria-hidden />
        ) : (
          <ChevronRight size={14} color="var(--fg-muted)" aria-hidden />
        )}
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {COPY.advanced.label}
        </span>
        {!advancedOpen && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>
            {COPY.advanced.collapsedLine}
          </span>
        )}
      </button>
      {advancedOpen && (
        <div
          id={advancedId}
          data-testid="source-advanced"
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <span style={fieldLabel}>{COPY.advanced.pageLoading.label}</span>
            <Segments
              name={`${ids}-loading`}
              label={COPY.advanced.pageLoading.label}
              options={PAGE_LOADINGS.map((value) => ({
                value,
                label: COPY.advanced.pageLoading[value],
              }))}
              value={pageLoadingOf(draft.crawlMode)}
              disabled={saving}
              onChange={(value) => edit({ crawlMode: crawlModeOf(value) })}
            />
            <div style={hintStyle}>{COPY.advanced.pageLoading.hint}</div>
          </div>
          <div>
            <span style={fieldLabel}>{COPY.advanced.waitUntil.label}</span>
            <Segments
              name={`${ids}-wait-until`}
              label={COPY.advanced.waitUntil.label}
              options={WAIT_UNTIL_VALUES.map((value) => ({
                value,
                label: COPY.advanced.waitUntil[value],
              }))}
              value={draft.waitUntil}
              disabled={saving}
              onChange={(value) => edit({ waitUntil: value })}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-wait-for`} style={fieldLabel}>
              {COPY.advanced.waitFor.label}
            </label>
            <input
              id={`${ids}-wait-for`}
              value={draft.waitFor}
              placeholder={COPY.advanced.waitFor.placeholder}
              disabled={saving}
              aria-invalid={errors.waitFor !== undefined}
              onChange={(evt) => edit({ waitFor: evt.target.value })}
              style={inputStyle(errors.waitFor !== undefined, true)}
            />
            {errors.waitFor === undefined ? (
              <div style={hintStyle}>{COPY.advanced.waitFor.hint}</div>
            ) : (
              <div role="alert" style={errorStyle}>
                {errors.waitFor}
              </div>
            )}
          </div>
          {draft.mode === 'page' && (
            <div>
              <span style={fieldLabel}>{COPY.advanced.reader.label}</span>
              <Segments
                name={`${ids}-reader`}
                label={COPY.advanced.reader.label}
                options={READERS.map((value) => ({
                  value,
                  label: COPY.advanced.reader[value],
                }))}
                value={draft.reader}
                disabled={saving}
                onChange={(value) => edit({ reader: value })}
              />
              <div style={hintStyle}>
                {draft.reader === 'detail-page'
                  ? COPY.advanced.detailPage
                  : COPY.advanced.reader.hint}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const howWeReadIt = (
    <Card title={COPY.read.title} phone={phone} testId="source-read">
      <div
        role="radiogroup"
        aria-label={COPY.read.title}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {modes.map((mode) => (
          <ModeRadio
            key={mode}
            name={radioName}
            mode={mode}
            checked={draft.mode === mode}
            sub={mode === 'feed' ? feedSub : COPY.read.modes[mode].sub}
            disabled={saving || modeLocked}
            onPick={(picked) => edit({ mode: picked })}
          />
        ))}
      </div>
      {errors.mode !== undefined && (
        <div role="alert" style={errorStyle}>
          {errors.mode}
        </div>
      )}
      {draft.mode === 'page' && isStoredManual(baseline) && (
        <div
          data-testid="source-manual-note"
          style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}
        >
          {COPY.read.manualNote}
        </div>
      )}
      {draft.mode === 'page' && calendarPage}
      {feedFields}
      {advanced}
    </Card>
  );

  const robotsCard = (
    <Card
      title={COPY.robots.title}
      phone={phone}
      testId="source-robots"
      warning={robots === 'disallowed'}
    >
      <div>
        <Row label={COPY.robots.calendarPage}>
          {robots === 'allowed' ? (
            <span style={{ display: 'inline-flex', gap: 5 }}>
              <Check size={13} color="var(--success)" aria-hidden />
              {COPY.robots.allowed}
            </span>
          ) : robots === 'disallowed' ? (
            <span
              style={{
                display: 'inline-flex',
                gap: 5,
                color: 'var(--warning)',
              }}
            >
              <Flag size={13} aria-hidden />
              {COPY.robots.disallowed}
            </span>
          ) : (
            <span style={{ color: 'var(--fg-muted)' }}>
              {COPY.robots.unchecked}
            </span>
          )}
        </Row>
        <Row label={COPY.robots.lastChecked}>
          {venue.robotsTxtCheckedAt === null
            ? COPY.robots.never
            : runWhen(venue.robotsTxtCheckedAt)}
        </Row>
        <Row label={COPY.robots.userAgent}>{AGENT_NAME}</Row>
      </div>
      <div
        style={{
          fontSize: 12.5,
          lineHeight: 1.45,
          color: robots === 'disallowed' ? 'var(--warning)' : 'var(--fg-muted)',
        }}
      >
        {robots === 'disallowed'
          ? COPY.robots.disallowedFootnote
          : COPY.robots.footnote}
      </div>
    </Card>
  );

  // Read-only: no input, nothing here is ever sent (ruling d).
  const rulesCard = (
    <Card title={COPY.rules.title} phone={phone} testId="source-rules">
      <div>
        <Row label={COPY.rules.pace}>{paceLine(venue.crawlDelayMs)}</Row>
        <Row label={COPY.rules.schedule}>{COPY.rules.scheduleValue}</Row>
        <Row label={COPY.rules.autoPause}>{COPY.rules.autoPauseValue}</Row>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {COPY.rules.footnote}
      </div>
    </Card>
  );

  return (
    <div
      data-testid="venue-source"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: phone
            ? 'minmax(0, 1fr)'
            : 'minmax(0, 1.3fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={column}>{howWeReadIt}</div>
        <div style={column}>
          {robotsCard}
          {rulesCard}
        </div>
      </div>

      {failure !== null && (
        <SaveFailedToast
          title={COPY.failed.title}
          saved={failure.saved}
          retrying={saving}
          onDismiss={() => setFailure(null)}
          {...(failure.attempt === null
            ? {}
            : {
                onRetry: () => {
                  const { attempt } = failure;
                  if (attempt === null) return;
                  setDraft(attempt);
                  void save(attempt);
                },
              })}
        />
      )}

      {dirty && (
        <div
          data-testid="source-save-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: phone ? '10px 16px 24px' : '10px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: phone ? 0 : 12,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--fg-muted)',
              flex: phone ? '1 0 100%' : 1,
            }}
          >
            {COPY.saveBar.unsaved(COPY.read.title)}
          </span>
          <AdminButton
            type="button"
            variant="outline"
            disabled={saving}
            onClick={discard}
          >
            {COPY.saveBar.discard}
          </AdminButton>
          <AdminButton
            type="button"
            variant="gradient"
            disabled={saving}
            onClick={() => void save(draft)}
            style={phone ? { flex: 1 } : undefined}
          >
            {saving ? COPY.saveBar.saving : COPY.saveBar.save}
          </AdminButton>
        </div>
      )}
    </div>
  );
};
