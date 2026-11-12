'use client';

import type { ArtistReportReason } from '@concert-crawl/types';

import { Panel } from '../image-slot';

import { ARTIST_COPY } from './definitions/copy';
import {
  REPORT_AMBER as AMBER,
  REPORT_MONO as MONO,
} from './definitions/report-styles';

const copy = ARTIST_COPY.report;

/** The recap under the sent sheet's body: the artist and the picked reason. */
export const ArtistReportSentStub = ({
  name,
  photoUrl,
  reason,
}: {
  name: string;
  photoUrl: string | null;
  reason: ArtistReportReason;
}) => (
  <div
    data-testid="artist-report-stub"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      border: `1.5px dashed ${AMBER.border}`,
      background: 'var(--surface-1)',
    }}
  >
    <Panel surface="artist" name={name} photoUrl={photoUrl} size={44} />
    <div
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 800,
          fontSize: 15,
          color: 'var(--fg)',
          overflowWrap: 'anywhere',
        }}
      >
        {copy.sent.stub(name, copy.reasonShort[reason])}
      </span>
      <span
        style={{
          ...MONO,
          fontSize: 9,
          fontWeight: 700,
          color: AMBER.color,
        }}
      >
        {copy.sent.stubStatus}
      </span>
    </div>
  </div>
);
