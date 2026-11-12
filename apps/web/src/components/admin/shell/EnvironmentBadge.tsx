import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { adminEnvironment } from '@/lib/admin/environment';

/** Says which admin you're in: staging is warm, production and local quiet. */
export const EnvironmentBadge = () => {
  const environment = adminEnvironment();
  const isStaging = environment === 'staging';
  return (
    <span
      data-testid="admin-environment-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        padding: '0 10px',
        borderRadius: 999,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.14em',
        whiteSpace: 'nowrap',
        color: isStaging ? 'var(--warning)' : 'var(--fg-muted)',
        background: isStaging
          ? 'color-mix(in srgb, var(--warning) 12%, transparent)'
          : 'transparent',
        border: `1px solid ${
          isStaging
            ? 'color-mix(in srgb, var(--warning) 40%, transparent)'
            : 'var(--border)'
        }`,
      }}
    >
      {ADMIN_COPY.shell.environment[environment]}
    </span>
  );
};
