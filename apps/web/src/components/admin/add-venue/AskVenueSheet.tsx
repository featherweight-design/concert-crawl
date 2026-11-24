'use client';

/**
 * Ask the venue (`05/ask-the-venue`): a ready-to-send note that opens in the
 * admin's own mail app, so it comes from them. Nothing is sent from here. The
 * venue only records that it was asked (`permission_asked_at`), which starts
 * the 14-day Needs you reminder (plan decision 7a). The To field starts blank
 * and is editable: nothing stores a venue's contact address (decision 7).
 */

import { useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminDialog,
  AdminSheet,
} from '@/components/admin/primitives';
import {
  fieldLabel,
  inputStyle,
} from '@/components/admin/venues/source/source-parts';
import { permissionMailto } from '@/lib/admin/permission-note';
import { askVenuePermission } from '@/lib/actions/venues';

const ASK = ADMIN_COPY.addVenue.ask;
const NOTE = ADMIN_COPY.permissionNote;
const TO_ID = 'add-venue-ask-to';

const noteStyle = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
} as const;

export const AskVenueSheet = ({
  phone,
  venueId,
  venueName,
  onClose,
}: {
  phone: boolean;
  venueId: string;
  venueName: string;
  onClose: () => void;
}) => {
  const [to, setTo] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  // Records the ask; the note itself is the admin's to send.
  const record = async () => {
    const outcome = await askVenuePermission(venueId);
    setError(!outcome.ok);
  };

  const open = () => {
    // Inside the tap, so the browser lets the mail app open.
    window.location.href = permissionMailto(venueName, to.trim() || null);
    void record();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(NOTE.body(venueName));
      setCopied(true);
      void record();
    } catch (err) {
      console.error('Ask the venue: clipboard write refused', err);
      setCopied(false);
    }
  };

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
        {ASK.sub}
      </p>
      <div>
        <label htmlFor={TO_ID} style={fieldLabel}>
          {ASK.to}
        </label>
        <input
          id={TO_ID}
          type="email"
          value={to}
          placeholder={ASK.toPlaceholder}
          onChange={(event) => setTo(event.target.value)}
          style={{
            ...inputStyle(false),
            // iOS Safari zooms a focused input under 16px.
            ...(phone ? { fontSize: 16 } : {}),
          }}
        />
      </div>
      <div style={{ fontSize: 13 }}>
        <span style={{ color: 'var(--fg-muted)' }}>{ASK.subject}: </span>
        {NOTE.subject(venueName)}
      </div>
      <pre style={noteStyle} data-testid="add-venue-ask-note">
        {NOTE.body(venueName)}
      </pre>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-subtle)' }}>
        {ASK.after}
      </p>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>
          {ASK.failed}
        </div>
      )}
    </div>
  );
  const actions = (
    <>
      <AdminButton variant="outline" onClick={() => void copy()}>
        {copied ? ASK.copied : ASK.copy}
      </AdminButton>
      <AdminButton
        variant="primary"
        onClick={open}
        data-testid="add-venue-ask-open"
      >
        {ASK.open}
      </AdminButton>
    </>
  );

  if (phone) {
    return (
      <AdminSheet
        onClose={onClose}
        title={ASK.title(venueName)}
        eyebrow={ASK.eyebrow}
        footer={actions}
      >
        {body}
      </AdminSheet>
    );
  }
  return (
    <AdminDialog
      accent="var(--signal)"
      label={ASK.title(venueName)}
      eyebrow={ASK.eyebrow}
      heading={ASK.title(venueName)}
      width={560}
      onDismiss={onClose}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            {ASK.close}
          </AdminButton>
          {actions}
        </>
      }
    >
      {body}
    </AdminDialog>
  );
};
