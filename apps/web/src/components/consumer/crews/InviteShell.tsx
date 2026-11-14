import Link from 'next/link';

import { CCMark } from '@/components/brand/cc-mark';
import { CCWordmark } from '@/components/brand/cc-wordmark';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { gradientEdgeCard, pillGhost, pillPrimary } from './lib/styles';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

/**
 * The invite landing's frame. The route sits outside `(protected)/(main)`, so
 * there is no app chrome here at all: just the brand lockup and a centred
 * column, the same shape `/onboarding` uses. Every state on this route (ready,
 * at capacity, dead, loading, error) renders inside it, so nothing shifts as
 * one resolves into another.
 */
export const InviteShell = ({
  children,
  /** The landing opens up at desktop width; the terminal states hold at 18. */
  tightGap = false,
}: {
  children: React.ReactNode;
  tightGap?: boolean;
}) => (
  <main
    aria-label={COPY.a11y.inviteLanding}
    className={`relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-[18px] overflow-hidden px-[22px] pb-10 pt-[70px] text-center sm:px-10 sm:pt-10 ${
      tightGap ? '' : 'sm:gap-[22px]'
    }`}
    style={{
      // The invite's page glow: a strong purple-pink wash from the top centre
      // behind the patch and card, fading to the ground by mid-screen
      // (bp-s-invite_m, invite_member_m, invite_stale_m, invite_d).
      background:
        'radial-gradient(ellipse 85% 55% at 50% 0%, color-mix(in oklch, var(--accent) 34%, color-mix(in oklch, var(--signal) 22%, transparent)) 0%, transparent 100%), var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    <div className="absolute left-0 right-0 top-[54px] flex items-center justify-center gap-2 sm:top-[22px]">
      <CCMark size={22} />
      <CCWordmark size={14} />
    </div>
    {children}
  </main>
);

/** The patch's size on the landing card; half of it overhangs the top edge. */
export const INVITE_MARK_SIZE = 96;

/**
 * B+ draws every state of the invite as one card with a cyan-to-pink edge and
 * the crew's patch (or, on a dead link, a blank stand-in) sitting on its top
 * edge. The card holds the words and the one action; the shell around it
 * holds the brand.
 */
export const InviteCard = ({
  mark,
  children,
}: {
  mark: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    className="relative flex w-full max-w-[400px] flex-col items-center gap-4 px-5 pb-6 sm:max-w-[440px] sm:px-6"
    style={{
      ...gradientEdgeCard,
      marginTop: INVITE_MARK_SIZE / 2,
      paddingTop: INVITE_MARK_SIZE / 2 + 20,
      borderRadius: 24,
      boxShadow: '0 24px 60px -30px rgb(0 0 0 / 0.6)',
    }}
  >
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
    >
      {mark}
    </span>
    {children}
  </div>
);

interface EyebrowProps {
  /** `count` is the member tally, which the handoff sets a step wider and louder. */
  tone: 'signal' | 'accent' | 'warning' | 'subtle' | 'count';
  children: string;
}

const EYEBROW_TONES = {
  signal: { color: 'var(--signal)', fontSize: 9.5, letterSpacing: '0.18em' },
  // The open invite's eyebrow (B+ draws YOU'RE INVITED in pink).
  accent: { color: 'var(--accent)', fontSize: 9.5, letterSpacing: '0.18em' },
  warning: { color: 'var(--warning)', fontSize: 9.5, letterSpacing: '0.18em' },
  subtle: { color: 'var(--fg-subtle)', fontSize: 9.5, letterSpacing: '0.14em' },
  count: { color: 'var(--fg-muted)', fontSize: 10, letterSpacing: '0.14em' },
} as const;

/** Mono meta. The uppercase lives in the string, never in CSS. */
export const InviteEyebrow = ({ tone, children }: EyebrowProps) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      ...EYEBROW_TONES[tone],
    }}
  >
    {children}
  </span>
);

export const InviteTitle = ({ children }: { children: string }) => (
  <h1
    className="text-[25px] sm:text-[32px]"
    style={{
      margin: 0,
      fontWeight: 900,
      letterSpacing: '-0.035em',
      lineHeight: 1.1,
      textWrap: 'balance',
      color: 'var(--fg)',
    }}
  >
    {children}
  </h1>
);

export const InviteBody = ({ children }: { children: string }) => (
  <p
    className="text-[13.5px] sm:text-[15px]"
    style={{
      margin: 0,
      color: 'var(--fg-muted)',
      lineHeight: 1.5,
      textWrap: 'pretty',
    }}
  >
    {children}
  </p>
);

// The crews pills (B+), a step taller here: the landing's action is the whole
// page's point, and it sits alone at the foot of the card.
export const ghostButtonStyle: React.CSSProperties = {
  ...pillGhost,
  minHeight: 48,
  fontSize: 14.5,
  color: 'var(--fg-muted)',
};

export const primaryButtonStyle: React.CSSProperties = {
  ...pillPrimary,
  minHeight: 52,
  borderRadius: 16,
  fontSize: 15,
};

/**
 * The way out of every terminal state on this route. `wide` is for the
 * at-capacity swap, where it takes the place of a full-width Join and the
 * column would otherwise visibly change shape.
 */
export const BrowseInstead = ({ wide = false }: { wide?: boolean }) => (
  <Link
    href="/events"
    style={
      wide
        ? { ...ghostButtonStyle, display: 'flex', width: '100%' }
        : ghostButtonStyle
    }
  >
    {COPY.linkDead.browse}
  </Link>
);

/**
 * The stand-in for a patch we are not allowed to draw: the generic hex patch
 * (addendum 5 item 13, bp-s-invite_stale_m) dimmed and greyed, so the card
 * keeps its shape and the dead link still carries no crew identity. The
 * generic patch ignores the crew, so no id is passed.
 */
export const DimmedMark = () => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      opacity: 0.5,
      filter: 'grayscale(1)',
    }}
  >
    <CrewPatch crewId="" generic size={INVITE_MARK_SIZE} scale="hero" />
  </span>
);
