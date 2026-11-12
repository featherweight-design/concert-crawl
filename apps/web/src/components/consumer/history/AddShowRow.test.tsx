// @vitest-environment jsdom

import '@testing-library/jest-dom';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordsStartLabel } from '@concert-crawl/types';

vi.mock('./AddShowSheet', () => ({
  AddShowSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-sheet" /> : null,
}));

import { HISTORY_COPY } from './definitions/copy';
import { AddShowRow } from './AddShowRow';

afterEach(cleanup);

describe('AddShowRow', () => {
  it('names how far back the records go from the shared label', () => {
    render(<AddShowRow />);
    expect(screen.getByTestId('add-show-row')).toHaveTextContent(
      HISTORY_COPY.addRow.sub(recordsStartLabel()),
    );
  });

  it('opens the sheet on tap', () => {
    render(<AddShowRow />);
    expect(screen.queryByTestId('add-sheet')).toBeNull();
    fireEvent.click(screen.getByTestId('add-show-row'));
    expect(screen.getByTestId('add-sheet')).toBeInTheDocument();
  });
});
