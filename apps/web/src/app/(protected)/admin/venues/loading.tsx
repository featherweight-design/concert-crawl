export default function AdminVenuesLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="admin-skeleton" style={{ width: 80, height: 22 }} />
          <div className="admin-skeleton" style={{ width: 140, height: 13 }} />
        </div>
        <div
          className="admin-skeleton"
          style={{ width: 100, height: 34, borderRadius: 8 }}
        />
      </div>

      {/* Stat cards */}
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
            <div className="admin-skeleton" style={{ width: 48, height: 26 }} />
            <div className="admin-skeleton" style={{ width: 90, height: 11 }} />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 72, height: 30, borderRadius: 20 }}
          />
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 80px 80px 80px',
            gap: 12,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="admin-skeleton"
              style={{ height: 11, width: idx === 0 ? 80 : '100%' }}
            />
          ))}
        </div>

        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 80px 80px 80px',
              gap: 12,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                className="admin-skeleton"
                style={{ width: 140, height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: 100, height: 11 }}
              />
            </div>
            {Array.from({ length: 5 }).map((_, cidx) => (
              <div
                key={cidx}
                className="admin-skeleton"
                style={{ height: 20, borderRadius: 10 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
