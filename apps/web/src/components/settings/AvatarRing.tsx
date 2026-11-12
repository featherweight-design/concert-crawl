import type { AvatarColor } from '@concert-crawl/types';
import { Avatar } from './Avatar';
import { avatarPair } from './definitions/styles';

interface AvatarRingProps {
  handle: string | null;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  /** Outer diameter, ring included. */
  size: number;
  /** Colour of the gap between the ring and whatever the avatar sits on. */
  cutout?: string;
}

/**
 * The B+ avatar: a gradient ring in the user's two colours around a tinted
 * disc with the initial filled by the same gradient. An anonymous profile has
 * no initial to draw, so it keeps the plain dashed placeholder.
 */
export const AvatarRing = ({
  handle,
  avatarColor,
  avatarSecondColor,
  size,
  cutout,
}: AvatarRingProps) => {
  if (!handle) {
    return <Avatar handle={null} avatarColor={avatarColor} size={size} />;
  }

  const { first, second } = avatarPair(avatarColor, avatarSecondColor);
  const fill = `linear-gradient(135deg, var(--${first}), var(--${second}))`;
  const ring = Math.max(2, Math.round(size / 28));

  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        padding: ring,
        background: fill,
        boxShadow: cutout ? `0 0 0 4px ${cutout}` : undefined,
      }}
    >
      <span
        className="flex h-full w-full select-none items-center justify-center rounded-full"
        style={{
          background: `color-mix(in oklch, var(--${first}) 10%, var(--bg))`,
        }}
      >
        <span
          style={{
            fontSize: Math.round(size * 0.44),
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            backgroundImage: fill,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {handle.charAt(0).toUpperCase()}
        </span>
      </span>
    </div>
  );
};
