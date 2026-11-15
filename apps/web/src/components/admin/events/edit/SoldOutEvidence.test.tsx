// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { SoldOutRecord } from './event-detail';
import {
  evidenceBody,
  evidenceReady,
  linkText,
  NO_EVIDENCE,
  SoldOutRecordView,
} from './SoldOutEvidence';

const COPY = ADMIN_COPY.eventEdit.soldOut;

afterEach(cleanup);

const FAN: SoldOutRecord = {
  reporter: {
    handle: 'mira.k',
    avatarColor: 'signal',
    avatarSecondColor: 'accent',
    kind: 'fan',
  },
  evidenceMethod: 'bought_myself',
  evidenceUrl: 'https://axs.com/events/52114',
  note: 'Friday GA gone; pit waitlist still open.',
  // Nov 9, 7:15 PM and 9:02 PM Mountain Time.
  reportedAt: '2026-11-10T02:15:00.000Z',
  madeLiveAt: '2026-11-10T04:02:00.000Z',
  confirmsCount: 2,
};

const ADMIN: SoldOutRecord = {
  reporter: {
    handle: 'hugh',
    avatarColor: null,
    avatarSecondColor: null,
    kind: 'admin',
  },
  evidenceMethod: 'venue_site',
  evidenceUrl: 'https://www.missionballroom.com/events/jbrekkie',
  note: null,
  // Nov 12, 10:30 AM Mountain Time.
  reportedAt: '2026-11-12T17:30:00.000Z',
  madeLiveAt: '2026-11-12T17:30:00.000Z',
  confirmsCount: 0,
};

/** The record's label-then-value rows, as text. */
const rowText = () => screen.getByTestId('sold-out-record').textContent ?? '';

describe('SoldOutRecordView (`06/sold-out-states`)', () => {
  it('reads a fan report: who, the quote, how they knew, the link, Reported and Made live with the confirms', () => {
    render(<SoldOutRecordView record={FAN} />);
    const record = screen.getByTestId('sold-out-record');
    expect(record).toHaveAttribute('data-reporter', 'fan');
    expect(record).toHaveTextContent(COPY.recordTitle);
    expect(record).toHaveTextContent(ADMIN_COPY.eventsList.status.soldout);
    expect(record).toHaveTextContent('@mira.k');
    expect(record).toHaveTextContent(COPY.fan);
    expect(screen.getByTestId('person-avatar')).toHaveTextContent('M');
    expect(screen.getByTestId('sold-out-note')).toHaveTextContent(
      COPY.quote(FAN.note ?? ''),
    );
    expect(rowText()).toContain(
      `${COPY.howTheyKnew}${COPY.methods.bought_myself}`,
    );
    expect(screen.getByTestId('sold-out-source')).toHaveAttribute(
      'href',
      FAN.evidenceUrl,
    );
    expect(screen.getByTestId('sold-out-source')).toHaveTextContent(
      'axs.com/events/52114',
    );
    expect(rowText()).toContain(`${COPY.reported}Nov 9, 7:15 PM`);
    expect(rowText()).toContain(
      `${COPY.madeLive}${COPY.madeLiveValue('Nov 9, 9:02 PM', 2)}`,
    );
    expect(rowText()).not.toContain(COPY.marked);
    expect(record).toHaveTextContent(COPY.recordFoot);
  });

  it('reads an admin mark: Admin, How you knew, one Marked row, and no note recorded', () => {
    render(<SoldOutRecordView record={ADMIN} />);
    const record = screen.getByTestId('sold-out-record');
    expect(record).toHaveAttribute('data-reporter', 'admin');
    expect(record).toHaveTextContent('@hugh');
    expect(record).toHaveTextContent(COPY.admin);
    expect(record).toHaveTextContent(COPY.noNote);
    expect(screen.queryByTestId('sold-out-note')).toBeNull();
    expect(rowText()).toContain(`${COPY.howYouKnew}${COPY.methods.venue_site}`);
    expect(screen.getByTestId('sold-out-source')).toHaveTextContent(
      'missionballroom.com/events/jbrekkie',
    );
    expect(rowText()).toContain(`${COPY.marked}Nov 12, 10:30 AM`);
    expect(rowText()).not.toContain(COPY.reported);
    expect(rowText()).not.toContain(COPY.madeLive);
  });

  it('says None recorded for an older mark with no link, and draws a fan with no confirms plainly', () => {
    render(
      <SoldOutRecordView
        record={{
          ...FAN,
          evidenceUrl: null,
          note: null,
          evidenceMethod: 'other',
          confirmsCount: 0,
        }}
      />,
    );
    expect(screen.queryByTestId('sold-out-source')).toBeNull();
    expect(rowText()).toContain(`${COPY.source}${COPY.noneRecorded}`);
    expect(rowText()).toContain(COPY.noNote);
    expect(rowText()).toContain(`${COPY.madeLive}Nov 9, 9:02 PM`);
    expect(rowText()).not.toContain('confirmed');
  });

  it('names a reporter with no handle, and never links a link that is not http(s)', () => {
    render(
      <SoldOutRecordView
        record={{
          ...FAN,
          reporter: { ...FAN.reporter, handle: null },
          evidenceUrl: 'javascript:alert(1)',
        }}
      />,
    );
    expect(screen.getByTestId('sold-out-record')).toHaveTextContent(
      COPY.noHandle,
    );
    expect(screen.queryByTestId('sold-out-source')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('the mark form’s rules', () => {
  it('is ready only with a method, and a blank or http(s) link', () => {
    expect(evidenceReady(NO_EVIDENCE)).toBe(false);
    expect(evidenceReady({ ...NO_EVIDENCE, method: 'other' })).toBe(true);
    expect(evidenceReady({ method: 'other', url: 'axs.com', note: '' })).toBe(
      false,
    );
    expect(
      evidenceReady({ method: 'other', url: 'https://axs.com', note: '' }),
    ).toBe(true);
  });

  it('sends the method and leaves blanks out', () => {
    expect(evidenceBody({ method: 'saw_listing', url: ' ', note: '' })).toEqual(
      { evidenceMethod: 'saw_listing' },
    );
  });

  it('cuts a link to its host and path', () => {
    expect(linkText('https://www.axs.com/events/52114/')).toBe(
      'axs.com/events/52114',
    );
    expect(linkText('not a url')).toBe('not a url');
  });
});
