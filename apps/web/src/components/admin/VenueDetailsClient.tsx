'use client';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

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
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

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

interface VDSelectProps {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
}

function VDSelect({ id, value, disabled, onChange, children }: VDSelectProps) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        height: 36,
        padding: '0 28px 0 12px',
        border: `1px solid ${focused ? 'var(--signal)' : 'var(--border-strong)'}`,
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box' as const,
        opacity: disabled ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        boxShadow: focused
          ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
          : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}
    >
      {children}
    </select>
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
/** The fields a save can be refused on, and where each one lives. */
type RefusedField = 'slug';
const REFUSED_FIELD_HOME: Record<
  RefusedField,
  { tab: VenueTab; inputId: string; label: string }
> = {
  slug: {
    tab: 'details',
    inputId: 'edit-venue-slug',
    label: ADMIN_COPY.venueDetailsClient.fields.slug.label,
  },
};
const venueTabId = (key: VenueTab) => `venue-tab-${key}`;
const venuePanelId = (key: VenueTab) => `venue-panel-${key}`;

/**
 * One tab's panel. Every panel stays mounted, only hidden, so the one form
 * and save bar keep an unsaved edit across a tab switch (3b part 1).
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
  // An input to focus once its panel is showing (a refused save).
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    const inputId = focusAfterRender.current;
    if (!inputId) return;
    focusAfterRender.current = null;
    document.getElementById(inputId)?.focus();
  });
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
  /** A refused save: open the field's tab, focus it, and say which field. */
  const refuseField = (field: RefusedField, message: string) => {
    const home = REFUSED_FIELD_HOME[field];
    setFieldErrors({ [field]: message });
    // The banner names the field and its tab; the reason stays at the field.
    setSaveError(TAB_COPY.refused(home.label, VENUE_TAB_LABEL[home.tab]));
    focusAfterRender.current = home.inputId;
    changeTab(home.tab);
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

  // Form refs (uncontrolled inputs)
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  // Controlled state. Source's fields (how the venue is read, the calendar
  // page) live in `SourceTab` with its own save (3b part 6).
  const [nameVal, setNameVal] = useState(venue.name);
  const [slugVal, setSlugVal] = useState(venue.slug);
  const [cityVal, setCityVal] = useState(venue.city);
  const [addressVal, setAddressVal] = useState(venue.address ?? '');
  const [ticketVendorVal, setTicketVendorVal] = useState<string | null>(
    venue.ticketVendor ?? null,
  );
  const [priceUrlVal, setPriceUrlVal] = useState(venue.priceUrl ?? '');
  const [capacityVal, setCapacityVal] = useState<string>(
    venue.capacity != null ? String(venue.capacity) : '',
  );
  const [venueTypeVal, setVenueTypeVal] = useState(venue.venueType ?? '');
  const [aboutVal, setAboutVal] = useState(venue.about ?? '');
  const [neighborhoodVal, setNeighborhoodVal] = useState(
    venue.neighborhood ?? '',
  );
  const [slugManual, setSlugManual] = useState(true);
  const [slugFocused, setSlugFocused] = useState(false);
  const dirtyFields: string[] = [
    ...(nameVal !== venue.name ? ['Name'] : []),
    ...(slugVal !== venue.slug ? ['Slug'] : []),
    ...(cityVal !== venue.city ? ['City'] : []),
    ...(addressVal !== (venue.address ?? '') ? ['Address'] : []),
    ...(ticketVendorVal !== (venue.ticketVendor ?? null)
      ? ['Ticket vendor']
      : []),
    ...(priceUrlVal !== (venue.priceUrl ?? '') ? ['Price URL'] : []),
    ...(capacityVal !== (venue.capacity != null ? String(venue.capacity) : '')
      ? ['Capacity']
      : []),
    ...(venueTypeVal !== (venue.venueType ?? '') ? ['Type'] : []),
    ...(aboutVal !== (venue.about ?? '') ? ['About'] : []),
    ...(neighborhoodVal !== (venue.neighborhood ?? '') ? ['Neighborhood'] : []),
  ];
  const isDirty = dirtyFields.length > 0;

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    slug?: string | undefined;
  }>({});

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
  const [capacityGenerated, setCapacityGenerated] = useState(false);
  const [neighborhoodGenerated, setNeighborhoodGenerated] = useState(false);

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
      const { capacity, venueType, neighborhood, about } = result.data;
      setGenerateResult({ content: about });
      setGenerateState('review');
      // Pre-fill other fields
      setCapacityVal(capacity != null ? String(capacity) : '');
      setCapacityGenerated(true);
      setVenueTypeVal(venueType);
      setNeighborhoodVal(neighborhood);
      setNeighborhoodGenerated(true);
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
    setNameVal(venue.name);
    setSlugVal(venue.slug);
    setCityVal(venue.city);
    setAddressVal(venue.address ?? '');
    setTicketVendorVal(venue.ticketVendor ?? null);
    setPriceUrlVal(venue.priceUrl ?? '');
    setCapacityVal(venue.capacity != null ? String(venue.capacity) : '');
    setVenueTypeVal(venue.venueType ?? '');
    setAboutVal(venue.about ?? '');
    setNeighborhoodVal(venue.neighborhood ?? '');
    setSaveState('idle');
    setSaveError(null);
    setFieldErrors({});
    if (nameRef.current) nameRef.current.value = venue.name;
    if (slugRef.current) slugRef.current.value = venue.slug;
    if (cityRef.current) cityRef.current.value = venue.city;
    if (addressRef.current) addressRef.current.value = venue.address ?? '';
  }

  async function handleSave() {
    setSaveError(null);
    setFieldErrors({});
    setSaveState('saving');

    // Only this bar's fields. Source's (how the venue is read, the calendar
    // page) go through Source's own bar, and the crawl rules (request delay,
    // robots.txt) are never sent: the API refuses them.
    const formData = new FormData();
    formData.set('name', nameVal.trim());
    formData.set('slug', slugVal.trim());
    formData.set('city', cityVal.trim() || 'Denver');
    formData.set('address', addressVal.trim());
    // `active` is left out on purpose: Pause and Activate own it. Resending the
    // value this page loaded with would let a stale tab reactivate a venue
    // paused or removed since. An empty vendor clears it.
    formData.set('ticketVendor', ticketVendorVal ?? '');
    formData.set('capacity', capacityVal.trim());
    formData.set('venueType', venueTypeVal.trim());
    formData.set('about', aboutVal.trim());
    formData.set('neighborhood', neighborhoodVal.trim());
    formData.set('priceUrl', priceUrlVal.trim());

    try {
      const result = await updateVenue(venue.id, formData);
      if (!result.success) {
        if (result.field === 'slug') {
          refuseField(
            'slug',
            result.error ?? ADMIN_COPY.venueDetailsClient.errors.slugInUse,
          );
        } else {
          setSaveError(
            result.error ?? ADMIN_COPY.venueDetailsClient.errors.saveFailed,
          );
        }
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
        {/* 01 · identity */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.identity.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.identity.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Venue name + Slug side by side */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12,
              }}
            >
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.venueName}
                htmlFor="edit-venue-name"
              >
                <VDInput
                  id="edit-venue-name"
                  inputRef={nameRef}
                  defaultValue={venue.name}
                  disabled={isDisabled}
                  onChange={(evt) => {
                    const val = evt.target.value;
                    setNameVal(val);
                    if (!slugManual && slugRef.current) {
                      const generated = slugify(val);
                      slugRef.current.value = generated;
                      setSlugVal(generated);
                    }
                  }}
                />
              </VDField>

              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.slug.label}
                htmlFor="edit-venue-slug"
                {...(fieldErrors.slug ? { error: fieldErrors.slug } : {})}
                labelRight={
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    {
                      ADMIN_COPY.venueDetailsClient.fields.slug
                        .autoGeneratedBadge
                    }
                  </span>
                }
              >
                <div
                  onFocus={() => setSlugFocused(true)}
                  onBlur={() => setSlugFocused(false)}
                  style={{
                    display: 'flex',
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${fieldErrors.slug ? 'var(--danger)' : slugFocused ? 'var(--signal)' : 'var(--border-strong)'}`,
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                    boxShadow: slugFocused
                      ? fieldErrors.slug
                        ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
                        : '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
                      : 'none',
                    transition: 'border-color .12s, box-shadow .12s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      background: 'var(--surface-1)',
                      borderRight: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: 'var(--fg-subtle)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {ADMIN_COPY.venueDetailsClient.fields.slug.prefix}
                  </div>
                  <input
                    ref={slugRef}
                    id="edit-venue-slug"
                    type="text"
                    defaultValue={venue.slug}
                    disabled={isDisabled}
                    onChange={(evt) => {
                      setSlugVal(evt.target.value);
                      setSlugManual(true);
                      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                    }}
                    style={{
                      all: 'unset',
                      flex: 1,
                      minWidth: 0,
                      padding: '0 10px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--fg)',
                      cursor: isDisabled ? 'not-allowed' : 'text',
                      opacity: isDisabled ? 0.66 : 1,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (nameRef.current && slugRef.current) {
                        const generated = slugify(nameRef.current.value);
                        slugRef.current.value = generated;
                        setSlugVal(generated);
                        setSlugManual(false);
                        setFieldErrors((prev) => ({
                          ...prev,
                          slug: undefined,
                        }));
                      }
                    }}
                    disabled={isDisabled}
                    title={
                      ADMIN_COPY.venueDetailsClient.fields.slug.regenerateTitle
                    }
                    style={{
                      flexShrink: 0,
                      width: 36,
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      background: 'var(--surface-1)',
                      color: 'var(--fg-muted)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </VDField>
            </div>

            {/* The calendar page (`website_url`) is Source's now (3b part
                6), saved by Source's own bar. */}

            {/* Street address */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.address.label}
              htmlFor="edit-venue-address"
              hint={ADMIN_COPY.venueDetailsClient.fields.address.hint}
            >
              <VDInput
                id="edit-venue-address"
                inputRef={addressRef}
                defaultValue={venue.address ?? ''}
                placeholder={
                  ADMIN_COPY.venueDetailsClient.fields.address.placeholder
                }
                disabled={isDisabled}
                onChange={(evt) => setAddressVal(evt.target.value)}
              />
            </VDField>

            {/* City, full width (Live and Hidden are the header's chip and ⋯ menu) */}
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

        {/* 02 · ticketing */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.ticketing.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.ticketing.title}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
              gap: 12,
              alignItems: 'start',
            }}
          >
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.primaryVendor}
              htmlFor="edit-venue-ticket-vendor"
            >
              <VDSelect
                id="edit-venue-ticket-vendor"
                value={ticketVendorVal ?? ''}
                disabled={isDisabled}
                onChange={(evt) => setTicketVendorVal(evt.target.value || null)}
              >
                <option value="">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.unknown}
                </option>
                <option value="axs">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.axs}
                </option>
                <option value="ticketmaster">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.ticketmaster}
                </option>
                <option value="seatgeek">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.seatgeek}
                </option>
                <option value="dice">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.dice}
                </option>
                <option value="eventbrite">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.eventbrite}
                </option>
                <option value="venue_box_office">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.venueBoxOffice}
                </option>
                <option value="unknown">
                  {ADMIN_COPY.venueDetailsClient.ticketVendors.unknownValue}
                </option>
              </VDSelect>
            </VDField>
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.ticketUrl.label}
              htmlFor="edit-venue-price-url"
              hint={ADMIN_COPY.venueDetailsClient.fields.ticketUrl.hint}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <VDInput
                  id="edit-venue-price-url"
                  type="url"
                  defaultValue={venue.priceUrl ?? ''}
                  disabled={isDisabled}
                  placeholder={
                    ADMIN_COPY.venueDetailsClient.fields.ticketUrl.placeholder
                  }
                  onChange={(evt) => setPriceUrlVal(evt.target.value)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    flex: 1,
                  }}
                />
                {isSafeHttpUrl(priceUrlVal) && (
                  <a
                    href={priceUrlVal}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--fg-muted)',
                      flexShrink: 0,
                    }}
                    title={
                      ADMIN_COPY.venueDetailsClient.fields.ticketUrl.openTitle
                    }
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
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

            {/* Capacity */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.capacity.label}
              htmlFor="edit-venue-capacity"
              description={
                ADMIN_COPY.venueDetailsClient.fields.capacity.description
              }
            >
              <VDInput
                id="edit-venue-capacity"
                type="number"
                value={capacityVal}
                placeholder={
                  ADMIN_COPY.venueDetailsClient.fields.capacity.placeholder
                }
                disabled={isDisabled}
                min={1}
                onChange={(evt) => {
                  setCapacityVal(evt.target.value);
                  setCapacityGenerated(false);
                }}
              />
              {capacityGenerated && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 4,
                    padding: '3px 8px',
                    borderRadius: 20,
                    border:
                      '1px solid color-mix(in oklab, var(--success) 38%, transparent)',
                    background:
                      'color-mix(in oklab, var(--success) 5%, var(--bg-elevated))',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--success)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--success)',
                      flexShrink: 0,
                    }}
                  />
                  {ADMIN_COPY.venueDetailsClient.fields.capacity.generatedBadge}
                </span>
              )}
            </VDField>

            {/* Neighborhood */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.neighborhood.label}
              htmlFor="edit-venue-neighborhood"
              description={
                ADMIN_COPY.venueDetailsClient.fields.neighborhood.description
              }
            >
              <VDInput
                id="edit-venue-neighborhood"
                value={neighborhoodVal}
                placeholder={
                  ADMIN_COPY.venueDetailsClient.fields.neighborhood.placeholder
                }
                disabled={isDisabled}
                onChange={(evt) => {
                  setNeighborhoodVal(evt.target.value);
                  setNeighborhoodGenerated(false);
                }}
              />
              {neighborhoodGenerated && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 4,
                    padding: '3px 8px',
                    borderRadius: 20,
                    border:
                      '1px solid color-mix(in oklab, var(--success) 38%, transparent)',
                    background:
                      'color-mix(in oklab, var(--success) 5%, var(--bg-elevated))',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--success)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--success)',
                      flexShrink: 0,
                    }}
                  />
                  {
                    ADMIN_COPY.venueDetailsClient.fields.neighborhood
                      .generatedBadge
                  }
                </span>
              )}
            </VDField>
          </div>
        </VDSection>

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

      {/* Sticky save bar. Source pins its own bar to the same edge, so this
          one steps aside on Source; its edits wait for the tab they live on. */}
      {isDirty && tab !== 'source' && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
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
              {dirtyFields.length}{' '}
              {ADMIN_COPY.venueDetailsClient.saveBar.unsaved}{' '}
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
      )}
    </div>
  );
}
