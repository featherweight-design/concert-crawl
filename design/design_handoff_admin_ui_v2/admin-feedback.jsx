// admin-feedback.jsx — /admin/feedback (NEW page).
//
// Receives submissions from the user-facing <FeedbackSurface /> modal AND
// other sources (Sentry, email forwards) once those wire up. Designed for
// triage, not threading.
//
// Item lifecycle (status field):
//   unread       → needs admin's eyeballs (default for new items)
//   read         → glanced, nothing more required
//   flagged      → marked for investigation (e.g. potential bug to repro)
//   issue_opened → GH issue created from this item (linked back)
//   resolved     → triaged + closed; falls out of default view
//   archived     → manually archived; falls out of default view
//
// Voice: matches the existing Feedback Modal — "Holler at us." / "Loud and clear."
// Don't drift toward dry/generic.

const FEEDBACK = [
  {
    id: "fb-0042", status: "unread", category: "bug",
    handle: "@marlene_kalimba", userId: "u_2841",
    submittedAt: "12m ago", submittedFull: "2026-05-20 12:42:18 MT",
    source: "FeedbackSurface",
    body: "Price alerts toggle in Watching list won't stay on. Toggle it on, leave the page, come back — it's off again. Tried twice.",
    bodyFirstLine: "Price alerts toggle in Watching list won't stay on.",
    hasScreenshot: true,
    context: {
      route: "/watching",
      theme: "electric",
      build: "v0.21.4 · 2026-05-19",
      device: "iPhone 14 · Safari 17.4 · iOS 17.5",
    },
    notes: null,
    issueUrl: null,
  },
  {
    id: "fb-0041", status: "unread", category: "idea",
    handle: "@lou_elsewhere", userId: "u_1924",
    submittedAt: "1h ago", submittedFull: "2026-05-20 11:51:02 MT",
    source: "FeedbackSurface",
    body: "Map view!! Especially for nights when 3+ venues have shows — would love to see clusters around the city before picking. Could also be a way to discover venues you don't already know.",
    bodyFirstLine: "Map view!! Especially for nights when 3+ venues have shows.",
    hasScreenshot: false,
    context: {
      route: "/",
      theme: "jade",
      build: "v0.21.4 · 2026-05-19",
      device: "MacBook · Chrome 125 · macOS 14.5",
    },
    notes: null,
    issueUrl: null,
  },
  {
    id: "fb-0040", status: "flagged", category: "bug",
    handle: "@hugh", userId: "u_0001",
    submittedAt: "3h ago", submittedFull: "2026-05-20 09:18:54 MT",
    source: "Sentry",
    body: "TypeError: cannot read properties of undefined (reading 'low') at PriceBlock.jsx:147. Repro: open event detail where price = null AND admin source. Seen twice in the wild.",
    bodyFirstLine: "TypeError: cannot read properties of undefined (reading 'low')",
    hasScreenshot: false,
    context: {
      route: "/e/evt-2814",
      theme: "electric",
      build: "v0.21.4 · 2026-05-19",
      device: "—",
    },
    notes: "Need to confirm if this is fixed by PR #198 already merged on main.",
    issueUrl: null,
  },
  {
    id: "fb-0039", status: "issue_opened", category: "bug",
    handle: "@jaylin_dust", userId: "u_1418",
    submittedAt: "yesterday", submittedFull: "2026-05-19 22:11:00 MT",
    source: "FeedbackSurface",
    body: "Watch button on event detail page is misaligned at iPhone SE width — overlaps the price chip.",
    bodyFirstLine: "Watch button on event detail page is misaligned at iPhone SE width.",
    hasScreenshot: true,
    context: {
      route: "/e/evt-2841",
      theme: "electric",
      build: "v0.21.4 · 2026-05-19",
      device: "iPhone SE · Safari 16 · iOS 16.7",
    },
    notes: "Confirmed reproducible at 320px width.",
    issueUrl: "github.com/concert-crawl/app/issues/206",
  },
  {
    id: "fb-0038", status: "read", category: "praise",
    handle: "@aria_softly", userId: "u_2104",
    submittedAt: "yesterday", submittedFull: "2026-05-19 14:33:21 MT",
    source: "FeedbackSurface",
    body: "Just wanted to say — the price transparency block is genuinely useful. Caught a 40% price jump on Khruangbin before I bought. Thank you :)",
    bodyFirstLine: "Just wanted to say — the price transparency block is genuinely useful.",
    hasScreenshot: false,
    context: {
      route: "/e/evt-2840",
      theme: "jade",
      build: "v0.21.4 · 2026-05-19",
      device: "iPhone 15 Pro · Safari 17.4 · iOS 17.5",
    },
    notes: null,
    issueUrl: null,
  },
  {
    id: "fb-0037", status: "resolved", category: "bug",
    handle: "@drew_holst", userId: "u_2271",
    submittedAt: "2d ago", submittedFull: "2026-05-18 08:12:00 MT",
    source: "FeedbackSurface",
    body: "Calendar view 2-week scroll feels janky on Android Chrome.",
    bodyFirstLine: "Calendar view 2-week scroll feels janky on Android Chrome.",
    hasScreenshot: false,
    context: { route: "/calendar", theme: "electric", build: "v0.21.3", device: "Pixel 7 · Chrome 125 · Android 14" },
    notes: "Fixed in PR #203, deployed v0.21.4.",
    issueUrl: "github.com/concert-crawl/app/issues/201",
  },
];

const CATEGORY_META = {
  bug:    { kind: "danger",  label: "Bug",    icon: "alert" },
  idea:   { kind: "signal",  label: "Idea",   icon: "events" },
  praise: { kind: "success", label: "Praise", icon: "check" },
  other:  { kind: "neutral", label: "Other",  icon: "more" },
};

const STATUS_META = {
  unread:       { kind: "signal",  label: "Unread",       dot: true },
  read:         { kind: "neutral", label: "Read",         dot: false },
  flagged:      { kind: "warning", label: "Flagged",      dot: true },
  issue_opened: { kind: "accent",  label: "Issue opened", dot: false },
  resolved:     { kind: "success", label: "Resolved",     dot: false },
  archived:     { kind: "neutral", label: "Archived",     dot: false },
};

// ── Filter strip (vertical, in the rail) ─────────────────────────────
function FeedbackFilterRail({ filter = "all", onFilter, counts }) {
  const items = [
    { k: "all",          label: "All",          icon: "inbox",  count: counts.all },
    { k: "unread",       label: "Unread",       icon: "alert",  count: counts.unread,    kind: "signal" },
    { k: "flagged",      label: "Flagged",      icon: "flag",   count: counts.flagged,   kind: "warning" },
    { k: "issue_opened", label: "Issue opened", icon: "edit",   count: counts.issue_opened, kind: "accent" },
    { k: "resolved",     label: "Resolved",     icon: "check",  count: counts.resolved,  kind: "success" },
    { k: "archived",     label: "Archived",     icon: "x",      count: counts.archived,  kind: "neutral" },
  ];
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 2,
      alignSelf: "flex-start",
    }}>
      <div style={{ padding: "8px 10px" }}><MonoLabel>view</MonoLabel></div>
      {items.map(it => {
        const active = filter === it.k;
        return (
          <button key={it.k} onClick={() => onFilter && onFilter(it.k)} style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 8,
            background: active ? "var(--surface-2)" : "transparent",
            color: active ? "var(--fg)" : "var(--fg-muted)",
            position: "relative",
          }}>
            {active && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 2, background: "var(--signal)", borderRadius: 2 }} />}
            <AdminIcon name={it.icon} size={14} color={active && it.kind ? `var(--${it.kind})` : "currentColor"} />
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 700 : 500, flex: 1 }}>{it.label}</span>
            {it.count > 0 && (
              <span style={{
                fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700,
                padding: "2px 6px", borderRadius: 8,
                background: active ? "var(--bg)" : "var(--surface-1)",
                color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums",
              }}>{it.count}</span>
            )}
          </button>
        );
      })}
      <div style={{ height: 1, background: "var(--border)", margin: "6px 8px" }} />
      <div style={{ padding: "8px 10px" }}><MonoLabel>source</MonoLabel></div>
      {["FeedbackSurface", "Sentry", "Email"].map(s => (
        <label key={s} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
          fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", cursor: "pointer",
        }}>
          <input type="checkbox" defaultChecked={s !== "Email"} style={{ accentColor: "var(--signal)" }} />
          {s}
          {s === "Email" && <StatusBadge kind="neutral" mono>soon</StatusBadge>}
        </label>
      ))}
    </div>
  );
}

// ── Feedback row (collapsed) ─────────────────────────────────────────
function FeedbackRow({ item, expanded, onToggle }) {
  const cat = CATEGORY_META[item.category];
  const status = STATUS_META[item.status];
  const isUnread = item.status === "unread";
  return (
    <div style={{
      borderBottom: "1px solid var(--border)",
      background: isUnread ? "var(--surface-2)" : "transparent",
      position: "relative",
    }}>
      {isUnread && (
        <span style={{ position: "absolute", left: 6, top: 22, width: 6, height: 6, borderRadius: 3, background: "var(--signal)" }} />
      )}
      <button onClick={onToggle} style={{
        all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
        display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
        gap: 14, alignItems: "center",
        padding: "12px 16px 12px 22px",
      }}>
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.02em" }}>{item.handle}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <StatusBadge kind={cat.kind} mono>{cat.label}</StatusBadge>
            <StatusBadge kind={status.kind} dot={status.dot} mono={!status.dot}>{status.label}</StatusBadge>
            {item.hasScreenshot && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                <AdminIcon name="layout" size={11} />screenshot
              </span>
            )}
            {item.source !== "FeedbackSurface" && (
              <StatusBadge kind="neutral" mono>{item.source}</StatusBadge>
            )}
          </div>
          <div style={{
            fontFamily: ADMIN_FONT, fontSize: 13,
            color: isUnread ? "var(--fg)" : "var(--fg-muted)",
            fontWeight: isUnread ? 600 : 500,
            lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 540,
          }}>{item.bodyFirstLine}</div>
        </div>
        <RelTime value={item.submittedAt} />
        <MonoLabel color="var(--fg-subtle)">{item.id}</MonoLabel>
        <AdminIcon name={expanded ? "chevD" : "chevR"} size={14} color="var(--fg-muted)" />
      </button>
      {expanded && <FeedbackExpanded item={item} />}
    </div>
  );
}

// ── Expanded item ─────────────────────────────────────────────────────
function FeedbackExpanded({ item }) {
  return (
    <div style={{
      padding: "4px 22px 18px 22px",
      background: "var(--bg-elevated)",
      borderTop: "1px solid var(--border)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 20, marginTop: 12 }}>
        {/* Body + actions */}
        <div>
          <MonoLabel>full body</MonoLabel>
          <div style={{
            marginTop: 8, padding: "14px 16px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 8, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)", lineHeight: 1.6,
          }}>{item.body}</div>

          {/* Screenshot slot */}
          {item.hasScreenshot && (
            <div style={{ marginTop: 14 }}>
              <MonoLabel>screenshot</MonoLabel>
              <div style={{
                marginTop: 8, height: 200, borderRadius: 8,
                border: "1px solid var(--border)",
                background: "repeating-linear-gradient(135deg, var(--surface-1) 0 10px, var(--bg-elevated) 10px 20px)",
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6,
              }}>
                <AdminIcon name="layout" size={20} color="var(--fg-subtle)" />
                <MonoLabel>user-attached screenshot</MonoLabel>
                <AdminButton variant="ghost" size="sm" icon="external">Open full size</AdminButton>
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div style={{ marginTop: 14 }}>
            <MonoLabel>admin notes</MonoLabel>
            <textarea
              defaultValue={item.notes || ""}
              placeholder="Internal note — visible to you, not to the user…"
              rows={2}
              style={{
                marginTop: 8, width: "100%", boxSizing: "border-box",
                padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-elevated)",
                fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Context + metadata */}
        <div>
          <MonoLabel>context</MonoLabel>
          <div style={{
            marginTop: 8, padding: "10px 14px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 8, display: "flex", flexDirection: "column", gap: 8,
            fontFamily: ADMIN_MONO, fontSize: 11,
          }}>
            {[
              { k: "Route",      v: item.context.route },
              { k: "Theme",      v: item.context.theme },
              { k: "Build",      v: item.context.build },
              { k: "Device",     v: item.context.device },
              { k: "Submitted",  v: item.submittedFull },
              { k: "User ID",    v: item.userId },
            ].map(c => (
              <div key={c.k} style={{ display: "flex", gap: 10 }}>
                <span style={{ width: 70, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10, fontWeight: 700 }}>{c.k}</span>
                <span style={{ flex: 1, color: "var(--fg)", fontWeight: 600 }}>{c.v}</span>
              </div>
            ))}
          </div>

          {/* GH Issue block */}
          {item.issueUrl ? (
            <div style={{ marginTop: 14 }}>
              <MonoLabel color="var(--accent)">linked issue</MonoLabel>
              <div style={{
                marginTop: 8, padding: "12px 14px",
                background: "color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))",
                border: "1px solid color-mix(in oklab, var(--accent) 32%, transparent)",
                borderRadius: 8,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <AdminIcon name="external" size={13} color="var(--accent)" />
                <a href="#" style={{ flex: 1, fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>
                  {item.issueUrl}
                </a>
                <AdminButton variant="ghost" size="sm" icon="copy" />
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <MonoLabel>create issue</MonoLabel>
              <div style={{
                marginTop: 8, padding: "12px 14px",
                background: "var(--surface-1)", border: "1px dashed var(--border-strong)",
                borderRadius: 8,
              }}>
                <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.55, marginBottom: 10 }}>
                  Stage a GitHub issue using this feedback's body + context strip as the description. You can edit before submit.
                </div>
                <AdminButton variant="outline" size="sm" icon="external" fullWidth>Open in GitHub…</AdminButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action shelf */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "12px 0 0", marginTop: 14, borderTop: "1px solid var(--border)",
      }}>
        {item.status === "unread" ? (
          <AdminButton variant="ghost" size="sm" icon="check">Mark read</AdminButton>
        ) : (
          <AdminButton variant="ghost" size="sm">Mark unread</AdminButton>
        )}
        <AdminButton variant="outline" size="sm" icon="flag">Flag for investigation</AdminButton>
        <AdminButton variant="outline" size="sm" icon="edit">Open in GitHub…</AdminButton>
        <AdminButton variant="ghost" size="sm" icon="user" iconRight="chevR">View {item.handle}</AdminButton>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <AdminButton variant="success" size="sm" icon="check">Resolve</AdminButton>
          <AdminButton variant="ghost" size="sm" icon="x">Archive</AdminButton>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
function AdminFeedbackPage({ filter = "all", expandedId = "fb-0042" }) {
  const counts = {
    all:          FEEDBACK.filter(f => f.status !== "archived").length,
    unread:       FEEDBACK.filter(f => f.status === "unread").length,
    flagged:      FEEDBACK.filter(f => f.status === "flagged").length,
    issue_opened: FEEDBACK.filter(f => f.status === "issue_opened").length,
    resolved:     FEEDBACK.filter(f => f.status === "resolved").length,
    archived:     FEEDBACK.filter(f => f.status === "archived").length,
  };
  let items = FEEDBACK;
  if (filter === "all") items = FEEDBACK.filter(f => f.status !== "archived" && f.status !== "resolved");
  else if (filter !== "archived") items = FEEDBACK.filter(f => f.status === filter);
  else items = FEEDBACK.filter(f => f.status === "archived");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Operations · users"
        title={<span>Feedback <StatusBadge kind="signal" mono style={{ marginLeft: 12, verticalAlign: "middle" }}>{counts.unread} unread</StatusBadge></span>}
        subtitle="Inbox for in-app feedback (and Sentry, soon email). Triage: mark read, flag for investigation, open a GH issue, or archive."
        actions={<>
          <AdminButton variant="outline" size="sm" icon="filter">Date range</AdminButton>
          <AdminButton variant="outline" size="sm" icon="external">Export CSV</AdminButton>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard label="Last 7 days"   value="14"  icon="inbox" kind="signal" />
        <StatCard label="Unread"        value={String(counts.unread)} icon="alert" kind="warning" />
        <StatCard label="Flagged"       value={String(counts.flagged)} icon="flag" kind="danger" hint="awaiting investigation" />
        <StatCard label="Issues opened" value="6"   icon="external" kind="accent" hint="this month" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: 20, alignItems: "flex-start" }}>
        <FeedbackFilterRail filter={filter} counts={counts} />
        <Panel title={<>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>{filter === "all" ? "Active" : STATUS_META[filter]?.label || "All"} feedback</span>
          <MonoLabel>{items.length}</MonoLabel>
        </>}
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <AdminButton variant="ghost" size="sm" icon="filter">Category</AdminButton>
            <AdminButton variant="ghost" size="sm">Mark all read</AdminButton>
          </div>
        } padding={0}>
          {items.length === 0 ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "var(--fg-subtle)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--surface-1)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", marginBottom: 10 }}>
                <AdminIcon name="inbox" size={20} />
              </div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>Nothing in this view.</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
                When users holler, they'll land here. Try a different filter or the Archive.
              </div>
            </div>
          ) : (
            <div>
              {items.map(it => (
                <FeedbackRow key={it.id} item={it} expanded={it.id === expandedId} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ── Mobile feedback ───────────────────────────────────────────────────
function AdminFeedbackMobile() {
  const items = FEEDBACK.filter(f => f.status !== "archived" && f.status !== "resolved");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Feedback</h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
          {items.filter(f => f.status === "unread").length} unread · {items.filter(f => f.status === "flagged").length} flagged.
        </div>
      </div>
      {/* Filter scroll pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0" }}>
        {["All", "Unread", "Flagged", "Issue opened", "Resolved"].map((l, i) => (
          <button key={l} style={{
            all: "unset", cursor: "pointer", flexShrink: 0,
            padding: "6px 12px", borderRadius: 999,
            fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 700,
            background: i === 0 ? "var(--signal)" : "var(--surface-1)",
            color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
            border: `1px solid ${i === 0 ? "var(--signal)" : "var(--border)"}`,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.slice(0, 4).map(it => {
          const cat = CATEGORY_META[it.category];
          const status = STATUS_META[it.status];
          const isUnread = it.status === "unread";
          return (
            <div key={it.id} style={{
              padding: "12px 14px", background: "var(--bg-elevated)",
              border: `1px solid ${isUnread ? "var(--border-strong)" : "var(--border)"}`,
              borderRadius: 12, position: "relative",
            }}>
              {isUnread && <span style={{ position: "absolute", left: 8, top: 16, width: 5, height: 5, borderRadius: 3, background: "var(--signal)" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingLeft: isUnread ? 12 : 0 }}>
                <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{it.handle}</span>
                <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", marginLeft: "auto" }}>{it.submittedAt}</span>
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8, paddingLeft: isUnread ? 12 : 0, flexWrap: "wrap" }}>
                <StatusBadge kind={cat.kind} mono>{cat.label}</StatusBadge>
                <StatusBadge kind={status.kind} dot={status.dot} mono={!status.dot}>{status.label}</StatusBadge>
              </div>
              <div style={{
                paddingLeft: isUnread ? 12 : 0,
                fontFamily: ADMIN_FONT, fontSize: 13,
                color: isUnread ? "var(--fg)" : "var(--fg-muted)",
                fontWeight: isUnread ? 600 : 500, lineHeight: 1.5,
              }}>{it.bodyFirstLine}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminFeedbackPage, AdminFeedbackMobile,
  FeedbackRow, FeedbackExpanded, FeedbackFilterRail,
  FEEDBACK, CATEGORY_META, STATUS_META,
});
