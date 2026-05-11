'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VenueWithCrawlHealth, CrawlRun } from '@concert-crawl/types'
import {
  updateVenue,
  pauseVenue,
  activateVenue,
  verifyVenue,
  unverifyVenue,
} from '@/lib/actions/venues'
import {
  AdminButton,
  Panel,
  MonoLabel,
  StatusBadge,
  RelTime,
} from '@/components/admin/primitives'
import { DeleteVenueDialog } from './DeleteVenueDialog'
import { CrawlTriggerButton } from './crawl-trigger-button'
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

function inputStyle(
  hasError: boolean,
  isDisabled: boolean,
): React.CSSProperties {
  return {
    width: '100%',
    height: 32,
    padding: '0 10px',
    borderRadius: 6,
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    background: isDisabled ? 'var(--surface-1)' : 'var(--bg)',
    color: 'var(--fg)',
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    opacity: isDisabled ? 0.66 : 1,
    cursor: isDisabled ? 'not-allowed' : 'text',
  }
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        htmlFor={htmlFor}
        style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)' }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>
      )}
      {!error && hint && hint}
    </div>
  )
}

function CrawlDotSparkline({
  sparkline,
}: {
  sparkline: { date: string; success: boolean; hasRun: boolean }[]
}) {
  const allEmpty = sparkline.every((day) => !day.hasRun)
  if (allEmpty) {
    return (
      <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>No data</span>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {sparkline.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${!day.hasRun ? 'no crawl' : day.success ? 'success' : 'failed'}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: !day.hasRun
              ? 'var(--border)'
              : day.success
                ? 'var(--success)'
                : 'var(--danger)',
          }}
        />
      ))}
    </div>
  )
}

function CrawlRunRow({ run }: { run: CrawlRun }) {
  const statusColor =
    run.status === 'success'
      ? 'var(--success)'
      : run.status === 'failed'
        ? 'var(--danger)'
        : 'var(--warning)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
          }}
        />
        <span style={{ color: 'var(--fg-muted)' }}>
          <RelTime iso={run.createdAt} />
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, color: 'var(--fg-muted)' }}>
        <span>{run.eventsFound} found</span>
        {run.durationMs !== null && (
          <span>{formatDurationMs(run.durationMs)}</span>
        )}
      </div>
    </div>
  )
}

interface Props {
  venue: VenueWithCrawlHealth
  recentRuns: CrawlRun[]
}

export function VenueDetailsClient({ venue, recentRuns }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const nameRef = useRef<HTMLInputElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const websiteUrlRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(venue.active)
  const [slugManual, setSlugManual] = useState(true)

  // Track dirty state by checking against initial values
  const [nameVal, setNameVal] = useState(venue.name)
  const [slugVal, setSlugVal] = useState(venue.slug)
  const [urlVal, setUrlVal] = useState(venue.websiteUrl)
  const [cityVal, setCityVal] = useState(venue.city)

  const isDirty =
    nameVal !== venue.name ||
    slugVal !== venue.slug ||
    urlVal !== venue.websiteUrl ||
    cityVal !== venue.city ||
    active !== venue.active

  // Save state
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ slug?: string | undefined }>(
    {},
  )

  const isDisabled = saveState === 'saving'

  function handleDiscard() {
    setNameVal(venue.name)
    setSlugVal(venue.slug)
    setUrlVal(venue.websiteUrl)
    setCityVal(venue.city)
    setActive(venue.active)
    setSaveState('idle')
    setSaveError(null)
    setFieldErrors({})
    if (nameRef.current) nameRef.current.value = venue.name
    if (slugRef.current) slugRef.current.value = venue.slug
    if (websiteUrlRef.current) websiteUrlRef.current.value = venue.websiteUrl
    if (cityRef.current) cityRef.current.value = venue.city
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
    formData.set('active', String(active))

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
  const lastCrawledLabel = crawlHealth.lastCrawledAt
    ? new Date(crawlHealth.lastCrawledAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never'

  let sourceHost = ''
  try {
    sourceHost = new URL(venue.websiteUrl).hostname
  } catch {
    sourceHost = venue.websiteUrl
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--fg)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {venue.name}
            </h1>
            <StatusBadge kind={venue.verified ? 'success' : 'warning'}>
              {venue.verified ? 'Verified' : 'Unverified'}
            </StatusBadge>
            {!venue.active && <StatusBadge kind="danger">Paused</StatusBadge>}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            <span>{venue.city}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--signal)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {sourceHost} <ExternalLink size={10} />
            </a>
            {crawlHealth.lastCrawledAt && (
              <>
                <span style={{ color: 'var(--border-strong)' }}>·</span>
                <span>Last crawled {lastCrawledLabel}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        </div>
      </div>

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
          gridTemplateColumns: '1fr 360px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left: form */}
        <Panel padding={24}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <MonoLabel>Details</MonoLabel>

            {/* Name */}
            <Field label="Name" htmlFor="edit-venue-name">
              <input
                ref={nameRef}
                id="edit-venue-name"
                type="text"
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
                style={inputStyle(false, isDisabled)}
              />
            </Field>

            {/* Slug */}
            <Field
              label="Slug"
              htmlFor="edit-venue-slug"
              error={fieldErrors.slug}
              hint={
                <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                  concertcrawl.app/v/
                  <span style={{ color: 'var(--fg)' }}>{slugVal}</span>
                </span>
              }
            >
              <div style={{ display: 'flex', gap: 6 }}>
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
                    ...inputStyle(!!fieldErrors.slug, isDisabled),
                    flex: 1,
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
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
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
            <Field label="Source URL" htmlFor="edit-venue-url">
              <input
                ref={websiteUrlRef}
                id="edit-venue-url"
                type="url"
                defaultValue={venue.websiteUrl}
                disabled={isDisabled}
                onChange={(evt) => setUrlVal(evt.target.value)}
                style={inputStyle(false, isDisabled)}
              />
            </Field>

            {/* City */}
            <Field label="City" htmlFor="edit-venue-city">
              <input
                ref={cityRef}
                id="edit-venue-city"
                type="text"
                defaultValue={venue.city}
                disabled={isDisabled}
                onChange={(evt) => setCityVal(evt.target.value)}
                style={inputStyle(false, isDisabled)}
              />
            </Field>

            {/* Active toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
                htmlFor="edit-venue-active"
              >
                Active
              </label>
              <button
                id="edit-venue-active"
                type="button"
                role="switch"
                aria-checked={active}
                disabled={isDisabled}
                onClick={() => setActive((prev) => !prev)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  border: 'none',
                  background: active ? 'var(--signal)' : 'var(--border-strong)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background 150ms',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: active ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 150ms',
                  }}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* Right: meta sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Health panel */}
          <Panel padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <MonoLabel>Health · 7 days</MonoLabel>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color:
                      crawlHealth.sevenDayPercent >= 80
                        ? 'var(--success)'
                        : crawlHealth.sevenDayPercent >= 50
                          ? 'var(--warning)'
                          : 'var(--danger)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {crawlHealth.sevenDayPercent}%
                </span>
              </div>

              <CrawlDotSparkline sparkline={crawlHealth.sparkline} />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {[
                  {
                    label: 'Last crawl',
                    value: crawlHealth.lastCrawledAt
                      ? new Date(crawlHealth.lastCrawledAt).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' },
                        )
                      : 'Never',
                  },
                  {
                    label: 'Avg duration',
                    value:
                      crawlHealth.avgDurationMs !== null
                        ? formatDurationMs(crawlHealth.avgDurationMs)
                        : '—',
                  },
                  {
                    label: 'Events tracked',
                    value: String(crawlHealth.eventsTracked),
                  },
                  {
                    label: 'Consec. fails',
                    value: String(crawlHealth.consecutiveFails),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: 'var(--surface-1)',
                      borderRadius: 6,
                      padding: '8px 10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--fg-subtle)',
                        fontFamily: 'monospace',
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--fg)',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Verification panel */}
          <Panel padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MonoLabel>Verification</MonoLabel>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <StatusBadge kind={venue.verified ? 'success' : 'warning'}>
                  {venue.verified ? 'Verified' : 'Unverified'}
                </StatusBadge>
                <AdminButton
                  variant={venue.verified ? 'ghost' : 'outline'}
                  size="sm"
                  icon={venue.verified ? ShieldOff : ShieldCheck}
                  disabled={isPending}
                  onClick={handleVerifyToggle}
                  type="button"
                >
                  {venue.verified ? 'Unverify' : 'Verify'}
                </AdminButton>
              </div>
            </div>
          </Panel>

          {/* Recent runs panel */}
          <Panel padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <MonoLabel>Recent runs</MonoLabel>
                <Link
                  href={`/admin/crawls?venue=${venue.id}`}
                  style={{
                    fontSize: 12,
                    color: 'var(--signal)',
                    textDecoration: 'none',
                  }}
                >
                  View all →
                </Link>
              </div>
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
                  {recentRuns.map((run) => (
                    <CrawlRunRow key={run.id} run={run} />
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Danger zone */}
          <Panel padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MonoLabel>Danger zone</MonoLabel>
              <div style={{ display: 'flex', gap: 8 }}>
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
                <DeleteVenueDialog
                  venueId={venue.id}
                  venueName={venue.name}
                  eventsTracked={crawlHealth.eventsTracked}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--fg)',
            color: 'var(--bg)',
            borderRadius: 100,
            padding: '8px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span style={{ opacity: 0.7, marginRight: 4 }}>Unsaved changes</span>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isDisabled}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 20,
              padding: '4px 12px',
              color: 'inherit',
              fontSize: 12,
              fontWeight: 500,
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
              background: 'var(--bg)',
              border: 'none',
              borderRadius: 20,
              padding: '4px 16px',
              color: 'var(--fg)',
              fontSize: 12,
              fontWeight: 600,
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
      )}
    </div>
  )
}
