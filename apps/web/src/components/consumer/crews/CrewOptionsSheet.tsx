'use client'

import { ModalShell } from '@/components/consumer/modal-shell'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface CrewOptionsSheetProps {
  open: boolean
  onClose: () => void
  isKeeper: boolean
  onInvite: () => void
  onReroll: () => void
  onLeave: () => void
  onDelete: () => void
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 52,
  padding: '0 4px',
  background: 'none',
  border: 'none',
  borderTop: '1px solid var(--border)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14.5,
  fontWeight: 700,
  color: 'var(--fg)',
  textAlign: 'left',
}

/**
 * The overflow menu, as a real action sheet rather than a native menu: the
 * keeper-only rows are filtered out of the list entirely rather than disabled,
 * because a greyed "Delete crew" invites a tap that can never work.
 */
export const CrewOptionsSheet = ({
  open,
  onClose,
  isKeeper,
  onInvite,
  onReroll,
  onLeave,
  onDelete,
}: CrewOptionsSheetProps) => {
  const actions = [
    { key: 'invite', label: COPY.detail.invite, run: onInvite, danger: false },
    ...(isKeeper
      ? [
          {
            key: 'reroll',
            label: COPY.roster.newPatch,
            run: onReroll,
            danger: false,
          },
        ]
      : []),
    { key: 'leave', label: COPY.roster.leave, run: onLeave, danger: true },
    ...(isKeeper
      ? [
          {
            key: 'delete',
            label: COPY.roster.delete,
            run: onDelete,
            danger: true,
          },
        ]
      : []),
  ]

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.detail.options}
      sheetHeight="short"
      desktopWidth={420}
    >
      <div className="flex flex-col pb-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              onClose()
              action.run()
            }}
            className="cursor-pointer"
            style={{
              ...row,
              color: action.danger ? 'var(--danger)' : 'var(--fg)',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </ModalShell>
  )
}
