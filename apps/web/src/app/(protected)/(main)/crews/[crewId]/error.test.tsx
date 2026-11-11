// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CREWS_COPY } from '@/components/consumer/crews';
import CrewError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: () => 'evt' }));

afterEach(() => {
  cleanup();
  document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('CrewError', () => {
  // The crew home boundary catches before the app one, so it has to carry the
  // report itself or a crew page failure could never be told to us.
  it('offers a signed-in member the Tell us card, in the crew wording', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = '__client_uat=1731300000';
    render(<CrewError error={new Error('x')} reset={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: CREWS_COPY.net.errCrewTitle }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
