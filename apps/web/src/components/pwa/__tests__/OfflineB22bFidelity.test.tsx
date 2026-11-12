// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { CachedEmpty, CachedShortcuts } from '../CachedShortcuts';
import { NoSignalTile, NothingCachedTile } from '../OfflineGlyphs';
import { OfflinePill } from '../OfflinePill';

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });
});

describe('B22b cached show rows', () => {
  it('draws a 2px genre edge, a genre wash and a glowing art ring', () => {
    render(
      <CachedShortcuts
        events={[
          {
            id: 'evt-1',
            title: 'Show',
            date: '2026-08-14',
            venue: { name: 'The Roxy', slug: 'the-roxy' },
            genre: ['folk'],
          },
        ]}
        venues={[]}
      />,
    );
    const row = screen.getByTestId('cached-event-row');
    const style = row.getAttribute('style') ?? '';
    expect(style).toContain('border-left: 2px solid var(--genre-folk)');
    expect(style).toContain('linear-gradient(90deg');
    expect(style).toContain('var(--genre-folk) 10%');
    expect(style).toContain('45%');
    const ring = row.querySelector('span[style*="box-shadow"]');
    const ringStyle = ring?.getAttribute('style') ?? '';
    expect(ringStyle).toContain('1.25px var(--genre-folk)');
    expect(ringStyle).toContain('0 0 20px');
    expect(ringStyle).toContain('var(--genre-folk) 40%');
  });

  it('falls back to the neutral border-strong when the genre has no bucket', () => {
    render(
      <CachedShortcuts
        events={[
          {
            id: 'evt-2',
            title: 'Show',
            date: '2026-08-14',
            venue: { name: 'The Roxy', slug: 'the-roxy' },
            genre: ['zzz-not-a-genre'],
          },
        ]}
        venues={[]}
      />,
    );
    const row = screen.getByTestId('cached-event-row');
    const style = row.getAttribute('style') ?? '';
    expect(style).toContain('border-left: 2px solid var(--border-strong)');
    expect(style).toContain('var(--border-strong) 10%');
    const ringStyle =
      row.querySelector('span[style*="box-shadow"]')?.getAttribute('style') ??
      '';
    expect(ringStyle).toContain('1.25px var(--border-strong)');
    expect(ringStyle).toContain('var(--border-strong) 40%');
  });
});

describe('B22b Try again button', () => {
  it('is a 14px rounded rectangle 41px tall, not a pill', () => {
    render(<CachedEmpty onRetry={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('rounded-[14px]');
    expect(button.className).toContain('h-[41px]');
    expect(button.className).not.toContain('rounded-full');
  });

  it('keeps the home link a full pill', () => {
    render(<CachedEmpty onRetry={() => {}} />);
    const home = screen.getByRole('link');
    expect(home.className).toContain('rounded-full');
  });
});

describe('B22b tile glyphs', () => {
  it('draws three graded signal arcs, a dot and a slash', () => {
    const { container } = render(<NoSignalTile />);
    const opacity = (id: string) =>
      container.querySelector(`[data-testid="${id}"]`)?.getAttribute('opacity');
    expect(opacity('signal-arc-outer')).toBe('0.35');
    expect(opacity('signal-arc-middle')).toBe('0.65');
    expect(opacity('signal-arc-inner')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(
      container.querySelector('path[stroke="var(--danger)"]'),
    ).toBeTruthy();
  });

  it('draws the nothing-cached core as halo, ring and dark core', () => {
    const { container } = render(<NothingCachedTile />);
    const halo = container.querySelector('[data-testid="core-halo"]');
    const ring = container.querySelector('[data-testid="core-ring"]');
    const dot = container.querySelector('[data-testid="core-dot"]');
    expect(halo?.getAttribute('opacity')).toBe('0.22');
    expect(ring?.getAttribute('opacity')).toBe('0.42');
    expect(dot?.getAttribute('fill')).toBe('var(--border)');
    expect(Number(halo?.getAttribute('r'))).toBeGreaterThan(
      Number(ring?.getAttribute('r')),
    );
  });
});

describe('B22b offline pill dot', () => {
  it('is 7px with a 60% warning glow', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    act(() => {
      render(<OfflinePill />);
    });
    const dot = screen.getByTestId('offline-pill-dot');
    expect(dot.className).toContain('h-[7px]');
    expect(dot.className).toContain('w-[7px]');
    expect(dot.getAttribute('style')).toContain('0 0 6px');
    expect(dot.getAttribute('style')).toContain('60%');
  });
});
