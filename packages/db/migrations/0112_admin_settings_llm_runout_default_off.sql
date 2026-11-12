-- Admin redesign 1c, gap G8b: the LLM budget panel's "If it runs out" switch
-- defaults to OFF (Hugh's ruling, 2026-11-12). Off means keep extracting with
-- the LLM once the monthly budget is spent, and warn; on means fall back to
-- HTML and JSON-LD only. 0106 shipped the column defaulting to on.
--
-- Expand-only: a new column default, and one guarded UPDATE of the singleton
-- row. No column, constraint or row is removed.
--
-- The UPDATE turns the switch off only when the row still holds the old
-- default and no admin ever changed this setting: every settings save writes a
-- `settings.update` audit row carrying the whole before and after, so a save
-- that moved this field shows as a before/after difference. A row an admin
-- switched off and back on again keeps its on. A save that sent `true` while
-- it was already on leaves no trace, so it is indistinguishable from the
-- default and is turned off; under the ruling off is the intended state.
--
-- Down:
--   ALTER TABLE admin_settings ALTER COLUMN llm_budget_fallback_to_structured SET DEFAULT true;
--   (the row update is not reversed: it only moved a never-chosen default)
ALTER TABLE "admin_settings"
  ALTER COLUMN "llm_budget_fallback_to_structured" SET DEFAULT false;
--> statement-breakpoint
UPDATE "admin_settings"
SET "llm_budget_fallback_to_structured" = false
WHERE "id" = 1
  AND "llm_budget_fallback_to_structured" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "audit_log"
    WHERE "action" = 'settings.update'
      AND "target_id" = 'admin_settings'
      AND ("metadata" -> 'before' -> 'llmBudgetFallbackToStructured')
        IS DISTINCT FROM ("metadata" -> 'after' -> 'llmBudgetFallbackToStructured')
  );
