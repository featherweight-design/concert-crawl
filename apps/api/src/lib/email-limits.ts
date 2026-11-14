/**
 * Email-send abuse limits (Hugh's ruling, 2026-11-14, after The 99's
 * strategy). One Resend account and its daily quota are shared with another
 * app, so abuse here takes both apps' email down, and bounces or complaints
 * can get the account or domain suspended. Three limits:
 *
 * - **Per recipient:** 3 an hour and 10 a day for one normalized address, so
 *   aliases of one inbox share a count.
 * - **Per network:** a generous 300 an hour, since a venue shares one Wi-Fi.
 * - **Account-wide:** `EMAIL_DAILY_SEND_CAP` a Mountain Time day (30 until
 *   Resend Pro), with one Sentry warning at 80%. Past it, mail addressed to
 *   users stops; alerts to the admin address are counted but always sent.
 *
 * Every key is in `rate_limit_buckets` via the shared limiter. Addresses are
 * hashed into their keys so no inbox is stored in the table.
 */
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/hono/node';
import {
  countEmailSend,
  db,
  emailDayKey,
  emailDayWarnKey,
  EMAIL_DAY_WINDOW_MS,
} from '@concert-crawl/db';
import { rateLimitKeyForIp } from './client-ip.js';
import { apiLogger } from './logger.js';
import { checkRateLimit, refundRateLimit } from './rate-limit.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const RECIPIENT_HOURLY_LIMIT = 3;
export const RECIPIENT_DAILY_LIMIT = 10;
export const NETWORK_HOURLY_LIMIT = 300;
export const DEFAULT_DAILY_SEND_CAP = 30;
const WARN_AT = 0.8;

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * One inbox, one spelling: lowercased, any `+tag` dropped (every provider),
 * and for Gmail the dots dropped and googlemail.com folded into gmail.com.
 */
export const normalizeEmailAddress = (address: string): string => {
  const lowered = address.trim().toLowerCase();
  const at = lowered.lastIndexOf('@');
  if (at <= 0) return lowered;
  let local = lowered.slice(0, at);
  let domain = lowered.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replaceAll('.', '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
};

/** The day's cap from `EMAIL_DAILY_SEND_CAP`; a missing or bad value is 30. */
export const dailySendCap = (): number => {
  const raw = Number(process.env['EMAIL_DAILY_SEND_CAP']);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_DAILY_SEND_CAP;
};

const addressHash = (address: string): string =>
  createHash('sha256')
    .update(normalizeEmailAddress(address))
    .digest('hex')
    .slice(0, 32);

/** Why a send was refused; the address never leaves this module. */
export type EmailRefusal = 'recipient' | 'network' | 'daily_cap';

/**
 * The 80% warning, once per Mountain Time day: the first count at or past
 * the line claims the day's warn key. Carries the numbers only, never an
 * address.
 */
const warnNearCap = async (count: number, cap: number): Promise<void> => {
  if (count < Math.ceil(cap * WARN_AT)) return;
  const claim = await checkRateLimit(
    emailDayWarnKey(),
    1,
    EMAIL_DAY_WINDOW_MS,
    {
      onStoreError: 'deny',
    },
  );
  if (!claim.allowed) return;
  apiLogger.warn({ count, cap }, 'email: daily send cap at 80%');
  Sentry.captureMessage('email: daily send cap at 80%', {
    level: 'warning',
    tags: { area: 'email', cap: String(cap), count: String(count) },
  });
};

/**
 * Claim one of the day's sends for mail addressed to a user. Fails closed: a
 * store error refuses, since an uncounted send could drain the shared quota.
 * Returns the release to call if the send then fails, so only mail Resend
 * accepted is counted.
 */
export const claimDailySend = async (): Promise<
  { allowed: true; release: () => Promise<void> } | { allowed: false }
> => {
  const cap = dailySendCap();
  const key = emailDayKey();
  const result = await checkRateLimit(key, cap, EMAIL_DAY_WINDOW_MS, {
    onStoreError: 'deny',
  });
  if (!result.allowed) {
    apiLogger.warn({ cap }, 'email: daily send cap reached; send refused');
    return { allowed: false };
  }
  await warnNearCap(result.count ?? 0, cap);
  return { allowed: true, release: () => refundRateLimit(key) };
};

/**
 * Count an alert to the admin address. Never refuses and never throws: an
 * alert that a crawl failed is the one email that must not be dropped.
 */
export const countAlertSend = async (): Promise<void> => {
  try {
    const count = await countEmailSend(db);
    await warnNearCap(count, dailySendCap());
  } catch (err) {
    apiLogger.warn(
      { errorClass: err instanceof Error ? err.name : typeof err },
      'email: alert send not counted',
    );
  }
};

/**
 * The per-recipient and per-network limits for a send to an address a person
 * typed. Each counts the attempt, so a refused burst still spends its budget.
 * A day refusal hands the hour's hit back, keeping the hour honest.
 */
export const checkRecipientLimits = async (
  address: string,
  ip: string,
): Promise<{ allowed: true } | { allowed: false; reason: EmailRefusal }> => {
  const network = await checkRateLimit(
    `email-net:${rateLimitKeyForIp(ip)}`,
    NETWORK_HOURLY_LIMIT,
    HOUR_MS,
    { onStoreError: 'deny' },
  );
  if (!network.allowed) return { allowed: false, reason: 'network' };

  const inbox = addressHash(address);
  const hourKey = `email-to-hour:${inbox}`;
  const hour = await checkRateLimit(hourKey, RECIPIENT_HOURLY_LIMIT, HOUR_MS, {
    onStoreError: 'deny',
  });
  if (!hour.allowed) return { allowed: false, reason: 'recipient' };
  const day = await checkRateLimit(
    `email-to-day:${inbox}`,
    RECIPIENT_DAILY_LIMIT,
    DAY_MS,
    { onStoreError: 'deny' },
  );
  if (!day.allowed) {
    await refundRateLimit(hourKey);
    return { allowed: false, reason: 'recipient' };
  }
  return { allowed: true };
};
