import type { ReactNode } from 'react';
import type { Role } from '@concert-crawl/types';
import {
  KIND_COLORS,
  type StatusKind,
} from '@/components/admin/primitives/utils';
import { ROLE_KIND } from './people-rules';

/**
 * The tint and the text of a role chip. Every drawn chip is its tone at 14%
 * fill and 32% border with a flat dot (`07/people`, `07/person`). Member is
 * the one neutral: fg-subtle tint and dot under fg-muted text (#5A6788 /
 * #9AA8C7), not StatusBadge's surface-2 neutral.
 */
export const roleChipTone = (
  kind: StatusKind,
): { tint: string; text: string } =>
  kind === 'neutral'
    ? { tint: 'var(--fg-subtle)', text: 'var(--fg-muted)' }
    : { tint: KIND_COLORS[kind].fg, text: KIND_COLORS[kind].fg };

/**
 * A person's role chip as `07/people`, `07/people-mobile` and `07/person`
 * draw it: 22 tall, 9px sides, 11.5px text, a flat 6px dot. Its own
 * component so StatusBadge's other chips keep their look.
 */
export const RoleChip = ({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) => {
  const { tint, text } = roleChipTone(ROLE_KIND[role]);
  return (
    <span
      data-testid="role-chip"
      style={{
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: '0 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: text,
        background: `color-mix(in srgb, ${tint} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tint} 32%, transparent)`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tint,
          flex: 'none',
        }}
      />
      {children}
    </span>
  );
};
