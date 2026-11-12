'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Ban,
  Copy,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface CodeMenuItem {
  key: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  danger?: boolean;
  /** Draws the divider above it, as before Revoke…. */
  divided?: boolean;
  onSelect: () => void;
}

export const MENU_ICONS = {
  copy: Copy,
  poster: Printer,
  joined: Users,
  edit: Tag,
  revoke: Ban,
  reactivate: RotateCcw,
} as const;

/**
 * The row's ⋯ menu (`07/code-row-menu`), on `EventRowMenu`'s open and close
 * handling, with the drawn icon tile and hint under each item.
 */
export const CodeRowMenu = ({
  label,
  items,
}: {
  label: string;
  items: readonly CodeMenuItem[];
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (evt: MouseEvent) => {
      if (
        evt.target instanceof Node &&
        !containerRef.current?.contains(evt.target)
      )
        setOpen(false);
    };
    const handleEscape = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(evt) => {
          evt.stopPropagation();
          setOpen((prev) => !prev);
        }}
        style={{
          border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 7,
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          display: 'inline-flex',
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            width: 320,
            padding: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const tone = item.danger ? 'var(--danger)' : 'var(--signal)';
            return (
              <div key={item.key}>
                {item.divided && (
                  <div
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
                  onClick={(evt) => {
                    evt.stopPropagation();
                    setOpen(false);
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
                    cursor: 'pointer',
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
                      color: tone,
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
                        color: item.danger ? 'var(--danger)' : 'var(--fg)',
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
