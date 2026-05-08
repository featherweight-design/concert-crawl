import { SETTINGS_COPY } from './definitions/copy'
import type { UserPlan } from '@concert-crawl/types'

interface PlanCardProps {
  plan: UserPlan
  trialDaysRemaining?: number
}

export function PlanCard({ plan, trialDaysRemaining }: PlanCardProps) {
  if (plan === 'founder') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border-2 p-5"
        style={{
          borderColor: 'var(--accent)',
          background:
            'radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent) 12%, transparent), var(--surface-1))',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
            >
              {SETTINGS_COPY.planCard.founder.badge}
            </span>
            <span className="text-[17px] font-bold text-fg">
              {SETTINGS_COPY.planCard.founder.tagline}
            </span>
            <span className="text-[13px] italic text-fg-muted">
              {SETTINGS_COPY.planCard.founder.subline}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (plan === 'past-due') {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: 'var(--warning)',
          background: 'var(--surface-1)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{
                color: 'var(--warning)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {SETTINGS_COPY.planCard.pastDue.badge}
            </span>
            <span className="text-[15px] font-medium text-fg">
              {SETTINGS_COPY.planCard.pastDue.tagline}
            </span>
          </div>
          <span
            className="shrink-0 text-[13px] font-medium"
            style={{ color: 'var(--warning)' }}
          >
            {SETTINGS_COPY.planCard.pastDue.cta}
          </span>
        </div>
      </div>
    )
  }

  if (plan === 'trial') {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex flex-col gap-1">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.planCard.trial.badge}
          </span>
          <span className="text-[15px] font-medium text-fg">
            {trialDaysRemaining ?? 0} {SETTINGS_COPY.planCard.trial.tagline}
          </span>
          <span className="text-[13px] text-fg-muted">
            {SETTINGS_COPY.planCard.trial.subline}
          </span>
        </div>
      </div>
    )
  }

  // paid
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--signal)', background: 'var(--surface-1)' }}
    >
      <div className="flex flex-col gap-1">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{ color: 'var(--signal)', fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.planCard.paid.badge}
        </span>
        <span className="text-[15px] font-medium text-fg">
          {SETTINGS_COPY.planCard.paid.tagline}
        </span>
        <span className="text-[13px] text-fg-muted">
          {SETTINGS_COPY.planCard.paid.subline}
        </span>
      </div>
    </div>
  )
}
