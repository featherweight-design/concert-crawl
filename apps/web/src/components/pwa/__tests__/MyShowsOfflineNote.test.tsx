// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MyShowsOfflineNote } from '../MyShowsOfflineNote';
import { OFFLINE_COPY } from '../definitions/copy';

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
};

afterEach(() => {
  cleanup();
  setOnline(true);
});

describe('MyShowsOfflineNote', () => {
  it('renders nothing online', () => {
    setOnline(true);
    const { container } = render(<MyShowsOfflineNote />);
    expect(container.innerHTML).toBe('');
  });

  it('says the account needs a connection, offline', () => {
    setOnline(false);
    render(<MyShowsOfflineNote />);
    expect(screen.getByRole('status').textContent).toBe(
      OFFLINE_COPY.fallback.authNote,
    );
  });
});
