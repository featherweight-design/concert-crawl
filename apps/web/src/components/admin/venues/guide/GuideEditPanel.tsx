'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { EyeOff } from 'lucide-react';
import { GUIDE_FIELD_MAX_LENGTH, type VenueGuide } from '@concert-crawl/types';
import {
  publishVenueGuide,
  saveVenueGuide,
  unpublishVenueGuide,
  type VenueGuideActionResult,
} from '@/lib/actions/venues';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  KindLabel,
  RowMenu,
  SaveFailedToast,
  SidePanel,
} from '@/components/admin/primitives';
import {
  publishBlocked,
  rowState,
  sectionDraft,
  withSection,
  type GuideSection,
  type SectionDraft,
} from './guide-rules';

const COPY = ADMIN_COPY.venueGuide;

type Action = 'save' | 'publish' | 'unpublish';

/** The panel's chip toggle: the row chip's pill, as a switch. */
const cantDocumentStyle = (on: boolean): React.CSSProperties => {
  const tone = on ? 'var(--warning)' : 'var(--fg-subtle)';
  return {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 22,
    padding: '0 9px',
    borderRadius: 999,
    fontFamily: 'inherit',
    fontSize: 11.5,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    color: on ? tone : 'var(--fg-muted)',
    background: `color-mix(in srgb, ${tone} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tone} 32%, transparent)`,
  };
};

/**
 * One section's editor (`04/guide-edit-a-section`): a side panel over the page
 * on desktop, full screen on phone (decision 1). The API saves and publishes
 * the whole guide (ruling e), so every write sends the guide with this one
 * section replaced. Draft provenance isn't stored, so its lines are dropped
 * (row 21); a Missing section opens as Write (row 25).
 */
export const GuideEditPanel = ({
  venueId,
  venueName,
  guide,
  section,
  phone,
  onClose,
  onSaved,
}: {
  venueId: string;
  venueName: string;
  guide: VenueGuide;
  section: GuideSection;
  phone: boolean;
  onClose: () => void;
  onSaved: (next: VenueGuide) => void;
}) => {
  const fieldId = useId();
  const [draft, setDraft] = useState<SectionDraft>(() =>
    sectionDraft(guide, section),
  );
  const [busy, setBusy] = useState<Action | null>(null);
  const [failed, setFailed] = useState<Action | null>(null);

  const label = COPY.section[section];
  const writing = rowState(guide, section) === 'missing';
  const next = withSection(guide, section, draft);
  const blocked = publishBlocked(next);

  // Every action guards `busy` itself: ⌘↵ reaches publish without a button.
  const run = (action: Action) => {
    if (busy !== null) return;
    if (action === 'publish' && blocked) return;
    setBusy(action);
    setFailed(null);
    void (async () => {
      let result: VenueGuideActionResult;
      if (action === 'unpublish') {
        result = await unpublishVenueGuide(venueId);
      } else {
        result = await saveVenueGuide(venueId, {
          insiderTip: next.insiderTip,
          chips: next.chips,
        });
        if (result.success && action === 'publish')
          result = await publishVenueGuide(venueId);
      }
      setBusy(null);
      if (!result.success) {
        setFailed(action);
        return;
      }
      const fallback =
        action === 'unpublish'
          ? { ...guide, publishedAt: null }
          : action === 'publish'
            ? { ...next, publishedAt: new Date().toISOString() }
            : next;
      onSaved(result.data ?? fallback);
      onClose();
    })();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      run('publish');
    }
  };

  const menu =
    guide.publishedAt === null ? null : (
      <RowMenu
        label={COPY.menu}
        testId="guide-menu"
        items={[
          {
            key: 'unpublish',
            icon: EyeOff,
            label: COPY.unpublish,
            hint: COPY.unpublishHint,
            warning: true,
            disabled: busy !== null,
            onSelect: () => run('unpublish'),
          },
        ]}
      />
    );

  const isAccessibility = section === 'accessibility';
  const body = (
    <div
      onKeyDown={onKeyDown}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {isAccessibility && (
        <button
          type="button"
          role="switch"
          aria-checked={draft.cantDocument}
          onClick={() =>
            setDraft((cur) => ({ ...cur, cantDocument: !cur.cantDocument }))
          }
          style={cantDocumentStyle(draft.cantDocument)}
        >
          {COPY.cantDocument}
        </button>
      )}
      <textarea
        id={fieldId}
        aria-label={label}
        value={draft.text}
        maxLength={GUIDE_FIELD_MAX_LENGTH}
        disabled={draft.cantDocument}
        onChange={(event) =>
          setDraft((cur) => ({ ...cur, text: event.target.value }))
        }
        style={{
          boxSizing: 'border-box',
          width: '100%',
          minHeight: 110,
          borderRadius: 10,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg)',
          color: 'var(--fg)',
          padding: '10px 12px',
          fontFamily: 'inherit',
          fontSize: 13.5,
          lineHeight: 1.5,
          resize: 'vertical',
          opacity: draft.cantDocument ? 0.5 : 1,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: 12,
          color: 'var(--fg-subtle)',
        }}
      >
        <span data-testid="guide-counter">
          {COPY.counter(draft.text.length, GUIDE_FIELD_MAX_LENGTH)}
        </span>
      </div>
      {failed !== null &&
        (failed === 'unpublish' ? (
          <SaveFailedToast
            title={COPY.failed.unpublish}
            saved={COPY.failed.unpublishSaved}
            onRetry={() => run('unpublish')}
            retrying={busy !== null}
          />
        ) : (
          <SaveFailedToast
            what={label}
            saved={COPY.failed.saved}
            onRetry={() => run(failed)}
            retrying={busy !== null}
          />
        ))}
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {blocked && (
        <p
          id={`${fieldId}-blocked`}
          style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}
        >
          {COPY.publishBlocked}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <AdminButton
          type="button"
          variant="gradient"
          disabled={blocked || busy !== null}
          aria-describedby={blocked ? `${fieldId}-blocked` : undefined}
          onClick={() => run('publish')}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 9,
            fontSize: 14,
            ...(blocked && { opacity: 0.45, cursor: 'not-allowed' }),
          }}
        >
          {busy === 'publish' ? COPY.publishing : COPY.publish}
        </AdminButton>
        <AdminButton
          type="button"
          disabled={busy !== null}
          onClick={() => run('save')}
          style={{
            height: 40,
            borderRadius: 9,
            fontSize: 14,
            fontWeight: 600,
            background: 'var(--surface-2)',
          }}
        >
          {busy === 'save' ? COPY.saving : COPY.saveDraft}
        </AdminButton>
      </div>
    </div>
  );

  const title = writing ? COPY.write : label;
  const eyebrow = <KindLabel kind="guide" />;
  if (phone)
    return (
      <AdminSheet
        fullScreen
        onClose={onClose}
        dismissible={busy === null}
        title={title}
        label={writing ? COPY.writeLabel(label) : label}
        subtitle={venueName}
        menu={
          <>
            {eyebrow}
            <span style={{ flex: 1 }} />
            {menu}
          </>
        }
        footer={footer}
      >
        {body}
      </AdminSheet>
    );
  return (
    <SidePanel
      onClose={onClose}
      dismissible={busy === null}
      eyebrow={eyebrow}
      menu={menu}
      title={title}
      subtitle={venueName}
      footer={<div style={{ flex: 1 }}>{footer}</div>}
    >
      {body}
    </SidePanel>
  );
};
