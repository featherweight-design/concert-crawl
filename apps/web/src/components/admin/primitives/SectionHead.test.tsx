// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHead } from './SectionHead';

describe('SectionHead (#986)', () => {
  it('sets overflowWrap: anywhere on the H1 so long @handles break rather than clip', () => {
    render(
      <SectionHead title="@AReallyLongUnbrokenHandleThatWouldOverflowAt320px" />,
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.style.overflowWrap).toBe('anywhere');
  });

  // Every admin desktop board draws the title 28/800 and the summary 13.5.
  it('draws the title at 28/800 and the summary at 13.5', () => {
    render(<SectionHead title="Health" subtitle="All quiet" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.style.fontSize).toBe('28px');
    expect(heading.style.fontWeight).toBe('800');
    expect(heading.style.letterSpacing).toBe('-0.02em');
    expect(screen.getByText('All quiet').style.fontSize).toBe('13.5px');
  });

  it('gives the title column minWidth: 0 so it can shrink inside the flex row', () => {
    // Without min-width: 0, the flex-child column would size to the H1's
    // widest unbreakable token and pin the row wider than the viewport at
    // 320px, defeating the overflow-wrap rule.
    const { container } = render(<SectionHead title="@handle" />);
    const flexRow = container.firstElementChild as HTMLElement;
    const titleColumn = flexRow.firstElementChild as HTMLElement;
    expect(titleColumn.style.minWidth).toBe('0px');
  });
});
