// GET /v1/email/unsubscribe — one-click per-family email opt-out (#763 §8.2).
//
// Linked from the digest email footer. No auth (email links must work
// logged-out); the signed HMAC token IS the authorization — recomputed
// server-side and compared in constant time. On match, flips
// user_spotify_connections.digestEnabled off and renders a plain HTML
// confirmation. Responds identically whether or not a connection row exists
// (no account enumeration via unsubscribe links).

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, userSpotifyConnections } from '@concert-crawl/db'
import { apiLogger } from '../lib/logger.js'
import {
  UNSUBSCRIBE_FAMILIES,
  isUnsubscribeConfigured,
  verifyUnsubscribeToken,
} from '../lib/email-unsubscribe.js'

const unsubscribeQuerySchema = z.object({
  uid: z.string().min(1).max(256),
  family: z.enum(UNSUBSCRIBE_FAMILIES),
  token: z.string().min(1).max(256),
})

// Deliberately dependency-free HTML (no shared web shell): this page renders
// for logged-out users straight off an email client, so it stays a static,
// self-contained confirmation matching the email palette.
const confirmationPage = (
  heading: string,
  body: string,
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concert Crawl</title>
</head>
<body style="margin: 0; padding: 48px 24px; background-color: #04050C; font-family: Inter, Arial, sans-serif; color: #E8F3FF; text-align: center;">
<div style="max-width: 440px; margin: 0 auto; background: #0B0E20; border: 1px solid #242C4E; border-radius: 16px; padding: 32px 28px;">
<div style="font-weight: 800; font-size: 17px; letter-spacing: -0.02em; margin-bottom: 18px;">concert<span style="color: #FF7BD4;">crawl.</span></div>
<h1 style="font-size: 21px; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 10px;">${heading}</h1>
<p style="font-size: 14px; color: #9AA8C7; line-height: 1.5; margin: 0;">${body}</p>
</div>
</body>
</html>`

export const emailUnsubscribeRouter = new Hono()

emailUnsubscribeRouter.get(
  '/unsubscribe',
  // Custom hook: malformed links must render the same HTML page as a bad
  // token, not zValidator's default JSON error — humans land here from email
  // clients.
  zValidator('query', unsubscribeQuerySchema, (result, ctx) => {
    if (!result.success) {
      apiLogger.warn(
        { issues: result.error.issues },
        'email unsubscribe query rejected',
      )
      return ctx.html(
        confirmationPage(
          'That link didn’t work.',
          'This unsubscribe link is invalid or has expired. You can still manage emails from your account settings.',
        ),
        400,
      )
    }
    return undefined
  }),
  async (ctx) => {
    const { uid, family, token } = ctx.req.valid('query')

    if (!isUnsubscribeConfigured()) {
      apiLogger.error(
        { family },
        'EMAIL_UNSUBSCRIBE_SECRET not configured — unsubscribe unavailable',
      )
      return ctx.html(
        confirmationPage(
          'Something went wrong.',
          'Unsubscribe is temporarily unavailable. Please try again later, or manage emails from your account settings.',
        ),
        503,
      )
    }

    if (!verifyUnsubscribeToken(uid, family, token)) {
      // uid is loggable for support tracing; the token never is.
      apiLogger.warn({ uid, family }, 'email unsubscribe token rejected')
      return ctx.html(
        confirmationPage(
          'That link didn’t work.',
          'This unsubscribe link is invalid or has expired. You can still manage emails from your account settings.',
        ),
        400,
      )
    }

    try {
      // family is currently only 'digest'; the switch keeps additions
      // explicit.
      switch (family) {
        case 'digest':
          await db
            .update(userSpotifyConnections)
            .set({ digestEnabled: false })
            .where(eq(userSpotifyConnections.userId, uid))
          break
      }
    } catch (err) {
      // Humans land here from email clients — a DB hiccup must render the
      // same HTML shell, not the app-level JSON 500.
      apiLogger.error(
        { err, uid, family },
        'email unsubscribe DB update failed',
      )
      return ctx.html(
        confirmationPage(
          'Something went wrong.',
          'We couldn’t process your unsubscribe just now. Please try the link again, or manage emails from your account settings.',
        ),
        500,
      )
    }

    apiLogger.info({ uid, family }, 'email unsubscribe applied')
    return ctx.html(
      confirmationPage(
        'You’re unsubscribed.',
        'The weekly digest is off. You can turn it back on any time from Settings → Connections.',
      ),
    )
  },
)
