import type { AdminEmailDelivery } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel } from '@/components/admin/primitives';
import { formatMtTime } from './health-model';

const copy = ADMIN_COPY.health.site;

type Tone = 'success' | 'danger' | 'subtle';

const emailState = (
  delivery: AdminEmailDelivery,
): { label: string; tone: Tone } =>
  delivery.failed > 0
    ? { label: copy.failed(delivery.failed), tone: 'danger' }
    : delivery.sent > 0
      ? { label: copy.sending, tone: 'success' }
      : { label: copy.quiet, tone: 'subtle' };

const TONES: Record<Tone, string> = {
  success: 'var(--success)',
  danger: 'var(--danger)',
  subtle: 'var(--fg-subtle)',
};

/**
 * The site (`03/health-desktop`, right column). The board also lists the
 * production smoke, the staging e2e and the Sentry error count. 🔸 None of
 * those has an API source yet, so this card shows the one row that does:
 * emails. It never draws a number it was not given.
 */
export const SiteCard = ({ delivery }: { delivery: AdminEmailDelivery }) => {
  const state = emailState(delivery);
  return (
    <div data-testid="site-card" className="health-desk">
      <Panel title={copy.title} padding="6px 18px 8px">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 0',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              {copy.emails}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
              {delivery.lastSentAt === null
                ? copy.noneSent(delivery.hours)
                : copy.lastSent(
                    formatMtTime(delivery.lastSentAt),
                    delivery.hours,
                  )}
            </div>
          </div>
          <span
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              color: TONES[state.tone],
              border: `1px solid color-mix(in srgb, ${TONES[state.tone]} 45%, transparent)`,
              background: `color-mix(in srgb, ${TONES[state.tone]} 12%, transparent)`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: TONES[state.tone],
              }}
            />
            {state.label}
          </span>
        </div>
      </Panel>
    </div>
  );
};
