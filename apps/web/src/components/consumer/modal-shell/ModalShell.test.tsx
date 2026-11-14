// @vitest-environment jsdom

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalShell } from './ModalShell';

beforeEach(() => {
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

const Header = () => <div>Modal Header</div>;

describe('ModalShell', () => {
  // Triggers sit inside clipping and transformed ancestors — the filter rail
  // scrolls horizontally, and a transformed ancestor makes `position: fixed`
  // resolve against that box, which rendered the gate sheet inside its chip.
  it('escapes its trigger by portalling to the body', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateX(0)' }}>
        <ModalShell open onClose={vi.fn()} ariaLabel="Test">
          <div>Content</div>
        </ModalShell>
      </div>,
    );
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('renders nothing when closed', () => {
    render(
      <ModalShell
        open={false}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with header and children when open', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByText('Modal Header')).toBeTruthy();
  });

  it('applies role and labelledby/describedby overrides, dropping aria-label', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
        role="alertdialog"
        ariaLabelledBy="headline-id"
        ariaDescribedBy="body-id"
      >
        <div>Content</div>
      </ModalShell>,
    );
    const dialog = screen.getByRole('alertdialog');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dialog.getAttribute('aria-label')).toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('headline-id');
    expect(dialog.getAttribute('aria-describedby')).toBe('body-id');
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <ModalShell
        open={true}
        onClose={onClose}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when scrim is clicked', () => {
    const onClose = vi.fn();
    render(
      <ModalShell
        open={true}
        onClose={onClose}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    fireEvent.click(screen.getByTestId('modal-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders no header band when header is omitted', () => {
    render(
      <ModalShell open={true} onClose={vi.fn()} ariaLabel="Test">
        <div>Content</div>
      </ModalShell>,
    );
    const dialog = screen.getByRole('dialog');
    // Only the content wrapper — no empty header container above it.
    expect(dialog.children).toHaveLength(1);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('renders footer when provided', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
        footer={<button>Submit</button>}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('renders no footer section when footer prop is omitted', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

// Addendum 6 item 15: one rule for every sheet. The sheet stops 24px below the
// top of the screen and taller content scrolls inside it; the rail gets a
// hairline once the body scrolls; the pinned footer fades the body above it
// while there is more to scroll.
describe('ModalShell sheet rule (320 x 568)', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  const bodyOf = () => {
    const body = screen.getByText('Content').parentElement;
    if (body === null) throw new Error('no body');
    return body;
  };
  const scrollTo = (
    body: HTMLElement,
    metrics: { scrollTop: number; scrollHeight: number; clientHeight: number },
  ) => {
    for (const [key, value] of Object.entries(metrics)) {
      Object.defineProperty(body, key, { value, configurable: true });
    }
    fireEvent.scroll(body);
  };

  it('caps every sheet 24px below the top and keeps the tall and short floors', () => {
    for (const [height, floor] of [
      ['tall', '85%'],
      ['short', '62%'],
      ['fit', ''],
    ] as const) {
      const { unmount } = render(
        <ModalShell
          open
          onClose={vi.fn()}
          ariaLabel="Test"
          sheetHeight={height}
        >
          <div>Content</div>
        </ModalShell>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog.style.maxHeight).toBe('calc(100% - 24px)');
      expect(dialog.style.minHeight).toBe(floor);
      expect(dialog.style.height).toBe('');
      unmount();
    }
  });

  it('pins a --surface-2 footer, 12px above and 20px plus the safe area below', () => {
    render(
      <ModalShell
        open
        onClose={vi.fn()}
        ariaLabel="Test"
        footer={<button>Go</button>}
      >
        <div>Content</div>
      </ModalShell>,
    );
    const footer = screen.getByTestId('modal-footer');
    expect(footer.style.background).toBe('var(--surface-2)');
    expect(footer.style.padding).toContain('12px');
    expect(footer.style.padding).toContain('20px');
    expect(footer.style.padding).toContain('env(safe-area-inset-bottom)');
  });

  it('keeps the Crews panel colour on the footer', () => {
    render(
      <ModalShell
        open
        onClose={vi.fn()}
        ariaLabel="Test"
        surface="crew"
        footer={<button>Go</button>}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.getByTestId('modal-footer').style.background).not.toBe(
      'var(--surface-2)',
    );
  });

  it('draws a hairline under the rail only once the body has scrolled', () => {
    render(
      <ModalShell open onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    );
    const rail = screen.getByTestId('modal-rail');
    expect(rail.dataset['scrolled']).toBe('false');
    expect(rail.style.borderBottom).toContain('transparent');
    scrollTo(bodyOf(), { scrollTop: 40, scrollHeight: 900, clientHeight: 300 });
    expect(rail.dataset['scrolled']).toBe('true');
    expect(rail.style.borderBottom).toContain('var(--border)');
    scrollTo(bodyOf(), { scrollTop: 0, scrollHeight: 900, clientHeight: 300 });
    expect(rail.dataset['scrolled']).toBe('false');
  });

  it('fades the body above the footer while there is more to scroll, and not at the end', () => {
    render(
      <ModalShell
        open
        onClose={vi.fn()}
        ariaLabel="Test"
        footer={<button>Go</button>}
      >
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.queryByTestId('modal-fade')).toBeNull();
    scrollTo(bodyOf(), { scrollTop: 0, scrollHeight: 900, clientHeight: 300 });
    expect(screen.getByTestId('modal-fade')).toBeTruthy();
    scrollTo(bodyOf(), {
      scrollTop: 600,
      scrollHeight: 900,
      clientHeight: 300,
    });
    expect(screen.queryByTestId('modal-fade')).toBeNull();
  });

  it('draws no fade on a sheet with no footer, there is nothing for it to sit above', () => {
    render(
      <ModalShell open onClose={vi.fn()} ariaLabel="Test">
        <div>Content</div>
      </ModalShell>,
    );
    scrollTo(bodyOf(), { scrollTop: 0, scrollHeight: 900, clientHeight: 300 });
    expect(screen.queryByTestId('modal-fade')).toBeNull();
  });

  it('reopens unscrolled: the rail hairline from the last scroll does not carry over', () => {
    const { rerender } = render(
      <ModalShell open onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    );
    scrollTo(bodyOf(), { scrollTop: 40, scrollHeight: 900, clientHeight: 300 });
    expect(screen.getByTestId('modal-rail').dataset['scrolled']).toBe('true');
    rerender(
      <ModalShell
        open={false}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    );
    rerender(
      <ModalShell open onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    );
    expect(screen.getByTestId('modal-rail').dataset['scrolled']).toBe('false');
  });
});

// `aria-modal` tells a screen reader the rest of the page is inert; it does
// nothing to the keyboard, so Tab used to walk straight out behind the scrim.
describe('ModalShell focus containment', () => {
  const TwoControls = () => (
    <ModalShell open onClose={vi.fn()} ariaLabel="Test">
      <button>First</button>
      <button>Last</button>
    </ModalShell>
  );

  it('moves focus to the dialog rather than leaving it on the trigger', () => {
    render(<TwoControls />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('wraps Tab from the last control back to the first', () => {
    render(<TwoControls />);
    screen.getByRole('button', { name: 'Last' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' }),
    );
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    render(<TwoControls />);
    screen.getByRole('button', { name: 'First' }).focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Last' }),
    );
  });

  it('wraps Shift+Tab off the dialog itself to the last control', () => {
    render(<TwoControls />);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Last' }),
    );
  });

  it('hides the scrim from assistive tech and from the tab order', () => {
    render(<TwoControls />);
    const scrim = screen.getByTestId('modal-scrim');
    expect(scrim.getAttribute('aria-hidden')).toBe('true');
    expect(scrim.tabIndex).toBe(-1);
  });

  // The price sheets' desktop dialogs draw a blue-to-pink top edge
  // (more-p-submit_d, more-p-check_d). It is opt-in: other dialogs are not
  // drawn with it.
  describe('desktop top edge', () => {
    it('is drawn only when asked for', () => {
      const { unmount } = render(
        <ModalShell open onClose={vi.fn()} ariaLabel="Test">
          <div>Content</div>
        </ModalShell>,
      );
      expect(screen.queryByTestId('modal-top-edge')).toBeNull();
      unmount();
      render(
        <ModalShell open onClose={vi.fn()} ariaLabel="Test" desktopTopEdge>
          <div>Content</div>
        </ModalShell>,
      );
      const edge = screen.getByTestId('modal-top-edge');
      expect(edge.style.height).toBe('2px');
      expect(edge.style.top).toBe('0px');
    });

    it('leaves the crew surface to its own edge', () => {
      render(
        <ModalShell
          open
          onClose={vi.fn()}
          ariaLabel="Test"
          surface="crew"
          desktopTopEdge
        >
          <div>Content</div>
        </ModalShell>,
      );
      expect(screen.queryByTestId('modal-top-edge')).toBeNull();
    });
  });
});
