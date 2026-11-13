// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  FilterBarPreview,
  HEADING_ACCENT_STYLE,
  HEADING_EYEBROW_STYLE,
  HeadingTitleText,
  phonePillStyle,
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

// `browse-active-320` and `bp-f-filt_m_rest`: a pill at rest sits on the
// elevated fill (Filters) or none (My artists); once on it takes a signal edge
// over an 8% tint, never a solid signal fill.
describe('phonePillStyle', () => {
  it('rests Filters on the elevated fill with the strong border', () => {
    const style = phonePillStyle(false, 'filters');
    expect(style.background).toBe('var(--bg-elevated)');
    expect(style.borderColor).toBe('var(--border-strong)');
    expect(style.paddingInline).toBe(13);
  });

  it('rests My artists on no fill', () => {
    const style = phonePillStyle(false, 'follow');
    expect(style.background).toBe('transparent');
    expect(style.paddingInline).toBe(12);
  });

  it('takes a signal edge over a tint once on, never a solid fill', () => {
    const style = phonePillStyle(true, 'filters');
    expect(style.borderColor).toBe('var(--signal)');
    expect(style.background).toBe(
      'color-mix(in oklab, var(--signal) 8%, transparent)',
    );
  });
});
