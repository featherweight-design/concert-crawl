import { KIND_COLORS, type StatusKind } from './utils';

interface StatusBadgeProps {
  kind?: StatusKind;
  /**
   * `filled` is the panel boards' chip: a 14% tint of the kind's colour, no
   * ring, 12px, with a plain (unringed) dot.
   */
  variant?: 'soft' | 'outline' | 'mono' | 'filled';
  /**
   * Orthogonal mono-font flag. When true, applies mono-font sizing
   * regardless of variant — this lets a caller combine `variant="outline"`
   * with mono typography (e.g. the Missing tab's "missed N sweeps" chip).
   */
  mono?: boolean;
  dot?: boolean;
  children: React.ReactNode;
  /**
   * Forwarded to the rendered span for mouse-hover context. Optional.
   */
  title?: string;
  /**
   * Forwarded to the rendered span. Optional. We deliberately don't
   * override the implicit role — adding role="img" on a text badge
   * causes screen readers to announce it as a graphic, which is
   * semantically wrong. Accessible-name exposure on aria-label-decorated
   * spans is widely-supported in modern AT despite the implicit
   * role="generic"; if support gaps appear we'd promote to a role with
   * named accessibility semantics (e.g. role="status") rather than
   * misrepresent the element as an image.
   */
  'aria-label'?: string;
  /**
   * `tile` is the Health boards' pill (`03/tiles-in-each-state`,
   * `03/health-desktop` Emails row): 22px high, `0 9px`, 11.5px (11px on the
   * phone, via `--status-badge-tile-size`), a plain dot. Only the Health
   * tiles and the Emails row use it.
   */
  size?: 'default' | 'tile';
}

/** The tile pill's text: 11.5px, or admin.css's 11px on the phone. */
export const STATUS_BADGE_TILE_FONT_SIZE =
  'var(--status-badge-tile-size, 11.5px)';

export const StatusBadge = ({
  kind = 'neutral',
  variant = 'soft',
  mono = false,
  dot = false,
  children,
  title,
  'aria-label': ariaLabel,
  size = 'default',
}: StatusBadgeProps) => {
  const colors = KIND_COLORS[kind];
  const isMono = variant === 'mono' || mono;
  const isOutline = variant === 'outline';
  const isFilled = variant === 'filled';
  const isTile = size === 'tile';

  return (
    <span
      {...(title !== undefined && { title })}
      {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...(isTile && { height: 22, boxSizing: 'border-box' as const }),
        padding: isTile ? '0 9px' : isFilled ? '4px 10px' : '2px 8px',
        borderRadius: 999,
        // The phone board draws the tile pill at 11px: admin.css sets the
        // variable under the phone query, scoped to the Health tiles.
        fontSize: isTile ? STATUS_BADGE_TILE_FONT_SIZE : isFilled ? 12 : 11,
        fontWeight: 600,
        fontFamily: isMono
          ? "'JetBrains Mono', monospace"
          : "'Inter', sans-serif",
        letterSpacing: isMono ? '0.04em' : '-0.005em',
        textTransform: isMono ? 'lowercase' : undefined,
        color: colors.fg,
        background: isFilled
          ? `color-mix(in srgb, ${colors.fg} 14%, transparent)`
          : isOutline
            ? 'transparent'
            : colors.bg,
        border: isFilled ? 'none' : `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        lineHeight: isTile ? 1 : '16px',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: colors.fg,
            flexShrink: 0,
            // The tile boards draw a plain dot, with no ring.
            boxShadow:
              isFilled || isTile
                ? undefined
                : `0 0 0 3px color-mix(in oklab, ${colors.fg} 22%, transparent)`,
          }}
        />
      )}
      {children}
    </span>
  );
};
