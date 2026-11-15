'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { POPOVER } from '../edit/pickers';
import type { ArtistSuggestion } from './add-show-api';
import { addAct, moveAct, removeAct, type Act } from './add-show-rules';

const COPY = ADMIN_COPY.addShow.lineupField;
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

/**
 * Add a show's Lineup (`11/add-a-show-lineup-d`): 30px chips in bill order,
 * the first the headliner, then "Add an artist". Typing suggests artists
 * from Artists (a pick links it); Enter adds the name as typed. Drag reorders
 * on desktop (Alt+arrow from the keyboard); the phone moves an act up with
 * an arrow.
 */
export const LineupField = ({
  id,
  lineup,
  onChange,
  search,
  phone,
  invalid,
  describedBy,
}: {
  id: string;
  lineup: Act[];
  onChange: (next: Act[]) => void;
  search: (text: string, signal: AbortSignal) => Promise<ArtistSuggestion[]>;
  phone: boolean;
  invalid: boolean;
  describedBy?: string | undefined;
}) => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [dragging, setDragging] = useState<number | null>(null);
  const listId = useId();
  const hintId = useId();
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const typed = text.trim();
    setActive(-1);
    if (typed === '') {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchRef.current(typed, controller.signal).then(
        (found) => setSuggestions(found),
        // A failed search only means no suggestions: Enter still adds the name.
        () => setSuggestions([]),
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
      act: { name: artist.name, artistId: artist.id },
    })),
    ...(typed === ''
      ? []
      : [{ key: 'typed', label: COPY.addTyped(typed), act: { name: typed } }]),
  ];

  const add = (act: Act) => {
    onChange(addAct(lineup, act));
    setText('');
  };
  const move = (from: number, to: number) =>
    onChange(moveAct(lineup, from, to));

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
            padding: '6px 8px',
            borderRadius: 10,
            background: 'var(--bg)',
            border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
            boxSizing: 'border-box',
          }}
        >
          {lineup.map((act, index) => {
            const role = index === 0 ? COPY.headliner : COPY.support;
            return (
              <span
                key={act.name}
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
            id={id}
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
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
              height: 30,
              padding: '0 4px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: phone ? 16 : 13,
              fontFamily: 'inherit',
            }}
          />
        </div>
        {options.length > 0 && (
          <div
            id={listId}
            role="listbox"
            aria-label={COPY.suggestions}
            style={{
              ...POPOVER,
              right: 0,
              padding: 8,
              boxShadow: '0 18px 40px rgba(0,0,0,.45)',
            }}
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
        {phone ? COPY.hintPhone : COPY.hint}
      </div>
    </div>
  );
};
