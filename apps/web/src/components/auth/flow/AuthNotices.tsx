import type { ReactNode } from 'react';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

/**
 * The step trail: the CCMark's four trail dots as a row (5, 7, 9 and 13px).
 * Step n lights dots 1 to n in signal and haloes the current one; the 13px
 * core is a hollow ring until the account is made, then pink.
 */
export function StepTrail({
  step,
  total,
  done = false,
}: {
  step: 1 | 2 | 3;
  total: 2 | 3;
  done?: boolean;
}) {
  // One dot per step, then the core: a two-step trail draws two.
  const sizes = ['size-[5px]', 'size-[7px]', 'size-[9px]'].slice(0, total);
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal uppercase">
        {done ? COPY.steps.done : COPY.steps.label(step, total)}
      </span>
      <span className="inline-flex items-center gap-[7px]" aria-hidden="true">
        {sizes.map((size, index) => {
          const lit = index < step;
          const current = !done && index === step - 1;
          return (
            <i
              key={index}
              className={`rounded-full ${size} ${lit ? 'bg-signal' : 'bg-border-strong'} ${current ? 'shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_18%,transparent)]' : ''}`}
            />
          );
        })}
        <i
          className={`size-[13px] rounded-full ${done ? 'bg-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_22%,transparent)]' : 'border-[1.5px] border-border-strong'}`}
        />
      </span>
    </div>
  );
}

/** The amber strip over a step: offline, and kin. */
export function AuthBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] px-[13px] py-[11px] text-[13.5px] leading-[1.45] text-fg"
    >
      <span
        aria-hidden="true"
        className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[11px] font-extrabold text-warning"
      >
        !
      </span>
      <span>{children}</span>
    </div>
  );
}

/** The 48px icon tile that leads a trouble screen: amber or neutral. */
export function AuthIconTile({
  tone,
  children,
}: {
  tone: 'warning' | 'neutral';
  children: ReactNode;
}) {
  const look =
    tone === 'warning'
      ? 'border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-warning'
      : 'border-border-strong bg-surface-2 text-fg-muted';
  return (
    <span
      aria-hidden="true"
      className={`flex size-12 items-center justify-center rounded-[14px] border ${look}`}
    >
      {children}
    </span>
  );
}
