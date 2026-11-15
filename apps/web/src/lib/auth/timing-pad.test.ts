import { afterEach, describe, expect, it, vi } from 'vitest';
import { FLOOR_MS, held } from './timing-pad';

afterEach(() => vi.useRealTimers());

describe('held', () => {
  it('holds a fast answer until the floor', async () => {
    vi.useFakeTimers();
    let resolved = false;
    void held(Date.now()).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(FLOOR_MS - 1);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it('never delays an answer that is already past the floor', async () => {
    vi.useFakeTimers();
    const since = Date.now();
    await vi.advanceTimersByTimeAsync(FLOOR_MS + 600);
    let resolved = false;
    void held(since).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it('takes its own floor', async () => {
    vi.useFakeTimers();
    let resolved = false;
    void held(Date.now(), 1500).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(1499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});
