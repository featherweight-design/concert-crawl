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
import { Calendar, ExternalLink, EyeOff, GitMerge } from 'lucide-react';
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
import { MergeEventDialog } from '../editor/MergeEventDialog';
import { PriceCard } from './PriceCard';
import { DateField, TimeField } from './pickers';
import { StatusCard, type Sale, type StatusDialog } from './StatusCard';
import { StatusChips } from '../list/EventsList';
import { duplicateShowMessage, pastLockedMessage } from '../past-locked';
import {
  dayBefore,
  fieldDate,
  isPast,
  isPostponedPassed,
  type EventDetail,
} from './event-detail';

const COPY = ADMIN_COPY.eventEdit;
const PASSED = COPY.passed;
const LIST = ADMIN_COPY.eventsList;

/** The fields this editor saves. Status, Hidden and price save on their own. */
interface Fields {
  title: string;
  /** Tickets available or Sold out; `null` while neither pill is chosen. */
  sale: Sale | null;
  /** YYYY-MM-DD. */
  date: string;
  /** `HH:MM`, or null for none. */
  doorsTime: string | null;
  showTime: string | null;
}

/** A stored `HH:MM:SS` as the pickers' `HH:MM`. */
const hhmm = (time: string | null): string | null =>
  time === null ? null : time.slice(0, 5);

/** The pickers' `HH:MM` as the API stores it. */
const stored = (time: string | null): string | null =>
  time === null ? null : `${time}:00`;

/** The saved sale: the pill drawn chosen when nothing is drafted. */
const saleOf = (status: EventDetail['status']): Sale | null =>
  status === 'available' || status === 'soldout' ? status : null;

/** How many fields differ from what is saved: the Save bar's count. */
const changedCount = (draft: Fields, saved: Fields): number =>
  (draft.title.trim() !== saved.title.trim() ? 1 : 0) +
  (draft.sale !== saved.sale ? 1 : 0) +
  (draft.date !== saved.date ? 1 : 0) +
  (draft.doorsTime !== saved.doorsTime ? 1 : 0) +
  (draft.showTime !== saved.showTime ? 1 : 0);

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

/**
 * A value drawn as its field but not editable here: the venue (its picker
 * lands with the 4b venue work) and a passed postponed show's Original date.
 */
const ReadOnlyField = ({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) => (
  <Field label={label} htmlFor={id}>
    <input
      id={id}
      readOnly
      value={value}
      style={{ ...inputStyle(false), height: 40, color: 'var(--fg-muted)' }}
    />
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
}: {
  detail: EventDetail;
  /** Date · venue, or "Was …" on a postponed show whose date passed. */
  meta: string;
  phone: boolean;
  onMerge: () => void;
  /** Opens the Hide dialog; `null` once the show is hidden. */
  onHide: (() => void) | null;
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
            <EventEditMenu detail={detail} onMerge={onMerge} onHide={onHide} />
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
          <EventEditMenu detail={detail} onMerge={onMerge} onHide={onHide} />
        )}
      </div>
    </div>
  );
};

/**
 * The edit page's ⋯ (`06/event-menu`, less Edit, which is this page). Merge
 * opens the existing merge dialog until 4b-4 rebuilds it to the boards.
 */
const EventEditMenu = ({
  detail,
  onMerge,
  onHide,
}: {
  detail: EventDetail;
  onMerge: () => void;
  onHide: (() => void) | null;
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
 * field, stacked on the phone (4b#4). The lineup waits for its data (4a-2)
 * and the venue picker for the 4b venue work, so the venue reads only.
 *
 * A played past show (B+ addendum 6 item 36, `04/past-show-d`,
 * `36/past-show-m`) takes corrections that notify nobody: title, times and a
 * date still in the past, under a banner; status and price read only. A
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
  /** The PATCH's 409 refusal, said as such: a retry would be refused again. */
  const [refusal, setRefusal] = useState<string | null>(null);

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
  const savedSale = saleOf(detail.status);
  const savedDate = detail.date;
  const savedDoors = hhmm(detail.doorsTime);
  const savedShow = hhmm(detail.showTime);
  const saved = useMemo(
    () => ({
      title: savedTitle,
      sale: savedSale,
      date: savedDate,
      doorsTime: savedDoors,
      showTime: savedShow,
    }),
    [savedTitle, savedSale, savedDate, savedDoors, savedShow],
  );
  const snap = useSnapBack<Fields>(saved, async (next) => {
    const token = await tokenOrThrow();
    // While the date is still past, no sale write goes out: a played show has
    // no status to set, and a passed postponed one stays Postponed until its
    // new date (`36/postponed-passed-d`). No `status: 'upcoming'`, no
    // sold-out or available call.
    const saleChanged =
      next.sale !== null &&
      next.sale !== savedSale &&
      !past &&
      !(passed && next.date < today);
    const body: {
      title?: string;
      status?: 'upcoming';
      date?: string;
      doorsTime?: string | null;
      showTime?: string | null;
    } = {
      ...(next.title !== savedTitle && { title: next.title }),
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
    setRefusal(null);
    try {
      if (Object.keys(body).length > 0) {
        await apiClient.patch(path, token, body);
        landed = true;
      }
      // Sold out is its own flag with its own Watcher notice (`watch.soldout`).
      if (saleChanged && next.sale === 'soldout' && !detail.isSoldOut) {
        await apiClient.post(`${path}/sold-out`, token, {});
        landed = true;
      }
      if (saleChanged && next.sale === 'available' && detail.isSoldOut) {
        await apiClient.post(`${path}/available`, token, {});
        landed = true;
      }
    } catch (err) {
      console.error('[event edit] save failed', err);
      // `past_locked` (a field a past show locks) or `duplicate_show` (another
      // listing that night): the snap-back's toast says which.
      setRefusal(pastLockedMessage(err) ?? duplicateShowMessage(err));
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
      sale: was.sale !== now.sale ? now.sale : prev.sale,
      date: was.date !== now.date ? now.date : prev.date,
      doorsTime:
        was.doorsTime !== now.doorsTime ? now.doorsTime : prev.doorsTime,
      showTime: was.showTime !== now.showTime ? now.showTime : prev.showTime,
    }));
  }, [snap.value]);
  // A save that fails fast can batch its pending and failed states into one
  // render, so the values above never change: snap back on the failure.
  useEffect(() => {
    if (snap.failed !== null) setDraft(snap.failed.saved);
  }, [snap.failed]);
  const count = changedCount(draft, snap.value);
  // The API refuses an empty title, so Save waits for one.
  const valid = draft.title.trim() !== '';

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
      <ReadOnlyField
        id="event-edit-venue"
        label={COPY.show.venue}
        value={venue}
      />
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
        <SaveFailedToast
          what={COPY.saveFailed.what}
          body={refusal}
          onDismiss={snap.dismiss}
        />
      )}
      {snap.failed !== null && refusal === null && (
        <SaveFailedToast
          what={COPY.saveFailed.what}
          saved={
            snap.failed.attempted.title !== snap.failed.saved.title
              ? COPY.saveFailed.saved(snap.failed.saved.title)
              : snap.failed.attempted.sale !== snap.failed.saved.sale
                ? COPY.statusSaved(ADMIN_COPY.eventsList.status[detail.status])
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
          onSave={() => void snap.save({ ...draft, title: draft.title.trim() })}
        />
      )}
      {merging && (
        <MergeEventDialog
          sourceId={detail.id}
          sourceTitle={detail.title}
          onCancel={() => setMerging(false)}
          onMerged={(targetId) => router.push(editEventHref(targetId))}
        />
      )}
    </div>
  );
};
