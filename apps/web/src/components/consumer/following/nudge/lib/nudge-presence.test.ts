import { describe, expect, it, vi } from 'vitest';

import { holdFollowNudgeOpen, whenFollowNudgeClosed } from './nudge-presence';

describe('nudge presence', () => {
  it('runs at once when no nudge is open, and hands back no cancel', () => {
    const run = vi.fn();
    expect(whenFollowNudgeClosed(run)).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('waits for the last open nudge to close', () => {
    const releaseA = holdFollowNudgeOpen();
    const releaseB = holdFollowNudgeOpen();
    const run = vi.fn();
    whenFollowNudgeClosed(run);

    releaseA();
    expect(run).not.toHaveBeenCalled();
    releaseB();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs only the newest wait, so two buttons never stack two sheets', () => {
    const release = holdFollowNudgeOpen();
    const older = vi.fn();
    const newer = vi.fn();
    whenFollowNudgeClosed(older);
    whenFollowNudgeClosed(newer);
    release();
    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledTimes(1);
  });

  it('keeps a throwing wait out of the caller', () => {
    const release = holdFollowNudgeOpen();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    whenFollowNudgeClosed(() => {
      throw new Error('boom');
    });
    expect(() => release()).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a cancelled wait never runs, and a double release counts once', () => {
    const release = holdFollowNudgeOpen();
    const run = vi.fn();
    const cancel = whenFollowNudgeClosed(run);
    cancel?.();
    release();
    release();
    expect(run).not.toHaveBeenCalled();

    const after = vi.fn();
    whenFollowNudgeClosed(after);
    expect(after).toHaveBeenCalledTimes(1);
  });
});
