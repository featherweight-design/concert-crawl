// admin-crawl-v2.jsx — Crawl page, with new Diagnostics tab on the inspector.
//
// What changed vs v1:
//   - Inspector header gets a tab strip: Overview · Diagnostics · History.
//   - Overview = the existing inspector content (events + source + strategy).
//   - Diagnostics (only when status === failed | blocked) =
//       What happened · Why it probably happened · Options (staged actions) · Strategy history.
//   - History = compact log of strategy attempts + outcomes on this venue.
//
// Page structure (RunningBanner, IssuesBanner, CrawlStats, RunHistory) is reused
// from v1; we re-export AdminCrawlPageV2 that swaps the inspector.

// ── Run data — single failing run we'll inspect in depth ─────────────
const FAILING_RUN = {
  id: "r-9421",
  venue: "Red Rocks Amphitheatre",
  url: "redrocksonline.com/events/upcoming",
  started: "12:42:08",
  duration: "0.8s",
  status: "failed",
  code: 403,
  errClass: "bot_detection",
  errLabel: "HTTP 403 · venue blocked",
  consecutiveFailures: 3,
  firstObserved: "2 days ago",
  llmCost: 0,
  strategy: "structured_data",
  events: { found: 0, created: 0, updated: 0 },
  // Strategy history (oldest → newest)
  history: [
    { at: "May 5 · 23:31", strategy: "structured_data", outcome: "success", events: 16, note: "schema.org/Event parsed" },
    { at: "May 6 · 05:31", strategy: "structured_data", outcome: "success", events: 16, note: "no change" },
    { at: "May 6 · 11:30", strategy: "structured_data", outcome: "success", events: 16 },
    { at: "May 6 · 17:30", strategy: "structured_data", outcome: "failed",  events: 0,  note: "HTTP 403 · first seen" },
    { at: "May 6 · 23:31", strategy: "structured_data", outcome: "failed",  events: 0,  note: "HTTP 403" },
    { at: "May 7 · 11:30", strategy: "structured_data", outcome: "failed",  events: 0,  note: "HTTP 403" },
    { at: "May 7 · 12:42", strategy: "structured_data", outcome: "failed",  events: 0,  note: "HTTP 403 · consecutive 3" },
  ],
};

// ── Error-class → human reason mapping (rule-based, not LLM) ─────────
const ERROR_REASONS = {
  bot_detection: {
    label: "Bot detection or IP blocking",
    body: "403 from this venue usually means their edge layer (Cloudflare or similar) is denying the request. Could be IP-rate-based, user-agent fingerprinting, or a JS challenge.",
  },
  rate_limit: {
    label: "Rate limiting",
    body: "429 means the venue is rate-limiting requests. Backing off the schedule or staggering with a delay is usually enough.",
  },
  parse_failure: {
    label: "Parse failure",
    body: "The page returned 200 but the parser couldn't find the expected structure. Likely a layout change, schema.org markup removed, or a new template.",
  },
  timeout: {
    label: "Timeout",
    body: "Request did not complete in time. Often a JavaScript-heavy page that Playwright is struggling to render fully.",
  },
  unknown: {
    label: "Unclassified failure",
    body: "The error doesn't match a known pattern. Open the raw response and inspect manually.",
  },
};

// ── Diagnostic option cards ──────────────────────────────────────────
// Each card stages a change (admin reviews before applying — no auto-apply).
const DIAG_OPTIONS_BY_CLASS = {
  bot_detection: [
    {
      id: "opt-headers", icon: "edit", recommended: true,
      title: "Add custom request headers",
      body: "Send a browser-like User-Agent + Accept-Language. Lowest-impact change.",
      cta: "Stage header swap",
    },
    {
      id: "opt-playwright", icon: "play", recommended: false,
      title: "Switch to Playwright with a real session",
      body: "Solve a JS challenge once, persist cookies, then re-use the session. Higher LLM cost.",
      cta: "Stage Playwright run",
    },
    {
      id: "opt-manual", icon: "user", recommended: false,
      title: "Mark venue as manual entry",
      body: "Stop crawling. Events for this venue will be added by the admin only.",
      cta: "Stage manual mode",
    },
  ],
  rate_limit: [
    { id: "opt-delay",  icon: "refresh", recommended: true, title: "Increase request delay to 8s",     body: "Slows the sweep but stays under typical 10 req/min limits.", cta: "Stage delay 8s" },
    { id: "opt-sched",  icon: "refresh", recommended: false, title: "Reduce schedule to every 12h",     body: "Half as many requests per day.", cta: "Stage schedule" },
  ],
  parse_failure: [
    { id: "opt-llm",    icon: "events",  recommended: true, title: "Switch to LLM extraction",         body: "Fallback while the page template stabilizes. Cost goes up.", cta: "Stage LLM strategy" },
    { id: "opt-struct", icon: "db",      recommended: false, title: "Refresh selector hints",           body: "Re-train the structured extractor against the current DOM.", cta: "Stage retrain" },
  ],
  timeout: [
    { id: "opt-pw",     icon: "play",    recommended: true, title: "Increase render timeout to 30s",  body: "Gives heavy pages more room to settle.", cta: "Stage timeout 30s" },
    { id: "opt-wait",   icon: "refresh", recommended: false, title: "Wait for selector instead of load", body: "Stop waiting on the full load event; key off `.event-card`.", cta: "Stage selector wait" },
  ],
  unknown: [
    { id: "opt-manual", icon: "user", recommended: true, title: "Mark venue as manual entry", body: "Stop crawling and rely on admin entry.", cta: "Stage manual mode" },
  ],
};

// ── Inspector tabs ───────────────────────────────────────────────────
function InspectorTabs({ value, onChange, hasDiagnostics }) {
  const tabs = [
    { k: "overview",    label: "Overview" },
    { k: "diagnostics", label: "Diagnostics", disabled: !hasDiagnostics, dot: hasDiagnostics ? "danger" : null },
    { k: "history",     label: "History" },
  ];
  return (
    <div style={{
      display: "flex", gap: 4,
      padding: "0 22px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      {tabs.map(t => {
        const active = value === t.k;
        const disabled = t.disabled;
        return (
          <button key={t.k} onClick={() => !disabled && onChange(t.k)} disabled={disabled} style={{
            all: "unset", cursor: disabled ? "not-allowed" : "pointer",
            position: "relative",
            padding: "12px 14px",
            fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 700 : 600,
            color: disabled ? "var(--fg-subtle)" : active ? "var(--fg)" : "var(--fg-muted)",
            opacity: disabled ? 0.5 : 1,
            display: "inline-flex", alignItems: "center", gap: 8,
            borderBottom: active ? "2px solid var(--signal)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {t.label}
            {t.dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: `var(--${t.dot})`, boxShadow: `0 0 0 3px color-mix(in oklab, var(--${t.dot}) 22%, transparent)` }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Diagnostics: What happened ───────────────────────────────────────
function WhatHappenedSection({ run }) {
  return (
    <div>
      <MonoLabel color="var(--danger)">what happened</MonoLabel>
      <div style={{
        marginTop: 8, padding: "14px 16px",
        background: "color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))",
        border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
        borderRadius: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <AdminIcon name="alert" size={16} color="var(--danger)" />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>{run.errLabel}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, paddingLeft: 26 }}>
          {[
            { l: "HTTP status",   v: run.code || "—" },
            { l: "Error class",   v: run.errClass.replace(/_/g, " ") },
            { l: "Consecutive",   v: `${run.consecutiveFailures} of 4` },
            { l: "First seen",    v: run.firstObserved },
          ].map(s => (
            <div key={s.l}>
              <MonoLabel>{s.l}</MonoLabel>
              <div style={{
                marginTop: 4, fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 700,
                color: "var(--fg)", fontVariantNumeric: "tabular-nums",
              }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 12, paddingLeft: 26,
          fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6,
        }}>
          Will pause venue on next failure. Last 3 attempts: <span style={{ color: "var(--danger)", fontWeight: 700 }}>403 · 403 · 403</span>.
        </div>
      </div>
    </div>
  );
}

// ── Diagnostics: Why it probably happened ────────────────────────────
function WhyHappenedSection({ run }) {
  const reason = ERROR_REASONS[run.errClass] || ERROR_REASONS.unknown;
  return (
    <div>
      <MonoLabel>why it probably happened</MonoLabel>
      <div style={{
        marginTop: 8, padding: "14px 16px",
        background: "var(--surface-1)", border: "1px solid var(--border)",
        borderRadius: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <AdminIcon name="alertTri" size={14} color="var(--warning)" />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{reason.label}</span>
          <StatusBadge kind="neutral" mono>rule-based</StatusBadge>
        </div>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.55, paddingLeft: 24 }}>{reason.body}</div>
      </div>
    </div>
  );
}

// ── Diagnostics: Options (staged actions) ────────────────────────────
function OptionsSection({ run, stagedId, onStage, exhausted = false }) {
  const opts = DIAG_OPTIONS_BY_CLASS[run.errClass] || DIAG_OPTIONS_BY_CLASS.unknown;
  if (exhausted) {
    return (
      <div>
        <MonoLabel color="var(--danger)">options · all strategies exhausted</MonoLabel>
        <div style={{
          marginTop: 8, padding: "20px 22px",
          background: "color-mix(in oklab, var(--danger) 10%, var(--bg-elevated))",
          border: "1px solid color-mix(in oklab, var(--danger) 32%, transparent)",
          borderRadius: 8, textAlign: "center",
        }}>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
            No viable crawl path
          </div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginBottom: 12, maxWidth: 420, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
            All 4 extraction strategies have been tried and failed. The only path forward is manual entry for this venue.
          </div>
          <AdminButton variant="danger" icon="user">Switch to manual entry</AdminButton>
        </div>
      </div>
    );
  }
  return (
    <div>
      <MonoLabel>options · next steps</MonoLabel>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        {opts.map(o => {
          const staged = stagedId === o.id;
          return (
            <div key={o.id} style={{
              padding: "14px 14px 12px",
              background: staged ? "color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))" : "var(--bg-elevated)",
              border: `1px solid ${staged ? "color-mix(in oklab, var(--signal) 40%, transparent)" : "var(--border)"}`,
              borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: o.recommended ? "color-mix(in oklab, var(--signal) 14%, transparent)" : "var(--surface-1)",
                  color: o.recommended ? "var(--signal)" : "var(--fg-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><AdminIcon name={o.icon} size={13} /></div>
                <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)", flex: 1 }}>{o.title}</span>
                {o.recommended && <StatusBadge kind="signal" mono>rec.</StatusBadge>}
              </div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.5, paddingLeft: 32 }}>{o.body}</div>
              <div style={{ paddingLeft: 32, marginTop: 4 }}>
                {staged ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusBadge kind="signal" dot>Staged</StatusBadge>
                    <AdminButton variant="ghost" size="sm">Apply</AdminButton>
                    <AdminButton variant="ghost" size="sm">Discard</AdminButton>
                  </div>
                ) : (
                  <AdminButton variant={o.recommended ? "primary" : "outline"} size="sm" onClick={() => onStage && onStage(o.id)}>
                    {o.cta}
                  </AdminButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 10, padding: "10px 12px",
        background: "var(--surface-1)", border: "1px dashed var(--border-strong)",
        borderRadius: 8,
        fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.5,
      }}>
        Staged options are <strong style={{ color: "var(--fg)" }}>not auto-applied</strong>. You'll review the diff and confirm before any change touches the worker config.
      </div>
    </div>
  );
}

// ── Diagnostics: Strategy history (compact log) ──────────────────────
function StrategyHistorySection({ history }) {
  return (
    <div>
      <MonoLabel>strategy history</MonoLabel>
      <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)" }}>
        {history.slice().reverse().map((h, i) => {
          const outcomeKind = ({ success: "success", failed: "danger", partial: "warning" })[h.outcome] || "neutral";
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "140px 1fr auto auto", gap: 14, alignItems: "center",
              padding: "10px 14px",
              borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
              background: i === 0 ? "color-mix(in oklab, var(--danger) 5%, transparent)" : "transparent",
            }}>
              <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>{h.at}</span>
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.note || "—"}</span>
              <StatusBadge kind={h.strategy === "structured_data" ? "signal" : h.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
                {h.strategy === "structured_data" ? "structured" : h.strategy}
              </StatusBadge>
              <StatusBadge kind={outcomeKind} dot>{h.outcome}</StatusBadge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Full Diagnostics panel composition ───────────────────────────────
function DiagnosticsPanel({ run, stagedId, onStage, exhausted = false }) {
  return (
    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
      <WhatHappenedSection run={run} />
      <WhyHappenedSection run={run} />
      <OptionsSection run={run} stagedId={stagedId} onStage={onStage} exhausted={exhausted} />
      <StrategyHistorySection history={run.history} />
    </div>
  );
}

// ── Overview panel (essentially v1 inspector body, without the error block — that moved to Diagnostics) ──
function OverviewPanel({ run }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {[
          { l: "Started",  v: `Today, ${run.started}` },
          { l: "Duration", v: run.duration },
          { l: "HTTP",     v: run.code || "—", color: run.code === 200 ? "var(--success)" : run.code === 403 ? "var(--danger)" : "var(--fg-subtle)" },
          { l: "LLM cost", v: <CostText value={run.llmCost} dim={!run.llmCost} size={14} weight={600} /> },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
            <MonoLabel>{s.l}</MonoLabel>
            <div style={{ marginTop: 6, fontFamily: ADMIN_MONO, fontSize: 14, fontWeight: 600, color: s.color || "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <MonoLabel>events</MonoLabel>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { l: "Found",   v: run.events.found,   k: run.events.found ? "fg" : "fg-subtle" },
              { l: "Created", v: run.events.created, k: run.events.created ? "success" : "fg-subtle" },
              { l: "Updated", v: run.events.updated, k: run.events.updated ? "signal" : "fg-subtle" },
            ].map(s => (
              <div key={s.l} style={{ padding: "14px 16px", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: ADMIN_MONO, fontSize: 22, fontWeight: 700, color: s.k === "fg" ? "var(--fg)" : `var(--${s.k})`, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{s.v}</div>
                <MonoLabel>{s.l}</MonoLabel>
              </div>
            ))}
          </div>
        </div>
        <div>
          <MonoLabel>source</MonoLabel>
          <div style={{ marginTop: 8, padding: "12px 14px", background: "var(--surface-1)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <AdminIcon name="external" size={13} color="var(--fg-subtle)" />
            <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-muted)", flex: 1 }}>{run.url}</span>
            <Kbd>robots ✓</Kbd>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <MonoLabel>current strategy</MonoLabel>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge kind={run.strategy === "structured_data" ? "signal" : run.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>{run.strategy === "structured_data" ? "structured" : run.strategy}</StatusBadge>
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>schema.org/Event detected at root (no longer reachable)</span>
            </div>
          </div>
          <AdminButton variant="ghost" size="sm" iconRight="chevR">View raw response</AdminButton>
        </div>
      </div>
    </div>
  );
}

// ── Inspector v2 (with tabs) ─────────────────────────────────────────
function CrawlInspectorV2({ run = FAILING_RUN, initialTab, exhausted = false, stagedId }) {
  const failed = run.status === "failed" || run.status === "blocked";
  const [tab, setTab] = React.useState(initialTab || (failed ? "diagnostics" : "overview"));
  const [staged, setStaged] = React.useState(stagedId || null);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <MonoLabel>{run.id}</MonoLabel>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          {failed ? <StatusBadge kind="danger" dot>Failed</StatusBadge> : <StatusBadge kind="success" dot>Success</StatusBadge>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <h2 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>{run.venue}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="outline" size="sm" icon="external">Source URL</AdminButton>
            <AdminButton variant="primary" size="sm" icon="refresh">Re-crawl</AdminButton>
          </div>
        </div>
      </div>
      <InspectorTabs value={tab} onChange={setTab} hasDiagnostics={failed} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "overview"    && <OverviewPanel run={run} />}
        {tab === "diagnostics" && <DiagnosticsPanel run={run} exhausted={exhausted} stagedId={staged} onStage={setStaged} />}
        {tab === "history"     && (
          <div style={{ padding: "20px 22px" }}>
            <StrategyHistorySection history={run.history} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full crawl page v2 — same chrome as v1, swaps inspector ──────────
function CrawlSplitViewV2({ runs, selectedId = "r-9421", exhausted = false }) {
  const selected = (runs && runs.find(r => r.id === selectedId)) || FAILING_RUN;
  const list = runs || (window.RUNS ? window.RUNS : []);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0, 460px) minmax(0, 1fr)",
      border: "1px solid var(--border)", borderRadius: 12,
      background: "var(--bg-elevated)", overflow: "hidden", minHeight: 620,
    }}>
      <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700 }}>Latest run · per venue</span>
            <MonoLabel>{list.length}</MonoLabel>
          </div>
          <AdminButton variant="ghost" size="sm" icon="filter">Filter</AdminButton>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {list.map(r => {
            const active = r.id === selectedId;
            const dotColor = ({ success: "var(--success)", partial: "var(--warning)", failed: "var(--danger)", blocked: "var(--danger)" })[r.status] || "var(--fg-subtle)";
            return (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "10px 1fr auto",
                gap: 12, alignItems: "center", padding: "12px 16px",
                background: active ? "var(--surface-2)" : "transparent",
                borderLeft: active ? "2px solid var(--signal)" : "2px solid transparent",
                borderBottom: "1px solid var(--border)", cursor: "pointer",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 600 : 500, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.venue}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                    <RelTime value={r.started} />
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>{r.duration}</span>
                  </div>
                </div>
                <div>
                  {r.status === "success" && <StatusBadge kind="success" dot>OK</StatusBadge>}
                  {r.status === "partial" && <StatusBadge kind="warning" dot>Partial</StatusBadge>}
                  {(r.status === "failed" || r.status === "blocked") && <StatusBadge kind="danger" dot>{r.status === "blocked" ? "Blocked" : "Failed"}</StatusBadge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <CrawlInspectorV2 run={selected} exhausted={exhausted} />
    </div>
  );
}

function AdminCrawlPageV2({ running = false, exhausted = false, selectedId = "r-9421" }) {
  // Use v1's RUNS array as the list source but inspect FAILING_RUN by default.
  const list = (window.RUNS || []).map(r => r.id === "r-9421" ? { ...r, ...FAILING_RUN } : r);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Automation"
        title="Crawl status"
        subtitle="Every venue crawl, run by run. Click a failed row for diagnostics + staged remediation."
        actions={<>
          <AdminButton variant="outline" icon="filter">All venues</AdminButton>
          <AdminButton variant="outline" icon="refresh">Run all</AdminButton>
        </>}
      />
      {running && window.RunningBanner && <window.RunningBanner />}
      {window.IssuesBanner && <window.IssuesBanner />}
      {window.CrawlStats && <window.CrawlStats running={running} />}
      <CrawlSplitViewV2 runs={list} selectedId={selectedId} exhausted={exhausted} />
      {window.RunHistory && <window.RunHistory runs={list} />}
    </div>
  );
}

Object.assign(window, {
  AdminCrawlPageV2, CrawlInspectorV2, CrawlSplitViewV2,
  DiagnosticsPanel, OverviewPanel, InspectorTabs,
  WhatHappenedSection, WhyHappenedSection, OptionsSection, StrategyHistorySection,
  FAILING_RUN, ERROR_REASONS, DIAG_OPTIONS_BY_CLASS,
});

// ─────────────────────────────────────────────────────────────────────
// STAGED APPLY — confirmation modal
// ─────────────────────────────────────────────────────────────────────
//
// Clicking "Apply" on a staged option opens this modal. Shows a clear
// before/after diff of the worker config, the reason for the change, and a
// destructive-action style confirm. No auto-apply, no surprises.

const STAGED_DIFFS = {
  "opt-headers": {
    title: "Add custom request headers",
    intent: "Try to look more like a real browser so the venue's edge layer stops blocking us.",
    diff: [
      { path: "headers.User-Agent",       before: "ConcertCrawl/1.0", after: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15" },
      { path: "headers.Accept-Language",  before: "(unset)",          after: "en-US,en;q=0.9" },
      { path: "headers.Accept",           before: "(unset)",          after: "text/html,application/xhtml+xml,application/xml;q=0.9" },
    ],
    risks: [
      "If the venue rolls out a tighter bot policy, this stops working on its own — won't break the consumer app.",
    ],
    rollback: "One click to revert from the strategy history log.",
    nextRunIn: "next scheduled sweep · ~2h",
  },
  "opt-delay": {
    title: "Increase request delay to 8s",
    intent: "Slow the sweep to stay under typical 10 req/min rate limits.",
    diff: [
      { path: "request.delay_ms", before: "1500", after: "8000" },
    ],
    risks: ["Sweep takes ~5× longer; LLM cost per sweep is unchanged."],
    rollback: "Revert from the strategy history log.",
    nextRunIn: "next scheduled sweep · ~2h",
  },
  "opt-llm": {
    title: "Switch to LLM extraction",
    intent: "Use the LLM to parse the page while the structured-data template stabilizes.",
    diff: [
      { path: "extraction.strategy",   before: "structured_data", after: "llm" },
      { path: "extraction.model",      before: "(n/a)",           after: "claude-haiku-4-5" },
      { path: "budget.per_run_max_usd",before: "$0.00",           after: "$0.60" },
    ],
    risks: [
      "LLM cost jumps from $0 to ~$0.40/run for this venue.",
      "Confidence scores drop; expect a flag spike in Review.",
    ],
    rollback: "Revert from the strategy history log.",
    nextRunIn: "manual re-crawl now, or next scheduled sweep",
  },
};

function StagedApplyConfirm({ stagedId = "opt-headers", venueName = "Red Rocks Amphitheatre", onCancel, onApply }) {
  const diff = STAGED_DIFFS[stagedId] || STAGED_DIFFS["opt-headers"];
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: 640, maxWidth: "100%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MonoLabel color="var(--signal)">applying staged change</MonoLabel>
            <StatusBadge kind="signal" mono>{stagedId}</StatusBadge>
          </div>
          <h3 style={{ margin: "6px 0 0", fontFamily: ADMIN_FONT, fontSize: 19, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            {diff.title}
          </h3>
          <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
            on <strong style={{ color: "var(--fg)" }}>{venueName}</strong>. The change writes to the worker config and is picked up on the next crawl.
          </div>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <MonoLabel>why this change</MonoLabel>
            <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)", lineHeight: 1.55 }}>{diff.intent}</div>
          </div>

          <div>
            <MonoLabel>config diff</MonoLabel>
            <div style={{
              marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
              background: "var(--surface-1)",
            }}>
              {diff.diff.map((d, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "160px 1fr", gap: 12,
                  padding: "10px 14px",
                  borderBottom: i < diff.diff.length - 1 ? "1px solid var(--border)" : "none",
                  fontFamily: ADMIN_MONO, fontSize: 11,
                }}>
                  <span style={{ color: "var(--fg-muted)", fontWeight: 700, letterSpacing: "0.02em" }}>{d.path}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 6, color: "var(--danger)",
                      background: "color-mix(in oklab, var(--danger) 6%, transparent)",
                      padding: "4px 8px", borderRadius: 4,
                    }}>
                      <span style={{ fontWeight: 700 }}>−</span>
                      <span style={{ wordBreak: "break-all" }}>{d.before}</span>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 6, color: "var(--success)",
                      background: "color-mix(in oklab, var(--success) 6%, transparent)",
                      padding: "4px 8px", borderRadius: 4,
                    }}>
                      <span style={{ fontWeight: 700 }}>+</span>
                      <span style={{ wordBreak: "break-all" }}>{d.after}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <MonoLabel color="var(--warning)">risks</MonoLabel>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.55 }}>
                {diff.risks.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
            <div>
              <MonoLabel>rollback</MonoLabel>
              <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.55 }}>
                {diff.rollback}
              </div>
              <div style={{ marginTop: 10 }}><MonoLabel>next run</MonoLabel></div>
              <div style={{ marginTop: 6, fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg)", fontWeight: 600 }}>
                {diff.nextRunIn}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "14px 22px", borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, alignItems: "center",
          background: "var(--surface-1)",
        }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: "auto", cursor: "pointer", fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>
            <input type="checkbox" style={{ accentColor: "var(--signal)" }} />
            Trigger re-crawl now
          </label>
          <AdminButton variant="ghost" onClick={onCancel}>Cancel</AdminButton>
          <AdminButton variant="primary" icon="check" onClick={onApply}>Apply change</AdminButton>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StagedApplyConfirm, STAGED_DIFFS });
