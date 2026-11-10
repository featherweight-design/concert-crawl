import { afterEach, describe, expect, it, vi } from 'vitest';

const loaded: string[] = [];

const setTag = vi.fn();
const captureRequestError = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  withScope: (callback: (scope: { setTag: typeof setTag }) => void) =>
    callback({ setTag }),
  captureRequestError: (...args: unknown[]) => captureRequestError(...args),
}));
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

  it('reports a request error tagged with its digest', async () => {
    const { onRequestError } = await import('./instrumentation');
    const error = Object.assign(new Error('boom'), { digest: '4242' });
    const request = { path: '/crews', method: 'GET', headers: {} };
    const context = {
      routerKind: 'App Router',
      routePath: '/crews',
      routeType: 'render',
    } as const;

    await onRequestError(error, request, context);

    expect(setTag).toHaveBeenCalledWith('digest', '4242');
    expect(captureRequestError).toHaveBeenCalledWith(error, request, context);
  });
});
