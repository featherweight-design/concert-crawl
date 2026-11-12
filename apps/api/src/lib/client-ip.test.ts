import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { clientIp, rateLimitKeyForIp } from './client-ip.js';
import { apiLogger } from './logger.js';

const SECRET = 'test-internal-secret';

const app = new Hono();
app.get('/', (ctx) => ctx.text(clientIp(ctx)));

const ipFor = async (headers: Record<string, string>): Promise<string> =>
  (await app.request('/', { headers })).text();

describe('clientIp', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_SECRET', SECRET);
    vi.stubEnv('VERCEL', '1');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('on Vercel, prefers x-vercel-forwarded-for, then x-real-ip, then the first x-forwarded-for hop', async () => {
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

  it('off Vercel, reads only the first x-forwarded-for hop', async () => {
    vi.stubEnv('VERCEL', undefined);
    expect(
      await ipFor({
        'x-vercel-forwarded-for': '203.0.113.1',
        'x-real-ip': '203.0.113.2',
        'x-forwarded-for': '203.0.113.3, 10.0.0.1',
      }),
    ).toBe('203.0.113.3');
    expect(
      await ipFor({
        'x-vercel-forwarded-for': '203.0.113.1',
        'x-real-ip': '203.0.113.2',
      }),
    ).toBe('unknown');
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
    const warn = vi.spyOn(apiLogger, 'warn');
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
    expect(warn).not.toHaveBeenCalled();
  });

  it('ignores a spoofed x-client-ip sent without the service key, and logs it', async () => {
    const warn = vi.spyOn(apiLogger, 'warn');
    expect(
      await ipFor({
        'x-client-ip': '198.51.100.9',
        'x-vercel-forwarded-for': '203.0.113.1',
      }),
    ).toBe('203.0.113.1');
    expect(warn).toHaveBeenCalledWith(
      { reason: 'no_service_key' },
      expect.any(String),
    );
  });

  it('ignores x-client-ip beside a wrong service key, and logs it', async () => {
    const warn = vi.spyOn(apiLogger, 'warn');
    for (const wrong of ['nope', `${SECRET}x`, SECRET.toUpperCase(), '']) {
      expect(
        await ipFor({
          'x-client-ip': '198.51.100.9',
          'x-service-key': wrong,
          'x-vercel-forwarded-for': '203.0.113.1',
        }),
      ).toBe('203.0.113.1');
    }
    expect(warn).toHaveBeenCalledTimes(4);
    // The message carries a reason, never the secret or the address.
    for (const call of warn.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(SECRET);
      expect(JSON.stringify(call)).not.toContain('198.51.100.9');
    }
  });

  it('ignores a malformed x-client-ip even beside the right key, and logs it', async () => {
    const warn = vi.spyOn(apiLogger, 'warn');
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
    expect(warn).toHaveBeenCalledTimes(5);
    expect(warn).toHaveBeenCalledWith(
      { reason: 'malformed' },
      expect.any(String),
    );
  });

  it('rejects an address isIP accepts once it is longer than 45 characters', async () => {
    // A long zone id: isIP calls it IPv6, the length bound does not.
    const longZone = `fe80::1%${'a'.repeat(40)}`;
    expect(longZone.length).toBeGreaterThan(45);
    expect(
      await ipFor({
        'x-client-ip': longZone,
        'x-service-key': SECRET,
        'x-vercel-forwarded-for': '203.0.113.1',
      }),
    ).toBe('203.0.113.1');
    // A short zone id is still within the bound and trusted.
    expect(
      await ipFor({ 'x-client-ip': 'fe80::1%eth0', 'x-service-key': SECRET }),
    ).toBe('fe80::1%eth0');
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

describe('rateLimitKeyForIp', () => {
  it('keys IPv4 as is', () => {
    expect(rateLimitKeyForIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('passes a non-address through', () => {
    expect(rateLimitKeyForIp('unknown')).toBe('unknown');
  });

  it('keys two addresses in one /64 the same', () => {
    expect(rateLimitKeyForIp('2001:db8:1:2::1')).toBe(
      rateLimitKeyForIp('2001:db8:1:2:dead:beef:cafe:f00d'),
    );
    expect(rateLimitKeyForIp('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
  });

  it('keys a different /64 differently', () => {
    expect(rateLimitKeyForIp('2001:db8:1:2::1')).not.toBe(
      rateLimitKeyForIp('2001:db8:1:3::1'),
    );
  });

  it('expands :: wherever it falls, so every spelling of a /64 matches', () => {
    // `::` inside the prefix, at the end, and at the very start.
    expect(rateLimitKeyForIp('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateLimitKeyForIp('2001:db8:0:0:0:0:0:1')).toBe('2001:db8:0:0::/64');
    expect(rateLimitKeyForIp('2001:db8:5::')).toBe('2001:db8:5:0::/64');
    expect(rateLimitKeyForIp('::1')).toBe('0:0:0:0::/64');
    expect(rateLimitKeyForIp('2001:db8:1:2:3::')).toBe('2001:db8:1:2::/64');
  });

  it('canonicalises case, leading zeros and a zone before keying', () => {
    const key = rateLimitKeyForIp('2001:db8:a:b::1');
    expect(rateLimitKeyForIp('2001:0DB8:000A:000b::1')).toBe(key);
    expect(rateLimitKeyForIp('2001:db8:a:b::1%eth0')).toBe(key);
  });

  it('unwraps an IPv4-mapped address to its IPv4', () => {
    expect(rateLimitKeyForIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(rateLimitKeyForIp('::FFFF:cb00:7107')).toBe('203.0.113.7');
    expect(rateLimitKeyForIp('0:0:0:0:0:ffff:203.0.113.7')).toBe('203.0.113.7');
    // Two mapped addresses never share a bucket the way a /64 would.
    expect(rateLimitKeyForIp('::ffff:203.0.113.8')).not.toBe(
      rateLimitKeyForIp('::ffff:203.0.113.7'),
    );
  });
});
