// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { DeleteAccountSheet } from './DeleteAccountSheet';

const DANGER_COPY = CONSUMER_COPY.settings.dangerZone;

const mockDeleteAccount = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
  useClerk: () => ({ signOut: async () => undefined }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/users', () => ({
  deleteAccount: (token: string) => mockDeleteAccount(token),
}));

// The phone sheet is the branch this fixes: not a 640px-and-up media match.
beforeEach(() => {
  mockDeleteAccount.mockReset();
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const Harness = ({ onClose }: { onClose: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open the sheet
      </button>
      <DeleteAccountSheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        handle="hugh"
        submissionCount={3}
      />
    </>
  );
};

const openSheet = () => {
  const trigger = screen.getByRole('button', { name: 'Open the sheet' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

describe('DeleteAccountSheet (phone sheet)', () => {
  it('moves focus into the dialog when it opens', () => {
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('closes on Escape and hands focus back to the control that opened it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = openSheet();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside: from the last control it wraps to the first', () => {
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    const dialog = screen.getByRole('dialog');
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled)',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (first === undefined || last === undefined || first === last) {
      throw new Error('the sheet should have more than one control');
    }
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    // Without the trap, Tab from the last control walks out behind the scrim.
    expect(first).toHaveFocus();
  });

  it('ignores Escape while the deletion request is in flight', () => {
    // Never settles: the sheet stays in its deleting state.
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openSheet();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: DANGER_COPY.deleteForeverButton }),
    );
    expect(
      screen.getByRole('button', { name: DANGER_COPY.deletingButton }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('never calls the delete request until DELETE is typed', () => {
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    fireEvent.click(
      screen.getByRole('button', { name: DANGER_COPY.deleteForeverButton }),
    );
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
