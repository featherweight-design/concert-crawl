export default function AdminSettingsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 80, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 220, height: 13 }} />
      </div>

      {/* Settings panels */}
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div className="admin-skeleton" style={{ width: 120, height: 14 }} />
          {Array.from({ length: 3 }).map((_, fidx) => (
            <div
              key={fidx}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <div
                className="admin-skeleton"
                style={{ width: 90, height: 11 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: '100%', height: 36, borderRadius: 6 }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              className="admin-skeleton"
              style={{ width: 100, height: 34, borderRadius: 8 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
