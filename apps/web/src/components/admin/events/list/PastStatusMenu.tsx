'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
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
 *
 * A pick lands in the URL a moment later, so each one builds on the last pick
 * asked for, not on `selected`: two quick picks keep both. `selected` takes
 * over again once the URL catches up (or moves another way while nothing is
 * in flight, such as Back). The menu mounts fresh each time it opens.
 */
export const PastStatusMenu = ({
  selected,
  onPick,
}: {
  selected: readonly EventListStatus[];
  onPick: (statuses: EventListStatus[]) => void;
}) => {
  // The last set asked for: what the rows show, and what the next pick
  // builds on.
  const [shown, setShown] = useState<EventListStatus[]>([...selected]);
  // That set's key while it isn't in the URL yet; null with none in flight.
  const [pending, setPending] = useState<string | null>(null);
  const selectedKey = selected.join(',');
  const [seenKey, setSeenKey] = useState(selectedKey);
  if (seenKey !== selectedKey) {
    setSeenKey(selectedKey);
    if (pending === null || pending === selectedKey) {
      setPending(null);
      setShown([...selected]);
    }
  }

  const pick = (next: EventListStatus[]) => {
    setPending(next.join(','));
    setShown(next);
    onPick(next);
  };

  return (
    <div
      data-testid="past-status-menu"
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <MenuRow
        on={shown.length === 0}
        label={COPY.anyStatus}
        onClick={() => pick([])}
      >
        {COPY.anyStatus}
      </MenuRow>
      {PAST_STATUS_FILTER_OPTIONS.map((status) => {
        const on = shown.includes(status);
        return (
          <MenuRow
            key={status}
            on={on}
            label={COPY.status[status]}
            onClick={() =>
              pick(
                on
                  ? shown.filter((each) => each !== status)
                  : [...shown, status],
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
};
