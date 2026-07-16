-- Additive: register the renewal_receipt_annual template key (#783 brand pass).
-- email_template_config is a per-template kill switch; adding the row enables
-- the annual receipt send. ON CONFLICT keeps re-runs idempotent.
INSERT INTO email_template_config (template_key, enabled) VALUES
  ('renewal_receipt_annual', true)
ON CONFLICT (template_key) DO NOTHING;
