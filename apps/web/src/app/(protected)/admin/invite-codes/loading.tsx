export default function AdminInviteCodesLoading() {
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
          <div className="admin-skeleton" style={{ width: 110, height: 22 }} />
          <div className="admin-skeleton" style={{ width: 200, height: 13 }} />
        </div>
        <div
          className="admin-skeleton"
          style={{ width: 110, height: 34, borderRadius: 8 }}
        />
      </div>

      {/* Invite codes list */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="admin-skeleton"
              style={{ width: 140, height: 16, borderRadius: 4 }}
            />
            <div
              className="admin-skeleton"
              style={{
                width: 60,
                height: 22,
                borderRadius: 10,
                marginLeft: 'auto',
              }}
            />
            <div className="admin-skeleton" style={{ width: 80, height: 11 }} />
            <div
              className="admin-skeleton"
              style={{ width: 60, height: 28, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
