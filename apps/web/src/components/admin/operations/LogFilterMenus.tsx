'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, Search } from 'lucide-react';
import {
  AUDIT_AREAS,
  type AuditArea,
  type AuditLogActor,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { PersonAvatar, useIsPhone } from '@/components/admin/primitives';
import { FilterPicker } from '@/components/admin/events/list/FilterPicker';
import { AREA_LABELS } from './activity-sentences';

const COPY = ADMIN_COPY.operations.log;

/** Anyone shows its search once there are more people than this. */
const SEARCH_PAST = 8;

/**
 * One menu row (`37/log-filter-menus`): 42px on desktop (36 for a page), 48
 * on the phone sheet (`37/log-filter-sheet-m`); the picked row on
 * `--surface-2` with a `--signal` tick.
 */
const Row = ({
  on,
  label,
  describedBy,
  height,
  onPick,
  children,
}: {
  on: boolean;
  label: string;
  /** The id of the row's visible detail line, read after its name. */
  describedBy?: string;
  height: number;
  onPick: () => void;
  children: ReactNode;
}) => {
  const isPhone = useIsPhone();
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isPhone ? 12 : 10,
    width: '100%',
    minHeight: isPhone ? 48 : height,
    padding: isPhone ? '0 8px' : '0 10px',
    border: 'none',
    borderRadius: isPhone ? 10 : 9,
    background: on ? 'var(--surface-2)' : 'transparent',
    color: 'var(--fg)',
    font: 'inherit',
    fontSize: isPhone ? 14.5 : 13.5,
    fontWeight: on ? 600 : 500,
    textAlign: 'left',
    cursor: 'pointer',
  };
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      aria-describedby={describedBy}
      style={style}
      onClick={onPick}
    >
      {children}
      {on && (
        <Check
          size={isPhone ? 16 : 14}
          strokeWidth={2}
          color="var(--signal)"
          aria-hidden
          style={{ flex: 'none' }}
        />
      )}
    </button>
  );
};

/** Anyone's own row: an empty dashed disc where a face would be. */
const NoOne = () => {
  const size = useIsPhone() ? 28 : 24;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        border: '1.5px dashed var(--border-strong)',
      }}
    />
  );
};

const NOTE: CSSProperties = {
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--fg-subtle)',
};

/**
 * The drawn search box: Anyone's "Find an admin", and "Search the log" left
 * of the chips (`37/log-day-picker-d`, 240 wide; full width on `37/log-m`).
 */
export const SearchField = ({
  value,
  onChange,
  label,
  maxLength,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength?: number;
  style?: CSSProperties;
}) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      padding: '0 12px',
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    <Search size={15} strokeWidth={1.7} color="var(--fg-subtle)" aria-hidden />
    <input
      type="search"
      value={value}
      placeholder={label}
      aria-label={label}
      {...(maxLength !== undefined && { maxLength })}
      onChange={(evt) => onChange(evt.target.value)}
      style={{
        flex: 1,
        minWidth: 0,
        border: 'none',
        background: 'transparent',
        color: 'var(--fg)',
        font: 'inherit',
        fontSize: 13,
        outline: 'none',
      }}
    />
  </label>
);

const AnyoneList = ({
  actors,
  failed,
  actor,
  isToday,
  onPick,
}: {
  actors: AuditLogActor[];
  failed: boolean;
  actor: string | null;
  isToday: boolean;
  onPick: (handle: string | null) => void;
}) => {
  const isPhone = useIsPhone();
  const listId = useId();
  const [query, setQuery] = useState('');
  // The phone sheet draws neither the search nor the counts (as drawn).
  const searchable = !isPhone && actors.length > SEARCH_PAST;
  const needle = query.trim().toLowerCase().replace(/^@/, '');
  const shown = searchable
    ? actors.filter((person) => person.handle.toLowerCase().includes(needle))
    : actors;
  const avatar = isPhone ? 28 : 24;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {searchable && (
        <SearchField
          value={query}
          onChange={setQuery}
          label={COPY.findAdmin}
          style={{ marginBottom: 6 }}
        />
      )}
      <Row
        on={actor === null}
        label={COPY.anyone}
        height={42}
        onPick={() => onPick(null)}
      >
        <NoOne />
        <span style={{ flex: 1 }}>{COPY.anyone}</span>
      </Row>
      {shown.map((person) => (
        <Row
          key={person.handle}
          on={actor === person.handle}
          label={COPY.handle(person.handle)}
          // The count and "You" read as the row's description, as they show.
          {...(!isPhone && { describedBy: `${listId}-${person.handle}` })}
          height={42}
          onPick={() => onPick(person.handle)}
        >
          <PersonAvatar
            initialOf={person.handle}
            avatarColor={person.avatarColor}
            avatarSecondColor={person.avatarSecondColor}
            size={avatar}
            initialSize={isPhone ? 12 : 10}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {COPY.handle(person.handle)}
            </span>
            {!isPhone && (
              <span
                id={`${listId}-${person.handle}`}
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 400,
                  color: 'var(--fg-subtle)',
                }}
              >
                {COPY.personLine(
                  COPY.changesOn(person.count, isToday),
                  person.you,
                  person.role === 'sub_admin',
                )}
              </span>
            )}
          </span>
        </Row>
      ))}
      {failed && (
        <div role="alert" style={{ ...NOTE, color: 'var(--danger)' }}>
          {COPY.actorsFailed}
        </div>
      )}
      {!isPhone && <div style={NOTE}>{COPY.anyoneNote}</div>}
    </div>
  );
};

const AnyPageList = ({
  area,
  onPick,
}: {
  area: AuditArea | null;
  onPick: (area: AuditArea | null) => void;
}) => {
  const isPhone = useIsPhone();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Row
        on={area === null}
        label={COPY.anyPage}
        height={36}
        onPick={() => onPick(null)}
      >
        <span style={{ flex: 1 }}>{COPY.anyPage}</span>
      </Row>
      {/* AUDIT_AREAS runs in the sidebar's order (shell/nav.ts). */}
      {AUDIT_AREAS.map((key) => (
        <Row
          key={key}
          on={area === key}
          label={AREA_LABELS[key]}
          height={36}
          onPick={() => onPick(key)}
        >
          <span style={{ flex: 1 }}>{AREA_LABELS[key]}</span>
        </Row>
      ))}
      {!isPhone && <div style={NOTE}>{COPY.anyPageNote}</div>}
    </div>
  );
};

/**
 * `37/log-filter-menus`: Anyone, a single-select menu of every admin and
 * sub-admin with their changes on the day shown, you first. Picked, the chip
 * shows the face and handle with a × (addendum 5 #4).
 */
export const AnyoneFilter = ({
  actors,
  failed,
  actor,
  isToday,
  onActor,
}: {
  actors: AuditLogActor[];
  failed: boolean;
  actor: string | null;
  isToday: boolean;
  onActor: (handle: string | null) => void;
}) => {
  const picked = actors.find((person) => person.handle === actor);
  return (
    <FilterPicker
      label={COPY.anyone}
      sheetTitle={COPY.whoSheet}
      menuWidth={300}
      testId="activity-log-anyone"
      picked={
        <>
          <PersonAvatar
            initialOf={actor}
            avatarColor={picked?.avatarColor ?? null}
            avatarSecondColor={picked?.avatarSecondColor ?? null}
            size={18}
            initialSize={8}
          />
          {COPY.handle(actor ?? '')}
        </>
      }
      pickedLabel={COPY.pickedActor(actor ?? '')}
      clearLabel={COPY.clearActor}
      options={[]}
      selected={actor === null ? [] : [actor]}
      unticked={0}
      menu={(close) => (
        <AnyoneList
          actors={actors}
          failed={failed}
          actor={actor}
          isToday={isToday}
          onPick={(handle) => {
            onActor(handle);
            close();
          }}
        />
      )}
      onApply={(keys) => onActor(keys[0] ?? null)}
    />
  );
};

/**
 * `37/log-filter-menus`: Any page, the sidebar's pages in its order, one at a
 * time.
 */
export const AnyPageFilter = ({
  area,
  onArea,
}: {
  area: AuditArea | null;
  onArea: (area: AuditArea | null) => void;
}) => (
  <FilterPicker
    label={COPY.anyPage}
    sheetTitle={COPY.pageSheet}
    testId="activity-log-any-page"
    picked={area === null ? null : AREA_LABELS[area]}
    pickedLabel={COPY.pickedPage(area === null ? '' : AREA_LABELS[area])}
    clearLabel={COPY.clearPage}
    options={[]}
    selected={area === null ? [] : [area]}
    unticked={0}
    menu={(close) => (
      <AnyPageList
        area={area}
        onPick={(next) => {
          onArea(next);
          close();
        }}
      />
    )}
    onApply={(keys) => {
      const next = AUDIT_AREAS.find((key) => key === keys[0]);
      onArea(next ?? null);
    }}
  />
);
