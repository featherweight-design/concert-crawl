'use client'

import { useState, useRef, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VenueWithCrawlHealth, CrawlRun } from '@concert-crawl/types'
import {
  updateVenue,
  pauseVenue,
  activateVenue,
  verifyVenue,
  unverifyVenue,
  generateVenueAbout,
} from '@/lib/actions/venues'
import {
  AdminButton,
  Panel,
  MonoLabel,
  StatusBadge,
  RelTime,
  SectionHead,
  MetaCard,
} from '@/components/admin/primitives'
import { DeleteVenueDialog } from './DeleteVenueDialog'
import { CrawlTriggerButton } from './crawl-trigger-button/CrawlTriggerButton'
import { usePageTitle } from '@/components/admin/shell/PageTitleContext'
import {
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Pause,
  Play,
  AlertCircle,
  Check,
  Loader2,
  MapPin,
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

// ── Local primitives ──────────────────────────────────────────

function FaviconChip({ url }: { url: string }) {
  const host = useMemo(() => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    } catch {
      return null
    }
  }, [url])

  if (!host) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px 2px 4px',
        borderRadius: 999,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
        alt=""
        width={14}
        height={14}
        style={{ borderRadius: 3 }}
        onError={(evt) => {
          evt.currentTarget.style.visibility = 'hidden'
        }}
      />
      {host}
    </span>
  )
}

function HealthBarSparkline({
  sparkline,
}: {
  sparkline: { date: string; success: boolean; hasRun: boolean }[]
}) {
  const total = sparkline.length
  if (total === 0 || sparkline.every((day) => !day.hasRun)) {
    return (
      <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>No data</span>
    )
  }
  const barWidth = Math.max(2, Math.floor((320 - (total - 1) * 3) / total))
  const svgWidth = total * barWidth + (total - 1) * 3
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth} 28`}
      preserveAspectRatio="none"
      style={{ display: 'block', height: 28 }}
    >
      {sparkline.map((day, idx) => (
        <rect
          key={day.date}
          x={idx * (barWidth + 3)}
          y={!day.hasRun ? 20 : day.success ? 8 : 18}
          width={barWidth}
          height={!day.hasRun ? 6 : day.success ? 16 : 6}
          rx={1.5}
          fill={
            !day.hasRun
              ? 'var(--border)'
              : day.success
                ? 'var(--success)'
                : 'var(--danger)'
          }
          opacity={!day.hasRun ? 0.5 : 0.9}
        />
      ))}
    </svg>
  )
}

function DangerRow({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
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
          {title}
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
          {body}
        </div>
      </div>
      {action}
    </div>
  )
}

function StyledInput({
  id,
  type = 'text',
  defaultValue,
  value,
  placeholder,
  disabled,
  hasError,
  onChange,
  onBlur,
  inputRef,
  min,
  max,
  step,
  list,
  style,
}: {
  id: string
  type?: string
  defaultValue?: string | number
  value?: string | number
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  inputRef?: React.RefObject<HTMLInputElement | null>
  min?: number
  max?: number
  step?: number
  list?: string
  style?: React.CSSProperties
}) {
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
      defaultValue={defaultValue}
      value={value}
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
        height: 38,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
        fontSize: 13.5,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
        opacity: disabled ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxShadow: ring,
        transition: 'border-color .12s, box-shadow .12s',
        ...style,
      }}
    />
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

function StyledTextarea({
  id,
  value,
  placeholder,
  disabled,
  rows,
  onChange,
}: {
  id: string
  value: string
  placeholder?: string
  disabled?: boolean
  rows?: number
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows ?? 4}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${focused ? 'var(--signal)' : 'var(--border-strong)'}`,
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
        fontSize: 13.5,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
        resize: 'vertical',
        lineHeight: 1.5,
        opacity: disabled ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxShadow: focused
          ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
          : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}
    />
  )
}

function StyledSelect({
  id,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string
  value: string
  disabled?: boolean
  onChange: React.ChangeEventHandler<HTMLSelectElement>
  children: React.ReactNode
}) {
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
        height: 38,
        padding: '0 28px 0 10px',
        borderRadius: 8,
        border: `1px solid ${focused ? 'var(--signal)' : 'var(--border-strong)'}`,
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
        fontSize: 13.5,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
        opacity: disabled ? 0.66 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
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

function Field({
  label,
  htmlFor,
  error,
  hint,
  labelRight,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: React.ReactNode
  labelRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
            fontFamily: "'Inter', sans-serif",
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
            fontSize: 11,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </span>
      )}
      {!error && hint && hint}
    </div>
  )
}

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

  // Controlled state for dirty-tracking
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
  const [slugManual, setSlugManual] = useState(true)
  const [slugFocused, setSlugFocused] = useState(false)
  const [urlFocused, setUrlFocused] = useState(false)

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
    aboutVal !== (venue.about ?? '')

  // Save state
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    slug?: string | undefined
  }>({})

  // Generate-about state
  const [generateState, setGenerateState] = useState<
    'idle' | 'loading' | 'error'
  >('idle')
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function handleGenerateAbout() {
    setGenerateState('loading')
    setGenerateError(null)
    try {
      const result = await generateVenueAbout(venue.id)
      if (!result.success || !result.data) {
        setGenerateError(result.error ?? 'Generation failed')
        setGenerateState('error')
        return
      }
      const { capacity, venueType, about } = result.data
      setCapacityVal(capacity != null ? String(capacity) : '')
      setVenueTypeVal(venueType)
      setAboutVal(about)
      setGenerateState('idle')
    } catch {
      setGenerateError('Network error — could not reach API')
      setGenerateState('error')
    }
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

  function handleVerifyToggle() {
    startTransition(async () => {
      if (venue.verified) {
        await unverifyVenue(venue.id)
      } else {
        await verifyVenue(venue.id)
      }
      router.refresh()
    })
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

  const { crawlHealth } = venue

  let sourceHost = ''
  try {
    sourceHost = new URL(venue.websiteUrl).hostname
  } catch {
    sourceHost = venue.websiteUrl
  }

  const healthColor =
    crawlHealth.sevenDayPercent >= 80
      ? 'var(--success)'
      : crawlHealth.sevenDayPercent >= 50
        ? 'var(--warning)'
        : 'var(--danger)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        paddingBottom: 80,
        position: 'relative',
      }}
    >
      {/* Header */}
      <SectionHead
        eyebrow="Venue details"
        title={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {venue.name}
            <StatusBadge kind={venue.verified ? 'success' : 'warning'} dot>
              {venue.verified ? 'Verified' : 'Unverified'}
            </StatusBadge>
            {!venue.active && <StatusBadge kind="danger">Paused</StatusBadge>}
          </span>
        }
        subtitle={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.02em',
            }}
          >
            <MapPin size={12} color="var(--fg-subtle)" />
            <span style={{ color: 'var(--fg-muted)' }}>{venue.city}</span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--signal)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {sourceHost}
              <ExternalLink size={10} />
            </a>
            {crawlHealth.lastCrawledAt && (
              <>
                <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                <span style={{ color: 'var(--fg-muted)' }}>
                  last crawled <RelTime iso={crawlHealth.lastCrawledAt} />
                </span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <Link
              href={`/v/${venue.slug}`}
              target="_blank"
              style={{ textDecoration: 'none' }}
            >
              <AdminButton variant="outline" size="sm" iconRight={ExternalLink}>
                View public page
              </AdminButton>
            </Link>
            <CrawlTriggerButton venueId={venue.id} />
          </>
        }
      />

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
        {/* Left: form */}
        <Panel padding={20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MonoLabel>Details</MonoLabel>

            {/* Venue name */}
            <Field label="Venue name" htmlFor="edit-venue-name">
              <StyledInput
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
            </Field>

            {/* Slug */}
            <Field
              label="Slug"
              htmlFor="edit-venue-slug"
              {...(fieldErrors.slug ? { error: fieldErrors.slug } : {})}
              labelRight={
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
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
                  height: 38,
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
                  concertcrawl.app/v/
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
                      setFieldErrors((prev) => ({ ...prev, slug: undefined }))
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
            </Field>

            {/* Source URL */}
            <Field
              label="Source URL"
              htmlFor="edit-venue-url"
              labelRight={<RobotsHint allowed={venue.robotsTxtAllowed} />}
              hint={
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  The events page we crawl daily.
                  {venue.robotsTxtAllowed === null && (
                    <span
                      style={{
                        color: 'var(--fg-subtle)',
                        display: 'block',
                        marginTop: 2,
                      }}
                    >
                      robots.txt has not been checked yet — it will be verified
                      on the next crawl run.
                    </span>
                  )}
                </span>
              }
            >
              <div
                onFocus={() => setUrlFocused(true)}
                onBlur={() => setUrlFocused(false)}
                style={{
                  display: 'flex',
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${urlFocused ? 'var(--signal)' : 'var(--border-strong)'}`,
                  background: 'var(--bg-elevated)',
                  overflow: 'hidden',
                  alignItems: 'center',
                  boxShadow: urlFocused
                    ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
                    : 'none',
                  transition: 'border-color .12s, box-shadow .12s',
                }}
              >
                <input
                  ref={websiteUrlRef}
                  id="edit-venue-url"
                  type="url"
                  defaultValue={venue.websiteUrl}
                  disabled={isDisabled}
                  onChange={(evt) => setUrlVal(evt.target.value)}
                  style={{
                    all: 'unset',
                    flex: 1,
                    minWidth: 0,
                    padding: '0 10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: 'var(--fg)',
                    cursor: isDisabled ? 'not-allowed' : 'text',
                    opacity: isDisabled ? 0.66 : 1,
                  }}
                />
                <div style={{ padding: '0 6px', flexShrink: 0 }}>
                  <FaviconChip url={urlVal} />
                </div>
              </div>
            </Field>

            {/* City */}
            <Field label="City" htmlFor="edit-venue-city">
              <StyledInput
                id="edit-venue-city"
                inputRef={cityRef}
                defaultValue={venue.city}
                disabled={isDisabled}
                onChange={(evt) => setCityVal(evt.target.value)}
              />
            </Field>

            {/* Address */}
            <Field label="Street address" htmlFor="edit-venue-address">
              <StyledInput
                id="edit-venue-address"
                inputRef={addressRef}
                defaultValue={venue.address ?? ''}
                disabled={isDisabled}
                placeholder="e.g. 3317 E Colfax Ave, Denver, CO 80206"
                onChange={(evt) => setAddressVal(evt.target.value)}
              />
            </Field>

            {/* Capacity */}
            <Field label="Capacity" htmlFor="edit-venue-capacity">
              <StyledInput
                id="edit-venue-capacity"
                type="number"
                value={capacityVal}
                placeholder="e.g. 1600"
                disabled={isDisabled}
                min={1}
                onChange={(evt) => setCapacityVal(evt.target.value)}
              />
            </Field>

            {/* Venue type */}
            <Field label="Venue type" htmlFor="edit-venue-type">
              <>
                <StyledInput
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
            </Field>

            {/* About */}
            <Field
              label="About"
              htmlFor="edit-venue-about"
              labelRight={
                <button
                  type="button"
                  onClick={() => void handleGenerateAbout()}
                  disabled={isDisabled || generateState === 'loading'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor:
                      isDisabled || generateState === 'loading'
                        ? 'not-allowed'
                        : 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:
                      generateState === 'loading'
                        ? 'var(--fg-subtle)'
                        : 'var(--signal)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {generateState === 'loading' ? (
                    <>
                      <Loader2
                        size={10}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      Generating…
                    </>
                  ) : (
                    'Generate ↗'
                  )}
                </button>
              }
            >
              <>
                <StyledTextarea
                  id="edit-venue-about"
                  value={aboutVal}
                  placeholder="A short description of the venue's character and history."
                  disabled={isDisabled}
                  rows={4}
                  onChange={(evt) => setAboutVal(evt.target.value)}
                />
                {generateError && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--danger)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {generateError}
                  </span>
                )}
              </>
            </Field>

            {/* Ticket vendor */}
            <Field
              label="Ticket Vendor"
              htmlFor="edit-venue-ticket-vendor"
              hint={
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Override the auto-detected ticket vendor for this venue.
                </span>
              }
            >
              <StyledSelect
                id="edit-venue-ticket-vendor"
                value={ticketVendorVal ?? ''}
                disabled={isDisabled}
                onChange={(evt) => setTicketVendorVal(evt.target.value || null)}
              >
                <option value="">— Auto-detected / Unknown —</option>
                <option value="axs">AXS</option>
                <option value="ticketmaster">Ticketmaster</option>
                <option value="seatgeek">SeatGeek</option>
                <option value="dice">DICE</option>
                <option value="eventbrite">Eventbrite</option>
                <option value="venue_box_office">Venue Box Office</option>
                <option value="unknown">Unknown</option>
              </StyledSelect>
            </Field>
          </div>

          {/* Crawl settings */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 20,
              marginTop: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <MonoLabel>Crawl settings</MonoLabel>

            {/* Wait strategy */}
            <Field
              label="Wait strategy"
              htmlFor="edit-venue-wait-until"
              hint={
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {waitUntilVal === 'networkidle' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        Network idle
                      </strong>{' '}
                      — waits until no network requests have fired for 500ms.
                      Most reliable for SPAs that load event data via API calls,
                      but will time out on sites with persistent WebSocket
                      connections or polling scripts.
                    </>
                  )}
                  {waitUntilVal === 'load' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>Load</strong> —
                      waits for the page&apos;s{' '}
                      <code
                        style={{
                          fontFamily: 'monospace',
                          background: 'var(--surface-1)',
                          padding: '1px 3px',
                          borderRadius: 3,
                        }}
                      >
                        load
                      </code>{' '}
                      event. Faster and more forgiving — good for sites that
                      embed event data in the initial HTML (JSON-LD, microdata)
                      or that never fully quiesce. Use this when{' '}
                      <strong style={{ color: 'var(--fg)' }}>
                        Network idle times out
                      </strong>
                      .
                    </>
                  )}
                  {waitUntilVal === 'domcontentloaded' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        DOM content loaded
                      </strong>{' '}
                      — fires as soon as the HTML is parsed, before stylesheets
                      or images load. Fastest option, but may miss content
                      injected by deferred scripts. Only use if{' '}
                      <strong style={{ color: 'var(--fg)' }}>Load</strong> still
                      times out or if the venue page is fully server-rendered
                      with no client-side hydration.
                    </>
                  )}
                </div>
              }
            >
              <StyledSelect
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
              </StyledSelect>
            </Field>

            {/* Fetch mode */}
            <Field
              label="Fetch mode"
              htmlFor="edit-venue-crawl-mode"
              hint={
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {crawlModeVal === null && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        Auto-detect
                      </strong>{' '}
                      — tries plain HTTP first. If events are found, saves{' '}
                      <strong style={{ color: 'var(--fg)' }}>HTTP only</strong>{' '}
                      for future crawls. Falls back to browser if HTTP returns
                      no events.
                    </>
                  )}
                  {crawlModeVal === 'http' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>HTTP only</strong>{' '}
                      — fetches the page with a plain HTTP request. Fast and
                      lightweight. Only works for server-rendered sites where
                      event data is present in the raw HTML. A crawl returning
                      zero events is recorded as a failure — it will not
                      escalate to browser.
                    </>
                  )}
                  {crawlModeVal === 'browser' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>
                        Browser only
                      </strong>{' '}
                      — always uses Playwright (headless Chromium). Required for
                      JavaScript-rendered pages and SPAs. Set this if
                      auto-detect incorrectly detected HTTP mode for a venue.
                    </>
                  )}
                </div>
              }
            >
              <StyledSelect
                id="edit-venue-crawl-mode"
                value={crawlModeVal ?? ''}
                disabled={isDisabled}
                onChange={(evt) => {
                  const val = evt.target.value
                  setCrawlModeVal(
                    val === 'http' || val === 'browser' ? val : null,
                  )
                }}
              >
                <option value="">
                  auto-detect — HTTP first, browser fallback
                </option>
                <option value="http">HTTP only — server-rendered pages</option>
                <option value="browser">
                  Browser only — JS-rendered pages
                </option>
              </StyledSelect>
            </Field>

            {/* Crawl delay */}
            <Field
              label="Crawl delay (ms)"
              htmlFor="edit-venue-crawl-delay"
              hint={
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Minimum wait between this venue&apos;s page requests. Default
                  is 3000ms (3 seconds). Increase if the venue is rate-limiting
                  or returning 429 errors; decrease only for venues that
                  explicitly permit faster crawls. Range: 1000–30000ms.
                </span>
              }
            >
              <StyledInput
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
            </Field>

            {/* Wait for selector */}
            <Field
              label="Wait for selector (optional)"
              htmlFor="edit-venue-wait-for-selector"
              hint={
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  CSS selector to wait for after page load — use for SPAs where
                  content is injected by JavaScript. Example:{' '}
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
                  . When set,{' '}
                  <strong style={{ color: 'var(--fg)' }}>
                    DOM content loaded
                  </strong>{' '}
                  is used for navigation and the wait strategy above is ignored.
                </span>
              }
            >
              <StyledInput
                id="edit-venue-wait-for-selector"
                value={waitForSelectorVal}
                placeholder="e.g. .event-card or [data-testid='event']"
                disabled={isDisabled}
                onChange={(evt) => setWaitForSelectorVal(evt.target.value)}
              />
            </Field>
          </div>
        </Panel>

        {/* Right: meta sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Health */}
          <MetaCard
            title="Health · 7 days"
            action={
              <MonoLabel color={healthColor}>
                {crawlHealth.sevenDayPercent}%
              </MonoLabel>
            }
          >
            <HealthBarSparkline sparkline={crawlHealth.sparkline} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 12,
              }}
            >
              {[
                {
                  label: 'Last crawl',
                  value: crawlHealth.lastCrawledAt ? (
                    <RelTime iso={crawlHealth.lastCrawledAt} />
                  ) : (
                    '—'
                  ),
                  valueColor: 'var(--fg)',
                },
                {
                  label: 'Avg duration',
                  value:
                    crawlHealth.avgDurationMs !== null
                      ? formatDurationMs(crawlHealth.avgDurationMs)
                      : '—',
                  valueColor: 'var(--fg)',
                },
                {
                  label: 'Events tracked',
                  value: String(crawlHealth.eventsTracked),
                  valueColor: 'var(--fg)',
                },
                {
                  label: 'Consecutive fails',
                  value: String(crawlHealth.consecutiveFails),
                  valueColor:
                    crawlHealth.consecutiveFails === 0
                      ? 'var(--success)'
                      : 'var(--danger)',
                },
              ].map(({ label, value, valueColor }) => (
                <div key={label}>
                  <MonoLabel>{label}</MonoLabel>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 15,
                      fontWeight: 700,
                      color: valueColor,
                      letterSpacing: '0.01em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </MetaCard>

          {/* Verification */}
          <MetaCard
            title="Verification"
            action={
              <StatusBadge kind={venue.verified ? 'success' : 'warning'} dot>
                {venue.verified ? 'Verified' : 'Unverified'}
              </StatusBadge>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.5,
                }}
              >
                {venue.verified && venue.verifiedBy && venue.verifiedAt ? (
                  <>
                    Verified by{' '}
                    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
                      {venue.verifiedBy}
                    </span>{' '}
                    on{' '}
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: 'var(--fg)',
                      }}
                    >
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'America/Denver',
                      }).format(new Date(venue.verifiedAt))}
                    </span>
                    . Verified venues appear on the public Browse page.
                  </>
                ) : (
                  'Verified venues appear on the public Browse page.'
                )}
              </p>
              <AdminButton
                variant="ghost"
                size="sm"
                icon={venue.verified ? ShieldOff : ShieldCheck}
                disabled={isPending}
                onClick={handleVerifyToggle}
                type="button"
                style={{ alignSelf: 'flex-start' }}
              >
                {venue.verified ? 'Unverify venue' : 'Verify venue'}
              </AdminButton>
            </div>
          </MetaCard>

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

          {/* Danger zone */}
          <MetaCard title="Danger zone" danger>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DangerRow
                title="Pause this venue"
                body="Stops daily crawls. Existing events stay published."
                action={
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
                }
              />
              <DangerRow
                title="Delete venue"
                body="Removes the venue and detaches its events. Cannot be undone."
                action={
                  <DeleteVenueDialog
                    venueId={venue.id}
                    venueName={venue.name}
                    eventsTracked={crawlHealth.eventsTracked}
                  />
                }
              />
            </div>
          </MetaCard>
        </div>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: 'var(--fg)',
            color: 'var(--bg)',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
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
            <span>Unsaved changes</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isDisabled}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                padding: '8px 14px',
                color: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.7,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Discard
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
