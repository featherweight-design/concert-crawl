export default function AdminCrawlLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="admin-skeleton" style={{ width: 120, height: 22 }} />
          <div className="admin-skeleton" style={{ width: 180, height: 13 }} />
        </div>
        <div
          className="admin-skeleton"
          style={{ width: 110, height: 34, borderRadius: 8 }}
        />
      </div>

      {/* Stat row — 2×2 on mobile, 4-across from xl up. Mirrors the Venues
          loading grid rather than the resting-state stat cards, which use
          `repeat(auto-fit, minmax(180px, 1fr))` and land on 3–4 columns well
          before xl. The gated breakpoint is a deliberate approximation for
          the skeleton (Hugh's Venues reference), not a claim of parity —
          what matters is that the four boxes stop being 80px slivers on
          320–414px viewports (#1073). */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="admin-skeleton" style={{ width: 80, height: 12 }} />
            <div className="admin-skeleton" style={{ width: 52, height: 26 }} />
          </div>
        ))}
      </div>

      {/* Run history table */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="admin-skeleton" style={{ width: 100, height: 14 }} />
        </div>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="admin-skeleton"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 130, height: 13 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 80, height: 13, marginLeft: 'auto' }}
            />
            <div className="admin-skeleton" style={{ width: 60, height: 13 }} />
            <div
              className="admin-skeleton"
              style={{ width: 52, height: 22, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
