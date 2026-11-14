import type { AvatarColor } from '@concert-crawl/types';
import { avatarPair } from '@/components/settings/definitions/styles';

interface PersonAvatarProps {
  /** The first letter is the initial; `?` when there is none. */
  initialOf: string | null;
  /** Their own colours, as the API sends them (null: not chosen). */
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  size: number;
  /** The initial's size; a larger head draws it bigger than the default. */
  initialSize?: number;
}

/**
 * Every admin avatar (README rule 12): a disc and ring in the person's own
 * two-colour mix, as `07/people`, `07/person`, `07/a-code-in-flow` and
 * `01/desktop-sidebar` draw them. A person with no colour chosen gets the house
 * signal-to-accent pair (`avatarPair`), one colour alone draws solid.
 */
export const PersonAvatar = ({
  initialOf,
  avatarColor,
  avatarSecondColor,
  size,
  initialSize,
}: PersonAvatarProps) => {
  const { first, second } = avatarPair(avatarColor, avatarSecondColor);
  return (
    <span
      aria-hidden
      data-testid="person-avatar"
      data-avatar-first={first}
      data-avatar-second={second}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: initialSize ?? Math.round(size * 0.42),
        lineHeight: 1,
        boxSizing: 'border-box',
        // The disc washes each colour at 30% over the page; the ring is the
        // same two colours at full strength.
        background: `linear-gradient(135deg, color-mix(in srgb, var(--${first}) 30%, var(--bg)), color-mix(in srgb, var(--${second}) 30%, var(--bg))) padding-box, linear-gradient(135deg, var(--${first}), var(--${second})) border-box`,
        border: '1.5px solid transparent',
        color: `var(--${first})`,
      }}
    >
      {(initialOf ?? '?').charAt(0).toUpperCase()}
    </span>
  );
};
