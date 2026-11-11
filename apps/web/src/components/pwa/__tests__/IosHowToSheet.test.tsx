// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IosHowToSheet } from '../IosHowToSheet';
import { INSTALL_COPY } from '../definitions/copy';

afterEach(cleanup);

describe('IosHowToSheet', () => {
  it('names the dialog by its eyebrow, so the title is heard once', () => {
    render(<IosHowToSheet open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const nameId = dialog.getAttribute('aria-labelledby');
    expect(nameId).not.toBeNull();
    expect(document.getElementById(nameId ?? '')?.textContent).toBe(
      INSTALL_COPY.sheet.eyebrow,
    );
    expect(screen.getAllByText(INSTALL_COPY.sheet.title)).toHaveLength(1);
  });

  it('lists the three steps in order, each numbered for a screen reader', () => {
    render(<IosHowToSheet open onClose={vi.fn()} />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(INSTALL_COPY.sheet.steps.length);
    INSTALL_COPY.sheet.steps.forEach((step, index) => {
      expect(steps[index]?.textContent).toContain(`${step.num}. ${step.label}`);
    });
  });

  it('closes on Got it, and no longer carries the dismissal note', () => {
    const onClose = vi.fn();
    render(<IosHowToSheet open onClose={onClose} />);
    expect(screen.queryByText(INSTALL_COPY.dismissNote)).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: INSTALL_COPY.sheet.done }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
