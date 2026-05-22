'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VenueWithCrawlHealth, CrawlRun } from '@concert-crawl/types'
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
  MetaCard,
} from '@/components/admin/primitives'
import { deriveVenueStatus } from '@/lib/admin/venue-status'
import {
  IdentityArt,
  ia_getInitials,
  ia_isDark,
  identityFor,
} from '@/components/consumer/identity-art/IdentityArt'
import { DeleteVenueConfirm } from './DeleteVenueConfirm'
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
} from 'lucide-react'
import { formatDurationMs } from '@/lib/time'

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
  children: React.ReactNode
}

function VDSection({ eyebrow, title, children }: VDSectionProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <MonoLabel>{eyebrow}</MonoLabel>
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
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  )
}

interface VDFieldProps {
  label: string
  htmlFor: string
  hint?: React.ReactNode
  labelRight?: React.ReactNode
  error?: string
  children: React.ReactNode
}

function VDField({
  label,
  htmlFor,
  hint,
  labelRight,
  error,
  children,
}: VDFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <label
          htmlFor={htmlFor}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            color: 'var(--fg)',
          }}
        >
          {label}
        </label>
        {labelRight}
      </div>
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
}

function VDSegToggle({ options, value, onChange, disabled }: VDSegToggleProps) {
  return (
    <div
      role="group"
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
        unchecked
      </StatusBadge>
    )
  if (allowed)
    return (
      <StatusBadge kind="success" variant="mono">
        robots ok
      </StatusBadge>
    )
  return (
    <StatusBadge kind="danger" variant="mono">
      robots blocked
    </StatusBadge>
  )
}

const VENUE_TYPE_SUGGESTIONS = [
  'Amphitheater',
  'Theater',
  'Concert Hall',
  'Music Hall',
  'Ballroom',
  'Bar',
  'Auditorium',
  'Outdoor Pavilion',
]

// ── Main component ───────────────────────────────────────────

interface Props {
  venue: VenueWithCrawlHealth
  recentRuns: CrawlRun[]
}

export function VenueDetailsClient({ venue, recentRuns }: Props) {
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
  const [crawlModeVal, setCrawlModeVal] = useState<'http' | 'browser' | null>(
    venue.crawlMode ?? null,
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
  const isDirty =
    nameVal !== venue.name ||
    slugVal !== venue.slug ||
    urlVal !== venue.websiteUrl ||
    cityVal !== venue.city ||
    addressVal !== (venue.address ?? '') ||
    waitUntilVal !== venue.crawlWaitUntil ||
    crawlDelayVal !== venue.crawlDelayMs ||
    (waitForSelectorVal || null) !== venue.crawlWaitForSelector ||
    ticketVendorVal !== (venue.ticketVendor ?? null) ||
    crawlModeVal !== (venue.crawlMode ?? null) ||
    capacityVal !== (venue.capacity != null ? String(venue.capacity) : '') ||
    venueTypeVal !== (venue.venueType ?? '') ||
    aboutVal !== (venue.about ?? '') ||
    neighborhoodVal !== (venue.neighborhood ?? '')

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ slug?: string | undefined }>(
    {},
  )

  // Identity art preview state
  const [artNamespace, setArtNamespace] = useState<'venue' | 'artist'>('venue')
  const [artSeed, setArtSeed] = useState(venue.name)

  // Generate-about state
  const [generateState, setGenerateState] = useState<GenerateFieldState>('idle')
  const [generateResult, setGenerateResult] = useState<
    GenerateFieldResult | undefined
  >()
  const [generateError, setGenerateError] = useState<string | undefined>()

  async function handleGenerateAbout() {
    setGenerateState('loading')
    setGenerateError(undefined)
    setGenerateResult(undefined)
    try {
      const result = await generateVenueAbout(venue.id)
      if (!result.success || !result.data) {
        setGenerateError(result.error ?? 'Generation failed')
        setGenerateState('error')
        return
      }
      const { capacity, venueType, neighborhood, about } = result.data
      setGenerateResult({ content: about })
      setGenerateState('review')
      // Pre-fill other fields
      setCapacityVal(capacity != null ? String(capacity) : '')
      setVenueTypeVal(venueType)
      setNeighborhoodVal(neighborhood)
    } catch {
      setGenerateError('Network error — could not reach API')
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
    setCrawlModeVal(venue.crawlMode ?? null)
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
    formData.set('capacity', capacityVal.trim())
    formData.set('venueType', venueTypeVal.trim())
    formData.set('about', aboutVal.trim())
    formData.set('neighborhood', neighborhoodVal.trim())

    try {
      const result = await updateVenue(venue.id, formData)
      if (!result.success) {
        if (result.field === 'slug') {
          setFieldErrors({ slug: result.error ?? 'Slug already in use' })
        } else {
          setSaveError(result.error ?? 'Save failed')
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
      setSaveError('An unexpected error occurred')
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
        paddingBottom: 80,
        position: 'relative',
      }}
    >
      {/* Header */}
      <SectionHead
        eyebrow="Venues · edit"
        title="Venue detail"
        subtitle="Identity, ticketing, crawl config, editorial fields. LLM-assisted fields are always admin-reviewed before they save."
        actions={
          <>
            <Link href="/admin/venues" style={{ textDecoration: 'none' }}>
              <AdminButton variant="ghost" size="sm" iconRight={ChevronRight}>
                Back to venues
              </AdminButton>
            </Link>
            <Link
              href={`/admin/crawl?venueId=${venue.id}`}
              style={{ textDecoration: 'none' }}
            >
              <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                Crawl history
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
                  last crawl ·{' '}
                  {crawlHealth.lastCrawledAt ? (
                    <RelTime iso={crawlHealth.lastCrawledAt} />
                  ) : (
                    'never'
                  )}
                </span>
                <span>·</span>
                <span>{crawlHealth.eventsTracked} events live</span>
                <span>·</span>
                <span>health {crawlHealth.sevenDayPercent}%</span>
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
                {venue.featured ? 'Flagship' : 'Make flagship'}
              </AdminButton>
              <CrawlTriggerButton venueId={venue.id} />
              <a
                href={venue.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                  View on site
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

      {/* 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: VDSection cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 01 · identity */}
          <VDSection eyebrow="01 · identity" title="Name + slug + source">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Venue name + Slug side by side */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <VDField label="Venue name" htmlFor="edit-venue-name">
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
                  label="Slug"
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
                      Auto-generated
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
                      /v/
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
                      title="Regenerate slug from name"
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
                label="Source URL"
                htmlFor="edit-venue-url"
                labelRight={<RobotsHint allowed={venue.robotsTxtAllowed} />}
                hint="The events page we crawl on the configured schedule."
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <VDField label="City" htmlFor="edit-venue-city">
                  <VDInput
                    id="edit-venue-city"
                    inputRef={cityRef}
                    defaultValue={venue.city}
                    disabled={isDisabled}
                    onChange={(evt) => setCityVal(evt.target.value)}
                  />
                </VDField>
                <VDField label="Status" htmlFor="venue-status-toggle">
                  {(() => {
                    const currentStatus = deriveVenueStatus(venue)
                    const statuses = [
                      {
                        value: 'active' as const,
                        label: 'Active',
                        dot: 'var(--success)',
                      },
                      {
                        value: 'paused' as const,
                        label: 'Paused',
                        dot: 'var(--warning)',
                      },
                      {
                        value: 'blocked' as const,
                        label: 'Blocked',
                        dot: 'var(--danger)',
                      },
                    ]
                    return (
                      <div
                        id="venue-status-toggle"
                        role="group"
                        aria-label="Venue status"
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
                                    ? 'var(--signal)'
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
                    )
                  })()}
                </VDField>
              </div>
            </div>
          </VDSection>

          {/* 02 · ticketing */}
          <VDSection eyebrow="02 · ticketing" title="Ticket Vendor">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <VDField
                label="Ticket Vendor"
                htmlFor="edit-venue-ticket-vendor"
                hint="Override the auto-detected ticket vendor for this venue."
              >
                <VDSelect
                  id="edit-venue-ticket-vendor"
                  value={ticketVendorVal ?? ''}
                  disabled={isDisabled}
                  onChange={(evt) =>
                    setTicketVendorVal(evt.target.value || null)
                  }
                >
                  <option value="">— Auto-detected / Unknown —</option>
                  <option value="axs">AXS</option>
                  <option value="ticketmaster">Ticketmaster</option>
                  <option value="seatgeek">SeatGeek</option>
                  <option value="dice">DICE</option>
                  <option value="eventbrite">Eventbrite</option>
                  <option value="venue_box_office">Venue Box Office</option>
                  <option value="unknown">Unknown</option>
                </VDSelect>
              </VDField>
            </div>
          </VDSection>

          {/* 03 · crawl */}
          <VDSection eyebrow="03 · crawl" title="Crawl Settings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Fetch mode as segmented toggle */}
              <VDField label="Fetch mode" htmlFor="edit-venue-crawl-mode">
                <VDSegToggle
                  options={[
                    { value: 'auto', label: 'Auto-detect' },
                    { value: 'http', label: 'HTTP only' },
                    { value: 'browser', label: 'Browser' },
                  ]}
                  value={crawlModeVal ?? 'auto'}
                  onChange={(val) =>
                    setCrawlModeVal(
                      val === 'auto' ? null : (val as 'http' | 'browser'),
                    )
                  }
                  disabled={isDisabled}
                />
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
                        Auto-detect
                      </strong>{' '}
                      — tries plain HTTP first; falls back to browser if needed.
                    </>
                  )}
                  {crawlModeVal === 'http' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>HTTP only</strong>{' '}
                      — plain request. Fails if events need JavaScript.
                    </>
                  )}
                  {crawlModeVal === 'browser' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        Browser only
                      </strong>{' '}
                      — always uses Playwright. Required for JS-rendered pages.
                    </>
                  )}
                </div>
              </VDField>

              {/* Wait strategy */}
              <VDField label="Wait strategy" htmlFor="edit-venue-wait-until">
                <VDSelect
                  id="edit-venue-wait-until"
                  value={waitUntilVal}
                  disabled={isDisabled}
                  onChange={(evt) =>
                    setWaitUntilVal(
                      evt.target.value as
                        | 'networkidle'
                        | 'load'
                        | 'domcontentloaded',
                    )
                  }
                >
                  <option value="networkidle">
                    networkidle — wait for quiet network
                  </option>
                  <option value="load">load — wait for page load event</option>
                  <option value="domcontentloaded">
                    domcontentloaded — wait for HTML parse only
                  </option>
                </VDSelect>
              </VDField>

              {/* Crawl delay */}
              <VDField
                label="Crawl delay (ms)"
                htmlFor="edit-venue-crawl-delay"
                hint="Minimum wait between requests. Default 3000ms. Range: 1000–30000ms."
              >
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
                />
              </VDField>

              {/* Wait for selector */}
              <VDField
                label="Wait for selector (optional)"
                htmlFor="edit-venue-wait-for-selector"
                hint={
                  <>
                    CSS selector to wait for after page load. Example:{' '}
                    <code
                      style={{
                        fontFamily: 'monospace',
                        background: 'var(--surface-1)',
                        padding: '1px 3px',
                        borderRadius: 3,
                      }}
                    >
                      .event-list-item
                    </code>
                  </>
                }
              >
                <VDInput
                  id="edit-venue-wait-for-selector"
                  value={waitForSelectorVal}
                  placeholder="e.g. .event-card or [data-testid='event']"
                  disabled={isDisabled}
                  onChange={(evt) => setWaitForSelectorVal(evt.target.value)}
                />
              </VDField>
            </div>
          </VDSection>

          {/* 04 · editorial */}
          <VDSection eyebrow="04 · editorial" title="Editorial Info">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {/* Capacity + Venue type row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <VDField label="Capacity" htmlFor="edit-venue-capacity">
                  <VDInput
                    id="edit-venue-capacity"
                    type="number"
                    value={capacityVal}
                    placeholder="e.g. 1600"
                    disabled={isDisabled}
                    min={1}
                    onChange={(evt) => setCapacityVal(evt.target.value)}
                  />
                </VDField>
                <VDField label="Venue type" htmlFor="edit-venue-type">
                  <>
                    <VDInput
                      id="edit-venue-type"
                      value={venueTypeVal}
                      placeholder="e.g. Theater"
                      disabled={isDisabled}
                      list="venue-type-suggestions"
                      onChange={(evt) => setVenueTypeVal(evt.target.value)}
                    />
                    <datalist id="venue-type-suggestions">
                      {VENUE_TYPE_SUGGESTIONS.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                  </>
                </VDField>
              </div>

              {/* Neighborhood */}
              <VDField label="Neighborhood" htmlFor="edit-venue-neighborhood">
                <VDInput
                  id="edit-venue-neighborhood"
                  value={neighborhoodVal}
                  placeholder="e.g. Capitol Hill, RiNo, LoDo"
                  disabled={isDisabled}
                  onChange={(evt) => setNeighborhoodVal(evt.target.value)}
                />
              </VDField>

              {/* About */}
              <VDField label="About" htmlFor="edit-venue-about">
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <textarea
                    id="edit-venue-about"
                    value={aboutVal}
                    placeholder="A short description of the venue's character and history."
                    disabled={
                      isDisabled ||
                      generateState === 'loading' ||
                      generateState === 'review'
                    }
                    rows={4}
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
                  <GenerateField
                    state={generateState}
                    {...(generateResult ? { result: generateResult } : {})}
                    {...(generateError ? { errorMessage: generateError } : {})}
                    onGenerate={() => void handleGenerateAbout()}
                    onAccept={handleGenerateAccept}
                    onDiscard={handleGenerateDiscard}
                  />
                </div>
              </VDField>
            </div>
          </VDSection>

          {/* 05 · identity art */}
          <VDSection eyebrow="05 · identity" title="Identity Art">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}
              >
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
                    name={artSeed}
                    kind={artNamespace}
                    scale="tile"
                    showInitials={false}
                    grain={0.08}
                    width={96}
                    height={96}
                  />
                  {(() => {
                    const identity = identityFor(artSeed, artNamespace)
                    const dark = ia_isDark(identity.palette.bg)
                    const initials = ia_getInitials(artSeed, 2)
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

                {/* Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <VDField
                    label="Namespace"
                    htmlFor="edit-venue-art-namespace"
                    hint="Controls which template set is used. Venues use architectural / spatial patterns; artists use more organic / gestural ones."
                  >
                    <VDSegToggle
                      options={[
                        { value: 'venue', label: 'Venue' },
                        { value: 'artist', label: 'Artist' },
                      ]}
                      value={artNamespace}
                      onChange={(val) =>
                        setArtNamespace(val as 'venue' | 'artist')
                      }
                    />
                  </VDField>

                  <VDField
                    label="Seed"
                    htmlFor="edit-venue-art-seed"
                    hint="The seed text is hashed to pick palette + template. Changing it gives a different art variation."
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <VDInput
                        id="edit-venue-art-seed"
                        value={artSeed}
                        placeholder={venue.name}
                        onChange={(evt) => setArtSeed(evt.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const roll = `${venue.name}-${Math.floor(Math.random() * 9999)}`
                          setArtSeed(roll)
                        }}
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
                        Roll
                      </button>
                    </div>
                  </VDField>
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: 'var(--fg-subtle)',
                  lineHeight: 1.5,
                }}
              >
                Preview only — production art always uses the venue name as
                seed. Reset the seed to see the canonical art.
              </div>
            </div>
          </VDSection>

          {/* 06 · danger */}
          <VDSection eyebrow="06 · danger" title="Danger Zone">
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
                    Pause this venue
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
                    Stops daily crawls. Existing events stay published.
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
                  {venue.active ? 'Pause' : 'Activate'}
                </AdminButton>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

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
                      color: 'var(--fg)',
                    }}
                  >
                    Delete venue
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
                    Removes the venue and detaches its events. Cannot be undone.
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

        {/* Right: meta sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Recent runs */}
          <MetaCard
            title="Recent runs"
            action={
              <Link
                href={`/admin/crawl?venueId=${venue.id}`}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--signal)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                View all
                <ChevronRight size={11} />
              </Link>
            }
          >
            {recentRuns.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                No crawl runs yet
              </p>
            ) : (
              <div>
                {recentRuns.map((run, idx) => (
                  <div
                    key={run.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom:
                        idx < recentRuns.length - 1
                          ? '1px solid var(--border)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          marginTop: 4,
                          flexShrink: 0,
                          background:
                            run.status === 'success'
                              ? 'var(--success)'
                              : run.status === 'failed'
                                ? 'var(--danger)'
                                : 'var(--warning)',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: 'var(--fg)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          <RelTime iso={run.createdAt} />
                        </div>
                        {run.errorMessage ? (
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10.5,
                              color: 'var(--danger)',
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {run.errorMessage}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: 11,
                              color: 'var(--fg-muted)',
                              marginTop: 2,
                            }}
                          >
                            {run.eventsFound} found · {run.eventsInserted}{' '}
                            inserted
                          </div>
                        )}
                      </div>
                    </div>
                    {run.durationMs !== null && (
                      <MonoLabel color="var(--fg-subtle)">
                        {formatDurationMs(run.durationMs)}
                      </MonoLabel>
                    )}
                  </div>
                ))}
              </div>
            )}
          </MetaCard>
        </div>
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
            padding: '12px 18px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 -6px 18px rgba(0,0,0,0.06)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: 'var(--warning)',
              }}
            />
            <span style={{ color: 'var(--fg)' }}>Unsaved changes</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isDisabled}
              type="button"
            >
              Discard
            </AdminButton>
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
                  Saving…
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check size={12} />
                  Saved
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
