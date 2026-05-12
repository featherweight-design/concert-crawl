export function WatchingTeaser() {
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3.5"
      style={{
        borderColor: 'var(--border-strong)',
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--surface-1)), var(--surface-1) 70%)',
      }}
    >
      {/* radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--accent) 20%, transparent), transparent 60%)',
        }}
      />

      {/* star icon */}
      <div
        className="relative inline-flex shrink-0 items-center justify-center rounded-[10px]"
        style={{
          width: 38,
          height: 38,
          background: 'color-mix(in oklch, var(--accent) 14%, transparent)',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 1.5l1.94 3.93 4.34.63-3.14 3.06.74 4.32L8 11.4l-3.88 2.04.74-4.32L1.72 6.06l4.34-.63z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* text */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold tracking-[-0.005em] text-fg">
            Watching
          </span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
            }}
          >
            Coming soon
          </span>
        </div>
        <span className="text-[12px] leading-snug text-fg-muted">
          Shows you&apos;ve starred — price alerts when they dip.
        </span>
      </div>
    </div>
  )
}
