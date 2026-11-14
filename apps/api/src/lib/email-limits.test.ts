import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheck = vi.fn();
const mockRefund = vi.fn().mockResolvedValue(undefined);
vi.mock('./rate-limit.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheck(...args),
  refundRateLimit: (...args: unknown[]) => mockRefund(...args),
}));

const mockCountEmailSend = vi.fn();
const mockUncountEmailSend = vi.fn().mockResolvedValue(undefined);
const mockClaimWarning = vi.fn().mockResolvedValue(false);
vi.mock('@concert-crawl/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@concert-crawl/db')>();
  return {
    db: {},
    emailDailySendCap: actual.emailDailySendCap,
    countEmailSend: (...args: unknown[]) => mockCountEmailSend(...args),
    uncountEmailSend: (...args: unknown[]) => mockUncountEmailSend(...args),
    claimEmailCapWarning: (...args: unknown[]) => mockClaimWarning(...args),
  };
});

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/hono/node', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const {
  checkRecipientLimits,
  claimDailySend,
  countAlertSend,
  normalizeEmailAddress,
} = await import('./email-limits.js');
const { emailDailySendCap: dailySendCap } = await import('@concert-crawl/db');

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
    // A leading + is the address itself, not a tag.
    ['+a@example.com', '+a@example.com'],
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
  it('claims a send under the cap', async () => {
    mockCountEmailSend.mockResolvedValueOnce(3);
    const slot = await claimDailySend();
    expect(slot.allowed).toBe(true);
    expect(mockUncountEmailSend).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('allows the cap-th send and refuses the next, handing it back', async () => {
    mockCountEmailSend.mockResolvedValueOnce(30);
    await expect(claimDailySend()).resolves.toMatchObject({ allowed: true });
    mockCountEmailSend.mockResolvedValueOnce(31);
    await expect(claimDailySend()).resolves.toEqual({ allowed: false });
    // The refused claim leaves the day's count as it was.
    expect(mockUncountEmailSend).toHaveBeenCalledOnce();
  });

  it('reads the cap from EMAIL_DAILY_SEND_CAP', async () => {
    process.env['EMAIL_DAILY_SEND_CAP'] = '500';
    mockCountEmailSend.mockResolvedValueOnce(31);
    await expect(claimDailySend()).resolves.toMatchObject({ allowed: true });
  });

  it('fails closed when the count is unavailable', async () => {
    mockCountEmailSend.mockRejectedValueOnce(new Error('db down'));
    await expect(claimDailySend()).resolves.toEqual({ allowed: false });
  });

  it('hands the send back when it then fails', async () => {
    mockCountEmailSend.mockResolvedValueOnce(3);
    const slot = await claimDailySend();
    if (!slot.allowed) throw new Error('refused');
    await slot.release();
    expect(mockUncountEmailSend).toHaveBeenCalledOnce();
  });

  it('raises the 80% warning when it claims the day, numbers only', async () => {
    mockCountEmailSend.mockResolvedValueOnce(24);
    mockClaimWarning.mockResolvedValueOnce(true);
    await claimDailySend();
    expect(mockClaimWarning).toHaveBeenCalledWith({}, 24, 30);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'email: daily send cap at 80%',
      {
        level: 'warning',
        tags: { area: 'email', cap: '30', count: '24' },
      },
    );
  });

  it('stays quiet when the day was already warned', async () => {
    mockCountEmailSend.mockResolvedValueOnce(25);
    mockClaimWarning.mockResolvedValueOnce(false);
    await claimDailySend();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('still sends when the warning claim errors', async () => {
    mockCountEmailSend.mockResolvedValueOnce(25);
    mockClaimWarning.mockRejectedValueOnce(new Error('db down'));
    await expect(claimDailySend()).resolves.toMatchObject({ allowed: true });
  });
});

describe('countAlertSend', () => {
  it('counts past the cap, never refusing, and can warn', async () => {
    mockCountEmailSend.mockResolvedValueOnce(45);
    mockClaimWarning.mockResolvedValueOnce(true);
    await countAlertSend();
    expect(mockCountEmailSend).toHaveBeenCalledOnce();
    expect(mockUncountEmailSend).not.toHaveBeenCalled();
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
    ).resolves.toMatchObject({ allowed: true });
    const [network, hour, day] = mockCheck.mock.calls;
    expect(network?.[0]).toBe('email-net:203.0.113.9');
    expect(network?.[1]).toBe(300);
    expect(hour?.[1]).toBe(3);
    expect(day?.[1]).toBe(10);
    // The key holds a hash, never the address.
    expect(String(hour?.[0])).toMatch(/^email-to-hour:[0-9a-f]{32}$/);
    expect(String(day?.[0])).not.toContain('example');
  });

  it('hands every hit back when the send is stopped downstream', async () => {
    mockCheck.mockResolvedValue(allow(1));
    const limits = await checkRecipientLimits('fan@example.com', '203.0.113.9');
    if (!limits.allowed) throw new Error('refused');
    await limits.release();
    const refunded = mockRefund.mock.calls.map(([key]) => String(key));
    expect(refunded).toHaveLength(3);
    expect(refunded).toContain('email-net:203.0.113.9');
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
