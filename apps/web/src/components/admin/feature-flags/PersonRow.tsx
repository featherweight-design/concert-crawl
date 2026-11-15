import type { CSSProperties, ReactNode } from 'react';
import { PersonAvatar } from '@/components/admin/primitives';
import { mention } from './flag-drawer-format';

interface PersonRowProps {
  userId: string;
  handle: string | null;
  /** The role line under the handle: "Member · added Nov 9". */
  meta: string;
  /** The right-hand control: the remove X, or Add. */
  trailing?: ReactNode;
  testId: string;
  style?: CSSProperties;
}

/**
 * One person in the flag drawer, as the people list and the add-a-person
 * results both draw them (`07-people-flags-operations`): a 28px avatar, the
 * handle over a role line, and a control at the end.
 */
export const PersonRow = ({
  userId,
  handle,
  meta,
  trailing,
  testId,
  style,
}: PersonRowProps) => (
  <li
    key={userId}
    data-testid={testId}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      ...style,
    }}
  >
    <PersonAvatar
      initialOf={handle}
      avatarColor={null}
      avatarSecondColor={null}
      size={28}
      initialSize={11}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {mention(handle)}
      </div>
      <div style={{ marginTop: 2, fontSize: 12, color: 'var(--fg-muted)' }}>
        {meta}
      </div>
    </div>
    {trailing}
  </li>
);
