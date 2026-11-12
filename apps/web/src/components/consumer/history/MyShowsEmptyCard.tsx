// The My shows empty card (B+ `06-states/bp-s-empty_watching_m`,
// `bp-s-empty_concerts_m`): one dashed, centred card holding the surface's
// badge, a mono eyebrow, the headline, one body line and the gradient CTA.
//
// Its own component rather than the shared `EmptyState`, which is a
// left-aligned status-rail layout used across the app; these boards draw a
// different shape for My shows only.

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { MY_SHOWS_GRADIENT } from './definitions/constants';
import { PASSPORT_CTA_GLOW } from '@/components/consumer/passport/definitions/styles';

interface MyShowsEmptyCardBaseProps {
  /** Decorative art above the eyebrow. */
  badge: ReactNode;
  eyebrow: string;
  /** Concerts inks its eyebrow in the accent, Watching in the signal. */
  tone: 'accent' | 'signal';
  title: string;
  body: string;
  /** The body line's measure. Artists' board sets it a little wider. */
  bodyMaxWidth?: number;
  testId?: string;
  style?: CSSProperties;
}

/**
 * Either the one gradient link Watching and Concerts draw, or `actions`: a
 * slot for a surface whose primary is not a plain link (Artists opens the
 * search palette) or that adds a secondary under it.
 */
type MyShowsEmptyCardProps = MyShowsEmptyCardBaseProps &
  (
    | { cta: { label: string; href: string }; actions?: never }
    | { actions: ReactNode; cta?: never }
  );

export const MyShowsEmptyCard = ({
  badge,
  eyebrow,
  tone,
  title,
  body,
  bodyMaxWidth = 360,
  testId = 'my-shows-empty-card',
  style,
  cta,
  actions,
}: MyShowsEmptyCardProps) => (
  <div
    data-testid={testId}
    className="flex flex-col items-center rounded-[18px] border border-dashed border-border-strong px-5 py-8 text-center sm:px-10 sm:py-10"
    style={style}
  >
    <div aria-hidden className="mb-5 flex justify-center">
      {badge}
    </div>
    <p
      data-testid="my-shows-empty-eyebrow"
      style={{
        margin: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: `var(--${tone})`,
      }}
    >
      {eyebrow}
    </p>
    <h2
      style={{
        margin: '10px 0 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 'clamp(22px, 6.5vw, 30px)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        color: 'var(--fg)',
      }}
    >
      {title}
    </h2>
    <p
      style={{
        margin: '10px 0 0',
        maxWidth: bodyMaxWidth,
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        lineHeight: 1.55,
        color: 'var(--fg-muted)',
      }}
    >
      {body}
    </p>
    {cta === undefined ? (
      <div className="mt-5 flex flex-col items-center gap-3">{actions}</div>
    ) : (
      <Link
        href={cta.href}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-[14px] px-6 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          backgroundImage: MY_SHOWS_GRADIENT,
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          boxShadow: PASSPORT_CTA_GLOW,
        }}
      >
        {cta.label}
      </Link>
    )}
  </div>
);
