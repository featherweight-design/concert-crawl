import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const TEASER_COPY = CONSUMER_COPY.settings.watchingTeaser

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

      {/* eye icon — Watching is always an eye, never a star or a heart */}
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
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M1 9C1 9 4 3 9 3s8 6 8 6-3 6-8 6-8-6-8-6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx="9"
            cy="9"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* text */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold tracking-[-0.005em] text-fg">
            {TEASER_COPY.title}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 7px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase' as const,
              background: 'var(--accent)',
              color: 'var(--bg)',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--bg)',
                flexShrink: 0,
              }}
            />
            {TEASER_COPY.badge}
          </span>
        </div>
        <span className="text-[12px] leading-snug text-fg-muted">
          {TEASER_COPY.body}
        </span>
      </div>
    </div>
  )
}
