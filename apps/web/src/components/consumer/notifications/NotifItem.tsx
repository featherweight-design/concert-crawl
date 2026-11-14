// One notification row (#737 R2 layout). Ported from notifications-panel.jsx.
//
// THE WHOLE ROW IS THE TARGET. There are no nested interactives — a button
// inside a `role="button"` is an ARIA violation and, at 320px, an unhittable
// one. Activation is click, Enter, or Space; Space calls preventDefault so the
// page does not scroll out from under the panel.
//
// R2 LAYOUT: the timestamp sits on the METADATA row, not the title's baseline,
// so real 35–80 character titles get the full column. Title clamps to 2 lines,
// body to 2. 64px is a floor, not a target — rows run ~92–116px.
//
// UNREAD IS SIGNALLED FOUR WAYS, never by colour alone (WCAG 1.4.1): a 2px
// left rail in the category ink, a 4% ink wash, a 700-weight title,
// and a trailing dot. Any one of them can be missed; all four cannot.

import { useId } from 'react';
import type { ConsumerNotification } from '@/lib/notifications';
import { categoryFor } from './definitions/categories';
import { NMono } from './NMono';
import { NotifTile } from './NotifTile';
import { itemLabel, isUnread, relTime } from './lib/format-time';
import { activateOnKey } from './lib/activate-keys';
import { CREW_CATEGORY_PREFIX } from './lib/crew-meta';

/** Matches the row's 30px category tile (B+), so the row's rhythm holds. */

export const NotifItem = ({
  item,
  onOpen,
  compact = false,
  now,
}: {
  item: ConsumerNotification;
  onOpen?: ((item: ConsumerNotification) => void) | undefined;
  compact?: boolean | undefined;
  /** Injectable clock — tests freeze it; production leaves it undefined. */
  now?: Date | undefined;
}) => {
  const cat = categoryFor(item.category);
  const unread = isUnread(item);
  // A crew row's title names another reader ("x is going to …"). Analytics
  // autocapture records the clicked element's text and every ancestor's
  // attributes, so a crew row reads its accessible name from a hidden span
  // autocapture skips (`ph-no-capture`) rather than from an aria-label on the
  // row, and its title and body are skipped too: a tap on them sends nothing,
  // a tap elsewhere on the row still records the open, with its category.
  // Other categories name nobody and keep their aria-label and text.
  const labelId = useId();
  const namesSomeone = item.category.startsWith(CREW_CATEGORY_PREFIX);
  const noCapture = namesSomeone ? 'ph-no-capture' : undefined;

  const open = (): void => {
    onOpen?.(item);
  };

  // This row is the feature's ONE faux button, because its interactivity is
  // conditional (see below) and a `<button>` that is sometimes inert is worse
  // than a div that is sometimes a button. Every unconditional row — the menu
  // row, the back row, "See all" — is a native `<button>`. See
  // lib/activate-keys.ts for why Space is preventDefault'd on repeat.
  const onKeyDown = activateOnKey(open);

  // `onOpen` is optional, so the button semantics have to be too: a row that
  // announces itself as a button, takes focus and then does nothing is worse
  // for a keyboard or screen-reader user than a plain one, whose text still
  // reads normally. Same rule as every button in this panel — nothing that
  // looks actionable is left unwired.
  const interactive =
    onOpen === undefined
      ? {}
      : {
          role: 'button',
          tabIndex: 0,
          ...(namesSomeone
            ? { 'aria-labelledby': labelId }
            : { 'aria-label': itemLabel(item, now) }),
          onClick: open,
          onKeyDown,
        };

  return (
    <div
      // Every `.notif-row` rule is an interaction affordance — hover fill,
      // focus ring, chevron reveal — so an unwired row drops the class along
      // with the button semantics. Otherwise it still lights up under the
      // cursor and looks actionable.
      className={onOpen === undefined ? undefined : 'notif-row'}
      {...interactive}
      data-action-url={item.actionUrl ?? undefined}
      data-ph-capture-attribute-notification-category={item.category}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: compact ? '11px 14px' : '14px 16px',
        minHeight: 64,
        cursor: onOpen === undefined ? 'default' : 'pointer',
        // B19a (`notif-shows-m`): an unread row is a flat 4% wash of its
        // category ink across the whole row, with a 2px inset rail on the
        // left (an inset shadow, so it takes no layout width).
        background: unread
          ? `color-mix(in srgb, ${cat.ink} 4%, transparent)`
          : 'transparent',
        boxShadow: unread ? `inset 2px 0 0 ${cat.ink}` : 'none',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {onOpen !== undefined && namesSomeone && (
        <span id={labelId} hidden className="ph-no-capture">
          {itemLabel(item, now)}
        </span>
      )}
      <NotifTile category={item.category} size={30} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span
          className={noCapture}
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 14.5,
            lineHeight: 1.34,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            textWrap: 'pretty',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </span>
        {item.body !== '' && (
          <span
            className={noCapture}
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 13.5,
              lineHeight: 1.42,
              color: 'var(--fg-muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textWrap: 'pretty',
            }}
          >
            {item.body}
          </span>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 1,
          }}
        >
          <NMono>{cat.label}</NMono>
          {unread && (
            <span
              aria-hidden="true"
              data-testid="notif-unread-dot"
              style={{
                width: 5,
                height: 5,
                borderRadius: 5,
                background: cat.ink,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ flex: 1 }} />
          <NMono ls="0.1em" style={{ flexShrink: 0 }}>
            {relTime(item.createdAt, now)}
          </NMono>
          {/* Revealed on hover AND on focus-visible — see globals.css. The
              mock's CSS only had :hover, which left the affordance invisible
              to keyboard users; the handoff README asks for both. */}
          <span
            className="notif-chev"
            aria-hidden="true"
            style={{
              opacity: 0,
              transform: 'translateX(-3px)',
              transition: 'all .14s ease',
              color: 'var(--fg-muted)',
              display: 'inline-flex',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M4.5 2.5l3.5 3.5-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
};
