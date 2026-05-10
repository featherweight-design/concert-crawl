'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { Plus, RefreshCw, Loader2, Check, AlertCircle } from 'lucide-react'
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
        fieldErrors.websiteUrl = 'Must be an https:// URL'
    } catch {
      fieldErrors.websiteUrl = 'Enter a valid URL (https://...)'
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
                maxWidth: 480,
                boxShadow:
                  '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '20px 24px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Dialog.Title
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--fg)',
                  }}
                >
                  Add venue
                </Dialog.Title>
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
                  {/* Name */}
                  <Field
                    label="Name"
                    htmlFor="add-venue-name"
                    error={errors.name}
                  >
                    <input
                      ref={nameRef}
                      id="add-venue-name"
                      type="text"
                      placeholder="Ogden Theatre"
                      disabled={disabled}
                      onChange={handleNameChange}
                      style={inputStyle(!!errors.name, disabled)}
                    />
                  </Field>

                  {/* Slug */}
                  <Field
                    label="Slug"
                    htmlFor="add-venue-slug"
                    error={errors.slug}
                    hint={
                      <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                        concertcrawl.app/v/
                        <span style={{ color: 'var(--fg)' }}>
                          {slugRef.current?.value ?? ''}
                        </span>
                      </span>
                    }
                  >
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        ref={slugRef}
                        id="add-venue-slug"
                        type="text"
                        placeholder="ogden-theatre"
                        disabled={disabled}
                        onChange={handleSlugChange}
                        style={{
                          ...inputStyle(!!errors.slug, disabled),
                          flex: 1,
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
                          borderRadius: 6,
                          border: '1px solid var(--border)',
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
                  </Field>

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
                      ) : null
                    }
                  >
                    <input
                      ref={websiteUrlRef}
                      id="add-venue-url"
                      type="url"
                      placeholder="https://ogdentheatre.com/events"
                      disabled={disabled}
                      onBlur={handleUrlBlur}
                      onChange={() =>
                        setErrors((prev) => ({
                          ...prev,
                          websiteUrl: undefined,
                        }))
                      }
                      style={inputStyle(!!errors.websiteUrl, disabled)}
                    />
                  </Field>

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
                      style={inputStyle(!!errors.city, disabled)}
                    />
                  </Field>

                  {/* Initial status toggle */}
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
                      }}
                      htmlFor="add-venue-active"
                    >
                      Start active
                    </label>
                    <button
                      id="add-venue-active"
                      type="button"
                      role="switch"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => setActive((prev) => !prev)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        border: 'none',
                        background: active
                          ? 'var(--signal)'
                          : 'var(--border-strong)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
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

                <div style={{ display: 'flex', gap: 8 }}>
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
                    ) : null}
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
