-- #764 Venue first-timer guide.
--
-- venue_guide_chips: one row per AUTHORED or PLACEHOLDER chip. The design's
-- third state, `blank`, is deliberately unrepresentable — it is the absence of
-- a row. The CHECK below enforces that, and enforces that the honest
-- placeholder is only ever valid on the accessibility chip (brief Q4).
--
-- chip_type is TEXT, not an enum, matching venues.platform: #997 expands the
-- pool to weather/restrooms/ATMs/cell service and must not need ALTER TYPE.
-- Values are validated by Zod at the API boundary.
--
-- No sort_order: display order is the GUIDE_CHIP_ORDER constant in
-- packages/types, with accessibility pinned first. Per-venue reordering was
-- never a designed affordance.

CREATE TABLE IF NOT EXISTS venue_guide_chips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  chip_type text NOT NULL,
  -- No DEFAULT: an empty body is legal only for placeholder rows, which insert
  -- '' explicitly. A DEFAULT '' would let a non-placeholder insert omit body
  -- and land in a state the CHECK below rejects.
  body text NOT NULL,
  is_placeholder boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT venue_guide_chips_state_check CHECK (
    (is_placeholder AND chip_type = 'accessibility' AND body = '')
    OR (NOT is_placeholder AND length(btrim(body)) > 0)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS venue_guide_chips_venue_type_idx
  ON venue_guide_chips (venue_id, chip_type);
--> statement-breakpoint

-- The free-form Insider tip is 1:1 with the venue and renders with its own
-- treatment (it LEADS the guide, per Hugh's R2 lock) — it is not a chip.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS insider_tip text;
--> statement-breakpoint

-- Draft vs. live. NULL = never published; the consumer endpoint omits the
-- guide entirely until this is set by the publish gate.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS guide_published_at timestamp with time zone;
