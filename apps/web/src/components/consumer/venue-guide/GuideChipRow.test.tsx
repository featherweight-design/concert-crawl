// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GuideChipRow } from './GuideChipRow';

afterEach(cleanup);

describe('GuideChipRow', () => {
  it('carries no border class or inline border on the row', () => {
    const { getByTestId } = render(
      <GuideChipRow chipType="parking" body="Paid lots along Lincoln." />,
    );
    const row = getByTestId('guide-chip-parking');
    expect(row.className).not.toMatch(/border-t/);
    expect(row.className).not.toMatch(/\bborder\b/);
    expect(row.style.border).toBe('');
    expect(row.style.borderTop).toBe('');
  });
});
