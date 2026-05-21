CREATE INDEX IF NOT EXISTS "events_verified_date_idx" ON "events" USING btree ("verified","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_log_event_id_idx" ON "price_retrieval_log" USING btree ("event_id","attempted_at" DESC);
