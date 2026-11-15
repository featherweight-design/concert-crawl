'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Calendar, ExternalLink, EyeOff, GitMerge, Trash2 } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminCard,
  AdminCardRow,
  RowMenu,
  SaveFailedToast,
  useIsPhone,
  useSnapBack,
} from '@/components/admin/primitives';
import { buildBreadcrumbs } from '@/components/admin/shell/breadcrumbs';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { shortDate } from '@/components/admin/venues/overview/overview-rules';
import { metaDate } from '@/components/admin/needs-you/needs-you-rules';
import { apiClient } from '@/lib/api';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { eventCanonicalPath } from '@/lib/share/event-metadata';
import { MergePanel } from '../merge/MergePanel';
import { EventDeleteConfirm } from '../EventDeleteConfirm';
import { deleteEvent } from '../event-delete';
import { PriceCard } from './PriceCard';
import { DateField, TimeField } from './pickers';
import {
  EventConfirm,
  StatusCard,
  type Sale,
  type StatusDialog,
} from './StatusCard';
import {
  evidenceBody,
  evidenceReady,
  NO_EVIDENCE,
  SoldOutConfirm,
  SoldOutForm,
  SoldOutRecordView,
  type Evidence,
} from './SoldOutEvidence';
import { StatusChips } from '../list/EventsList';
import {
  duplicateShowMessage,
  notOnSaleMessage,
  pastLockedMessage,
} from '../past-locked';
import {
  dayBefore,
  fieldDate,
  isPast,
  isPostponedPassed,
  type EventDetail,
  type LineupItem,
} from './event-detail';
import { addShowApi } from '../add/add-show-api';
import { lineupEntries, rolesOf, type Act } from '../add/add-show-rules';
import { LineupField } from '../add/LineupField';
import { usePickVenues, VenuePicker } from '../add/VenuePicker';
import { moveTellsWatchers, venueEditable, venueRefusalOf } from './venue-move';

const COPY = ADMIN_COPY.eventEdit;
const PASSED = COPY.passed;
const LIST = ADMIN_COPY.eventsList;

/** The fields this editor saves. Status, Hidden and price save on their own. */
interface Fields {
  title: string;
  /** The Show card's Tour name; `''` for none (saved as null). */
  tourName: string;
  /** Tickets available or Sold out; `null` while neither pill is chosen. */
  sale: Sale | null;
  /**
   * How the admin knows it's sold out (addendum 7 §6), sent with the mark.
   * Part of picking Sold out, so the Save bar never counts it on its own.
   */
  evidence: Evidence;
  /** YYYY-MM-DD. */
  date: string;
  /** `HH:MM`, or null for none. */
  doorsTime: string | null;
  showTime: string | null;
  /** The bill in order, each act with its saved role. */
  lineup: Act[];
  /** The venue's id; `''` for a show with none (never sent). */
  venueId: string;
}

/**
 * A Save's writes, in order: the fields' PATCH, the lineup's PUT, the venue's
 * POST, then the sale's POST.
 */
type SaveStep = 'fields' | 'lineup' | 'venue' | 'sale';

/** The GET's lineup as the field's acts, roles and matches kept. */
const actsOf = (items: readonly LineupItem[]): Act[] =>
  items.map((item) => ({
    name: item.name,
    role: item.role,
    ...(item.artistId !== null && { artistId: item.artistId }),
    ...(item.slug !== null && { slug: item.slug }),
    ...(item.unsure && { unsure: true }),
  }));

/** The bill as the PUT would write it: names, roles and links, in order. */
const billKey = (lineup: readonly Act[]): string =>
  JSON.stringify(lineupEntries(lineup));

const lineupChanged = (draft: Fields, saved: Fields): boolean =>
  billKey(draft.lineup) !== billKey(saved.lineup);

/** A stored `HH:MM:SS` as the pickers' `HH:MM`. */
const hhmm = (time: string | null): string | null =>
  time === null ? null : time.slice(0, 5);

/** The pickers' `HH:MM` as the API stores it. */
const stored = (time: string | null): string | null =>
  time === null ? null : `${time}:00`;

/** The saved sale: the pill drawn chosen when nothing is drafted. */
const saleOf = (status: EventDetail['status']): Sale | null =>
  status === 'available' || status === 'soldout' ? status : null;

/** Clearing a tour name is a change too (`05/tour-name-states`). */
const tourChanged = (draft: Fields, saved: Fields): boolean =>
  draft.tourName.trim() !== saved.tourName.trim();

/** How many fields differ from what is saved: the Save bar's count. */
const changedCount = (draft: Fields, saved: Fields): number =>
  (draft.title.trim() !== saved.title.trim() ? 1 : 0) +
  (tourChanged(draft, saved) ? 1 : 0) +
  (draft.sale !== saved.sale ? 1 : 0) +
  (draft.date !== saved.date ? 1 : 0) +
  (draft.doorsTime !== saved.doorsTime ? 1 : 0) +
  (draft.showTime !== saved.showTime ? 1 : 0) +
  (lineupChanged(draft, saved) ? 1 : 0) +
  (draft.venueId !== saved.venueId ? 1 : 0);

/** The header's 36px buttons, as on the venue header (`06/event-edit`). */
const BUTTON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 36,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
};

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) => (
  <div style={{ minWidth: 0 }}>
    <label htmlFor={htmlFor} style={LABEL}>
      {label}
    </label>
    {children}
  </div>
);

/** The 12px line under a field: the tour name's hint, the venue's reason. */
const HINT: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.4,
  color: 'var(--fg-subtle)',
  marginTop: 6,
};

/**
 * A value drawn as its field but not editable here: a crawled upcoming
 * show's venue (with why, under it) and a passed postponed show's Original
 * date.
 */
const ReadOnlyField = ({
  id,
  label,
  value,
  hint,
  height = 40,
}: {
  id: string;
  label: string;
  value: string;
  /** Why it can't change, tied to the field for screen readers. */
  hint?: string;
  /**
   * 38 for the venue, as its picker (`06/event-edit`); 40 for Original
   * date, level with the Doors and Show pickers beside it.
   */
  height?: number;
}) => (
  <Field label={label} htmlFor={id}>
    <input
      id={id}
      readOnly
      value={value}
      aria-describedby={hint === undefined ? undefined : `${id}-hint`}
      style={{ ...inputStyle(false), height, color: 'var(--fg-muted)' }}
    />
    {hint !== undefined && (
      <div id={`${id}-hint`} data-testid={`${id}-hint`} style={HINT}>
        {hint}
      </div>
    )}
  </Field>
);

/**
 * The page's banner: a played show's (`04/past-show-d`, `36/past-show-m`),
 * or the amber one on a postponed show whose date passed
 * (`36/postponed-passed-d`).
 */
const Banner = ({
  warning,
  phone,
  children,
}: {
  warning: boolean;
  phone: boolean;
  children: ReactNode;
}) => (
  <div
    role="note"
    data-testid="event-edit-banner"
    style={{
      display: 'flex',
      alignItems: phone ? 'flex-start' : 'center',
      gap: phone ? 10 : 12,
      padding: phone ? '12px 14px' : '12px 16px',
      borderRadius: 12,
      fontSize: phone ? 13 : 13.5,
      lineHeight: 1.45,
      ...(warning
        ? {
            background: 'color-mix(in srgb, var(--warning) 7%, transparent)',
            border:
              '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
          }
        : {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }),
    }}
  >
    <Calendar
      size={16}
      aria-hidden
      style={{
        flex: 'none',
        color: warning ? 'var(--warning)' : 'var(--fg-muted)',
      }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

const Header = ({
  detail,
  meta,
  phone,
  onMerge,
  onHide,
  onDelete,
}: {
  detail: EventDetail;
  /** Date · venue, or "Was …" on a postponed show whose date passed. */
  meta: string;
  phone: boolean;
  onMerge: () => void;
  /** Opens the Hide dialog; `null` once the show is hidden. */
  onHide: (() => void) | null;
  /** Opens the Delete dialog; `null` on a crawled show (4b#10). */
  onDelete: (() => void) | null;
}) => {
  const { venueUrl } = detail;
  const grow = phone ? 1 : 'none';
  return (
    <div
      data-testid="event-edit-header"
      style={{
        display: 'flex',
        flexDirection: phone ? 'column' : 'row',
        alignItems: phone ? 'stretch' : 'flex-start',
        gap: phone ? 12 : 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* `05/tour-name-m`: the phone header puts the saved tour name above
            the title, the way fans see it. Desktop draws none. */}
        {phone && detail.tourName !== null && (
          <div
            data-testid="event-edit-tour-kicker"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              marginBottom: 2,
              overflowWrap: 'anywhere',
            }}
          >
            {detail.tourName}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              fontSize: phone ? 22 : 26,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              overflowWrap: 'anywhere',
            }}
          >
            {detail.title}
          </h1>
          {/* The phone board draws the ⋯ at the top right, beside the title. */}
          {phone && (
            <EventEditMenu
              detail={detail}
              onMerge={onMerge}
              onHide={onHide}
              onDelete={onDelete}
            />
          )}
        </div>
        {/* `19/event-edit-hidden-header`: desktop draws chip, tag and meta on
            one line; the phone puts the meta (12.5px) under the title and the
            chips on their own wrapping row below it, in that reading order. */}
        {phone ? (
          <>
            <div
              data-testid="event-edit-meta"
              style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 4 }}
            >
              {meta}
            </div>
            <div style={{ marginTop: 10 }}>
              <StatusChips row={detail} />
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            <StatusChips row={detail} />
            <span
              data-testid="event-edit-meta"
              style={{ fontSize: 13, color: 'var(--fg-muted)' }}
            >
              {meta}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <a
          href={eventCanonicalPath(detail.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...BUTTON, flex: grow }}
        >
          <ExternalLink size={14} aria-hidden />
          {COPY.onConcertCrawl}
        </a>
        {venueUrl !== null && (
          <a
            href={venueUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...BUTTON, flex: grow }}
          >
            <ExternalLink size={14} aria-hidden />
            {phone ? COPY.onVenueSitePhone : COPY.onVenueSite}
          </a>
        )}
        {!phone && (
          <EventEditMenu
            detail={detail}
            onMerge={onMerge}
            onHide={onHide}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
};

/**
 * The edit page's ⋯ (`06/event-menu`, less Edit, which is this page). Merge
 * opens the merge panel (admin 4b E4).
 * Delete… shows on a manual show only; on the phone, whose list has no ⋯,
 * this is its one way in.
 */
const EventEditMenu = ({
  detail,
  onMerge,
  onHide,
  onDelete,
}: {
  detail: EventDetail;
  onMerge: () => void;
  onHide: (() => void) | null;
  onDelete: (() => void) | null;
}) => (
  <RowMenu
    label={LIST.menu.label(detail.title)}
    testId="event-edit-menu"
    triggerStyle={{ ...BUTTON, width: 36, padding: 0 }}
    items={[
      {
        key: 'view-fan',
        icon: ExternalLink,
        label: LIST.menu.viewFan,
        hint: LIST.menu.viewFanHint,
        onSelect: () => {
          window.open(eventCanonicalPath(detail.id), '_blank', 'noopener');
        },
      },
      ...(detail.venueUrl === null
        ? []
        : [
            {
              key: 'view-venue',
              icon: ExternalLink,
              label: LIST.menu.viewVenue,
              hint: LIST.menu.viewVenueHint,
              onSelect: () => {
                window.open(detail.venueUrl ?? '', '_blank', 'noopener');
              },
            },
          ]),
      {
        key: 'merge',
        icon: GitMerge,
        label: COPY.menu.merge,
        hint: COPY.menu.mergeHint,
        onSelect: onMerge,
      },
      ...(onHide === null
        ? []
        : [
            {
              key: 'hide',
              icon: EyeOff,
              label: COPY.hide.menu,
              hint: COPY.hide.menuHint,
              warning: true,
              onSelect: onHide,
            },
          ]),
      ...(onDelete === null
        ? []
        : [
            {
              key: 'delete',
              icon: Trash2,
              label: ADMIN_COPY.eventDelete.menu,
              hint: ADMIN_COPY.eventDelete.menuHint,
              danger: true,
              onSelect: onDelete,
            },
          ]),
    ]}
  />
);

const SaveBar = ({
  count,
  valid,
  saving,
  phone,
  inline,
  onDiscard,
  onSave,
}: {
  count: number;
  valid: boolean;
  saving: boolean;
  phone: boolean;
  /**
   * `36/past-show-m`: a past show's phone bar is one row (count, Discard,
   * Save), as on desktop, since it only shows once something changes.
   */
  inline: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) => {
  // The stacked full-width Save is `06/event-edit-mobile`'s.
  const stacked = phone && !inline;
  return (
    <div
      data-testid="event-edit-save-bar"
      // Pinned to the bottom of the content area at its full width, as drawn:
      // `marginTop: auto` drops it to the bottom of a short page, `sticky`
      // holds it there on a long one, and the negative margins cancel the
      // shell's padding (desktop 24px 28px; phone 0 16px) so it meets both
      // edges.
      style={{
        position: 'sticky',
        bottom: 0,
        marginTop: 'auto',
        marginInline: phone ? -16 : -28,
        marginBottom: phone ? 0 : -24,
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'stretch' : 'center',
        gap: phone ? 8 : 12,
        minHeight: 64,
        padding: phone ? '10px 16px' : '0 28px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        zIndex: 1,
      }}
    >
      {!stacked && (
        <span
          role="status"
          style={{
            flex: 1,
            fontSize: phone ? 12.5 : 13,
            color: 'var(--warning)',
          }}
        >
          {count > 0 ? COPY.saveBar.unsaved(count) : ''}
        </span>
      )}
      {!stacked && count > 0 && (
        <AdminButton variant="ghost" onClick={onDiscard} disabled={saving}>
          {COPY.saveBar.discard}
        </AdminButton>
      )}
      <AdminButton
        variant="gradient"
        data-testid="event-edit-save"
        onClick={onSave}
        disabled={count === 0 || !valid || saving}
        fullWidth={stacked}
        style={{
          height: stacked ? 46 : phone ? 42 : 40,
          padding: '0 22px',
          fontSize: 14,
        }}
      >
        {saving ? COPY.saveBar.saving : COPY.saveBar.save}
      </AdminButton>
    </div>
  );
};

/**
 * Event edit (`06/event-edit`, phone `06/event-edit-mobile`). Every desktop
 * field, stacked on the phone (4b#4). The lineup saves through its own PUT
 * and the venue through its own POST (E2-D); a crawled show still to come
 * reads its venue only.
 *
 * A played past show (B+ addendum 6 item 36, `04/past-show-d`,
 * `36/past-show-m`) takes corrections that notify nobody: title, times and a
 * date still in the past, and the lineup, under a banner; status and price
 * read only. A
 * postponed show whose date passed (`36/postponed-passed-d`) keeps this
 * editor, headed "Was …", with its New date under the status pills.
 */
export const EventEdit = ({
  detail,
  today,
}: {
  detail: EventDetail;
  /** `YYYY-MM-DD` in Mountain Time, from the server render. */
  today: string;
}) => {
  const phone = useIsPhone();
  const router = useRouter();
  const { getToken } = useAuth();
  const { setPageTitle, setPhoneBack } = usePageTitle();
  // A postponed show whose date passed is never played: it keeps the
  // upcoming editor so it can get its new date.
  const passed = isPostponedPassed(detail, today);
  const past = isPast(detail, today) && !passed;
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** The PATCH's 409 refusal, said as such: a retry would be refused again. */
  const [refusal, setRefusal] = useState<string | null>(null);
  /** `duplicate_show`'s other listing on a refused move: the toast's Open it. */
  const [refusalLink, setRefusalLink] = useState<string | null>(null);
  /** The write a failed save stopped at: the fields' PATCH or the sale's POST. */
  const [failedStep, setFailedStep] = useState<SaveStep | null>(null);
  // Played shows and shows added by hand; a crawled one still to come is its
  // venue's calendar's, so it reads only.
  const canMoveVenue = venueEditable(detail, today);

  useEffect(() => {
    setPageTitle(detail.artist);
    return () => setPageTitle(null);
  }, [detail.artist, setPageTitle]);
  // The phone's "‹ Events" goes where the desktop breadcrumb's section does,
  // which follows the Review tab the editor was opened from (#1083).
  const [section] = buildBreadcrumbs(usePathname(), useSearchParams());
  const backLabel = section?.label ?? LIST.title;
  const backHref = section?.href ?? '/admin/events';
  useEffect(() => {
    setPhoneBack({ label: backLabel, href: backHref });
    return () => setPhoneBack(null);
  }, [backLabel, backHref, setPhoneBack]);

  const tokenOrThrow = async (): Promise<string> => {
    const token = await getToken();
    if (!token) throw new Error('signed out');
    return token;
  };
  const path = `/v1/admin/events/${detail.id}`;

  // Memoised: `useSnapBack` treats a new object as a fresh server value.
  // Keyed on the saved title and sale alone, so a refresh after another save
  // (Hidden, a merge) never throws away a title being typed.
  const savedTitle = detail.title;
  const savedTour = detail.tourName ?? '';
  const savedSale = saleOf(detail.status);
  const savedDate = detail.date;
  const savedDoors = hhmm(detail.doorsTime);
  const savedShow = hhmm(detail.showTime);
  const savedVenueId = detail.venueId ?? '';
  // Keyed on the acts' text: every refresh sends a new array, the same bill.
  const savedLineupKey = JSON.stringify(detail.lineup);
  const savedLineup = useMemo(
    () => actsOf(detail.lineup),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on content, not the array's identity
    [savedLineupKey],
  );
  const saved = useMemo(
    () => ({
      title: savedTitle,
      tourName: savedTour,
      sale: savedSale,
      evidence: NO_EVIDENCE,
      date: savedDate,
      doorsTime: savedDoors,
      showTime: savedShow,
      lineup: savedLineup,
      venueId: savedVenueId,
    }),
    [
      savedTitle,
      savedTour,
      savedSale,
      savedDate,
      savedDoors,
      savedShow,
      savedLineup,
      savedVenueId,
    ],
  );
  const showApi = useMemo(() => addShowApi(getToken), [getToken]);
  const searchArtists = showApi.artists;
  // Add a show's venue list, loaded once; a show that can't move needs none.
  const { venues, reload: reloadVenues } = usePickVenues(
    canMoveVenue ? showApi.venues : () => Promise.resolve([]),
    'admin event edit',
  );
  const venueName = (venueId: string): string =>
    (Array.isArray(venues)
      ? venues.find((venue) => venue.id === venueId)?.name
      : undefined) ??
    detail.venueName ??
    COPY.none;
  /**
   * While the date is still past, no sale write goes out: a played show has
   * no status to set, and a passed postponed one stays Postponed until its
   * new date (`36/postponed-passed-d`). No `status: 'upcoming'`, no sold-out
   * or available call.
   */
  const saleChangedIn = (next: Fields): boolean =>
    next.sale !== null &&
    next.sale !== savedSale &&
    !past &&
    !(passed && next.date < today);
  /** The Save marks it sold out: a new mark, which asks for its evidence. */
  const marksSoldOut = (next: Fields): boolean =>
    saleChangedIn(next) && next.sale === 'soldout' && !detail.isSoldOut;
  const snap = useSnapBack<Fields>(saved, async (next) => {
    const token = await tokenOrThrow();
    const saleChanged = saleChangedIn(next);
    const tourName = next.tourName.trim();
    const body: {
      title?: string;
      tourName?: string | null;
      status?: 'upcoming';
      date?: string;
      doorsTime?: string | null;
      showTime?: string | null;
    } = {
      ...(next.title !== savedTitle && { title: next.title }),
      // Empty saves null, never '' (`05/tour-name-states`).
      ...(tourName !== savedTour.trim() && {
        tourName: tourName === '' ? null : tourName,
      }),
      // A date change on a show that is on sends Watchers `watch.postponed`
      // server side; a correction is the admin's call.
      ...(next.date !== savedDate && { date: next.date }),
      ...(next.doorsTime !== savedDoors && {
        doorsTime: stored(next.doorsTime),
      }),
      ...(next.showTime !== savedShow && { showTime: stored(next.showTime) }),
      // The pills pick one status: leaving Postponed, Cancelled or No longer
      // listed for either sale pill puts the show back on (a status write also
      // ends a delisting, server side).
      ...(saleChanged &&
        (detail.status === 'postponed' ||
          detail.status === 'cancelled' ||
          detail.status === 'delisted') && { status: 'upcoming' }),
    };
    let landed = false;
    // Which write was running, so a failure names the step that failed.
    let step: SaveStep = 'fields';
    setRefusal(null);
    setRefusalLink(null);
    setFailedStep(null);
    try {
      if (Object.keys(body).length > 0) {
        await apiClient.patch(path, token, body);
        landed = true;
      }
      step = 'lineup';
      // The whole bill, roles kept: the PUT rewrites it, so every name the
      // page shows goes back. Only when it changed, so a title save never
      // locks a crawled bill (`lineup_edited_at`).
      if (billKey(next.lineup) !== billKey(savedLineup)) {
        await apiClient.put(`${path}/lineup`, token, {
          lineup: lineupEntries(next.lineup),
        });
        landed = true;
      }
      step = 'venue';
      // Its own route (E2-C): a show still to come moves, and its Watchers
      // hear the new room; a played one is a silent correction. After the
      // PATCH, so a date change is in place first; before the sale, so a
      // Sold out notice names the new room. The refresh brings the Moved
      // line back from the GET.
      if (next.venueId !== savedVenueId && next.venueId !== '') {
        await apiClient.post(`${path}/venue`, token, {
          venueId: next.venueId,
        });
        landed = true;
      }
      step = 'sale';
      // Sold out is its own flag with its own Watcher notice (`watch.soldout`),
      // recorded with how the admin knows (addendum 7 §6).
      if (marksSoldOut(next)) {
        await apiClient.post(
          `${path}/sold-out`,
          token,
          evidenceBody(next.evidence),
        );
        landed = true;
      }
      if (saleChanged && next.sale === 'available' && detail.isSoldOut) {
        await apiClient.post(`${path}/available`, token, {});
        landed = true;
      }
    } catch (err) {
      console.error('[event edit] save failed', err);
      setFailedStep(step);
      if (step === 'venue') {
        // The move's own refusals: another listing that night at the new
        // venue (with a link to it), a crawled show, a venue taken down.
        const venueRefusal = venueRefusalOf(err);
        setRefusal(venueRefusal?.message ?? null);
        setRefusalLink(venueRefusal?.existingId ?? null);
        throw err;
      }
      // `past_locked` (a field a past show locks) or `duplicate_show` (another
      // listing that night), or the sold-out POST's `not_on_sale`: the
      // snap-back's toast says which.
      setRefusal(
        pastLockedMessage(err) ??
          duplicateShowMessage(err) ??
          notOnSaleMessage(err),
      );
      throw err;
    } finally {
      // A write that landed before a later one failed still shows: the page
      // re-reads what is saved, so the snap-back names the truth.
      if (landed) router.refresh();
    }
  });
  const [dialog, setDialog] = useState<StatusDialog | null>(null);
  /** Postponed and Hide save at once, outside the Save bar (they confirm). */
  const saveNow = async (body: object) => {
    await apiClient.patch(path, await tokenOrThrow(), body);
    router.refresh();
  };
  const [draft, setDraft] = useState<Fields>(snap.value);
  // What is saved (after a save, a refresh, or a snap-back) resets the form.
  // Per field, so a status save (Postponed moves the saved sale) never throws
  // away a title being typed.
  const lastSaved = useRef(snap.value);
  useEffect(() => {
    const was = lastSaved.current;
    const now = snap.value;
    lastSaved.current = now;
    setDraft((prev) => ({
      title: was.title !== now.title ? now.title : prev.title,
      tourName: was.tourName !== now.tourName ? now.tourName : prev.tourName,
      sale: was.sale !== now.sale ? now.sale : prev.sale,
      evidence: was.evidence !== now.evidence ? now.evidence : prev.evidence,
      date: was.date !== now.date ? now.date : prev.date,
      doorsTime:
        was.doorsTime !== now.doorsTime ? now.doorsTime : prev.doorsTime,
      showTime: was.showTime !== now.showTime ? now.showTime : prev.showTime,
      // By content, links included, so a save's refresh brings each new
      // act's slug and match while an unrelated refresh keeps the draft.
      lineup:
        JSON.stringify(was.lineup) !== JSON.stringify(now.lineup)
          ? now.lineup
          : prev.lineup,
      venueId: was.venueId !== now.venueId ? now.venueId : prev.venueId,
    }));
  }, [snap.value]);
  // A save that fails fast can batch its pending and failed states into one
  // render, so the values above never change: snap back on the failure.
  // A failed mark keeps how the admin knew, so Try again, or picking Sold out
  // again, still has their method, link and note.
  useEffect(() => {
    if (snap.failed === null) return;
    // The fields' PATCH landed before the lineup's PUT failed: they keep what
    // saved, and only the lineup (and the sale, never sent) snaps back.
    if (failedStep === 'lineup') {
      setDraft({
        ...snap.failed.attempted,
        lineup: snap.failed.saved.lineup,
        venueId: snap.failed.saved.venueId,
        sale: snap.failed.saved.sale,
      });
      return;
    }
    // The fields and the lineup landed before the move failed: only the
    // venue (and the sale, never sent) snaps back.
    if (failedStep === 'venue') {
      setDraft({
        ...snap.failed.attempted,
        venueId: snap.failed.saved.venueId,
        sale: snap.failed.saved.sale,
      });
      return;
    }
    setDraft({
      ...snap.failed.saved,
      evidence: snap.failed.attempted.evidence,
    });
  }, [snap.failed, failedStep]);
  /** The fields a Save's PATCH carried, named for the toast. */
  const savedFieldNames = (attempted: Fields, was: Fields): string[] => {
    const names = COPY.saveFailed.fieldNames;
    const changed: [boolean, string][] = [
      [attempted.title !== was.title, names.title],
      [tourChanged(attempted, was), names.tourName],
      [attempted.date !== was.date, names.date],
      [attempted.doorsTime !== was.doorsTime, names.doorsTime],
      [attempted.showTime !== was.showTime, names.showTime],
    ];
    return changed.flatMap(([did, name]) => (did ? [name] : []));
  };
  // What landed before the lineup's PUT or the venue's POST failed: the
  // fields, and before a move, the lineup too.
  const partlySaved =
    snap.failed !== null && (failedStep === 'lineup' || failedStep === 'venue')
      ? [
          ...savedFieldNames(snap.failed.attempted, snap.failed.saved),
          ...(failedStep === 'venue' &&
          lineupChanged(snap.failed.attempted, snap.failed.saved)
            ? [COPY.saveFailed.fieldNames.lineup]
            : []),
        ]
      : [];
  const partlySavedLine =
    partlySaved.length === 0
      ? ''
      : `${COPY.saveFailed.savedFields(
          new Intl.ListFormat('en', { type: 'conjunction' }).format(
            partlySaved,
          ),
        )} `;
  /** The venue as saved, for a failed move's toast. */
  const savedVenueLine = COPY.saveFailed.savedVenue(venueName(savedVenueId));
  const count = changedCount(draft, snap.value);
  // A new Sold out asks how the admin knows (`06/sold-out-mark-d`) and
  // confirms before it tells the Watching (`06/sold-out-confirm-d`).
  const marking = marksSoldOut(draft);
  const [confirmingSoldOut, setConfirmingSoldOut] = useState(false);
  // A move that tells the Watching confirms first, as Postponed and Hide do.
  // A played show's correction, or one nobody Watches, saves at once.
  const movingTold =
    draft.venueId !== snap.value.venueId && moveTellsWatchers(detail, today);
  const [confirmingMove, setConfirmingMove] = useState(false);
  // The API refuses an empty title, so Save waits for one; a new Sold out
  // waits for its method (and a link, if any, that is http(s)).
  // A changed bill needs a headliner (the API's `headliner_required`). The
  // field promotes the front act when an edit leaves none, so in practice
  // this is an emptied bill. A crawled show saved with none can still save
  // its other fields.
  const lineupInvalid =
    lineupChanged(draft, snap.value) &&
    !rolesOf(draft.lineup).includes('headliner');
  const valid =
    draft.title.trim() !== '' &&
    !lineupInvalid &&
    (!marking || evidenceReady(draft.evidence));
  const saveDraft = () => snap.save({ ...draft, title: draft.title.trim() });
  const tourDirty = tourChanged(draft, snap.value);

  /** Doors or Show: the shared time picker (a correction on a past show). */
  const timeField = (
    id: string,
    label: string,
    key: 'doorsTime' | 'showTime',
  ) => (
    <Field label={label} htmlFor={id}>
      <TimeField
        id={id}
        value={draft[key]}
        onChange={(time) => setDraft({ ...draft, [key]: time })}
        phone={phone}
        placeholder={COPY.none}
        label={label}
      />
    </Field>
  );

  const venue = detail.venueName ?? COPY.none;
  const method = COPY.crawl.method(detail.extractionStrategy);
  const fields = (
    <AdminCard title={COPY.show.title} phone={phone} testId="event-edit-show">
      <Field label={COPY.show.titleField} htmlFor="event-edit-title">
        <input
          id="event-edit-title"
          value={draft.title}
          onChange={(evt) => setDraft({ ...draft, title: evt.target.value })}
          style={{
            ...inputStyle(false),
            height: 40,
            // 16px on the phone, so focusing the field never zooms the page.
            ...(phone && { fontSize: 16 }),
          }}
        />
      </Field>
      {/* `05/tour-name-d`, `05/tour-name-states`: right under Title, with the
          unsaved dot once it differs from what is saved. */}
      <div style={{ minWidth: 0 }}>
        <label htmlFor="event-edit-tour-name" style={LABEL}>
          {COPY.show.tourName}
          {tourDirty && (
            <span
              aria-hidden
              data-testid="event-edit-tour-name-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning)',
                marginLeft: 6,
                verticalAlign: 'middle',
              }}
            />
          )}
        </label>
        <input
          id="event-edit-tour-name"
          value={draft.tourName}
          onChange={(evt) => setDraft({ ...draft, tourName: evt.target.value })}
          placeholder={COPY.show.tourNameNone}
          // The API's limit.
          maxLength={200}
          aria-describedby="event-edit-tour-name-hint"
          style={{
            ...inputStyle(false),
            height: 40,
            ...(phone && { fontSize: 16 }),
          }}
        />
        <div id="event-edit-tour-name-hint" style={HINT}>
          {COPY.show.tourNameHint}
        </div>
      </div>
      {/* `06/event-edit`: the bill as 24px chips, tinted by their match. */}
      <Field label={COPY.show.lineup} htmlFor="event-edit-lineup">
        <LineupField
          id="event-edit-lineup"
          variant="edit"
          lineup={draft.lineup}
          onChange={(lineup) => setDraft({ ...draft, lineup })}
          search={searchArtists}
          phone={phone}
          invalid={lineupInvalid}
        />
      </Field>
      {canMoveVenue ? (
        <Field label={COPY.show.venue} htmlFor="event-edit-venue">
          <VenuePicker
            id="event-edit-venue"
            variant="edit"
            venues={venues}
            value={draft.venueId}
            onChange={(venueId) => setDraft({ ...draft, venueId })}
            onRetry={reloadVenues}
            phone={phone}
            invalid={false}
            // The saved venue draws while the list loads.
            known={
              draft.venueId === savedVenueId &&
              detail.venueName !== null &&
              detail.venueSlug !== null
                ? { name: detail.venueName, slug: detail.venueSlug }
                : undefined
            }
          />
        </Field>
      ) : (
        <ReadOnlyField
          id="event-edit-venue"
          label={COPY.show.venue}
          value={venue}
          height={38}
          // A crawled show still to come: say why it reads only.
          {...(detail.venueId !== null && {
            hint: COPY.venue.crawledLocked,
          })}
        />
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: phone ? '1fr 1fr' : '1.2fr 1fr 1fr',
          gap: 12,
        }}
      >
        {passed ? (
          // `36/postponed-passed-d`: the date that passed; New date moves it.
          <ReadOnlyField
            id="event-edit-date"
            label={PASSED.originalDate}
            value={fieldDate(detail.date, !phone)}
          />
        ) : (
          <Field label={COPY.show.date} htmlFor="event-edit-date">
            <DateField
              id="event-edit-date"
              value={draft.date}
              onChange={(date) => setDraft({ ...draft, date })}
              today={today}
              phone={phone}
              // A played show's correction stays in the past: the API refuses
              // a date from today on (it would put the show back on sale).
              {...(past && { max: dayBefore(today) })}
              withYear={!phone}
            />
          </Field>
        )}
        {!phone && timeField('event-edit-doors', COPY.show.doors, 'doorsTime')}
        {timeField('event-edit-show-time', COPY.show.showTime, 'showTime')}
        {phone && timeField('event-edit-doors', COPY.show.doors, 'doorsTime')}
      </div>
    </AdminCard>
  );
  const crawl = (
    <AdminCard title={COPY.crawl.title} phone={phone} testId="event-edit-crawl">
      <div>
        <AdminCardRow label={COPY.crawl.source}>
          {COPY.crawl.sourceValue(venue, method)}
        </AdminCardRow>
        <AdminCardRow label={COPY.crawl.firstSeen}>
          {shortDate(detail.firstSeenAt)}
        </AdminCardRow>
        <AdminCardRow label={COPY.crawl.lastSeen}>
          {detail.lastSeenAt === null
            ? COPY.none
            : shortDate(detail.lastSeenAt)}
        </AdminCardRow>
      </div>
    </AdminCard>
  );

  const price = (
    <PriceCard
      detail={detail}
      phone={phone}
      past={past}
      onSaved={() => router.refresh()}
    />
  );
  const status = (
    <StatusCard
      detail={detail}
      phone={phone}
      past={past}
      saleLocked={passed && draft.date < today}
      sale={draft.sale !== snap.value.sale ? draft.sale : null}
      onSale={(sale) => setDraft({ ...draft, sale })}
      onPostpone={(newDate) =>
        saveNow({
          status: 'postponed',
          // With a New date, the show moves to it (one `watch.postponed`).
          ...(newDate !== null && {
            date: newDate.date,
            // Sent even when cleared: a new date drawn with no time has none.
            showTime: stored(newDate.showTime),
          }),
        })
      }
      today={today}
      onHidden={(hidden) => saveNow({ hiddenFromConsumer: hidden })}
      dialog={dialog}
      // Postponed and Hide save at once; never while a Save bar save runs.
      setDialog={(next) => {
        if (next === null || !snap.saving) setDialog(next);
      }}
    >
      {marking && (
        <SoldOutForm
          value={draft.evidence}
          onChange={(evidence: Evidence) => setDraft({ ...draft, evidence })}
          watchingCount={detail.watchingCount}
          phone={phone}
        />
      )}
      {/* `06/sold-out-live-d`: only while Sold out is picked. Picking Tickets
          available hides it; saving that clears it. */}
      {!past &&
        draft.sale === 'soldout' &&
        detail.isSoldOut &&
        detail.soldOutRecord !== null && (
          <SoldOutRecordView record={detail.soldOutRecord} />
        )}
      {passed && (
        // `36/postponed-passed-d`: highlighted until it is set; it saves with
        // the Save bar, and the date move tells the Watching.
        <Field label={PASSED.newDate} htmlFor="event-edit-new-date">
          <DateField
            id="event-edit-new-date"
            value={draft.date === snap.value.date ? '' : draft.date}
            onChange={(date) => setDraft({ ...draft, date })}
            today={today}
            phone={phone}
            min={today}
            placeholder={PASSED.pick}
            highlight={draft.date === snap.value.date}
            withYear={!phone}
          />
          {draft.date === snap.value.date && (
            <div
              data-testid="event-edit-new-date-hint"
              style={{ fontSize: 12, color: 'var(--warning)', marginTop: 5 }}
            >
              {PASSED.notSet(detail.watchingCount)}
            </div>
          )}
        </Field>
      )}
    </StatusCard>
  );
  const banner = past ? (
    <Banner warning={false} phone={phone}>
      {detail.status === 'played'
        ? COPY.past.banner
        : COPY.past.bannerNotPlayed}
    </Banner>
  ) : passed ? (
    <Banner warning phone={phone}>
      <b>{PASSED.bannerLead(metaDate(detail.date))}</b>{' '}
      <span style={{ color: 'var(--fg-muted)' }}>
        {PASSED.bannerBody(detail.watchingCount)}
      </span>
    </Banner>
  ) : null;

  return (
    <div
      data-testid="event-edit"
      // Fills the content area, so the Save bar can sit at its bottom.
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: '100%',
      }}
    >
      <Header
        detail={detail}
        meta={(passed ? PASSED.meta : COPY.meta)(
          metaDate(detail.date),
          detail.venueName,
        )}
        phone={phone}
        onMerge={() => setMerging(true)}
        onHide={detail.hidden || snap.saving ? null : () => setDialog('hide')}
        onDelete={
          detail.manual && !snap.saving ? () => setDeleting(true) : null
        }
      />
      {phone ? (
        // `06/event-edit-mobile`: the Show fields, Status, then Price, stacked;
        // a past show's banner first (`36/past-show-m`).
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {banner}
          {fields}
          {status}
          {price}
          {crawl}
        </div>
      ) : (
        <>
          {banner}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {fields}
              {crawl}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {status}
              {price}
            </div>
          </div>
        </>
      )}
      {snap.failed !== null && refusal !== null && (
        // A refusal would only be refused again: no Try again.
        // A refused move after the fields saved says what saved first.
        <SaveFailedToast
          what={COPY.saveFailed.what}
          body={`${partlySavedLine}${refusal}`}
          onDismiss={snap.dismiss}
          {...(refusalLink !== null && {
            link: {
              label: COPY.venue.openIt,
              href: editEventHref(refusalLink),
            },
          })}
        />
      )}
      {snap.failed !== null && refusal === null && partlySaved.length > 0 && (
        // What saved, then the lineup or venue that didn't: "Nothing
        // changed" would be untrue.
        <SaveFailedToast
          what={COPY.saveFailed.what}
          body={`${partlySavedLine}${
            failedStep === 'venue'
              ? savedVenueLine
              : COPY.saveFailed.savedLineup
          }`}
          onRetry={() => void snap.retry()}
          retrying={snap.saving}
          onDismiss={snap.dismiss}
        />
      )}
      {snap.failed !== null && refusal === null && partlySaved.length === 0 && (
        <SaveFailedToast
          what={COPY.saveFailed.what}
          saved={
            // The fields saved and the sale write failed after them: the
            // status is what didn't change.
            failedStep === 'sale'
              ? COPY.statusSaved(ADMIN_COPY.eventsList.status[detail.status])
              : failedStep === 'lineup'
                ? COPY.saveFailed.savedLineup
                : failedStep === 'venue'
                  ? savedVenueLine
                  : snap.failed.attempted.title !== snap.failed.saved.title
                    ? COPY.saveFailed.saved(snap.failed.saved.title)
                    : tourChanged(snap.failed.attempted, snap.failed.saved)
                      ? COPY.saveFailed.savedTour(
                          snap.failed.saved.tourName.trim(),
                        )
                      : snap.failed.attempted.sale !== snap.failed.saved.sale
                        ? COPY.statusSaved(
                            ADMIN_COPY.eventsList.status[detail.status],
                          )
                        : COPY.saveFailed.savedWhen(
                            fieldDate(snap.failed.saved.date, true),
                          )
          }
          onRetry={() => void snap.retry()}
          retrying={snap.saving}
          onDismiss={snap.dismiss}
        />
      )}
      {/* A past show's Save bar comes once something changes (item 36). */}
      {(!past || count > 0 || snap.saving) && (
        <SaveBar
          count={count}
          valid={valid}
          saving={snap.saving}
          phone={phone}
          inline={past}
          onDiscard={() => setDraft(snap.value)}
          onSave={() => {
            if (movingTold) setConfirmingMove(true);
            else if (marking) setConfirmingSoldOut(true);
            else void saveDraft();
          }}
        />
      )}
      {confirmingMove && (
        // Undrawn (🔸): the Postponed and Hide confirms' dialog, for a move
        // that tells the Watching the new room.
        <EventConfirm
          title={COPY.venue.confirmTitle(
            detail.artist,
            venueName(draft.venueId),
          )}
          confirmLabel={COPY.venue.confirm}
          danger={false}
          failedWhat={COPY.saveFailed.what}
          failedSaved={savedVenueLine}
          onCancel={() => setConfirmingMove(false)}
          // A failed save closes it and shows the page's Couldn't change, as
          // the Sold out confirm does. A new Sold out still asks its own.
          act={async () => {
            if (marking) {
              setConfirmingMove(false);
              setConfirmingSoldOut(true);
              return;
            }
            await saveDraft();
            setConfirmingMove(false);
          }}
        >
          <div>{COPY.venue.confirmBody(detail.watchingCount)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {COPY.venue.confirmFoot}
          </div>
        </EventConfirm>
      )}
      {confirmingSoldOut && (
        <SoldOutConfirm
          artist={detail.artist}
          watchingCount={detail.watchingCount}
          evidence={draft.evidence}
          onCancel={() => setConfirmingSoldOut(false)}
          // A failed save closes it and shows the page's Couldn't change,
          // with Try again, as every Save bar save does.
          onConfirm={async () => {
            await saveDraft();
            setConfirmingSoldOut(false);
          }}
        />
      )}
      {merging && (
        <MergePanel
          phone={phone}
          current={{
            id: detail.id,
            title: detail.title,
            date: detail.date,
            venueName: detail.venueName,
            manual: detail.manual,
            watchers: detail.watchingCount,
          }}
          when={detail.date < today ? 'past' : 'upcoming'}
          onClose={() => setMerging(false)}
          onMerged={(keptId) => {
            setMerging(false);
            // Kept here: the page's own counts moved. Kept the other one:
            // this listing is gone, so open the one that stayed.
            if (keptId === detail.id) router.refresh();
            else router.push(editEventHref(keptId));
          }}
        />
      )}
      {deleting && (
        <EventDeleteConfirm
          title={detail.title}
          onDelete={() => deleteEvent(getToken, detail.id)}
          onCancel={() => setDeleting(false)}
          // The show is gone, so this page is too: back to the Events list.
          onDone={() => router.push('/admin/events')}
        />
      )}
    </div>
  );
};
