// @vitest-environment jsdom

import type { ArtistInfoSummary } from '@concert-crawl/types';
import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { AboutBlock } from './AboutBlock';
import { ARTIST_COPY } from './definitions/copy';

afterEach(cleanup);

const summary: ArtistInfoSummary = {
  extract: 'A band from Denver.',
  articleTitle: 'Nightjar Choir',
  articleUrl: 'https://en.wikipedia.org/wiki/Nightjar_Choir',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};
const facts = [
  { label: ARTIST_COPY.about.typeLabel, value: 'Band' },
  { label: ARTIST_COPY.about.fromLabel, value: 'Denver' },
];

describe('AboutBlock', () => {
  it('draws the fact rows and the summary whole with both attribution links', () => {
    const { getByTestId, getAllByTestId } = render(
      <AboutBlock facts={facts} summary={summary} />,
    );
    expect(getAllByTestId('about-fact')).toHaveLength(2);
    expect(getByTestId('about-summary').textContent).toBe(summary.extract);
    const block = getByTestId('about-block');
    const hrefs = Array.from(block.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toEqual([summary.articleUrl, summary.licenseUrl]);
    expect(block.textContent).toContain('Wikipedia ↗');
  });

  it('drops a missing fact row', () => {
    const { getAllByTestId } = render(
      <AboutBlock facts={facts.slice(0, 1)} summary={null} />,
    );
    expect(getAllByTestId('about-fact')).toHaveLength(1);
  });

  it('draws the summary alone when there are no facts', () => {
    const { queryAllByTestId, getByTestId } = render(
      <AboutBlock facts={[]} summary={summary} />,
    );
    expect(queryAllByTestId('about-fact')).toHaveLength(0);
    expect(getByTestId('about-summary')).toBeTruthy();
  });

  it('draws nothing with no facts and no summary', () => {
    const { container } = render(<AboutBlock facts={[]} summary={null} />);
    expect(container.firstChild).toBeNull();
  });
});
