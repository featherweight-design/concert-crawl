'use client';

// The ⋯ on a Concerts row (edit-concerts handoff and addendum 3: concerts_m,
// concerts_menu_d, past-menu-m, upcoming-menu-m, upcoming-menu-d).
//
// Below `sm` it opens a bottom sheet with the night's name and the three
// actions, each with a short line under it on an upcoming row. From `sm` it
// opens a popover with the same three actions and no sublines.
//
// Not built on `useOverlayTrigger`: that hook opens its panel on hover and on
// focus, which is right for an explainer and wrong for a menu with a destructive
// item. This one opens on click or Enter only.

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CCOverlay, CCOverlayHost } from '@/components/ui/cc-overlay';
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport';
import { HISTORY_COPY } from './definitions/copy';

interface RowMenuProps {
  tense: 'past' | 'upcoming';
  artist: string;
  venue: string;
  dateLabel: string;
  eventId: string;
  /** "Didn't make it? Remove" on a past row, "Not going anymore" on an upcoming one. */
  onRemove: () => void;
  onShare: () => void;
}

const ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 text-left font-semibold text-[var(--fg)] no-underline hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]';

export const RowMenu = ({
  tense,
  artist,
  venue,
  dateLabel,
  eventId,
  onRemove,
  onShare,
}: RowMenuProps) => {
  const isMobile = useIsMobileViewport();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const past = tense === 'past';

  const close = () => {
    setOpen(false);
    anchor?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // The popover paints after the layout effect measures, so wait a frame
    // before moving focus into it.
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || anchor?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, anchor]);

  const onMenuKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      ev.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const at = items.findIndex((item) => item === document.activeElement);
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      items[(at + 1) % items.length]?.focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      items[(at - 1 + items.length) % items.length]?.focus();
    } else if (ev.key === 'Tab') {
      setOpen(false);
    }
  };

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  const sub = (line: string) =>
    isMobile ? (
      <span
        className="mt-0.5 block text-[13px] font-normal"
        style={{ color: 'var(--fg-muted)' }}
      >
        {line}
      </span>
    ) : null;

  const itemSize = isMobile
    ? 'min-h-[52px] py-2 text-[17px]'
    : 'min-h-11 text-[13.5px]';

  const items = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={HISTORY_COPY.menu.trigger(artist)}
      onKeyDown={onMenuKeyDown}
      className={isMobile ? 'flex flex-col' : '-m-1.5 flex flex-col p-1'}
    >
      <Link
        role="menuitem"
        href={`/events/${eventId}`}
        className={`${ITEM_CLASS} ${itemSize}`}
      >
        <CalendarIcon />
        <span className="min-w-0">
          {HISTORY_COPY.menu.open}
          {!past && sub(HISTORY_COPY.menu.openSub)}
        </span>
      </Link>
      <button
        type="button"
        role="menuitem"
        className={`${ITEM_CLASS} ${itemSize}`}
        onClick={() => pick(onShare)}
      >
        <ShareIcon />
        <span className="min-w-0">
          {past ? HISTORY_COPY.menu.share : HISTORY_COPY.menu.shareUpcoming}
          {!past && sub(HISTORY_COPY.menu.shareSub)}
        </span>
      </button>
      {!isMobile && (
        <div
          role="separator"
          className="my-1 h-px bg-transparent"
          aria-hidden
        />
      )}
      <button
        type="button"
        role="menuitem"
        className={`${ITEM_CLASS} ${itemSize} ${past ? '!text-[var(--danger)]' : ''}`}
        onClick={() => pick(onRemove)}
      >
        {past ? <RemoveIcon /> : <CrossIcon />}
        <span className="min-w-0">
          {past ? HISTORY_COPY.menu.remove : HISTORY_COPY.menu.removeUpcoming}
          {!past && sub(HISTORY_COPY.menu.removeUpcomingSub)}
        </span>
      </button>
    </div>
  );

  return (
    <>
      {/* The hit area is 44px with an 18px glyph (addendum 3, rule 5). From
          `sm` the button rests invisible and shows on row hover, on focus
          inside the row and while its menu is open. It stays in the tab order
          and in the accessibility tree either way. */}
      <button
        ref={setAnchor}
        type="button"
        data-testid="row-menu"
        data-tense={tense}
        aria-label={HISTORY_COPY.menu.trigger(artist)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((was) => !was)}
        className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 text-[var(--fg-muted)] transition-opacity duration-[var(--motion-fast)] ease-[var(--motion-ease)] focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 ${open ? 'bg-[var(--surface-3,var(--surface-2))] sm:opacity-100' : 'bg-transparent'}`}
      >
        <DotsIcon />
      </button>
      {open &&
        (isMobile ? (
          <CCOverlayHost>
            <CCOverlay
              id={panelId}
              mode="sheet"
              title={HISTORY_COPY.menu.trigger(artist)}
              showHeader={false}
              onClose={close}
            >
              <SheetTitle artist={artist} venue={venue} dateLabel={dateLabel} />
              {items}
            </CCOverlay>
          </CCOverlayHost>
        ) : (
          <CCOverlay
            id={panelId}
            mode="popover"
            title={HISTORY_COPY.menu.trigger(artist)}
            showHeader={false}
            anchor={anchor}
            placement="bottom"
            align="end"
            width={240}
            onClose={close}
          >
            {items}
          </CCOverlay>
        ))}
    </>
  );
};

const SheetTitle = ({
  artist,
  venue,
  dateLabel,
}: {
  artist: string;
  venue: string;
  dateLabel: string;
}) => (
  <div className="flex flex-col gap-1.5 pb-3">
    <span
      className="break-words"
      style={{
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
      }}
    >
      {artist}
    </span>
    <span
      className="uppercase"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        letterSpacing: '0.06em',
        color: 'var(--fg-muted)',
      }}
    >
      {`${venue} · ${dateLabel}`}
    </span>
  </div>
);

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0"
  >
    {children}
  </svg>
);

const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
    <path d="M3 8.5h14M7 3v3M13 3v3" />
  </Icon>
);

const ShareIcon = () => (
  <Icon>
    <circle cx="15" cy="4.5" r="2" />
    <circle cx="5" cy="10" r="2" />
    <circle cx="15" cy="15.5" r="2" />
    <path d="M6.8 9l6.4-3.5M6.8 11l6.4 3.5" />
  </Icon>
);

const RemoveIcon = () => (
  <Icon>
    <circle cx="10" cy="10" r="7" strokeDasharray="2.4 2" />
    <path d="M7.6 7.6l4.8 4.8M12.4 7.6l-4.8 4.8" />
  </Icon>
);

const CrossIcon = () => (
  <Icon>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);

const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="9" cy="3.5" r="1.5" fill="currentColor" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="9" cy="14.5" r="1.5" fill="currentColor" />
  </svg>
);
