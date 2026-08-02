export default function AdminArtistsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 90, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 260, height: 13 }} />
      </div>
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: 16,
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 16,
            }}
          >
            <div
              className="admin-skeleton"
              style={{ width: 160, height: 13 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 160, height: 13 }}
            />
            <div className="admin-skeleton" style={{ width: 90, height: 13 }} />
            <div
              className="admin-skeleton"
              style={{ width: 200, height: 13 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
