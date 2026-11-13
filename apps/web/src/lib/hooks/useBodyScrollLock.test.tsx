// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  bodyScrollLockCount,
  lockBodyScroll,
  useBodyScrollLock,
} from './useBodyScrollLock';

const Locker = ({ active }: { active: boolean }) => {
  useBodyScrollLock(active);
  return null;
};

const html = () => document.documentElement;

const setScrollY = (value: number) =>
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value,
  });

afterEach(() => {
  cleanup();
  setScrollY(0);
  html().style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  vi.restoreAllMocks();
});

describe('useBodyScrollLock', () => {
  it('hides the page overflow while active and restores it on close', () => {
    document.body.style.overflow = 'clip';
    const { rerender } = render(<Locker active={false} />);
    expect(html().style.overflow).toBe('');
    rerender(<Locker active />);
    expect(html().style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Locker active={false} />);
    expect(html().style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('clip');
    expect(bodyScrollLockCount()).toBe(0);
  });

  // A sheet opened from a sheet: closing the inner one must not unlock the
  // page under the outer one, and the page gets its own value back, never
  // the `hidden` the first lock set.
  it('ref counts stacked surfaces and unlocks on the last release', () => {
    const outer = render(<Locker active />);
    const inner = render(<Locker active />);
    expect(bodyScrollLockCount()).toBe(2);
    inner.unmount();
    expect(bodyScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    outer.unmount();
    expect(bodyScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
    expect(html().style.overflow).toBe('');
  });

  it('releases each lock once, so a double cleanup cannot steal a count', () => {
    const first = lockBodyScroll();
    const second = lockBodyScroll();
    first();
    first();
    expect(bodyScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    second();
    expect(bodyScrollLockCount()).toBe(0);
  });

  it('puts a moved scroll offset back on the same URL', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(240);
    const release = lockBodyScroll();
    setScrollY(0);
    release();
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });

  // A row in a sheet that navigates: the new page keeps its own top.
  it('leaves the offset alone when the URL changed while locked', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(240);
    const release = lockBodyScroll();
    window.history.pushState({}, '', '/elsewhere');
    setScrollY(0);
    release();
    expect(scrollTo).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });
});
