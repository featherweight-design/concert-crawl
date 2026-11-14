'use client';

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ExternalLink, GitMerge } from 'lucide-react';
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
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { shortDate } from '@/components/admin/venues/overview/overview-rules';
import { metaDate } from '@/components/admin/needs-you/needs-you-rules';
import { apiClient } from '@/lib/api';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { eventCanonicalPath } from '@/lib/share/event-metadata';
import { MergeEventDialog } from '../editor/MergeEventDialog';
import { StatusChips } from '../list/EventsList';
import { fieldDate, fieldTime, isPast, type EventDetail } from './event-detail';

const COPY = ADMIN_COPY.eventEdit;
const LIST = ADMIN_COPY.eventsList;

/** The fields this editor saves. Status, Hidden and price save on their own. */
interface Fields {
  title: string;
}

const fieldsOf = (detail: EventDetail): Fields => ({ title: detail.title });

/** How many fields differ from what is saved: the Save bar's count. */
const changedCount = (draft: Fields, saved: Fields): number =>
  draft.title.trim() !== saved.title ? 1 : 0;

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
}: {
  detail: EventDetail;
  phone: boolean;
  onMerge: () => void;
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
          {phone && <EventEditMenu detail={detail} onMerge={onMerge} />}
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
        {!phone && <EventEditMenu detail={detail} onMerge={onMerge} />}
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
}: {
  detail: EventDetail;
  onMerge: () => void;
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
    ]}
  />
);

const SaveBar = ({
  count,
  saving,
  phone,
  onDiscard,
  onSave,
}: {
  count: number;
  saving: boolean;
  phone: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) => (
  <div
    data-testid="event-edit-save-bar"
    style={{
      position: 'sticky',
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 64,
      padding: phone ? '10px 0' : '0 4px',
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
    }}
  >
    {!phone && (
      <span
        role="status"
        style={{ flex: 1, fontSize: 13, color: 'var(--warning)' }}
      >
        {count > 0 ? COPY.saveBar.unsaved(count) : ''}
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
      disabled={count === 0 || saving}
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
  useEffect(() => {
    setPhoneBack({ label: LIST.title, href: '/admin/events' });
    return () => setPhoneBack(null);
  }, [setPhoneBack]);

  // Memoised: `useSnapBack` treats a new object as a fresh server value.
  const saved = useMemo(() => fieldsOf(detail), [detail]);
  const snap = useSnapBack<Fields>(saved, async (next) => {
    const token = await getToken();
    if (!token) throw new Error('signed out');
    await apiClient.patch(`/v1/admin/events/${detail.id}`, token, next);
    router.refresh();
  });
  const [draft, setDraft] = useState<Fields>(snap.value);
  // What is saved (after a save, a refresh, or a snap-back) resets the form.
  useEffect(() => setDraft(snap.value), [snap.value]);
  const count = changedCount(draft, snap.value);

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

  return (
    <div
      data-testid="event-edit"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <Header detail={detail} phone={phone} onMerge={() => setMerging(true)} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: phone
            ? 'minmax(0, 1fr)'
            : 'repeat(2, minmax(0, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields}
          {crawl}
        </div>
      </div>
      {snap.failed !== null && (
        <SaveFailedToast
          what={COPY.saveFailed.what}
          saved={COPY.saveFailed.saved(snap.failed.saved.title)}
          onRetry={() => void snap.retry()}
          retrying={snap.saving}
          onDismiss={snap.dismiss}
        />
      )}
      {!past && (
        <SaveBar
          count={count}
          saving={snap.saving}
          phone={phone}
          onDiscard={() => setDraft(snap.value)}
          onSave={() => void snap.save({ title: draft.title.trim() })}
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
