'use client'

// #780 Manage-subscription sheet body (design table lifecycle-manage.md).
// Two visually separated groups: "On Concert Crawl" (in-app emotional /
// retention actions — change plan, cancel) and "Billing & receipts"
// (Stripe-portal tooling, each row tagged with the Stripe chip). The
// design table defines no hover/focus/transition styles for this surface.

import type { ReactNode } from 'react'
import { CCMark } from '@/components/brand/cc-mark'
import { TierBadge } from '@/components/consumer/tier-picker'
import { TIER_DEFINITIONS } from '@/components/consumer/tier-picker/definitions/constants'
import { MANAGE_SHEET_COPY } from './definitions/copy'
import type { PaidTier } from './definitions/types'
import { MANAGE_ICONS, RowChevron } from './icons'
import { ErrorLine, MonoEyebrow, RailHeader } from './primitives'

const PortalChip = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 7px',
      borderRadius: 5,
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 8.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--fg-muted)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}
  >
    {MANAGE_SHEET_COPY.portalChip}
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      aria-hidden
      style={{ marginTop: -1 }}
    >
      <path
        d="M4 8 L8 4 M8 4 H4.6 M8 4 V7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)

const ManageRow = ({
  icon,
  label,
  sub,
  portal = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  sub: string
  portal?: boolean
  disabled?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    style={{
      all: 'unset',
      cursor: disabled ? 'default' : 'pointer',
      boxSizing: 'border-box',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 13px',
      borderRadius: 11,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <span
      aria-hidden
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        flexShrink: 0,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-muted)',
      }}
    >
      {icon}
    </span>
    <span
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: 500,
          fontSize: 12,
          color: 'var(--fg-subtle)',
          letterSpacing: '-0.005em',
        }}
      >
        {sub}
      </span>
    </span>
    {portal ? <PortalChip /> : <RowChevron />}
  </button>
)

interface ManageSheetProps {
  tier: PaidTier
  periodEnd: string | null
  /** Desktop modal layout — larger title + TierBadge in the header row. */
  wide: boolean
  portalPending: boolean
  errorText: string | null
  onChangePlan: () => void
  onCancel: () => void
  onPortal: () => void
}

export const ManageSheet = ({
  tier,
  periodEnd,
  wide,
  portalPending,
  errorText,
  onChangePlan,
  onCancel,
  onPortal,
}: ManageSheetProps) => {
  const tierDef = TIER_DEFINITIONS[tier]
  const copy = MANAGE_SHEET_COPY

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--fg)',
      }}
    >
      <RailHeader
        tone="signal"
        eyebrow={copy.eyebrow(tierDef.name)}
        code={copy.code(tierDef.priceText)}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <h2
            style={{
              fontWeight: 900,
              fontSize: wide ? 26 : 23,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {copy.title}
          </h2>
          <div
            style={{
              fontWeight: 500,
              fontSize: 13,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {copy.subtitle(tierDef.name, periodEnd)}
          </div>
        </div>
        {wide && <TierBadge tier={tier} size="lg" />}
      </div>

      {errorText !== null && <ErrorLine text={errorText} />}

      {/* GROUP 1 — in-app */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <MonoEyebrow size={9.5} letterSpacing="0.16em">
          {copy.inApp.groupLabel}
        </MonoEyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ManageRow
            icon={MANAGE_ICONS.swap}
            label={copy.inApp.changePlan.label}
            sub={copy.inApp.changePlan.sub}
            onClick={onChangePlan}
          />
          <ManageRow
            icon={MANAGE_ICONS.leave}
            label={copy.inApp.cancel.label}
            sub={copy.inApp.cancel.sub(tierDef.name, periodEnd)}
            onClick={onCancel}
          />
        </div>
      </div>

      {/* GROUP 2 — Stripe portal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <MonoEyebrow size={9.5} letterSpacing="0.16em">
            {copy.billing.groupLabel}
          </MonoEyebrow>
          <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">
            {copy.billing.groupNote}
          </MonoEyebrow>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ManageRow
            icon={MANAGE_ICONS.card}
            label={copy.billing.paymentMethod.label}
            sub={copy.billing.paymentMethod.sub}
            portal
            disabled={portalPending}
            onClick={onPortal}
          />
          <ManageRow
            icon={MANAGE_ICONS.receipt}
            label={copy.billing.invoices.label}
            sub={copy.billing.invoices.sub}
            portal
            disabled={portalPending}
            onClick={onPortal}
          />
          <ManageRow
            icon={MANAGE_ICONS.mail}
            label={copy.billing.billingEmail.label}
            sub={copy.billing.billingEmail.sub}
            portal
            disabled={portalPending}
            onClick={onPortal}
          />
          <ManageRow
            icon={MANAGE_ICONS.globe}
            label={copy.billing.tax.label}
            sub={copy.billing.tax.sub}
            portal
            disabled={portalPending}
            onClick={onPortal}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <CCMark size={13} /> {copy.footer}
      </div>
    </div>
  )
}
