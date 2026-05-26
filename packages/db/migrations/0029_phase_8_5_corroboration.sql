-- Phase 8.5: corroboration method, submission notes, event reports

ALTER TABLE submission_confirms
  ADD COLUMN method text NOT NULL DEFAULT 'same-vendor'
    CHECK (method IN ('same-vendor', 'other-vendor', 'box-office'));

ALTER TABLE price_submissions
  ADD COLUMN note varchar(280);

CREATE TABLE event_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id     text NOT NULL,
  status          text NOT NULL CHECK (status IN ('sold-out', 'cancelled', 'postponed')),
  evidence_method text NOT NULL CHECK (evidence_method IN ('bought_myself', 'saw_listing', 'venue_site', 'other')),
  evidence_url    varchar(500),
  note            varchar(280),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolution      text CHECK (resolution IN ('promoted', 'rejected', 'needs-more-info')),
  admin_note      varchar(500)
);

CREATE TABLE event_report_confirms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES event_reports(id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);
