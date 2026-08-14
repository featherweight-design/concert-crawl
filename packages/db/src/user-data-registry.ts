// The single source of truth for "what happens to this table's rows when a
// user deletes their account, and does it appear in their data export?"
//
// The deletion and export helpers both read this list, so they cannot
// disagree. Those helpers land in apps/api/src/lib/user-data.ts in Gate A
// tasks 3 and 4; this file ships first, on its own, because the classification
// is the part worth reviewing separately from the code that acts on it. A table missing from here fails the coverage test in
// user-data.integration.test.ts — that failure is the point: a new table must
// be classified deliberately, not discovered missing after launch.
//
// No table in this schema carries a foreign key to a user, because user IDs
// are bare Clerk text columns. There is no DB-level cascade. This list IS the
// cascade.

export type UserDataDisposition =
  // Rows are removed outright.
  | 'delete'
  // Rows survive with the user ID nulled — the record has standalone value to
  // other users.
  | 'anonymize'
  // Rows survive intact under a legal-obligation exemption (GDPR Art.
  // 17(3)(b)). `reason` must name the obligation.
  | 'retain'
  // Table holds no user-owned data at all.
  | 'none'

export interface UserDataEntry {
  tableName: string
  disposition: UserDataDisposition
  // The column naming the row's SUBJECT — the person the row is about.
  // Deletion and export both scope on this column.
  userIdColumn: string | null
  // Every OTHER column on the table that can hold a Clerk ID — inviters,
  // revokers, granters, the admin who acted, the user an admin acted *on*.
  // These never scope an export and never drive a row's disposition; they are
  // declared because the registry claims to be the whole cascade, and a Clerk
  // ID nobody wrote down is one that survives forever. Each entry's `reason`
  // states what happens to them.
  otherUserIdColumns: readonly string[]
  exportKey: string | null
  // Explicit allowlist of columns that appear in the GDPR export, per #527.
  // NEVER export with SELECT *: it would ship internal IDs, admin notes, and
  // any column a future migration adds, silently. `null` iff exportKey is
  // null. `user_id` is deliberately never listed — the requester knows who
  // they are, and echoing it back turns an export into an identifier leak if
  // the file is shared.
  exportColumns: readonly string[] | null
  reason: string
}

export const USER_DATA_REGISTRY: readonly UserDataEntry[] = [
  // ---- Profile and identity ----
  {
    tableName: 'user_profiles',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'profile',
    exportColumns: ['handle', 'theme', 'city', 'created_at'],
    reason: 'The account itself.',
  },
  {
    tableName: 'user_roles',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: ['granted_by'],
    exportKey: 'roles',
    exportColumns: ['role', 'created_at'],
    reason:
      'Role grant is meaningless without the account, so the row goes and ' +
      '`granted_by` goes with it. When the ADMIN leaves, the roles they ' +
      'granted to others are untouched: `granted_by` is not a customer and ' +
      'stays as the record of who acted.',
  },
  {
    tableName: 'user_cred',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'credibility',
    exportColumns: ['price_cred_score', 'created_at'],
    reason: 'Derived reputation score, rebuildable and personal.',
  },

  // ---- Activity ----
  {
    tableName: 'user_events',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Watching and going. The Privacy Policy already promises this. ' +
      'Excluded from the generic export — see WATCHING_EXPORT_KEY below.',
  },
  {
    tableName: 'user_artist_follows',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'artistFollows',
    exportColumns: ['artist_name', 'spotify_artist_id', 'created_at'],
    reason: 'Personal taste data with no value to anyone else.',
  },
  {
    tableName: 'feedback',
    disposition: 'anonymize',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'feedback',
    exportColumns: ['page_url', 'category', 'message', 'created_at'],
    reason:
      'Product feedback stays actionable after the reporter leaves; the ' +
      'attribution does not need to.',
  },

  // ---- Prices ----
  {
    tableName: 'price_submissions',
    disposition: 'anonymize',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'priceSubmissions',
    exportColumns: [
      'event_id',
      'price_min',
      'price_max',
      'tier',
      'vendor',
      'how_found',
      'status',
      'created_at',
    ],
    reason:
      'Corroboration counts belong to other users. Existing behaviour; the ' +
      'Privacy Policy already describes it correctly.',
  },
  {
    tableName: 'submission_confirms',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'priceConfirmations',
    exportColumns: ['submission_id', 'confirmed_at', 'method'],
    reason:
      'A confirmation is only meaningful as a distinct corroborating identity; ' +
      'an anonymized one would let a deleted user keep inflating a count.',
  },
  {
    tableName: 'event_report_confirms',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'reportConfirmations',
    exportColumns: ['report_id', 'confirmed_at'],
    reason: 'Same reasoning as submission_confirms.',
  },

  // ---- Crews ----
  {
    tableName: 'crews',
    disposition: 'retain',
    userIdColumn: 'keeper_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'A crew is shared property. Keepership transfers to the longest-tenured ' +
      'remaining member (Q1); the crew is deleted only when the leaver was its ' +
      'sole member. Handled by a dedicated branch in deleteUserData, not by a ' +
      'blanket row delete. Note that `name` is user-authored free text, so a ' +
      'crew named after its founder keeps that string after they leave. The ' +
      'remaining members can rename it; we do not rewrite it on their behalf. ' +
      'Excluded from the generic export — see CREW_EXPORT_KEY below.',
  },
  {
    tableName: 'crew_members',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'The leaver’s own membership rows. Excluded from the generic export ' +
      'because a bare `crew_id` is an opaque internal ID of no use to the ' +
      'user — see CREW_EXPORT_KEY below.',
  },
  {
    tableName: 'crew_invites',
    disposition: 'anonymize',
    userIdColumn: 'created_by',
    otherUserIdColumns: ['revoked_by'],
    exportKey: null,
    exportColumns: null,
    reason:
      'Invites are attributed but the attribution is not load-bearing once the ' +
      'inviter is gone; the crew keeps working. revoked_by is nulled alongside. ' +
      'Excluded from export: the row is dominated by `token`, which is a live ' +
      'capability (crews.ts D3) and must never leave the system.',
  },
  {
    tableName: 'crew_mutes',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Personal preference row. Excluded from the generic export for the same ' +
      'reason as crew_members: a bare `crew_id` is an opaque internal UUID that ' +
      'tells the reader nothing. The mute state travels with the crew name ' +
      'under CREW_EXPORT_KEY instead.',
  },

  // ---- Notifications and channels ----
  {
    tableName: 'notifications',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'notifications',
    exportColumns: ['category', 'title', 'body', 'created_at'],
    reason:
      'Nullable user_id (system-level rows exist); only rows matching the user ' +
      'are removed.',
  },
  {
    tableName: 'user_notification_preferences',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'notificationPreferences',
    exportColumns: [
      'master_enabled',
      'watch_updates_enabled',
      'price_drops_enabled',
      'artist_alerts_enabled',
      'artist_auto_watch',
      'weekly_digest_enabled',
      'product_emails_enabled',
      'updated_at',
    ],
    reason: 'Preferences for an account that no longer exists.',
  },
  {
    tableName: 'push_subscriptions',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Live push endpoints. Must go, or a deleted user keeps receiving pushes. ' +
      'Excluded from export: the endpoint plus p256dh/auth keys are a sending ' +
      'capability, not useful personal data.',
  },

  // ---- Spotify ----
  {
    tableName: 'user_spotify_connections',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'spotifyConnection',
    exportColumns: [
      'spotify_user_id',
      'display_name',
      'status',
      'auto_watch',
      'connected_at',
      'last_synced_at',
      'artist_count',
    ],
    reason:
      'Holds spotify_user_id and display_name. NOTE: it does NOT hold OAuth ' +
      'tokens — those come from Clerk via getUserOauthAccessToken (see ' +
      'apps/api/src/lib/spotify.ts:3-5), so deleting the Clerk user revokes ' +
      'the grant.',
  },
  {
    tableName: 'spotify_alert_log',
    disposition: 'delete',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Idempotency ledger. Internal plumbing, no user-facing meaning.',
  },

  // ---- Billing: RETAINED under legal obligation (D1) ----
  // Export columns here deliberately omit every Stripe identifier
  // (stripe_customer_id, stripe_subscription_id, payment-method fingerprints).
  // They are internal IDs under #527's exclusion, and they are the handles an
  // attacker would want most from a leaked export file.
  {
    tableName: 'subscriptions',
    disposition: 'retain',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'subscriptions',
    exportColumns: [
      'tier',
      'status',
      'current_period_end',
      'cancel_at_period_end',
      'created_at',
    ],
    reason:
      'Financial record. Retained for tax/accounting obligations under GDPR ' +
      'Art. 17(3)(b). Disclosed in the Privacy Policy retention section.',
  },
  {
    tableName: 'user_billing',
    disposition: 'retain',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'billing',
    exportColumns: [
      'trial_ends_at',
      'premium_data_expires_at',
      'created_at',
      'updated_at',
    ],
    reason: 'Financial record. Same basis as subscriptions.',
  },
  {
    tableName: 'subscription_events',
    disposition: 'retain',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'subscriptionEvents',
    exportColumns: ['type', 'created_at'],
    reason: 'Financial audit trail. Same basis as subscriptions.',
  },
  {
    tableName: 'gifted_comps',
    disposition: 'retain',
    userIdColumn: 'user_id',
    otherUserIdColumns: ['granted_by'],
    exportKey: 'giftedComps',
    exportColumns: ['expires_at', 'redeemed_at', 'revoked_at', 'created_at'],
    reason:
      'Records value granted; needed to reconcile comped access against ' +
      'revenue. Same basis as subscriptions. `granted_by` also holds a Clerk ' +
      'ID, but it is an admin acting, not the recipient — it is never exported ' +
      'and never cleared on the recipient’s deletion.',
  },
  {
    tableName: 'email_send_log',
    disposition: 'retain',
    userIdColumn: 'user_id',
    otherUserIdColumns: [],
    exportKey: 'emailLog',
    exportColumns: ['template_key', 'status', 'created_at'],
    reason:
      'Proof of what transactional mail was sent and when — the record that ' +
      'answers a billing dispute. Same basis as subscriptions.',
  },
  {
    tableName: 'audit_log',
    disposition: 'retain',
    userIdColumn: 'actor_id',
    otherUserIdColumns: ['target_id'],
    exportKey: null,
    exportColumns: null,
    reason:
      'Security record of administrative action. Deleting it on request would ' +
      'let a bad actor erase evidence. Excluded from export: it records admin ' +
      'activity, not the user’s own. `target_id` is polymorphic — usually a ' +
      'venue or event UUID, but a Clerk ID when an admin acts on a user ' +
      '(admin/users.ts:302). Both are retained under the same basis: an audit ' +
      'trail that can be edited by its subject is not an audit trail.',
  },

  // ---- No user data ----
  {
    tableName: 'venues',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: ['verified_by'],
    exportKey: null,
    exportColumns: null,
    reason:
      'Public venue catalogue. `verified_by` is the admin who signed off on the ' +
      'listing, not a customer, and stays as the record of who acted.',
  },
  {
    tableName: 'events',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Public event catalogue.',
  },
  {
    tableName: 'artists',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Public artist catalogue.',
  },
  {
    tableName: 'crawl_runs',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Crawler telemetry.',
  },
  {
    tableName: 'crawl_triggers',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: ['triggered_by'],
    exportKey: null,
    exportColumns: null,
    reason:
      'Crawler scheduling. `triggered_by` is the admin who forced a run, not a ' +
      'customer, and stays as the record of who acted.',
  },
  {
    tableName: 'price_retrieval_log',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Automated price-fetch telemetry, no submitter.',
  },
  {
    tableName: 'event_reports',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Aggregate report state; the per-user rows live in event_report_confirms.',
  },
  {
    tableName: 'venue_guide_chips',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Venue guide content keyed to a venue and authored by admins. No ' +
      'customer column of any kind.',
  },
  {
    tableName: 'venue_fault_acknowledgements',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: ['acknowledged_by'],
    exportKey: null,
    exportColumns: null,
    reason:
      'Operator judgement about a venue’s crawl behaviour. `acknowledged_by` is ' +
      'the admin who made the call, not a customer, and stays as the record of ' +
      'who acted — same basis as crawl_triggers.triggered_by.',
  },
  {
    tableName: 'invite_codes',
    disposition: 'anonymize',
    userIdColumn: 'used_by',
    otherUserIdColumns: ['created_by', 'revoked_by'],
    exportKey: 'inviteCodeRedemption',
    exportColumns: ['code', 'used_at'],
    reason:
      'The code itself is ours, but `used_by` records which customer redeemed ' +
      'it, so this is not the unowned table it looks like. The row survives ' +
      'with `used_by` nulled: a redeemed code must not become redeemable again ' +
      'just because its redeemer left. `created_by` and `revoked_by` are ' +
      'admins and are untouched.',
  },
  {
    tableName: 'waitlist_entries',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason:
      'Email-keyed pre-account records with no Clerk user ID. Removal is an ' +
      'email-based request, not an account deletion.',
  },
  {
    tableName: 'founder_window',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Global pricing-window config.',
  },
  {
    tableName: 'processed_stripe_events',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Stripe webhook idempotency ledger, keyed by Stripe event ID.',
  },
  {
    tableName: 'email_template_config',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'Admin template settings.',
  },
  {
    tableName: 'cost_tracking',
    disposition: 'none',
    userIdColumn: null,
    otherUserIdColumns: [],
    exportKey: null,
    exportColumns: null,
    reason: 'LLM/infra spend telemetry.',
  },
]

// Crews are the one export the registry cannot express, and the exception is
// deliberate rather than an oversight.
//
// The generic builder emits `SELECT <allowlist> FROM <table> WHERE <col> = $me`,
// one table at a time. Neither crew table answers "what crews am I in?" on its
// own: `crews` keyed by `keeper_id` returns only the crews you run, and
// `crew_members` returns opaque `crew_id` UUIDs. Both entries above therefore
// carry `exportKey: null`, and collectUserData joins them under this key.
//
// ⛔ The join selects the crew NAME, YOUR join date, and whether YOU muted it,
// and nothing else.
// Hugh, 2026-08-13: "Never ever export other members identities. Exports
// should be tied to 'What crews is MY user tied to', not membership roles for
// those crews." No member list, no roles, not even a member count — a count
// is small but it is still a fact about other people, and a data-subject
// right must not become a way to enumerate them.
export const CREW_EXPORT_KEY = 'crews'

// Watching is the second exception, for the same structural reason as crews.
//
// #527 specifies `event_id (+ event title/date/venue via join)`, and the join is
// the whole point: a bare `event_id` UUID is not portable data. It resolves to
// nothing a person can read, and it names a row in OUR database rather than a
// night in theirs. The generic single-table builder cannot reach `events` or
// `venues`, so `user_events` carries `exportKey: null` and collectUserData joins
// it under this key.
//
// The join also carries `attending_at`, which the registry allowlist never
// included: it postdates #527's table and is the difference between a show you
// watched and a show you went to. That is the user's own fact about themselves
// and belongs in their copy.
export const WATCHING_EXPORT_KEY = 'watching'
