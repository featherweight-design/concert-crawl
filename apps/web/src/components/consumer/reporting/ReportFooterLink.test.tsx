// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReportFooterLink } from './ReportFooterLink';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.reportFooterLink;

describe('ReportFooterLink', () => {
  afterEach(cleanup);

  it('leaves the accessible name alone when signed in', () => {
    render(<ReportFooterLink liveStatus={null} onOpen={vi.fn()} />);

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(null);
  });

  it('announces the sign-up gate on the no-status row', () => {
    render(<ReportFooterLink liveStatus={null} onOpen={vi.fn()} signedOut />);

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOut }),
    ).toBeTruthy();
    // Announced, not drawn: the visible copy is unchanged.
    expect(screen.getByText(copy.title)).toBeTruthy();
  });

  it('announces the sign-up gate on the has-status row', () => {
    render(
      <ReportFooterLink liveStatus="sold-out" onOpen={vi.fn()} signedOut />,
    );

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOutHasStatus }),
    ).toBeTruthy();
    expect(screen.getByText(copy.titleHasStatus)).toBeTruthy();
  });

  it('keeps the status card as it was when no overrides are passed', () => {
    const { container } = render(
      <ReportFooterLink liveStatus={null} onOpen={vi.fn()} />,
    );

    expect(screen.getByText(copy.title)).toBeTruthy();
    expect(screen.getByText(copy.subtitle)).toBeTruthy();
    expect(screen.getByText(copy.bottomNote)).toBeTruthy();
    // No tile, no chip: the chevron stays and the card is at rest.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('button').hasAttribute('data-reported')).toBe(
      false,
    );
  });

  describe("as another surface's card", () => {
    const props = {
      onOpen: vi.fn(),
      icon: <svg data-testid="tile-icon" />,
      title: 'Wrong artist?',
      subtitle: 'Photo or music from a different Puma Blue? Let us know.',
      footnote: 'A person checks every report.',
      ariaSignedOut: 'Wrong artist? Sign up to report',
    };
    const chip = 'UNDER REVIEW';

    it('takes its own words, tile and footnote', () => {
      render(<ReportFooterLink {...props} />);

      expect(screen.getByText('Wrong artist?')).toBeTruthy();
      expect(screen.getByText(props.subtitle)).toBeTruthy();
      expect(screen.getByText(props.footnote)).toBeTruthy();
      expect(screen.getByTestId('tile-icon')).toBeTruthy();
      // The eyebrow is the event card's, reused.
      expect(screen.getByText(copy.eyebrow)).toBeTruthy();
      expect(screen.queryByText(copy.title)).toBe(null);
      expect(screen.queryByText(chip)).toBe(null);
    });

    it('announces its own gate when signed out', () => {
      render(<ReportFooterLink {...props} signedOut />);

      expect(
        screen.getByRole('button', { name: props.ariaSignedOut }),
      ).toBeTruthy();
    });

    it('draws the reported state: dashed border and a chip for the chevron', () => {
      const { container } = render(
        <ReportFooterLink {...props} reportedChip={chip} />,
      );

      expect(screen.getByText(chip)).toBeTruthy();
      expect(screen.getByRole('button').getAttribute('data-reported')).toBe(
        'true',
      );
      // Only the tile icon is left: the chevron svg is gone.
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    it('still opens when reported', () => {
      const onOpen = vi.fn();
      render(
        <ReportFooterLink {...props} onOpen={onOpen} reportedChip={chip} />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });
});
