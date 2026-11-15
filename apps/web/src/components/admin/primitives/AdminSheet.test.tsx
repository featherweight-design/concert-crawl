// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AdminSheet } from './AdminSheet';

afterEach(() => {
  cleanup();
});

const renderSheet = (props: Partial<Parameters<typeof AdminSheet>[0]> = {}) => {
  render(
    <AdminSheet
      fullScreen
      backLabel="Artists"
      title="Find the right Cashmere"
      onClose={vi.fn()}
      footer={
        <button type="button" data-testid="footer-button">
          Not an artist
        </button>
      }
      {...props}
    >
      <p>Body</p>
    </AdminSheet>,
  );
  const scrim = screen.getByTestId('admin-sheet-scrim');
  const panel = screen.getByTestId('admin-sheet');
  const footerBar = screen.getByTestId('footer-button').parentElement;
  const title = screen.getByRole('heading', {
    name: 'Find the right Cashmere',
  });
  const chevron = screen
    .getByRole('button', { name: 'Artists' })
    .querySelector('svg');
  return { scrim, panel, footerBar, title, chevron };
};

describe('AdminSheet full screen', () => {
  it('keeps the plain full screen without the page props', () => {
    const { scrim, panel, footerBar, title, chevron } = renderSheet();
    expect(scrim).not.toHaveClass('page-ambient');
    expect(scrim.style.background).toBe('var(--bg)');
    expect(panel.style.background).toBe('var(--bg-elevated)');
    expect(panel.style.padding).toContain('16px 16px calc(');
    expect(footerBar?.style.background).toBe('');
    expect(footerBar?.style.borderTop).toBe('');
    expect(title.style.fontSize).toBe('18px');
    expect(chevron).toHaveAttribute('width', '16');
  });

  it('draws the page gradient with the panel transparent over it', () => {
    const { scrim, panel, footerBar, title } = renderSheet({
      pageBackground: true,
    });
    expect(scrim).toHaveClass('page-ambient');
    expect(scrim.style.background).toBe('');
    expect(panel.style.background).toBe('transparent');
    expect(panel.style.padding).toContain('12px 16px calc(');
    // The gradient alone leaves the footer and title as they were.
    expect(footerBar?.style.borderTop).toBe('');
    expect(title.style.fontSize).toBe('18px');
  });

  it('pins the footer as a ruled bar that carries the bottom inset', () => {
    const { scrim, panel, footerBar } = renderSheet({ pinnedFooter: true });
    expect(scrim).not.toHaveClass('page-ambient');
    expect(panel.style.padding).toMatch(/^16px 16px 0(px)?$/);
    expect(footerBar?.style.background).toBe('var(--bg-elevated)');
    expect(footerBar?.style.borderTop).toBe('1px solid var(--border)');
    expect(footerBar?.style.padding).toContain('12px 16px calc(24px');
  });

  it('keeps the panel inset when a pinned footer has no footer to draw', () => {
    render(
      <AdminSheet fullScreen pinnedFooter title="Empty" onClose={vi.fn()}>
        <p>Body</p>
      </AdminSheet>,
    );
    expect(screen.getByTestId('admin-sheet').style.padding).toContain(
      'calc(22px',
    );
  });

  it('sizes the title and the back chevron on their own props', () => {
    const { title, chevron } = renderSheet({
      titleSize: 21,
      compactBack: true,
    });
    expect(title.style.fontSize).toBe('21px');
    expect(title.style.letterSpacing).toBe('');
    expect(chevron).toHaveAttribute('width', '14');
  });

  it('composes the form page from all of them, with a tight 22px title', () => {
    const { scrim, panel, footerBar, title, chevron } = renderSheet({
      formPage: true,
      eyebrow: <span>Show</span>,
    });
    expect(scrim).toHaveClass('page-ambient');
    expect(panel.style.background).toBe('transparent');
    expect(panel.style.padding).toMatch(/^12px 16px 0(px)?$/);
    expect(footerBar?.style.background).toBe('var(--bg-elevated)');
    expect(footerBar?.style.borderTop).toBe('1px solid var(--border)');
    expect(title.style.fontSize).toBe('22px');
    expect(title.style.letterSpacing).toBe('-0.02em');
    expect(chevron).toHaveAttribute('width', '14');
    expect(screen.getByText('Show')).toBeInTheDocument();
  });

  it('keeps a form page flush at the bottom even with no footer', () => {
    render(
      <AdminSheet formPage fullScreen title="Form" onClose={vi.fn()}>
        <p>Body</p>
      </AdminSheet>,
    );
    const panel = screen.getByTestId('admin-sheet');
    expect(panel.style.padding).toMatch(/^12px 16px 0(px)?$/);
  });

  it('ignores the page props on a bottom sheet', () => {
    render(
      <AdminSheet
        pageBackground
        pinnedFooter
        compactBack
        title="Sheet"
        onClose={vi.fn()}
        footer={
          <button type="button" data-testid="footer-button">
            Save
          </button>
        }
      >
        <p>Body</p>
      </AdminSheet>,
    );
    expect(screen.getByTestId('admin-sheet-scrim')).not.toHaveClass(
      'page-ambient',
    );
    expect(
      screen.getByTestId('footer-button').parentElement?.style.borderTop,
    ).toBe('');
  });
});
