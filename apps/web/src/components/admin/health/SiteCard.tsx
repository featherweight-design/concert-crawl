import type { AdminEmailDelivery } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel, StatusBadge } from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives/utils';
import { formatMtTime } from './health-model';

const copy = ADMIN_COPY.health.site;

/**
 * The Emails pill (`33/emails-states`): Sending (success), N failed (danger),
 * Quiet (neutral). Failures win over Quiet. N is failed sends in the window.
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
 * The line under Emails (`33/emails-states`). With failures it says how many
 * of how many: failed sends out of every send tried (sent or failed) in the
 * window. Bounces are recorded nowhere, so it never claims them.
 */
export const emailLine = (delivery: AdminEmailDelivery): string =>
  delivery.failed > 0
    ? copy.failedOf(
        delivery.failed,
        delivery.sent + delivery.failed,
        delivery.hours,
      )
    : delivery.lastSentAt === null
      ? copy.noneSent(delivery.hours)
      : copy.lastSent(formatMtTime(delivery.lastSentAt));

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
              {emailLine(delivery)}
            </div>
          </div>
          <StatusBadge kind={state.kind} dot size="tile">
            {state.label}
          </StatusBadge>
        </div>
      </Panel>
    </div>
  );
};
