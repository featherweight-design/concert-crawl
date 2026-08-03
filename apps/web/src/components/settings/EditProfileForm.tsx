'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { patchMe, checkHandleAvailability } from '@/lib/users'
import { Avatar } from './Avatar'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  HANDLE_REGEX,
  RESERVED_HANDLES,
  AVATAR_COLORS,
} from './definitions/constants'
import type { AvatarColor, UserProfileResponse } from '@concert-crawl/types'

const SETTINGS_COPY = CONSUMER_COPY.settings

export const EDIT_PROFILE_FORM_ID = 'edit-profile-form'

interface EditProfileFormProps {
  profile: UserProfileResponse
  onClose?: () => void
}

type HandleError = 'tooShort' | 'invalidChars' | 'reserved' | 'taken' | null

function validateHandleLocal(handle: string): HandleError {
  if (handle.length > 0 && handle.length < 3) return 'tooShort'
  if (handle.length > 0 && !HANDLE_REGEX.test(handle)) return 'invalidChars'
  if (handle.length >= 3 && RESERVED_HANDLES.has(handle)) return 'reserved'
  return null
}

const MONO_BTN: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
}

export function EditProfileForm({ profile, onClose }: EditProfileFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [handle, setHandle] = useState(profile.handle ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(
    profile.avatarColor,
  )
  const [handleError, setHandleError] = useState<HandleError>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadHandleBefore = profile.handle !== null

  const checkAvailability = useCallback(
    async (value: string) => {
      if (value === profile.handle) return
      setCheckingAvailability(true)
      try {
        const token = await getToken()
        if (!token) return
        const result = await checkHandleAvailability(token, value)
        if (!result.available) {
          setHandleError(result.reason === 'reserved' ? 'reserved' : 'taken')
        } else {
          setHandleError(null)
        }
      } finally {
        setCheckingAvailability(false)
      }
    },
    [getToken, profile.handle],
  )

  function handleHandleChange(value: string) {
    const normalized = value.toLowerCase()
    setHandle(normalized)

    const localError = validateHandleLocal(normalized)
    setHandleError(localError)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!localError && normalized.length >= 3) {
      debounceRef.current = setTimeout(() => {
        void checkAvailability(normalized)
      }, 300)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isGoingAnonymous = hadHandleBefore && handle === ''
  const hasError = handleError !== null
  const isSaveDisabled = hasError || saving || checkingAvailability

  async function handleSave() {
    if (isSaveDisabled) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return
      await patchMe(token, {
        handle: handle === '' ? null : handle,
        city: city === '' ? null : city,
        avatarColor,
      })
      router.refresh()
      if (onClose) {
        onClose()
      } else {
        router.push('/me')
      }
    } catch (err) {
      console.error('Failed to save profile', err)
      setSaveError(
        err instanceof Error
          ? err.message
          : SETTINGS_COPY.editSaveErrorFallback,
      )
    } finally {
      setSaving(false)
    }
  }

  const formContent = (
    <div className="mx-auto max-w-md">
      {/* Header with Cancel + Save */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              ...MONO_BTN,
              color: 'var(--fg-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {SETTINGS_COPY.editCancelButton}
          </button>
        ) : (
          <Link
            href="/me"
            style={{
              ...MONO_BTN,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            {SETTINGS_COPY.editCancelButton}
          </Link>
        )}
        <span className="text-[15px] font-bold text-fg">
          {SETTINGS_COPY.editProfileTitle}
        </span>
        <button
          type="submit"
          form={EDIT_PROFILE_FORM_ID}
          disabled={isSaveDisabled}
          style={{
            ...MONO_BTN,
            color: isSaveDisabled ? 'var(--fg-subtle)' : 'var(--signal)',
            background: 'none',
            border: 'none',
            cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
            padding: 0,
            opacity: isSaveDisabled ? 0.5 : 1,
          }}
        >
          {saving
            ? SETTINGS_COPY.editSavingButton
            : checkingAvailability
              ? SETTINGS_COPY.editCheckingButton
              : SETTINGS_COPY.editSaveButton}
        </button>
      </div>

      <form
        id={EDIT_PROFILE_FORM_ID}
        onSubmit={(evt) => {
          evt.preventDefault()
          void handleSave()
        }}
        className="flex flex-col gap-6 px-4 py-6"
      >
        {/* Avatar + color picker: horizontal layout */}
        <div className="flex items-start gap-5">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Avatar
              handle={handle || null}
              avatarColor={avatarColor}
              size={72}
              ringed
            />
            {handle && (
              <span className="text-[13px] font-bold text-fg">@{handle}</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <span className="text-[13px] font-semibold text-fg">
              {SETTINGS_COPY.avatarColorLabel}
            </span>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map((color) => {
                const isSelected = avatarColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    aria-label={SETTINGS_COPY.avatarColorSwatchAriaLabel(color)}
                    aria-pressed={isSelected}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: `color-mix(in oklch, var(--${color}) 36%, var(--surface-1))`,
                      border: `1.5px solid var(--${color})`,
                      boxShadow: isSelected
                        ? `0 0 0 3px color-mix(in oklch, var(--${color}) 24%, transparent)`
                        : 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Handle field */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-[13px] font-semibold text-fg"
            htmlFor="handle-input"
          >
            {SETTINGS_COPY.handleLabel}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-fg-muted">
              @
            </span>
            <input
              id="handle-input"
              type="text"
              value={handle}
              onChange={(evt) => handleHandleChange(evt.target.value)}
              placeholder={SETTINGS_COPY.handlePlaceholder}
              maxLength={20}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-surface-1 py-3 pl-8 pr-4 text-[14px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
              style={handleError ? { borderColor: 'var(--danger)' } : undefined}
            />
          </div>
          {handleError && (
            <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
              {SETTINGS_COPY.handleErrors[handleError]}
            </span>
          )}
          {!handleError && !isGoingAnonymous && (
            <span className="text-[12px] text-fg-subtle">
              {SETTINGS_COPY.handleHint}
            </span>
          )}
          {isGoingAnonymous && (
            <div
              className="rounded-xl p-3 text-[12px] leading-relaxed text-fg-muted"
              style={{ background: 'var(--surface-2)' }}
            >
              {SETTINGS_COPY.goingAnonymousWarning}
            </div>
          )}
        </div>

        {/* City field */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-[13px] font-semibold text-fg"
            htmlFor="city-input"
          >
            {SETTINGS_COPY.cityLabel}
          </label>
          <input
            id="city-input"
            type="text"
            value={city}
            onChange={(evt) => setCity(evt.target.value)}
            placeholder={SETTINGS_COPY.cityPlaceholder}
            maxLength={100}
            className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <span className="text-[12px] text-fg-subtle">
            {SETTINGS_COPY.cityHint}
          </span>
        </div>

        {saveError && (
          <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
            {saveError}
          </span>
        )}
      </form>
    </div>
  )

  return formContent
}
