'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import {
  Plus,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Play,
  X,
  ChevronRight,
} from 'lucide-react'
import { createVenue, createVenueAndCrawl } from '@/lib/actions/venues'
import { AdminButton, Kbd } from '@/components/admin/primitives'

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

type SubmitState = 'idle' | 'validating' | 'submitting' | 'success' | 'error'
type FocusedField = 'name' | 'slug' | 'url' | 'city' | 'address' | null
type RobotsState = 'idle' | 'checking' | 'allowed' | 'disallowed' | 'unknown'

interface FieldError {
  name?: string | undefined
  slug?: string | undefined
  websiteUrl?: string | undefined
  city?: string | undefined
}

interface AddVenueModalProps {
  onSuccess?: () => void
  fullWidth?: boolean
}

export function AddVenueModal({
  onSuccess,
  fullWidth = false,
}: AddVenueModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errors, setErrors] = useState<FieldError>({})
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [slugManual, setSlugManual] = useState(false)
  const [robotsState, setRobotsState] = useState<RobotsState>('idle')
  const [urlValue, setUrlValue] = useState('')
  const [focusedField, setFocusedField] = useState<FocusedField>(null)
  const [closeButtonFocused, setCloseButtonFocused] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const websiteUrlRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)

  const disabled = submitState === 'submitting' || submitState === 'success'

  function resetState() {
    setSubmitState('idle')
    setErrors({})
    setBannerError(null)
    setSlugManual(false)
    setRobotsState('idle')
    setUrlValue('')
    setFocusedField(null)
    setCloseButtonFocused(false)
    if (nameRef.current) nameRef.current.value = ''
    if (slugRef.current) slugRef.current.value = ''
    if (websiteUrlRef.current) websiteUrlRef.current.value = ''
    if (cityRef.current) cityRef.current.value = 'Denver'
    if (addressRef.current) addressRef.current.value = ''
  }

  function handleNameChange(evt: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManual && slugRef.current) {
      slugRef.current.value = slugify(evt.target.value)
    }
    setErrors((prev) => ({ ...prev, name: undefined }))
  }

  function handleSlugChange() {
    setSlugManual(true)
    setErrors((prev) => ({ ...prev, slug: undefined }))
  }

  function handleRegenerateSlug() {
    if (nameRef.current && slugRef.current) {
      slugRef.current.value = slugify(nameRef.current.value)
      setSlugManual(false)
      setErrors((prev) => ({ ...prev, slug: undefined }))
    }
  }

  const checkRobots = useCallback(async (url: string) => {
    if (!url) return
    setRobotsState('checking')
    try {
      const parsed = new URL(url)
      const res = await fetch(
        `/api/admin/robots-check?url=${encodeURIComponent(parsed.href)}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { allowed: boolean | null }
        setRobotsState(
          data.allowed === null
            ? 'unknown'
            : data.allowed
              ? 'allowed'
              : 'disallowed',
        )
      } else {
        setRobotsState('unknown')
      }
    } catch {
      setRobotsState('unknown')
    }
  }, [])

  function handleUrlBlur(evt: React.FocusEvent<HTMLInputElement>) {
    setFocusedField(null)
    const url = evt.target.value.trim()
    setErrors((prev) => ({ ...prev, websiteUrl: undefined }))
    if (url) void checkRobots(url)
  }

  function validate(): FieldError {
    const fieldErrors: FieldError = {}
    const name = nameRef.current?.value.trim() ?? ''
    const slug = slugRef.current?.value.trim() ?? ''
    const url = websiteUrlRef.current?.value.trim() ?? ''
    const city = cityRef.current?.value.trim() ?? ''

    if (!name || name.length < 2)
      fieldErrors.name = 'Name is required (2+ chars)'
    if (
      !slug ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) ||
      slug.length < 2
    ) {
      fieldErrors.slug =
        'Slug must be 2–60 chars, lowercase alphanumeric and hyphens'
    }
    try {
      new URL(url)
      if (!url.startsWith('http'))
        fieldErrors.websiteUrl = 'Must be an http:// or https:// URL'
    } catch {
      fieldErrors.websiteUrl = 'Enter a valid URL (http:// or https://...)'
    }
    if (!city || city.length < 2) fieldErrors.city = 'City is required'

    return fieldErrors
  }

  async function handleSubmit(crawlAfter: boolean) {
    setBannerError(null)
    setErrors({})

    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setSubmitState('submitting')

    const formData = new FormData()
    formData.set('name', nameRef.current!.value.trim())
    formData.set('slug', slugRef.current!.value.trim())
    formData.set('websiteUrl', websiteUrlRef.current!.value.trim())
    formData.set('city', cityRef.current!.value.trim() || 'Denver')
    formData.set('address', addressRef.current?.value.trim() ?? '')
    formData.set('active', 'true')

    try {
      const action = crawlAfter ? createVenueAndCrawl : createVenue
      const result = await action(formData)

      if (!result.success) {
        if (result.field === 'slug') {
          setErrors({ slug: result.error ?? 'Slug already in use' })
          setBannerError('Slug already in use — choose a different one')
        } else {
          setBannerError(result.error ?? 'Something went wrong')
        }
        setSubmitState('error')
        return
      }

      setSubmitState('success')
      setTimeout(() => {
        setOpen(false)
        resetState()
        router.refresh()
        onSuccess?.()
      }, 400)
    } catch {
      setBannerError('An unexpected error occurred. Please try again.')
      setSubmitState('error')
    }
  }

  useEffect(() => {
    function handleKeyDown(evt: KeyboardEvent) {
      if (!open) return
      if (evt.key === 'Escape') {
        setOpen(false)
        resetState()
      }
      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'Enter') {
        evt.preventDefault()
        if (!disabled) void handleSubmit(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const showFavicon = urlValue && robotsState !== 'checking'

  return (
    <>
      <AdminButton
        variant="primary"
        icon={Plus}
        type="button"
        fullWidth={fullWidth}
        onClick={() => setOpen(true)}
      >
        Add venue
      </AdminButton>

      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) resetState()
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          />
          <Dialog.Popup
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 51,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                width: '100%',
                maxWidth: 580,
                boxShadow:
                  '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '20px 22px 14px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-muted)',
                      marginBottom: 6,
                    }}
                  >
                    new venue
                  </div>
                  <Dialog.Title
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--fg)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    Add a crawl target
                  </Dialog.Title>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12.5,
                      color: 'var(--fg-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Point us at an events page. We&apos;ll respect robots.txt
                    and crawl daily at 3 AM MT.
                  </div>
                </div>
                <Dialog.Close
                  render={
                    <button
                      type="button"
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                        color: 'var(--fg-muted)',
                        display: 'flex',
                        flexShrink: 0,
                        outline: closeButtonFocused
                          ? '2px solid var(--signal)'
                          : 'none',
                        outlineOffset: 2,
                      }}
                      aria-label="Close"
                      onClick={resetState}
                      onFocus={() => setCloseButtonFocused(true)}
                      onBlur={() => setCloseButtonFocused(false)}
                    >
                      <X size={16} />
                    </button>
                  }
                />
              </div>

              {/* Error banner */}
              {bannerError && (
                <div
                  style={{
                    margin: '16px 22px 0',
                    padding: '10px 12px',
                    background: 'rgba(184,56,26,0.1)',
                    border: '1px solid rgba(184,56,26,0.25)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--danger)',
                  }}
                >
                  <AlertCircle size={14} />
                  {bannerError}
                </div>
              )}

              {/* Form */}
              <div style={{ padding: 22 }}>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* Venue name */}
                  <Field
                    label="Venue name"
                    htmlFor="add-venue-name"
                    error={errors.name}
                  >
                    <input
                      ref={nameRef}
                      id="add-venue-name"
                      type="text"
                      placeholder="e.g. Bluebird Theater"
                      disabled={disabled}
                      onChange={handleNameChange}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(
                        !!errors.name,
                        disabled,
                        focusedField === 'name',
                      )}
                    />
                  </Field>

                  {/* Slug with inline prefix */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <label htmlFor="add-venue-slug" style={labelStyle}>
                        Slug
                      </label>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        auto-generated
                      </span>
                    </div>
                    <div
                      style={compositeWrapperStyle(
                        !!errors.slug,
                        disabled,
                        focusedField === 'slug',
                      )}
                    >
                      <span
                        style={{
                          padding: '0 10px',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono, monospace)',
                          letterSpacing: '0.02em',
                          color: 'var(--fg-muted)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid var(--border)',
                          background: 'var(--surface-1)',
                        }}
                      >
                        concertcrawl.app/v/
                      </span>
                      <input
                        ref={slugRef}
                        id="add-venue-slug"
                        type="text"
                        placeholder="bluebird-theater"
                        disabled={disabled}
                        onChange={handleSlugChange}
                        onFocus={() => setFocusedField('slug')}
                        onBlur={() => setFocusedField(null)}
                        style={{
                          flex: 1,
                          height: 38,
                          padding: '0 12px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                          outline: 'none',
                          cursor: disabled ? 'not-allowed' : 'text',
                          minWidth: 0,
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateSlug}
                        disabled={disabled}
                        title="Regenerate slug from name"
                        aria-label="Regenerate slug from name"
                        style={{
                          all: 'unset',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderLeft: '1px solid var(--border)',
                          color: 'var(--fg-muted)',
                          background: 'var(--surface-1)',
                        }}
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                    {errors.slug ? (
                      <span
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {errors.slug}
                      </span>
                    ) : (
                      <span
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        Used in the public URL. Auto-derived from the venue
                        name.
                      </span>
                    )}
                  </div>

                  {/* Source URL */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <label htmlFor="add-venue-url" style={labelStyle}>
                        Source URL
                      </label>
                      <RobotsChip state={robotsState} hasUrl={!!urlValue} />
                    </div>
                    <div
                      style={compositeWrapperStyle(
                        !!errors.websiteUrl,
                        disabled,
                        focusedField === 'url',
                      )}
                    >
                      <input
                        ref={websiteUrlRef}
                        id="add-venue-url"
                        type="url"
                        placeholder="https://www.bluebirdtheater.net/calendar/"
                        disabled={disabled}
                        onFocus={() => setFocusedField('url')}
                        onBlur={handleUrlBlur}
                        onChange={() => {
                          const val = websiteUrlRef.current?.value.trim() ?? ''
                          setUrlValue(val)
                          setErrors((prev) => ({
                            ...prev,
                            websiteUrl: undefined,
                          }))
                          setRobotsState('idle')
                        }}
                        style={{
                          flex: 1,
                          height: 38,
                          padding: '0 12px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                          outline: 'none',
                          cursor: disabled ? 'not-allowed' : 'text',
                          minWidth: 0,
                        }}
                      />
                      {showFavicon && (
                        <div
                          style={{
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FaviconChip url={urlValue} />
                        </div>
                      )}
                    </div>
                    {errors.websiteUrl ? (
                      <span
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {errors.websiteUrl}
                      </span>
                    ) : (
                      <span
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        The events page we&apos;ll crawl. Usually a /calendar,
                        /events, or /shows path.
                      </span>
                    )}
                  </div>

                  {/* City */}
                  <Field
                    label="City"
                    htmlFor="add-venue-city"
                    error={errors.city}
                  >
                    <input
                      ref={cityRef}
                      id="add-venue-city"
                      type="text"
                      defaultValue="Denver"
                      disabled={disabled}
                      onChange={() =>
                        setErrors((prev) => ({ ...prev, city: undefined }))
                      }
                      onFocus={() => setFocusedField('city')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(
                        !!errors.city,
                        disabled,
                        focusedField === 'city',
                      )}
                    />
                  </Field>

                  {/* Address */}
                  <Field label="Street address" htmlFor="add-venue-address">
                    <input
                      ref={addressRef}
                      id="add-venue-address"
                      type="text"
                      placeholder="e.g. 3317 E Colfax Ave, Denver, CO 80206"
                      disabled={disabled}
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(
                        false,
                        disabled,
                        focusedField === 'address',
                      )}
                    />
                  </Field>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px 14px 22px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'var(--fg-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Kbd>Esc</Kbd> cancel
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Dialog.Close
                    render={
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        type="button"
                        onClick={resetState}
                      >
                        Cancel
                      </AdminButton>
                    }
                  />

                  <AdminButton
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={disabled}
                    onClick={() => void handleSubmit(false)}
                  >
                    {submitState === 'success' ? (
                      <>
                        <Check size={13} /> Saved
                      </>
                    ) : (
                      'Save venue'
                    )}
                  </AdminButton>

                  <AdminButton
                    variant="primary"
                    size="sm"
                    type="button"
                    disabled={disabled}
                    onClick={() => void handleSubmit(true)}
                    style={{ gap: 6 }}
                  >
                    {submitState === 'submitting' ? (
                      <Loader2
                        size={13}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    ) : submitState === 'success' ? (
                      <Check size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {submitState === 'submitting'
                        ? 'Saving…'
                        : submitState === 'success'
                          ? 'Saved'
                          : 'Save & crawl now'}
                      {submitState === 'idle' || submitState === 'error' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            gap: 2,
                            opacity: 0.7,
                          }}
                        >
                          <Kbd>⌘</Kbd>
                          <Kbd>↵</Kbd>
                        </span>
                      ) : null}
                    </span>
                    {submitState === 'idle' || submitState === 'error' ? (
                      <ChevronRight size={13} style={{ opacity: 0.7 }} />
                    ) : null}
                  </AdminButton>
                </div>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

// ── Atoms ────────────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  error,
  style,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | undefined
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label htmlFor={htmlFor} style={{ ...labelStyle, marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && (
        <span
          style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--danger)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

function RobotsChip({
  state,
  hasUrl,
}: {
  state: RobotsState
  hasUrl: boolean
}) {
  if (!hasUrl || state === 'idle') return null
  if (state === 'checking') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        checking robots.txt…
      </span>
    )
  }
  const config = {
    allowed: { color: 'var(--success)', text: 'robots ok' },
    disallowed: { color: 'var(--danger)', text: 'robots blocked' },
    unknown: { color: 'var(--fg-muted)', text: 'unchecked' },
  } as const
  const { color, text } = config[state as keyof typeof config] ?? config.unknown
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 7px',
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {text}
    </span>
  )
}

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
        padding: '2px 7px 2px 4px',
        borderRadius: 999,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
        alt=""
        width="13"
        height="13"
        style={{ borderRadius: 3 }}
        onError={(evt) => {
          ;(evt.currentTarget as HTMLImageElement).style.visibility = 'hidden'
        }}
      />
      {host}
    </span>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--fg)',
  letterSpacing: '-0.005em',
}

function inputStyle(
  hasError: boolean,
  isDisabled: boolean,
  focused: boolean = false,
): React.CSSProperties {
  const borderColor = hasError
    ? 'var(--danger)'
    : focused
      ? 'var(--signal)'
      : 'var(--border)'
  const ring = hasError
    ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
    : focused
      ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
      : 'none'
  return {
    width: '100%',
    height: 38,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: isDisabled ? 'var(--surface-1)' : 'var(--bg-elevated)',
    color: 'var(--fg)',
    fontSize: 13.5,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    letterSpacing: '-0.005em',
    outline: 'none',
    boxSizing: 'border-box',
    opacity: isDisabled ? 0.66 : 1,
    cursor: isDisabled ? 'not-allowed' : 'text',
    transition: 'border-color .12s, box-shadow .12s',
    boxShadow: ring,
  }
}

function compositeWrapperStyle(
  hasError: boolean,
  isDisabled: boolean,
  focused: boolean = false,
): React.CSSProperties {
  const borderColor = hasError
    ? 'var(--danger)'
    : focused
      ? 'var(--signal)'
      : 'var(--border)'
  const ring = hasError
    ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
    : focused
      ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
      : 'none'
  return {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: isDisabled ? 'var(--surface-1)' : 'var(--bg-elevated)',
    overflow: 'hidden',
    opacity: isDisabled ? 0.66 : 1,
    boxShadow: ring,
    transition: 'border-color .12s, box-shadow .12s',
  }
}
