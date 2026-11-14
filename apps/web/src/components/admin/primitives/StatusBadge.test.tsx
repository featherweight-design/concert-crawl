// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { STATUS_BADGE_TILE_FONT_SIZE, StatusBadge } from './StatusBadge';

afterEach(cleanup);

/** admin.css with its whitespace collapsed, for rule-level assertions. */
const ADMIN_CSS = readFileSync(
  path.resolve(__dirname, '../../../app/(protected)/admin/admin.css'),
  'utf8',
).replace(/\s+/g, ' ');

describe('StatusBadge filled', () => {
  it('is a 14% tint with no ring and a plain dot, as the panel boards draw it', () => {
    render(
      <StatusBadge kind="success" variant="filled" dot>
        Live
      </StatusBadge>,
    );
    const chip = screen.getByText('Live');
    expect(chip.style.background).toContain('14%');
    // jsdom normalises `border: none`, so pin that no 1px ring is drawn.
    expect(chip.style.border).not.toContain('1px solid');
    expect(chip.style.fontSize).toBe('12px');
    const dot = chip.querySelector('span');
    expect(dot?.style.boxShadow).toBe('');
  });

  it('leaves the soft and outline variants as they were', () => {
    render(
      <StatusBadge kind="success" variant="outline" dot>
        Quiet
      </StatusBadge>,
    );
    const chip = screen.getByText('Quiet');
    expect(chip.style.background).toBe('transparent');
    expect(chip.style.border).toContain('1px solid');
    expect(chip.querySelector('span')?.style.boxShadow).not.toBe('');
  });
});

describe('StatusBadge size="tile"', () => {
  it('is the Health boards’ 22px pill at 11.5px, 0 9px, with a plain dot', () => {
    render(
      <StatusBadge kind="danger" dot size="tile">
        Missed
      </StatusBadge>,
    );
    const chip = screen.getByText('Missed');
    expect(chip.style.height).toBe('22px');
    expect(chip.style.boxSizing).toBe('border-box');
    expect(chip.style.padding).toBe('0px 9px');
    expect(chip.style.borderRadius).toBe('999px');
    expect(chip.querySelector('span')?.style.width).toBe('6px');
    expect(chip.querySelector('span')?.style.boxShadow).toBe('');
  });

  // jsdom may drop var()-based values, so the size is pinned on the shared
  // constant and on admin.css rather than on the rendered element.
  it('is 11.5px on the desktop and 11px on the phone, in the Health tiles only', () => {
    expect(STATUS_BADGE_TILE_FONT_SIZE).toBe(
      'var(--status-badge-tile-size, 11.5px)',
    );
    const phoneTiles =
      /@media \(max-width: 720px\) \{[^@]*?\.health-tiles \{([^}]*)\}/.exec(
        ADMIN_CSS,
      )?.[1] ?? '';
    expect(phoneTiles).toContain('--status-badge-tile-size: 11px;');
    // Set nowhere else, so every other caller keeps the default.
    expect(ADMIN_CSS.match(/--status-badge-tile-size:/g)).toHaveLength(1);
  });

  it('leaves the default size unchanged', () => {
    render(<StatusBadge kind="danger">Failed</StatusBadge>);
    const chip = screen.getByText('Failed');
    expect(chip.style.height).toBe('');
    expect(chip.style.fontSize).toBe('11px');
    expect(chip.style.padding).toBe('2px 8px');
  });
});
