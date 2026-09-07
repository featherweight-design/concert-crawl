'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import type {
  AdminFeatureFlag,
  FeatureFlagKey,
} from '@concert-crawl/entitlements'
import { apiClient, ApiError } from '@/lib/api'
import {
  Panel,
  AdminButton,
  RelTime,
  StatusBadge,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.featureFlags

const stateKind = (enabled: boolean): StatusKind =>
  enabled ? 'success' : 'neutral'

interface FeatureFlagControlProps {
  initial: AdminFeatureFlag[]
}

export const FeatureFlagControl = ({ initial }: FeatureFlagControlProps) => {
  const { getToken } = useAuth()
  const [flags, setFlags] = useState<AdminFeatureFlag[]>(initial)
  const [pending, setPending] = useState<FeatureFlagKey | null>(null)
  const [confirming, setConfirming] = useState<AdminFeatureFlag | null>(null)
  const [error, setError] = useState<{
    key: FeatureFlagKey
    message: string
  } | null>(null)

  const saveFlag = async (flag: AdminFeatureFlag) => {
    const next = !flag.enabled
    setPending(flag.key)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        // The dialog has to close on this branch too: the error renders in the
        // row underneath the overlay, so leaving it open hides the only
        // explanation the admin gets.
        setError({ key: flag.key, message: COPY.saveError })
        setConfirming(null)
        return
      }
      const updated = await apiClient.patch<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}`,
        token,
        { enabled: next },
      )
      setFlags((prev) =>
        prev.map((row) => (row.key === updated.key ? updated : row)),
      )
      setConfirming(null)
    } catch (err) {
      console.error('[admin] feature flag save failed', flag.key, err)
      const message =
        err instanceof ApiError
          ? `${COPY.saveError} ${err.message}`
          : COPY.saveError
      setError({ key: flag.key, message })
      setConfirming(null)
    } finally {
      setPending(null)
    }
  }

  return (
    <Panel padding={0}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {flags.map((flag, idx) => (
          <li
            key={flag.key}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 18px',
              borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 200,
                flex: '1 1 240px',
              }}
            >
              <span
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}
              >
                {flag.label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--fg-muted)',
                }}
              >
                {flag.description}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {flag.updatedAt ? (
                  <>
                    {`${COPY.changedPrefix} `}
                    <RelTime iso={flag.updatedAt} />
                  </>
                ) : (
                  COPY.neverToggled
                )}
              </span>
              {error?.key === flag.key && (
                <span style={{ fontSize: 13, color: 'var(--danger)' }}>
                  {error.message}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <StatusBadge kind={stateKind(flag.enabled)} dot>
                {flag.enabled ? COPY.stateOn : COPY.stateOff}
              </StatusBadge>
              <AdminButton
                variant="outline"
                onClick={() => setConfirming(flag)}
                disabled={pending !== null}
              >
                {flag.enabled ? COPY.toggleOff : COPY.toggleOn}
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>

      {confirming && (
        <FeatureFlagConfirm
          flag={confirming}
          pending={pending === confirming.key}
          onCancel={() => {
            if (pending !== null) return
            setConfirming(null)
          }}
          onConfirm={() => void saveFlag(confirming)}
        />
      )}
    </Panel>
  )
}

interface FeatureFlagConfirmProps {
  flag: AdminFeatureFlag
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

const FeatureFlagConfirm = ({
  flag,
  pending,
  onCancel,
  onConfirm,
}: FeatureFlagConfirmProps) => {
  const turningOn = !flag.enabled
  const heading = turningOn ? COPY.confirmTitleOn : COPY.confirmTitleOff
  const body = turningOn ? COPY.confirmBodyOn : COPY.confirmBodyOff

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(evt) => {
        if (pending) return
        if (evt.target === evt.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--signal)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 14px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {heading}
          </h3>
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
            }}
          >
            {body}
          </div>
        </div>
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            background: 'var(--surface-1)',
          }}
        >
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {COPY.confirmCancel}
          </AdminButton>
          <AdminButton variant="primary" onClick={onConfirm} disabled={pending}>
            {COPY.confirmAccept}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
