'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Rocket } from 'lucide-react'
import type {
  AdminFounderWindow,
  FounderWindowState,
} from '@concert-crawl/types'
import { apiClient, ApiError } from '@/lib/api'
import {
  StatCard,
  Panel,
  AdminButton,
  RelTime,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.founderWindow

const STATE_KIND: Record<FounderWindowState, StatusKind> = {
  'pre-launch': 'neutral',
  open: 'success',
  closed: 'danger',
}

type ActionKind = 'open' | 'simulate' | 'reset'

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

interface FounderWindowControlProps {
  initial: AdminFounderWindow
}

export const FounderWindowControl = ({
  initial,
}: FounderWindowControlProps) => {
  const { getToken } = useAuth()
  const [win, setWin] = useState<AdminFounderWindow>(initial)
  const [pending, setPending] = useState<ActionKind | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<{
    action: ActionKind
    message: string
  } | null>(null)

  const runAction = async (
    action: ActionKind,
    request: (token: string) => Promise<void>,
  ) => {
    setPending(action)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        setError({ action, message: COPY.errors.notAuthenticated })
        return
      }
      await request(token)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : COPY.errors.generic
      setError({ action, message })
    } finally {
      setPending(null)
    }
  }

  const launchError = error?.action === 'open' ? error.message : null
  const rehearsalError =
    error?.action === 'simulate' || error?.action === 'reset'
      ? error.message
      : null

  const openWindow = () =>
    runAction('open', async (token) => {
      const data = await apiClient.post<AdminFounderWindow>(
        '/v1/admin/founder-window/open',
        token,
        {},
      )
      setWin(data)
      setConfirmOpen(false)
    })

  const simulateClaim = () =>
    runAction('simulate', async (token) => {
      const data = await apiClient.post<{ seatsRemainingTest: number }>(
        '/v1/admin/founder-window/simulate-claim',
        token,
        {},
      )
      setWin((prev) => ({
        ...prev,
        seatsRemainingTest: data.seatsRemainingTest,
      }))
    })

  const resetTestSeats = () =>
    runAction('reset', async (token) => {
      const data = await apiClient.post<{ seatsRemainingTest: number }>(
        '/v1/admin/founder-window/reset-test-seats',
        token,
        {},
      )
      setWin((prev) => ({
        ...prev,
        seatsRemainingTest: data.seatsRemainingTest,
      }))
    })

  const isPreLaunch = win.state === 'pre-launch'
  const isOpen = win.state === 'open'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={COPY.stats.state}
          value={COPY.stateLabels[win.state]}
          iconName="Flag"
          kind={STATE_KIND[win.state]}
          mono={false}
        />
        <StatCard
          label={COPY.stats.seatsRemaining}
          value={String(win.seatsRemaining)}
          unit={COPY.stats.seatsRemainingUnit}
          iconName="Ticket"
          kind={win.seatsRemaining > 0 ? 'signal' : 'danger'}
          hint={COPY.stats.seatsRemainingHint(win.seatsTotal)}
        />
        <StatCard
          label={COPY.stats.testSeats}
          value={String(win.seatsRemainingTest)}
          unit={COPY.stats.testSeatsUnit}
          iconName="FlaskConical"
          kind="neutral"
          hint={COPY.stats.testSeatsHint}
        />
        <StatCard
          label={COPY.stats.closesAt}
          value={win.closesAt ? formatDateTime(win.closesAt) : '—'}
          iconName="CalendarClock"
          kind="neutral"
          mono={false}
          hint={
            win.closesAt
              ? COPY.stats.windowDaysHint(win.windowDays)
              : COPY.stats.closesAtPending
          }
        />
      </div>

      <Panel title={COPY.launch.title}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--fg-muted)',
            }}
          >
            {isPreLaunch
              ? COPY.launch.helpPreLaunch
              : isOpen
                ? COPY.launch.helpOpen
                : COPY.launch.helpClosed}
          </p>

          {win.opensAt && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              <span>{COPY.launch.openedAt(formatDateTime(win.opensAt))}</span>
              {win.closesAt && (
                <span>
                  {COPY.launch.closesOn(formatDateTime(win.closesAt))}
                </span>
              )}
            </div>
          )}

          {isPreLaunch && (
            <div>
              <AdminButton
                variant="primary"
                icon={Rocket}
                onClick={() => setConfirmOpen(true)}
                disabled={pending !== null}
              >
                {pending === 'open'
                  ? COPY.launch.buttonPending
                  : COPY.launch.button}
              </AdminButton>
            </div>
          )}

          {launchError && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>
              {launchError}
            </p>
          )}
        </div>
      </Panel>

      <Panel title={COPY.rehearsal.title}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.rehearsal.help}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <AdminButton
              variant="outline"
              onClick={simulateClaim}
              disabled={pending !== null || win.seatsRemainingTest <= 0}
            >
              {pending === 'simulate'
                ? COPY.rehearsal.simulatePending
                : COPY.rehearsal.simulateButton}
            </AdminButton>
            <AdminButton
              variant="ghost"
              onClick={resetTestSeats}
              disabled={pending !== null}
            >
              {pending === 'reset'
                ? COPY.rehearsal.resetPending
                : COPY.rehearsal.resetButton}
            </AdminButton>
          </div>
          {rehearsalError && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>
              {rehearsalError}
            </p>
          )}
          {win.seatsRemainingTest <= 0 && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--warning)' }}>
              {COPY.rehearsal.exhausted}
            </p>
          )}
        </div>
      </Panel>

      <Panel title={COPY.claims.title} padding={0}>
        {win.recentClaims.length === 0 ? (
          <div
            style={{
              padding: '18px',
              fontSize: 13,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.claims.empty}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {win.recentClaims.map((claim, idx) => (
              <li
                key={`${claim.userId}-${claim.claimedAt}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 18px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {claim.seatNumber === null
                      ? COPY.claims.seatUnknown
                      : COPY.claims.seatLabel(claim.seatNumber)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {claim.userId}
                  </span>
                </div>
                <RelTime iso={claim.claimedAt} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {confirmOpen && (
        <FounderLaunchConfirm
          pending={pending === 'open'}
          onCancel={() => {
            if (pending === 'open') return
            setConfirmOpen(false)
          }}
          onConfirm={openWindow}
        />
      )}
    </div>
  )
}

interface FounderLaunchConfirmProps {
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

const FounderLaunchConfirm = ({
  pending,
  onCancel,
  onConfirm,
}: FounderLaunchConfirmProps) => {
  const accent = 'var(--danger)'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={COPY.confirm.heading}
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
          border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
          borderTop: `3px solid ${accent}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 14px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {COPY.confirm.eyebrow}
          </div>
          <h3
            style={{
              margin: '9px 0 0',
              fontSize: 21,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {COPY.confirm.heading}
          </h3>
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
            }}
          >
            {COPY.confirm.body}
          </div>
        </div>
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            background: 'var(--surface-1)',
          }}
        >
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {COPY.confirm.cancel}
          </AdminButton>
          <AdminButton variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? COPY.launch.buttonPending : COPY.confirm.confirm}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
