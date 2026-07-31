// triage-panel.jsx — the redesigned "Needs attention" panel (#1215).
//
// Built on the shared <Panel/> primitive and the danger/warning/signal/neutral
// tint scale from design_handoff_admin_ui_v2. No new visual language: same card,
// same 1px borders, same mono eyebrows, same 13px row titles as every other
// dashboard panel.
//
// Pure derived state (§3.2). Nothing here takes a read flag, an unread count, a
// dismiss handler or a resolved-but-lingering prop. A row exists because a
// condition is true right now.
//
// Structure:
//   Panel header      title · summary badge · last-checked · Refresh
//   Faults tier       tier strip → ordered fault rows → model footnote
//                     (at DENSE_AT+ faults the tier strip is replaced by band strips)
//   Queues tier       tier strip → aggregate count rows
//   Empty             the all-clear card (a good state, reported as one)

const { ADMIN_FONT, ADMIN_MONO, Panel, StatusBadge, MonoLabel, AdminButton } = window;
const T = window.TRIAGE_COPY;

// Faults beyond this many switch the tier to banded presentation.
const DENSE_AT = 7;

// Visually-hidden text, for the parts of a row that colour alone would carry.
const SR_ONLY = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};
function SR({ children }) { return <span style={SR_ONLY}>{children}</span>; }

// ── Tier / band strip ────────────────────────────────────────────────
// Doubles as the heading level: <h3> inside the panel's <h2>.
function TierStrip({ label, count, ink, first }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 18px",
      background: "var(--surface-1)",
      borderTop: first ? "none" : "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      {ink && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 3, background: ink }} />}
      <h3 style={{ margin: 0 }}><MonoLabel color="var(--fg-muted)">{label}</MonoLabel></h3>
      <span style={{ marginLeft: "auto" }}>
        <MonoLabel color="var(--fg-subtle)" size={10}>{count}</MonoLabel>
      </span>
    </div>
  );
}

// ── Condition chip — severity written as text, not just tinted ───────
function ConditionChip({ condition, tier }) {
  const t = window.sevTint(tier);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 7px", borderRadius: 4,
      fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.09em", textTransform: "uppercase",
      color: t.ink, background: t.fill, border: `1px solid ${t.edge}`,
      whiteSpace: "nowrap", lineHeight: "15px",
    }}>{T.conditions[condition].label}</span>
  );
}

// ── Persistence — a first-class right-hand column ────────────────────
// It is a sort key (§3.5 orders by it), so it gets a column of its own where the
// values line up and can be compared down the list. Tabular mono, muted so it
// never competes with the evidence figure. On mobile the column collapses to a
// chip beside the venue name — same value, same styling, same prominence.
function Persistence({ dur, compact }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      justifyContent: "flex-end", whiteSpace: "nowrap",
    }}>
      {!compact && <MonoLabel color="var(--fg-subtle)" size={9}>{T.persistence.label}</MonoLabel>}
      <span style={{
        fontFamily: ADMIN_MONO, fontSize: 12.5, fontWeight: 600,
        color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em",
      }}>{dur}</span>
    </span>
  );
}

function ActionLink({ label, compact }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
      minHeight: 44, minWidth: compact ? 44 : 0, padding: compact ? "0 2px" : "0 2px",
      fontFamily: ADMIN_FONT, fontSize: 11.5, fontWeight: 700,
      color: "var(--signal)", whiteSpace: "nowrap",
    }}>
      {label}<window.TriageIcon name="chevR" size={12} strokeWidth={2.1} />
    </span>
  );
}

// ── Fault row ────────────────────────────────────────────────────────
// Anatomy, top to bottom:
//   line 1  venue name (the thing you act on) + condition chip + persistence
//   line 2  EVIDENCE — the figure that earns the row, at --fg, mono numerals,
//           with a 7-day micro-chart where a trend is the point
//   line 3  the context that makes the figure mean something, muted
// Everything past that is behind the action link. Rule of thumb: inline is what
// tells you whether to open it; the deep-dive surfaces own the rest.
function FaultRow({ f, compact, dense }) {
  const meta = window.CONDITION_META[f.condition];
  const t = window.sevTint(meta.tier);
  const ev = T.evidence[f.condition](f.d);
  const trend = f.d.series && (f.condition === "wentDark" || f.condition === "ceiling");
  const label = T.a11y.rowLabel(f.venue, T.conditions[f.condition].verb, ev.stat, f.dur, meta.tier);

  const tile = (
    <span aria-hidden="true" style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: t.ink, background: t.fill, border: `1px solid ${t.edge}`,
    }}><window.TriageIcon name={meta.glyph} size={15} /></span>
  );

  const evidence = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
      <span style={{
        fontFamily: ADMIN_MONO, fontSize: 12.5, fontWeight: 600, color: "var(--fg)",
        fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em",
      }}>{ev.stat}</span>
      {trend && <window.EvidenceBars series={f.d.series} tone={t.ink} width={compact ? 62 : 74}
        label={T.a11y.evidenceChart({ window: f.d.series.length, series: f.d.series, count: f.d.count })} />}
    </div>
  );

  return (
    <div role="link" tabIndex={0} aria-label={label} style={{
      position: "relative",
      display: "grid",
      gridTemplateColumns: compact ? "28px 1fr auto" : "28px 1fr auto 96px",
      columnGap: 12, rowGap: 0, alignItems: "start",
      padding: compact ? "13px 14px 13px 15px" : "13px 18px 13px 15px",
      borderBottom: "1px solid var(--border)",
      borderLeft: `3px solid ${t.ink}`,
      background: "transparent", cursor: "pointer", minHeight: 44,
      outlineOffset: -2,
    }}>
      {tile}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: ADMIN_FONT, fontSize: 13.5, fontWeight: 700, color: "var(--fg)",
            letterSpacing: "-0.01em", lineHeight: 1.3,
          }}>{f.venue}</span>
          <ConditionChip condition={f.condition} tier={meta.tier} />
          <SR>{T.a11y.severity[meta.tier]}.</SR>
          {compact && <span style={{ marginLeft: "auto" }}><Persistence dur={f.dur} compact /></span>}
        </div>
        {evidence}
        {!(compact && dense) && (
          <div style={{
            fontFamily: ADMIN_FONT, fontSize: 11.5, color: "var(--fg-muted)",
            marginTop: 3, lineHeight: 1.45, textWrap: "pretty",
          }}>{ev.detail}</div>
        )}
      </div>
      {compact
        ? <span style={{ alignSelf: "center" }}><ActionLink label={T.actions[meta.action]} compact /></span>
        : <><span style={{ alignSelf: "center" }}><ActionLink label={T.actions[meta.action]} /></span>
            <span style={{ alignSelf: "center", textAlign: "right" }}><Persistence dur={f.dur} /></span></>}
    </div>
  );
}

// ── Queue row — subordinate by construction ──────────────────────────
// Sits on --surface-1 rather than the card ground, so the tier reads as a shelf
// under the faults instead of more of the same list. No severity rail, no ink:
// a neutral outline tile. Count leads the sentence because the count is the
// whole news. Still a full 44px target and still deep-links — subordinate in
// weight, not in function.
function QueueRow({ q, compact }) {
  const c = T.queues[q.kind];
  return (
    <div role="link" tabIndex={0} aria-label={T.a11y.queueRowLabel(c.title(q.count))} style={{
      display: "grid", gridTemplateColumns: "24px 1fr auto",
      columnGap: 12, alignItems: "center",
      padding: compact ? "11px 14px" : "11px 18px",
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-1)", cursor: "pointer", minHeight: 44,
      outlineOffset: -2,
    }}>
      <span aria-hidden="true" style={{
        width: 24, height: 24, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      }}><window.TriageIcon name={q.glyph} size={13} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: 600, color: "var(--fg)",
          lineHeight: 1.35, fontVariantNumeric: "tabular-nums",
        }}>{c.title(q.count)}</div>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-subtle)",
          marginTop: 2, lineHeight: 1.4, textWrap: "pretty",
        }}>{c.detail(q.breakdown)}</div>
      </div>
      <ActionLink label={T.actions[q.action]} compact={compact} />
    </div>
  );
}

// ── The model footnote ───────────────────────────────────────────────
function ModelNote() {
  return (
    <div style={{
      padding: "9px 18px", borderBottom: "1px solid var(--border)",
      fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-subtle)", lineHeight: 1.4,
    }}>{T.model}</div>
  );
}

// ── Faults-clear strip (queues-only state) ───────────────────────────
// The good news still gets stated when there is other work on the card — one
// success-tinted line, so "nothing is broken" is never inferred from absence.
function FaultsClearStrip({ sweep }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderBottom: "1px solid var(--border)",
    }}>
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: 11, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--success)", background: "color-mix(in oklab, var(--success) 16%, transparent)",
      }}><window.TriageIcon name="check" size={12} strokeWidth={2.2} /></span>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg)", textWrap: "pretty" }}>
        {T.empty.faultsClearStrip(sweep)}
      </span>
    </div>
  );
}

// ── Empty state — nothing is broken, and that is the news ────────────
// Not an illustration and not a shrug. A clean sweep is a result, so it is
// reported like one: the same numbers a fault row would use, in the same mono,
// arranged calmly. Success ink appears exactly once, as a 30px check.
function TriageEmpty({ sweep, compact }) {
  return (
    <div style={{
      display: "flex", gap: compact ? 12 : 16, alignItems: "flex-start",
      padding: compact ? "20px 16px" : "26px 22px",
    }}>
      <span aria-hidden="true" style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--success)",
        background: "color-mix(in oklab, var(--success) 14%, transparent)",
        border: "1px solid color-mix(in oklab, var(--success) 32%, transparent)",
      }}><window.TriageIcon name="check" size={19} strokeWidth={2.2} /></span>
      <div style={{ minWidth: 0 }}>
        <MonoLabel color="var(--success)">{T.empty.eyebrow}</MonoLabel>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: compact ? 16 : 18, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1.2,
        }}>{T.empty.title}</div>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)",
          marginTop: 6, lineHeight: 1.5, maxWidth: 420, textWrap: "pretty",
        }}>{T.empty.body(sweep)}</div>
        <div style={{ marginTop: 10 }}>
          <MonoLabel color="var(--fg-subtle)">{T.empty.aside(sweep)}</MonoLabel>
        </div>
      </div>
    </div>
  );
}

// ── Header summary badge ─────────────────────────────────────────────
function SummaryBadge({ faults, queues, topTier }) {
  if (faults > 0) {
    const kind = topTier === "hard" ? "danger" : topTier === "loss" ? "warning" : "accent";
    return <StatusBadge kind={kind} mono>{T.panel.faultCount(faults)}</StatusBadge>;
  }
  if (queues > 0) return <StatusBadge kind="neutral" mono>{T.panel.queueCount(queues)}</StatusBadge>;
  return <StatusBadge kind="success" mono dot>{T.panel.allClear}</StatusBadge>;
}

// ── The panel ────────────────────────────────────────────────────────
function AttentionPanel({
  faults = [], queues = [], sweep = window.SWEEP,
  compact = false, refreshing = false, denseAt = DENSE_AT, style,
}) {
  const ordered = window.orderFaults(faults);
  const dense = ordered.length >= denseAt;
  const queueTotal = queues.reduce((n, q) => n + q.count, 0);
  const topTier = ordered.length ? window.CONDITION_META[ordered[0].condition].tier : null;
  const nothing = ordered.length === 0 && queues.length === 0;

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <h2 style={{
        margin: 0, fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700,
        color: "var(--fg)", letterSpacing: "-0.01em",
      }}>{T.panel.title}</h2>
      <SummaryBadge faults={ordered.length} queues={queueTotal} topTier={topTier} />
    </div>
  );

  const action = (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 10 }}>
      {!compact && <MonoLabel color="var(--fg-subtle)">{T.panel.syncedAt(sweep.at)}</MonoLabel>}
      <AdminButton variant="ghost" size="sm" icon="refresh"
        style={{ minHeight: 44, minWidth: 44, padding: compact ? 0 : undefined }}>
        {compact
          ? <SR>{refreshing ? T.panel.refreshing : T.panel.refresh}</SR>
          : (refreshing ? T.panel.refreshing : T.panel.refresh)}
      </AdminButton>
    </div>
  );

  // Faults grouped into bands only in dense mode; the band strips replace the
  // single faults tier strip rather than nesting inside it. In undense mode the
  // one strip carries the ink of the worst band present — a list with no `hard`
  // rows must not fly a red dot, or the strip contradicts the rows beneath it.
  const bands = window.BAND_KEYS
    .map((k) => ({ key: k, rows: ordered.filter((f) => window.CONDITION_META[f.condition].tier === k) }))
    .filter((b) => b.rows.length);

  return (
    <Panel title={header} action={action} padding={0} style={style}>
      {/* Live region: one sentence on refresh, never a row-by-row read. */}
      <div aria-live="polite" aria-atomic="true" style={SR_ONLY}>
        {refreshing ? T.a11y.checking : T.a11y.announce(ordered.length, queueTotal)}
      </div>

      {nothing && <TriageEmpty sweep={sweep} compact={compact} />}

      {ordered.length > 0 && !dense && (
        <>
          <TierStrip first label={T.tiers.faults} count={ordered.length} ink={window.SEVERITY[topTier].ink} />
          {ordered.map((f) => <FaultRow key={f.id} f={f} compact={compact} dense={dense} />)}
          <ModelNote />
        </>
      )}

      {ordered.length > 0 && dense && (
        <>
          {bands.map((b, i) => (
            <React.Fragment key={b.key}>
              <TierStrip first={i === 0} label={T.bands[b.key]} count={b.rows.length}
                ink={window.SEVERITY[b.key].ink} />
              {b.rows.map((f) => <FaultRow key={f.id} f={f} compact={compact} dense />)}
            </React.Fragment>
          ))}
          <ModelNote />
        </>
      )}

      {ordered.length === 0 && queues.length > 0 && <FaultsClearStrip sweep={sweep} />}

      {queues.length > 0 && (
        <>
          <TierStrip label={T.tiers.queues} count={queueTotal} />
          {queues.map((q) => <QueueRow key={q.id} q={q} compact={compact} />)}
        </>
      )}
    </Panel>
  );
}

Object.assign(window, {
  AttentionPanel, FaultRow, QueueRow, TierStrip, TriageEmpty, FaultsClearStrip,
  ConditionChip, Persistence, ActionLink, ModelNote, SummaryBadge, SR, SR_ONLY, DENSE_AT,
});
