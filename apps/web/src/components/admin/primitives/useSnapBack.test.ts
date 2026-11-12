// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSnapBack } from './useSnapBack';

describe('useSnapBack', () => {
  it('keeps a value that saved', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSnapBack<string>('beta', persist));
    await act(() => result.current.save('everyone'));
    expect(result.current.value).toBe('everyone');
    expect(result.current.failed).toBeNull();
  });

  it('shows the new value while saving', async () => {
    let finish: () => void = () => {};
    const persist = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const { result } = renderHook(() => useSnapBack<string>('beta', persist));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.save('me');
    });
    expect(result.current.value).toBe('me');
    expect(result.current.saving).toBe(true);
    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.saving).toBe(false);
  });

  it('snaps back to what is really saved when the save fails', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useSnapBack<string>('beta', persist));
    await act(() => result.current.save('everyone'));
    expect(result.current.value).toBe('beta');
    expect(result.current.failed).toEqual({
      attempted: 'everyone',
      saved: 'beta',
    });
  });

  it('retries the failed value', async () => {
    const persist = vi
      .fn()
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSnapBack<number>(10, persist));
    await act(() => result.current.save(20));
    await act(() => result.current.retry());
    expect(persist).toHaveBeenLastCalledWith(20);
    expect(result.current.value).toBe(20);
    expect(result.current.failed).toBeNull();
  });

  it('takes a fresh server value as the truth', () => {
    const persist = vi.fn();
    const { result, rerender } = renderHook(
      ({ saved }) => useSnapBack(saved, persist),
      { initialProps: { saved: 'off' } },
    );
    rerender({ saved: 'beta' });
    expect(result.current.value).toBe('beta');
  });
});
