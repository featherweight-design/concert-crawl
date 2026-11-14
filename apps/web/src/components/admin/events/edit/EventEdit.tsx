'use client';

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ExternalLink, EyeOff, GitMerge } from 'lucide-react';
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
import { StatusCard, type Sale, type StatusDialog } from './StatusCard';
import { StatusChips } from '../list/EventsList';
import { fieldDate, fieldTime, isPast, type EventDetail } from './event-detail';

const COPY = ADMIN_COPY.eventEdit;
const LIST = ADMIN_COPY.eventsList;

/** The fields this editor saves. Status, Hidden and price save on their own. */
interface Fields {
  title: string;
  /** Tickets available or Sold out; `null` while neither pill is chosen. */
  sale: Sale | null;
}

/** The saved sale: the pill drawn chosen when nothing is drafted. */
const saleOf = (status: EventDetail['status']): Sale | null =>
  status === 'available' || status === 'soldout' ? status : null;

/** How many fields differ from what is saved: the Save bar's count. */
const changedCount = (draft: Fields, saved: Fields): number =>
  (draft.title.trim() !== saved.title.trim() ? 1 : 0) +
  (draft.sale !== saved.sale ? 1 : 0);

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
 * A value drawn as its field but not editable here yet: the venue, date and
 * time pickers are held for Design, and a past show locks them (4b#22).
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

const Header = ({
  detail,
  phone,
  onMerge,
  onHide,
}: {
  detail: EventDetail;
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
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {COPY.meta(metaDate(detail.date), detail.watchingCount)}
          </span>
        </div>
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
  onDiscard,
  onSave,
  note,
}: {
  count: number;
  valid: boolean;
  saving: boolean;
  phone: boolean;
  onDiscard: () => void;
  onSave: () => void;
  /**
   * What the save will do beyond the fields, said in the bar's drawn amber
   * line before it happens (re-listing a delisted show); `null` for none.
   */
  note: string | null;
}) => (
  <div
    data-testid="event-edit-save-bar"
    // Pinned to the bottom of the content area at its full width, as drawn:
    // `marginTop: auto` drops it to the bottom of a short page, `sticky` holds
    // it there on a long one, and the negative margins cancel the shell's
    // padding (desktop 24px 28px; phone 0 16px) so it meets both edges.
    style={{
      position: 'sticky',
      bottom: 0,
      marginTop: 'auto',
      marginInline: phone ? -16 : -28,
      marginBottom: phone ? 0 : -24,
      display: 'flex',
      flexDirection: phone ? 'column' : 'row',
      alignItems: phone ? 'stretch' : 'center',
      gap: phone ? 8 : 12,
      minHeight: 64,
      padding: phone ? '10px 16px' : '0 28px',
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      zIndex: 1,
    }}
  >
    {!phone && (
      <span
        role="status"
        style={{ flex: 1, fontSize: 13, color: 'var(--warning)' }}
      >
        {count > 0 ? COPY.saveBar.unsaved(count) : ''}
        {count > 0 && note !== null ? ` · ${note}` : ''}
      </span>
    )}
    {phone && note !== null && (
      <span role="status" style={{ fontSize: 12.5, color: 'var(--warning)' }}>
        {note}
      </span>
    )}
    {!phone && count > 0 && (
      <AdminButton variant="ghost" onClick={onDiscard} disabled={saving}>
        {COPY.saveBar.discard}
      </AdminButton>
    )}
    <AdminButton
      variant="gradient"
      data-testid="event-edit-save"
      onClick={onSave}
      disabled={count === 0 || !valid || saving}
      fullWidth={phone}
      style={{ height: phone ? 46 : 40, padding: '0 22px', fontSize: 14 }}
    >
      {saving ? COPY.saveBar.saving : COPY.saveBar.save}
    </AdminButton>
  </div>
);

/**
 * Event edit (`06/event-edit`, phone `06/event-edit-mobile`). Every desktop
 * field, stacked on the phone (4b#4). Status, Hide and Price arrive in 4b-2
 * parts b and c; the lineup waits for its data (4a-2); the venue, date and
 * time pickers are held for Design, so those fields read only.
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
  const past = isPast(detail, today);
  const [merging, setMerging] = useState(false);

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
  const saved = useMemo(
    () => ({ title: savedTitle, sale: savedSale }),
    [savedTitle, savedSale],
  );
  const snap = useSnapBack<Fields>(saved, async (next) => {
    const token = await tokenOrThrow();
    const saleChanged = next.sale !== null && next.sale !== savedSale;
    const body: { title?: string; status?: 'upcoming' } = {
      ...(next.title !== savedTitle && { title: next.title }),
      // The pills pick one status: leaving Postponed, Cancelled or No longer
      // listed for either sale pill puts the show back on (a status write also
      // ends a delisting, server side).
      ...(saleChanged &&
        (detail.status === 'postponed' ||
          detail.status === 'cancelled' ||
          detail.status === 'delisted') && { status: 'upcoming' }),
    };
    let landed = false;
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
  const savedValueTitle = snap.value.title;
  const savedValueSale = snap.value.sale;
  useEffect(
    () => setDraft((prev) => ({ ...prev, title: savedValueTitle })),
    [savedValueTitle],
  );
  useEffect(
    () => setDraft((prev) => ({ ...prev, sale: savedValueSale })),
    [savedValueSale],
  );
  // A save that fails fast can batch its pending and failed states into one
  // render, so the values above never change: snap back on the failure.
  useEffect(() => {
    if (snap.failed !== null) setDraft(snap.failed.saved);
  }, [snap.failed]);
  const count = changedCount(draft, snap.value);
  // The API refuses an empty title, so Save waits for one.
  const valid = draft.title.trim() !== '';

  const venue = detail.venueName ?? COPY.none;
  const method = COPY.crawl.method(detail.extractionStrategy);
  const fields = (
    <AdminCard title={COPY.show.title} phone={phone} testId="event-edit-show">
      <Field label={COPY.show.titleField} htmlFor="event-edit-title">
        <input
          id="event-edit-title"
          value={draft.title}
          readOnly={past}
          onChange={(evt) => setDraft({ ...draft, title: evt.target.value })}
          style={{
            ...inputStyle(false),
            height: 40,
            // 16px on the phone, so focusing the field never zooms the page.
            ...(phone && { fontSize: 16 }),
            ...(past && { color: 'var(--fg-muted)' }),
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
        <ReadOnlyField
          id="event-edit-date"
          label={COPY.show.date}
          value={fieldDate(detail.date, !phone)}
        />
        {!phone && (
          <ReadOnlyField
            id="event-edit-doors"
            label={COPY.show.doors}
            value={fieldTime(detail.doorsTime) ?? COPY.none}
          />
        )}
        <ReadOnlyField
          id="event-edit-show-time"
          label={COPY.show.showTime}
          value={fieldTime(detail.showTime) ?? COPY.none}
        />
        {phone && (
          <ReadOnlyField
            id="event-edit-doors"
            label={COPY.show.doors}
            value={fieldTime(detail.doorsTime) ?? COPY.none}
          />
        )}
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

  const status = (
    <StatusCard
      detail={detail}
      phone={phone}
      past={past}
      sale={draft.sale !== snap.value.sale ? draft.sale : null}
      onSale={(sale) => setDraft({ ...draft, sale })}
      onPostpone={() => saveNow({ status: 'postponed' })}
      onHidden={(hidden) => saveNow({ hiddenFromConsumer: hidden })}
      dialog={dialog}
      // Postponed and Hide save at once; never while a Save bar save runs.
      setDialog={(next) => {
        if (next === null || !snap.saving) setDialog(next);
      }}
    />
  );

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
        phone={phone}
        onMerge={() => setMerging(true)}
        onHide={detail.hidden || snap.saving ? null : () => setDialog('hide')}
      />
      {phone ? (
        // `06/event-edit-mobile`: the Show fields, then Status, stacked.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields}
          {status}
          {crawl}
        </div>
      ) : (
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
          </div>
        </div>
      )}
      {snap.failed !== null && (
        <SaveFailedToast
          what={COPY.saveFailed.what}
          saved={
            snap.failed.attempted.title !== snap.failed.saved.title
              ? COPY.saveFailed.saved(snap.failed.saved.title)
              : COPY.statusSaved(ADMIN_COPY.eventsList.status[detail.status])
          }
          onRetry={() => void snap.retry()}
          retrying={snap.saving}
          onDismiss={snap.dismiss}
        />
      )}
      {!past && (
        <SaveBar
          count={count}
          valid={valid}
          note={
            detail.status === 'delisted' && draft.sale !== snap.value.sale
              ? COPY.saveBar.relists
              : null
          }
          saving={snap.saving}
          phone={phone}
          onDiscard={() => setDraft(snap.value)}
          onSave={() =>
            void snap.save({ title: draft.title.trim(), sale: draft.sale })
          }
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
