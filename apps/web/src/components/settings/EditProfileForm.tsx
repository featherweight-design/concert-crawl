'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { patchMe, checkHandleAvailability } from '@/lib/users'
import { Avatar } from './Avatar'
import { SETTINGS_COPY } from './definitions/copy'
import {
  HANDLE_REGEX,
  RESERVED_HANDLES,
  AVATAR_COLORS,
} from './definitions/constants'
import type { AvatarColor, UserProfileResponse } from '@concert-crawl/types'

interface EditProfileFormProps {
  profile: UserProfileResponse
}

type HandleError = 'tooShort' | 'invalidChars' | 'reserved' | 'taken' | null

function validateHandleLocal(handle: string): HandleError {
  if (handle.length > 0 && handle.length < 3) return 'tooShort'
  if (handle.length > 0 && !HANDLE_REGEX.test(handle)) return 'invalidChars'
  if (handle.length >= 3 && RESERVED_HANDLES.has(handle)) return 'reserved'
  return null
}

const COLOR_VAR: Record<AvatarColor, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
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
      if (value === profile.handle) return // unchanged
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
      router.push('/me')
      router.refresh()
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-3">
        <Avatar handle={handle || null} avatarColor={avatarColor} size={72} />
        {handle && (
          <span className="text-[15px] font-bold text-fg">@{handle}</span>
        )}
      </div>

      {/* Handle field */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-[13px] font-semibold text-fg"
          htmlFor="handle-input"
        >
          Handle
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
          City
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

      {/* Avatar color picker */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg">Avatar color</span>
        <div className="flex gap-3">
          {AVATAR_COLORS.map((color) => {
            const isSelected = avatarColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                aria-label={`Avatar color: ${color}`}
                aria-pressed={isSelected}
                className="relative h-8 w-8 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                style={{
                  background: COLOR_VAR[color],
                  outline: isSelected
                    ? `3px solid ${COLOR_VAR[color]}`
                    : '3px solid transparent',
                  outlineOffset: '3px',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaveDisabled}
        className="rounded-xl py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: isSaveDisabled ? 'var(--surface-2)' : 'var(--signal)',
          color: isSaveDisabled ? 'var(--fg-muted)' : 'var(--bg)',
        }}
      >
        {saving ? 'Saving…' : checkingAvailability ? 'Checking…' : 'Save'}
      </button>
      {saveError && (
        <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
          {saveError}
        </span>
      )}
    </div>
  )
}
