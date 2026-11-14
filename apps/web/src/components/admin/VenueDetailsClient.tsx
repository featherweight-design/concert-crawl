'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueGuide, VenueWithCrawlHealth } from '@concert-crawl/types';
import { updateVenue, generateVenueAbout } from '@/lib/actions/venues';
import {
  AdminTabs,
  MonoLabel,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  VENUE_TABS,
  venueTabHref,
  type VenueTab,
} from '@/lib/admin/venue-tabs';
import { VenueGuideBlock } from '@/components/admin/venue-guide/VenueGuideBlock';
import { VenueHeader } from '@/components/admin/venues/VenueHeader';
import { useRecrawl } from '@/components/admin/venues/useRecrawl';
import { recrawlOff } from '@/components/admin/venues/venue-header-rules';
import { OverviewTab } from '@/components/admin/venues/overview/OverviewTab';
import { SourceTab } from '@/components/admin/venues/source/SourceTab';
import { DetailsTab } from '@/components/admin/venues/details/DetailsTab';
import type { OverviewData } from '@/components/admin/venues/overview/overview-data';
import { RunsTab } from '@/components/admin/venues/runs/RunsTab';
import type { RunsPage } from '@/components/admin/crawl-runs/run-data';
import {
  IdentityArt,
  ia_getInitials,
  ia_isDark,
  identityFor,
} from '@/components/consumer/identity-art/IdentityArt';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  GenerateField,
  type GenerateFieldState,
  type GenerateFieldResult,
} from './generate-field/GenerateField';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';

// ── VD Primitives ─────────────────────────────────────────────

interface VDSectionProps {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}

function VDSection({
  eyebrow,
  title,
  subtitle,
  danger,
  children,
}: VDSectionProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: danger
          ? '1px solid color-mix(in oklab, var(--danger) 28%, transparent)'
          : '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 22px',
          borderBottom: danger
            ? '1px solid color-mix(in oklab, var(--danger) 20%, transparent)'
            : '1px solid var(--border)',
        }}
      >
        {danger ? (
          <MonoLabel color="var(--danger)">{eyebrow}</MonoLabel>
        ) : (
          <MonoLabel>{eyebrow}</MonoLabel>
        )}
        <div
          style={{
            marginTop: 4,
            fontFamily: "'Inter', sans-serif",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: 6,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  );
}

interface VDFieldProps {
  label: string;
  htmlFor: string;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  labelRight?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  // For composite controls (e.g. a segmented toggle) where `htmlFor` points
  // at a `role="group"` container rather than a single focusable input.
  // Renders the label as a non-interactive `<span id={`${htmlFor}-label`}>`
  // so the group can reference it via aria-labelledby.
  labelAs?: 'label' | 'group';
}

function VDField({
  label,
  htmlFor,
  description,
  hint,
  labelRight,
  error,
  children,
  labelAs = 'label',
}: VDFieldProps) {
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    color: 'var(--fg)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        {labelAs === 'group' ? (
          <span id={`${htmlFor}-label`} style={labelStyle}>
            {label}
          </span>
        ) : (
          <label htmlFor={htmlFor} style={labelStyle}>
            {label}
          </label>
        )}
        {labelRight}
      </div>
      {description && (
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
            marginTop: -2,
          }}
        >
          {description}
        </div>
      )}
      {children}
      {error && (
        // Announced when it appears (a refused save), and linked to its input:
        // VDInput points aria-describedby at `${id}-error` while invalid.
        <span
          id={`${htmlFor}-error`}
          role="alert"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: 'var(--danger)',
          }}
        >
          {error}
        </span>
      )}
      {!error && hint && (
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
            marginTop: 6,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

interface VDInputProps {
  id: string;
  type?: string;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hasError?: boolean;
  min?: number;
  max?: number;
  step?: number;
  list?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  style?: React.CSSProperties;
}

function VDInput({
  id,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  disabled,
  readOnly,
  hasError,
  min,
  max,
  step,
  list,
  inputRef,
  onChange,
  onBlur,
  style,
}: VDInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError
    ? 'var(--danger)'
    : focused
      ? 'var(--signal)'
      : 'var(--border-strong)';
  const ring = focused
    ? hasError
      ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
      : '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
    : 'none';

  return (
    <input
      ref={inputRef}
      id={id}
      type={type}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? `${id}-error` : undefined}
      min={min}
      max={max}
      step={step}
      list={list}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={(evt) => {
        setFocused(false);
        onBlur?.(evt);
      }}
      style={{
        width: '100%',
        height: 36,
        padding: '0 4px 0 12px',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box' as const,
        opacity: disabled || readOnly ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
        boxShadow: ring,
        transition: 'border-color .12s, box-shadow .12s',
        ...style,
      }}
    />
  );
}

interface VDSegToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  id?: string;
  ariaLabelledBy?: string;
}

function VDSegToggle({
  options,
  value,
  onChange,
  disabled,
  id,
  ariaLabelledBy,
}: VDSegToggleProps) {
  return (
    <div
      role="group"
      id={id}
      aria-labelledby={ariaLabelledBy}
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        gap: 0,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => !disabled && onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: isActive ? 'var(--signal)' : 'transparent',
              color: isActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'background .12s, color .12s',
              opacity: disabled ? 0.66 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Other local helpers ───────────────────────────────────────

// ── Main component ───────────────────────────────────────────

interface Props {
  venue: VenueWithCrawlHealth;
  /** #764 first-timer guide draft, fetched server-side alongside the venue. */
  guide?: VenueGuide;
  /** True when that fetch failed — authoring is disabled so an empty fallback
      draft can't be saved over real chips. */
  guideLoadFailed?: boolean;
  /** The tab `?tab=` opened on (3b); Overview when absent. */
  initialTab?: VenueTab;
  /** Overview's runs and Needs you fetches; null where one failed. */
  overview?: OverviewData;
  /** The Runs tab's first page (null when it failed) and the `?run=` to highlight. */
  runs?: { runs: RunsPage | null; initialRun: string | null };
}

const NO_OVERVIEW: OverviewData = { runs: [], needsYou: [], snoozes: [] };
const NO_RUNS: NonNullable<Props['runs']> = {
  runs: { rows: [], returned: 0 },
  initialRun: null,
};

const TAB_COPY = ADMIN_COPY.venueDetailsClient.tabs;
const VENUE_TAB_LABEL: Record<VenueTab, string> = {
  overview: TAB_COPY.overview,
  runs: TAB_COPY.runs,
  source: TAB_COPY.source,
  details: TAB_COPY.details,
  guide: TAB_COPY.guide,
};
const VENUE_TAB_ITEMS = VENUE_TABS.map((key) => ({
  key,
  label: VENUE_TAB_LABEL[key],
}));
const venueTabId = (key: VenueTab) => `venue-tab-${key}`;
const venuePanelId = (key: VenueTab) => `venue-panel-${key}`;

const STICKY_BOTTOM: React.CSSProperties = { position: 'sticky', bottom: 0 };

/**
 * One tab's panel. Every panel stays mounted, only hidden, so a tab's unsaved
 * edit and its Save bar survive a tab switch (3b part 1).
 */
function VenueTabPanel({
  tab,
  active,
  children,
}: {
  tab: VenueTab;
  active: VenueTab;
  children: React.ReactNode;
}) {
  const on = tab === active;
  return (
    <div
      id={venuePanelId(tab)}
      role="tabpanel"
      aria-labelledby={venueTabId(tab)}
      hidden={!on}
      tabIndex={0}
      data-testid={`venue-panel-${tab}`}
      // An inline display would beat `hidden`, so a hidden panel sets none.
      style={
        on ? { display: 'flex', flexDirection: 'column', gap: 16 } : undefined
      }
    >
      {children}
    </div>
  );
}

const EMPTY_GUIDE: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
};

export function VenueDetailsClient({
  venue,
  guide = EMPTY_GUIDE,
  guideLoadFailed = false,
  initialTab = 'overview',
  overview = NO_OVERVIEW,
  runs = NO_RUNS,
}: Props) {
  const router = useRouter();
  const isPhone = useIsPhone();
  // One re-crawl for the page: the header's Re-crawl and Overview's Re-crawl
  // anyway read and start the same one.
  const recrawl = useRecrawl(venue.id, recrawlOff(venue) !== null);
  const [tab, setTab] = useState<VenueTab>(initialTab);
  // A navigation to another `?tab=` re-renders the page with a new initial
  // tab; follow it (adjusting state during render, not in an effect).
  const [tabFromUrl, setTabFromUrl] = useState<VenueTab>(initialTab);
  if (tabFromUrl !== initialTab) {
    setTabFromUrl(initialTab);
    setTab(initialTab);
  }
  const tablistRef = useRef<HTMLDivElement | null>(null);
  /**
   * Client-only: the tab lives in state and the URL follows through
   * `history.replaceState`, which the App Router syncs with
   * `useSearchParams` without a server round trip, so nothing re-renders
   * the page or shows `loading.tsx`. The server reads `?tab=` on first load.
   */
  const changeTab = (next: VenueTab) => {
    if (next === tab) return;
    setTab(next);
    window.history.replaceState(
      window.history.state,
      '',
      venueTabHref(venue.id, next),
    );
    // Scroll ruling: a strip scrolled above the fold comes back into view, so
    // the new panel starts at its top; otherwise the page stays put.
    const strip = tablistRef.current;
    if (strip && strip.getBoundingClientRect().top < 0) {
      strip.scrollIntoView({ block: 'start' });
    }
  };
  const { setPageTitle, setPhoneBack } = usePageTitle();

  useEffect(() => {
    setPageTitle(venue.name);
    return () => setPageTitle(null);
  }, [venue.name, setPageTitle]);

  // The phone boards (venue-overview-m, source-feed-edited) draw "‹ Venues"
  // above the venue's own header, in place of the shared title bar.
  useEffect(() => {
    setPhoneBack({ label: ADMIN_COPY.venuesList.title, href: '/admin/venues' });
    return () => setPhoneBack(null);
  }, [setPhoneBack]);

  // The older Details sections still here until 3b part 5b: City, About and
  // its generate, and the identity-art preview. The Venue, Tickets and
  // Contact cards (`DetailsTab`) and Source (`SourceTab`) save their own
  // fields through their own bars.
  const cityRef = useRef<HTMLInputElement>(null);
  const [cityVal, setCityVal] = useState(venue.city);
  const [aboutVal, setAboutVal] = useState(venue.about ?? '');
  const dirtyFields: string[] = [
    ...(cityVal !== venue.city ? ['City'] : []),
    ...(aboutVal !== (venue.about ?? '') ? ['About'] : []),
  ];
  const isDirty = dirtyFields.length > 0;

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Responsive breakpoint
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (evt: MediaQueryListEvent) => setIsMobile(evt.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Identity art preview state
  const [artNamespace, setArtNamespace] = useState<'venue' | 'artist'>('venue');
  const [artSeedNum, setArtSeedNum] = useState(0);
  const artSeedStr =
    artSeedNum === 0 ? venue.name : `${venue.name}·${artSeedNum}`;

  // Generate-about state
  const [generateState, setGenerateState] =
    useState<GenerateFieldState>('idle');
  const [generateResult, setGenerateResult] = useState<
    GenerateFieldResult | undefined
  >();
  const [generateError, setGenerateError] = useState<string | undefined>();

  async function handleGenerateAbout() {
    setGenerateState('loading');
    setGenerateError(undefined);
    setGenerateResult(undefined);
    try {
      const result = await generateVenueAbout(venue.id);
      if (!result.success || !result.data) {
        setGenerateError(
          result.error ?? ADMIN_COPY.venueDetailsClient.errors.generationFailed,
        );
        setGenerateState('error');
        return;
      }
      // Only the About text for now: the drafted capacity, type and
      // neighborhood fill the Venue card once About moves into it (part 5b).
      setGenerateResult({ content: result.data.about });
      setGenerateState('review');
    } catch {
      setGenerateError(ADMIN_COPY.venueDetailsClient.errors.networkError);
      setGenerateState('error');
    }
  }

  function handleGenerateAccept(content: string) {
    setAboutVal(content);
    setGenerateState('accepted');
    setTimeout(() => setGenerateState('idle'), 4000);
  }

  function handleGenerateDiscard() {
    setGenerateState('idle');
    setGenerateResult(undefined);
  }

  const isDisabled = saveState === 'saving';

  function handleDiscard() {
    setCityVal(venue.city);
    setAboutVal(venue.about ?? '');
    setSaveState('idle');
    setSaveError(null);
    if (cityRef.current) cityRef.current.value = venue.city;
  }

  async function handleSave() {
    setSaveError(null);
    setSaveState('saving');

    // Only this bar's fields, City and About. The Venue, Tickets and Contact
    // cards and Source each send their own, and the crawl rules (request
    // delay, robots.txt) are never sent: the API refuses them. `active` is
    // left out on purpose: Pause and Activate own it.
    const formData = new FormData();
    formData.set('city', cityVal.trim() || 'Denver');
    formData.set('about', aboutVal.trim());

    try {
      const result = await updateVenue(venue.id, formData);
      if (!result.success) {
        setSaveError(
          result.error ?? ADMIN_COPY.venueDetailsClient.errors.saveFailed,
        );
        setSaveState('error');
        return;
      }
      setSaveState('saved');
      setTimeout(() => {
        setSaveState('idle');
        router.refresh();
      }, 1200);
    } catch {
      setSaveError(ADMIN_COPY.venueDetailsClient.errors.unexpected);
      setSaveState('error');
    }
  }

  /**
   * The City and About bar. Pinned to the bottom edge everywhere but Details,
   * where it sits in flow because DetailsTab's own bar holds that edge.
   */
  const legacySaveBar = (sticky: boolean) => (
    <div
      data-testid="venue-legacy-save-bar"
      style={{
        ...(sticky ? STICKY_BOTTOM : {}),
        marginTop: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 -6px 18px rgba(0,0,0,0.08)',
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Pill badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 20,
            border:
              '1px solid color-mix(in oklab, var(--warning) 38%, transparent)',
            background:
              'color-mix(in oklab, var(--warning) 10%, var(--bg-elevated))',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--warning)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--warning)',
              flexShrink: 0,
            }}
          />
          {dirtyFields.length} {ADMIN_COPY.venueDetailsClient.saveBar.unsaved}{' '}
          {dirtyFields.length === 1
            ? ADMIN_COPY.venueDetailsClient.saveBar.unsavedChange
            : ADMIN_COPY.venueDetailsClient.saveBar.unsavedChanges}
        </span>
        {/* Dirty field names */}
        {!isMobile && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 320,
            }}
          >
            {dirtyFields.join(' · ')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isDisabled}
          style={{
            background: 'none',
            border: 'none',
            padding: '0 4px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--fg-muted)',
          }}
        >
          {ADMIN_COPY.venueDetailsClient.saveBar.discard}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isDisabled}
          style={{
            background: 'var(--signal)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 16px',
            color: 'var(--fg-on-accent)',
            fontSize: 13,
            fontWeight: 700,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {saveState === 'saving' ? (
            <>
              <Loader2
                size={12}
                style={{ animation: 'spin 1s linear infinite' }}
              />
              {ADMIN_COPY.venueDetailsClient.saveBar.saving}
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check size={12} />
              {ADMIN_COPY.venueDetailsClient.saveBar.saved}
            </>
          ) : (
            <>
              <Check size={12} />
              {ADMIN_COPY.venueDetailsClient.saveBar.saveChanges}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 1080,
        paddingBottom: 32,
        position: 'relative',
      }}
    >
      {/* The venue header holds the page's one h1 (the venue name). */}
      <VenueHeader venue={venue} recrawl={recrawl} />

      <AdminTabs
        tabs={VENUE_TAB_ITEMS}
        value={tab}
        onChange={changeTab}
        label={TAB_COPY.label}
        tabId={venueTabId}
        panelId={venuePanelId}
        phone={isPhone}
        tablistRef={tablistRef}
        testId="venue-tabs"
      />

      {/* Error banner */}
      {saveError && (
        <div
          role="alert"
          data-testid="venue-save-error"
          style={{
            padding: '10px 14px',
            background: 'rgba(184,56,26,0.1)',
            border: '1px solid rgba(184,56,26,0.25)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <AlertCircle size={14} />
          {saveError}
        </div>
      )}

      <VenueTabPanel tab="overview" active={tab}>
        <OverviewTab venue={venue} data={overview} recrawl={recrawl} />
      </VenueTabPanel>

      <VenueTabPanel tab="runs" active={tab}>
        <RunsTab
          venueId={venue.id}
          runs={runs.runs}
          initialRun={runs.initialRun}
          active={tab === 'runs'}
        />
      </VenueTabPanel>

      <VenueTabPanel tab="details" active={tab}>
        {/* The Venue, Tickets and Contact cards, with their own Save bar
            (3b part 5a). */}
        <DetailsTab venue={venue} />

        {/* Until part 5b: City, About and the identity-art preview, saved by
            this page's bar below. */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.identity.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.identity.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* City (Live and Hidden are the header's chip and ⋯ menu) */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.city}
              htmlFor="edit-venue-city"
            >
              <VDInput
                id="edit-venue-city"
                inputRef={cityRef}
                defaultValue={venue.city}
                disabled={isDisabled}
                onChange={(evt) => setCityVal(evt.target.value)}
              />
            </VDField>
          </div>
        </VDSection>

        {/* 04 · editorial */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.editorial.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.editorial.title}
          subtitle={
            <>
              {ADMIN_COPY.venueDetailsClient.sections.editorial.subtitle}{' '}
              <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {ADMIN_COPY.venueDetailsClient.sections.editorial.llmNote}
              </strong>{' '}
              {ADMIN_COPY.venueDetailsClient.sections.editorial.llmSuffix}
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* About */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.about.label}
              htmlFor="edit-venue-about"
              description={
                ADMIN_COPY.venueDetailsClient.fields.about.description
              }
              labelRight={
                generateState === 'idle' || generateState === 'accepted' ? (
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => void handleGenerateAbout()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border:
                        '1px solid color-mix(in oklab, var(--accent) 34%, transparent)',
                      background:
                        'color-mix(in oklab, var(--accent) 8%, var(--bg-elevated))',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      opacity: isDisabled ? 0.66 : 1,
                    }}
                  >
                    <Sparkles size={11} />
                    {ADMIN_COPY.venueDetailsClient.fields.about.generate}
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        opacity: 0.75,
                        fontWeight: 600,
                      }}
                    >
                      {ADMIN_COPY.venueDetailsClient.fields.about.generateCost}
                    </span>
                  </button>
                ) : null
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  id="edit-venue-about"
                  value={aboutVal}
                  placeholder={
                    ADMIN_COPY.venueDetailsClient.fields.about.placeholder
                  }
                  disabled={
                    isDisabled ||
                    generateState === 'loading' ||
                    generateState === 'review'
                  }
                  rows={5}
                  onChange={(evt) => setAboutVal(evt.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--fg)',
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                    resize: 'vertical' as const,
                    lineHeight: 1.5,
                    opacity: isDisabled ? 0.66 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'text',
                    transition: 'border-color .12s',
                  }}
                />
                {generateState !== 'idle' && (
                  <GenerateField
                    state={generateState}
                    {...(generateResult ? { result: generateResult } : {})}
                    {...(generateError ? { errorMessage: generateError } : {})}
                    onGenerate={() => void handleGenerateAbout()}
                    onRegenerate={() => void handleGenerateAbout()}
                    onCancel={handleGenerateDiscard}
                    onAccept={handleGenerateAccept}
                    onDiscard={handleGenerateDiscard}
                  />
                )}
              </div>
            </VDField>
          </div>
        </VDSection>

        {/* City and About's bar, in flow under them. DetailsTab's bar sticks
            only inside DetailsTab's box, so pinned here the two would stack
            while the cards are in view. Until 7b folds City and About into
            the cards, each bar sits with the fields it saves. */}
        {isDirty && legacySaveBar(false)}

        {/* 05 · identity art */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.identityArt.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.identityArt.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Description */}
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg-muted)',
                lineHeight: 1.55,
              }}
            >
              {ADMIN_COPY.venueDetailsClient.sections.identityArt.description}{' '}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: 'var(--accent)',
                }}
              >
                (venue · {venue.name})
              </span>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Preview tile */}
              <div
                style={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  flexShrink: 0,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <IdentityArt
                  name={artSeedStr}
                  kind={artNamespace}
                  scale="tile"
                  grain={0.08}
                  width={96}
                  height={96}
                />
                {/* Monogram chip, drawn here rather than by IdentityArt:
                    #1525 retired the chip internal to IdentityArt. This
                    preview mirrors the venues index, which keeps its own
                    overlay — venue imagery is a separate handoff. */}
                {(() => {
                  const identity = identityFor(artSeedStr, artNamespace);
                  const dark = ia_isDark(identity.palette.bg);
                  const initials = ia_getInitials(artSeedStr, 2);
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: 6,
                        bottom: 6,
                        padding: '2px 6px',
                        borderRadius: 5,
                        background: dark
                          ? 'rgba(0,0,0,0.55)'
                          : 'rgba(255,255,255,0.78)',
                        backdropFilter: 'blur(4px)',
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 900,
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: dark ? '#F1E6D5' : '#191418',
                        lineHeight: 1,
                      }}
                    >
                      {initials}
                    </div>
                  );
                })()}
              </div>

              {/* Controls — 2-column grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12,
                  flex: 1,
                }}
              >
                <VDField
                  label={ADMIN_COPY.venueDetailsClient.fields.namespace.label}
                  htmlFor="edit-venue-art-namespace"
                  hint={ADMIN_COPY.venueDetailsClient.fields.namespace.hint}
                >
                  <div style={{ alignSelf: 'flex-start' }}>
                    <VDSegToggle
                      options={[
                        {
                          value: 'venue',
                          label:
                            ADMIN_COPY.venueDetailsClient.fields.namespace
                              .venue,
                        },
                        {
                          value: 'artist',
                          label:
                            ADMIN_COPY.venueDetailsClient.fields.namespace
                              .artist,
                        },
                      ]}
                      value={artNamespace}
                      onChange={(val) =>
                        setArtNamespace(val as 'venue' | 'artist')
                      }
                    />
                  </div>
                </VDField>

                <VDField
                  label={ADMIN_COPY.venueDetailsClient.fields.seed.label}
                  htmlFor="edit-venue-art-seed"
                  hint={
                    artSeedNum === 0
                      ? ADMIN_COPY.venueDetailsClient.fields.seed.lockedHint
                      : `${ADMIN_COPY.venueDetailsClient.fields.seed.bumpedHint} ${artSeedNum}`
                  }
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <VDInput
                      id="edit-venue-art-seed"
                      value={artSeedNum === 0 ? '' : String(artSeedNum)}
                      placeholder="0"
                      disabled
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setArtSeedNum((prev) => prev + 1)}
                      style={{
                        flexShrink: 0,
                        height: 36,
                        padding: '0 14px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 8,
                        background: 'var(--surface-1)',
                        color: 'var(--fg-muted)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {ADMIN_COPY.venueDetailsClient.fields.seed.rollButton}
                    </button>
                  </div>
                </VDField>
              </div>
            </div>

            {/* Phase 8 warning banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                border:
                  '1px solid color-mix(in oklab, var(--warning) 32%, transparent)',
                background:
                  'color-mix(in oklab, var(--warning) 8%, var(--bg-elevated))',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--warning)',
                lineHeight: 1.45,
              }}
            >
              <span style={{ fontWeight: 700, flexShrink: 0 }}>
                {ADMIN_COPY.venueDetailsClient.sections.identityArt.phase8Label}
              </span>
              <span>
                {
                  ADMIN_COPY.venueDetailsClient.sections.identityArt
                    .phase8Warning
                }
              </span>
            </div>
          </div>
        </VDSection>
      </VenueTabPanel>

      <VenueTabPanel tab="source" active={tab}>
        {/* Source has its own save (3b part 6); the page's bar never sends
            its fields. */}
        <SourceTab venue={venue} />
      </VenueTabPanel>

      <VenueTabPanel tab="guide" active={tab}>
        {/* #764 first-timer guide — its own resource with its own publish
            gate, so it renders as a standalone block rather than a VDSection. */}
        <VenueGuideBlock
          venueId={venue.id}
          venueName={venue.name}
          initialGuide={guide}
          loadFailed={guideLoadFailed}
        />
      </VenueTabPanel>

      {/* The old danger zone's controls live in the header's ⋯ now. */}

      {/* Sticky save bar for City and About. Source and Details pin their own
          bars to the same edge, so on Source it steps aside (its edits wait
          for the tab they live on) and on Details it sits in the panel's
          flow, under the old sections, so neither bar hides the other. */}
      {isDirty && tab !== 'source' && tab !== 'details' && legacySaveBar(true)}
    </div>
  );
}
