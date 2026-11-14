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
  'flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 text-left font-bold text-[var(--fg)] no-underline hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--bg-elevated),0_0_0_4px_var(--signal)]';

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
      // The whole panel counts as inside, not just the menu: on a phone the
      // sheet's title sits in it, and a tap there must not close the menu.
      const panel = document.getElementById(panelId);
      if (panel?.contains(target) || anchor?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, anchor, panelId]);

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

  // Focus goes back to the ⋯ before the action runs, so a sheet the action
  // opens remembers it as the place to return to, and a menu item that
  // unmounts never leaves focus on the page body.
  const pick = (action: () => void) => {
    setOpen(false);
    anchor?.focus();
    action();
  };

  const sub = (line: string) =>
    isMobile ? (
      <span
        className="mt-0.5 block text-[12.5px] font-normal"
        style={{ color: 'var(--fg-muted)' }}
      >
        {line}
      </span>
    ) : null;

  const itemSize = isMobile
    ? 'min-h-[52px] rounded-none border-t border-[var(--border)] py-1 text-[17px] first:border-t-0'
    : 'min-h-11 text-[14px]';

  const items = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={HISTORY_COPY.menu.trigger(artist)}
      onKeyDown={onMenuKeyDown}
      className="flex flex-col"
    >
      <Link
        role="menuitem"
        href={`/events/${eventId}`}
        className={`${ITEM_CLASS} ${itemSize}`}
        onClick={() => setOpen(false)}
      >
        <Tile mobile={isMobile}>
          <CalendarIcon />
        </Tile>
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
        <Tile mobile={isMobile}>
          <ShareIcon />
        </Tile>
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
        <Tile mobile={isMobile} danger={past}>
          {past ? <RemoveIcon /> : <CrossIcon />}
        </Tile>
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
        className={`relative inline-flex h-11 w-11 shrink-0 cursor-pointer lg:h-8 lg:w-8 lg:before:absolute lg:before:-inset-1.5 lg:before:content-[''] items-center justify-center rounded-lg border text-[var(--fg-muted)] transition-opacity duration-[var(--motion-fast)] ease-[var(--motion-ease)] focus-visible:opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100 ${open ? 'border-[var(--border-strong)] bg-[var(--border)] lg:opacity-100' : 'border-transparent bg-transparent'}`}
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
            width={250}
            padding={6}
            radius={14}
            arrow={false}
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
        fontSize: 18,
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
        fontSize: 10.5,
        letterSpacing: '0.04em',
        color: 'var(--fg-muted)',
      }}
    >
      {`${venue} · ${dateLabel}`}
    </span>
  </div>
);

/** The phone sheet seats each icon in a 34px tile at radius 9 (`past-menu-m`,
 * `upcoming-menu-m`); the desktop popover draws the bare icon. */
const Tile = ({
  mobile,
  danger = false,
  children,
}: {
  mobile: boolean;
  danger?: boolean;
  children: ReactNode;
}) =>
  mobile ? (
    <span
      aria-hidden="true"
      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--surface-2)] [&>svg]:h-4 [&>svg]:w-4 ${danger ? 'text-[var(--danger)]' : 'text-[var(--fg-muted)]'}`}
    >
      {children}
    </span>
  ) : (
    <>{children}</>
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
