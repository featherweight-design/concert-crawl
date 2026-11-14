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
 *   Resend Pro), with one Sentry warning at 80%. Past it, mail to users
 *   stops; alerts to the admin address are counted but always sent. The day's
 *   count lives in packages/db, shared with the crawler's alerts.
 *
 * Per-recipient and per-network keys go through the shared limiter, with the
 * address hashed so no inbox is stored in `rate_limit_buckets`.
 */
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/hono/node';
import {
  claimEmailCapWarning,
  countEmailSend,
  db,
  emailDailySendCap,
  uncountEmailSend,
} from '@concert-crawl/db';
import { rateLimitKeyForIp } from './client-ip.js';
import { apiLogger } from './logger.js';
import { checkRateLimit, refundRateLimit } from './rate-limit.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const RECIPIENT_HOURLY_LIMIT = 3;
export const RECIPIENT_DAILY_LIMIT = 10;
export const NETWORK_HOURLY_LIMIT = 300;

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * One inbox, one spelling: lowercased, any `+tag` dropped (every provider),
 * and for Gmail the dots dropped and googlemail.com folded into gmail.com. A
 * local part that starts with `+` keeps it: there is no tag to drop.
 */
export const normalizeEmailAddress = (address: string): string => {
  const lowered = address.trim().toLowerCase();
  const at = lowered.lastIndexOf('@');
  if (at <= 0) return lowered;
  let local = lowered.slice(0, at);
  let domain = lowered.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replaceAll('.', '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
};

const addressHash = (address: string): string =>
  createHash('sha256')
    .update(normalizeEmailAddress(address))
    .digest('hex')
    .slice(0, 32);

/** Why a send was refused; the address never leaves this module. */
export type EmailRefusal = 'recipient' | 'network' | 'daily_cap';

/** The day's one 80% warning: numbers only, never an address. */
const warnNearCap = async (count: number, cap: number): Promise<void> => {
  if (!(await claimEmailCapWarning(db, count, cap))) return;
  apiLogger.warn({ count, cap }, 'email: daily send cap at 80%');
  Sentry.captureMessage('email: daily send cap at 80%', {
    level: 'warning',
    tags: { area: 'email', cap: String(cap), count: String(count) },
  });
};

const uncount = async (): Promise<void> => {
  try {
    await uncountEmailSend(db);
  } catch {
    // A lost uncount only leaves the day stricter than it should be.
    apiLogger.warn('email: daily send not handed back');
  }
};

/**
 * Claim one of the day's sends for mail to a user. Fails closed: a store
 * error refuses, since an uncounted send could drain the shared quota.
 * Returns the release to call if the send doesn't happen after all, so only
 * mail Resend accepted is counted.
 */
export const claimDailySend = async (): Promise<
  { allowed: true; release: () => Promise<void> } | { allowed: false }
> => {
  const cap = emailDailySendCap();
  let count: number;
  try {
    count = await countEmailSend(db);
  } catch {
    apiLogger.error('email: daily send count unavailable; send refused');
    return { allowed: false };
  }
  if (count > cap) {
    await uncount();
    apiLogger.warn({ cap }, 'email: daily send cap reached; send refused');
    return { allowed: false };
  }
  try {
    await warnNearCap(count, cap);
  } catch {
    apiLogger.warn('email: 80% warning claim unavailable');
  }
  return { allowed: true, release: uncount };
};

/**
 * Count an alert to the admin address. Never refuses and never throws: an
 * alert that a crawl failed is the one email that must not be dropped.
 */
export const countAlertSend = async (): Promise<void> => {
  try {
    const count = await countEmailSend(db);
    await warnNearCap(count, emailDailySendCap());
  } catch {
    apiLogger.warn('email: alert send not counted');
  }
};

/**
 * The per-network and per-recipient limits for a send to an address a person
 * typed. Each counts the attempt, so a refused burst still spends its budget.
 * On success, `release` hands every hit back, for a send that is then stopped
 * by something that isn't the requester's doing (the day's cap, Resend).
 */
export const checkRecipientLimits = async (
  address: string,
  ip: string,
): Promise<
  | { allowed: true; release: () => Promise<void> }
  | { allowed: false; reason: EmailRefusal }
> => {
  const networkKey = `email-net:${rateLimitKeyForIp(ip)}`;
  const network = await checkRateLimit(
    networkKey,
    NETWORK_HOURLY_LIMIT,
    HOUR_MS,
    { onStoreError: 'deny' },
  );
  if (!network.allowed) return { allowed: false, reason: 'network' };

  const inbox = addressHash(address);
  const hourKey = `email-to-hour:${inbox}`;
  const dayKey = `email-to-day:${inbox}`;
  const hour = await checkRateLimit(hourKey, RECIPIENT_HOURLY_LIMIT, HOUR_MS, {
    onStoreError: 'deny',
  });
  if (!hour.allowed) return { allowed: false, reason: 'recipient' };
  const day = await checkRateLimit(dayKey, RECIPIENT_DAILY_LIMIT, DAY_MS, {
    onStoreError: 'deny',
  });
  if (!day.allowed) {
    // The day refused it, so it never reached this hour.
    await refundRateLimit(hourKey);
    return { allowed: false, reason: 'recipient' };
  }
  return {
    allowed: true,
    release: async () => {
      await Promise.all([
        refundRateLimit(networkKey),
        refundRateLimit(hourKey),
        refundRateLimit(dayKey),
      ]);
    },
  };
};
