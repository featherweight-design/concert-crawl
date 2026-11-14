// @vitest-environment jsdom

import '@testing-library/jest-dom';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OVERLAY_COPY } from '@/components/ui/cc-overlay/definitions/copy';
import { BottomSheet } from './BottomSheet';

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

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: query.includes('max-width: 1023px'),
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

const closeButton = () =>
  screen.getByRole('button', { name: OVERLAY_COPY.close });

describe('BottomSheet drag-down dismiss', () => {
  it('closes when the close row is dragged down past the distance', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Share">
        <p>body</p>
      </BottomSheet>,
    );
    // The close button sits in the grab zone: a drag that starts on it.
    const zone = closeButton().parentElement;
    expect(zone).not.toBeNull();
    if (zone === null) return;
    fireEvent.pointerDown(zone, { pointerId: 1, clientY: 0 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientY: 160 });
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 160 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('still closes on a plain tap of the close button, and only once', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Share">
        <p>body</p>
      </BottomSheet>,
    );
    const button = closeButton();
    fireEvent.pointerDown(button, { pointerId: 1, clientY: 10 });
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 10 });
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a short, slow nudge', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(900);
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Share">
        <p>body</p>
      </BottomSheet>,
    );
    const zone = closeButton().parentElement;
    if (zone === null) throw new Error('close row missing');
    fireEvent.pointerDown(zone, { pointerId: 1, clientY: 0 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientY: 30 });
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 30 });
    expect(onClose).not.toHaveBeenCalled();
  });
});
