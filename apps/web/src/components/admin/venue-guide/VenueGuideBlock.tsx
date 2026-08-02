'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import {
  GUIDE_CHIP_ORDER,
  GUIDE_FIELD_MAX_LENGTH,
  deriveChipState,
  deriveGuidePublishState,
  type GuideChipKey,
  type VenueGuide,
  type VenueGuideChip,
} from '@concert-crawl/types'
import {
  publishVenueGuide,
  saveVenueGuide,
  unpublishVenueGuide,
} from '@/lib/actions/venues'
import { AdminButton, Kbd, MonoLabel, Panel, StatusBadge } from '../primitives'
import { ADMIN_COPY } from '../definitions/copy'
import { AccessibilityField } from './AccessibilityField'
import { ChipPicker } from './ChipPicker'
import { ChipStateDot } from './ChipStateDot'
import { ChipStateLegend } from './ChipStateLegend'
import { GuideIcon } from './GuideIcon'

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

const OPTIONAL_KEYS = GUIDE_CHIP_ORDER.filter((key) => key !== 'accessibility')

type OptionalChipKey = Exclude<GuideChipKey, 'accessibility'>

const isOptionalChipKey = (key: GuideChipKey): key is OptionalChipKey =>
  key !== 'accessibility'

interface VenueGuideBlockProps {
  venueId: string
  venueName: string
  initialGuide: VenueGuide
  /** The server-side guide fetch failed, so `initialGuide` is an empty
      fallback rather than this venue's real draft. Saving it would delete
      every existing chip, so authoring is disabled until a reload succeeds. */
  loadFailed?: boolean
}

/**
 * #764 admin authoring block for the venue first-timer guide.
 *
 * Layout order is locked by the plan: sub-copy, insider tip (surfaced FIRST),
 * validation banner, accessibility, picker, chip fields, voice reminder,
 * footer actions. The publish badge is derived by `deriveGuidePublishState`
 * — the same function the API re-runs against persisted rows — so the client
 * can never claim "Ready" for something the server would reject.
 */
export const VenueGuideBlock = ({
  venueId,
  venueName,
  initialGuide,
  loadFailed = false,
}: VenueGuideBlockProps) => {
  const accessibilityChip = initialGuide.chips.find(
    (chip) => chip.chipType === 'accessibility',
  )

  const [accessibility, setAccessibility] = useState(
    accessibilityChip?.isPlaceholder ? '' : (accessibilityChip?.body ?? ''),
  )
  const [placeholderMode, setPlaceholderMode] = useState(
    accessibilityChip?.isPlaceholder ?? false,
  )
  const [selected, setSelected] = useState<OptionalChipKey[]>(() =>
    initialGuide.chips.map((chip) => chip.chipType).filter(isOptionalChipKey),
  )
  const [bodies, setBodies] = useState<
    Partial<Record<OptionalChipKey, string>>
  >(() =>
    Object.fromEntries(
      initialGuide.chips
        .filter((chip) => isOptionalChipKey(chip.chipType))
        .map((chip) => [chip.chipType, chip.body]),
    ),
  )
  const [insiderTip, setInsiderTip] = useState(initialGuide.insiderTip ?? '')
  const [publishedAt, setPublishedAt] = useState(initialGuide.publishedAt)
  const [showError, setShowError] = useState(false)
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false)
  const [status, setStatus] = useState<{
    text: string
    failed: boolean
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const publishState = deriveGuidePublishState({
    accessibilityBody: accessibility,
    accessibilityPlaceholder: placeholderMode,
  })
  const blocked = publishState.kind === 'blocked'
  const accessError = showError && blocked

  const badge =
    publishState.kind === 'ready'
      ? { kind: 'success' as const, label: GUIDE_COPY.badge.ready }
      : publishState.kind === 'ready_with_placeholder'
        ? {
            kind: 'warning' as const,
            label: GUIDE_COPY.badge.readyWithPlaceholder,
          }
        : { kind: 'danger' as const, label: GUIDE_COPY.badge.blocked }

  const toggleChip = (key: GuideChipKey) => {
    if (!isOptionalChipKey(key)) return
    setSelected((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key],
    )
  }

  // Blank chips are simply absent from the payload — `blank` is the absence of
  // a row, so a selected-but-empty chip persists nothing.
  const buildPayload = (): {
    insiderTip: string | null
    chips: VenueGuideChip[]
  } => {
    const chips: VenueGuideChip[] = []

    if (placeholderMode) {
      chips.push({
        chipType: 'accessibility',
        body: '',
        isPlaceholder: true,
      })
    } else if (accessibility.trim().length > 0) {
      chips.push({
        chipType: 'accessibility',
        body: accessibility.trim(),
        isPlaceholder: false,
      })
    }

    for (const key of OPTIONAL_KEYS) {
      if (!isOptionalChipKey(key) || !selected.includes(key)) continue
      const body = (bodies[key] ?? '').trim()
      if (body.length === 0) continue
      chips.push({ chipType: key, body, isPlaceholder: false })
    }

    const tip = insiderTip.trim()
    return { insiderTip: tip.length > 0 ? tip : null, chips }
  }

  const succeeded = (text: string) => setStatus({ text, failed: false })
  const failed = (error: string | undefined) =>
    setStatus({ text: error ?? GUIDE_COPY.status.saveError, failed: true })

  // Every action guards `pending` itself rather than relying on the buttons'
  // disabled state — the ⌘↵ shortcut reaches publish() without passing through
  // a button at all, and key repeat would otherwise queue duplicate writes.
  const saveDraft = () => {
    if (loadFailed || pending) return
    setStatus(null)
    startTransition(async () => {
      const result = await saveVenueGuide(venueId, buildPayload())
      if (result.success) succeeded(GUIDE_COPY.status.saved)
      else failed(result.error)
    })
  }

  const publish = () => {
    if (loadFailed || pending) return
    if (blocked) {
      setShowError(true)
      return
    }
    setStatus(null)
    startTransition(async () => {
      const saved = await saveVenueGuide(venueId, buildPayload())
      if (!saved.success) {
        failed(saved.error)
        return
      }
      const result = await publishVenueGuide(venueId)
      if (!result.success) {
        if (result.field === 'accessibility') setShowError(true)
        failed(result.error)
        return
      }
      setPublishedAt(result.data?.publishedAt ?? new Date().toISOString())
      succeeded(GUIDE_COPY.status.published)
    })
  }

  const unpublish = () => {
    if (pending) return
    setStatus(null)
    startTransition(async () => {
      const result = await unpublishVenueGuide(venueId)
      setConfirmingUnpublish(false)
      if (!result.success) {
        failed(result.error)
        return
      }
      setPublishedAt(null)
      succeeded(GUIDE_COPY.status.unpublished)
    })
  }

  // The ⌘↵ hint in the footer is only honest if the shortcut actually fires.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      publish()
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      onKeyDown={onKeyDown}
    >
      <Panel
        title={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {GUIDE_COPY.blockTitle}
            <MonoLabel color="var(--fg-subtle)">{venueName}</MonoLabel>
          </span>
        }
        action={
          <StatusBadge kind={badge.kind} dot>
            {badge.label}
          </StatusBadge>
        }
        padding={18}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            {GUIDE_COPY.blockSub}
          </p>

          {loadFailed && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 10,
                background:
                  'color-mix(in oklab, var(--danger) 10%, transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--danger) 32%, transparent)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12.5,
                color: 'var(--fg)',
                lineHeight: 1.5,
              }}
            >
              {GUIDE_COPY.loadError}
            </p>
          )}

          {/* Insider tip — surfaced first, per the locked layout order. */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: 'color-mix(in oklab, var(--accent) 9%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--accent) 28%, transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <label
                htmlFor="venue-guide-insider-tip"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--fg)',
                }}
              >
                {GUIDE_COPY.insiderTip.label}
              </label>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <ChipStateDot
                  state={deriveChipState({
                    body: insiderTip,
                    isPlaceholder: false,
                  })}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--accent)',
                  }}
                >
                  {GUIDE_COPY.insiderTip.marker}
                </span>
              </span>
            </div>
            <textarea
              id="venue-guide-insider-tip"
              value={insiderTip}
              rows={3}
              maxLength={GUIDE_FIELD_MAX_LENGTH}
              disabled={loadFailed}
              onChange={(event) => setInsiderTip(event.target.value)}
              placeholder={GUIDE_COPY.insiderTip.placeholder}
              aria-describedby="venue-guide-insider-tip-help"
              style={TEXTAREA_STYLE}
            />
            <p id="venue-guide-insider-tip-help" style={HELP_STYLE}>
              {GUIDE_COPY.insiderTip.help}
            </p>
          </div>

          {accessError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                gap: 9,
                padding: '10px 12px',
                borderRadius: 9,
                background:
                  'color-mix(in oklab, var(--danger) 12%, transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--danger) 34%, transparent)',
              }}
            >
              <AlertTriangle
                size={14}
                aria-hidden="true"
                style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }}
              />
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--fg)',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ fontWeight: 700 }}>
                  {GUIDE_COPY.banner.title}
                </strong>{' '}
                <span style={{ color: 'var(--fg-muted)' }}>
                  {GUIDE_COPY.banner.body}
                </span>
              </p>
            </div>
          )}

          <AccessibilityField
            value={accessibility}
            onChange={setAccessibility}
            placeholderMode={placeholderMode}
            onTogglePlaceholder={() => {
              if (loadFailed) return
              setPlaceholderMode((prev) => !prev)
            }}
            error={accessError}
            disabled={loadFailed}
          />

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <MonoLabel>{GUIDE_COPY.picker.heading}</MonoLabel>
              <span
                style={{ flex: 1, height: 1, background: 'var(--border)' }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                }}
              >
                {selected.length}
                {GUIDE_COPY.picker.countSeparator}
                {OPTIONAL_KEYS.length}
              </span>
            </div>
            <ChipPicker selected={selected} onToggle={toggleChip} />
          </div>

          {selected.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {OPTIONAL_KEYS.filter((key) =>
                isOptionalChipKey(key) ? selected.includes(key) : false,
              ).map((key) => {
                if (!isOptionalChipKey(key)) return null
                const fieldId = `venue-guide-chip-${key}`
                const helpId = `${fieldId}-help`
                const body = bodies[key] ?? ''
                return (
                  <div key={key}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--fg)',
                        }}
                      >
                        <span
                          style={{ color: 'var(--fg-muted)', display: 'flex' }}
                        >
                          <GuideIcon name={key} />
                        </span>
                        <label htmlFor={fieldId}>
                          {GUIDE_COPY.chipLabel[key]}
                        </label>
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <ChipStateDot
                          state={deriveChipState({
                            body,
                            isPlaceholder: false,
                          })}
                        />
                        <button
                          type="button"
                          onClick={() => toggleChip(key)}
                          aria-label={`${GUIDE_COPY.picker.removeLabel} ${GUIDE_COPY.chipLabel[key]} ${GUIDE_COPY.field.removeSuffix}`}
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            minHeight: 44,
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: 'var(--fg-subtle)',
                          }}
                        >
                          {GUIDE_COPY.field.remove}
                        </button>
                      </span>
                    </div>
                    <textarea
                      id={fieldId}
                      value={body}
                      rows={2}
                      maxLength={GUIDE_FIELD_MAX_LENGTH}
                      disabled={loadFailed}
                      onChange={(event) =>
                        setBodies((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={GUIDE_COPY.chipPlaceholder[key]}
                      aria-describedby={helpId}
                      style={TEXTAREA_STYLE}
                    />
                    {/* The handoff authored an adminHint per chip but never
                        rendered it (design-table §D.6). It ships as help text. */}
                    <p id={helpId} style={HELP_STYLE}>
                      {GUIDE_COPY.chipHint[key]}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 9,
              padding: '10px 12px',
              borderRadius: 9,
              background: 'color-mix(in oklab, var(--accent) 9%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--accent) 26%, transparent)',
            }}
          >
            <AlertTriangle
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}
            />
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 11.5,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              {GUIDE_COPY.voiceReminder}
            </p>
          </div>

          {status !== null && (
            <p
              role="status"
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: status.failed ? 600 : 400,
                color: status.failed ? 'var(--danger)' : 'var(--fg-muted)',
              }}
            >
              {status.text}
            </p>
          )}

          {publishedAt !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11.5,
                  color: 'var(--fg-muted)',
                }}
              >
                {GUIDE_COPY.unpublish.liveNote}
              </span>
              {confirmingUnpublish ? (
                <>
                  <span
                    style={{
                      flexBasis: '100%',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      color: 'var(--fg)',
                      lineHeight: 1.5,
                    }}
                  >
                    {GUIDE_COPY.unpublish.confirmPrompt}
                  </span>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={unpublish}
                    disabled={pending}
                  >
                    {pending
                      ? GUIDE_COPY.unpublish.working
                      : GUIDE_COPY.unpublish.confirmAction}
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingUnpublish(false)}
                  >
                    {GUIDE_COPY.unpublish.cancel}
                  </AdminButton>
                </>
              ) : (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingUnpublish(true)}
                >
                  {GUIDE_COPY.unpublish.action}
                </AdminButton>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-sans)',
                fontSize: 11.5,
                color: 'var(--fg-subtle)',
              }}
            >
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
              {GUIDE_COPY.footer.publishHint}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={saveDraft}
                disabled={pending || loadFailed}
              >
                {pending
                  ? GUIDE_COPY.footer.saving
                  : GUIDE_COPY.footer.saveDraft}
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                icon={Check}
                onClick={publish}
                disabled={pending || loadFailed}
              >
                {pending
                  ? GUIDE_COPY.footer.publishing
                  : GUIDE_COPY.footer.publish}
              </AdminButton>
            </div>
          </div>
        </div>
      </Panel>

      <ChipStateLegend />
    </div>
  )
}

const TEXTAREA_STYLE: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'block',
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-elevated)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg)',
  lineHeight: 1.5,
  resize: 'vertical',
}

const HELP_STYLE: React.CSSProperties = {
  margin: 0,
  marginTop: 6,
  fontFamily: 'var(--font-sans)',
  fontSize: 11.5,
  lineHeight: 1.45,
  color: 'var(--fg-muted)',
}
