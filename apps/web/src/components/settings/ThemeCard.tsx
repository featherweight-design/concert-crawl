'use client';

import { THEMES, THEME_META, type ThemeName } from '@/theme/themes';
import { THEME_COPY } from '@/theme/definitions/copy';

interface ThemeCardProps {
  name: ThemeName;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const Dot = ({ color }: { color: string }) => (
  <span
    aria-hidden
    className="block h-2 w-2 shrink-0 rounded-full"
    style={{ background: color }}
  />
);

/**
 * One theme in the Settings picker (B+ `more-s-settings_m`, `more-s-d_appearance`):
 * drawn entirely from the theme's own tokens, so it reads the same whichever
 * theme is live. The shared `ThemeSwatch` still serves the account menu,
 * onboarding and the admin picker.
 */
export const ThemeCard = ({
  name,
  active,
  onClick,
  disabled = false,
}: ThemeCardProps) => {
  const tokens = THEMES[name];
  const meta = THEME_META[name];
  const sample = THEME_COPY.swatch.sampleGig;

  return (
    <button
      type="button"
      aria-label={`${meta.label} theme`}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl p-2.5 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:cursor-wait sm:p-3"
      style={{
        backgroundImage: `linear-gradient(135deg, ${tokens['bg']} 40%, color-mix(in oklch, ${tokens['accent']} 16%, ${tokens['bg']}))`,
        border: active
          ? `1.5px solid ${tokens['signal']}`
          : `1px solid ${tokens['border-strong']}`,
        boxShadow: active
          ? `0 0 0 3px color-mix(in oklch, ${tokens['signal']} 22%, transparent), 0 0 22px color-mix(in oklch, ${tokens['signal']} 30%, transparent)`
          : undefined,
        transitionDuration: 'var(--motion-fast)',
        transitionTimingFunction: 'var(--motion-ease)',
      }}
    >
      <span className="flex items-center gap-1.5">
        <Dot color={tokens['signal'] ?? ''} />
        <Dot color={tokens['accent'] ?? ''} />
        {active && (
          <span
            className="ml-auto text-[8px] font-bold uppercase tracking-[0.14em]"
            style={{
              fontFamily: 'var(--font-mono)',
              color: tokens['signal'],
            }}
          >
            {THEME_COPY.swatch.activeLabel}
          </span>
        )}
      </span>

      {/* Sample gig, with the theme's own signal bar down its left edge */}
      <span
        className="flex min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-2"
        style={{
          background: `color-mix(in oklch, ${tokens['surface-1']} 80%, transparent)`,
          border: `1px solid ${tokens['border']}`,
          borderLeft: `3px solid ${tokens['signal']}`,
        }}
      >
        <span
          className="truncate text-[11px] font-extrabold"
          style={{ color: tokens['fg'], letterSpacing: '-0.01em' }}
        >
          {sample.artist}
        </span>
        <span className="flex items-baseline gap-1">
          <span
            className="text-[14px] font-black"
            style={{ color: tokens['signal'], letterSpacing: '-0.02em' }}
          >
            {sample.price}
          </span>
          <span
            className="text-[8px] font-bold uppercase tracking-[0.1em]"
            style={{
              fontFamily: 'var(--font-mono)',
              color: tokens['fg-subtle'],
            }}
          >
            {sample.tier}
          </span>
        </span>
      </span>

      <span className="flex items-baseline justify-between gap-1.5">
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-bold"
          style={{ color: tokens['fg'], letterSpacing: '-0.005em' }}
        >
          {meta.label}
        </span>
        <span
          className="max-w-[55%] shrink-0 truncate text-[8px] font-semibold uppercase tracking-[0.1em]"
          style={{
            fontFamily: 'var(--font-mono)',
            color: tokens['fg-subtle'],
          }}
        >
          {meta.role === 'base' ? meta.mode : meta.role}
        </span>
      </span>
    </button>
  );
};
