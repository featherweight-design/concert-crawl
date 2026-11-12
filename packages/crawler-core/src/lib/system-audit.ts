import { db, auditLog } from '@concert-crawl/db';
import { reportFailure } from '@concert-crawl/logger';

/** `audit_log.actor_id` for what the crawler does on its own. */
export const SYSTEM_CRAWLER_ACTOR = 'system:crawler';

/**
 * Records something the system did without an admin. Best effort by design:
 * the audit row explains a crawl's side effect, so a failure writing it is
 * reported and never fails the crawl.
 */
export async function recordSystemAction(entry: {
  action: string;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: SYSTEM_CRAWLER_ACTOR,
      action: entry.action,
      targetId: entry.targetId,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    reportFailure({
      event: 'crawl.system_audit_error',
      severity: 'warn',
      error: String(err),
      auditAction: entry.action,
    });
  }
}
