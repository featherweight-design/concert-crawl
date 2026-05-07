// admin-dashboard.jsx — Concert Crawl admin home.
// Cost / operations forward. Three sections:
//  1. Hero stat row — live operational signals
//  2. Crawl health table (per-venue, today)
//  3. Activity feed (filterable, unified)

const VENUE_HEALTH = [
  { id: "rrx", name: "Red Rocks Amphitheatre",  last: "12m ago",   status: "danger",  events: 0,   strategy: "structured_data", cost: 0,      err: "HTTP 403" },
  { id: "msn", name: "Mission Ballroom",        last: "32m ago",   status: "success", events: 14,  strategy: "structured_data", cost: 0,      err: null },
  { id: "blu", name: "Bluebird Theater",        last: "47m ago",   status: "warning", events: 9,   strategy: "llm",             cost: 0.42,   err: "low confidence (0.58 avg)" },
  { id: "ogd", name: "Ogden Theatre",           last: "1h ago",    status: "success", events: 11,  strategy: "structured_data", cost: 0,      err: null },
  { id: "got", name: "Gothic Theatre",          last: "1h ago",    status: "success", events: 8,   strategy: "llm",             cost: 0.18,   err: null },
  { id: "lar", name: "Larimer Lounge",          last: "—",         status: "warning", events: 0,   strategy: "manual",          cost: 0,      err: "robots.txt disallowed" },
  { id: "cer", name: "Cervantes' Masterpiece",  last: "2h ago",    status: "success", events: 6,   strategy: "structured_data", cost: 0,      err: null },
  { id: "glb", name: "Globe Hall",              last: "2h ago",    status: "success", events: 4,   strategy: "structured_data", cost: 0,      err: null },
];

const ACTIVITY = [
  { time: "12:42 PM", kind: "crawl", color: "danger",  text: "Red Rocks crawl failed",        meta: "HTTP 403 · 3rd consecutive" },
  { time: "12:38 PM", kind: "crawl", color: "success", text: "Mission Ballroom crawl ok",     meta: "14 events · structured" },
  { time: "12:31 PM", kind: "crawl", color: "warning", text: "Bluebird crawl partial",        meta: "9 events · 5 below threshold" },
  { time: "12:14 PM", kind: "invite",color: "signal",  text: "Invite redeemed",               meta: "marlene@kalimba.studio · FRT-PNK-92" },
  { time: "11:58 AM", kind: "events",color: "warning", text: "Duplicate flagged",             meta: "“Bright Eyes” · 2 sources" },
  { time: "11:42 AM", kind: "crawl", color: "success", text: "Ogden crawl ok",                meta: "11 events · structured" },
  { time: "11:30 AM", kind: "events",color: "success", text: "8 events approved",             meta: "Hugh · bulk approve" },
  { time: "11:14 AM", kind: "crawl", color: "warning", text: "Larimer paused",                meta: "robots.txt disallowed" },
];

const COST_DAYS = [0.18, 0.22, 0.31, 0.27, 0.40, 0.55, 0.48, 0.62, 0.71, 0.58, 0.84, 0.72, 0.90, 0.81, 0.95, 1.04, 0.92, 1.18, 1.04, 1.30, 1.42, 1.21, 1.55, 1.48, 1.62, 1.70, 1.85, 1.92, 2.04, 1.88];

function MorningGreeting() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div>
        <h1 style={{
          margin: 0, fontFamily: ADMIN_FONT, fontSize: 26, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.025em",
        }}>Good afternoon, Hugh.</h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)" }}>
          7 of 8 venues green · 1 blocked · 12 events waiting on you.
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <StatusBadge kind="signal" mono dot>SSE LIVE</StatusBadge>
        <AdminButton variant="outline" icon="refresh">Run all venues</AdminButton>
        <AdminButton variant="primary" icon="plus">Add venue</AdminButton>
      </div>
    </div>
  );
}

function StatRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <StatCard
        label="Pending review"
        value="12"
        unit="events"
        icon="events"
        kind="warning"
        hint="Bluebird (5), Gothic (4), Ogden (3)"
        footer={<AdminButton variant="ghost" size="sm" iconRight="chevR" fullWidth>Open queue</AdminButton>}
      />
      <StatCard
        label="LLM cost · 30d"
        value="$28.74"
        icon="cost"
        kind="signal"
        trend={{ dir: "up", text: "+18%", good: false }}
        hint="Budget $40 · 71% used"
        footer={<ProgressBar value={71} kind="signal" showLabel={false} />}
      />
      <StatCard
        label="Crawl health"
        value="7/8"
        unit="green"
        icon="activity"
        kind="success"
        hint="Red Rocks blocked · 3rd failure"
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", gap: 3 }}>
              {["success","success","success","success","success","success","success","danger"].map((s, i) => (
                <span key={i} style={{ width: 10, height: 18, borderRadius: 2, background: `var(--${s})`, opacity: 0.85 }} />
              ))}
            </span>
            <MonoLabel>last 8 runs</MonoLabel>
          </div>
        }
      />
      <StatCard
        label="Active venues"
        value="8"
        unit="of 11"
        icon="venues"
        hint="2 paused · 1 blocked"
        footer={<MonoLabel>+0 this week</MonoLabel>}
      />
    </div>
  );
}

function CostPanel() {
  return (
    <Panel
      title={
        <>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>LLM spend, last 30 days</span>
          <StatusBadge kind="warning" mono>+18% wow</StatusBadge>
        </>
      }
      action={<AdminButton variant="ghost" size="sm" iconRight="chevR">Open billing</AdminButton>}
      padding={0}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", borderTop: "0px" }}>
        <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span style={{
              fontFamily: ADMIN_MONO, fontSize: 32, fontWeight: 700,
              color: "var(--fg)", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
            }}>$28.74</span>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
              of $40 budget · resets May 31
            </span>
          </div>
          <div style={{ width: "100%", height: 110, position: "relative" }}>
            <CostChart data={COST_DAYS} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 8,
            fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em",
          }}>
            <span>APR 7</span><span>APR 14</span><span>APR 21</span><span>APR 28</span><span>MAY 6</span>
          </div>
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <MonoLabel>top spend</MonoLabel>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { v: "Bluebird Theater", c: 12.40, p: 43 },
                { v: "Gothic Theatre",   c:  8.92, p: 31 },
                { v: "Larimer Lounge",   c:  4.18, p: 15 },
                { v: "(others)",          c:  3.24, p: 11 },
              ].map(r => (
                <div key={r.v}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)" }}>{r.v}</span>
                    <CostText value={r.c} size={12} />
                  </div>
                  <ProgressBar value={r.p} kind="signal" height={4} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function CostChart({ data }) {
  const w = 100, h = 100; // viewBox %
  const max = Math.max(...data);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * (h - 8) - 2]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[25, 50, 75].map(y => (
        <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.3" strokeDasharray="1 1.5" />
      ))}
      <path d={area} fill="url(#costGrad)" />
      <path d={path} stroke="var(--signal)" strokeWidth="0.9" fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.2" fill="var(--signal)" />
    </svg>
  );
}

function VenueHealthPanel() {
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Crawl health · today</span>
        <MonoLabel>8 venues</MonoLabel>
      </>}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <AdminButton variant="ghost" size="sm" icon="filter">Filter</AdminButton>
          <AdminButton variant="ghost" size="sm" iconRight="chevR">Crawl status</AdminButton>
        </div>
      }
      padding={0}
    >
      <AdminTable style={{ border: "none", borderRadius: 0 }}>
        <THead>
          <tr>
            <TH>Venue</TH>
            <TH>Status</TH>
            <TH>Last crawl</TH>
            <TH>Strategy</TH>
            <TH align="right">Events</TH>
            <TH align="right">Cost</TH>
            <TH width={32}></TH>
          </tr>
        </THead>
        <tbody>
          {VENUE_HEALTH.map(v => (
            <TR key={v.id}>
              <TD>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{v.name}</span>
                  {v.err && <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{v.err}</span>}
                </div>
              </TD>
              <TD>
                {v.status === "success" && <StatusBadge kind="success" dot>OK</StatusBadge>}
                {v.status === "warning" && <StatusBadge kind="warning" dot>Partial</StatusBadge>}
                {v.status === "danger"  && <StatusBadge kind="danger"  dot>Failed</StatusBadge>}
              </TD>
              <TD><RelTime value={v.last} stale={v.last === "—"} /></TD>
              <TD>
                <StatusBadge kind={v.strategy === "structured_data" ? "signal" : v.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
                  {v.strategy === "structured_data" ? "structured" : v.strategy}
                </StatusBadge>
              </TD>
              <TD align="right" mono color={v.events ? "var(--fg)" : "var(--fg-subtle)"}>{v.events || "—"}</TD>
              <TD align="right"><CostText value={v.cost} dim={!v.cost} /></TD>
              <TD>
                <button style={{
                  all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
                  color: "var(--fg-muted)", display: "flex",
                }}><AdminIcon name="chevR" size={14} /></button>
              </TD>
            </TR>
          ))}
        </tbody>
      </AdminTable>
    </Panel>
  );
}

function ActivityPanel() {
  const [filter, setFilter] = React.useState("all");
  const filtered = filter === "all" ? ACTIVITY : ACTIVITY.filter(a => a.kind === filter);
  return (
    <Panel
      title="Activity"
      action={
        <div style={{ display: "flex", gap: 4, padding: 2, background: "var(--surface-1)", borderRadius: 6, border: "1px solid var(--border)" }}>
          {[
            { k: "all",    label: "All" },
            { k: "crawl",  label: "Crawl" },
            { k: "events", label: "Events" },
            { k: "invite", label: "Invites" },
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              all: "unset", cursor: "pointer",
              padding: "3px 8px", borderRadius: 4,
              fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              color: filter === t.k ? "var(--fg-on-accent)" : "var(--fg-muted)",
              background: filter === t.k ? "var(--signal)" : "transparent",
              textTransform: "uppercase",
            }}>{t.label}</button>
          ))}
        </div>
      }
      padding={0}
    >
      <div style={{ padding: "8px 0" }}>
        {filtered.map((a, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "72px 14px 1fr",
            gap: 12, alignItems: "center",
            padding: "10px 18px",
          }}>
            <span style={{
              fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600,
              color: "var(--fg-subtle)", letterSpacing: "0.03em",
              fontVariantNumeric: "tabular-nums",
            }}>{a.time}</span>
            <span style={{
              width: 8, height: 8, borderRadius: 4,
              background: `var(--${a.color})`,
              boxShadow: `0 0 0 3px color-mix(in oklab, var(--${a.color}) 22%, transparent)`,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{a.text}</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{a.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AdminDashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <MorningGreeting />
      <StatRow />
      <CostPanel />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 20 }}>
        <VenueHealthPanel />
        <ActivityPanel />
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, VENUE_HEALTH, ACTIVITY, COST_DAYS });
