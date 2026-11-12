interface SectionHeaderProps {
  title: string;
  count?: string;
  /**
   * The event page's heading, set larger (about 17px) than the 14px the other
   * lists use (bp-m-event_m_end: "More at {venue}").
   */
  large?: boolean;
}

export function SectionHeader({
  title,
  count,
  large = false,
}: SectionHeaderProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span
        className={`shrink-0 text-fg ${large ? 'text-[17px]' : 'text-[14px]'}`}
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
      {count && (
        <span
          className="shrink-0 text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
