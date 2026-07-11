-- Monetization schema expand (#775 eng infra spec Part 1 §1–§9, execution
-- plan PR 2.1). Expand-only: no drops, no renames, no type narrowing. All
-- seed rows are inert (founder_window.opens_at stays NULL) and no code reads
-- the new tables until later PRs, so backout = revert the deploy.

-- 1. subscription_tier expansion (spec §1). Each ADD VALUE is its own
--    statement — Postgres disallows ADD VALUE in multi-statement
--    transactions on older versions; separate statements keep this safe.
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'supporter';
--> statement-breakpoint
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'founder';
--> statement-breakpoint

-- 2. subscription_status expansion (spec §1) — Stripe status mirror.
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
--> statement-breakpoint
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
--> statement-breakpoint
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
--> statement-breakpoint

-- 3. subscription_event_type — new audit enum (spec §5), exactly 16 values.
CREATE TYPE subscription_event_type AS ENUM (
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
  'data_purged'
);
--> statement-breakpoint

-- 4. subscriptions additions (spec §2) + one-live-row-per-user uniqueness.
--    Verified against staging + prod before landing: no user has more than
--    one subscriptions row today.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_price_id text;
--> statement-breakpoint
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique_idx
  ON subscriptions (user_id);
--> statement-breakpoint

-- 5. user_billing (spec §3) — billing-adjacent state that must exist without
--    a subscription row (card-less trial, Decision 13). Lazily upserted.
CREATE TABLE IF NOT EXISTS user_billing (
  user_id text PRIMARY KEY,
  trial_ends_at timestamptz,
  last_trial_ended_shown_at timestamptz,
  day_thirteen_banner_dismissed_at timestamptz,
  past_due_banner_dismissed_at timestamptz,
  premium_data_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 6. founder_window singleton (spec §4). closes_at is generated so it
--    propagates NULL while opens_at is NULL (window not yet opened).
--    NOTE: the spec's verbatim `opens_at + make_interval(...)` is rejected
--    by Postgres — `timestamptz + interval` is only STABLE (DST-dependent),
--    and generated columns require IMMUTABLE expressions. Round-tripping
--    through `AT TIME ZONE 'utc'` makes the arithmetic immutable and matches
--    the store-UTC convention; results are identical for whole-day windows.
CREATE TABLE IF NOT EXISTS founder_window (
  id integer PRIMARY KEY,
  opens_at timestamptz,
  seats_total integer NOT NULL,
  seats_remaining integer NOT NULL,
  seats_remaining_test integer NOT NULL,
  window_days integer NOT NULL,
  closes_at timestamptz GENERATED ALWAYS AS (
    ((opens_at AT TIME ZONE 'utc') + make_interval(days => window_days))
      AT TIME ZONE 'utc'
  ) STORED,
  CONSTRAINT founder_window_singleton_check CHECK (id = 1),
  CONSTRAINT founder_window_seats_remaining_check CHECK (seats_remaining >= 0)
);
--> statement-breakpoint

-- 7. subscription_events append-only audit trail (spec §5).
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type subscription_event_type NOT NULL,
  stripe_event_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS subscription_events_user_id_idx
  ON subscription_events (user_id);
--> statement-breakpoint

-- 8. processed_stripe_events webhook idempotency (spec §6). Handler does
--    INSERT … ON CONFLICT DO NOTHING RETURNING event_id; no row = replay.
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 9. gifted_comps — source of truth for gifted Premium (spec §7). Backfill
--    from Clerk publicMetadata runs via checked-in tsx script, not here.
CREATE TABLE IF NOT EXISTS gifted_comps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  granted_by text NOT NULL,
  expires_at timestamptz,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS gifted_comps_user_id_unique_idx
  ON gifted_comps (user_id);
--> statement-breakpoint

-- 10. email_send_log — transactional-send idempotency + audit (spec §8).
CREATE TABLE IF NOT EXISTS email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  user_id text NOT NULL,
  dedupe_key text NOT NULL,
  resend_id text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS email_send_log_template_dedupe_unique_idx
  ON email_send_log (template_key, dedupe_key);
--> statement-breakpoint

-- 11. email_template_config — per-template kill switch (spec §8).
CREATE TABLE IF NOT EXISTS email_template_config (
  template_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 12. Seed founder_window (spec §4/§9): single row, opens_at = NULL until
--     launch day (Hugh-only flip). ON CONFLICT keeps re-runs idempotent.
INSERT INTO founder_window
  (id, opens_at, seats_total, seats_remaining, seats_remaining_test, window_days)
VALUES (1, NULL, 100, 100, 100, 30)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- 13. Seed email_template_config with all 10 #783 template keys (Part 2
--     §4.4), enabled.
INSERT INTO email_template_config (template_key, enabled) VALUES
  ('welcome_paid', true),
  ('welcome_gifted', true),
  ('renewal_receipt_monthly', true),
  ('dunning_1_card_declined', true),
  ('dunning_2_still_declined', true),
  ('dunning_3_final_warning', true),
  ('card_expiring_soon', true),
  ('cancellation_ack', true),
  ('gifting_ending_notice', true),
  ('winback', true)
ON CONFLICT (template_key) DO NOTHING;
