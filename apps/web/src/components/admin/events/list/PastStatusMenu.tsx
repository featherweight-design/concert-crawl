'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useIsPhone } from '@/components/admin/primitives';
import { StatusChip } from '@/components/consumer/StatusChip';
import {
  PAST_STATUS_FILTER_OPTIONS,
  STATUS_CHIP,
  type EventListStatus,
} from './events-rules';

const COPY = ADMIN_COPY.eventsList;

/**
 * One row: 38px, the board's ticked "Any status" row (surface-2, a 14px
 * signal tick on the right) for whatever is on.
 */
const MenuRow = ({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => {
  const isPhone = useIsPhone();
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    // A phone row is a 44px tap target, as the checkbox sheet's are.
    minHeight: isPhone ? 44 : 38,
    padding: '0 10px',
    border: 'none',
    borderRadius: 9,
    background: on ? 'var(--surface-2)' : 'transparent',
    color: 'var(--fg)',
    font: 'inherit',
    fontSize: 13.5,
    textAlign: 'left',
    cursor: 'pointer',
  };
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      style={style}
      onClick={onClick}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex' }}>{children}</span>
      {on && (
        <Check
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          style={{ flex: 'none', display: 'block', color: 'var(--signal)' }}
        />
      )}
    </button>
  );
};

/**
 * Past's Any status menu (`36/past-status-menu-d`): Any status, then the four
 * past statuses as their `StatusChip`s, then the hint. Multi-select; each pick
 * applies at once, since the board draws no Show N.
 */
export const PastStatusMenu = ({
  selected,
  onPick,
}: {
  selected: readonly EventListStatus[];
  onPick: (statuses: EventListStatus[]) => void;
}) => (
  <div
    data-testid="past-status-menu"
    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
  >
    <MenuRow
      on={selected.length === 0}
      label={COPY.anyStatus}
      onClick={() => onPick([])}
    >
      {COPY.anyStatus}
    </MenuRow>
    {PAST_STATUS_FILTER_OPTIONS.map((status) => {
      const on = selected.includes(status);
      return (
        <MenuRow
          key={status}
          on={on}
          label={COPY.status[status]}
          onClick={() =>
            onPick(
              on
                ? selected.filter((each) => each !== status)
                : [...selected, status],
            )
          }
        >
          <StatusChip
            status={STATUS_CHIP[status]}
            label={COPY.status[status]}
          />
        </MenuRow>
      );
    })}
    <p
      style={{
        margin: 0,
        padding: '6px 10px',
        fontSize: 12,
        color: 'var(--fg-subtle)',
      }}
    >
      {COPY.pastStatusHint}
    </p>
  </div>
);
