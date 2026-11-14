'use client';

import { useId, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformProbeResult, Venue } from '@concert-crawl/types';
import { updateVenue, probeVenuePlatform } from '@/lib/actions/venues';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  PinnedSaveBar,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  Card,
  Chips,
  ModeRadio,
  errorStyle,
  fieldLabel,
  hintStyle,
  inputStyle,
} from './source-parts';
import { SourceAdvanced } from './SourceAdvanced';
import { SourceRulesCards } from './SourceRulesCards';
import {
  FEED_SELLERS,
  READ_MODES,
  columnsOf,
  dirtyColumns,
  draftOf,
  feedIdForSeller,
  rebaseDraft,
  isStoredManual,
  readModeOf,
  sellerName,
  sourceColumnsOf,
  sourceFieldOf,
  sourceFormData,
  stillSavedLine,
  validateSource,
  type SourceColumns,
  type SourceDraft,
  type SourceErrors,
} from './source-rules';

const COPY = ADMIN_COPY.venueSource;
const PROBE = COPY.read.probe;

export type SourceVenue = SourceColumns &
  Pick<
    Venue,
    'id' | 'name' | 'crawlDelayMs' | 'robotsTxtAllowed' | 'robotsTxtCheckedAt'
  >;

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
  const probeRun = useRef(0);
  // Clearing the probe also retires any request still in flight.
  const resetProbe = () => {
    probeRun.current += 1;
    setProbe({ kind: 'idle' });
  };

  const changed = dirtyColumns(draft, baseline);
  // A switch of mode or seller is an edit even before it changes a column
  // (a feed with no seller yet), so the bar is up and Save asks for the rest.
  const savedDraft = draftOf(baseline);
  const dirty =
    changed.length > 0 ||
    draft.mode !== savedDraft.mode ||
    draft.seller !== savedDraft.seller;

  // A fresh server row (after a save, or another tab's) becomes the baseline.
  // Only the fields edited here survive it; every other field follows the new
  // row, so a save never writes an old value back over someone's newer one.
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setBaseline(fromServer);
    setDraft(rebaseDraft(draft, draftOf(baseline), draftOf(fromServer)));
  }

  const edit = (patch: Partial<SourceDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const discard = () => {
    setDraft(draftOf(baseline));
    setErrors({});
    setFailure(null);
    resetProbe();
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
      // The API's reason leads the toast, so a refusal is never silent, even
      // when its input is collapsed (Advanced) or not drawn here (desktop's
      // feed fields, #175).
      const saved = [result.error, stillSavedLine(baseline)]
        .filter(Boolean)
        .join(' ');
      const field = sourceFieldOf(result.field);
      if (field !== null && result.error !== undefined) {
        // A refusal names its input; a retry would only be refused again.
        setErrors({ [field]: result.error });
        if (field === 'waitFor') setAdvancedOpen(true);
        setFailure({ attempt: null, saved });
        return;
      }
      // Rule 10: snap back to what is saved, and offer Try again.
      setDraft(draftOf(baseline));
      setFailure({ attempt, saved });
    } catch (err) {
      console.error('SourceTab: save failed', { venueId: venue.id, err });
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
    // An edit while this probe runs makes its answer stale: only the latest
    // probe may write a result.
    const run = ++probeRun.current;
    setProbe({ kind: 'pending' });
    try {
      const result = await probeVenuePlatform(venue.id, {
        platform: seller,
        platformVenueId: draft.feedId.trim(),
      });
      if (run !== probeRun.current) return;
      setProbe(
        result.success && result.data
          ? { kind: 'done', result: result.data }
          : { kind: 'error', message: result.error ?? PROBE.requestFailed },
      );
    } catch (err) {
      console.error('SourceTab: probe failed', { venueId: venue.id, err });
      if (run !== probeRun.current) return;
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
      : COPY.read.modes.feed.sub(FEED_SELLERS.map(sellerName));

  const calendarPage = (
    <div>
      <label htmlFor={`${ids}-url`} style={fieldLabel}>
        {COPY.read.calendarPage.label}
      </label>
      <input
        id={`${ids}-url`}
        type="url"
        value={draft.websiteUrl}
        disabled={saving}
        aria-invalid={errors.websiteUrl !== undefined}
        onChange={(evt) => edit({ websiteUrl: evt.target.value })}
        style={inputStyle(errors.websiteUrl !== undefined)}
      />
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
        <span style={{ ...fieldLabel, marginBottom: 8 }}>
          {COPY.read.seller.label}
        </span>
        <Chips
          name={`${ids}-seller`}
          label={COPY.read.seller.label}
          options={FEED_SELLERS.map((value) => ({
            value,
            label: sellerName(value),
          }))}
          value={seller}
          disabled={saving}
          onChange={(value) => {
            edit({ seller: value, feedId: feedIdForSeller(value, baseline) });
            resetProbe();
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
              resetProbe();
            }}
            style={inputStyle(errors.feedId !== undefined)}
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
                ? PROBE.ok(
                    probe.result.eventsFound,
                    probe.result.fetchLatencyMs,
                    probe.result.sourceUrl,
                  )
                : PROBE.failed(
                    probeReason(probe.result.reason),
                    probe.result.error,
                  )}
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
            onPick={(picked) => {
              // A locked feed (desktop, #175) never changes mode.
              if (!modeLocked) edit({ mode: picked });
            }}
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
      <SourceAdvanced
        ids={ids}
        draft={draft}
        errors={errors}
        saving={saving}
        phone={phone}
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((open) => !open)}
        edit={edit}
      />
    </Card>
  );

  const failedAttempt = failure?.attempt ?? null;
  const barFailure =
    failure === null
      ? null
      : failedAttempt === null
        ? { title: COPY.failed.title, saved: failure.saved }
        : {
            title: COPY.failed.title,
            saved: failure.saved,
            onRetry: () => {
              setDraft(failedAttempt);
              void save(failedAttempt);
            },
          };

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
          <SourceRulesCards venue={venue} phone={phone} />
        </div>
      </div>

      {/* With nothing unsaved, a failed save's toast floats 24px above the
          screen's bottom (`G4/source-save-failed`). */}
      <PinnedSaveBar
        phone={phone}
        dirty={dirty}
        saving={saving}
        testId="source-save-bar"
        message={COPY.saveBar.unsaved(COPY.read.title)}
        labels={COPY.saveBar}
        failure={barFailure}
        onDiscard={discard}
        onSave={() => void save(draft)}
        look={{
          gap: 8,
          // `G4/source-feed-edited` stacks the message over the buttons.
          ...(phone ? { stack: true } : { wrap: true }),
          padding: phone ? '10px 16px 24px' : '10px 16px',
          messageStyle: phone
            ? { fontSize: 12, color: 'var(--fg-muted)' }
            : { fontSize: 12, color: 'var(--fg-muted)', flex: 1 },
          discardVariant: 'outline',
          ...(phone
            ? {
                discardStyle: {
                  height: 44,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 9,
                },
                saveStyle: {
                  flex: 1,
                  height: 44,
                  fontSize: 15,
                  borderRadius: 9,
                },
              }
            : {}),
        }}
      />
    </div>
  );
};
