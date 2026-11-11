// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { qrPath } from '@/lib/poster/poster-rule';
import { PosterSheet } from './PosterSheet';

const JOIN_URL = 'HTTPS://CONCERTCRAWL.APP/I/BETA-7K2M-Q9XD';

const renderSheet = (props: Partial<Parameters<typeof PosterSheet>[0]> = {}) =>
  render(
    <PosterSheet
      url={JOIN_URL}
      typedUrl="concertcrawl.app/i"
      code="BETA-7K2M-Q9XD"
      qr={qrPath(JOIN_URL)}
      seats={50}
      venueCount={21}
      venueNames={['Bluebird Theater', 'Ogden Theatre']}
      moreVenues
      {...props}
    />,
  );

describe('PosterSheet', () => {
  afterEach(cleanup);

  it('is Night without tabs by default, with a 4.5 in QR', () => {
    renderSheet();
    const sheet = screen.getByTestId('poster-sheet');
    expect(sheet).toHaveClass('night');
    expect(sheet).not.toHaveClass('has-tabs');
    expect(sheet).toHaveAttribute('data-look', 'night');
    expect(screen.queryByTestId('poster-tabs')).toBeNull();
    const qr = screen.getByTestId('poster-qr');
    expect(qr).toHaveAttribute('data-inches', '4.5');
    expect(qr).toHaveAttribute('width', '432');
  });

  it('draws Paper with the halo as two rings', () => {
    const { container } = renderSheet({ look: 'paper' });
    const sheet = screen.getByTestId('poster-sheet');
    expect(sheet).toHaveClass('paper');
    expect(sheet).toHaveAttribute('data-look', 'paper');
    expect(container.querySelectorAll('.ps-ring')).toHaveLength(2);
    expect(container.querySelectorAll('.ps-halo')).toHaveLength(0);
    expect(container.querySelectorAll('.ps-trail')).toHaveLength(7);
  });

  it.each(['night', 'paper'] as const)(
    'adds nine tear-off tabs to %s and shrinks the QR to 3.5 in',
    (look) => {
      renderSheet({ look, tabs: true });
      const sheet = screen.getByTestId('poster-sheet');
      expect(sheet).toHaveClass(look, 'has-tabs');
      expect(sheet).toHaveAttribute('data-tabs', 'true');
      const tabs = screen.getByTestId('poster-tabs').children;
      expect(tabs).toHaveLength(9);
      expect(tabs[0]).toHaveTextContent('concertcrawl.app/iBETA-7K2M-Q9XD');
      const qr = screen.getByTestId('poster-qr');
      expect(qr).toHaveAttribute('data-inches', '3.5');
      expect(qr).toHaveAttribute('width', '336');
    },
  );

  it('ends a cut venue line with "and more", and a full one without', () => {
    renderSheet();
    expect(screen.getByTestId('poster-venues')).toHaveTextContent(
      /^Bluebird Theater·Ogden Theatre·and more$/,
    );
    cleanup();
    renderSheet({ moreVenues: false });
    expect(screen.getByTestId('poster-venues')).not.toHaveTextContent(
      'and more',
    );
  });

  it('draws black modules on a white ground, with the code as its name', () => {
    renderSheet();
    const qr = screen.getByRole('img', {
      name: 'QR code for invite BETA-7K2M-Q9XD',
    });
    expect(qr.querySelector('rect')).toHaveAttribute('fill', '#fff');
    expect(qr.querySelector('path')).toHaveAttribute('fill', '#000');
  });

  it.each([
    [1, 'We check 1 venue calendar every night'],
    [0, 'We check venue calendars every night'],
  ])('words the sub for %i venues', (venueCount, sub) => {
    renderSheet({ venueCount });
    expect(screen.getByTestId('poster-sheet')).toHaveTextContent(sub);
  });

  it('draws no venue line when there are no names', () => {
    renderSheet({ venueNames: [], moreVenues: false });
    expect(screen.queryByTestId('poster-venues')).toBeNull();
  });

  it('carries the copy and no launch date', () => {
    renderSheet({ tabs: true });
    const text = screen.getByTestId('poster-sheet').textContent ?? '';
    expect(text).toContain('Every Denver show. One list.');
    expect(text).toContain('We check 21 venue calendars every night');
    expect(text).toContain('This poster lets in 50 testers.');
    expect(text).toContain('Not affiliated with the venues listed.');
    expect(text).not.toMatch(/\b20\d\d\b/);
    expect(text).not.toMatch(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d/i,
    );
    expect(text).not.toMatch(/\b(spring|summer|fall|autumn|winter)\b/i);
    expect(text).not.toContain('—');
  });
});
