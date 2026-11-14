'use client';

import { useState, type CSSProperties } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DateField, TimeField } from '../events/edit/pickers';
import { EventConfirm, Radio, type NewDate } from '../events/edit/StatusCard';

const EVENT = ADMIN_COPY.eventEdit;
const COPY = ADMIN_COPY.needsYou;

const FIELD_LABEL: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

/**
 * `10-needs-you-panels/postponed-d` and `postponed-m`: marking a dropped show
 * postponed asks for a new date or none, with the event editor's own Postponed
 * choice, date field and time field (`04/date-picker-d`). The notice says how
 * many people Watching get one; the "Moved to" line the board adds for a dated
 * postponement is not drawn here, as fans do not see it today.
 */
export const PostponedDialog = ({
  name,
  watching,
  fanDate,
  today,
  tomorrow,
  phone,
  onCancel,
  onConfirm,
}: {
  /** The act's name, as the title says it: "Olive Jones is postponed?". */
  name: string;
  watching: number;
  /** The show's current date (YYYY-MM-DD), or null when the item has none. */
  fanDate: string | null;
  /** Mountain Time's today, for the field's own marker. */
  today: string;
  /** Mountain Time's tomorrow: a New date must be after today. */
  tomorrow: string;
  phone: boolean;
  onCancel: () => void;
  /** Saves; a rejection keeps the dialog open with its failed line. */
  onConfirm: (newDate: NewDate | null) => Promise<void>;
}) => {
  // The choice: null is No new date yet, which is where every opening starts.
  const [newDate, setNewDate] = useState<NewDate | null>(null);
  return (
    <EventConfirm
      title={EVENT.postponed.title(name)}
      confirmLabel={EVENT.postponed.confirm}
      danger={false}
      failedWhat={EVENT.postponed.failed}
      failedSaved={COPY.answerFailed.saved}
      onCancel={onCancel}
      // A New date must move the show: the day it is already on is no date.
      ready={newDate === null || newDate.date !== fanDate}
      act={() => onConfirm(newDate)}
    >
      <div>
        {phone
          ? EVENT.postponed.notice(watching)
          : `${EVENT.postponed.notice(watching)} ${EVENT.postponed.stays}`}
      </div>
      <div
        role="group"
        aria-label={EVENT.postponed.title(name)}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <Radio
          checked={newDate === null}
          label={EVENT.postponed.noDate}
          onPick={() => setNewDate(null)}
        />
        <Radio
          checked={newDate !== null}
          label={EVENT.postponed.newDate}
          onPick={() =>
            setNewDate(
              // Starts tomorrow, never on the day the show already has.
              newDate ?? { date: tomorrow, showTime: null },
            )
          }
        />
      </div>
      {newDate !== null && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: phone ? '1fr 1fr' : '1.4fr 1fr',
            gap: 12,
          }}
        >
          <div>
            <label htmlFor="needs-you-postponed-date" style={FIELD_LABEL}>
              {EVENT.show.date}
            </label>
            <DateField
              id="needs-you-postponed-date"
              value={newDate.date}
              onChange={(date) => setNewDate({ ...newDate, date })}
              today={today}
              min={tomorrow}
              phone={phone}
              withYear={false}
            />
          </div>
          <div>
            <label htmlFor="needs-you-postponed-show" style={FIELD_LABEL}>
              {EVENT.show.showTime}
            </label>
            <TimeField
              id="needs-you-postponed-show"
              value={newDate.showTime}
              onChange={(showTime) => setNewDate({ ...newDate, showTime })}
              phone={phone}
              placeholder={EVENT.none}
              label={EVENT.show.showTime}
            />
          </div>
        </div>
      )}
    </EventConfirm>
  );
};
