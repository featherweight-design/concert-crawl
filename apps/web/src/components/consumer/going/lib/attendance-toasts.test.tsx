import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast, type ExternalToast } from 'sonner';
import {
  ATTENDANCE_TOAST_MS,
  showAttendanceError,
  showRemovedToast,
} from './attendance-toasts';
import { actionToastOptions } from '@/lib/action-toast';
import { GOING_COPY } from '../definitions/copy';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

type ToastAction = Extract<ExternalToast['action'], { onClick: unknown }>;

const isAction = (value: unknown): value is ToastAction =>
  typeof value === 'object' && value !== null && 'onClick' in value;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('showRemovedToast', () => {
  it('says the artist is out, for six seconds, with an Undo that calls back once', () => {
    const onUndo = vi.fn();
    showRemovedToast({ artist: 'Wednesday', onUndo });

    expect(toast).toHaveBeenCalledTimes(1);
    const [message, options] = vi.mocked(toast).mock.calls[0] ?? [];
    expect(message).toBe('Wednesday is out of your Concerts.');
    expect(options?.duration).toBe(ATTENDANCE_TOAST_MS);
    expect(ATTENDANCE_TOAST_MS).toBe(6000);
    expect(options?.action).toMatchObject({ label: GOING_COPY.toast.undo });

    const action = options?.action;
    if (!isAction(action)) throw new Error('expected an Undo action');
    action.onClick({} as never);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('wears the shared action-toast style, so Undo is cyan like every action', () => {
    showRemovedToast({ artist: 'Wednesday', onUndo: vi.fn() });

    const [, options] = vi.mocked(toast).mock.calls[0] ?? [];
    expect(options?.style).toBe(actionToastOptions.style);
    expect(options?.actionButtonStyle).toBe(
      actionToastOptions.actionButtonStyle,
    );
  });

  it('carries no Undo when there is nothing to restore', () => {
    showRemovedToast({ artist: 'Wednesday', onUndo: null });

    const [, options] = vi.mocked(toast).mock.calls[0] ?? [];
    expect(options?.action).toBeUndefined();
  });
});

describe('showAttendanceError', () => {
  it.each([
    ['save', GOING_COPY.toast.saveFailed],
    ['undo', GOING_COPY.toast.undoFailed],
  ] as const)('raises the %s failure', (kind, text) => {
    showAttendanceError(kind);
    expect(toast.error).toHaveBeenCalledWith(text, { id: 'attendance' });
  });

  it('gives every attendance toast one id, so a new one replaces the last', () => {
    showRemovedToast({ artist: 'Wednesday', onUndo: null });
    showAttendanceError('save');

    const [, options] = vi.mocked(toast).mock.calls[0] ?? [];
    expect(options?.id).toBe('attendance');
    expect(vi.mocked(toast.error).mock.calls[0]?.[1]).toMatchObject({
      id: 'attendance',
    });
  });
});
