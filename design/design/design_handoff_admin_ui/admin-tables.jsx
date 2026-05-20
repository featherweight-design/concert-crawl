// admin-tables.jsx — Three table-driven admin pages.
//   • AdminVenuesPage   — /admin/venues   (config, robots, scheduling, strategy)
//   • AdminPricesPage   — /admin/prices   (price snapshots per event over time)
//   • AdminInvitesPage  — /admin/invites  (invite code creation, redemption, audit)

// ─────────────────────────────────────────────────────────────────────
// VENUES
// ─────────────────────────────────────────────────────────────────────
const VENUES = [
  { id: "rrx", name: "Red Rocks Amphitheatre",   url: "redrocksonline.com/events",   robots: "ok",       strategy: "structured_data", schedule: "every 6h",  status: "blocked",  health: 0.0, last: "12m ago", events: 0,   note: "HTTP 403" },
  { id: "msn", name: "Mission Ballroom",         url: "missionballroom.com/events",  robots: "ok",       strategy: "structured_data", schedule: "every 6h",  status: "active",   health: 1.0, last: "32m ago", events: 14 },
  { id: "blu", name: "Bluebird Theater",         url: "bluebirdtheater.net/calendar",robots: "ok",       strategy: "llm",             schedule: "every 6h",  status: "active",   health: 0.78,last: "47m ago", events: 9, note: "low confidence avg 0.58" },
  { id: "ogd", name: "Ogden Theatre",            url: "ogdentheatre.com/events",     robots: "ok",       strategy: "structured_data", schedule: "every 6h",  status: "active",   health: 1.0, last: "1h ago",  events: 11 },
  { id: "got", name: "Gothic Theatre",           url: "gothictheatre.com/events",    robots: "ok",       strategy: "llm",             schedule: "every 12h", status: "active",   health: 0.95,last: "1h ago",  events: 8 },
  { id: "lar", name: "Larimer Lounge",           url: "larimerlounge.com/calendar",  robots: "blocked",  strategy: "manual",          schedule: "—",         status: "paused",   health: 0.0, last: "—",       events: 0, note: "robots.txt disallows /events/" },
  { id: "cer", name: "Cervantes' Masterpiece",   url: "cervantesmasterpiece.com",    robots: "ok",       strategy: "structured_data", schedule: "every 12h", status: "active",   health: 1.0, last: "2h ago",  events: 6 },
  { id: "glb", name: "Globe Hall",               url: "globehall.com/events",        robots: "ok",       strategy: "structured_data", schedule: "daily",     status: "active",   health: 1.0, last: "2h ago",  events: 4 },
  { id: "soi", name: "Soiled Dove Underground",  url: "soileddove.com/calendar",     robots: "unknown",  strategy: "—",               schedule: "—",         status: "draft",    health: null,last: "never",   events: 0 },
];

function HealthDot({ value }) {
  if (value === null) return <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--surface-2)", display: "inline-block", border: "1px dashed var(--border)" }} />;
  const kind = value >= 0.95 ? "success" : value >= 0.7 ? "warning" : "danger";
  return <span style={{ width: 8, height: 8, borderRadius: 4, background: `var(--${kind})`, display: "inline-block", boxShadow: `0 0 0 3px color-mix(in oklab, var(--${kind}) 22%, transparent)` }} />;
}

function statusToVenue(s) {
  return ({
    active:  <StatusBadge kind="success" dot>Active</StatusBadge>,
    paused:  <StatusBadge kind="warning" dot>Paused</StatusBadge>,
    blocked: <StatusBadge kind="danger"  dot>Blocked</StatusBadge>,
    draft:   <StatusBadge kind="neutral">Draft</StatusBadge>,
  })[s];
}

function AdminVenuesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Sources"
        title="Venues"
        subtitle="Configure crawl targets. Each row is a Cloudflare Worker schedule."
        actions={
          <>
            <AdminButton variant="outline" icon="filter">Status</AdminButton>
            <AdminButton variant="outline" icon="external">robots.txt audit</AdminButton>
            <AdminButton variant="primary" icon="plus">Add venue</AdminButton>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Total venues"     value="11" icon="venues" />
        <StatCard label="Active"           value="7"  icon="venues" kind="success" />
        <StatCard label="Paused / blocked" value="2"  icon="venues" kind="warning" />
        <StatCard label="Avg health · 7d"  value="93%" icon="activity" kind="signal" hint="median run success rate" />
      </div>

      <Panel title={<><span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Configured venues</span><MonoLabel>{VENUES.length}</MonoLabel></>}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="ghost" size="sm" icon="filter">Strategy</AdminButton>
            <AdminButton variant="ghost" size="sm" icon="filter">Schedule</AdminButton>
          </div>
        } padding={0}>
        <AdminTable style={{ border: "none", borderRadius: 0 }}>
          <THead>
            <tr>
              <TH width={28}><input type="checkbox" style={{ accentColor: "var(--signal)" }} /></TH>
              <TH>Venue</TH>
              <TH>Source URL</TH>
              <TH>robots.txt</TH>
              <TH>Strategy</TH>
              <TH>Schedule</TH>
              <TH>Status</TH>
              <TH>Health</TH>
              <TH align="right">Last crawl</TH>
              <TH align="right">Events</TH>
              <TH width={32}></TH>
            </tr>
          </THead>
          <tbody>
            {VENUES.map(v => (
              <TR key={v.id}>
                <TD><input type="checkbox" style={{ accentColor: "var(--signal)" }} /></TD>
                <TD>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{v.name}</span>
                    {v.note && <span style={{ fontSize: 11, color: v.status === "blocked" ? "var(--danger)" : "var(--fg-muted)" }}>{v.note}</span>}
                  </div>
                </TD>
                <TD mono color="var(--fg-muted)">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AdminIcon name="external" size={11} color="var(--fg-subtle)" />
                    {v.url}
                  </span>
                </TD>
                <TD>
                  {v.robots === "ok"      && <StatusBadge kind="success" mono>allowed</StatusBadge>}
                  {v.robots === "blocked" && <StatusBadge kind="danger"  mono>disallowed</StatusBadge>}
                  {v.robots === "unknown" && <StatusBadge kind="neutral" mono>unchecked</StatusBadge>}
                </TD>
                <TD>
                  <StatusBadge kind={v.strategy === "structured_data" ? "signal" : v.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
                    {v.strategy === "structured_data" ? "structured" : v.strategy}
                  </StatusBadge>
                </TD>
                <TD mono color="var(--fg-muted)">{v.schedule}</TD>
                <TD>{statusToVenue(v.status)}</TD>
                <TD>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <HealthDot value={v.health} />
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontVariantNumeric: "tabular-nums", color: v.health === null ? "var(--fg-subtle)" : "var(--fg-muted)" }}>
                      {v.health === null ? "—" : `${Math.round(v.health * 100)}%`}
                    </span>
                  </span>
                </TD>
                <TD align="right" mono color="var(--fg-muted)">{v.last}</TD>
                <TD align="right" mono color={v.events ? "var(--fg)" : "var(--fg-subtle)"}>{v.events || "—"}</TD>
                <TD>
                  <button style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-muted)" }}>
                    <AdminIcon name="more" size={14} />
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PRICES — snapshots over time, per event
// ─────────────────────────────────────────────────────────────────────
const PRICE_EVENTS = [
  {
    id: "evt-2840", title: "Khruangbin",        venue: "Mission Ballroom", date: "May 16",
    current: { low: 55, high: 95 }, opened: { low: 45, high: 85 },
    sparkline: [45, 48, 50, 52, 55, 60, 65, 70, 80, 85, 90, 95, 95, 95],
    delta: 0.18, lastUpdate: "12:38 PM",
  },
  {
    id: "evt-2835", title: "Cigarettes After Sex", venue: "Mission Ballroom", date: "May 27",
    current: { low: 65, high: 110 }, opened: { low: 55, high: 95 },
    sparkline: [55, 55, 55, 60, 60, 65, 65, 70, 80, 95, 95, 100, 105, 110],
    delta: 0.17, lastUpdate: "12:38 PM",
  },
  {
    id: "evt-2841", title: "Bright Eyes",         venue: "Bluebird Theater", date: "May 14",
    current: { low: 38, high: 65 }, opened: { low: 38, high: 65 },
    sparkline: [38, 38, 38, 38, 40, 42, 45, 48, 50, 55, 60, 62, 65, 65],
    delta: 0.00, lastUpdate: "12:31 PM",
  },
  {
    id: "evt-2818", title: "Vampire Weekend",     venue: "Red Rocks", date: "Jun 02",
    current: { low: 78, high: 165 }, opened: { low: 65, high: 145 },
    sparkline: [65, 65, 70, 72, 75, 75, 78, 80, 90, 110, 130, 150, 165, 165],
    delta: 0.20, lastUpdate: "yesterday" , flag: "spike",
  },
  {
    id: "evt-2812", title: "Mitski",              venue: "Mission Ballroom", date: "Jun 11",
    current: { low: 50, high: 50 }, opened: { low: 50, high: 50 },
    sparkline: [50,50,50,50,50,50,50,50,50,50,50,50,50,50],
    delta: 0.00, lastUpdate: "yesterday",
  },
  {
    id: "evt-2810", title: "Caroline Polachek",   venue: "Ogden Theatre", date: "Jun 14",
    current: { low: 0, high: 0 }, opened: { low: 38, high: 75 },
    sparkline: [38,40,42,42,45,48,50,52,55,55,55,55,55,0],
    delta: -1.00, lastUpdate: "1h ago", flag: "soldout",
  },
];

function Sparkline({ data, kind = "signal", flag }) {
  const w = 80, h = 24;
  const max = Math.max(...data, 1);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * (h - 4) - 2]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const lineColor = flag === "spike" ? "var(--danger)" : flag === "soldout" ? "var(--fg-subtle)" : `var(--${kind})`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.6" fill={lineColor} />
    </svg>
  );
}

function PriceDelta({ value }) {
  if (value === 0) return <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums" }}>±0%</span>;
  const up = value > 0;
  const color = up ? "var(--danger)" : value <= -0.5 ? "var(--fg-subtle)" : "var(--success)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
      <AdminIcon name={up ? "arrowUR" : "arrowDR"} size={10} />
      {value === -1 ? "sold out" : `${up ? "+" : ""}${Math.round(value * 100)}%`}
    </span>
  );
}

function AdminPricesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Pricing"
        title="Price snapshots"
        subtitle="Hourly samples per event. Spikes and sell-outs surface on the front page."
        actions={
          <>
            <AdminButton variant="outline" icon="filter">Venue</AdminButton>
            <AdminButton variant="outline" icon="filter">Δ &gt; 15%</AdminButton>
            <AdminButton variant="primary" icon="refresh">Snapshot now</AdminButton>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Tracked events"  value="218" icon="db" />
        <StatCard label="Snapshots · 24h" value="5,232" icon="activity" kind="signal" />
        <StatCard label="Price spikes"    value="3"   icon="alert" kind="warning" hint="Δ ≥ +15% in 24h" />
        <StatCard label="Sold out"        value="7"   icon="alert" kind="neutral" hint="across 4 venues" />
      </div>

      <Panel title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Recent price activity</span>
        <MonoLabel>last 14 days</MonoLabel>
      </>} action={
        <AdminButton variant="ghost" size="sm" iconRight="chevR">Export CSV</AdminButton>
      } padding={0}>
        <AdminTable style={{ border: "none", borderRadius: 0 }}>
          <THead>
            <tr>
              <TH>Event</TH>
              <TH>Venue / Date</TH>
              <TH align="right">Opened</TH>
              <TH align="right">Current</TH>
              <TH align="right">Δ</TH>
              <TH>14-day</TH>
              <TH align="right">Last update</TH>
              <TH width={36}></TH>
            </tr>
          </THead>
          <tbody>
            {PRICE_EVENTS.map(e => (
              <TR key={e.id}>
                <TD>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{e.title}</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>{e.id}</span>
                  </div>
                </TD>
                <TD>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{e.venue}</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>{e.date}</span>
                  </div>
                </TD>
                <TD align="right" mono color="var(--fg-muted)">
                  ${e.opened.low}{e.opened.low !== e.opened.high && `–${e.opened.high}`}
                </TD>
                <TD align="right" mono>
                  {e.current.low === 0 && e.current.high === 0
                    ? <span style={{ color: "var(--fg-subtle)" }}>—</span>
                    : <span style={{ color: "var(--fg)", fontWeight: 700 }}>
                        ${e.current.low}{e.current.low !== e.current.high && `–${e.current.high}`}
                      </span>}
                </TD>
                <TD align="right">
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                    {e.flag === "spike"   && <StatusBadge kind="danger" mono>spike</StatusBadge>}
                    {e.flag === "soldout" && <StatusBadge kind="neutral" mono>sold out</StatusBadge>}
                    <PriceDelta value={e.delta} />
                  </div>
                </TD>
                <TD>
                  <Sparkline data={e.sparkline} kind="signal" flag={e.flag} />
                </TD>
                <TD align="right" mono color="var(--fg-muted)">{e.lastUpdate}</TD>
                <TD>
                  <button style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-muted)" }}>
                    <AdminIcon name="chevR" size={14} />
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// INVITES
// ─────────────────────────────────────────────────────────────────────
const INVITES = [
  { code: "FRT-PNK-92",  invitee: "marlene@kalimba.studio",     created: "May 5",   redeemed: "Today 12:14",   expires: "—",        sender: "Hugh", status: "redeemed" },
  { code: "BLU-OWL-18",  invitee: "drew@cassettelabel.fm",      created: "May 5",   redeemed: null,              expires: "in 23h",   sender: "Hugh", status: "active"  },
  { code: "SLV-CAT-44",  invitee: "noor@thelongtail.co",        created: "May 4",   redeemed: "Yesterday 22:08", expires: "—",        sender: "Hugh", status: "redeemed" },
  { code: "GLD-FOX-71",  invitee: "rae@halfwaythere.org",       created: "May 3",   redeemed: null,              expires: "expired",  sender: "Hugh", status: "expired" },
  { code: "RED-OAK-05",  invitee: "(unsent)",                    created: "May 2",   redeemed: null,              expires: "in 4d",    sender: "Hugh", status: "active"  },
  { code: "GRN-BAY-67",  invitee: "junie@nightowlpress.com",    created: "May 1",   redeemed: "May 1, 19:42",    expires: "—",        sender: "Hugh", status: "redeemed" },
  { code: "VIO-LET-23",  invitee: "andre@goldenyears.fm",       created: "Apr 29",  redeemed: null,              expires: "expired",  sender: "Hugh", status: "revoked" },
];

function statusToInvite(s) {
  return ({
    active:   <StatusBadge kind="signal"  dot>Active</StatusBadge>,
    redeemed: <StatusBadge kind="success" dot>Redeemed</StatusBadge>,
    expired:  <StatusBadge kind="neutral">Expired</StatusBadge>,
    revoked:  <StatusBadge kind="danger"  dot>Revoked</StatusBadge>,
  })[s];
}

function InviteCreatorPanel() {
  return (
    <Panel title="Mint a new invite" padding={0}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr auto", gap: 0 }}>
        <div style={{ padding: "16px 18px", borderRight: "1px solid var(--border)" }}>
          <MonoLabel>recipient</MonoLabel>
          <input
            placeholder="name@somewhere.com"
            style={{
              marginTop: 8, width: "100%", boxSizing: "border-box",
              padding: "10px 12px", borderRadius: 6,
              border: "1px solid var(--border)", background: "var(--bg)",
              fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-subtle)" }}>
            Optional. If blank, you get a code only — share it manually.
          </div>
        </div>
        <div style={{ padding: "16px 18px", borderRight: "1px solid var(--border)" }}>
          <MonoLabel>tier</MonoLabel>
          <div style={{ marginTop: 8, display: "flex", gap: 4, padding: 2, background: "var(--surface-1)", borderRadius: 6, border: "1px solid var(--border)", width: "fit-content" }}>
            {["Free", "Patron"].map((t, i) => (
              <button key={t} style={{
                all: "unset", cursor: "pointer",
                padding: "5px 12px", borderRadius: 4,
                fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600,
                background: i === 0 ? "var(--signal)" : "transparent",
                color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 18px", borderRight: "1px solid var(--border)" }}>
          <MonoLabel>expires</MonoLabel>
          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            {["7d", "30d", "never"].map((t, i) => (
              <button key={t} style={{
                all: "unset", cursor: "pointer",
                padding: "6px 10px", borderRadius: 6,
                fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600,
                border: i === 0 ? "1px solid var(--signal)" : "1px solid var(--border)",
                background: i === 0 ? "color-mix(in oklab, var(--signal) 12%, transparent)" : "var(--bg)",
                color: i === 0 ? "var(--signal)" : "var(--fg-muted)",
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-end" }}>
          <AdminButton variant="primary" icon="plus" fullWidth>Mint code</AdminButton>
        </div>
      </div>
    </Panel>
  );
}

function AdminInvitesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Access"
        title="Invite codes"
        subtitle="Concert Crawl is invite-only. Each code is a referral receipt — one human, one issuer."
        actions={<AdminButton variant="primary" icon="plus">Mint code</AdminButton>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Outstanding"  value="2"   icon="users" kind="signal"
          hint="active · awaiting redemption"
          footer={<MonoLabel>oldest issued may 2</MonoLabel>}
        />
        <StatCard label="Redeemed"     value="148" unit="all-time" icon="users" kind="success" />
        <StatCard label="Conversion"   value="68%" icon="activity" hint="redeemed / minted" />
        <StatCard label="Subscribers"  value="148" icon="users"
          hint="14 patrons · 134 free"
        />
      </div>

      <InviteCreatorPanel />

      <Panel title={<><span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Code log</span><MonoLabel>{INVITES.length} of 218</MonoLabel></>}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="ghost" size="sm" icon="filter">Status</AdminButton>
            <AdminButton variant="ghost" size="sm" iconRight="chevR">Export CSV</AdminButton>
          </div>
        }
        padding={0}>
        <AdminTable style={{ border: "none", borderRadius: 0 }}>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Invitee</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH>Redeemed</TH>
              <TH>Expires</TH>
              <TH>Sent by</TH>
              <TH width={32}></TH>
            </tr>
          </THead>
          <tbody>
            {INVITES.map(i => (
              <TR key={i.code}>
                <TD>
                  <span style={{
                    fontFamily: ADMIN_MONO, fontSize: 12.5, fontWeight: 700,
                    color: "var(--fg)", letterSpacing: "0.04em",
                    padding: "4px 8px", borderRadius: 4,
                    background: "var(--surface-1)", border: "1px solid var(--border)",
                  }}>{i.code}</span>
                </TD>
                <TD>
                  {i.invitee.startsWith("(") ? (
                    <span style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}>{i.invitee}</span>
                  ) : (
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg)" }}>{i.invitee}</span>
                  )}
                </TD>
                <TD>{statusToInvite(i.status)}</TD>
                <TD mono color="var(--fg-muted)">{i.created}</TD>
                <TD mono color={i.redeemed ? "var(--success)" : "var(--fg-subtle)"}>{i.redeemed || "—"}</TD>
                <TD mono color={i.expires === "expired" ? "var(--danger)" : "var(--fg-muted)"}>{i.expires}</TD>
                <TD>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 9,
                      background: "var(--ink)", color: "var(--paper)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontFamily: ADMIN_FONT, fontSize: 9, fontWeight: 700,
                    }}>{i.sender[0]}</span>
                    <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>{i.sender}</span>
                  </span>
                </TD>
                <TD>
                  <button style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-muted)" }}>
                    <AdminIcon name="more" size={14} />
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  );
}

Object.assign(window, {
  AdminVenuesPage, AdminPricesPage, AdminInvitesPage,
  VENUES, PRICE_EVENTS, INVITES,
  Sparkline, PriceDelta, HealthDot, InviteCreatorPanel,
});
