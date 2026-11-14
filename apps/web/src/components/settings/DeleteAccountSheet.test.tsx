// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { useState } from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from '@testing-library/react';
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

// jsdom has no PointerEvent, and React reads pointerId and clientY off it.
beforeAll(() => {
  if (typeof window.PointerEvent !== 'undefined') return;
  class PointerEventStub extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'touch';
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventStub,
    configurable: true,
  });
});

// The sheet reads min-width (1024px and up) to pick its layout, and the drag
// hook reads max-width (phone): they are opposites.
const stubViewport = (desktop: boolean) => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    // Only the two layout queries answer true; reduced motion stays off so the
    // animated settle path is the one exercised.
    matches: query.includes('min-width')
      ? desktop
      : query.includes('max-width')
        ? !desktop
        : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

beforeEach(() => {
  mockDeleteAccount.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

// The handle is the sheet's only grab zone: the first div in the dialog.
const dragHandle = () => {
  const handle = screen.getByRole('dialog').querySelector('div');
  if (handle === null) throw new Error('the sheet should have a handle');
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 0 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 180 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 180 });
};

// The two layouts word their delete button differently: the phone sheet names
// the armed state, the desktop dialog keeps one label for both.
describe.each([
  {
    layout: 'phone sheet',
    desktop: false,
    idleLabel: DANGER_COPY.deleteButtonDisabled,
    armedLabel: DANGER_COPY.deleteButtonArmed,
  },
  {
    layout: 'desktop dialog',
    desktop: true,
    idleLabel: DANGER_COPY.deleteForeverButton,
    armedLabel: DANGER_COPY.deleteForeverButton,
  },
])('DeleteAccountSheet ($layout)', ({ desktop, idleLabel, armedLabel }) => {
  beforeEach(() => stubViewport(desktop));

  it('moves focus into the dialog when it opens, then to the confirm input', () => {
    vi.useFakeTimers();
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    expect(screen.getByRole('dialog')).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('textbox')).toHaveFocus();
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

  it('ignores Escape while the deletion request is in flight', async () => {
    // Never settles: the sheet stays in its deleting state.
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openSheet();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: armedLabel }));
    // The request really went out, so this is the in-flight state.
    await waitFor(() =>
      expect(mockDeleteAccount).toHaveBeenCalledWith('token'),
    );
    expect(
      screen.getByRole('button', { name: DANGER_COPY.deletingButton }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is dragged down to dismiss on the phone sheet only', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openSheet();
    dragHandle();
    // The desktop dialog is not a bottom sheet: nothing moves, nothing closes.
    expect(onClose).toHaveBeenCalledTimes(desktop ? 0 : 1);
  });

  it('does not dismiss on a drag while the deletion request is in flight', async () => {
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openSheet();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: armedLabel }));
    await waitFor(() =>
      expect(mockDeleteAccount).toHaveBeenCalledWith('token'),
    );
    dragHandle();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets a long unbroken handle wrap instead of running past the sheet', () => {
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    const handle = screen.getByText('@hugh');
    expect(handle.style.overflowWrap).toBe('anywhere');
  });

  it('never calls the delete request until DELETE is typed', () => {
    render(<Harness onClose={vi.fn()} />);
    openSheet();
    fireEvent.click(screen.getByRole('button', { name: idleLabel }));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
