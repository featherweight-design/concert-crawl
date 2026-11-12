import Link from 'next/link';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PASSPORT_CTA_GLOW } from './definitions/styles';

const COPY = CONSUMER_COPY.passport;

function FindAShow({ compact }: { compact: boolean }) {
  return (
    <Link
      href="/events"
      className={`inline-flex min-h-11 items-center rounded-xl font-bold text-fg-on-accent no-underline ${
        compact ? 'mt-2 px-[22px] text-[14.5px]' : 'mt-3 px-6 text-[15px]'
      }`}
      style={{
        background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        boxShadow: PASSPORT_CTA_GLOW,
      }}
    >
      {COPY.emptyCta}
    </Link>
  );
}

/** The kit's calendar glyph (the filter bar's), drawn at 30px in the accent. */
function CalendarMark() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3.25" width="12" height="10.75" rx="1.5" />
      <path d="M2 7h12" />
      <path d="M5.5 1.75v2.5M10.5 1.75v2.5" />
    </svg>
  );
}

/**
 * The empty block beside the open book on desktop (addendum 2 item 16,
 * `passport-empty-d`): the calendar in a dashed accent ring, then the same
 * words and the way to the first show as the phone's card.
 */
function EmptyBlock() {
  return (
    <div
      data-passport-empty="block"
      className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-border-strong px-[18px] pb-[30px] pt-[34px] text-center"
      style={{
        background: 'color-mix(in oklch, var(--bg-elevated) 45%, transparent)',
      }}
    >
      <span
        aria-hidden="true"
        className="mb-2 flex size-24 items-center justify-center rounded-full text-accent"
        style={{
          border:
            '1.5px dashed color-mix(in oklch, var(--accent) 55%, transparent)',
          background:
            'radial-gradient(circle, color-mix(in oklch, var(--accent) 10%, transparent), transparent 70%)',
        }}
      >
        <CalendarMark />
      </span>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
        {COPY.emptyEyebrow}
      </p>
      <h2 className="text-2xl font-black leading-tight tracking-[-0.025em] text-fg">
        {COPY.emptyTitle}
      </h2>
      <p className="max-w-[300px] text-sm leading-normal text-fg-muted">
        {COPY.emptyBody}
      </p>
      <FindAShow compact />
    </div>
  );
}

/**
 * The first visit. On a phone (B+ empty Passport board, slots untilted per
 * addendum 2 item 16) a blank page of the booklet, four empty stamp rings, and
 * the way to the first show. On desktop, `block` is the panel that sits beside
 * the open, empty book.
 */
export function PassportEmpty({
  variant = 'card',
}: {
  variant?: 'card' | 'block';
}) {
  if (variant === 'block') return <EmptyBlock />;
  return (
    <div
      data-passport-empty="card"
      className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3 rounded-[22px] border border-dashed border-border-strong px-6 py-9 text-center"
    >
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
      <FindAShow compact={false} />
    </div>
  );
}
