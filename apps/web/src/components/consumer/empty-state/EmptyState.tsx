import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateCta {
  label: string;
  href: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  state?: 'no-data' | 'filtered' | 'error';
  density?: 'default' | 'dense';
  /**
   * Omit on a surface whose location is already stated above the empty state,
   * such as a sub-tab bar: the rail's dot and rule still render.
   */
  eyebrow?: string;
  title: string;
  body: string;
  /**
   * Overrides the status rail's right-hand label. The default reads "0 / 0",
   * which is a count of events and says nothing on a surface that isn't
   * counting events.
   */
  railLabel?: string;
  primaryCta?: EmptyStateCta;
  secondaryCta?: EmptyStateCta;
  className?: string;
  /**
   * `card` is the B+ empty pattern (`06-states/empty_*`): a dashed card with a
   * dashed medallion, a centered eyebrow and a gradient action. `rail` (the
   * default) is the older status-rail layout, kept until every surface moves.
   */
  layout?: 'rail' | 'card';
  /** The medallion's glyph in the card layout. */
  glyph?: EmptyStateGlyph;
}

export type EmptyStateGlyph = 'dots' | 'calendar';

/** Scattered dots: a sky with nothing in it (B+ `empty_filtered_m`). */
const DOTS: readonly { cx: number; cy: number }[] = [
  { cx: 22, cy: 34 },
  { cx: 76, cy: 25 },
  { cx: 49, cy: 48 },
  { cx: 31, cy: 72 },
  { cx: 62, cy: 68 },
];

function MedallionGlyph({ glyph }: { glyph: EmptyStateGlyph }) {
  if (glyph === 'calendar') {
    return (
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x={3.5}
          y={5}
          width={17}
          height={15}
          rx={2.5}
          stroke="var(--fg-muted)"
          strokeWidth={1.6}
        />
        <path
          d="M3.5 10h17M8 3v4M16 3v4"
          stroke="var(--fg-muted)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-hidden>
      {DOTS.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={2.6}
          fill="var(--fg-subtle)"
        />
      ))}
    </svg>
  );
}

function CardPrimary({ cta }: { cta: EmptyStateCta }) {
  return (
    <Link
      href={cta.href}
      {...(cta.onClick ? { onClick: cta.onClick } : {})}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        color: 'var(--fg-on-accent)',
        borderRadius: 14,
        padding: '12px 22px',
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textDecoration: 'none',
        boxShadow:
          '0 8px 28px color-mix(in oklch, var(--signal) 28%, transparent)',
      }}
    >
      {cta.label}
    </Link>
  );
}

function EmptyStateCard({
  glyph = 'dots',
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
  className,
}: Omit<EmptyStateProps, 'layout' | 'state' | 'density' | 'railLabel'>) {
  return (
    <div
      data-testid="empty-state-card"
      className={cn('flex w-full flex-col items-center text-center', className)}
      style={{
        gap: 12,
        padding: '32px 22px 34px',
        border: '1.5px dashed var(--border-strong)',
        borderRadius: 20,
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      <div
        data-testid="empty-state-medallion"
        className="flex items-center justify-center rounded-full"
        style={{
          width: 96,
          height: 96,
          border: '1.5px dashed var(--border-strong)',
          background:
            'radial-gradient(circle, var(--surface-1), transparent 72%)',
          marginBottom: 8,
        }}
      >
        <MedallionGlyph glyph={glyph} />
      </div>
      {eyebrow !== undefined && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--fg-muted)',
          }}
        >
          {eyebrow}
        </div>
      )}
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
          maxWidth: 340,
        }}
      >
        {body}
      </div>
      {(primaryCta ?? secondaryCta) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {primaryCta && <CardPrimary cta={primaryCta} />}
          {secondaryCta && (
            <EmptyStateSecondary cta={secondaryCta} dense={false} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyStatePrimary({
  cta,
  dense,
}: {
  cta: EmptyStateCta;
  dense: boolean;
}) {
  return (
    <Link
      href={cta.href}
      {...(cta.onClick ? { onClick: cta.onClick } : {})}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--signal)',
        color: 'var(--fg-on-accent)',
        borderRadius: 999,
        padding: dense ? '9px 16px' : '11px 20px',
        fontFamily: 'var(--font-ui)',
        fontSize: dense ? 12.5 : 13.5,
        fontWeight: 700,
        letterSpacing: '-0.005em',
        textDecoration: 'none',
      }}
    >
      {cta.label}
    </Link>
  );
}

function EmptyStateSecondary({
  cta,
  dense,
}: {
  cta: EmptyStateCta;
  dense: boolean;
}) {
  return (
    <Link
      href={cta.href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'transparent',
        color: 'var(--fg-muted)',
        padding: dense ? '8px 0' : '10px 0',
        fontFamily: 'var(--font-ui)',
        fontSize: dense ? 12 : 13,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        textDecoration: 'none',
        borderBottom: '1px dashed var(--border-strong)',
        borderRadius: 0,
      }}
    >
      {cta.label}
    </Link>
  );
}

export function EmptyState({
  state = 'no-data',
  density = 'default',
  eyebrow,
  title,
  body,
  railLabel,
  primaryCta,
  secondaryCta,
  className,
  layout = 'rail',
  glyph,
}: EmptyStateProps) {
  if (layout === 'card') {
    return (
      <EmptyStateCard
        {...(glyph !== undefined && { glyph })}
        {...(eyebrow !== undefined && { eyebrow })}
        title={title}
        body={body}
        {...(primaryCta !== undefined && { primaryCta })}
        {...(secondaryCta !== undefined && { secondaryCta })}
        {...(className !== undefined && { className })}
      />
    );
  }
  const dense = density === 'dense';
  const accent =
    state === 'error'
      ? 'var(--warning)'
      : state === 'filtered'
        ? 'var(--signal)'
        : 'var(--accent)';
  const railRight =
    railLabel ??
    (state === 'error' ? 'err' : state === 'filtered' ? '0 hits' : '0 / 0');

  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: dense ? 10 : 14,
        padding: dense ? '28px 24px' : '52px 28px',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
        maxWidth: dense ? 380 : 460,
        marginInline: 'auto',
        width: '100%',
      }}
    >
      {/* Status rail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            flexShrink: 0,
          }}
        />
        {eyebrow !== undefined && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: dense ? 9 : 10,
              color: accent,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {eyebrow}
          </div>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: dense ? 9 : 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {railRight}
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: dense ? 26 : 38,
          fontWeight: 900,
          letterSpacing: dense ? '-0.03em' : '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {title}
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: dense ? 12.5 : 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          maxWidth: 380,
        }}
      >
        {body}
      </div>

      {/* CTAs */}
      {(primaryCta ?? secondaryCta) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: dense ? 4 : 8,
            flexWrap: 'wrap',
          }}
        >
          {primaryCta && <EmptyStatePrimary cta={primaryCta} dense={dense} />}
          {secondaryCta && (
            <EmptyStateSecondary cta={secondaryCta} dense={dense} />
          )}
        </div>
      )}
    </div>
  );
}
