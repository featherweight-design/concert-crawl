import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import type { PlanState } from '@concert-crawl/types'

const SETTINGS_COPY = CONSUMER_COPY.settings

interface PlanCardProps {
  planState: PlanState
}

const MS_PER_DAY = 86400000

const trialDaysRemainingFrom = (trialEndsAt: string | null): number => {
  if (!trialEndsAt) return 0
  const endsAtMs = new Date(trialEndsAt).getTime()
  if (Number.isNaN(endsAtMs)) return 0
  return Math.max(0, Math.ceil((endsAtMs - Date.now()) / MS_PER_DAY))
}

function PlanPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        background: `color-mix(in oklch, var(--${tone}) 12%, transparent)`,
        border: `1px solid var(--${tone})`,
        color: `var(--${tone})`,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
      }}
    >
      {label}
    </span>
  )
}

// Mechanical PlanState migration (PR 3.1) — variant routing only. The full
// six-plan card redesign lands in PR 3.4 (#780). Gifted and role-comped
// users keep the celebratory card they saw under the old founder default.
export function PlanCard({ planState }: PlanCardProps) {
  const { plan, roleComped, status, onTrial, trialEndsAt } = planState
  const trialDaysRemaining = trialDaysRemainingFrom(trialEndsAt)

  // Dunning outranks celebration — a founder whose payment is failing must
  // see the warning, so this branch runs before the celebratory card.
  if (status === 'past_due') {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: 'var(--danger)',
          background: 'var(--surface-1)',
        }}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <PlanPill
              label={SETTINGS_COPY.planCard.pastDue.badge}
              tone="danger"
            />
            <span
              className="font-bold uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.10em',
              }}
            >
              {SETTINGS_COPY.planCard.yourPlanLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className="text-fg"
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {SETTINGS_COPY.planCard.pastDue.tagline}
            </span>
            <span
              className="text-fg-muted"
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              {SETTINGS_COPY.planCard.pastDue.subline}
            </span>
          </div>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2.5 text-[13px] font-bold"
              style={{ background: 'var(--signal)', color: 'var(--bg)' }}
            >
              {SETTINGS_COPY.planCard.pastDue.cta}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (roleComped || plan === 'founder' || plan === 'gifted') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          borderColor: 'var(--accent)',
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--surface-1)), var(--surface-1) 65%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 90% 0%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 60%)',
          }}
        />
        <div className="relative flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <PlanPill
              label={SETTINGS_COPY.planCard.founder.badge}
              tone="accent"
            />
            <span
              className="font-bold uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.10em',
              }}
            >
              {SETTINGS_COPY.planCard.yourPlanLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className="text-fg"
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {SETTINGS_COPY.planCard.founder.tagline}
            </span>
            <span
              className="text-fg-muted"
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              {SETTINGS_COPY.planCard.founder.body}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '0.06em',
              fontStyle: 'italic',
            }}
          >
            — {SETTINGS_COPY.planCard.founder.subline}
          </span>
        </div>
      </div>
    )
  }

  if (onTrial) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <PlanPill
              label={SETTINGS_COPY.planCard.trial.badge}
              tone="warning"
            />
            <span
              className="font-bold uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.10em',
              }}
            >
              {SETTINGS_COPY.planCard.yourPlanLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className="text-fg"
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {trialDaysRemaining} {SETTINGS_COPY.planCard.trial.tagline}
            </span>
            <span
              className="text-fg-muted"
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              {SETTINGS_COPY.planCard.trial.subline}
            </span>
          </div>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2.5 text-[13px] font-bold"
              style={{ background: 'var(--signal)', color: 'var(--bg)' }}
            >
              {SETTINGS_COPY.planCard.trial.addCardCta}
            </button>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2.5 text-[13px] font-bold text-fg"
              style={{ background: 'var(--surface-2)' }}
            >
              {SETTINGS_COPY.planCard.trial.stayFreeCta}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (plan === 'free' || plan === 'logged-out') {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <PlanPill label={SETTINGS_COPY.planCard.free.badge} tone="signal" />
            <span
              className="font-bold uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.10em',
              }}
            >
              {SETTINGS_COPY.planCard.yourPlanLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className="text-fg"
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {SETTINGS_COPY.planCard.free.tagline}
            </span>
            <span
              className="text-fg-muted"
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              {SETTINGS_COPY.planCard.free.subline}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // paid (supporter / premium)
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--signal)', background: 'var(--surface-1)' }}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <PlanPill label={SETTINGS_COPY.planCard.paid.badge} tone="signal" />
          <span
            className="font-bold uppercase text-fg-subtle"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.10em',
            }}
          >
            {SETTINGS_COPY.planCard.yourPlanLabel}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span
            className="text-fg"
            style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            {SETTINGS_COPY.planCard.paid.tagline}
          </span>
          <span
            className="text-fg-muted"
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
            }}
          >
            {SETTINGS_COPY.planCard.paid.subline}
          </span>
        </div>
      </div>
    </div>
  )
}
