import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET, dynamic } from '../route';

// The keep-warm ping. Hugh declined paying to keep Neon awake, so a ping that
// read data or called Clerk would be a bug. These pin both ends: the route,
// and the cron that hits it.
describe('GET /api/warm', () => {
  it('answers ok, uncached, on every request', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(dynamic).toBe('force-dynamic');
  });

  it('imports nothing at all, so it cannot touch the database or Clerk', () => {
    const source = readFileSync(resolve(__dirname, '../route.ts'), 'utf8');
    // Static, dynamic and CommonJS forms alike.
    expect(source).not.toMatch(/^\s*import\b|\bimport\(|\brequire\(/m);
    expect(source).not.toMatch(/\bfrom\s+['"]/);
  });

  it('is pinged every 5 minutes by the web cron', () => {
    const config: unknown = JSON.parse(
      readFileSync(resolve(__dirname, '../../../../../vercel.json'), 'utf8'),
    );
    expect(config).toMatchObject({
      crons: [{ path: '/api/warm', schedule: '*/5 * * * *' }],
    });
  });
});
