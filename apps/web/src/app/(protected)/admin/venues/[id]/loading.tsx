export default function VenueDetailLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        paddingBottom: 32,
      }}
    >
      {/* SectionHead with back link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          className="admin-skeleton"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <div className="admin-skeleton" style={{ width: 180, height: 22 }} />
      </div>

      {/* Status + action bar */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          className="admin-skeleton"
          style={{ width: 80, height: 24, borderRadius: 12 }}
        />
        <div
          className="admin-skeleton"
          style={{ width: 120, height: 13, marginLeft: 'auto' }}
        />
        <div
          className="admin-skeleton"
          style={{ width: 90, height: 34, borderRadius: 8 }}
        />
      </div>

      {/* Core info section */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="admin-skeleton" style={{ width: 100, height: 13 }} />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div className="admin-skeleton" style={{ width: 80, height: 11 }} />
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 36, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>

      {/* Crawl config section */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="admin-skeleton" style={{ width: 120, height: 13 }} />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div
              className="admin-skeleton"
              style={{ width: 100, height: 11 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 36, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>

      {/* About section */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="admin-skeleton" style={{ width: 80, height: 13 }} />
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div className="admin-skeleton" style={{ width: 90, height: 11 }} />
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 80, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
