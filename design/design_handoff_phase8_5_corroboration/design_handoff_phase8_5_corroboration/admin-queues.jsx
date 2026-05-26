// admin-queues.jsx — admin surfaces for Phase 8.5
//
// Two blocking surfaces (engineering called these out May 25 round 2):
//
//   <PriceDisputesQueue/>           — table of pending disputes across all
//                                     events. Sits inside the existing Review
//                                     page as a new auto-hide section (same
//                                     pattern as PendingSubmissionsPanel).
//
//   <EventReportsQueue/>            — table of pending event status reports
//                                     across all events. Filter chips for
//                                     kind (sold-out / cancelled / postponed).
//                                     Same panel chrome.
//
//   <EventReportResolutionPanel/>   — per-event resolution surface. Mirror
//                                     of <AdminDisputePanel/> for status
//                                     reports. Two-up: the live (or pending)
//                                     report and any counter, with promote /
//                                     keep / need-more-info actions.
//
// Visual chrome inlined here rather than importing design_handoff_admin_ui's
// primitives — keeps this handoff self-contained and avoids token conflicts
// with the consumer theme-context wrapping the rest of the canvas. The look
// and behavior match the existing Review-page sections; engineering should
// implement against the real <Panel/>, <AdminTable/>, <AdminButton/>, and
// <StatusBadge/> primitives from admin-primitives.jsx.

const AZ_Q   = window.PendingAZURE || "oklch(0.62 0.12 240)";
const GOLD_Q = window.PendingGOLD  || "oklch(0.66 0.14 78)";

// ── Mini-StatusBadge — same vocab as admin-primitives, inline ────
function AdminStatusBadge({ kind = "neutral", children, mono = true, dot = false }) {
  const palettes = {
    success:  { fg: "var(--success)",  bg: "color-mix(in oklab, var(--success) 16%, transparent)",  bd: "color-mix(in oklab, var(--success) 35%, transparent)" },
    warning:  { fg: "var(--warning)",  bg: "color-mix(in oklab, var(--warning) 16%, transparent)",  bd: "color-mix(in oklab, var(--warning) 35%, transparent)" },
    danger:   { fg: "var(--danger)",   bg: "color-mix(in oklab, var(--danger) 16%, transparent)",   bd: "color-mix(in oklab, var(--danger) 35%, transparent)" },
    signal:   { fg: "var(--signal)",   bg: "color-mix(in oklab, var(--signal) 16%, transparent)",   bd: "color-mix(in oklab, var(--signal) 35%, transparent)" },
    accent:   { fg: "var(--accent)",   bg: "color-mix(in oklab, var(--accent) 16%, transparent)",   bd: "color-mix(in oklab, var(--accent) 35%, transparent)" },
    neutral:  { fg: "var(--fg-muted)", bg: "color-mix(in oklab, var(--fg-muted) 12%, transparent)", bd: "var(--border-strong)" },
    azure:    { fg: AZ_Q,              bg: `color-mix(in oklab, ${AZ_Q} 16%, transparent)`,         bd: `color-mix(in oklab, ${AZ_Q} 40%, transparent)` },
    gold:     { fg: GOLD_Q,            bg: `color-mix(in oklab, ${GOLD_Q} 18%, transparent)`,       bd: `color-mix(in oklab, ${GOLD_Q} 50%, transparent)` },
  };
  const p = palettes[kind] || palettes.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 4,
      background: p.bg, color: p.fg,
      border: `1px solid ${p.bd}`,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "Inter, system-ui",
      fontSize: 9.5, letterSpacing: "0.06em", fontWeight: 700,
      textTransform: "uppercase", lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.fg }}/>}
      {children}
    </span>
  );
}

// ── Mini-Panel — same shape as admin-primitives Panel ────────────
function AdminPanel({ title, action, children, padding = 0 }) {
  return (
    <div style={{
      background: "var(--bg-elevated, var(--bg))",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {title && (
        <div style={{
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{title}</div>
          {action && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{action}</div>}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}

// ── Mini-Button — variant: outline | ghost | primary | success | danger ─
function AdminBtn({ children, variant = "outline", size = "sm", onClick }) {
  const sizes = { sm: { h: 28, px: 10, fs: 12 }, md: { h: 34, px: 14, fs: 13 } };
  const s = sizes[size];
  const styles = {
    outline: { bg: "transparent", fg: "var(--fg)", bd: "1px solid var(--border-strong)" },
    ghost:   { bg: "transparent", fg: "var(--fg-muted)", bd: "1px solid transparent" },
    primary: { bg: "var(--signal)", fg: "var(--fg-on-accent)", bd: "1px solid var(--signal)" },
    success: { bg: "var(--success)", fg: "var(--fg-on-accent)", bd: "1px solid var(--success)" },
    danger:  { bg: "transparent", fg: "var(--danger)", bd: "1px solid var(--danger)" },
    azure:   { bg: AZ_Q, fg: "var(--fg-on-accent)", bd: `1px solid ${AZ_Q}` },
  };
  const v = styles[variant] || styles.outline;
  return (
    <button onClick={(e) => { e.preventDefault(); onClick?.(); }} style={{
      all: "unset", cursor: "pointer", boxSizing: "border-box",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      height: s.h, padding: `0 ${s.px}px`, borderRadius: 7,
      background: v.bg, color: v.fg, border: v.bd,
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: s.fs,
      letterSpacing: "-0.005em", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ── Table chrome ─────────────────────────────────────────────────
function AdminTBL({ children }) {
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse",
      fontFamily: "Inter, system-ui",
    }}>{children}</table>
  );
}
function THCell({ children, align = "left", width }) {
  return (
    <th style={{
      padding: "10px 14px", textAlign: align, width,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
      color: "var(--fg-subtle)", letterSpacing: "0.08em",
      textTransform: "uppercase", fontWeight: 700,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-1)",
    }}>{children}</th>
  );
}
function TDCell({ children, align = "left", width, color, style }) {
  return (
    <td style={{
      padding: "12px 14px", textAlign: align, width,
      verticalAlign: "middle",
      color: color || "var(--fg)",
      fontSize: 13, fontFamily: "Inter, system-ui",
      borderBottom: "1px solid var(--border)",
      ...style,
    }}>{children}</td>
  );
}

// Sample data
const PRICE_DISPUTES = [
  {
    id: "ds-1",
    artist: "Electric Callboy", venue: "Mission Ballroom", date: "Aug 30",
    original: { floor: 48, ceiling: 58, submitter: "@hugh", confirms: 2 },
    counter:  { floor: 65, ceiling: 80, submitter: "@kel",  confirms: 0 },
    filedAt: "1h ago",
  },
  {
    id: "ds-2",
    artist: "Big Thief", venue: "Mission Ballroom", date: "Sep 14",
    original: { floor: 42, ceiling: null, submitter: "@hugh", confirms: 2, kind: "boxoffice" },
    counter:  { floor: 58, ceiling: null, submitter: "@amelia", confirms: 1, kind: "community" },
    filedAt: "6h ago",
  },
  {
    id: "ds-3",
    artist: "Phoebe Bridgers", venue: "Red Rocks", date: "Jun 14",
    original: { floor: 75, ceiling: 110, submitter: "anonymous", confirms: 2 },
    counter:  { floor: 95, ceiling: 140, submitter: "@kel", confirms: 0 },
    filedAt: "2d ago",
  },
];

const STATUS_REPORTS = [
  {
    id: "er-1", kind: "cancelled",
    artist: "Electric Callboy", venue: "Mission Ballroom", date: "Aug 30",
    evidenceType: "social",
    reporter: "@kel", reportedAt: "3h ago",
    confirms: 1, needed: 2,
    imminent: false,
  },
  {
    id: "er-2", kind: "postponed",
    artist: "Phoebe Bridgers", venue: "Red Rocks", date: "Jun 14",
    evidenceType: "email",
    reporter: "@amelia", reportedAt: "6h ago",
    confirms: 1, needed: 2,
  },
  {
    id: "er-3", kind: "cancelled",
    artist: "Wednesday", venue: "Bluebird", date: "May 28",
    evidenceType: "venue-announcement",
    reporter: "@grace", reportedAt: "30m ago",
    confirms: 0, needed: 3,    // ER_POLICY · imminent show
    imminent: true,
  },
  {
    id: "er-4", kind: "soldout",
    artist: "Cigarettes After Sex", venue: "Mission Ballroom", date: "Jul 9",
    evidenceType: "venue-visit",
    reporter: "@hugh", reportedAt: "1d ago",
    confirms: 1, needed: 2,
  },
];

// Price-range render helper
function PriceRangeText({ p }) {
  const range = p.ceiling && p.ceiling > p.floor
    ? `$${p.floor}–$${p.ceiling}`
    : `$${p.floor}`;
  return (
    <span style={{
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
      color: "var(--fg)", letterSpacing: "-0.01em",
      fontVariantNumeric: "tabular-nums",
    }}>{range}</span>
  );
}

// ============================================================
// PriceDisputesQueue
// ------------------------------------------------------------
// Auto-hides when empty (engineering convention from
// PendingSubmissionsPanel). Renders inside Review page under the
// Price coverage section.
// ============================================================
function PriceDisputesQueue({ items = PRICE_DISPUTES, theme = "light" }) {
  if (!items.length) return null;
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  return (
    <div style={{ ...themeStyle, fontFamily: "Inter, system-ui" }}>
      <AdminPanel
        title={<>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fg)" }}>
            Price disputes
          </span>
          <AdminStatusBadge kind="warning">{items.length} open</AdminStatusBadge>
        </>}
        action={<>
          <AdminBtn variant="ghost">Sort: filed-at</AdminBtn>
          <AdminBtn variant="ghost">All disputes</AdminBtn>
        </>}
      >
        <AdminTBL>
          <thead>
            <tr>
              <THCell>Event</THCell>
              <THCell>Original</THCell>
              <THCell>Counter</THCell>
              <THCell>Filed</THCell>
              <THCell align="right" width={120}></THCell>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <TDCell>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
                    {row.artist}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: "var(--fg-subtle)", letterSpacing: "0.04em",
                    marginTop: 2,
                  }}>{row.venue} · {row.date}</div>
                </TDCell>
                <TDCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PriceRangeText p={row.original}/>
                    {row.original.kind === "boxoffice" && <AdminStatusBadge kind="gold">box office</AdminStatusBadge>}
                  </div>
                  <div style={{
                    marginTop: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                    color: "var(--fg-muted)", letterSpacing: "0.04em",
                  }}>{row.original.submitter} · {row.original.confirms} confirms</div>
                </TDCell>
                <TDCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PriceRangeText p={row.counter}/>
                    <AdminStatusBadge kind="azure">pending</AdminStatusBadge>
                  </div>
                  <div style={{
                    marginTop: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                    color: "var(--fg-muted)", letterSpacing: "0.04em",
                  }}>{row.counter.submitter} · {row.counter.confirms} confirms</div>
                </TDCell>
                <TDCell>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: "var(--fg-muted)", letterSpacing: "0.04em",
                  }}>{row.filedAt}</span>
                </TDCell>
                <TDCell align="right">
                  <AdminBtn variant="outline">Resolve →</AdminBtn>
                </TDCell>
              </tr>
            ))}
          </tbody>
        </AdminTBL>
      </AdminPanel>
    </div>
  );
}

// ── Report-type label + token color (matches report-flow.jsx) ────
function reportTone(kind) {
  if (kind === "cancelled") return { color: "var(--danger)",  label: "Cancelled" };
  if (kind === "postponed") return { color: "var(--warning)", label: "Postponed" };
  if (kind === "soldout")   return { color: "var(--warning)", label: "Sold out" };
  return { color: "var(--success)", label: "Tickets available" };
}

// ============================================================
// EventReportsQueue
// ------------------------------------------------------------
// Filter chips for the report kind. Auto-hides when empty.
// Sits below PriceDisputesQueue in the Review page.
// ============================================================
function EventReportsQueue({ items = STATUS_REPORTS, theme = "light", activeFilter = "all" }) {
  if (!items.length) return null;
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  const filters = [
    { id: "all",       label: "All" },
    { id: "soldout",   label: "Sold out" },
    { id: "cancelled", label: "Cancelled" },
    { id: "postponed", label: "Postponed" },
  ];
  const shown = activeFilter === "all" ? items : items.filter(i => i.kind === activeFilter);

  return (
    <div style={{ ...themeStyle, fontFamily: "Inter, system-ui" }}>
      <AdminPanel
        title={<>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fg)" }}>
            Event status reports
          </span>
          <AdminStatusBadge kind="warning">{items.length} pending</AdminStatusBadge>
        </>}
        action={<>
          <AdminBtn variant="ghost">Sort: filed-at</AdminBtn>
          <AdminBtn variant="ghost">All reports</AdminBtn>
        </>}
      >
        {/* Filter chips */}
        <div style={{
          padding: "10px 14px",
          display: "flex", flexWrap: "wrap", gap: 6,
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--surface-1) 50%, var(--bg))",
        }}>
          {filters.map(f => {
            const active = f.id === activeFilter;
            const count = f.id === "all" ? items.length : items.filter(i => i.kind === f.id).length;
            return (
              <button key={f.id} onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                padding: "5px 10px", borderRadius: 999,
                background: active ? "var(--fg)" : "transparent",
                color: active ? "var(--bg)" : "var(--fg-muted)",
                border: active ? "1px solid var(--fg)" : "1px solid var(--border-strong)",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                display: "inline-flex", alignItems: "center", gap: 6,
                letterSpacing: "-0.005em",
              }}>
                {f.label}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                  opacity: active ? 0.7 : 0.6,
                  fontVariantNumeric: "tabular-nums",
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        <AdminTBL>
          <thead>
            <tr>
              <THCell>Event</THCell>
              <THCell>Report</THCell>
              <THCell>Evidence</THCell>
              <THCell>Progress</THCell>
              <THCell>Filed</THCell>
              <THCell align="right" width={120}></THCell>
            </tr>
          </thead>
          <tbody>
            {shown.map(row => {
              const t = reportTone(row.kind);
              return (
                <tr key={row.id}>
                  <TDCell>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
                      {row.artist}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: "var(--fg-subtle)", letterSpacing: "0.04em",
                      marginTop: 2,
                    }}>{row.venue} · {row.date}</div>
                    {row.imminent && (
                      <div style={{
                        marginTop: 4,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        color: "var(--warning)", letterSpacing: "0.06em",
                        textTransform: "uppercase", fontWeight: 700,
                      }}>imminent · &lt;7 days</div>
                    )}
                  </TDCell>
                  <TDCell>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 8px", borderRadius: 999,
                      background: `color-mix(in oklab, ${t.color} 14%, transparent)`,
                      color: t.color,
                      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 11.5,
                      letterSpacing: "-0.005em",
                    }}>{t.label}</span>
                  </TDCell>
                  <TDCell>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "2px 6px", borderRadius: 4,
                      background: "color-mix(in oklab, var(--fg) 6%, transparent)",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                      color: "var(--fg-muted)", letterSpacing: "0.06em",
                      textTransform: "uppercase", fontWeight: 700,
                      lineHeight: 1.4,
                    }}>{row.evidenceType.replace(/-/g, " ")}</span>
                  </TDCell>
                  <TDCell>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {Array.from({ length: row.needed }).map((_, i) => (
                        <span key={i} style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: i < row.confirms ? t.color : "transparent",
                          border: `1.2px solid ${t.color}`,
                          display: "inline-block",
                        }}/>
                      ))}
                      <span style={{
                        marginLeft: 4,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        color: "var(--fg-muted)", letterSpacing: "0.04em",
                        fontVariantNumeric: "tabular-nums",
                      }}>{row.confirms}/{row.needed}</span>
                    </div>
                    <div style={{
                      marginTop: 4,
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                      color: "var(--fg-muted)", letterSpacing: "0.04em",
                    }}>by {row.reporter}</div>
                  </TDCell>
                  <TDCell>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: "var(--fg-muted)", letterSpacing: "0.04em",
                    }}>{row.reportedAt}</span>
                  </TDCell>
                  <TDCell align="right">
                    <AdminBtn variant="outline">Resolve →</AdminBtn>
                  </TDCell>
                </tr>
              );
            })}
          </tbody>
        </AdminTBL>
      </AdminPanel>
    </div>
  );
}

// ============================================================
// EventReportResolutionPanel
// ------------------------------------------------------------
// Per-event resolution. Mirrors <AdminDisputePanel/> chrome so admins
// learn one pattern. Renders the pending report on the left and any
// counter (or "no counter filed yet" placeholder) on the right.
// Actions: Promote / Keep current / Need more info.
// ============================================================
function ReportEntry({ kind, evidenceType, evidenceLink, evidenceNote, reporter, reportedAt, confirms, needed, isWinner, isAdminOverride }) {
  const t = reportTone(kind);
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--surface-1)",
      border: isWinner ? `2px solid ${t.color}` : "1px solid var(--border)",
      borderRadius: 12,
      position: "relative",
    }}>
      {isWinner && (
        <span style={{
          position: "absolute", top: -10, left: 12,
          padding: "3px 8px",
          background: t.color, color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          borderRadius: 4, lineHeight: 1,
        }}>winner</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 999,
          background: `color-mix(in oklab, ${t.color} 14%, transparent)`,
          color: t.color,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          letterSpacing: "-0.005em",
        }}>{t.label}</span>
        {isAdminOverride && <AdminStatusBadge kind="neutral">admin override</AdminStatusBadge>}
      </div>

      <div style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 12px",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        letterSpacing: "0.04em",
      }}>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Reporter</span>
        <span style={{ color: "var(--fg)" }}>{reporter}</span>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Evidence</span>
        <span style={{ color: "var(--fg)" }}>{evidenceType.replace(/-/g, " ")}</span>
        {evidenceLink && (
          <>
            <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Link</span>
            <a href={evidenceLink} onClick={(e) => e.preventDefault()} style={{
              color: "var(--signal)", textDecoration: "underline",
              textDecorationColor: "var(--border-strong)",
              textUnderlineOffset: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{evidenceLink}</a>
          </>
        )}
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Reported</span>
        <span style={{ color: "var(--fg)" }}>{reportedAt}</span>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Confirms</span>
        <span style={{ color: "var(--fg)" }}>
          {confirms} of {needed}
          {needed > 2 && <span style={{ color: "var(--warning)", marginLeft: 6 }}>· ER_POLICY · imminent</span>}
        </span>
      </div>

      {evidenceNote && (
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontFamily: "Inter, system-ui", fontSize: 12.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          lineHeight: 1.45, fontStyle: "italic",
        }}>"{evidenceNote}"</div>
      )}
    </div>
  );
}

function EventReportResolutionPanel({
  theme = "light",
  winner = "report",        // "report" | "counter" | null
  hasCounter = true,
  reportKind = "cancelled",
}) {
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  const t = reportTone(reportKind);
  return (
    <div style={{
      ...themeStyle,
      width: 800, padding: 24,
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
      borderRadius: 14,
      border: "1px solid var(--border)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>Event reports · Phase 8.5</div>
          <h2 style={{
            margin: "4px 0 0",
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
            color: "var(--fg)", letterSpacing: "-0.025em",
          }}>Electric Callboy · Mission Ballroom · Aug 30</h2>
        </div>
        <AdminStatusBadge kind="warning">open report</AdminStatusBadge>
      </div>

      <div style={{
        padding: "10px 14px",
        background: "color-mix(in oklab, var(--fg) 4%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 13,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
        lineHeight: 1.5,
        marginBottom: 18,
      }}>
        A status report is pending corroboration. Promote it now, or keep the
        current state. The reporter is not penalized — reports are signal, not
        violations. Promotion creates the same status-flip a 2-fan
        corroboration would.
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: hasCounter ? "1fr 16px 1fr" : "1fr",
        alignItems: "start",
        marginBottom: 18,
      }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 8,
          }}>Pending report</div>
          <ReportEntry
            kind={reportKind}
            evidenceType="social"
            evidenceLink="https://instagram.com/p/Cz4rMnRPxLk"
            evidenceNote="Band's official IG just posted: 'tour cancelled, all dates refunded.'"
            reporter="@kel" reportedAt="3h ago"
            confirms={1} needed={2}
            isWinner={winner === "report"}
          />
        </div>
        {hasCounter && (
          <>
            <div style={{
              alignSelf: "stretch", display: "flex", alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "var(--fg-subtle)", letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>vs</div>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                color: "var(--fg-subtle)", letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 8,
              }}>Counter</div>
              <ReportEntry
                kind="available"
                evidenceType="venue-visit"
                evidenceLink=""
                evidenceNote="Just walked by the venue — marquee still shows the show. IG post might be fake / scraped from a parody account."
                reporter="@amelia" reportedAt="1h ago"
                confirms={0} needed={2}
                isWinner={winner === "counter"}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>Reason (shown to both reporters)</div>
        <div style={{
          marginTop: 6, padding: "10px 12px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          fontFamily: "Inter, system-ui", fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.005em",
          minHeight: 44,
        }}>
          Verified the IG post is from the band's official account. The
          parody-account theory doesn't hold — refunds confirmed via venue.
          Promoting cancelled. Thanks to both reporters.
        </div>
      </div>

      <div style={{
        display: "flex", gap: 10, justifyContent: "flex-end",
      }}>
        <AdminBtn variant="outline">Need more info</AdminBtn>
        {hasCounter && <AdminBtn variant="success">Promote counter</AdminBtn>}
        <AdminBtn variant="danger">Promote {t.label.toLowerCase()}</AdminBtn>
      </div>
    </div>
  );
}

window.PriceDisputesQueue = PriceDisputesQueue;
window.EventReportsQueue = EventReportsQueue;
window.EventReportResolutionPanel = EventReportResolutionPanel;
window.AdminStatusBadge = AdminStatusBadge;
window.AdminPanel = AdminPanel;
window.AdminBtn = AdminBtn;
window.AdminQ_PRICE_DISPUTES = PRICE_DISPUTES;
window.AdminQ_STATUS_REPORTS = STATUS_REPORTS;
