import { describe, expect, it, vi } from 'vitest';

import { holdFollowNudgeOpen, whenFollowNudgeClosed } from './nudge-presence';

describe('nudge presence', () => {
  it('runs at once when no nudge is open', () => {
    const run = vi.fn();
    whenFollowNudgeClosed(run);
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

  it('a cancelled wait never runs, and a double release counts once', () => {
    const release = holdFollowNudgeOpen();
    const run = vi.fn();
    const cancel = whenFollowNudgeClosed(run);
    cancel();
    release();
    release();
    expect(run).not.toHaveBeenCalled();

    const after = vi.fn();
    whenFollowNudgeClosed(after);
    expect(after).toHaveBeenCalledTimes(1);
  });
});
