// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { CrawlRunReason, CrawlStatus } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { RunChip } from './RunChip';

const RUN = ADMIN_COPY.venuesList.latestRun;

const chip = (status: CrawlStatus, reason: CrawlRunReason | null) => {
  render(<RunChip run={{ status, reason }} />);
  return screen.getByTestId('run-chip');
};

describe('RunChip', () => {
  afterEach(cleanup);

  // `A3/09/run-result-chips` plus `B+/A5/14/run-chips-partial`.
  it.each([
    ['success', null, RUN.success, 'var(--success)'],
    ['skipped', 'page_unchanged', RUN.unchanged, 'var(--fg-subtle)'],
    ['partial', null, RUN.partial, 'var(--warning)'],
    ['failed', 'timeout', RUN.failed, 'var(--danger)'],
    ['failed', 'blocked_http', RUN.blocked, 'var(--danger)'],
    ['skipped', 'crawl_paused', RUN.skipped, 'var(--fg-subtle)'],
    ['skipped', 'robots_disallowed', RUN.robots, 'var(--warning)'],
    ['skipped', 'robots_unreachable', RUN.robots, 'var(--warning)'],
    ['skipped', 'robots_crawl_delay', RUN.robots, 'var(--warning)'],
    ['failed', 'llm_account', RUN.notRun, 'var(--fg-subtle)'],
  ] as const)(
    'a %s run with reason %s reads %s in %s',
    (status, reason, word, tone) => {
      const el = chip(status, reason);
      expect(el.textContent).toBe(word);
      expect(el.getAttribute('data-tone')).toBe(tone);
    },
  );

  it('is the 22 tall, 11.5px venue chip', () => {
    const el = chip('success', null);
    expect(el.style.height).toBe('22px');
    expect(el.style.fontSize).toBe('11.5px');
    expect(el.style.padding).toBe('0px 9px');
    expect(el.style.borderRadius).toBe('999px');
  });

  it('reads a grey chip’s word in the muted ink', () => {
    expect(chip('skipped', 'crawl_paused').style.color).toBe('var(--fg-muted)');
  });
});
