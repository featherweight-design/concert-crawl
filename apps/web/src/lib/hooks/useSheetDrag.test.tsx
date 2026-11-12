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
import {
  DISMISS_DISTANCE_PX,
  shouldDismiss,
  useSheetDrag,
} from './useSheetDrag';

// jsdom has no PointerEvent, and React reads pointerId, pointerType and
// clientY off the native event.
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

const stubViewport = (phone: boolean) => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    // Only the sheet query matches; reduced motion stays off.
    matches: phone && query.includes('max-width: 639px'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

const Harness = ({ onDismiss }: { onDismiss: () => void }) => {
  const drag = useSheetDrag(onDismiss);
  return (
    <div
      data-testid="sheet"
      style={drag.sheetStyle}
      onTransitionEnd={drag.onSheetTransitionEnd}
    >
      <div data-testid="zone" {...drag.zoneProps} />
    </div>
  );
};

const drag = (to: number, from = 0) => {
  const zone = screen.getByTestId('zone');
  fireEvent.pointerDown(zone, { pointerId: 1, clientY: from });
  fireEvent.pointerMove(zone, { pointerId: 1, clientY: to });
  return zone;
};

beforeEach(() => stubViewport(true));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('shouldDismiss', () => {
  it('goes past the distance whatever the speed', () => {
    expect(shouldDismiss(DISMISS_DISTANCE_PX, 5000)).toBe(true);
  });

  it('goes on a short quick flick, not on a short slow drag', () => {
    expect(shouldDismiss(50, 40)).toBe(true);
    expect(shouldDismiss(50, 400)).toBe(false);
  });

  it('never goes on a nudge, however fast', () => {
    expect(shouldDismiss(20, 1)).toBe(false);
  });
});

describe('useSheetDrag', () => {
  it('follows the finger down, then dismisses past the distance', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const zone = drag(160);
    expect(screen.getByTestId('sheet').style.transform).toBe(
      'translateY(160px)',
    );
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 160 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('sheet').style.transform).toBe('');
  });

  it('settles back, without dismissing, on a short slow drag', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(900);
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const zone = drag(30);
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 30 });
    expect(onDismiss).not.toHaveBeenCalled();
    // Settling back to rest, then idle once the transition ends.
    expect(screen.getByTestId('sheet').style.transform).toBe('translateY(0px)');
    fireEvent.transitionEnd(screen.getByTestId('sheet'));
    expect(screen.getByTestId('sheet').style.transform).toBe('');
  });

  it('leaves a tap alone', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const zone = drag(3);
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 3 });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('sheet').style.transform).toBe('');
  });

  it('ignores an upward drag', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const zone = drag(-120, 200);
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: -120 });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('sheet').style.transform).toBe('');
  });

  it('does nothing from the sm breakpoint up, where the sheet is a modal', () => {
    stubViewport(false);
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const zone = drag(200);
    fireEvent.pointerUp(zone, { pointerId: 1, clientY: 200 });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('sheet').style.transform).toBe('');
  });

  it('keeps the touch for itself in the grab zone only', () => {
    render(<Harness onDismiss={vi.fn()} />);
    expect(screen.getByTestId('zone').style.touchAction).toBe('none');
    expect(screen.getByTestId('sheet').style.touchAction).toBe('');
  });
});
