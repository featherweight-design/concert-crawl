// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  CouldntLoad,
  CouldntLoadPage,
  COULDNT_LOAD_BUTTON_BOX,
} from './CouldntLoad';
import { adminButtonVariantStyle } from './AdminButton';
import { COULDNT_LOAD_X_STROKE, stateTileStyle } from './StateMessage';

const copy = ADMIN_COPY.states.couldntLoad;

/** admin.css with its whitespace collapsed, for rule-level assertions. */
const ADMIN_CSS = readFileSync(
  path.resolve(__dirname, '../../../app/(protected)/admin/admin.css'),
  'utf8',
).replace(/\s+/g, ' ');

/** The body of the first `@media (<query>) { … }` block holding `selector`. */
const mediaRule = (query: string, selector: string): string => {
  const pattern = new RegExp(
    `@media \\(${query}\\) \\{[^@]*?\\${selector} \\{([^}]*)\\}`,
  );
  return pattern.exec(ADMIN_CSS)?.[1] ?? '';
};

afterEach(cleanup);

// Style contract only: jsdom has no layout and may drop var()- and
// color-mix()-based values, so the drawn values are pinned on the shared
// style objects and admin.css, and plain values on the rendered elements.
describe('CouldntLoad (02/couldnt-load)', () => {
  it('names the page in its heading', () => {
    render(<CouldntLoad page="Needs you" onRetry={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Couldn’t load Needs you' }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.body)).toBeInTheDocument();
  });

  it('uses curly apostrophes, as the board draws them', () => {
    expect(copy.title('Venues')).toBe('Couldn’t load Venues');
    expect(copy.titleGeneric).toBe('Couldn’t load this page');
    expect(copy.body).toBe(
      'This page didn’t load. Nothing you decided is lost.',
    );
    expect(`${copy.title('x')}${copy.titleGeneric}${copy.body}`).not.toContain(
      "'",
    );
  });

  it('falls back to the generic heading without a page', () => {
    render(<CouldntLoad onRetry={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: copy.titleGeneric }),
    ).toBeInTheDocument();
  });

  it('draws Try again as the gradient call to action and retries', () => {
    const onRetry = vi.fn();
    render(<CouldntLoad page="Venues" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: copy.tryAgain });
    // The gradient variant is the only one at weight 700; primary is 600.
    expect(adminButtonVariantStyle('gradient').fontWeight).toBe(700);
    expect(button.style.fontWeight).toBe('700');
    expect(button.style.borderRadius).toBe('9px');
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('draws Open Health as the drawn secondary, the same box as Try again', () => {
    render(<CouldntLoad page="Venues" onRetry={vi.fn()} />);
    const link = screen.getByRole('link', { name: copy.openHealth });
    expect(link).toHaveAttribute('href', '/admin');
    expect(link.style.fontWeight).toBe('600');
    expect(link.style.borderRadius).toBe('9px');
  });

  it('sizes both buttons 38 tall at 13.5px on desktop, 44 and 14px stacked on the phone', () => {
    expect(COULDNT_LOAD_BUTTON_BOX.height).toBe(
      'var(--couldnt-load-button-height, 38px)',
    );
    expect(COULDNT_LOAD_BUTTON_BOX.fontSize).toBe(
      'var(--couldnt-load-button-size, 13.5px)',
    );
    expect(COULDNT_LOAD_BUTTON_BOX.borderRadius).toBe(9);
    render(<CouldntLoad onRetry={vi.fn()} />);
    expect(screen.getByTestId('couldnt-load-actions')).toHaveClass(
      'admin-couldnt-load-actions',
    );
    const phone = mediaRule('max-width: 720px', '.admin-couldnt-load-actions');
    expect(phone).toContain('flex-direction: column');
    expect(phone).toContain('--couldnt-load-button-height: 44px');
    expect(phone).toContain('--couldnt-load-button-size: 14px');
  });

  it('draws the 52 tile at radius 15, tinted 8% with a 40% edge', () => {
    render(<CouldntLoad onRetry={vi.fn()} />);
    const tile = screen.getByTestId('couldnt-load-tile');
    expect(tile.style.borderRadius).toBe('15px');
    expect(tile.style.width).toBe('52px');
    const tinted = stateTileStyle('var(--danger)', true);
    expect(tinted.background).toBe(
      'color-mix(in srgb, var(--danger) 8%, transparent)',
    );
    expect(tinted.border).toBe(
      '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
    );
  });

  it('draws the X at 24, stroke 1.8 in the board’s 16 grid', () => {
    render(<CouldntLoad onRetry={vi.fn()} />);
    const icon = screen.getByTestId('couldnt-load-tile').querySelector('svg');
    expect(icon).toHaveAttribute('width', '24');
    expect(COULDNT_LOAD_X_STROKE).toBeCloseTo((1.8 * 24) / 16);
    expect(icon).toHaveAttribute('stroke-width', String(COULDNT_LOAD_X_STROKE));
  });

  it('stacks title, line and buttons 10 apart with no extra margins', () => {
    render(<CouldntLoad page="Venues" onRetry={vi.fn()} />);
    expect(screen.getByTestId('couldnt-load').style.gap).toBe('10px');
    expect(screen.getByRole('heading').style.margin).toBe('0px');
  });
});

describe('Couldn’t load placement', () => {
  it('fills and centres a whole page’s failure on desktop', () => {
    render(
      <CouldntLoadPage>
        <CouldntLoad fill onRetry={vi.fn()} />
      </CouldntLoadPage>,
    );
    expect(screen.getByTestId('couldnt-load-page')).toHaveClass(
      'admin-couldnt-load-page',
    );
    expect(screen.getByTestId('couldnt-load')).toHaveClass(
      'admin-couldnt-load',
      'admin-couldnt-load-fill',
    );
    const page = mediaRule('min-width: 721px', '.admin-couldnt-load-page');
    expect(page).toContain('flex-direction: column');
    expect(page).toContain('gap: 16px');
    expect(page).toContain('min-height: 100%');
    const fill = mediaRule('min-width: 721px', '.admin-couldnt-load-fill');
    expect(fill).toContain('margin: auto');
    expect(fill).toContain('max-width: 380px');
    expect(fill).toContain('--state-message-padding: 0');
  });

  it('pads every Couldn’t load 36px 8px on the phone', () => {
    render(<CouldntLoad onRetry={vi.fn()} />);
    expect(screen.getByTestId('couldnt-load')).toHaveClass(
      'admin-couldnt-load',
    );
    expect(screen.getByTestId('couldnt-load')).not.toHaveClass(
      'admin-couldnt-load-fill',
    );
    expect(mediaRule('max-width: 720px', '.admin-couldnt-load')).toContain(
      '--state-message-padding: 36px 8px',
    );
  });

  it('runs the phone buttons the full width of the state (01/couldnt-load-m)', () => {
    // The state centres its children, so without the stretch the button row
    // shrinks to its buttons (~110px at 320) however wide they are told to be.
    expect(mediaRule('max-width: 720px', '.admin-couldnt-load')).toContain(
      '--state-message-actions-align: stretch',
    );
    const actions = mediaRule(
      'max-width: 720px',
      '.admin-couldnt-load-actions',
    );
    expect(actions).toContain('width: 100%');
    expect(actions).toContain('--couldnt-load-button-width: 100%');
    expect(COULDNT_LOAD_BUTTON_BOX.width).toBe(
      'var(--couldnt-load-button-width, auto)',
    );
    render(<CouldntLoad onRetry={vi.fn()} />);
    // The row admin.css stretches is the state's own actions row.
    expect(
      screen.getByTestId('couldnt-load-actions').parentElement?.parentElement,
    ).toBe(screen.getByTestId('couldnt-load'));
  });

  it('draws the page title above the state when given one', () => {
    render(
      <CouldntLoadPage title={<h1>Venues</h1>}>
        <CouldntLoad fill page="Venues" onRetry={vi.fn()} />
      </CouldntLoadPage>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Venues' }),
    ).toBeInTheDocument();
  });
});
