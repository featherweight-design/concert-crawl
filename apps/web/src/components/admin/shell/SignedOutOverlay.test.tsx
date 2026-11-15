// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SignedOutOverlay } from './SignedOutOverlay';

describe('SignedOutOverlay', () => {
  afterEach(cleanup);

  it('is a modal alert dialog with the title, the body and one action', () => {
    render(<SignedOutOverlay onSignIn={vi.fn()} />);
    const dialog = screen.getByRole('alertdialog', {
      name: ADMIN_COPY.states.signedOut.title,
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      ADMIN_COPY.states.signedOut.body,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('draws the board: a 360px card, a 42px button, a scrim over everything', () => {
    render(<SignedOutOverlay onSignIn={vi.fn()} />);
    expect(screen.getByTestId('admin-signed-out-overlay')).toHaveStyle({
      position: 'fixed',
      zIndex: '110',
    });
    expect(screen.getByRole('alertdialog')).toHaveStyle({ maxWidth: '360px' });
    expect(
      screen.getByRole('button', { name: ADMIN_COPY.states.signedOut.signIn }),
    ).toHaveStyle({ height: '42px' });
  });

  it('runs the sign-in action from its button', () => {
    const onSignIn = vi.fn();
    render(<SignedOutOverlay onSignIn={onSignIn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed: Escape leaves it on screen', () => {
    render(<SignedOutOverlay onSignIn={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
