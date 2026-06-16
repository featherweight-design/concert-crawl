'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VenueWithCrawlHealth } from '@concert-crawl/types'
import {
  updateVenue,
  pauseVenue,
  activateVenue,
  setVenueFeatured,
  generateVenueAbout,
} from '@/lib/actions/venues'
import {
  AdminButton,
  MonoLabel,
  StatusBadge,
  RelTime,
  SectionHead,
} from '@/components/admin/primitives'
import { deriveVenueStatus } from '@/lib/admin/venue-status'
import {
  IdentityArt,
  ia_getInitials,
  ia_isDark,
  identityFor,
} from '@/components/consumer/identity-art/IdentityArt'
import { DeleteVenueConfirm } from './DeleteVenueConfirm'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  GenerateField,
  type GenerateFieldState,
  type GenerateFieldResult,
} from './generate-field/GenerateField'
import { CrawlTriggerButton } from './crawl-trigger-button/CrawlTriggerButton'
import { usePageTitle } from '@/components/admin/shell/PageTitleContext'
import {
  ExternalLink,
  RefreshCw,
  Star,
  Pause,
  Play,
  AlertCircle,
  Check,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function strategyLabel(strategy: string | null): string {
  if (strategy === 'structured_data') return 'structured'
  if (strategy === 'llm') return 'llm'
  if (strategy === 'manual') return 'manual'
  return 'auto'
}

function strategyKind(
  strategy: string | null,
): 'signal' | 'accent' | 'neutral' {
  if (strategy === 'structured_data') return 'signal'
  if (strategy === 'llm') return 'accent'
  return 'neutral'
}

// ── VD Primitives ─────────────────────────────────────────────

interface VDSectionProps {
  eyebrow: string
  title: string
  subtitle?: React.ReactNode
  danger?: boolean
  children: React.ReactNode
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
  )
}

interface VDFieldProps {
  label: string
  htmlFor: string
  description?: React.ReactNode
  hint?: React.ReactNode
  labelRight?: React.ReactNode
  error?: string
  children: React.ReactNode
  // For composite controls (e.g. a segmented toggle) where `htmlFor` points
  // at a `role="group"` container rather than a single focusable input.
  // Renders the label as a non-interactive `<span id={`${htmlFor}-label`}>`
  // so the group can reference it via aria-labelledby.
  labelAs?: 'label' | 'group'
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
  }
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
        <span
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
  )
}

interface VDInputProps {
  id: string
  type?: string
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  min?: number
  max?: number
  step?: number
  list?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  style?: React.CSSProperties
}

function VDInput({
  id,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  disabled,
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
  const [focused, setFocused] = useState(false)
  const borderColor = hasError
    ? 'var(--danger)'
    : focused
      ? 'var(--signal)'
      : 'var(--border-strong)'
  const ring = focused
    ? hasError
      ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
      : '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
    : 'none'

  return (
    <input
      ref={inputRef}
      id={id}
      type={type}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      list={list}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={(evt) => {
        setFocused(false)
        onBlur?.(evt)
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
        opacity: disabled ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxShadow: ring,
        transition: 'border-color .12s, box-shadow .12s',
        ...style,
      }}
    />
  )
}

interface VDSelectProps {
  id: string
  value: string
  disabled?: boolean
  onChange: React.ChangeEventHandler<HTMLSelectElement>
  children: React.ReactNode
}

function VDSelect({ id, value, disabled, onChange, children }: VDSelectProps) {
  const [focused, setFocused] = useState(false)
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
  )
}

interface VDSegToggleProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  id?: string
  ariaLabelledBy?: string
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
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
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
        )
      })}
    </div>
  )
}

// ── Other local helpers ───────────────────────────────────────

function RobotsHint({ allowed }: { allowed: boolean | null }) {
  if (allowed === null)
    return (
      <StatusBadge kind="neutral" variant="mono">
        {ADMIN_COPY.venueDetailsClient.robots.unchecked}
      </StatusBadge>
    )
  if (allowed)
    return (
      <StatusBadge kind="success" variant="mono">
        {ADMIN_COPY.venueDetailsClient.robots.allowed}
      </StatusBadge>
    )
  return (
    <StatusBadge kind="danger" variant="mono">
      {ADMIN_COPY.venueDetailsClient.robots.blocked}
    </StatusBadge>
  )
}

// ── Main component ───────────────────────────────────────────

interface Props {
  venue: VenueWithCrawlHealth
}

export function VenueDetailsClient({ venue }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { setPageTitle } = usePageTitle()

  useEffect(() => {
    setPageTitle(venue.name)
    return () => setPageTitle(null)
  }, [venue.name, setPageTitle])

  // Form refs (uncontrolled inputs)
  const nameRef = useRef<HTMLInputElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const websiteUrlRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const crawlDelayRef = useRef<HTMLInputElement>(null)

  // Controlled state
  const [nameVal, setNameVal] = useState(venue.name)
  const [slugVal, setSlugVal] = useState(venue.slug)
  const [urlVal, setUrlVal] = useState(venue.websiteUrl)
  const [cityVal, setCityVal] = useState(venue.city)
  const [addressVal, setAddressVal] = useState(venue.address ?? '')
  const [waitUntilVal, setWaitUntilVal] = useState(venue.crawlWaitUntil)
  const [crawlDelayVal, setCrawlDelayVal] = useState(venue.crawlDelayMs)
  const [waitForSelectorVal, setWaitForSelectorVal] = useState(
    venue.crawlWaitForSelector ?? '',
  )
  const [ticketVendorVal, setTicketVendorVal] = useState<string | null>(
    venue.ticketVendor ?? null,
  )
  const [priceUrlVal, setPriceUrlVal] = useState(venue.priceUrl ?? '')
  const [crawlModeVal, setCrawlModeVal] = useState<'http' | 'browser' | null>(
    venue.crawlMode ?? null,
  )
  const [extractionStrategyVal, setExtractionStrategyVal] = useState<
    'structured_data' | 'llm' | 'manual' | null
  >(venue.extractionStrategy ?? null)
  const [debugCaptureHtmlVal, setDebugCaptureHtmlVal] = useState(
    venue.debugCaptureHtml,
  )
  const [capacityVal, setCapacityVal] = useState<string>(
    venue.capacity != null ? String(venue.capacity) : '',
  )
  const [venueTypeVal, setVenueTypeVal] = useState(venue.venueType ?? '')
  const [aboutVal, setAboutVal] = useState(venue.about ?? '')
  const [neighborhoodVal, setNeighborhoodVal] = useState(
    venue.neighborhood ?? '',
  )
  const [slugManual, setSlugManual] = useState(true)
  const [slugFocused, setSlugFocused] = useState(false)
  const dirtyFields: string[] = [
    ...(nameVal !== venue.name ? ['Name'] : []),
    ...(slugVal !== venue.slug ? ['Slug'] : []),
    ...(urlVal !== venue.websiteUrl ? ['URL'] : []),
    ...(cityVal !== venue.city ? ['City'] : []),
    ...(addressVal !== (venue.address ?? '') ? ['Address'] : []),
    ...(waitUntilVal !== venue.crawlWaitUntil ? ['Wait until'] : []),
    ...(crawlDelayVal !== venue.crawlDelayMs ? ['Crawl delay'] : []),
    ...((waitForSelectorVal || null) !== venue.crawlWaitForSelector
      ? ['Selector']
      : []),
    ...(ticketVendorVal !== (venue.ticketVendor ?? null)
      ? ['Ticket vendor']
      : []),
    ...(priceUrlVal !== (venue.priceUrl ?? '') ? ['Price URL'] : []),
    ...(crawlModeVal !== (venue.crawlMode ?? null) ? ['Fetch mode'] : []),
    ...(extractionStrategyVal !== (venue.extractionStrategy ?? null)
      ? ['Strategy']
      : []),
    ...(debugCaptureHtmlVal !== venue.debugCaptureHtml
      ? ['Debug capture']
      : []),
    ...(capacityVal !== (venue.capacity != null ? String(venue.capacity) : '')
      ? ['Capacity']
      : []),
    ...(venueTypeVal !== (venue.venueType ?? '') ? ['Type'] : []),
    ...(aboutVal !== (venue.about ?? '') ? ['About'] : []),
    ...(neighborhoodVal !== (venue.neighborhood ?? '') ? ['Neighborhood'] : []),
  ]
  const isDirty = dirtyFields.length > 0

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ slug?: string | undefined }>(
    {},
  )

  // Responsive breakpoint
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsMobile(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Identity art preview state
  const [artNamespace, setArtNamespace] = useState<'venue' | 'artist'>('venue')
  const [artSeedNum, setArtSeedNum] = useState(0)
  const artSeedStr =
    artSeedNum === 0 ? venue.name : `${venue.name}·${artSeedNum}`

  // Generate-about state
  const [generateState, setGenerateState] = useState<GenerateFieldState>('idle')
  const [generateResult, setGenerateResult] = useState<
    GenerateFieldResult | undefined
  >()
  const [generateError, setGenerateError] = useState<string | undefined>()
  const [capacityGenerated, setCapacityGenerated] = useState(false)
  const [neighborhoodGenerated, setNeighborhoodGenerated] = useState(false)

  async function handleGenerateAbout() {
    setGenerateState('loading')
    setGenerateError(undefined)
    setGenerateResult(undefined)
    try {
      const result = await generateVenueAbout(venue.id)
      if (!result.success || !result.data) {
        setGenerateError(
          result.error ?? ADMIN_COPY.venueDetailsClient.errors.generationFailed,
        )
        setGenerateState('error')
        return
      }
      const { capacity, venueType, neighborhood, about } = result.data
      setGenerateResult({ content: about })
      setGenerateState('review')
      // Pre-fill other fields
      setCapacityVal(capacity != null ? String(capacity) : '')
      setCapacityGenerated(true)
      setVenueTypeVal(venueType)
      setNeighborhoodVal(neighborhood)
      setNeighborhoodGenerated(true)
    } catch {
      setGenerateError(ADMIN_COPY.venueDetailsClient.errors.networkError)
      setGenerateState('error')
    }
  }

  function handleGenerateAccept(content: string) {
    setAboutVal(content)
    setGenerateState('accepted')
    setTimeout(() => setGenerateState('idle'), 4000)
  }

  function handleGenerateDiscard() {
    setGenerateState('idle')
    setGenerateResult(undefined)
  }

  const isDisabled = saveState === 'saving'

  function handleDiscard() {
    setNameVal(venue.name)
    setSlugVal(venue.slug)
    setUrlVal(venue.websiteUrl)
    setCityVal(venue.city)
    setAddressVal(venue.address ?? '')
    setWaitUntilVal(venue.crawlWaitUntil)
    setCrawlDelayVal(venue.crawlDelayMs)
    setWaitForSelectorVal(venue.crawlWaitForSelector ?? '')
    setTicketVendorVal(venue.ticketVendor ?? null)
    setPriceUrlVal(venue.priceUrl ?? '')
    setCrawlModeVal(venue.crawlMode ?? null)
    setExtractionStrategyVal(venue.extractionStrategy ?? null)
    setDebugCaptureHtmlVal(venue.debugCaptureHtml)
    setCapacityVal(venue.capacity != null ? String(venue.capacity) : '')
    setVenueTypeVal(venue.venueType ?? '')
    setAboutVal(venue.about ?? '')
    setNeighborhoodVal(venue.neighborhood ?? '')
    setSaveState('idle')
    setSaveError(null)
    setFieldErrors({})
    if (nameRef.current) nameRef.current.value = venue.name
    if (slugRef.current) slugRef.current.value = venue.slug
    if (websiteUrlRef.current) websiteUrlRef.current.value = venue.websiteUrl
    if (cityRef.current) cityRef.current.value = venue.city
    if (addressRef.current) addressRef.current.value = venue.address ?? ''
    if (crawlDelayRef.current)
      crawlDelayRef.current.value = String(venue.crawlDelayMs)
  }

  async function handleSave() {
    setSaveError(null)
    setFieldErrors({})
    setSaveState('saving')

    const formData = new FormData()
    formData.set('name', nameVal.trim())
    formData.set('slug', slugVal.trim())
    formData.set('websiteUrl', urlVal.trim())
    formData.set('city', cityVal.trim() || 'Denver')
    formData.set('address', addressVal.trim())
    formData.set('crawlWaitUntil', waitUntilVal)
    formData.set('crawlDelayMs', String(crawlDelayVal))
    formData.set('crawlWaitForSelector', waitForSelectorVal.trim())
    formData.set('active', String(venue.active))
    if (ticketVendorVal !== null) {
      formData.set('ticketVendor', ticketVendorVal)
    }
    formData.set('crawlMode', crawlModeVal ?? '')
    formData.set('extractionStrategy', extractionStrategyVal ?? '')
    formData.set('debugCaptureHtml', String(debugCaptureHtmlVal))
    formData.set('capacity', capacityVal.trim())
    formData.set('venueType', venueTypeVal.trim())
    formData.set('about', aboutVal.trim())
    formData.set('neighborhood', neighborhoodVal.trim())
    formData.set('priceUrl', priceUrlVal.trim())

    try {
      const result = await updateVenue(venue.id, formData)
      if (!result.success) {
        if (result.field === 'slug') {
          setFieldErrors({
            slug:
              result.error ?? ADMIN_COPY.venueDetailsClient.errors.slugInUse,
          })
        } else {
          setSaveError(
            result.error ?? ADMIN_COPY.venueDetailsClient.errors.saveFailed,
          )
        }
        setSaveState('error')
        return
      }
      setSaveState('saved')
      setTimeout(() => {
        setSaveState('idle')
        router.refresh()
      }, 1200)
    } catch {
      setSaveError(ADMIN_COPY.venueDetailsClient.errors.unexpected)
      setSaveState('error')
    }
  }

  function handlePauseToggle() {
    startTransition(async () => {
      if (venue.active) {
        await pauseVenue(venue.id)
      } else {
        await activateVenue(venue.id)
      }
      router.refresh()
    })
  }

  function handleFeaturedToggle() {
    startTransition(async () => {
      await setVenueFeatured(venue.id, !venue.featured)
      router.refresh()
    })
  }

  function handleStatusChange(newStatus: 'active' | 'paused') {
    startTransition(async () => {
      if (newStatus === 'active') {
        await activateVenue(venue.id)
      } else {
        await pauseVenue(venue.id)
      }
      router.refresh()
    })
  }

  const { crawlHealth } = venue

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
      {/* Header */}
      <SectionHead
        eyebrow={ADMIN_COPY.venueDetailsClient.header.eyebrow}
        title={ADMIN_COPY.venueDetailsClient.header.title}
        subtitle={ADMIN_COPY.venueDetailsClient.header.subtitle}
        actions={
          <>
            <Link href="/admin/venues" style={{ textDecoration: 'none' }}>
              <AdminButton variant="ghost" size="sm" iconRight={ChevronRight}>
                {ADMIN_COPY.venueDetailsClient.actions.backToVenues}
              </AdminButton>
            </Link>
            <Link
              href={`/admin/crawl?venueId=${venue.id}&tab=history`}
              style={{ textDecoration: 'none' }}
            >
              <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                {ADMIN_COPY.venueDetailsClient.actions.crawlHistory}
              </AdminButton>
            </Link>
          </>
        }
      />

      {/* Venue header summary card */}
      {(() => {
        const venueStatus = deriveVenueStatus(venue)
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <div
              style={{ borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}
            >
              <IdentityArt
                name={venue.name}
                kind="venue"
                scale="tile"
                width={96}
                height={96}
                showInitials
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 4,
                }}
              >
                <MonoLabel>{venue.slug} · venue</MonoLabel>
                <StatusBadge
                  kind={
                    venueStatus === 'active'
                      ? 'success'
                      : venueStatus === 'paused'
                        ? 'warning'
                        : 'danger'
                  }
                  dot
                >
                  {venueStatus.charAt(0).toUpperCase() + venueStatus.slice(1)}
                </StatusBadge>
                <StatusBadge
                  kind={strategyKind(venue.extractionStrategy)}
                  variant="outline"
                >
                  {strategyLabel(venue.extractionStrategy)}
                </StatusBadge>
                {venue.consecutiveFailures > 0 && (
                  <StatusBadge kind="danger">
                    {venue.consecutiveFailures} consec. failures
                  </StatusBadge>
                )}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                }}
              >
                {venue.name}
              </h2>
              <div
                style={{
                  marginTop: 4,
                  display: 'flex',
                  gap: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--fg-muted)',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <span>
                  {ADMIN_COPY.venueDetailsClient.summary.lastCrawl}{' '}
                  {crawlHealth.lastCrawledAt ? (
                    <RelTime iso={crawlHealth.lastCrawledAt} />
                  ) : (
                    ADMIN_COPY.venueDetailsClient.summary.never
                  )}
                </span>
                <span>·</span>
                <span>
                  {crawlHealth.eventsTracked}{' '}
                  {ADMIN_COPY.venueDetailsClient.summary.eventsLive}
                </span>
                <span>·</span>
                <span>
                  {ADMIN_COPY.venueDetailsClient.summary.health}{' '}
                  {crawlHealth.sevenDayPercent}%
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <AdminButton
                variant={venue.featured ? 'success' : 'outline'}
                size="sm"
                icon={Star}
                disabled={isPending}
                onClick={handleFeaturedToggle}
                type="button"
              >
                {venue.featured
                  ? ADMIN_COPY.venueDetailsClient.actions.flagship
                  : ADMIN_COPY.venueDetailsClient.actions.makeFlagship}
              </AdminButton>
              <CrawlTriggerButton venueId={venue.id} />
              <a
                href={venue.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                  {ADMIN_COPY.venueDetailsClient.actions.viewOnSite}
                </AdminButton>
              </a>
            </div>
          </div>
        )
      })()}

      {/* Error banner */}
      {saveError && (
        <div
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

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    const val = evt.target.value
                    setNameVal(val)
                    if (!slugManual && slugRef.current) {
                      const generated = slugify(val)
                      slugRef.current.value = generated
                      setSlugVal(generated)
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
                      setSlugVal(evt.target.value)
                      setSlugManual(true)
                      setFieldErrors((prev) => ({ ...prev, slug: undefined }))
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
                        const generated = slugify(nameRef.current.value)
                        slugRef.current.value = generated
                        setSlugVal(generated)
                        setSlugManual(false)
                        setFieldErrors((prev) => ({
                          ...prev,
                          slug: undefined,
                        }))
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

            {/* Source URL */}
            <VDField
              label={ADMIN_COPY.venueDetailsClient.fields.sourceUrl.label}
              htmlFor="edit-venue-url"
              labelRight={<RobotsHint allowed={venue.robotsTxtAllowed} />}
              hint={ADMIN_COPY.venueDetailsClient.fields.sourceUrl.hint}
            >
              <VDInput
                id="edit-venue-url"
                type="url"
                inputRef={websiteUrlRef}
                defaultValue={venue.websiteUrl}
                disabled={isDisabled}
                onChange={(evt) => setUrlVal(evt.target.value)}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
            </VDField>

            {/* City + Status row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12,
              }}
            >
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
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.status.label}
                htmlFor="venue-status-toggle"
              >
                {(() => {
                  const currentStatus = deriveVenueStatus(venue)
                  const statuses = [
                    {
                      value: 'active' as const,
                      label: ADMIN_COPY.venueDetailsClient.fields.status.active,
                      dot: 'var(--success)',
                    },
                    {
                      value: 'paused' as const,
                      label: ADMIN_COPY.venueDetailsClient.fields.status.paused,
                      dot: 'var(--warning)',
                    },
                    {
                      value: 'blocked' as const,
                      label:
                        ADMIN_COPY.venueDetailsClient.fields.status.blocked,
                      dot: 'var(--danger)',
                    },
                  ]
                  return (
                    <div style={{ alignSelf: 'flex-start' }}>
                      <div
                        id="venue-status-toggle"
                        role="group"
                        aria-label={
                          ADMIN_COPY.venueDetailsClient.fields.status.ariaLabel
                        }
                        style={{
                          display: 'inline-flex',
                          padding: 2,
                          borderRadius: 8,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {statuses.map(({ value, label, dot }) => {
                          const isActive = currentStatus === value
                          const isBlocked = value === 'blocked'
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={isPending || isBlocked}
                              onClick={() =>
                                !isBlocked && handleStatusChange(value)
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: isActive
                                  ? value === 'blocked'
                                    ? 'color-mix(in oklab, var(--danger) 14%, var(--surface-1))'
                                    : value === 'active'
                                      ? 'color-mix(in oklab, var(--success) 18%, var(--surface-1))'
                                      : 'color-mix(in oklab, var(--warning) 18%, var(--surface-1))'
                                  : 'transparent',
                                color: isActive
                                  ? 'var(--fg)'
                                  : 'var(--fg-muted)',
                                fontFamily: "'Inter', sans-serif",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor:
                                  isPending || isBlocked
                                    ? 'not-allowed'
                                    : 'pointer',
                                transition: 'background .12s, color .12s',
                                opacity: isBlocked && !isActive ? 0.4 : 1,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: isActive
                                    ? dot
                                    : 'var(--fg-muted)',
                                  flexShrink: 0,
                                }}
                              />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </VDField>
            </div>
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
                {priceUrlVal && (
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

        {/* 03 · crawl config */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.crawlConfig.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.crawlConfig.title}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 16,
              alignItems: 'start',
            }}
          >
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Extraction strategy */}
              <VDField
                label={
                  ADMIN_COPY.venueDetailsClient.fields.extractionStrategy.label
                }
                htmlFor="edit-venue-extraction-strategy"
              >
                <VDSelect
                  id="edit-venue-extraction-strategy"
                  value={extractionStrategyVal ?? ''}
                  disabled={isDisabled}
                  onChange={(evt) =>
                    setExtractionStrategyVal(
                      (evt.target.value || null) as
                        | 'structured_data'
                        | 'llm'
                        | 'manual'
                        | null,
                    )
                  }
                >
                  <option value="">
                    {
                      ADMIN_COPY.venueDetailsClient.fields.extractionStrategy
                        .auto
                    }
                  </option>
                  <option value="structured_data">
                    {
                      ADMIN_COPY.venueDetailsClient.fields.extractionStrategy
                        .structuredData
                    }
                  </option>
                  <option value="llm">
                    {
                      ADMIN_COPY.venueDetailsClient.fields.extractionStrategy
                        .llm
                    }
                  </option>
                  <option value="manual">
                    {
                      ADMIN_COPY.venueDetailsClient.fields.extractionStrategy
                        .manual
                    }
                  </option>
                </VDSelect>
              </VDField>

              {/* Request delay */}
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.requestDelay.label}
                htmlFor="edit-venue-crawl-delay"
                hint={ADMIN_COPY.venueDetailsClient.fields.requestDelay.hint}
              >
                <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  <VDInput
                    id="edit-venue-crawl-delay"
                    type="number"
                    inputRef={crawlDelayRef}
                    defaultValue={venue.crawlDelayMs}
                    disabled={isDisabled}
                    min={1000}
                    max={30000}
                    step={500}
                    onChange={(evt) => {
                      const parsed = Number(evt.target.value)
                      setCrawlDelayVal(
                        Number.isFinite(parsed) && Number.isInteger(parsed)
                          ? parsed
                          : NaN,
                      )
                    }}
                    style={{
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRight: 'none',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-strong)',
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--fg-subtle)',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {ADMIN_COPY.venueDetailsClient.fields.requestDelay.unit}
                  </div>
                </div>
              </VDField>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Fetch mode */}
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.fetchMode.label}
                htmlFor="edit-venue-crawl-mode"
                labelAs="group"
              >
                <div style={{ alignSelf: 'flex-start' }}>
                  <VDSegToggle
                    id="edit-venue-crawl-mode"
                    ariaLabelledBy="edit-venue-crawl-mode-label"
                    options={[
                      {
                        value: 'auto',
                        label:
                          ADMIN_COPY.venueDetailsClient.fields.fetchMode
                            .autoDetect,
                      },
                      {
                        value: 'http',
                        label:
                          ADMIN_COPY.venueDetailsClient.fields.fetchMode
                            .httpOnly,
                      },
                      {
                        value: 'browser',
                        label:
                          ADMIN_COPY.venueDetailsClient.fields.fetchMode
                            .browser,
                      },
                    ]}
                    value={crawlModeVal ?? 'auto'}
                    onChange={(val) =>
                      setCrawlModeVal(
                        val === 'auto' ? null : (val as 'http' | 'browser'),
                      )
                    }
                    disabled={isDisabled}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                    marginTop: 4,
                  }}
                >
                  {crawlModeVal === null && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        {
                          ADMIN_COPY.venueDetailsClient.fields.fetchMode
                            .autoDetect
                        }
                      </strong>{' '}
                      —{' '}
                      {
                        ADMIN_COPY.venueDetailsClient.fields.fetchMode
                          .autoDescription
                      }
                    </>
                  )}
                  {crawlModeVal === 'http' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        {
                          ADMIN_COPY.venueDetailsClient.fields.fetchMode
                            .httpOnly
                        }
                      </strong>{' '}
                      —{' '}
                      {
                        ADMIN_COPY.venueDetailsClient.fields.fetchMode
                          .httpDescription
                      }
                    </>
                  )}
                  {crawlModeVal === 'browser' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        {ADMIN_COPY.venueDetailsClient.fields.fetchMode.browser}
                      </strong>{' '}
                      —{' '}
                      {
                        ADMIN_COPY.venueDetailsClient.fields.fetchMode
                          .browserDescription
                      }
                    </>
                  )}
                </div>
              </VDField>

              {/* Schedule — static (per-venue config tracked in #530) */}
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.schedule.label}
                htmlFor="edit-venue-schedule"
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
                    {ADMIN_COPY.venueDetailsClient.fields.schedule.badge}
                  </span>
                }
              >
                <VDInput
                  id="edit-venue-schedule"
                  value={ADMIN_COPY.venueDetailsClient.fields.schedule.value}
                  disabled
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </VDField>

              {/* Wait selector */}
              <VDField
                label={ADMIN_COPY.venueDetailsClient.fields.waitSelector.label}
                htmlFor="edit-venue-wait-for-selector"
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
                    {ADMIN_COPY.venueDetailsClient.fields.waitSelector.badge}
                  </span>
                }
                hint={ADMIN_COPY.venueDetailsClient.fields.waitSelector.hint}
              >
                <VDInput
                  id="edit-venue-wait-for-selector"
                  value={waitForSelectorVal}
                  placeholder={
                    ADMIN_COPY.venueDetailsClient.fields.waitSelector
                      .placeholder
                  }
                  disabled={isDisabled}
                  onChange={(evt) => setWaitForSelectorVal(evt.target.value)}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </VDField>

              {/* Debug · capture HTML */}
              <VDField
                label={
                  ADMIN_COPY.venueDetailsClient.fields.debugCaptureHtml.label
                }
                htmlFor="edit-venue-debug-capture-html"
                labelAs="group"
                hint={
                  ADMIN_COPY.venueDetailsClient.fields.debugCaptureHtml.hint
                }
                labelRight={
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--warning)',
                    }}
                  >
                    {
                      ADMIN_COPY.venueDetailsClient.fields.debugCaptureHtml
                        .badge
                    }
                  </span>
                }
              >
                <div style={{ alignSelf: 'flex-start' }}>
                  <VDSegToggle
                    id="edit-venue-debug-capture-html"
                    ariaLabelledBy="edit-venue-debug-capture-html-label"
                    options={[
                      {
                        value: 'off',
                        label:
                          ADMIN_COPY.venueDetailsClient.fields.debugCaptureHtml
                            .off,
                      },
                      {
                        value: 'on',
                        label:
                          ADMIN_COPY.venueDetailsClient.fields.debugCaptureHtml
                            .on,
                      },
                    ]}
                    value={debugCaptureHtmlVal ? 'on' : 'off'}
                    onChange={(val) => setDebugCaptureHtmlVal(val === 'on')}
                    disabled={isDisabled}
                  />
                </div>
              </VDField>
            </div>
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
                  setCapacityVal(evt.target.value)
                  setCapacityGenerated(false)
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
                  setNeighborhoodVal(evt.target.value)
                  setNeighborhoodGenerated(false)
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
                  showInitials={false}
                  grain={0.08}
                  width={96}
                  height={96}
                />
                {(() => {
                  const identity = identityFor(artSeedStr, artNamespace)
                  const dark = ia_isDark(identity.palette.bg)
                  const initials = ia_getInitials(artSeedStr, 2)
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
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 900,
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: dark ? '#F1E6D5' : '#191418',
                        lineHeight: 1,
                      }}
                    >
                      {initials}
                    </div>
                  )
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

        {/* 06 · danger */}
        <VDSection
          eyebrow={ADMIN_COPY.venueDetailsClient.sections.dangerZone.eyebrow}
          title={ADMIN_COPY.venueDetailsClient.sections.dangerZone.title}
          danger
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Pause / activate */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg)',
                  }}
                >
                  {ADMIN_COPY.venueDetailsClient.dangerZone.pause.title}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {ADMIN_COPY.venueDetailsClient.dangerZone.pause.description}
                </div>
              </div>
              <AdminButton
                variant="outline"
                size="sm"
                icon={venue.active ? Pause : Play}
                disabled={isPending}
                onClick={handlePauseToggle}
                type="button"
              >
                {venue.active
                  ? ADMIN_COPY.venueDetailsClient.dangerZone.pause.pauseButton
                  : ADMIN_COPY.venueDetailsClient.dangerZone.pause
                      .activateButton}
              </AdminButton>
            </div>

            <div
              style={{
                height: 1,
                background:
                  'color-mix(in oklab, var(--danger) 16%, transparent)',
              }}
            />

            {/* Delete */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--danger)',
                  }}
                >
                  {ADMIN_COPY.venueDetailsClient.dangerZone.delete.title}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {ADMIN_COPY.venueDetailsClient.dangerZone.delete.description}
                </div>
              </div>
              <DeleteVenueConfirm
                venueId={venue.id}
                venueName={venue.name}
                eventsTracked={crawlHealth.eventsTracked}
              />
            </div>
          </div>
        </VDSection>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
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
  )
}
