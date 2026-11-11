import Link from 'next/link';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.passport;

/**
 * The first visit (B+ empty Passport board): a blank page of the booklet, four
 * empty stamp rings, and the way to the first show.
 */
export function PassportEmpty() {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3 rounded-[22px] border border-dashed border-border-strong px-6 py-9 text-center">
      <div
        aria-hidden="true"
        className="mb-5 grid w-full max-w-[220px] grid-cols-2 gap-4 rounded-[18px] border border-border bg-surface-1 p-6"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in oklch, var(--fg) 9%, transparent) 1px, transparent 1.4px)',
          backgroundSize: '14px 14px',
        }}
      >
        {[0, 1, 2, 3].map((slot) => (
          <span
            key={slot}
            className="aspect-square rounded-full border border-dashed border-border-strong"
          />
        ))}
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
        {COPY.emptyEyebrow}
      </p>
      <h2 className="text-[28px] font-black leading-tight tracking-[-0.035em] text-fg">
        {COPY.emptyTitle}
      </h2>
      <p className="max-w-[340px] text-[15px] leading-relaxed text-fg-muted">
        {COPY.emptyBody}
      </p>
      <Link
        href="/events"
        className="mt-3 inline-flex min-h-11 items-center rounded-xl px-6 text-[15px] font-bold text-fg-on-accent no-underline"
        style={{
          background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        }}
      >
        {COPY.emptyCta}
      </Link>
    </div>
  );
}
