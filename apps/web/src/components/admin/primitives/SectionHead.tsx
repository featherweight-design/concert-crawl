interface SectionHeadProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Class on the h1, e.g. to hide it where the shell already shows the title. */
  titleClassName?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * The actions take the full width below the admin breakpoint, where they
   * wrap under the title (`09/crawl-all-m` draws Crawl all venues… that way).
   */
  actionsFullWidthOnPhone?: boolean;
}

export const SectionHead = ({
  eyebrow,
  title,
  titleClassName,
  subtitle,
  actions,
  actionsFullWidthOnPhone = false,
}: SectionHeadProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}
  >
    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--fg-subtle)',
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
      )}
      {/* `overflowWrap: anywhere` lets unbroken tokens (long @handles,
          email addresses) break rather than run off the right edge at
          320px — the H1 previously clipped mid-string on admin user
          detail (#986). Paired with `minWidth: 0` on the flex-child
          parent so the intrinsic min-content of the H1 doesn't pin the
          column to the widest token. */}
      <h1
        className={titleClassName}
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          // Every admin desktop board draws the title at 28/800 with the
          // summary at 13.5 (`health-desktop` and the rest of the set).
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          overflowWrap: 'anywhere',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13.5,
            color: 'var(--fg-muted)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div
        className={actionsFullWidthOnPhone ? 'max-[720px]:w-full' : undefined}
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {actions}
      </div>
    )}
  </div>
);
