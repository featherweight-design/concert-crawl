// admin-dashboard-v2.jsx — Updated admin dashboard.
// What changed vs v1:
//   1. Greeting block: remove "Run all venues" + "Add venue" CTAs (those belong on
//      their respective pages). Keep summary line + SSE pill.
//   2. Stat row kept (LLM cost, Crawl health, Active venues, Pending review).
//   3. Cost panel kept (30-day spend + top venues breakdown).
//   4. NEW: AttentionFeed replaces ActivityPanel. Exceptions only — successes roll
//      up into a single "digest" line at the bottom.
//   5. Slot reserved for engagement digest (placeholder card; not built yet).

// Item kinds (mapped from server-side):
//   crawl.failed         | danger  · link to crawl inspector
//   crawl.consecutive    | danger  · same
//   event.flags_pending  | warning · count + link to /admin/review
//   price.pending        | signal  · count + link to /admin/review
//   invite.redeemed      | neutral · low priority
const ATTENTION_ITEMS = [
  {
    id: "att-1", kind: "crawl.failed", severity: "danger",
    icon: "alert",
    title: "Red Rocks Amphitheatre — crawl failed (3rd consecutive)",
    meta: "HTTP 403 · venue will auto-pause on next failure",
    time: "12m ago",
    action: { label: "Open run", to: "/admin/crawl?run=r-9421" },
  },
  {
    id: "att-2", kind: "crawl.consecutive", severity: "danger",
    icon: "shield",
    title: "Larimer Lounge — robots.txt now disallowed",
    meta: "Schedule paused automatically · reach out for permission?",
    time: "1h ago",
    action: { label: "Open venue", to: "/admin/venues/larimer-lounge" },
  },
  {
    id: "att-3", kind: "event.flags_pending", severity: "warning",
    icon: "alertTri",
    title: "12 events flagged for review",
    meta: "Bluebird (5), Gothic (4), Ogden (3) · confidence 0.42–0.61",
    time: "since 09:14",
    action: { label: "Open Review", to: "/admin/review#events" },
  },
  {
    id: "att-4", kind: "price.pending", severity: "signal",
    icon: "prices",
    title: "2 community price submissions waiting",
    meta: "Khruangbin @ Mission · Bright Eyes @ Bluebird",
    time: "since 11:48",
    action: { label: "Open Review", to: "/admin/review#prices" },
  },
  {
    id: "att-5", kind: "invite.redeemed", severity: "neutral",
    icon: "key",
    title: "Invite redeemed by marlene@kalimba.studio",
    meta: "code FRT-PNK-92 · 4th redemption this week",
    time: "3h ago",
    action: null,
  },
];

const SEV_TINT = {
  danger:  { fg: "var(--danger)",  bg: "color-mix(in oklab, var(--danger) 14%, transparent)",  border: "color-mix(in oklab, var(--danger) 32%, transparent)" },
  warning: { fg: "var(--warning)", bg: "color-mix(in oklab, var(--warning) 16%, transparent)", border: "color-mix(in oklab, var(--warning) 36%, transparent)" },
  signal:  { fg: "var(--signal)",  bg: "color-mix(in oklab, var(--signal) 12%, transparent)",  border: "color-mix(in oklab, var(--signal) 28%, transparent)" },
  neutral: { fg: "var(--fg-muted)",bg: "var(--surface-1)",                                       border: "var(--border)" },
};

// ── Greeting (no CTA buttons) ────────────────────────────────────────
function GreetingV2() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 26, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.025em" }}>
          Good afternoon, Hugh.
        </h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)" }}>
          2 venues need attention · 12 events flagged · 2 price submissions waiting.
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <StatusBadge kind="signal" mono dot>SSE LIVE</StatusBadge>
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>last sweep 12:42 PM</span>
      </div>
    </div>
  );
}

// ── Stat row (unchanged shape, slightly retitled) ────────────────────
function StatRowV2() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      <StatCard
        label="Needs review"
        value="14"
        unit="items"
        icon="events"
        kind="warning"
        hint="12 events · 2 prices"
        footer={<AdminButton variant="ghost" size="sm" iconRight="chevR" fullWidth>Open Review</AdminButton>}
      />
      <StatCard
        label="LLM cost · 30d"
        value="$28.74"
        icon="cost"
        kind="signal"
        trend={{ dir: "up", text: "+18%", good: false }}
        hint="Budget $40 · 71% used"
        footer={<ProgressBar value={71} kind="signal" />}
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

// ── Attention feed item (medium density: two-line, primary + meta) ───
function AttentionItem({ item, layout = "row" }) {
  const tint = SEV_TINT[item.severity] || SEV_TINT.neutral;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: layout === "row" ? "32px 1fr auto" : "32px 1fr",
      gap: 12, alignItems: "flex-start",
      padding: "14px 18px",
      borderBottom: "1px solid var(--border)",
      transition: "background .12s",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: tint.bg, color: tint.fg, flexShrink: 0,
        border: `1px solid ${tint.border}`,
      }}>
        <AdminIcon name={item.icon} size={14} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600,
          color: "var(--fg)", letterSpacing: "-0.005em", lineHeight: 1.4,
        }}>{item.title}</div>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)",
          marginTop: 3, lineHeight: 1.4,
        }}>{item.meta}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <RelTime value={item.time} />
          {item.action && (
            <span style={{
              fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700,
              color: "var(--signal)", display: "inline-flex", alignItems: "center", gap: 3,
              cursor: "pointer",
            }}>{item.action.label} <AdminIcon name="chevR" size={11} /></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Roll-up footer (successes collapsed) ─────────────────────────────
function DigestRow({ children, color = "var(--fg-muted)" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px",
      background: "var(--surface-1)",
      borderTop: "1px solid var(--border)",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        background: "color-mix(in oklab, var(--success) 14%, transparent)",
        color: "var(--success)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AdminIcon name="check" size={12} />
      </div>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color, flex: 1 }}>{children}</span>
      <AdminButton variant="ghost" size="sm" iconRight="chevR">View crawl log</AdminButton>
    </div>
  );
}

// ── Variant A — single column, severity-mixed ────────────────────────
function AttentionFeedA() {
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Needs your attention</span>
        <StatusBadge kind="danger" mono>{ATTENTION_ITEMS.filter(i => i.severity !== "neutral").length} active</StatusBadge>
      </>}
      action={
        <div style={{ display: "flex", gap: 6 }}>
          <AdminButton variant="ghost" size="sm">Mark all read</AdminButton>
          <AdminButton variant="ghost" size="sm" iconRight="chevR">Inbox</AdminButton>
        </div>
      }
      padding={0}
    >
      <div>{ATTENTION_ITEMS.map(i => <AttentionItem key={i.id} item={i} />)}</div>
      <DigestRow>
        <strong style={{ color: "var(--fg)", fontWeight: 700 }}>18 venues crawled cleanly</strong>
        <span> · last sweep 3:02 AM · 89 events ingested</span>
      </DigestRow>
    </Panel>
  );
}

// ── Variant B — grouped by severity ──────────────────────────────────
function AttentionFeedB() {
  const groups = [
    { key: "danger",  label: "Failures",      items: ATTENTION_ITEMS.filter(i => i.severity === "danger") },
    { key: "warning", label: "Review queue",  items: ATTENTION_ITEMS.filter(i => i.severity === "warning") },
    { key: "signal",  label: "Submissions",   items: ATTENTION_ITEMS.filter(i => i.severity === "signal") },
    { key: "neutral", label: "Engagement",    items: ATTENTION_ITEMS.filter(i => i.severity === "neutral") },
  ];
  return (
    <Panel
      title={<><span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Needs your attention</span></>}
      action={<AdminButton variant="ghost" size="sm" iconRight="chevR">Inbox</AdminButton>}
      padding={0}
    >
      <div>
        {groups.filter(g => g.items.length > 0).map(g => (
          <div key={g.key}>
            <div style={{
              padding: "10px 18px 6px", display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface-1)", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: `var(--${g.key})` }} />
              <MonoLabel color="var(--fg-muted)">{g.label}</MonoLabel>
              <MonoLabel color="var(--fg-subtle)">{g.items.length}</MonoLabel>
            </div>
            {g.items.map(i => <AttentionItem key={i.id} item={i} />)}
          </div>
        ))}
      </div>
      <DigestRow>
        <strong style={{ color: "var(--fg)", fontWeight: 700 }}>18 venues crawled cleanly</strong>
        <span> · last sweep 3:02 AM</span>
      </DigestRow>
    </Panel>
  );
}

// ── Cost panel (copied from v1, retained) ────────────────────────────
function CostPanelV2() {
  const DAYS = [0.18, 0.22, 0.31, 0.27, 0.40, 0.55, 0.48, 0.62, 0.71, 0.58, 0.84, 0.72, 0.90, 0.81, 0.95, 1.04, 0.92, 1.18, 1.04, 1.30, 1.42, 1.21, 1.55, 1.48, 1.62, 1.70, 1.85, 1.92, 2.04, 1.88];
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>LLM spend, last 30 days</span>
        <StatusBadge kind="warning" mono>+18% wow</StatusBadge>
      </>}
      action={<AdminButton variant="ghost" size="sm" iconRight="chevR">Open billing</AdminButton>}
      padding={0}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px" }}>
        <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: ADMIN_MONO, fontSize: 32, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>$28.74</span>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>of $40 budget · resets May 31</span>
          </div>
          <div style={{ width: "100%", height: 110, position: "relative" }}>
            <MiniCostChart data={DAYS} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
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
function MiniCostChart({ data }) {
  const w = 100, h = 100;
  const max = Math.max(...data);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * (h - 8) - 2]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="costGradV2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map(y => (
        <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.3" strokeDasharray="1 1.5" />
      ))}
      <path d={area} fill="url(#costGradV2)" />
      <path d={path} stroke="var(--signal)" strokeWidth="0.9" fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.2" fill="var(--signal)" />
    </svg>
  );
}

// ── Engagement digest placeholder (future) ───────────────────────────
function EngagementPlaceholder() {
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Engagement digest</span>
        <StatusBadge kind="neutral" mono>coming soon</StatusBadge>
      </>}
      action={<AdminButton variant="ghost" size="sm" iconRight="chevR" disabled>View details</AdminButton>}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 140, color: "var(--fg-subtle)",
        border: "1px dashed var(--border-strong)", borderRadius: 8,
        background: "repeating-linear-gradient(135deg, var(--surface-1) 0 8px, transparent 8px 16px)",
        padding: 24, textAlign: "center", flexDirection: "column", gap: 6,
      }}>
        <MonoLabel>placeholder slot</MonoLabel>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", maxWidth: 360 }}>
          Watch interactions, show views, venue views. Filled in once the
          engagement events pipeline lands (post-beta).
        </span>
      </div>
    </Panel>
  );
}

// ── Full dashboard composition ───────────────────────────────────────
function AdminDashboardV2({ variant = "A" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <GreetingV2 />
      <StatRowV2 />
      {variant === "A" ? <AttentionFeedA /> : <AttentionFeedB />}
      <CostPanelV2 />
      <EngagementPlaceholder />
    </div>
  );
}

// ── Mobile dashboard ─────────────────────────────────────────────────
function AdminDashboardMobile() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>
          Good afternoon, Hugh.
        </h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          2 venues need attention · 12 events flagged · 2 price submissions waiting.
        </div>
      </div>
      {/* Compact stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {[
          { label: "Needs review", value: "14",   unit: "",      kind: "warning", icon: "events" },
          { label: "Crawl health", value: "7/8",  unit: "green", kind: "success", icon: "activity" },
          { label: "LLM cost 30d", value: "$28.7", unit: "",     kind: "signal",  icon: "cost" },
          { label: "Active",       value: "8",    unit: "of 11", kind: "neutral", icon: "venues" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <MonoLabel>{s.label}</MonoLabel>
              <div style={{
                width: 22, height: 22, borderRadius: 5,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.kind === "neutral" ? "var(--fg-subtle)" : `var(--${s.kind})`,
                background: s.kind === "neutral" ? "var(--surface-1)" : `color-mix(in oklab, var(--${s.kind}) 12%, transparent)`,
              }}><AdminIcon name={s.icon} size={12} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: ADMIN_MONO, fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              {s.unit && <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600, color: "var(--fg-muted)" }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      {/* Attention feed, condensed */}
      <Panel
        title={<><span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700 }}>Needs attention</span></>}
        action={<MonoLabel>{ATTENTION_ITEMS.filter(i => i.severity !== "neutral").length} active</MonoLabel>}
        padding={0}
      >
        {ATTENTION_ITEMS.slice(0, 4).map(i => <AttentionItem key={i.id} item={i} layout="stacked" />)}
        <DigestRow>
          <strong style={{ color: "var(--fg)", fontWeight: 700 }}>18 venues crawled cleanly</strong>
          <span> · 3:02 AM</span>
        </DigestRow>
      </Panel>
    </div>
  );
}

Object.assign(window, {
  AdminDashboardV2, AdminDashboardMobile, AttentionFeedA, AttentionFeedB,
  AttentionItem, ATTENTION_ITEMS, SEV_TINT, EngagementPlaceholder,
});
