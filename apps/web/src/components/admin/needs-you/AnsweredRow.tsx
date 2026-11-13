'use client';

import { Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.needsYou;

interface AnsweredRowProps {
  /** The finished line, e.g. "Olive Jones marked Still on." */
  line: string;
  /** Absent for a snooze or a notifying answer: nothing to take back. */
  onUndo?: (() => void) | undefined;
  undoing?: boolean;
}

/**
 * `02/answered-with-undo`: the dashed line that takes an answered card's
 * place at the top of the list. Undo is there for as long as the item's state
 * has not moved on; the API refuses it after that.
 */
export const AnsweredRow = ({
  line,
  onUndo,
  undoing = false,
}: AnsweredRowProps) => (
  <div
    role="status"
    data-testid="needs-you-answered"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px dashed var(--border-strong)',
      fontSize: 13.5,
      color: 'var(--fg-muted)',
    }}
  >
    <Check
      size={15}
      aria-hidden
      style={{ color: 'var(--success)', flex: 'none' }}
    />
    <span style={{ flex: 1, minWidth: 0 }}>{line}</span>
    {onUndo && (
      <AdminButton
        size="sm"
        variant="outline"
        disabled={undoing}
        onClick={onUndo}
      >
        {COPY.undo.action}
      </AdminButton>
    )}
  </div>
);
