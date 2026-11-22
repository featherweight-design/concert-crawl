// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FEEDBACK_DRAFT_KEY } from '@/lib/feedback-draft';
import {
  FEEDBACK_SCREENSHOT_TYPES,
  MAX_FEEDBACK_SCREENSHOT_BYTES,
} from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('tok') }),
  useUser: () => ({ user: null }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/browse',
}));
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}));

import { FeedbackModal } from './FeedbackModal';

const MODAL = CONSUMER_COPY.feedback.modal;

// ── Helpers ────────────────────────────────────────────────────────────────

function fillCategoryAndMessage(
  message: string,
  category: string = MODAL.categories.bug,
): void {
  const categoryBtn = screen.getByRole('button', {
    name: category,
    pressed: false,
  });
  fireEvent.click(categoryBtn);
  const textarea = screen.getByRole('textbox');
  fireEvent.change(textarea, { target: { value: message } });
}

async function submitAndWait(): Promise<void> {
  const sendBtn = screen.getAllByRole('button', {
    name: MODAL.footer.submit,
  })[0];
  if (!sendBtn) throw new Error('Send button not found');
  await act(async () => {
    fireEvent.click(sendBtn);
    // Flush the awaited getToken + fetch microtasks.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── Existing smoke tests ───────────────────────────────────────────────────

describe('FeedbackModal — render', () => {
  it('renders the dialog with form content when open', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(MODAL.form.heading)).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<FeedbackModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// ── Regression: #829 — notes preserved on submission error ────────────────

describe('FeedbackModal — send failed keeps the form (#829)', () => {
  it('keeps kind + message under the failed banner and retries the send', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }));
    render(<FeedbackModal open={true} onClose={vi.fn()} />);

    fillCategoryAndMessage('the page wont load');
    await submitAndWait();

    // The banner sits on the form; nothing the fan typed went anywhere.
    expect(screen.getByRole('alert').textContent).toContain(
      MODAL.sendFailed.title,
    );
    const textarea = screen.getByRole('textbox');
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('no box');
    expect(textarea.value).toBe('the page wont load');
    expect(
      screen.getByRole('button', { name: MODAL.categories.bug, pressed: true }),
    ).toBeTruthy();

    // Send became Try again, and it sends again.
    const tryAgain = screen.getByRole('button', {
      name: MODAL.sendFailed.primaryAction,
    });
    await act(async () => {
      fireEvent.click(tryAgain);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText(MODAL.success.heading)).toBeTruthy();
  });
});

describe('FeedbackModal — validation', () => {
  it('never disables Send; marks each missing field and focuses the first', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    await submitAndWait();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(MODAL.errors.categoryRequired)).toBeTruthy();
    expect(screen.getByText(MODAL.errors.messageRequired)).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: MODAL.categories.bug }),
    );
  });

  it('focuses the box when only the message is missing, and clears on typing', async () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: MODAL.categories.idea }),
    );
    await submitAndWait();

    const textarea = screen.getByRole('textbox');
    expect(document.activeElement).toBe(textarea);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByText(MODAL.errors.categoryRequired)).toBeNull();
    fireEvent.change(textarea, { target: { value: 'dark mode please' } });
    expect(screen.queryByText(MODAL.errors.messageRequired)).toBeNull();
  });

  it('labels the box for the picked kind', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    expect(
      screen.getByRole('textbox', { name: MODAL.form.field.none.label }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: MODAL.categories.bug }));
    const box = screen.getByRole('textbox', {
      name: MODAL.form.field.bug.label,
    });
    expect(box.getAttribute('placeholder')).toBe(MODAL.form.field.bug.hint);
  });
});

describe('FeedbackModal — what we send with it', () => {
  it('opens in place to the five fields the request carries', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    const toggle = screen.getByRole('button', {
      name: MODAL.contextDisclosure.toggleLabel,
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const fields = MODAL.contextDisclosure.fields;
    for (const label of [
      fields.page,
      fields.device,
      fields.theme,
      fields.appVersion,
      fields.account,
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('/browse')).toBeTruthy();
  });
});

// ── A4: a failed send saves the draft by itself ────────────────────────────

describe('FeedbackModal — a failed send saves the draft (A4)', () => {
  const draftOf = (): { category: string; message: string } =>
    JSON.parse(localStorage.getItem(FEEDBACK_DRAFT_KEY) ?? '{}') as {
      category: string;
      message: string;
    };

  it('saves the draft the moment the send fails and restores it on reopen', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 500 }),
    );
    const onClose = vi.fn();
    const { rerender } = render(
      <FeedbackModal open={true} onClose={onClose} />,
    );
    fillCategoryAndMessage('save me for later');
    await submitAndWait();

    // Saved before the fan does anything: the banner is already true.
    expect(draftOf()).toMatchObject({
      category: 'bug',
      message: 'save me for later',
    });
    expect(screen.getByText(MODAL.sendFailed.body)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: MODAL.sendFailed.primaryAction }),
    ).toBeTruthy();
    // Try again is the only button: no "Save and come back".
    expect(
      screen.queryByRole('button', { name: /save and come back/i }),
    ).toBeNull();

    rerender(<FeedbackModal open={false} onClose={onClose} />);
    rerender(<FeedbackModal open={true} onClose={onClose} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('save me for later');
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy();
  });

  it('keeps edits made after the failure when the fan closes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 500 }),
    );
    const onClose = vi.fn();
    render(<FeedbackModal open={true} onClose={onClose} />);
    fillCategoryAndMessage('first try');
    await submitAndWait();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'first try, plus more' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(draftOf().message).toBe('first try, plus more');
  });

  it('closing mid-send lets the send finish and saves the draft if it fails (A2)', async () => {
    let fail: (res: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        fail = resolve;
      }),
    );
    const onClose = vi.fn();
    const { rerender } = render(
      <FeedbackModal open={true} onClose={onClose} />,
    );
    fillCategoryAndMessage('sent while leaving');
    await submitAndWait();
    expect(screen.getByText(MODAL.footer.submitting)).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    rerender(<FeedbackModal open={false} onClose={onClose} />);

    await act(async () => {
      fail(new Response('boom', { status: 500 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(draftOf().message).toBe('sent while leaving');

    // The next open lands on the restored form, not a stale failed state.
    rerender(<FeedbackModal open={true} onClose={onClose} />);
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy();
    expect(screen.queryByText(MODAL.sendFailed.body)).toBeNull();
  });

  it('clears the saved draft on successful submission', async () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        category: 'idea',
        message: 'stale draft',
        screenshot: null,
        savedAt: Date.now(),
      }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 201 }),
    );
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy();
    await submitAndWait();

    expect(screen.getByText(MODAL.success.heading)).toBeTruthy();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('discards the saved draft when the user clicks "Discard draft"', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        category: 'idea',
        message: 'no longer relevant',
        screenshot: null,
        savedAt: Date.now(),
      }),
    );
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: /Discard saved draft/i }),
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    expect(screen.queryByText(/Saved draft restored/i)).toBeNull();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  // The banner must never claim a save that failed (quota, private mode):
  // the body swaps to the saveFailed line and the sheet stays open.
  it('swaps the banner body when the automatic save fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 500 }),
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const onClose = vi.fn();
    render(<FeedbackModal open={true} onClose={onClose} />);
    fillCategoryAndMessage('important note');
    await submitAndWait();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(MODAL.draftBanner.saveFailed)).toBeTruthy();
    expect(screen.queryByText(MODAL.sendFailed.body)).toBeNull();
  });
});

// ── The screenshot picker takes only what the API keeps ────────────────────

describe('FeedbackModal — screenshot picker', () => {
  const fileInput = (): HTMLInputElement => {
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    return input;
  };
  const pick = (file: File) =>
    fireEvent.change(fileInput(), { target: { files: [file] } });
  const sizedFile = (bytes: number, type: string): File => {
    const file = new File(['x'], 'shot', { type });
    Object.defineProperty(file, 'size', { value: bytes });
    return file;
  };

  it('offers exactly the allowed types', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    expect(fileInput().accept).toBe(FEEDBACK_SCREENSHOT_TYPES.join(','));
  });

  it('refuses a type the API would drop, and says so', () => {
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    pick(sizedFile(1_000, 'image/svg+xml'));
    expect(screen.getByRole('alert').textContent).toBe(
      MODAL.errors.screenshotWrongType,
    );
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('refuses a file too big for the API, and says so', () => {
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    pick(sizedFile(MAX_FEEDBACK_SCREENSHOT_BYTES + 1, 'image/png'));
    expect(screen.getByRole('alert').textContent).toBe(
      MODAL.errors.screenshotTooBig,
    );
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('reads an allowed file and clears the earlier error', () => {
    const readSpy = vi
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(() => undefined);
    render(<FeedbackModal open={true} onClose={vi.fn()} />);
    pick(sizedFile(1_000, 'image/heic'));
    expect(screen.getByRole('alert')).toBeTruthy();
    pick(sizedFile(MAX_FEEDBACK_SCREENSHOT_BYTES, 'image/gif'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(readSpy).toHaveBeenCalledTimes(1);
  });
});
