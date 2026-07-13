export default function AdminInboxLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 120, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 360, height: 13 }} />
      </div>

      {/* Category rail — All + one pill per category (5 total). */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 100, height: 28, borderRadius: 20 }}
          />
        ))}
      </div>

      {/* Status rail — Unread/Read/All. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 72, height: 28, borderRadius: 20 }}
          />
        ))}
      </div>

      {/* List panel */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="admin-skeleton" style={{ width: 140, height: 14 }} />
        </div>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 16 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
