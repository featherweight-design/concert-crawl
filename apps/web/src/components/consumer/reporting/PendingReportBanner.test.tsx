// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PendingReportBanner } from './PendingReportBanner';
import type { PendingReportBannerProps } from './PendingReportBanner';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.pendingReportBanner;

const baseProps = (
  overrides: Partial<PendingReportBannerProps> = {},
): PendingReportBannerProps => ({
  kind: 'available',
  confirms: 1,
  needed: 2,
  view: 'other',
  reportedAt: new Date().toISOString(),
  evidenceMethod: 'venue_site',
  evidenceUrl: null,
  reporter: { handle: '@fan', url: '' },
  onConfirm: vi.fn(),
  onWithdraw: vi.fn(),
  ...overrides,
});

const withoutMethod = (props: PendingReportBannerProps) => {
  const rest = { ...props };
  delete rest.evidenceMethod;
  return rest;
};

describe('PendingReportBanner, Tickets available', () => {
  afterEach(cleanup);

  it('draws the dashed pending card', () => {
    const { container } = render(<PendingReportBanner {...baseProps()} />);
    const card = container.firstElementChild as HTMLElement;

    expect(card.style.border).toContain('dashed');
    expect(screen.getByText(copy.availableLead)).toBeTruthy();
  });

  it('leaves out the footer question when onSawDifferent is absent', () => {
    render(<PendingReportBanner {...baseProps()} />);

    expect(screen.queryByText(copy.footerQuestion)).toBeNull();
  });

  it('shows the footer question when onSawDifferent is passed', () => {
    render(<PendingReportBanner {...baseProps({ onSawDifferent: vi.fn() })} />);

    expect(screen.getByText(copy.footerQuestion)).toBeTruthy();
  });

  it('links VIEW beside the method when the evidence URL is safe', () => {
    render(
      <PendingReportBanner
        {...baseProps({ evidenceUrl: 'https://venue.example/post' })}
      />,
    );

    expect(screen.getByText('Venue site')).toBeTruthy();
    const link = screen.getByRole('link', { name: copy.viewEvidenceAria });
    expect(link.getAttribute('href')).toBe('https://venue.example/post');
  });

  it('still links VIEW when there is no evidence method', () => {
    render(
      <PendingReportBanner
        {...withoutMethod(
          baseProps({ evidenceUrl: 'https://venue.example/post' }),
        )}
      />,
    );

    expect(
      screen.getByRole('link', { name: copy.viewEvidenceAria }),
    ).toBeTruthy();
  });

  it('draws no link for an unsafe evidence URL', () => {
    render(
      <PendingReportBanner
        {...baseProps({ evidenceUrl: 'javascript:alert(1)' })}
      />,
    );

    expect(screen.queryByRole('link', { name: copy.viewEvidenceAria })).toBe(
      null,
    );
  });
});

// The same one-line layout for every kind (more-st-ev_pending_canc_m,
// more-st-ev_pending_mine_m): the lead, then "Reported by @x · Venue site · VIEW".
describe.each(['cancelled', 'postponed'] as const)(
  'PendingReportBanner, %s',
  (kind) => {
    afterEach(cleanup);

    it('draws one Inter attribution line with the method and VIEW, and no evidence box', () => {
      render(
        <PendingReportBanner
          {...baseProps({
            kind,
            evidenceUrl: 'https://venue.example/post',
            reporter: { handle: '@sami', url: '' },
          })}
        />,
      );
      const line = screen.getByTestId('pending-attribution');
      expect(line).toHaveTextContent('@sami');
      expect(line).toHaveTextContent('Venue site');
      expect(line).toHaveTextContent(copy.viewEvidenceLink);
      // No 9px mono "· 2h ago" tail and no separate evidence card.
      expect(line).not.toHaveTextContent(/\d+[mhd] ago/);
      expect(screen.getByTestId('pending-icon-tile')).toBeTruthy();
    });

    it('sets the status pill as text only, with the 36px radius-12 Confirm', () => {
      const { container } = render(
        <PendingReportBanner
          {...baseProps({ kind, onSawDifferent: vi.fn() })}
        />,
      );
      const pill = screen.getByText(
        kind === 'cancelled' ? copy.cancelledBadge : copy.postponedBadge,
      );
      expect(pill.querySelector('svg')).toBeNull();
      const confirm = screen.getByRole('button', { name: copy.confirmButton });
      expect(confirm.style.height).toBe('36px');
      expect(confirm.style.borderRadius).toBe('12px');
      expect(
        container.querySelector('[data-testid="pending-icon-tile"]'),
      ).not.toBeNull();
    });
  },
);
