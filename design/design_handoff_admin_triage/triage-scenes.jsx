// triage-scenes.jsx — the panel in its real surroundings.
// Everything outside <AttentionPanel/> here is CONTEXT CHROME: greeting, stat
// row, sibling panels, mobile topbar. Not in scope for #1215 (§6), reproduced
// only so the panel can be judged against the card it sits among. Chrome strings
// are owned by their own surfaces' copy files, not by copy.ts's triage block.

const { ADMIN_FONT: SF, ADMIN_MONO: SM, StatCard, MonoLabel: SMono, Panel: SPanel, StatusBadge: SBadge } = window;

function Stage({ theme = "electric", width, height, pad = 0, children }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width: width || "100%", height: height || "100%" }}>
      <div style={{
        width: "100%", height: "100%", background: "var(--bg)", padding: pad,
        boxSizing: "border-box", overflow: "hidden", color: "var(--fg)",
      }}>{children}</div>
    </window.ThemeProvider>
  );
}

function Note({ children, color = "var(--fg-muted)", max = 560 }) {
  return <div style={{ fontFamily: SF, fontSize: 11.5, color, lineHeight: 1.55, maxWidth: max, textWrap: "pretty" }}>{children}</div>;
}

function Eyebrow({ children, color = "var(--signal)" }) {
  return <div style={{
    fontFamily: SM, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
    textTransform: "uppercase", color, marginBottom: 10,
  }}>{children}</div>;
}

// ── Desktop dashboard context ────────────────────────────────────────
function DashboardScene({ scenario, refreshing = false, denseAt }) {
  const { faults, queues } = scenario;
  const broken = window.orderFaults(faults).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: SF, fontSize: 24, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.025em" }}>
            Good afternoon, Hugh.
          </h1>
          <div style={{ marginTop: 5, fontFamily: SF, fontSize: 12.5, color: "var(--fg-muted)" }}>
            {broken === 0 ? "Everything crawled clean overnight." : `${broken} venues need attention.`}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <SBadge kind="signal" mono dot>SSE LIVE</SBadge>
          <SMono>last sweep {window.SWEEP.at}</SMono>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, opacity: 0.62 }}>
        <StatCard label="Needs review" value="16" unit="items" icon="events" kind="warning" />
        <StatCard label="LLM cost · 30d" value="$28.74" icon="cost" kind="signal" />
        <StatCard label="Crawl health" value={`${11 - broken}/11`} unit="green" icon="activity" kind={broken ? "warning" : "success"} />
        <StatCard label="Active venues" value="11" unit="of 12" icon="venues" />
      </div>
      <window.AttentionPanel faults={faults} queues={queues} refreshing={refreshing} denseAt={denseAt} />
      <div style={{ opacity: 0.5 }}>
        <SPanel title="LLM spend, last 30 days" action={<SMono>sibling panel</SMono>} padding={18}>
          <div style={{ height: 92, borderRadius: 8, border: "1px dashed var(--border-strong)",
            background: "repeating-linear-gradient(135deg, var(--surface-1) 0 8px, transparent 8px 16px)" }} />
        </SPanel>
      </div>
    </div>
  );
}

// ── Mobile (320px baseline) ──────────────────────────────────────────
function MobileScene({ scenario, refreshing = false, showChrome = true, denseAt }) {
  const { faults, queues } = scenario;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showChrome && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          padding: "0 12px", height: 52, borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}>
          <window.CCMarkAdmin size={22} />
          <span style={{ fontFamily: SF, fontSize: 13, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
          <span style={{ marginLeft: "auto" }}><SMono color="var(--signal)">ADMIN</SMono></span>
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden", padding: 10 }}>
        <window.AttentionPanel faults={faults} queues={queues} compact refreshing={refreshing} denseAt={denseAt} />
      </div>
    </div>
  );
}

// A bare browser-ish frame for the mobile artboards — admin is a web surface,
// not an installed app, so no device bezel.
function ViewportFrame({ width, height, theme = "electric", children }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width, height }}>
      <div style={{
        width, height, background: "var(--bg)", border: "1px solid var(--border-strong)",
        borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column",
        boxSizing: "border-box", color: "var(--fg)",
      }}>{children}</div>
    </window.ThemeProvider>
  );
}

Object.assign(window, { Stage, Note, Eyebrow, DashboardScene, MobileScene, ViewportFrame });
