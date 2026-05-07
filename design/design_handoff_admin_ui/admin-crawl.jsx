// admin-crawl.jsx — Crawl Status admin page (/admin/crawl).
// Layout:
//   • Optional running banner (during a "Run All" SSE)
//   • Issues banner (failed/blocked venues)
//   • Stat row (today)
//   • Split view: venue list (left) + run inspector (right)
//   • Run history table below

const RUNS = [
  { id: "r-9421", venue: "Red Rocks Amphitheatre",  started: "12:42:08", duration: "0.8s",  status: "failed",  events: { found: 0,  created: 0,  updated: 0  }, strategy: "structured", cost: 0,      err: "HTTP 403 · venue blocked", code: 403 },
  { id: "r-9420", venue: "Mission Ballroom",        started: "12:38:14", duration: "3.2s",  status: "success", events: { found: 14, created: 2,  updated: 12 }, strategy: "structured", cost: 0,      err: null, code: 200 },
  { id: "r-9419", venue: "Bluebird Theater",        started: "12:31:02", duration: "12.4s", status: "partial", events: { found: 9,  created: 4,  updated: 5  }, strategy: "llm",        cost: 0.42,   err: "5 events below confidence threshold", code: 200 },
  { id: "r-9418", venue: "Ogden Theatre",           started: "12:14:42", duration: "2.1s",  status: "success", events: { found: 11, created: 1,  updated: 10 }, strategy: "structured", cost: 0,      err: null, code: 200 },
  { id: "r-9417", venue: "Gothic Theatre",          started: "12:02:18", duration: "8.7s",  status: "success", events: { found: 8,  created: 3,  updated: 5  }, strategy: "llm",        cost: 0.18,   err: null, code: 200 },
  { id: "r-9416", venue: "Larimer Lounge",          started: "11:58:00", duration: "0.4s",  status: "blocked", events: { found: 0,  created: 0,  updated: 0  }, strategy: "manual",     cost: 0,      err: "robots.txt disallows /events/", code: null },
  { id: "r-9415", venue: "Cervantes' Masterpiece",  started: "10:42:11", duration: "2.4s",  status: "success", events: { found: 6,  created: 0,  updated: 6  }, strategy: "structured", cost: 0,      err: null, code: 200 },
  { id: "r-9414", venue: "Globe Hall",              started: "10:38:47", duration: "1.9s",  status: "success", events: { found: 4,  created: 1,  updated: 3  }, strategy: "structured", cost: 0,      err: null, code: 200 },
];

function statusToBadge(status, running) {
  if (running) return <StatusBadge kind="signal" mono><Spinner size={10} color="currentColor" /> Running</StatusBadge>;
  return ({
    success: <StatusBadge kind="success" dot>Success</StatusBadge>,
    partial: <StatusBadge kind="warning" dot>Partial</StatusBadge>,
    failed:  <StatusBadge kind="danger"  dot>Failed</StatusBadge>,
    blocked: <StatusBadge kind="danger"  dot>Blocked</StatusBadge>,
    robots:  <StatusBadge kind="warning" dot>robots.txt</StatusBadge>,
    never:   <StatusBadge kind="neutral">Never</StatusBadge>,
  })[status] || null;
}

// ── Running banner (shown while "Run all" is in flight) ───────────────
function RunningBanner({ done = 4, total = 8, current = "Bluebird Theater", onAbort }) {
  const pct = (done / total) * 100;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 18,
      padding: "12px 18px",
      background: `linear-gradient(90deg, color-mix(in oklab, var(--signal) 12%, var(--bg-elevated)), var(--bg-elevated))`,
      border: "1px solid color-mix(in oklab, var(--signal) 30%, transparent)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18,
        background: "color-mix(in oklab, var(--signal) 18%, transparent)",
        color: "var(--signal)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Spinner size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            Crawling all venues · {done} of {total} complete
          </span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
            now: {current}
          </span>
        </div>
        <ProgressBar value={pct} kind="signal" height={4} />
      </div>
      <AdminButton variant="danger" size="sm" icon="x" onClick={onAbort}>Abort</AdminButton>
    </div>
  );
}

// ── Issues banner ─────────────────────────────────────────────────────
function IssuesBanner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 18px",
      background: "color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))",
      border: "1px solid color-mix(in oklab, var(--danger) 28%, transparent)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: "color-mix(in oklab, var(--danger) 18%, transparent)",
        color: "var(--danger)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><AdminIcon name="alert" size={14} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
          1 venue blocked · 1 venue paused due to robots.txt
        </div>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
          Red Rocks (3rd consecutive 403) · Larimer Lounge (disallowed)
        </div>
      </div>
      <AdminButton variant="ghost" size="sm" iconRight="chevR">Jump to issues</AdminButton>
    </div>
  );
}

// ── Crawl stat row ────────────────────────────────────────────────────
function CrawlStats({ running }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <StatCard label="Last sweep" value="38m" unit="ago" icon="refresh" hint="May 7 · 12:14–12:42" />
      <StatCard label="Today's runs" value="24" icon="activity" kind={running ? "signal" : "neutral"}
        hint="20 ok · 1 partial · 2 failed · 1 blocked" />
      <StatCard label="Events ingested" value="52" unit="today" icon="db" kind="success"
        hint="11 new · 41 updated" />
      <StatCard label="LLM cost · today" value="$0.60" icon="cost" kind="signal"
        hint="2 LLM runs · $0.30 avg" />
    </div>
  );
}

// ── Split view: list + inspector ──────────────────────────────────────
function CrawlSplitView({ runs = RUNS, selectedId = "r-9421" }) {
  const selected = runs.find(r => r.id === selectedId) || runs[0];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0, 460px) minmax(0, 1fr)",
      border: "1px solid var(--border)", borderRadius: 12,
      background: "var(--bg-elevated)", overflow: "hidden", minHeight: 540,
    }}>
      {/* List */}
      <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700 }}>Latest run · per venue</span>
            <MonoLabel>{runs.length}</MonoLabel>
          </div>
          <AdminButton variant="ghost" size="sm" icon="filter">Filter</AdminButton>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {runs.map(r => {
            const active = r.id === selectedId;
            const dotColor = ({ success: "var(--success)", partial: "var(--warning)", failed: "var(--danger)", blocked: "var(--danger)" })[r.status] || "var(--fg-subtle)";
            return (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "10px 1fr auto",
                gap: 12, alignItems: "center",
                padding: "12px 16px",
                background: active ? "var(--surface-2)" : "transparent",
                borderLeft: active ? "2px solid var(--signal)" : "2px solid transparent",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 600 : 500,
                    color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{r.venue}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                    <RelTime value={r.started} />
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>{r.duration}</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: r.events.found ? "var(--fg-muted)" : "var(--fg-subtle)" }}>
                      {r.events.found} ev
                    </span>
                  </div>
                </div>
                <div>{statusToBadge(r.status)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector */}
      <CrawlInspector run={selected} />
    </div>
  );
}

function CrawlInspector({ run }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "16px 22px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <MonoLabel>{run.id}</MonoLabel>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          {statusToBadge(run.status)}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>{run.venue}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="outline" size="sm" icon="external">Source URL</AdminButton>
            <AdminButton variant="primary" size="sm" icon="refresh">Re-crawl</AdminButton>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        borderBottom: "1px solid var(--border)",
      }}>
        {[
          { l: "Started",       v: `Today, ${run.started}`,     mono: true },
          { l: "Duration",      v: run.duration,                 mono: true },
          { l: "HTTP",          v: run.code ? `${run.code}` : "—", mono: true,
            color: run.code === 200 ? "var(--success)" : run.code === 403 ? "var(--danger)" : "var(--fg-subtle)" },
          { l: "LLM cost",      v: <CostText value={run.cost} dim={!run.cost} size={14} weight={600} /> },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "14px 18px",
            borderRight: i < 3 ? "1px solid var(--border)" : "none",
          }}>
            <MonoLabel>{s.l}</MonoLabel>
            <div style={{
              marginTop: 6, fontFamily: s.mono ? ADMIN_MONO : ADMIN_FONT, fontSize: 14, fontWeight: 600,
              color: s.color || "var(--fg)", fontVariantNumeric: "tabular-nums",
            }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Events block */}
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <MonoLabel>events</MonoLabel>
          <div style={{
            marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
          }}>
            {[
              { l: "Found",   v: run.events.found,   k: run.events.found ? "fg" : "fg-subtle" },
              { l: "Created", v: run.events.created, k: run.events.created ? "success" : "fg-subtle" },
              { l: "Updated", v: run.events.updated, k: run.events.updated ? "signal" : "fg-subtle" },
            ].map(s => (
              <div key={s.l} style={{
                padding: "14px 16px", borderRadius: 8,
                background: "var(--surface-1)", border: "1px solid var(--border)",
              }}>
                <div style={{ fontFamily: ADMIN_MONO, fontSize: 22, fontWeight: 700,
                              color: s.k === "fg" ? "var(--fg)" : `var(--${s.k})`,
                              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{s.v}</div>
                <MonoLabel>{s.l}</MonoLabel>
              </div>
            ))}
          </div>
        </div>

        {/* Error block */}
        {run.err && (
          <div>
            <MonoLabel color="var(--danger)">error</MonoLabel>
            <div style={{
              marginTop: 8, padding: "14px 16px",
              borderRadius: 8,
              background: "color-mix(in oklab, var(--danger) 10%, var(--bg-elevated))",
              border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AdminIcon name="alert" size={16} color="var(--danger)" />
                <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>{run.err}</span>
              </div>
              {run.status === "failed" && (
                <div style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6, paddingLeft: 26 }}>
                  Consecutive failures: <span style={{ color: "var(--danger)", fontWeight: 700 }}>3</span> · Will pause venue on next failure.<br/>
                  HTTP 403 first observed: 2 days ago · Try requesting new IP allowlist.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Source preview */}
        <div>
          <MonoLabel>source</MonoLabel>
          <div style={{
            marginTop: 8, padding: "12px 14px",
            background: "var(--surface-1)", borderRadius: 8, border: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <AdminIcon name="external" size={13} color="var(--fg-subtle)" />
            <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              redrocksonline.com/events/upcoming
            </span>
            <Kbd>robots ✓</Kbd>
          </div>
        </div>

        {/* Strategy */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <MonoLabel>strategy</MonoLabel>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge kind={run.strategy === "structured" ? "signal" : run.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>{run.strategy}</StatusBadge>
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>schema.org/Event detected at root</span>
            </div>
          </div>
          <AdminButton variant="ghost" size="sm" iconRight="chevR">View raw HTML</AdminButton>
        </div>
      </div>
    </div>
  );
}

// ── Run history table ─────────────────────────────────────────────────
function RunHistory({ runs = RUNS }) {
  // Pad with older entries for visual density
  const more = [
    { id: "r-9413", venue: "Mission Ballroom",   started: "Yesterday 23:42", duration: "3.0s", status: "success", events: { found: 14 }, strategy: "structured", cost: 0,    code: 200 },
    { id: "r-9412", venue: "Bluebird Theater",   started: "Yesterday 23:38", duration: "11.2s",status: "partial", events: { found: 7 },  strategy: "llm",        cost: 0.38, code: 200, err: "3 events below threshold" },
    { id: "r-9411", venue: "Red Rocks",          started: "Yesterday 23:31", duration: "0.6s", status: "failed",  events: { found: 0 },  strategy: "structured", cost: 0,    code: 403, err: "HTTP 403" },
    { id: "r-9410", venue: "Ogden Theatre",      started: "Yesterday 23:14", duration: "2.4s", status: "success", events: { found: 11 }, strategy: "structured", cost: 0,    code: 200 },
  ];
  const all = [...runs, ...more];
  const totalCost = all.reduce((s, r) => s + (r.cost || 0), 0);
  return (
    <Panel title={<>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Run history</span>
      <MonoLabel>showing {all.length} of 412</MonoLabel>
    </>} action={
      <div style={{ display: "flex", gap: 8 }}>
        <AdminButton variant="ghost" size="sm" icon="filter">Venue</AdminButton>
        <AdminButton variant="ghost" size="sm" icon="filter">Status</AdminButton>
        <AdminButton variant="ghost" size="sm" icon="filter">Date range</AdminButton>
      </div>
    } padding={0}>
      <AdminTable style={{ border: "none", borderRadius: 0 }}>
        <THead>
          <tr>
            <TH width={92}>Run</TH>
            <TH>Venue</TH>
            <TH>Started</TH>
            <TH>Duration</TH>
            <TH>Status</TH>
            <TH>Strategy</TH>
            <TH align="right">Events</TH>
            <TH align="right">LLM cost</TH>
            <TH>Error</TH>
          </tr>
        </THead>
        <tbody>
          {all.map(r => (
            <TR key={r.id}>
              <TD mono color="var(--fg-muted)">{r.id}</TD>
              <TD><span style={{ fontWeight: 600 }}>{r.venue}</span></TD>
              <TD mono color="var(--fg-muted)">{r.started}</TD>
              <TD mono color="var(--fg-muted)">{r.duration}</TD>
              <TD>{statusToBadge(r.status)}</TD>
              <TD>
                <StatusBadge kind={r.strategy === "structured" ? "signal" : r.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>{r.strategy}</StatusBadge>
              </TD>
              <TD align="right" mono color={r.events.found ? "var(--fg)" : "var(--fg-subtle)"}>{r.events.found || "—"}</TD>
              <TD align="right"><CostText value={r.cost} dim={!r.cost} /></TD>
              <TD color={r.err ? "var(--danger)" : "var(--fg-subtle)"}>
                {r.err ? <span style={{ fontSize: 12 }}>{r.err}</span> : "—"}
              </TD>
            </TR>
          ))}
          <tr>
            <TD colSpan={7} style={{ background: "var(--surface-1)", textAlign: "right", fontWeight: 700 }}>Total LLM cost (page)</TD>
            <TD align="right" style={{ background: "var(--surface-1)" }}><CostText value={totalCost} weight={700} /></TD>
            <TD style={{ background: "var(--surface-1)" }}></TD>
          </tr>
        </tbody>
      </AdminTable>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderTop: "1px solid var(--border)",
      }}>
        <MonoLabel>page 1 of 35</MonoLabel>
        <div style={{ display: "flex", gap: 6 }}>
          <AdminButton variant="ghost" size="sm" icon="chevsL" />
          <AdminButton variant="ghost" size="sm" icon="chevL" />
          <AdminButton variant="outline" size="sm">1</AdminButton>
          <AdminButton variant="ghost" size="sm">2</AdminButton>
          <AdminButton variant="ghost" size="sm">3</AdminButton>
          <span style={{ alignSelf: "center", fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)", padding: "0 4px" }}>…</span>
          <AdminButton variant="ghost" size="sm">35</AdminButton>
          <AdminButton variant="ghost" size="sm" icon="chevR" />
          <AdminButton variant="ghost" size="sm" icon="chevsR" />
        </div>
      </div>
    </Panel>
  );
}

function AdminCrawlPage({ running = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Automation"
        title="Crawl status"
        subtitle="Every venue crawl, run by run. The dataset is only as fresh as this page."
        actions={
          <>
            <AdminButton variant="outline" icon="filter">All venues</AdminButton>
            <AdminButton variant="outline" icon="refresh">Run all</AdminButton>
          </>
        }
      />
      {running && <RunningBanner />}
      <IssuesBanner />
      <CrawlStats running={running} />
      <CrawlSplitView />
      <RunHistory />
    </div>
  );
}

Object.assign(window, { AdminCrawlPage, RUNS, RunningBanner, IssuesBanner, CrawlSplitView, RunHistory });
