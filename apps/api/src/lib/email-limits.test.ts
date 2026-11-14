import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheck = vi.fn();
const mockRefund = vi.fn().mockResolvedValue(undefined);
vi.mock('./rate-limit.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheck(...args),
  refundRateLimit: (...args: unknown[]) => mockRefund(...args),
}));

const mockCountEmailSend = vi.fn();
vi.mock('@concert-crawl/db', () => ({
  db: {},
  countEmailSend: (...args: unknown[]) => mockCountEmailSend(...args),
  emailDayKey: () => 'email-day:2026-11-14',
  emailDayWarnKey: () => 'email-day-warned:2026-11-14',
  EMAIL_DAY_WINDOW_MS: 26 * 60 * 60 * 1000,
}));

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/hono/node', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const {
  checkRecipientLimits,
  claimDailySend,
  countAlertSend,
  dailySendCap,
  normalizeEmailAddress,
} = await import('./email-limits.js');

const allow = (count: number) => ({ allowed: true, retryAfterMs: 0, count });
const deny = { allowed: false, retryAfterMs: 1000 };

const originalCap = process.env['EMAIL_DAILY_SEND_CAP'];
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['EMAIL_DAILY_SEND_CAP'];
});
afterEach(() => {
  if (originalCap === undefined) delete process.env['EMAIL_DAILY_SEND_CAP'];
  else process.env['EMAIL_DAILY_SEND_CAP'] = originalCap;
});

describe('normalizeEmailAddress', () => {
  it.each([
    ['Fan@Example.com', 'fan@example.com'],
    ['fan+shows@example.com', 'fan@example.com'],
    ['fan+a+b@fastmail.com', 'fan@fastmail.com'],
    ['f.a.n@gmail.com', 'fan@gmail.com'],
    ['F.A.N+x@GoogleMail.com', 'fan@gmail.com'],
    // Dots are only Gmail's to ignore.
    ['f.a.n@example.com', 'f.a.n@example.com'],
    ['  fan@example.com ', 'fan@example.com'],
  ])('%s is %s', (input, expected) => {
    expect(normalizeEmailAddress(input)).toBe(expected);
  });
});

describe('dailySendCap', () => {
  it('defaults to 30', () => {
    expect(dailySendCap()).toBe(30);
  });

  it('reads EMAIL_DAILY_SEND_CAP', () => {
    process.env['EMAIL_DAILY_SEND_CAP'] = '500';
    expect(dailySendCap()).toBe(500);
  });

  it.each(['', 'lots', '0', '-5', '12.5'])(
    'falls back to 30 for %j',
    (value) => {
      process.env['EMAIL_DAILY_SEND_CAP'] = value;
      expect(dailySendCap()).toBe(30);
    },
  );
});

describe('claimDailySend', () => {
  it('claims the day under the cap, failing closed', async () => {
    mockCheck.mockResolvedValueOnce(allow(3));
    const slot = await claimDailySend();
    expect(slot.allowed).toBe(true);
    expect(mockCheck).toHaveBeenCalledWith(
      'email-day:2026-11-14',
      30,
      26 * 60 * 60 * 1000,
      { onStoreError: 'deny' },
    );
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('refuses at the cap', async () => {
    mockCheck.mockResolvedValueOnce(deny);
    await expect(claimDailySend()).resolves.toEqual({ allowed: false });
  });

  it('releases the claim when the send then fails', async () => {
    mockCheck.mockResolvedValueOnce(allow(3));
    const slot = await claimDailySend();
    if (!slot.allowed) throw new Error('refused');
    await slot.release();
    expect(mockRefund).toHaveBeenCalledWith('email-day:2026-11-14');
  });

  it('warns once at 80%, with numbers and no address', async () => {
    // 24 of 30, then the day's warn key is claimed.
    mockCheck.mockResolvedValueOnce(allow(24)).mockResolvedValueOnce(allow(1));
    await claimDailySend();
    expect(mockCheck).toHaveBeenLastCalledWith(
      'email-day-warned:2026-11-14',
      1,
      26 * 60 * 60 * 1000,
      { onStoreError: 'deny' },
    );
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'email: daily send cap at 80%',
      {
        level: 'warning',
        tags: { area: 'email', cap: '30', count: '24' },
      },
    );

    // The next send past the line finds the day's warning already claimed.
    mockCheck.mockResolvedValueOnce(allow(25)).mockResolvedValueOnce(deny);
    await claimDailySend();
    expect(mockCaptureMessage).toHaveBeenCalledOnce();
  });
});

describe('countAlertSend', () => {
  it('counts and warns past 80%, never refusing', async () => {
    mockCountEmailSend.mockResolvedValueOnce(29);
    mockCheck.mockResolvedValueOnce(allow(1));
    await countAlertSend();
    expect(mockCountEmailSend).toHaveBeenCalledOnce();
    expect(mockCaptureMessage).toHaveBeenCalledOnce();
  });

  it('swallows a store error so the alert still goes', async () => {
    mockCountEmailSend.mockRejectedValueOnce(new Error('db down'));
    await expect(countAlertSend()).resolves.toBeUndefined();
  });
});

describe('checkRecipientLimits', () => {
  it('checks the network (300/hour), then the inbox (3/hour, 10/day)', async () => {
    mockCheck
      .mockResolvedValueOnce(allow(1))
      .mockResolvedValueOnce(allow(1))
      .mockResolvedValueOnce(allow(1));
    await expect(
      checkRecipientLimits('Fan+x@example.com', '203.0.113.9'),
    ).resolves.toEqual({ allowed: true });
    const [network, hour, day] = mockCheck.mock.calls;
    expect(network?.[0]).toBe('email-net:203.0.113.9');
    expect(network?.[1]).toBe(300);
    expect(hour?.[1]).toBe(3);
    expect(day?.[1]).toBe(10);
    // The key holds a hash, never the address.
    expect(String(hour?.[0])).toMatch(/^email-to-hour:[0-9a-f]{32}$/);
    expect(String(day?.[0])).not.toContain('example');
  });

  it('gives aliases of one inbox one count', async () => {
    mockCheck.mockResolvedValue(allow(1));
    await checkRecipientLimits('f.a.n+one@gmail.com', '203.0.113.9');
    await checkRecipientLimits('FAN@googlemail.com', '203.0.113.9');
    const hourKeys = mockCheck.mock.calls
      .map(([key]) => String(key))
      .filter((key) => key.startsWith('email-to-hour:'));
    expect(new Set(hourKeys).size).toBe(1);
  });

  it('refuses a busy network before touching the inbox', async () => {
    mockCheck.mockResolvedValueOnce(deny);
    await expect(
      checkRecipientLimits('fan@example.com', '203.0.113.9'),
    ).resolves.toEqual({ allowed: false, reason: 'network' });
    expect(mockCheck).toHaveBeenCalledOnce();
  });

  it('refuses past the hour', async () => {
    mockCheck.mockResolvedValueOnce(allow(1)).mockResolvedValueOnce(deny);
    await expect(
      checkRecipientLimits('fan@example.com', '203.0.113.9'),
    ).resolves.toEqual({ allowed: false, reason: 'recipient' });
  });

  it('refuses past the day and hands the hour back', async () => {
    mockCheck
      .mockResolvedValueOnce(allow(1))
      .mockResolvedValueOnce(allow(2))
      .mockResolvedValueOnce(deny);
    await expect(
      checkRecipientLimits('fan@example.com', '203.0.113.9'),
    ).resolves.toEqual({ allowed: false, reason: 'recipient' });
    expect(mockRefund).toHaveBeenCalledWith(
      expect.stringMatching(/^email-to-hour:/),
    );
  });
});
