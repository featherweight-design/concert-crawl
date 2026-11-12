// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  FilterBarPreview,
  HEADING_ACCENT_STYLE,
  HEADING_EYEBROW_STYLE,
  HeadingTitleText,
  filterChipStyle,
} from './chrome';

const title = CONSUMER_COPY.filterBar.headingTitle;

// Every Browse board (`browse-active-320`, `shelf-see-all-m`, `bp-browse`)
// draws "on?" in linear-gradient(90deg, signal, accent) clipped to the text.
describe('HeadingTitleText', () => {
  it('puts the last word in the signal-to-accent gradient', () => {
    render(
      <h1>
        <HeadingTitleText title={title} />
      </h1>,
    );
    const accent = screen.getByTestId('heading-accent');
    expect(accent.textContent).toBe('on?');
    expect(HEADING_ACCENT_STYLE.background).toBe(
      'linear-gradient(90deg, var(--signal), var(--accent))',
    );
    expect(HEADING_ACCENT_STYLE.backgroundClip).toBe('text');
    expect(HEADING_ACCENT_STYLE.color).toBe('transparent');
  });

  it('keeps the heading one phrase', () => {
    render(
      <h1>
        <HeadingTitleText title={title} />
      </h1>,
    );
    expect(screen.getByRole('heading').textContent).toBe(title);
  });

  it('leaves a one-word title plain', () => {
    render(
      <h1>
        <HeadingTitleText title="Shows" />
      </h1>,
    );
    expect(screen.queryByTestId('heading-accent')).toBeNull();
  });

  it('spaces the DENVER eyebrow at the board 0.14em', () => {
    expect(HEADING_EYEBROW_STYLE.letterSpacing).toBe('0.14em');
  });

  it('draws the gradient on the first-load preview too', () => {
    render(<FilterBarPreview />);
    expect(screen.getByTestId('heading-accent').textContent).toBe('on?');
  });
});

// `browse-active-320`: an active chip is #171D3A (s2) with a #2C3661
// (border-strong) hairline. A solid colour chip means a status or a price.
describe('filterChipStyle', () => {
  it('draws an active chip neutral, never a signal fill', () => {
    const style = filterChipStyle(true);
    expect(style.background).toBe('var(--surface-2)');
    expect(style.borderColor).toBe('var(--border-strong)');
    expect(style.color).toBe('var(--fg)');
    expect(JSON.stringify(style)).not.toContain('--signal');
  });

  it('leaves the resting chip on surface-1 with the plain border', () => {
    const style = filterChipStyle(false);
    expect(style.background).toBe('var(--surface-1)');
    expect(style.borderColor).toBe('var(--border)');
  });
});
