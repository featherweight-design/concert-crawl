import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { clientIp } from './client-ip.js';

const SECRET = 'test-internal-secret';

const app = new Hono();
app.get('/', (ctx) => ctx.text(clientIp(ctx)));

const ipFor = async (headers: Record<string, string>): Promise<string> =>
  (await app.request('/', { headers })).text();

describe('clientIp', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_SECRET', SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers x-vercel-forwarded-for, then x-real-ip, then the first x-forwarded-for hop', async () => {
    expect(
      await ipFor({
        'x-vercel-forwarded-for': '203.0.113.1',
        'x-real-ip': '203.0.113.2',
        'x-forwarded-for': '203.0.113.3',
      }),
    ).toBe('203.0.113.1');
    expect(
      await ipFor({
        'x-real-ip': ' 203.0.113.2 ',
        'x-forwarded-for': '203.0.113.3',
      }),
    ).toBe('203.0.113.2');
    expect(await ipFor({ 'x-forwarded-for': ' 203.0.113.3 , 10.0.0.1' })).toBe(
      '203.0.113.3',
    );
  });

  it('takes the first comma part of every header', async () => {
    expect(
      await ipFor({ 'x-vercel-forwarded-for': '203.0.113.1, 10.0.0.1' }),
    ).toBe('203.0.113.1');
  });

  it("answers 'unknown' when no header carries an address", async () => {
    expect(await ipFor({})).toBe('unknown');
  });

  it('trusts x-client-ip beside the service key, over every proxy header', async () => {
    expect(
      await ipFor({
        'x-client-ip': '198.51.100.9',
        'x-service-key': SECRET,
        'x-vercel-forwarded-for': '203.0.113.1',
      }),
    ).toBe('198.51.100.9');
    expect(
      await ipFor({ 'x-client-ip': '2001:db8::1', 'x-service-key': SECRET }),
    ).toBe('2001:db8::1');
  });

  it('ignores a spoofed x-client-ip sent without the service key', async () => {
    expect(
      await ipFor({
        'x-client-ip': '198.51.100.9',
        'x-vercel-forwarded-for': '203.0.113.1',
      }),
    ).toBe('203.0.113.1');
  });

  it('ignores x-client-ip beside a wrong service key', async () => {
    for (const wrong of ['nope', `${SECRET}x`, SECRET.toUpperCase(), '']) {
      expect(
        await ipFor({
          'x-client-ip': '198.51.100.9',
          'x-service-key': wrong,
          'x-vercel-forwarded-for': '203.0.113.1',
        }),
      ).toBe('203.0.113.1');
    }
  });

  it('ignores a malformed x-client-ip even beside the right key', async () => {
    for (const bad of [
      'not-an-ip',
      '198.51.100.9, 10.0.0.1',
      '999.1.1.1',
      `${'1'.repeat(40)}::1`,
      '1.2.3.4'.padEnd(60, ' x'),
    ]) {
      expect(
        await ipFor({
          'x-client-ip': bad,
          'x-service-key': SECRET,
          'x-vercel-forwarded-for': '203.0.113.1',
        }),
      ).toBe('203.0.113.1');
    }
  });

  it('never trusts x-client-ip when INTERNAL_API_SECRET is unset', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', undefined);
    expect(
      await ipFor({
        'x-client-ip': '198.51.100.9',
        'x-service-key': '',
        'x-vercel-forwarded-for': '203.0.113.1',
      }),
    ).toBe('203.0.113.1');
    expect(
      await ipFor({
        'x-client-ip': '198.51.100.9',
        'x-service-key': 'undefined',
      }),
    ).toBe('unknown');
  });
});
