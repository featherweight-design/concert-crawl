import type { AdminFeatureFlag } from '@concert-crawl/entitlements';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.featureFlags;

export type Stage = 'off' | 'me' | 'beta' | 'everyone';

// The ladder, lowest rung first (`07-people-flags-operations/*-admin-feature-flags`).
export const STAGES: readonly Stage[] = ['off', 'me', 'beta', 'everyone'];

export const rankOf = (stage: Stage): number => STAGES.indexOf(stage);

interface StageLadderProps {
  flag: AdminFeatureFlag;
  onPick: (stage: Stage) => void;
  /** Which row or drawer this ladder sits in: keeps the test ids apart. */
  scope?: string;
}

/**
 * The four-rung control, drawn once for the list row and the drawer. Production
 * keeps a flag locked until it is verified there: a step UP is closed, stepping
 * down never is.
 */
export const StageLadder = ({ flag, onPick, scope }: StageLadderProps) => {
  const { stage } = flag;
  const locked = flag.locked === true;
  const prefix = scope === undefined ? '' : `${scope}-`;

  return (
    <div
      role="group"
      aria-label={COPY.ladderAriaLabel(flag.label)}
      style={{
        display: 'flex',
        padding: 3,
        borderRadius: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      {STAGES.map((step) => {
        const selected = step === stage;
        const closed = locked && rankOf(step) > rankOf(stage);
        return (
          <button
            key={step}
            type="button"
            aria-pressed={selected}
            aria-describedby={closed ? `flag-locked-${flag.key}` : undefined}
            disabled={closed}
            data-testid={`${prefix}flag-step-${flag.key}-${step}`}
            onClick={() => onPick(step)}
            style={{
              flex: 1,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              borderRadius: 7,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: closed || selected ? 'default' : 'pointer',
              background: selected ? 'var(--bg-elevated)' : 'transparent',
              color: selected ? 'var(--fg)' : 'var(--fg-muted)',
              boxShadow: selected ? '0 0 0 1px var(--border-strong)' : 'none',
              opacity: closed ? 0.45 : 1,
            }}
          >
            {COPY.stage[step]}
          </button>
        );
      })}
    </div>
  );
};
