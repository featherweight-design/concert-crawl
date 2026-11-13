'use client';

import { useEffect, useRef, useState } from 'react';

import { CrewPatch } from '@/components/consumer/crew-patch';
import { ModalShell } from '@/components/consumer/modal-shell';
import { CCOverlayHost } from '@/components/ui/cc-overlay/CCOverlayHost';
import { useAnchoredPosition } from '@/components/ui/cc-overlay/lib/use-anchored-position';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

const POPOVER_WIDTH = 400;

interface CrewOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  crewId: string;
  crewName: string;
  patchSalt: number;
  /** The "Crew options" button: a desktop popover hangs off it. */
  anchor: HTMLElement | null;
  isKeeper: boolean;
  onInvite: () => void;
  onRename: () => void;
  onReroll: () => void;
  onLeave: () => void;
  onDelete: () => void;
}

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 18 18',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const ICONS = {
  invite: (
    <svg {...ICON_PROPS}>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <path d="M2 14.5c.4-2.4 2.2-3.6 4.5-3.6s4.1 1.2 4.5 3.6" />
      <circle cx="12.5" cy="7" r="2" />
      <path d="M12.5 11c1.8 0 3 1 3.5 2.8" />
    </svg>
  ),
  rename: (
    <svg {...ICON_PROPS}>
      <path d="M2.5 9.2V3.5a1 1 0 0 1 1-1h5.7l6.3 6.3-6.7 6.7z" />
      <circle cx="6" cy="6" r="1" />
    </svg>
  ),
  reroll: (
    <svg {...ICON_PROPS}>
      <circle cx="4.5" cy="9" r="2" />
      <circle cx="13" cy="4" r="2" />
      <circle cx="13" cy="14" r="2" />
      <path d="M6.3 8l5-3M6.3 10l5 3" />
    </svg>
  ),
  leave: (
    <svg {...ICON_PROPS}>
      <path d="M15 3L4 14l-1 2 2-1L16 4z" />
    </svg>
  ),
  delete: (
    <svg {...ICON_PROPS}>
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  ),
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  width: '100%',
  minHeight: 52,
  padding: '0 18px',
  background: 'none',
  border: 'none',
  borderTop: '1px solid var(--border)',
  fontFamily: 'var(--font-ui)',
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--fg)',
  textAlign: 'left',
};

/** The patch, the crew's name and what this is: the head of both shells. */
const OptionsHeader = ({
  crewId,
  crewName,
  patchSalt,
}: Pick<CrewOptionsSheetProps, 'crewId' | 'crewName' | 'patchSalt'>) => (
  <div className="flex items-center gap-3.5 px-[18px] pb-3.5 pt-1.5">
    <CrewPatch
      crewId={crewId}
      patchSalt={patchSalt}
      size={38}
      scale="tile"
      ringed
    />
    <div className="flex min-w-0 flex-col gap-1">
      <span
        className="truncate"
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
        }}
      >
        {crewName}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {COPY.detail.options}
      </span>
    </div>
  </div>
);

/**
 * The overflow menu, as a real action sheet rather than a native menu: the
 * keeper-only rows are filtered out of the list entirely rather than disabled,
 * because a greyed "Delete crew" invites a tap that can never work. On a phone
 * it is a sheet that fits its rows; from `sm` it is a popover under the
 * "Crew options" button.
 */
export const CrewOptionsSheet = (props: CrewOptionsSheetProps) => {
  const {
    open,
    onClose,
    isKeeper,
    onInvite,
    onRename,
    onReroll,
    onLeave,
    onDelete,
  } = props;
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    setWide(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setWide(ev.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const safe: OptionRowProps['action'][] = [
    { key: 'invite', label: COPY.detail.invite, run: onInvite },
    ...(isKeeper
      ? [
          { key: 'rename' as const, label: COPY.rename.title, run: onRename },
          {
            key: 'reroll' as const,
            label: COPY.roster.newPatch,
            run: onReroll,
          },
        ]
      : []),
  ];
  const danger: OptionRowProps['action'][] = [
    { key: 'leave', label: COPY.roster.leave, run: onLeave },
    ...(isKeeper
      ? [{ key: 'delete' as const, label: COPY.roster.delete, run: onDelete }]
      : []),
  ];

  const list = (
    <div className="flex flex-col pb-2">
      {safe.map((action) => (
        <OptionRow key={action.key} action={action} onClose={onClose} />
      ))}
      {/* A gap between the safe actions and the two that cannot be undone. */}
      <div aria-hidden="true" style={{ height: 8 }} />
      {danger.map((action) => (
        <OptionRow key={action.key} action={action} onClose={onClose} danger />
      ))}
    </div>
  );

  if (wide) {
    return <OptionsPopover {...props}>{list}</OptionsPopover>;
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.detail.options}
      sheetHeight="fit"
      surface="crew"
    >
      <div className="-mx-[18px] -mt-1.5">
        <OptionsHeader {...props} />
        {list}
      </div>
    </ModalShell>
  );
};

interface OptionRowProps {
  action: {
    key: keyof typeof ICONS;
    label: string;
    run: () => void;
  };
  onClose: () => void;
  danger?: boolean;
}

const OptionRow = ({ action, onClose, danger = false }: OptionRowProps) => (
  <button
    type="button"
    onClick={() => {
      onClose();
      action.run();
    }}
    className="cursor-pointer"
    style={{ ...row, color: danger ? 'var(--danger)' : 'var(--fg)' }}
  >
    {ICONS[action.key]}
    {action.label}
  </button>
);

const OptionsPopover = ({
  open,
  onClose,
  anchor,
  children,
  ...head
}: CrewOptionsSheetProps & { children: React.ReactNode }) => {
  const position = useAnchoredPosition(
    anchor,
    'bottom',
    'start',
    POPOVER_WIDTH,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && position !== null) panelRef.current?.focus();
  }, [open, position === null]); // eslint-disable-line react-hooks/exhaustive-deps -- focus once when the panel first has a position

  if (!open || position === null) return null;

  return (
    <CCOverlayHost>
      <div
        role="presentation"
        data-testid="crew-options-scrim"
        onClick={onClose}
        className="fixed inset-0 z-[90]"
        style={{ background: 'var(--scrim)' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={COPY.detail.options}
        tabIndex={-1}
        className="fixed z-[100] flex flex-col outline-none"
        style={{
          width: POPOVER_WIDTH,
          ...position.style,
          overflowY: 'auto',
          borderRadius: 16,
          border: '1.5px solid transparent',
          background:
            'linear-gradient(color-mix(in srgb, var(--bg-elevated), white 6%), color-mix(in srgb, var(--bg-elevated), white 6%)) padding-box, linear-gradient(90deg, var(--signal), var(--accent)) top / 100% 2px no-repeat border-box, var(--border-strong) border-box',
          boxShadow:
            '0 24px 60px rgba(0,0,0,0.5), 0 0 48px -14px color-mix(in srgb, var(--signal) 30%, transparent)',
        }}
      >
        <div className="pt-3">
          <OptionsHeader
            crewId={head.crewId}
            crewName={head.crewName}
            patchSalt={head.patchSalt}
          />
          {children}
        </div>
      </div>
    </CCOverlayHost>
  );
};
