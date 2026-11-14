import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CCMark } from '@/components/brand/cc-mark';
import { CCWordmark } from '@/components/brand/cc-wordmark';
import { AUTH_FLOW_COPY } from './definitions/copy';
import './auth-flow.css';

const COPY = AUTH_FLOW_COPY;

interface AuthPageProps {
  children: ReactNode;
  /** Draws the 44px Back control on the phone header. */
  onBack?: () => void;
  /** The desktop foot's venue count; omitted, the foot draws no venue row. */
  venueCount?: number;
}

const FOOT_LINK = 'text-fg-subtle no-underline hover:text-fg';

/**
 * One page shape for every auth screen. Phone: the form is the page, under
 * the logo, with Terms and Privacy at the foot. Desktop: one 440px panel with
 * the gradient top edge. No app header or nav.
 */
export function AuthPage({ children, onBack, venueCount }: AuthPageProps) {
  return (
    <div className="auth-page relative flex flex-col">
      <header className="flex h-[58px] shrink-0 items-center gap-1.5 px-4 lg:h-[72px] lg:justify-between lg:px-10">
        <div className="flex items-center gap-1.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={COPY.back}
              className="-ml-2.5 inline-flex size-11 items-center justify-center text-fg lg:hidden"
            >
              <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
            </button>
          ) : null}
          <Link
            href="/"
            aria-label={COPY.logoLabel}
            className="flex items-center gap-2 text-fg no-underline lg:gap-2.5"
          >
            <span className="overflow-hidden rounded-[7px] border border-border">
              <CCMark size={28} />
            </span>
            <CCWordmark size={16} className="lg:hidden" />
            <CCWordmark size={17} className="hidden lg:block" />
          </Link>
        </div>
        <nav
          aria-label={COPY.foot.terms}
          className="hidden gap-[22px] text-[13px] lg:flex"
        >
          <Link href="/legal/terms" className={FOOT_LINK}>
            {COPY.foot.terms}
          </Link>
          <Link href="/legal/privacy" className={FOOT_LINK}>
            {COPY.foot.privacy}
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col px-5 pt-[18px] pb-28 lg:items-center lg:px-0 lg:pt-6 lg:pb-32">
        <div className="relative flex w-full flex-col gap-4 lg:w-[440px] lg:rounded-[20px] lg:border lg:border-border lg:bg-bg-elevated lg:px-8 lg:py-[30px] lg:shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <svg
            className="auth-panel-edge hidden lg:block"
            viewBox="0 0 440 42"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="auth-edge" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--signal)" />
                <stop offset="1" stopColor="var(--cta-end)" />
              </linearGradient>
            </defs>
            <path
              d="M1 42 V20 A19 19 0 0 1 20 1 H420 A19 19 0 0 1 439 20 V42"
              fill="none"
              stroke="url(#auth-edge)"
              strokeWidth="2"
            />
          </svg>
          {children}
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-[22px] flex flex-col items-center gap-3 text-[12.5px] lg:bottom-[34px]">
        {venueCount !== undefined ? (
          <p className="m-0 hidden font-mono text-[9.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase lg:block">
            {COPY.foot.proof(venueCount)}
          </p>
        ) : null}
        <nav className="flex gap-[18px] lg:hidden" aria-label={COPY.foot.terms}>
          <Link href="/legal/terms" className={FOOT_LINK}>
            {COPY.foot.terms}
          </Link>
          <Link href="/legal/privacy" className={FOOT_LINK}>
            {COPY.foot.privacy}
          </Link>
        </nav>
      </footer>
    </div>
  );
}

/** The heading block: an optional eyebrow, the H1 and a sub line. */
export function AuthHeading({
  eyebrow,
  eyebrowTone = 'subtle',
  title,
  sub,
}: {
  eyebrow?: string;
  eyebrowTone?: 'signal' | 'subtle' | 'warning';
  title: string;
  sub?: ReactNode;
}) {
  const tone = {
    signal: 'text-signal',
    subtle: 'text-fg-subtle',
    warning: 'text-warning',
  }[eyebrowTone];
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? (
        <span
          className={`font-mono text-[10px] font-bold tracking-[0.16em] uppercase ${tone}`}
        >
          {eyebrow}
        </span>
      ) : null}
      <h1 className="m-0 text-[28px] leading-[1.08] font-black tracking-[-0.03em] text-balance text-fg">
        {title}
      </h1>
      {sub ? (
        <p className="m-0 text-[14.5px] leading-[1.5] text-fg-muted">{sub}</p>
      ) : null}
    </div>
  );
}
