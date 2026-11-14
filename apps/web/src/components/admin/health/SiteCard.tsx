import type { AdminEmailDelivery } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel, StatusBadge } from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives/utils';
import { formatMtTime } from './health-model';

const copy = ADMIN_COPY.health.site;

/**
 * The Emails pill: Sending is drawn (success); failures (danger) and a quiet
 * window (neutral) are not, and reuse the same badge.
 */
export const emailState = (
  delivery: AdminEmailDelivery,
): { label: string; kind: StatusKind } =>
  delivery.failed > 0
    ? { label: copy.failed(delivery.failed), kind: 'danger' }
    : delivery.sent > 0
      ? { label: copy.sending, kind: 'success' }
      : { label: copy.quiet, kind: 'neutral' };

/**
 * The site (`03/health-desktop`, right column). The board also lists the
 * production smoke, the staging e2e and the Sentry error count. Hugh ruled the
 * site is email delivery only (2026-11-12), so this card shows the one row:
 * emails, drawn as the board's Emails row.
 */
export const SiteCard = ({ delivery }: { delivery: AdminEmailDelivery }) => {
  const state = emailState(delivery);
  return (
    <div data-testid="site-card" className="health-desk">
      <Panel title={copy.title} padding="6px 18px 8px">
        <div
          data-testid="site-card-emails"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {copy.emails}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {delivery.lastSentAt === null
                ? copy.noneSent(delivery.hours)
                : copy.lastSent(formatMtTime(delivery.lastSentAt))}
            </div>
          </div>
          <StatusBadge kind={state.kind} dot>
            {state.label}
          </StatusBadge>
        </div>
      </Panel>
    </div>
  );
};
