// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import AdminError from './error';

afterEach(cleanup);

describe('admin error boundary', () => {
  it("renders Couldn't load in the content area, with a way out", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(
      <AdminError
        error={Object.assign(new Error('boom'), { digest: 'd1' })}
        reset={reset}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load");
    expect(screen.getByRole('link', { name: 'Open Health' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(screen.getByText('Error ID: d1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('is only the content: no nav or heading chrome of its own', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <AdminError error={new Error('boom')} reset={vi.fn()} />,
    );
    expect(container.querySelector('nav, aside, header')).toBeNull();
  });
});
