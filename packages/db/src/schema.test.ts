import { describe, it, expect } from 'vitest'
import {
  venues,
  events,
  userRoles,
  inviteCodes,
  auditLog,
  notifications,
  feedback,
  crawlRuns,
  subscriptions,
  subscriptionTierEnum,
  subscriptionStatusEnum,
  subscriptionEventTypeEnum,
  userBilling,
  founderWindow,
  subscriptionEvents,
  processedStripeEvents,
  giftedComps,
  emailSendLog,
  emailTemplateConfig,
  EMAIL_TEMPLATE_KEYS,
  artistFollowSourceEnum,
  userArtistFollows,
  spotifyConnectionStatusEnum,
  userSpotifyConnections,
  pushSubscriptions,
  spotifyAlertLog,
} from './index.js'

describe('database schema exports', () => {
  it('exports venues table', () => {
    expect(venues).toBeDefined()
  })

  it('venues table has required columns', () => {
    const columns = Object.keys(venues)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    expect(columns).toContain('slug')
    expect(columns).toContain('websiteUrl')
    expect(columns).toContain('active')
    expect(columns).toContain('verified')
  })

  it('exports events table', () => {
    expect(events).toBeDefined()
  })

  it('exports userRoles table', () => {
    expect(userRoles).toBeDefined()
  })

  it('exports inviteCodes table', () => {
    expect(inviteCodes).toBeDefined()
  })

  it('exports auditLog table', () => {
    expect(auditLog).toBeDefined()
  })

  it('exports notifications table', () => {
    expect(notifications).toBeDefined()
  })

  it('exports feedback table', () => {
    expect(feedback).toBeDefined()
  })

  it('exports crawlRuns table', () => {
    expect(crawlRuns).toBeDefined()
  })
})

describe('monetization schema (execution plan PR 2.1)', () => {
  describe('enum expansion', () => {
    it('subscription_tier includes supporter and founder (expand-only)', () => {
      expect(subscriptionTierEnum.enumValues).toEqual([
        'free',
        'premium',
        'supporter',
        'founder',
      ])
    })

    it('subscription_status includes trialing, incomplete, incomplete_expired (expand-only)', () => {
      expect(subscriptionStatusEnum.enumValues).toEqual([
        'active',
        'cancelled',
        'past_due',
        'trialing',
        'incomplete',
        'incomplete_expired',
      ])
    })

    it('subscription_event_type has exactly the 16 spec values', () => {
      expect(subscriptionEventTypeEnum.enumValues).toEqual([
        'checkout_started',
        'subscription_created',
        'renewal_succeeded',
        'payment_failed',
        'past_due_entered',
        'cancel_scheduled',
        'resubscribed',
        'cancel_completed',
        'upgraded',
        'downgraded',
        'founder_claimed',
        'founder_seat_restored',
        'trial_ended',
        'gift_granted',
        'gift_revoked',
        'data_purged',
      ])
    })
  })

  describe('subscriptions table additions', () => {
    it('has cancelAtPeriodEnd, stripePriceId, currentPeriodStart columns', () => {
      const columns = Object.keys(subscriptions)
      expect(columns).toContain('cancelAtPeriodEnd')
      expect(columns).toContain('stripePriceId')
      expect(columns).toContain('currentPeriodStart')
    })

    it('cancelAtPeriodEnd is not null with default false', () => {
      expect(subscriptions.cancelAtPeriodEnd.notNull).toBe(true)
      expect(subscriptions.cancelAtPeriodEnd.default).toBe(false)
    })

    it('stripePriceId and currentPeriodStart are nullable', () => {
      expect(subscriptions.stripePriceId.notNull).toBe(false)
      expect(subscriptions.currentPeriodStart.notNull).toBe(false)
    })
  })

  describe('user_billing table', () => {
    it('is exported with the spec §3 columns', () => {
      expect(userBilling).toBeDefined()
      const columns = Object.keys(userBilling)
      expect(columns).toContain('userId')
      expect(columns).toContain('trialEndsAt')
      expect(columns).toContain('lastTrialEndedShownAt')
      expect(columns).toContain('dayThirteenBannerDismissedAt')
      expect(columns).toContain('pastDueBannerDismissedAt')
      expect(columns).toContain('premiumDataExpiresAt')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('userId is the primary key', () => {
      expect(userBilling.userId.primary).toBe(true)
    })

    it('all banner/trial timestamps are nullable', () => {
      expect(userBilling.trialEndsAt.notNull).toBe(false)
      expect(userBilling.lastTrialEndedShownAt.notNull).toBe(false)
      expect(userBilling.dayThirteenBannerDismissedAt.notNull).toBe(false)
      expect(userBilling.pastDueBannerDismissedAt.notNull).toBe(false)
      expect(userBilling.premiumDataExpiresAt.notNull).toBe(false)
    })
  })

  describe('founder_window table (singleton)', () => {
    it('is exported with the spec §4 columns', () => {
      expect(founderWindow).toBeDefined()
      const columns = Object.keys(founderWindow)
      expect(columns).toContain('id')
      expect(columns).toContain('opensAt')
      expect(columns).toContain('seatsTotal')
      expect(columns).toContain('seatsRemaining')
      expect(columns).toContain('seatsRemainingTest')
      expect(columns).toContain('windowDays')
      expect(columns).toContain('closesAt')
    })

    it('opensAt is nullable (NULL until launch day)', () => {
      expect(founderWindow.opensAt.notNull).toBe(false)
    })

    it('closesAt is a generated column', () => {
      expect(founderWindow.closesAt.generated).toBeDefined()
    })
  })

  describe('subscription_events table (audit)', () => {
    it('is exported with the spec §5 columns', () => {
      expect(subscriptionEvents).toBeDefined()
      const columns = Object.keys(subscriptionEvents)
      expect(columns).toContain('id')
      expect(columns).toContain('userId')
      expect(columns).toContain('type')
      expect(columns).toContain('stripeEventId')
      expect(columns).toContain('metadata')
      expect(columns).toContain('createdAt')
    })

    it('stripeEventId and metadata are nullable', () => {
      expect(subscriptionEvents.stripeEventId.notNull).toBe(false)
      expect(subscriptionEvents.metadata.notNull).toBe(false)
    })
  })

  describe('processed_stripe_events table (webhook idempotency)', () => {
    it('is exported with eventId as primary key', () => {
      expect(processedStripeEvents).toBeDefined()
      expect(processedStripeEvents.eventId.primary).toBe(true)
      expect(processedStripeEvents.type.notNull).toBe(true)
      expect(processedStripeEvents.processedAt.notNull).toBe(true)
    })
  })

  describe('gifted_comps table', () => {
    it('is exported with the spec §7 columns', () => {
      expect(giftedComps).toBeDefined()
      const columns = Object.keys(giftedComps)
      expect(columns).toContain('id')
      expect(columns).toContain('userId')
      expect(columns).toContain('grantedBy')
      expect(columns).toContain('expiresAt')
      expect(columns).toContain('redeemedAt')
      expect(columns).toContain('revokedAt')
      expect(columns).toContain('createdAt')
    })

    it('expiresAt/redeemedAt/revokedAt are nullable (NULL expiry = lifetime)', () => {
      expect(giftedComps.expiresAt.notNull).toBe(false)
      expect(giftedComps.redeemedAt.notNull).toBe(false)
      expect(giftedComps.revokedAt.notNull).toBe(false)
    })
  })

  describe('email tables', () => {
    it('email_send_log is exported with the spec §8 columns', () => {
      expect(emailSendLog).toBeDefined()
      const columns = Object.keys(emailSendLog)
      expect(columns).toContain('id')
      expect(columns).toContain('templateKey')
      expect(columns).toContain('userId')
      expect(columns).toContain('dedupeKey')
      expect(columns).toContain('resendId')
      expect(columns).toContain('status')
      expect(columns).toContain('createdAt')
    })

    it('email_template_config has templateKey PK and enabled default true', () => {
      expect(emailTemplateConfig).toBeDefined()
      expect(emailTemplateConfig.templateKey.primary).toBe(true)
      expect(emailTemplateConfig.enabled.notNull).toBe(true)
      expect(emailTemplateConfig.enabled.default).toBe(true)
    })

    it('EMAIL_TEMPLATE_KEYS lists exactly the 11 #783 template keys', () => {
      expect(EMAIL_TEMPLATE_KEYS).toEqual([
        'welcome_paid',
        'welcome_gifted',
        'renewal_receipt_monthly',
        'renewal_receipt_annual',
        'dunning_1_card_declined',
        'dunning_2_still_declined',
        'dunning_3_final_warning',
        'card_expiring_soon',
        'cancellation_ack',
        'gifting_ending_notice',
        'winback',
      ])
    })
  })
})

describe('spotify sync schema (eng spec §4, PR 1)', () => {
  it('spotify_connection_status enum has exactly the spec values', () => {
    expect(spotifyConnectionStatusEnum.enumValues).toEqual([
      'connected',
      'error',
      'revoked',
    ])
  })

  it('user_spotify_connections has the spec §4 columns', () => {
    expect(userSpotifyConnections).toBeDefined()
    const columns = Object.keys(userSpotifyConnections)
    for (const col of [
      'id',
      'userId',
      'spotifyUserId',
      'displayName',
      'status',
      'autoWatch',
      'digestEnabled',
      'pushEnabled',
      'connectedAt',
      'lastSyncedAt',
      'lastSyncError',
      'artistCount',
    ]) {
      expect(columns).toContain(col)
    }
    expect(userSpotifyConnections.userId.notNull).toBe(true)
    expect(userSpotifyConnections.status.notNull).toBe(true)
    expect(userSpotifyConnections.status.default).toBe('connected')
    expect(userSpotifyConnections.autoWatch.default).toBe(false)
    expect(userSpotifyConnections.digestEnabled.default).toBe(true)
    expect(userSpotifyConnections.pushEnabled.default).toBe(true)
    expect(userSpotifyConnections.artistCount.default).toBe(0)
    expect(userSpotifyConnections.lastSyncedAt.notNull).toBe(false)
    expect(userSpotifyConnections.lastSyncError.notNull).toBe(false)
  })

  it('push_subscriptions has the spec §4 columns', () => {
    expect(pushSubscriptions).toBeDefined()
    const columns = Object.keys(pushSubscriptions)
    for (const col of [
      'id',
      'userId',
      'endpoint',
      'p256dh',
      'auth',
      'userAgent',
      'createdAt',
      'lastUsedAt',
      'disabledAt',
    ]) {
      expect(columns).toContain(col)
    }
    expect(pushSubscriptions.endpoint.notNull).toBe(true)
    expect(pushSubscriptions.disabledAt.notNull).toBe(false)
  })

  it('spotify_alert_log has the spec §4 columns', () => {
    expect(spotifyAlertLog).toBeDefined()
    const columns = Object.keys(spotifyAlertLog)
    for (const col of ['id', 'userId', 'eventId', 'kind', 'createdAt']) {
      expect(columns).toContain(col)
    }
    expect(spotifyAlertLog.eventId.notNull).toBe(true)
  })

  it('artist_follow_source enum has exactly the spec values', () => {
    expect(artistFollowSourceEnum.enumValues).toEqual([
      'manual',
      'spotify_followed',
      'spotify_top',
    ])
  })

  it('user_artist_follows gains source/canonicalName/rank/lastSyncedAt', () => {
    expect(userArtistFollows.source.notNull).toBe(true)
    expect(userArtistFollows.source.default).toBe('manual')
    expect(userArtistFollows.canonicalName.notNull).toBe(true)
    expect(userArtistFollows.canonicalName.default).toBe('')
    expect(userArtistFollows.rank.notNull).toBe(false)
    expect(userArtistFollows.lastSyncedAt.notNull).toBe(false)
  })
})
