'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface RowMenuItem {
  key: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  danger?: boolean;
  /** A reversible but loud item, drawn in warning (the venue's Hide from site…). */
  warning?: boolean;
  /** A quieter item, drawn in the muted colour (Artists' Not an artist…). */
  muted?: boolean;
  /**
   * Shown but not yet usable. It stays in the arrow-key order and keeps the
   * menu open when pressed, rather than closing it on a dead click.
   */
  disabled?: boolean;
  /** Draws the divider above it, as before Revoke…. */
  divided?: boolean;
  onSelect: () => void;
}

const itemTone = (item: RowMenuItem): string =>
  item.danger
    ? 'var(--danger)'
    : item.warning
      ? 'var(--warning)'
      : item.muted
        ? 'var(--fg-muted)'
        : 'var(--signal)';

/** The label's ink: a coloured item says its colour, the rest read as text. */
const labelTone = (item: RowMenuItem): string =>
  item.danger || item.warning
    ? itemTone(item)
    : item.muted
      ? 'var(--fg-muted)'
      : 'var(--fg)';

/**
 * A row's ⋯ menu (`07/code-row-menu`, `11/artist-row-menu`): the drawn icon
 * tile and a hint under each item, on `EventRowMenu`'s open and close
 * handling. Invite codes, the person page and Artists share it.
 */
export const RowMenu = ({
  label,
  items,
  width = 320,
  triggerStyle,
}: {
  label: string;
  items: readonly RowMenuItem[];
  /** The menu's width; the person and artist menus are 300. */
  width?: number;
  /** The person page draws its ⋯ as a 36px outlined button. */
  triggerStyle?: CSSProperties;
}) => {
  // Where the menu opens, measured from the trigger. Fixed rather than
  // absolute, because a table scrolls inside its card and would clip it.
  const [open, setOpen] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOpen = open !== null;

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  // Opening moves focus into the menu, on its first item.
  useEffect(() => {
    // preventScroll: focusing must not scroll the table under a fixed menu.
    if (isOpen)
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]')
        ?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(null);
    const onPointerOutside = (evt: MouseEvent) => {
      if (
        evt.target instanceof Node &&
        !containerRef.current?.contains(evt.target)
      )
        close();
    };
    const onEscape = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      // Close, and hand focus back to the ⋯ that opened it.
      close();
      triggerRef.current?.focus();
    };
    // A fixed menu would drift from its row, so it closes once a scroll
    // actually moves the ⋯ (a scroll elsewhere leaves it be).
    const anchor = triggerRef.current?.getBoundingClientRect();
    const onScroll = () => {
      const now = triggerRef.current?.getBoundingClientRect();
      if (
        !anchor ||
        !now ||
        Math.abs(now.top - anchor.top) > 1 ||
        Math.abs(now.left - anchor.left) > 1
      )
        close();
    };
    window.addEventListener('mousedown', onPointerOutside);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onPointerOutside);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(evt) => {
          evt.stopPropagation();
          const rect = evt.currentTarget.getBoundingClientRect();
          // The menu's height from its drawn rows (9+28+9px each, plus the
          // divider and padding), so it opens upward near the bottom.
          const height = items.length * 50 + 26;
          const below = rect.bottom + 4;
          const top =
            below + height > window.innerHeight
              ? Math.max(8, rect.top - 4 - height)
              : below;
          // clientWidth leaves out the scrollbar, as `right` does.
          const right = document.documentElement.clientWidth - rect.right;
          setOpen((prev) => (prev ? null : { top, right }));
        }}
        style={{
          border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer',
          // 16px icon + 2px each side = the drawn 20px column, so the
          // trigger never widens the table past its card.
          padding: 2,
          borderRadius: 7,
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          display: 'inline-flex',
          ...triggerStyle,
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={(evt) => {
            const all = menuItems();
            const at = all.findIndex((el) => el === document.activeElement);
            const step: Record<string, number> = {
              ArrowDown: 1,
              ArrowUp: -1,
            };
            if (evt.key in step) {
              evt.preventDefault();
              const next =
                (at + (step[evt.key] ?? 0) + all.length) % all.length;
              all[next]?.focus({ preventScroll: true });
            } else if (evt.key === 'Home' || evt.key === 'End') {
              evt.preventDefault();
              all[evt.key === 'Home' ? 0 : all.length - 1]?.focus({
                preventScroll: true,
              });
            } else if (evt.key === 'Tab') {
              // Leaving the menu closes it rather than stranding it open.
              setOpen(null);
            }
          }}
          style={{
            position: 'fixed',
            top: open.top,
            right: open.right,
            zIndex: 50,
            width,
            padding: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {item.divided && (
                  <div
                    role="separator"
                    style={{
                      height: 1,
                      background: 'var(--border)',
                      margin: '6px 8px',
                    }}
                  />
                )}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  // aria-disabled, not disabled: a disabled button can't
                  // hold focus, so a click on it would drop focus out of
                  // the menu.
                  aria-disabled={item.disabled || undefined}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (item.disabled) return;
                    // Focus goes back to ⋯ first, so a dialog the item opens
                    // restores focus there rather than to the page.
                    triggerRef.current?.focus({ preventScroll: true });
                    setOpen(null);
                    item.onSelect();
                  }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'transparent',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    opacity: item.disabled ? 0.55 : 1,
                    textAlign: 'left',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      flex: 'none',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: itemTone(item),
                    }}
                  >
                    <Icon size={14} strokeWidth={1.7} />
                  </span>
                  <span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: labelTone(item),
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                      }}
                    >
                      {item.hint}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
