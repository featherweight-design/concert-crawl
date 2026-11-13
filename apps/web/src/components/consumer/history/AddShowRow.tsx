'use client';

// The rail entry that opens the Add sheet (edit-concerts "Add row", addendum 3
// `one-stamp-m`): a dashed plus-stamp tile, the title, a line naming how far back
// the records go, and a chevron. Styled like SaveCalendarRow.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { recordsStartLabel } from '@concert-crawl/types';
import { AddShowSheet } from './AddShowSheet';
import { HISTORY_COPY } from './definitions/copy';

const COPY = HISTORY_COPY.addRow;

export const AddShowRow = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="add-show-row"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-left"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--fg)',
        }}
      >
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-dashed"
          style={{
            borderColor: 'var(--border-strong)',
            color: 'var(--fg-subtle)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 3.5v11M3.5 9h11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold">{COPY.title}</span>
          <span
            className="mt-0.5 block text-[12.5px]"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg-subtle)',
            }}
          >
            {COPY.sub(recordsStartLabel())}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <path
            d="M6 3.5L10.5 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {/* Portaled to the body: the rail is sticky from lg, which makes it its
          own stacking context, and the page's rows would paint over a sheet
          mounted inside it. `open` only turns true on a click, so `document`
          exists by then. */}
      {open &&
        createPortal(
          <AddShowSheet open onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
};
