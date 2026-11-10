import { describe, expect, it, vi } from 'vitest';
import { SENTRY_PRIVACY_OPTIONS } from '@concert-crawl/types/sentry';

const init = vi.fn();
vi.mock('@sentry/nextjs', () => ({ init }));

// instrumentation.ts loads these two in production; neither may send a byte
// of request data the privacy constant switches off.
describe.each([
  ['server', () => import('../sentry.server.config')],
  ['edge', () => import('../sentry.edge.config')],
])('the %s Sentry config', (_name, load) => {
  it('spreads the privacy options and the redaction hooks', async () => {
    init.mockClear();
    vi.resetModules();
    await load();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0]?.[0]).toMatchObject({
      dataCollection: SENTRY_PRIVACY_OPTIONS.dataCollection,
      attachStacktrace: false,
      beforeBreadcrumb: expect.any(Function),
      beforeSend: expect.any(Function),
    });
    // The hook is the redaction one, not a stand-in.
    const hook = init.mock.calls[0]?.[0].beforeSend;
    expect(hook({ transaction: '/crew/join/secret-token' }).transaction).toBe(
      '/crew/join/[redacted]',
    );
  });
});
