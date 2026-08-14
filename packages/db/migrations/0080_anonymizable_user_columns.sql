-- USER_DATA_REGISTRY anonymizes these two tables rather than deleting their
-- rows: product feedback stays actionable after its reporter leaves, and
-- revoking a crew invite because its inviter deleted their account would break
-- a live link the crew is still using.
--
-- Anonymization works by nulling the Clerk ID, which a NOT NULL constraint made
-- impossible. Dropping the constraint is the expand half of expand/contract and
-- is safe on its own: no existing row holds NULL, and nothing writes NULL until
-- deleteUserData lands in Gate A task 3.

ALTER TABLE "feedback" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "crew_invites" ALTER COLUMN "created_by" DROP NOT NULL;
