'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { GUIDE_CHIP_ORDER, type VenueGuide } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminCard,
  CouldntLoad,
  useIsPhone,
} from '@/components/admin/primitives';
import { GUIDE_ANCHOR_ID } from '@/components/consumer/venue-guide/FirstTimerCallout';
import { viewOnSiteHref, type HeaderVenue } from '../venue-header-rules';
import { GuideEditPanel } from './GuideEditPanel';
import {
  GUIDE_SECTIONS,
  publishedCount,
  rowState,
  sectionDraft,
  type GuideRowState,
  type GuideSection,
} from './guide-rules';

const COPY = ADMIN_COPY.venueGuide;

const TONE: Record<GuideRowState, string> = {
  published: 'var(--success)',
  draft: 'var(--warning)',
  missing: 'var(--fg-subtle)',
  // The #764 handoff's placeholder badge tone: publishable, but not written.
  cantDocument: 'var(--warning)',
};

/** The row's state pill (`04/venue-guide`): a dot and a word, never colour alone. */
const StateChip = ({ state }: { state: GuideRowState }) => {
  const tone = TONE[state];
  return (
    <span
      data-testid="guide-state"
      data-state={state}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: '0 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: state === 'missing' ? 'var(--fg-muted)' : tone,
        background: `color-mix(in srgb, ${tone} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 32%, transparent)`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tone,
          flex: 'none',
        }}
      />
      {COPY.state[state]}
    </span>
  );
};

const RULE = '1px solid var(--border)';

/**
 * The venue page's Guide tab (3b part 6, `04/venue-guide`): the insider tip
 * then every chip, each with its derived state, and an edit panel per row.
 * Draft the missing ones, "Draft · check it" and provenance wait for 3d.
 */
export const GuideTab = ({
  venue,
  guide,
  loadFailed,
  onGuideChange,
}: {
  venue: HeaderVenue & { id: string; name: string };
  guide: VenueGuide;
  /** The fetch failed: `guide` is an empty fallback, and saving it would wipe
      every chip, so the rows aren't shown at all. */
  loadFailed: boolean;
  onGuideChange: (next: VenueGuide) => void;
}) => {
  const phone = useIsPhone();
  const router = useRouter();
  const [editing, setEditing] = useState<GuideSection | null>(null);
  const siteHref = viewOnSiteHref(venue);

  const preview =
    siteHref === null ? null : (
      <a
        href={`${siteHref}#${GUIDE_ANCHOR_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 12px',
          borderRadius: 9,
          fontSize: 12.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          color: 'var(--fg)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <Eye size={14} aria-hidden />
        {COPY.preview}
      </a>
    );

  const row = (section: GuideSection) => {
    const state = rowState(guide, section);
    const label = COPY.section[section];
    const text = sectionDraft(guide, section).text;
    const missing = state === 'missing';
    const textStyle = {
      fontSize: 13,
      color: missing ? 'var(--fg-subtle)' : 'var(--fg-muted)',
      minWidth: 0,
    };
    const shown = missing ? COPY.notWritten : text;
    const open = () => setEditing(section);

    // Phone: the label and state on top, the text under them, and the whole
    // row taps to edit (`05/guide-mobile`'s rows).
    if (phone)
      return (
        <button
          key={section}
          type="button"
          onClick={open}
          aria-label={missing ? COPY.writeLabel(label) : COPY.editLabel(label)}
          data-testid={`guide-row-${section}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            width: '100%',
            padding: '12px 0',
            border: 'none',
            borderTop: RULE,
            background: 'transparent',
            color: 'var(--fg)',
            fontFamily: 'inherit',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {label}
            </span>
            <StateChip state={state} />
          </span>
          {shown.length > 0 && (
            <span style={{ ...textStyle, overflowWrap: 'anywhere' }}>
              {shown}
            </span>
          )}
        </button>
      );

    return (
      <div
        key={section}
        data-testid={`guide-row-${section}`}
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 1fr 130px 70px',
          gap: 14,
          alignItems: 'center',
          padding: '12px 0',
          borderTop: RULE,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
        <span
          style={{
            ...textStyle,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {shown}
        </span>
        <span>
          <StateChip state={state} />
        </span>
        <button
          type="button"
          onClick={open}
          aria-label={missing ? COPY.writeLabel(label) : COPY.editLabel(label)}
          style={{
            justifySelf: 'end',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--signal)',
            fontFamily: 'inherit',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          {missing ? COPY.write : COPY.edit}
        </button>
      </div>
    );
  };

  return (
    <AdminCard
      title={COPY.title}
      action={preview}
      phone={phone}
      testId="guide-card"
    >
      {loadFailed ? (
        <CouldntLoad page={COPY.title} onRetry={() => router.refresh()} />
      ) : (
        <>
          <p
            data-testid="guide-count"
            style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}
          >
            {COPY.count(publishedCount(guide), GUIDE_CHIP_ORDER.length)}
          </p>
          <div>{GUIDE_SECTIONS.map(row)}</div>
        </>
      )}
      {editing !== null && !loadFailed && (
        <GuideEditPanel
          venueId={venue.id}
          venueName={venue.name}
          guide={guide}
          section={editing}
          phone={phone}
          onClose={() => setEditing(null)}
          onSaved={onGuideChange}
        />
      )}
    </AdminCard>
  );
};
