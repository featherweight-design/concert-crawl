// @vitest-environment jsdom

import '@testing-library/jest-dom';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordsStartLabel } from '@concert-crawl/types';

import { HISTORY_COPY } from './definitions/copy';
import { AddShowRow } from './AddShowRow';

afterEach(cleanup);

describe('AddShowRow', () => {
  it('names how far back the records go from the shared label', () => {
    render(<AddShowRow onOpen={vi.fn()} />);
    expect(screen.getByTestId('add-show-row')).toHaveTextContent(
      HISTORY_COPY.addRow.sub(recordsStartLabel()),
    );
  });

  it('asks to open the sheet on tap', () => {
    const onOpen = vi.fn();
    render(<AddShowRow onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('add-show-row'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
