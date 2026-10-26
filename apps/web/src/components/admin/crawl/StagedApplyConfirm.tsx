'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { AdminButton, useDialogKeyboard } from '@/components/admin/primitives'
import { StatusBadge } from '@/components/admin/primitives'
import { triggerVenueCrawl } from '@/components/admin/crawl-trigger-button/lib/crawl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { pauseVenue } from '@/lib/actions/venues'

interface ConfigDiffEntry {
  path: string
  before: string
  after: string
}

export interface StagedDiff {
  title: string
  intent: string
  diff: readonly ConfigDiffEntry[]
  risks: readonly string[]
  rollback: string
  nextRunIn: string
}

const STAGED_DIFFS: Record<string, StagedDiff> =
  ADMIN_COPY.crawl.stagedApply.stagedDiffs

interface StagedApplyConfirmProps {
  stagedId: string
  venueId: string
  venueName: string
  onCancel: () => void
  onApply: () => void
}

export const StagedApplyConfirm = ({
  stagedId,
  venueId,
  venueName,
  onCancel,
  onApply,
}: StagedApplyConfirmProps) => {
  const { getToken } = useAuth()
  const [triggerRecrawl, setTriggerRecrawl] = useState(false)
  const diff = STAGED_DIFFS[stagedId]

  // One ref for both panels below: the missing-diff early return and the main
  // confirm are mutually exclusive, so only ever one of them is mounted.
  // Already had Escape; what it lacked was focus containment and restore.
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogKeyboard(panelRef, onCancel)

  const [applyError, setApplyError] = useState<string | null>(null)

  const handleApply = async () => {
    // Manual entry is the one remedy that changes stored config today: it
    // pauses the venue so no scheduled crawl runs. A re-crawl would undo the
    // point of it, so the checkbox is ignored here.
    if (stagedId === 'opt-manual') {
      try {
        await pauseVenue(venueId)
      } catch {
        setApplyError(ADMIN_COPY.crawl.stagedApply.pauseFailed)
        return
      }
      onApply()
      return
    }
    onApply()
    if (triggerRecrawl) {
      const token = await getToken()
      if (token) {
        void triggerVenueCrawl(venueId, token)
      }
    }
  }

  if (!diff) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={onCancel}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="staged-apply-title"
          style={{
            width: 400,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            padding: '24px 22px',
          }}
          onClick={(evt) => evt.stopPropagation()}
        >
          <h3
            id="staged-apply-title"
            style={{
              margin: '0 0 12px',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--danger)',
            }}
          >
            {ADMIN_COPY.crawl.stagedApply.unknownOptionTitle}
          </h3>
          <p
            style={{
              margin: '0 0 20px',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
              color: 'var(--fg-muted)',
            }}
          >
            {ADMIN_COPY.crawl.stagedApply.unknownOptionBody}
          </p>
          <AdminButton variant="ghost" onClick={onCancel}>
            {ADMIN_COPY.crawl.stagedApply.unknownOptionClose}
          </AdminButton>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staged-apply-title"
        style={{
          width: 640,
          maxWidth: 'calc(100vw - 48px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(evt) => evt.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--signal)',
              }}
            >
              {ADMIN_COPY.crawl.stagedApply.headerEyebrow}
            </span>
            <StatusBadge kind="signal" variant="mono">
              {stagedId}
            </StatusBadge>
          </div>
          <h3
            id="staged-apply-title"
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {diff.title}
          </h3>
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 12,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            on <strong style={{ color: 'var(--fg)' }}>{venueName}</strong>
            {ADMIN_COPY.crawl.stagedApply.headerBodySuffix}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Intent */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--fg-subtle)',
                marginBottom: 6,
              }}
            >
              {ADMIN_COPY.crawl.stagedApply.sectionWhyChange}
            </div>
            <div
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 13,
                color: 'var(--fg)',
                lineHeight: 1.55,
              }}
            >
              {diff.intent}
            </div>
          </div>

          {/* Config diff */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--fg-subtle)',
                marginBottom: 8,
              }}
            >
              {ADMIN_COPY.crawl.stagedApply.sectionConfigDiff}
            </div>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--surface-1)',
              }}
            >
              {diff.diff.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr',
                    gap: 12,
                    padding: '10px 14px',
                    borderBottom:
                      idx < diff.diff.length - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--fg-muted)',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.path}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        color: 'var(--danger)',
                        background: `color-mix(in oklab, var(--danger) 6%, var(--bg-elevated))`,
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>−</span>
                      <span style={{ wordBreak: 'break-all' as const }}>
                        {entry.before}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        color: 'var(--success)',
                        background: `color-mix(in oklab, var(--success) 6%, var(--bg-elevated))`,
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>+</span>
                      <span style={{ wordBreak: 'break-all' as const }}>
                        {entry.after}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risks + rollback */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--warning)',
                  marginBottom: 6,
                }}
              >
                {ADMIN_COPY.crawl.stagedApply.sectionRisks}
              </div>
              <ul
                style={{
                  margin: '0',
                  paddingLeft: 18,
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.55,
                }}
              >
                {diff.risks.map((risk, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--fg-subtle)',
                  marginBottom: 6,
                }}
              >
                {ADMIN_COPY.crawl.stagedApply.sectionRollback}
              </div>
              <div
                style={{
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.55,
                }}
              >
                {diff.rollback}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--fg-subtle)',
                  marginBottom: 6,
                }}
              >
                {ADMIN_COPY.crawl.stagedApply.sectionNextRun}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--fg)',
                  fontWeight: 600,
                }}
              >
                {diff.nextRunIn}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'var(--surface-1)',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={triggerRecrawl}
              onChange={(evt) => setTriggerRecrawl(evt.target.checked)}
              style={{
                accentColor: 'var(--signal)',
                width: 14,
                height: 14,
                cursor: 'pointer',
              }}
            />
            {ADMIN_COPY.crawl.stagedApply.footerTriggerLabel}
          </label>
          <div style={{ marginLeft: 'auto' }} />
          {applyError && (
            <span
              role="alert"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              {applyError}
            </span>
          )}
          <AdminButton variant="ghost" onClick={onCancel}>
            {ADMIN_COPY.crawl.stagedApply.footerCancel}
          </AdminButton>
          <AdminButton variant="primary" onClick={() => void handleApply()}>
            {ADMIN_COPY.crawl.stagedApply.footerApply}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
