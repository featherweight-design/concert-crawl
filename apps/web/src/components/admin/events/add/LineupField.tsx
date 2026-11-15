'use client';

/** Consumed by the Add a show form (E3 PR C3) and Event edit (E2-B). */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { PHOTO_PLACEHOLDER } from '../../artists/artist-styles';
import { POPOVER } from '../edit/pickers';
import type { ArtistSuggestion } from './add-show-api';
import {
  addAct,
  addActWithRole,
  moveAct,
  moveActKeepingRoles,
  removeAct,
  removeActKeepingHeadliner,
  rolesOf,
  type Act,
} from './add-show-rules';

const COPY = ADMIN_COPY.addShow.lineupField;
const EDIT_COPY = ADMIN_COPY.eventEdit.show;
const SEARCH_DEBOUNCE_MS = 250;

/** The drawn 11px × on a 16 box, stroke 2 (`11/add-a-show-lineup-d`). */
const Cross = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 16 16"
    fill="none"
    stroke="var(--fg-muted)"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const BARE: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: 2,
  margin: -2,
  border: 'none',
  background: 'transparent',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

/** A new tab, so following a chip's name never drops unsaved edits. */
const NEW_TAB: { target: string; rel: string } = {
  target: '_blank',
  rel: 'noopener noreferrer',
};

/** `focusAt`'s mark for Add an artist, once the last chip is removed. */
const FOCUS_INPUT = -1;

/** Event edit's chip tint: cyan matched, amber unsure, none for a typed name. */
const toneOf = (act: Act): string | null => {
  if (act.artistId === undefined) return null;
  return act.unsure ? 'var(--warning)' : 'var(--signal)';
};

/**
 * Where an Event edit chip goes (`06/event-edit`: "Each name links to its
 * artist. Amber means unsure: opens the match on Artists"). Admin has no page
 * per artist, so an unsure match opens Artists, where it waits on To check;
 * a sure one opens its artist page. A typed name, and a pick not yet saved
 * (no slug), link nowhere.
 */
const hrefOf = (act: Act): string | null => {
  if (act.artistId === undefined) return null;
  if (act.unsure) return '/admin/artists';
  return act.slug === undefined ? null : `/artists/${act.slug}`;
};

/**
 * Add a show's Lineup (`11/add-a-show-lineup-d`): 30px chips in bill order,
 * the first the headliner, then "Add an artist". Typing suggests artists
 * from Artists (a pick links it); Enter adds the name as typed. Drag reorders
 * on desktop (Alt+arrow from the keyboard); the phone moves an act up with
 * an arrow.
 *
 * `variant="edit"` is Event edit's (`06/event-edit`, `06/event-edit-mobile`):
 * 24px chips tinted by match with a 14px avatar dot, each a link to its
 * artist, and no role tag or ×. Undrawn on desktop, so kept from Add a show
 * without their marks: Delete on a focused chip removes it, and drag or
 * Alt+arrow reorders it, focus following. The phone takes Add a show's drawn
 * chip controls, the move-up arrow and the × (orchestrator ruling).
 */
export const LineupField = ({
  id,
  lineup,
  onChange,
  search,
  phone,
  invalid,
  describedBy,
  variant = 'add',
}: {
  id: string;
  lineup: Act[];
  onChange: (next: Act[]) => void;
  search: (text: string, signal: AbortSignal) => Promise<ArtistSuggestion[]>;
  phone: boolean;
  invalid: boolean;
  describedBy?: string | undefined;
  variant?: 'add' | 'edit';
}) => {
  const edit = variant === 'edit';
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [dragging, setDragging] = useState<number | null>(null);
  const listId = useId();
  const hintId = useId();
  const keysId = useId();
  const searchRef = useRef(search);
  searchRef.current = search;
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  /** Where focus goes once the bill redraws after a keyboard edit. */
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    const at = focusAt.current;
    if (at === null) return;
    focusAt.current = null;
    if (at === FOCUS_INPUT) inputRef.current?.focus();
    else chipRefs.current[at]?.focus();
  }, [lineup]);

  useEffect(() => {
    const typed = text.trim();
    setActive(-1);
    // An older query's artists never show beside newer text.
    setSuggestions([]);
    if (typed === '') return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchRef.current(typed, controller.signal).then(
        (found) => {
          // A reply for a query since replaced: dropped, never shown.
          if (controller.signal.aborted) return;
          setSuggestions(found);
        },
        // A failed search only means no suggestions: Enter still adds the name.
        () => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  const typed = text.trim();
  const options: { key: string; label: string; act: Act }[] = [
    ...suggestions.map((artist) => ({
      key: artist.id,
      label: artist.name,
      act: {
        name: artist.name,
        artistId: artist.id,
        ...(artist.unsure && { unsure: true }),
      },
    })),
    ...(typed === ''
      ? []
      : [{ key: 'typed', label: COPY.addTyped(typed), act: { name: typed } }]),
  ];

  // Event edit's acts carry their roles, so an add or a move never shifts
  // another act's (`moveActKeepingRoles`).
  const add = (act: Act) => {
    onChange(edit ? addActWithRole(lineup, act) : addAct(lineup, act));
    setText('');
  };
  // `moveAct` returns an off-the-end move unchanged; skipping it here (and a
  // move onto itself) spares the form a change that changes nothing. From the
  // keyboard, focus follows the chip to its new place.
  const move = (from: number, to: number, refocus = false) => {
    if (from === to || to < 0 || to >= lineup.length) return;
    if (refocus) focusAt.current = to;
    onChange(
      edit ? moveActKeepingRoles(lineup, from, to) : moveAct(lineup, from, to),
    );
  };
  // `addAct` keeps a name off the bill twice, but the bill also arrives as a
  // prop, so the key counts repeats. NUL can't be typed into a name, so a
  // name can never pass for another name's repeat.
  const seen = new Map<string, number>();
  const keys = lineup.map((act) => {
    const count = seen.get(act.name) ?? 0;
    seen.set(act.name, count + 1);
    return `${act.name}\u0000${count}`;
  });
  const roles = rolesOf(lineup);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            padding: edit ? '8px 10px' : '6px 8px',
            borderRadius: 10,
            background: 'var(--bg)',
            border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
            boxSizing: 'border-box',
          }}
        >
          {lineup.map((act, index) => {
            const role =
              roles[index] === 'headliner' ? COPY.headliner : COPY.support;
            if (edit) {
              const tone = toneOf(act);
              const href = hrefOf(act);
              const key = keys[index];
              const match =
                tone === null ? 'typed' : act.unsure ? 'unsure' : 'matched';
              // The tint is colour only, so the name says the match too.
              const label = EDIT_COPY.lineupChip(act.name, role, match);
              const chipStyle = {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 24,
                padding: '0 9px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: 'var(--fg)',
                textDecoration: 'none',
                // A typed name has no match to tint (undrawn): the neutral
                // chip of Add a show.
                background:
                  tone === null
                    ? 'var(--surface-2)'
                    : `color-mix(in srgb, ${tone} 10%, transparent)`,
                border:
                  tone === null
                    ? '1px solid var(--border-strong)'
                    : `1px solid color-mix(in srgb, ${tone} 30%, transparent)`,
                opacity: dragging === index ? 0.5 : 1,
                maxWidth: '100%',
              } satisfies CSSProperties;
              const dot = (
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    flex: 'none',
                    borderRadius: '50%',
                    background: PHOTO_PLACEHOLDER,
                  }}
                />
              );
              const name = (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.name}
                </span>
              );
              if (phone) {
                // Add a show's phone chip (`11/add-a-show-lineup-d`): the
                // arrow moves it up the bill and the × removes it.
                return (
                  <span
                    key={key}
                    role="group"
                    aria-label={label}
                    data-testid="lineup-chip"
                    data-tone={match}
                    style={chipStyle}
                  >
                    {index > 0 && (
                      <button
                        type="button"
                        aria-label={COPY.moveEarlier(act.name)}
                        onClick={() => move(index, index - 1)}
                        style={BARE}
                      >
                        <ChevronLeft size={14} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                    {dot}
                    {href === null ? (
                      name
                    ) : (
                      <a
                        href={href}
                        aria-label={EDIT_COPY.lineupNewTab(act.name)}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        {...NEW_TAB}
                      >
                        {name}
                      </a>
                    )}
                    <button
                      type="button"
                      aria-label={COPY.remove(act.name)}
                      onClick={() =>
                        onChange(removeActKeepingHeadliner(lineup, index))
                      }
                      style={BARE}
                    >
                      <Cross />
                    </button>
                  </span>
                );
              }
              const props = {
                ref: (el: HTMLElement | null) => {
                  chipRefs.current[index] = el;
                },
                'aria-describedby': keysId,
                'data-testid': 'lineup-chip',
                'data-tone': match,
                draggable: true,
                onDragStart: () => setDragging(index),
                onDragEnd: () => setDragging(null),
                onDragOver: (evt: DragEvent<Element>) => evt.preventDefault(),
                onDrop: (evt: DragEvent<Element>) => {
                  evt.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                },
                onKeyDown: (evt: KeyboardEvent<Element>) => {
                  if (evt.key === 'Delete' || evt.key === 'Backspace') {
                    evt.preventDefault();
                    // Focus goes to the chip that takes its place, else the
                    // one before, else Add an artist. Taking the only
                    // headliner promotes the front act, so focus goes there
                    // and its name says Headliner.
                    const left = removeAct(lineup, index);
                    const promoted =
                      left.length > 0 && !rolesOf(left).includes('headliner');
                    focusAt.current = promoted
                      ? 0
                      : lineup.length > 1
                        ? Math.min(index, lineup.length - 2)
                        : FOCUS_INPUT;
                    onChange(removeActKeepingHeadliner(lineup, index));
                    return;
                  }
                  if (!evt.altKey) return;
                  if (evt.key === 'ArrowLeft') move(index, index - 1, true);
                  if (evt.key === 'ArrowRight') move(index, index + 1, true);
                },
                style: chipStyle,
              };
              return href === null ? (
                <span
                  key={key}
                  role="group"
                  tabIndex={0}
                  aria-label={label}
                  {...props}
                >
                  {dot}
                  {name}
                </span>
              ) : (
                <a
                  key={key}
                  href={href}
                  aria-label={EDIT_COPY.lineupNewTab(label)}
                  {...NEW_TAB}
                  {...props}
                >
                  {dot}
                  {name}
                </a>
              );
            }
            return (
              <span
                key={keys[index]}
                role="group"
                aria-label={COPY.chipLabel(act.name, role)}
                data-testid="lineup-chip"
                tabIndex={phone ? undefined : 0}
                draggable={!phone}
                onDragStart={() => setDragging(index)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(evt) => evt.preventDefault()}
                onDrop={(evt) => {
                  evt.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                }}
                onKeyDown={(evt) => {
                  if (!evt.altKey || evt.target !== evt.currentTarget) return;
                  if (evt.key === 'ArrowLeft') move(index, index - 1);
                  if (evt.key === 'ArrowRight') move(index, index + 1);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 999,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  cursor: phone ? 'default' : 'grab',
                  opacity: dragging === index ? 0.5 : 1,
                  maxWidth: '100%',
                }}
              >
                {phone && index > 0 && (
                  <button
                    type="button"
                    aria-label={COPY.moveEarlier(act.name)}
                    onClick={() => move(index, index - 1)}
                    style={BARE}
                  >
                    <ChevronLeft size={14} strokeWidth={2} aria-hidden />
                  </button>
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {act.name}
                </span>
                <span
                  aria-hidden
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-subtle)',
                    textTransform: 'uppercase',
                  }}
                >
                  {role}
                </span>
                <button
                  type="button"
                  aria-label={COPY.remove(act.name)}
                  onClick={() => onChange(removeAct(lineup, index))}
                  style={BARE}
                >
                  <Cross />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={options.length > 0 ? listId : undefined}
            aria-autocomplete="list"
            // The end of the bill: an act dropped here goes last.
            onDragOver={(evt) => {
              if (dragging !== null) evt.preventDefault();
            }}
            onDrop={(evt) => {
              evt.preventDefault();
              if (dragging !== null) move(dragging, lineup.length - 1);
              setDragging(null);
            }}
            aria-activedescendant={
              active >= 0 ? `${listId}-${active}` : undefined
            }
            aria-invalid={invalid || undefined}
            aria-describedby={[hintId, describedBy].filter(Boolean).join(' ')}
            className="admin-add-show-input"
            placeholder={COPY.add}
            value={text}
            onChange={(evt) => setText(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
                if (options.length === 0) return;
                evt.preventDefault();
                const step = evt.key === 'ArrowDown' ? 1 : -1;
                setActive(
                  (was) => (was + step + options.length) % options.length,
                );
              } else if (evt.key === 'Enter') {
                evt.preventDefault();
                const chosen = options[active];
                if (chosen) add(chosen.act);
                else if (typed !== '') add({ name: typed });
              } else if (evt.key === 'Escape' && text !== '') {
                // Clears the search, not the whole form.
                evt.stopPropagation();
                setText('');
              }
            }}
            style={{
              flex: 1,
              minWidth: 120,
              height: edit ? 24 : 30,
              padding: edit ? 0 : '0 4px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              // 16px on the phone, so focusing the field never zooms the page.
              fontSize: phone ? 16 : edit ? 12.5 : 13,
              fontFamily: 'inherit',
            }}
          />
          {edit && !phone && (
            <span id={keysId} className="sr-only">
              {EDIT_COPY.lineupKeys}
            </span>
          )}
        </div>
        {options.length > 0 && (
          <div
            id={listId}
            role="listbox"
            aria-label={COPY.suggestions}
            // The shared popover's padding, shadow and 4px row gap.
            style={{ ...POPOVER, right: 0 }}
          >
            {options.map((option, index) => (
              <div
                key={option.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // Before the input's blur, so the pick lands.
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => add(option.act)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: phone ? 46 : 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  color:
                    option.key === 'typed' ? 'var(--fg-muted)' : 'var(--fg)',
                  background:
                    index === active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        id={hintId}
        style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 5 }}
      >
        {edit ? EDIT_COPY.lineupHint : phone ? COPY.hintPhone : COPY.hint}
      </div>
    </div>
  );
};
