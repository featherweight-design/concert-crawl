import type { AvatarColor } from '@concert-crawl/types';

interface AvatarProps {
  handle: string | null;
  avatarColor: AvatarColor | null;
  size?: number;
  ringed?: boolean;
  className?: string;
  loading?: boolean;
  /**
   * `tint` is the half-strength edge every in-page avatar wears; `solid` is the
   * full avatar colour the header disc draws on every B+ board.
   */
  edge?: 'tint' | 'solid';
}

export function Avatar({
  handle,
  avatarColor,
  size = 56,
  ringed = false,
  className,
  loading = false,
  edge = 'tint',
}: AvatarProps) {
  if (loading) {
    return (
      <div
        className={className}
        aria-hidden="true"
        aria-busy="true"
        data-avatar-state="loading"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'var(--surface-2)',
        }}
      />
    );
  }

  const letter = handle ? handle.charAt(0).toUpperCase() : null;
  const isAnonymous = !handle;
  const fontSize = Math.round(size * 0.46);

  const tone = avatarColor ?? 'signal';
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`;
  const tintBorder =
    edge === 'solid'
      ? `1.5px solid var(--${tone})`
      : `1.5px solid color-mix(in oklch, var(--${tone}) 50%, transparent)`;
  const ringStyle =
    ringed && !isAnonymous
      ? `0 0 0 3px color-mix(in oklch, var(--${tone}) 14%, transparent)`
      : undefined;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isAnonymous ? 'var(--surface-2)' : tintBg,
        border: isAnonymous ? '1px dashed var(--border-strong)' : tintBorder,
        boxShadow: ringStyle,
        color: isAnonymous ? 'var(--fg-subtle)' : `var(--${tone})`,
        fontSize,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
      data-avatar-edge={isAnonymous ? undefined : edge}
    >
      {letter}
    </div>
  );
}
