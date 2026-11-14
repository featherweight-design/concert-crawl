// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DoneForYou } from './DoneForYou';
import { SiteCard, emailState } from './SiteCard';

afterEach(cleanup);

const copy = ADMIN_COPY.health;

describe('<DoneForYou />', () => {
  it('lists each row with its time', () => {
    render(
      <DoneForYou
        rows={[
          {
            key: 'a',
            kind: 'price',
            text: 'Published 5 prices a second fan confirmed',
            at: '2026-11-12T10:41:00.000Z',
          },
        ]}
      />,
    );
    expect(screen.getByText(copy.doneForYou.title)).toBeTruthy();
    expect(
      screen.getByText('Published 5 prices a second fan confirmed'),
    ).toBeTruthy();
    expect(screen.getByText('3:41 AM')).toBeTruthy();
  });

  it('says so when the night was quiet', () => {
    render(<DoneForYou rows={[]} />);
    expect(screen.getByText(copy.doneForYou.empty)).toBeTruthy();
  });

  it('says it could not load, never a quiet night, when the read failed', () => {
    render(<DoneForYou rows={null} />);
    expect(screen.getByText(copy.doneForYou.failed)).toBeTruthy();
    expect(screen.queryByText(copy.doneForYou.empty)).toBeNull();
  });
});

describe('<SiteCard />', () => {
  const delivery = {
    lastSentAt: '2026-11-12T15:02:00.000Z',
    sent: 12,
    failed: 0,
    suppressed: 0,
    other: 0,
    hours: 24,
  };

  it('shows emails sending with the last time', () => {
    render(<SiteCard delivery={delivery} />);
    expect(screen.getByText(copy.site.sending)).toBeTruthy();
    // `03/health-desktop`'s Emails row, on the shared StatusBadge.
    expect(screen.getByText('Resend · last sent 8:02 AM')).toBeTruthy();
    const row = screen.getByTestId('site-card-emails');
    expect(row.style.padding).toBe('8px 0');
    expect(screen.getByText(copy.site.sending).style.borderRadius).toBe(
      '999px',
    );
  });

  it('shows failures first, and a quiet window as quiet', () => {
    render(<SiteCard delivery={{ ...delivery, failed: 2 }} />);
    expect(screen.getByText('2 failed')).toBeTruthy();
    cleanup();
    render(
      <SiteCard
        delivery={{ ...delivery, lastSentAt: null, sent: 0, failed: 0 }}
      />,
    );
    expect(screen.getByText(copy.site.quiet)).toBeTruthy();
    expect(screen.getByText('Resend · none sent in 24 h')).toBeTruthy();
  });
});

describe('emailState', () => {
  const base = {
    lastSentAt: null,
    sent: 0,
    failed: 0,
    suppressed: 0,
    other: 0,
    hours: 24,
  };
  it.each([
    [{ ...base, sent: 3, failed: 1 }, 'danger', '1 failed'],
    [{ ...base, sent: 3 }, 'success', 'Sending'],
    [base, 'neutral', 'Quiet'],
  ] as const)('reads %o as %s', (delivery, kind, label) => {
    expect(emailState(delivery)).toEqual({ kind, label });
  });
});
