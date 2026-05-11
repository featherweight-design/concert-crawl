'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
} from 'lucide-react'
import { createVenue, createVenueAndCrawl } from '@/lib/actions/venues'
import { AdminButton } from '@/components/admin/primitives'

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

interface FieldError {
  name?: string | undefined
  slug?: string | undefined
  websiteUrl?: string | undefined
  city?: string | undefined
}

interface AddVenueModalProps {
  onSuccess?: () => void
}

export function AddVenueModal({ onSuccess }: AddVenueModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errors, setErrors] = useState<FieldError>({})
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [slugManual, setSlugManual] = useState(false)
  const [active, setActive] = useState(true)
  const [robotsResult, setRobotsResult] = useState<{
    allowed: boolean | null
    checked: boolean
  }>({ allowed: null, checked: false })

  const nameRef = useRef<HTMLInputElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const websiteUrlRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)

  const disabled = submitState === 'submitting' || submitState === 'success'

  function resetState() {
    setSubmitState('idle')
    setErrors({})
    setBannerError(null)
    setSlugManual(false)
    setActive(true)
    setRobotsResult({ allowed: null, checked: false })
    if (nameRef.current) nameRef.current.value = ''
    if (slugRef.current) slugRef.current.value = ''
    if (websiteUrlRef.current) websiteUrlRef.current.value = ''
    if (cityRef.current) cityRef.current.value = 'Denver'
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
    try {
      const parsed = new URL(url)
      const res = await fetch(
        `/api/admin/robots-check?url=${encodeURIComponent(parsed.href)}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { allowed: boolean | null }
        setRobotsResult({ allowed: data.allowed, checked: true })
      }
    } catch {
      // Non-blocking — silent failure
    }
  }, [])

  function handleUrlBlur(evt: React.FocusEvent<HTMLInputElement>) {
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
    formData.set('active', String(active))

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

  return (
    <>
      <AdminButton
        variant="primary"
        icon={Plus}
        type="button"
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
                borderRadius: 12,
                width: '100%',
                maxWidth: 560,
                boxShadow:
                  '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding: '24px 24px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--fg-muted)',
                        marginBottom: 6,
                      }}
                    >
                      New Venue
                    </div>
                    <Dialog.Title
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--fg)',
                        lineHeight: 1.2,
                      }}
                    >
                      Add a crawl target
                    </Dialog.Title>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        color: 'var(--fg-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      Point us at an events page. We&apos;ll respect robots.txt
                      and crawl daily at 3 AM MT.
                    </p>
                  </div>
                  <Dialog.Close
                    render={
                      <button
                        type="button"
                        style={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--fg-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}
                        aria-label="Close"
                        onClick={resetState}
                      >
                        <X size={14} />
                      </button>
                    }
                  />
                </div>
                <div
                  style={{
                    marginTop: 20,
                    height: 1,
                    background: 'var(--border)',
                  }}
                />
              </div>

              {/* Error banner */}
              {bannerError && (
                <div
                  style={{
                    margin: '16px 24px 0',
                    padding: '10px 12px',
                    background: 'rgba(184,56,26,0.1)',
                    border: '1px solid rgba(184,56,26,0.25)',
                    borderRadius: 6,
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
              <div style={{ padding: '20px 24px' }}>
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
                      style={inputStyle(!!errors.name, disabled)}
                    />
                  </Field>

                  {/* Slug with inline prefix */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <label
                        htmlFor="add-venue-slug"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        Slug
                      </label>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        Auto-generated
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: `1px solid ${errors.slug ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: 6,
                        background: disabled ? 'var(--surface-1)' : 'var(--bg)',
                        overflow: 'hidden',
                        opacity: disabled ? 0.66 : 1,
                      }}
                    >
                      <span
                        style={{
                          padding: '0 8px 0 10px',
                          fontSize: 13,
                          color: 'var(--fg-muted)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid var(--border)',
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
                        style={{
                          flex: 1,
                          height: 32,
                          padding: '0 8px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--fg)',
                          fontSize: 13,
                          fontFamily: "'Inter', sans-serif",
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
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          background: 'var(--surface-1)',
                          color: 'var(--fg-muted)',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                    {errors.slug && (
                      <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                        {errors.slug}
                      </span>
                    )}
                    {!errors.slug && (
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        Used in the public URL. Auto-derived from the venue
                        name.
                      </span>
                    )}
                  </div>

                  {/* Source URL */}
                  <Field
                    label="Source URL"
                    htmlFor="add-venue-url"
                    error={errors.websiteUrl}
                    hint={
                      robotsResult.checked ? (
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              robotsResult.allowed === false
                                ? 'var(--danger)'
                                : 'var(--fg-muted)',
                          }}
                        >
                          {robotsResult.allowed === false
                            ? '⚠ robots.txt disallows crawling (advisory only)'
                            : '✓ robots.txt allows crawling'}
                        </span>
                      ) : (
                        <span
                          style={{ fontSize: 11, color: 'var(--fg-muted)' }}
                        >
                          The events page we&apos;ll crawl. Usually a /calendar,
                          /events, or /shows path.
                        </span>
                      )
                    }
                  >
                    <input
                      ref={websiteUrlRef}
                      id="add-venue-url"
                      type="url"
                      placeholder="https://www.bluebirdtheater.net/calendar/"
                      disabled={disabled}
                      onBlur={handleUrlBlur}
                      onChange={() => {
                        setErrors((prev) => ({
                          ...prev,
                          websiteUrl: undefined,
                        }))
                        setRobotsResult({ allowed: null, checked: false })
                      }}
                      style={inputStyle(!!errors.websiteUrl, disabled)}
                    />
                  </Field>

                  {/* City + Initial status */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Field
                      label="City"
                      htmlFor="add-venue-city"
                      error={errors.city}
                      style={{ flex: 1 }}
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
                        style={inputStyle(!!errors.city, disabled)}
                      />
                    </Field>

                    {/* Initial status segmented control */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        Initial status
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          overflow: 'hidden',
                          height: 32,
                          opacity: disabled ? 0.66 : 1,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => !disabled && setActive(true)}
                          disabled={disabled}
                          style={{
                            flex: 1,
                            border: 'none',
                            background: active
                              ? 'var(--signal)'
                              : 'transparent',
                            color: active ? '#fff' : 'var(--fg-muted)',
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          Active
                        </button>
                        <div
                          style={{
                            width: 1,
                            background: 'var(--border)',
                            flexShrink: 0,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => !disabled && setActive(false)}
                          disabled={disabled}
                          style={{
                            flex: 1,
                            border: 'none',
                            background: !active
                              ? 'var(--surface-1)'
                              : 'transparent',
                            color: !active ? 'var(--fg)' : 'var(--fg-muted)',
                            fontSize: 13,
                            fontWeight: !active ? 600 : 400,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          Paused
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '0 24px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <kbd
                    style={{
                      padding: '1px 5px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-1)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                    }}
                  >
                    Esc
                  </kbd>
                  cancel
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
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
                    style={{ gap: 8 }}
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
                    {submitState === 'submitting'
                      ? 'Saving…'
                      : submitState === 'success'
                        ? 'Saved'
                        : 'Save & crawl now'}
                    {submitState === 'idle' || submitState === 'error' ? (
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.7,
                          fontFamily: 'monospace',
                          marginLeft: 4,
                        }}
                      >
                        ⌘↵
                      </span>
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

function Field({
  label,
  htmlFor,
  error,
  hint,
  style,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: React.ReactNode
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
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
