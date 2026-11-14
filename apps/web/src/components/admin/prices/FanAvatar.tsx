import type { AvatarColor } from '@concert-crawl/types';
import { avatarPair } from '@/components/settings/definitions/styles';

/**
 * A fan's initial beside their @handle in Submitted prices
 * (`06/submitted-prices-mobile`): a 22px disc washed in the fan's own two
 * colours at 30%, edged in the first at 70%, the initial in the first. A fan
 * who never picked colours gets the same default pair the fan app shows.
 */
export const FanAvatar = ({
  handle,
  avatarColor,
  avatarSecondColor,
  size = 22,
}: {
  handle: string;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  size?: number;
}) => {
  const { first, second } = avatarPair(avatarColor, avatarSecondColor);
  return (
    <span
      aria-hidden="true"
      data-testid="fan-avatar"
      style={{
        width: size,
        height: size,
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        boxSizing: 'border-box',
        background: `linear-gradient(135deg, color-mix(in srgb, var(--${first}) 30%, transparent), color-mix(in srgb, var(--${second}) 30%, transparent))`,
        border: `1.5px solid color-mix(in srgb, var(--${first}) 70%, transparent)`,
        fontSize: Math.round(size * 0.41),
        fontWeight: 800,
        lineHeight: 1,
        color: `var(--${first})`,
      }}
    >
      {handle.charAt(0).toUpperCase()}
    </span>
  );
};
