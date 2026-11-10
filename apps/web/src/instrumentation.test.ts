import { afterEach, describe, expect, it, vi } from 'vitest';

const loaded: string[] = [];
vi.mock('../sentry.server.config', () => {
  loaded.push('server');
  return {};
});
vi.mock('../sentry.edge.config', () => {
  loaded.push('edge');
  return {};
});

describe('instrumentation register', () => {
  const original = process.env['NEXT_RUNTIME'];

  afterEach(() => {
    if (original === undefined) delete process.env['NEXT_RUNTIME'];
    else process.env['NEXT_RUNTIME'] = original;
    loaded.length = 0;
    vi.resetModules();
  });

  it('loads the server Sentry config in the Node.js runtime', async () => {
    process.env['NEXT_RUNTIME'] = 'nodejs';
    const { register } = await import('./instrumentation');
    await register();
    expect(loaded).toEqual(['server']);
  });

  it('loads the edge Sentry config in the edge runtime', async () => {
    process.env['NEXT_RUNTIME'] = 'edge';
    const { register } = await import('./instrumentation');
    await register();
    expect(loaded).toEqual(['edge']);
  });

  it('reports request errors through Sentry', async () => {
    const Sentry = await import('@sentry/nextjs');
    const { onRequestError } = await import('./instrumentation');
    expect(onRequestError).toBe(Sentry.captureRequestError);
  });
});
