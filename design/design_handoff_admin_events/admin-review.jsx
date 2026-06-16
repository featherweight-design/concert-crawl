// admin-review.jsx — /admin/review (NEW page, replaces /admin/events and /admin/prices)
//
// Two sections live here:
//   A. Event flags — low-confidence events that didn't auto-approve.
//      Most days this is empty ("queue clear" hero).
//   B. Price coverage — community submissions, missing-price coverage, admin price entry.
//
// Two layout variants exposed via the canvas; one of them ships:
//   - "stacked":      A on top (collapses to a single 'queue clear' strip when empty),
//                     B fills the rest. Default direction.
//   - "data-adaptive": Two-column on big screens IF flags has items;
//                     full-width prices when flags is empty.
//
// Inspector pattern: clicking a flagged event opens an inline right-side
// inspector (matches the existing /admin/events pattern). LLM reasoning lives
// there. Reasoning is one-tap to expand on mobile.

// ─────────────────────────────────────────────────────────────────────
// Sample data
// ─────────────────────────────────────────────────────────────────────
const FLAGGED_EVENTS = [
  {
    id: "evt-2911", title: "tba (likely indie · 3 acts)", venue: "Bluebird Theater",
    date: "May 14", time: "8:00 PM",
    confidence: 0.42, reasons: ["title missing", "non-concert?"], strategy: "llm",
    runId: "r-9419", llmCost: 0.04, tokens: 1842,
    reasoning: "Title field on source page reads only 'TBA' with three sub-acts listed in small text. Could be a comedy showcase based on the names; cannot disambiguate without manual review.",
    raw: `<div class="event-card">\n  <h3 class="title">TBA</h3>\n  <p class="lineup">Brennen Leigh · Charley Crockett · ?</p>\n  <span class="date">May 14, 8 PM</span>\n</div>`,
  },
  {
    id: "evt-2902", title: "Bright Eyes (possible duplicate)", venue: "Bluebird Theater",
    date: "May 14", time: "8:00 PM",
    confidence: 0.55, reasons: ["possible duplicate", "two sources"], strategy: "llm",
    runId: "r-9419", llmCost: 0.06, tokens: 2104,
    reasoning: "Title 'Bright Eyes' also exists at Red Rocks May 14 with overlapping date. Two sources (Bluebird calendar + tour announcement) disagree on venue. Likely the same tour with one date wrong.",
    raw: `<article id="ev-bright-eyes">\n  <h2>Bright Eyes</h2>\n  <time>May 14 · 8 PM</time>\n  <p class="venue">Bluebird Theater</p>\n</article>`,
  },
  {
    id: "evt-2885", title: "Trivia Tuesday w/ Hank", venue: "Larimer Lounge",
    date: "May 14", time: "7:00 PM",
    confidence: 0.61, reasons: ["non-concert"], strategy: "llm",
    runId: "r-9418", llmCost: 0.03, tokens: 1410,
    reasoning: "Page format and copy suggest a trivia/comedy night, not a music concert. Recommend reject + venue-level filter rule.",
    raw: `<li class="event"><strong>Trivia Tuesday</strong><br/>with Hank · 7 PM · Free</li>`,
  },
  {
    id: "evt-2878", title: "Private Event — see staff", venue: "Gothic Theatre",
    date: "May 15", time: "—",
    confidence: 0.31, reasons: ["non-concert", "private"], strategy: "llm",
    runId: "r-9417", llmCost: 0.02, tokens: 920,
    reasoning: "Marked 'private event' on source page. Should not surface to consumers.",
    raw: `<div class="event--private"><span>Private event — see staff</span></div>`,
  },
];

const PRICE_COVERAGE = [
  { id: "evt-2840", title: "Khruangbin",            venue: "Mission Ballroom",  date: "May 16", price: { low: 55, high: 95 },  source: "crawled",   updated: "12:38 PM", missing: false },
  { id: "evt-2835", title: "Cigarettes After Sex",  venue: "Mission Ballroom",  date: "May 27", price: { low: 65, high: 110 }, source: "community", updated: "yesterday", missing: false },
  { id: "evt-2841", title: "Bright Eyes",           venue: "Bluebird Theater",  date: "May 14", price: null,                   source: null,        updated: null,        missing: true },
  { id: "evt-2818", title: "Vampire Weekend",       venue: "Red Rocks",         date: "Jun 02", price: { low: 78, high: 165 }, source: "admin",     updated: "May 14",    missing: false, stale: true },
  { id: "evt-2891", title: "boygenius",             venue: "Red Rocks",         date: "Jul 11", price: null,                   source: null,        updated: null,        missing: true },
  { id: "evt-2872", title: "Wet Leg",               venue: "Ogden Theatre",     date: "Jun 18", price: { low: 42, high: 65 },  source: "crawled",   updated: "11:48 AM", missing: false },
  { id: "evt-2814", title: "Father John Misty",     venue: "Gothic Theatre",    date: "Jun 22", price: null,                   source: null,        updated: null,        missing: true },
];

const PENDING_PRICE_SUBMISSIONS = [
  { id: "sub-104", event: "Khruangbin",  venue: "Mission Ballroom",  date: "May 16", submitter: "@lou_elsewhere",  low: 58, high: 95, note: "saw on Mission's IG today", submitted: "12m ago" },
  { id: "sub-103", event: "Bright Eyes", venue: "Bluebird Theater",  date: "May 14", submitter: "@marlene_kalimba", low: 45, high: 70, note: "front-of-house quote", submitted: "1h ago" },
];

// ─────────────────────────────────────────────────────────────────────
// SECTION A — Event flags
// ─────────────────────────────────────────────────────────────────────
function ConfidenceBarV2({ value }) {
  const pct = Math.round(value * 100);
  const kind = value >= 0.80 ? "success" : value >= 0.70 ? "signal" : value >= 0.60 ? "warning" : "danger";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 96 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden", minWidth: 50 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: `var(--${kind})` }} />
      </div>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: `var(--${kind})`, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function FlagReasonChip({ reason }) {
  const map = {
    "title missing":      { kind: "warning" },
    "non-concert?":       { kind: "neutral" },
    "non-concert":        { kind: "neutral" },
    "private":            { kind: "neutral" },
    "possible duplicate": { kind: "warning" },
    "two sources":        { kind: "warning" },
  };
  const k = map[reason]?.kind || "neutral";
  return <StatusBadge kind={k} variant="outline" mono>{reason}</StatusBadge>;
}

function EventFlagRow({ ev, active, onClick, selected, onToggleSelect }) {
  return (
    <div onClick={onClick} role="button" tabIndex={0} style={{
      boxSizing: "border-box", cursor: "pointer",
      display: "grid", gridTemplateColumns: "auto 1fr auto auto",
      gap: 14, alignItems: "center", width: "100%",
      padding: "14px 18px",
      background: active ? "var(--surface-2)" : selected ? "color-mix(in oklab, var(--signal) 6%, transparent)" : "transparent",
      borderLeft: active ? "2px solid var(--signal)" : "2px solid transparent",
      borderBottom: "1px solid var(--border)",
      transition: "background .12s",
    }}>
      <input
        type="checkbox"
        checked={!!selected}
        onChange={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(ev.id); }}
        onClick={(e) => e.stopPropagation()}
        style={{ accentColor: "var(--signal)", width: 15, height: 15, cursor: "pointer" }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600,
          color: "var(--fg)", letterSpacing: "-0.005em", lineHeight: 1.4,
          marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{ev.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>{ev.venue}</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>{ev.date} {ev.time}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ev.reasons.map(r => <FlagReasonChip key={r} reason={r} />)}
        </div>
      </div>
      <ConfidenceBarV2 value={ev.confidence} />
      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <AdminButton variant="ghost" size="sm" icon="x" title="Reject" />
        <AdminButton variant="success" size="sm" icon="check">Approve</AdminButton>
      </div>
    </div>
  );
}

function EventFlagInspector({ ev }) {
  if (!ev) return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 28, color: "var(--fg-subtle)", textAlign: "center", gap: 8,
    }}>
      <AdminIcon name="events" size={32} />
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 13 }}>Select a flagged event to inspect</span>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <MonoLabel>{ev.id}</MonoLabel>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          <StatusBadge kind="warning" mono>flagged · {ev.reasons[0]}</StatusBadge>
        </div>
        <h3 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 18, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>{ev.title}</h3>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>{ev.venue} · {ev.date} {ev.time}</div>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>
        <div>
          <MonoLabel>confidence</MonoLabel>
          <div style={{ marginTop: 8 }}>
            <ConfidenceBarV2 value={ev.confidence} />
          </div>
        </div>
        <div>
          <MonoLabel color="var(--accent)">llm reasoning</MonoLabel>
          <div style={{
            marginTop: 8, padding: "12px 14px",
            background: "color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))",
            border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            borderRadius: 8,
            fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", lineHeight: 1.55,
          }}>{ev.reasoning}</div>
        </div>
        <div>
          <MonoLabel>raw source</MonoLabel>
          <pre style={{
            marginTop: 8, padding: "12px 14px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 8, fontFamily: ADMIN_MONO, fontSize: 11,
            color: "var(--fg-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap",
            overflowX: "auto", margin: "8px 0 0",
          }}>{ev.raw}</pre>
        </div>
        <div style={{
          display: "flex", gap: 12, alignItems: "center",
          padding: "10px 12px", background: "var(--surface-1)",
          borderRadius: 8, border: "1px solid var(--border)",
          fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)",
        }}>
          <span>run {ev.runId}</span>
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <CostText value={ev.llmCost} size={11} />
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <span>{ev.tokens.toLocaleString()} tok</span>
        </div>
      </div>
      <div style={{
        display: "flex", gap: 8, padding: "12px 18px",
        borderTop: "1px solid var(--border)", background: "var(--bg-elevated)",
      }}>
        <AdminButton variant="ghost" size="sm" icon="x">Reject</AdminButton>
        <AdminButton variant="outline" size="sm" icon="edit">Edit & approve</AdminButton>
        <AdminButton variant="ghost" size="sm" icon="external" title="Deeper edits than the inline fields — opens /admin/events/:id/edit">Open full editor</AdminButton>
        <AdminButton variant="success" size="sm" icon="check" style={{ marginLeft: "auto" }}>Approve</AdminButton>
      </div>
    </div>
  );
}

// Event flags section — with/without items
function EventFlagsSection({ items = FLAGGED_EVENTS, selectedId, onSelect, showInspector = true, selectedIds, onToggleSelect }) {
  if (items.length === 0) {
    return (
      <Panel title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Event flags</span>
        <StatusBadge kind="success" mono>queue clear</StatusBadge>
      </>} padding={0}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: "color-mix(in oklab, var(--success) 14%, transparent)",
              color: "var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><AdminIcon name="check" size={18} /></div>
            <div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Queue is clear.</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                Every flagged event has been triaged. Next sweep runs at 18:00 MT.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="ghost" size="sm" icon="filter">Filter rules</AdminButton>
            <AdminButton variant="outline" size="sm">View history</AdminButton>
          </div>
        </div>
      </Panel>
    );
  }
  const selected = items.find(e => e.id === selectedId) || items[0];
  const sels = selectedIds || new Set();
  const allChecked = items.length > 0 && items.every(e => sels.has(e.id));
  return (
    <Panel title={<>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Event flags</span>
      <StatusBadge kind="warning" mono>{items.length} pending</StatusBadge>
    </>}
    action={
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => onToggleSelect && onToggleSelect("__all__")}
            style={{ accentColor: "var(--signal)" }}
          />
          Select all
        </label>
        <AdminButton variant="ghost" size="sm" icon="filter">Hide non-concert</AdminButton>
      </div>
    } padding={0}>
      <div style={{ display: "grid", gridTemplateColumns: showInspector ? "minmax(0, 1.1fr) minmax(0, 1fr)" : "1fr", minHeight: 420 }}>
        <div style={{ borderRight: showInspector ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column" }}>
          {items.map(ev => (
            <EventFlagRow
              key={ev.id}
              ev={ev}
              active={ev.id === selected.id}
              onClick={() => onSelect && onSelect(ev.id)}
              selected={sels.has(ev.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
        {showInspector && <EventFlagInspector ev={selected} />}
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION B — Price coverage (three sub-arrangements)
// ─────────────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  if (!source) return <StatusBadge kind="danger" mono>no price</StatusBadge>;
  const map = {
    crawled:   { kind: "signal",  label: "crawled" },
    community: { kind: "accent",  label: "community" },
    admin:     { kind: "warning", label: "admin" },
  }[source];
  return <StatusBadge kind={map.kind} variant="outline" mono>{map.label}</StatusBadge>;
}

function PriceCellInline({ row, onAdd }) {
  if (row.missing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>—</span>
        <AdminButton variant="outline" size="sm" icon="plus" onClick={() => onAdd && onAdd(row.id)}>Add price</AdminButton>
      </div>
    );
  }
  return (
    <span style={{ fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 600, color: row.stale ? "var(--fg-muted)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
      ${row.price.low}–${row.price.high}
      {row.stale && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--warning)", letterSpacing: "0.04em" }}>STALE</span>}
    </span>
  );
}

// — Pending submissions queue —
function PendingSubmissionRow({ sub }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14, alignItems: "center",
      padding: "12px 18px", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{sub.event}</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>{sub.venue} · {sub.date}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
          <span style={{ fontFamily: ADMIN_MONO, fontWeight: 700, color: "var(--accent)" }}>{sub.submitter}</span>
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontStyle: "italic" }}>"{sub.note}"</span>
        </div>
      </div>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
        ${sub.low}–${sub.high}
      </span>
      <RelTime value={sub.submitted} />
      <div style={{ display: "flex", gap: 6 }}>
        <AdminButton variant="ghost" size="sm" icon="x">Deny</AdminButton>
        <AdminButton variant="success" size="sm" icon="check">Approve · award cred</AdminButton>
      </div>
    </div>
  );
}

function PendingSubmissionsPanel({ items = PENDING_PRICE_SUBMISSIONS }) {
  if (items.length === 0) return null;
  return (
    <Panel title={<>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Community price submissions</span>
      <StatusBadge kind="signal" mono>{items.length} pending</StatusBadge>
    </>}
    action={<AdminButton variant="ghost" size="sm" iconRight="chevR">All submissions</AdminButton>}
    padding={0}>
      {items.map(s => <PendingSubmissionRow key={s.id} sub={s} />)}
    </Panel>
  );
}

// — Coverage table (events × price source) —
// ── Add-price inline form ────────────────────────────────────────────
// Replaces the row content in-place. Renders below or instead of the row's
// regular price cell. Validates: low ≤ high, both > 0.
function AddPriceInlineForm({ row, onCancel, onSave }) {
  return (
    <div style={{
      padding: "14px 18px",
      background: "color-mix(in oklab, var(--signal) 5%, var(--bg-elevated))",
      border: "1px solid color-mix(in oklab, var(--signal) 30%, transparent)",
      borderRadius: 8,
      display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "end",
    }}>
      <div>
        <MonoLabel>adding price for</MonoLabel>
        <div style={{ marginTop: 2, fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{row.title}</div>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{row.venue} · {row.date}</div>
      </div>
      <div>
        <MonoLabel>low</MonoLabel>
        <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", gap: 4 }}>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>$</span>
          <input type="number" defaultValue="" placeholder="35" style={{ all: "unset", width: 56, fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 600, color: "var(--fg)" }} />
        </div>
      </div>
      <div>
        <MonoLabel>high</MonoLabel>
        <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", gap: 4 }}>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>$</span>
          <input type="number" defaultValue="" placeholder="65" style={{ all: "unset", width: 56, fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 600, color: "var(--fg)" }} />
        </div>
      </div>
      <div style={{ minWidth: 160 }}>
        <MonoLabel>source note · optional</MonoLabel>
        <input type="text" placeholder="e.g. AXS listing 12:14" style={{
          marginTop: 4, height: 32, width: "100%", padding: "0 10px",
          border: "1px solid var(--border-strong)", borderRadius: 6,
          background: "var(--bg-elevated)", fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)",
        }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <AdminButton variant="ghost" size="sm" icon="x" onClick={onCancel}>Cancel</AdminButton>
        <AdminButton variant="primary" size="sm" icon="check" onClick={onSave}>Save price</AdminButton>
      </div>
    </div>
  );
}

// ── Row overflow menu ──────────────────────────────────────────────────────
// Popover anchored to the ⋯ button on a price row. Three actions.
// "Mark stale" only enabled for admin-source rows that aren't already stale.
// "Remove" prompts for confirmation in real impl — spec'd as a separate small modal,
// not drawn here because the destructive copy is identical to DeleteVenueConfirm
// shape (typed gate not required for a single price; native confirm() is enough).
function PriceRowMenu({ row, anchorRef, onClose, onEdit, onMarkStale, onRemove }) {
  return (
    <div style={{
      position: "absolute", right: 28, top: "100%", marginTop: 4,
      minWidth: 180, padding: 4,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "0 14px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
      zIndex: 20,
    }}>
      <PriceMenuItem icon="edit" onClick={onEdit}>Edit price</PriceMenuItem>
      <PriceMenuItem
        icon="alertTri"
        onClick={onMarkStale}
        disabled={row.source !== "admin" || row.stale}
        helper={row.source !== "admin" ? "admin prices only" : row.stale ? "already stale" : null}
      >Mark stale</PriceMenuItem>
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
      <PriceMenuItem icon="x" onClick={onRemove} destructive>Remove price…</PriceMenuItem>
    </div>
  );
}

function PriceMenuItem({ icon, children, onClick, destructive, disabled, helper }) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        all: "unset", boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 10px", borderRadius: 6,
        opacity: disabled ? 0.45 : 1,
        color: destructive ? "var(--danger)" : "var(--fg)",
        fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 500,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--surface-1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <AdminIcon name={icon} size={14} color={destructive ? "var(--danger)" : "var(--fg-muted)"} />
      <span style={{ flex: 1 }}>{children}</span>
      {helper && (
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "var(--fg-subtle)", textTransform: "uppercase" }}>{helper}</span>
      )}
    </button>
  );
}

function PriceCoverageTable({ rows = PRICE_COVERAGE, showHeader = true, addingId, onAdd, onCancelAdd, openMenuId, onToggleMenu }) {
  const sorted = [...rows].sort((a, b) => Number(b.missing) - Number(a.missing));
  return (
    <Panel
      title={showHeader && <>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Price coverage</span>
        <StatusBadge kind="warning" mono>{rows.filter(r => r.missing).length} missing</StatusBadge>
      </>}
      action={showHeader && (
        <div style={{ display: "flex", gap: 6 }}>
          <AdminButton variant="ghost" size="sm" icon="filter">Source</AdminButton>
          <AdminButton variant="ghost" size="sm" icon="filter">Missing only</AdminButton>
        </div>
      )}
      padding={0}
    >
      <AdminTable style={{ border: "none", borderRadius: 0 }}>
        <THead>
          <tr>
            <TH>Event</TH>
            <TH>Venue / date</TH>
            <TH>Source</TH>
            <TH>Current price</TH>
            <TH align="right">Updated</TH>
            <TH width={32}></TH>
          </tr>
        </THead>
        <tbody>
          {sorted.map(r => {
            const adding = addingId === r.id;
            return (
              <React.Fragment key={r.id}>
                <TR active={adding}>
                  <TD><span style={{ fontWeight: 600 }}>{r.title}</span></TD>
                  <TD color="var(--fg-muted)">
                    <div>{r.venue}</div>
                    <div style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{r.date}</div>
                  </TD>
                  <TD><SourceBadge source={r.source} /></TD>
                  <TD><PriceCellInline row={r} onAdd={onAdd} /></TD>
                  <TD align="right" mono color="var(--fg-muted)">{r.updated || "—"}</TD>
                  <TD>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => onToggleMenu && onToggleMenu(openMenuId === r.id ? null : r.id)}
                        style={{
                          all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
                          color: openMenuId === r.id ? "var(--fg)" : "var(--fg-muted)",
                          background: openMenuId === r.id ? "var(--surface-1)" : "transparent",
                          display: "flex",
                        }}
                      >
                        <AdminIcon name="more" size={14} />
                      </button>
                      {openMenuId === r.id && (
                        <PriceRowMenu row={r} onClose={() => onToggleMenu && onToggleMenu(null)} />
                      )}
                    </div>
                  </TD>
                </TR>
                {adding && (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px 14px", background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}>
                      <AddPriceInlineForm row={r} onCancel={() => onCancelAdd && onCancelAdd()} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </AdminTable>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FULL PAGE
// ─────────────────────────────────────────────────────────────────────
function AdminReviewPage({ layout = "stacked", flagsEmpty = false, selectedFlagId, onSelectFlag, selectedIds, onToggleSelect, bulkConfirmOpen = false, addingPriceId, onAddPrice, onCancelAddPrice, openPriceMenuId, onTogglePriceMenu }) {
  const flagItems = flagsEmpty ? [] : FLAGGED_EVENTS;
  const flagsCount = flagItems.length;
  const submissionsCount = PENDING_PRICE_SUBMISSIONS.length;
  const reviewBadge = flagsCount + submissionsCount;

  const header = (
    <SectionHead
      eyebrow="Operations · moderation"
      title={<span>Review <StatusBadge kind={reviewBadge > 5 ? "warning" : reviewBadge > 0 ? "signal" : "success"} mono style={{ marginLeft: 12, verticalAlign: "middle" }}>{reviewBadge} pending</StatusBadge></span>}
      subtitle="Most events auto-approve. This page is where flags and community price submissions land for triage."
      actions={
        <>
          <AdminButton variant="outline" size="sm" icon="filter">Filter rules</AdminButton>
          <AdminButton variant="outline" size="sm" icon="external">Approval history</AdminButton>
        </>
      }
    />
  );

  // STACKED layout (default direction)
  if (layout === "stacked") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22, position: "relative" }}>
        {header}
        <EventFlagsSection
          items={flagItems}
          selectedId={selectedFlagId}
          onSelect={onSelectFlag}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
        <PendingSubmissionsPanel />
        <PriceCoverageTable
          addingId={addingPriceId}
          onAdd={onAddPrice}
          onCancelAdd={onCancelAddPrice}
          openMenuId={openPriceMenuId}
          onToggleMenu={onTogglePriceMenu}
        />
        {selectedIds && selectedIds.size > 0 && (
          <BulkActionDock count={selectedIds.size} />
        )}
        {bulkConfirmOpen && <BulkApproveConfirm count={(selectedIds && selectedIds.size) || flagItems.length} items={flagItems} />}
      </div>
    );
  }

  // DATA-ADAPTIVE layout — two-column when flags has items, full-width when clear
  if (layout === "data-adaptive") {
    if (flagsEmpty) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {header}
          <EventFlagsSection items={[]} />
          <PendingSubmissionsPanel />
          <PriceCoverageTable addingId={addingPriceId} onAdd={onAddPrice} onCancelAdd={onCancelAddPrice} openMenuId={openPriceMenuId} onToggleMenu={onTogglePriceMenu} />
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {header}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 20, alignItems: "flex-start" }}>
          <EventFlagsSection items={flagItems} selectedId={selectedFlagId} onSelect={onSelectFlag} showInspector={false} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PendingSubmissionsPanel />
          </div>
        </div>
        <EventFlagInspectorCard ev={flagItems.find(e => e.id === selectedFlagId) || flagItems[0]} />
        <PriceCoverageTable addingId={addingPriceId} onAdd={onAddPrice} onCancelAdd={onCancelAddPrice} openMenuId={openPriceMenuId} onToggleMenu={onTogglePriceMenu} />
      </div>
    );
  }

  return null;
}

// Standalone inspector card variant (used in data-adaptive when flags column lacks one)
function EventFlagInspectorCard({ ev }) {
  if (!ev) return null;
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Inspecting</span>
        <MonoLabel>{ev.id}</MonoLabel>
      </>}
      action={
        <div style={{ display: "flex", gap: 6 }}>
          <AdminButton variant="ghost" size="sm" icon="x">Reject</AdminButton>
          <AdminButton variant="outline" size="sm" icon="edit">Edit</AdminButton>
          <AdminButton variant="success" size="sm" icon="check">Approve</AdminButton>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontFamily: ADMIN_FONT, fontSize: 18, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>{ev.title}</h3>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginBottom: 14 }}>{ev.venue} · {ev.date} {ev.time}</div>
          <MonoLabel>confidence</MonoLabel>
          <div style={{ marginTop: 8, marginBottom: 14 }}>
            <ConfidenceBarV2 value={ev.confidence} />
          </div>
          <MonoLabel color="var(--accent)">llm reasoning</MonoLabel>
          <div style={{
            marginTop: 8, padding: "12px 14px",
            background: "color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))",
            border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            borderRadius: 8, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", lineHeight: 1.55,
          }}>{ev.reasoning}</div>
        </div>
        <div>
          <MonoLabel>raw source</MonoLabel>
          <pre style={{
            marginTop: 8, padding: "12px 14px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 8, fontFamily: ADMIN_MONO, fontSize: 11,
            color: "var(--fg-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap",
            overflowX: "auto", margin: "8px 0 0",
          }}>{ev.raw}</pre>
        </div>
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────
// BULK APPROVE — selection dock + confirm modal
// ─────────────────────────────────────────────────────────────────────

// Floating dock that appears when ≥1 row is selected. Position: bottom-center.
// Sticks to viewport, doesn't scroll with content.
function BulkActionDock({ count, onApprove, onReject, onRetag, onClear }) {
  return (
    <div style={{
      position: "sticky", bottom: 18,
      alignSelf: "center", justifySelf: "center",
      marginLeft: "auto", marginRight: "auto",
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px 10px 18px",
      background: "var(--ink)",
      borderRadius: 14,
      boxShadow: "0 12px 36px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18)",
      color: "var(--paper)",
      zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          minWidth: 22, height: 22, padding: "0 7px", borderRadius: 11,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}>{count}</span>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600 }}>selected</span>
      </div>
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.16)" }} />
      <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, color: "var(--paper)", fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600 }}>
        <AdminIcon name="filter" size={13} /> Re-tag
      </button>
      <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, color: "color-mix(in oklab, var(--danger) 60%, #fff)", fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600 }}>
        <AdminIcon name="x" size={13} /> Reject all
      </button>
      <button onClick={onApprove} style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8,
        background: "var(--success)", color: "var(--fg-on-accent)",
        fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700,
      }}>
        <AdminIcon name="check" size={14} /> Approve {count}
      </button>
      <button onClick={onClear} title="Clear selection" style={{
        all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
        color: "rgba(255,255,255,0.6)", display: "flex",
      }}>
        <AdminIcon name="x" size={14} />
      </button>
    </div>
  );
}

// Bulk approve confirmation — modal. Renders a scrim + centered card.
// Confirm is required for >10 events (per v1 spec) but we show it always
// so the design covers the path.
function BulkApproveConfirm({ count, items = [], onCancel, onConfirm }) {
  const preview = items.slice(0, 5);
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: 520, maxWidth: "100%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <MonoLabel color="var(--success)">bulk action</MonoLabel>
          <h3 style={{ margin: "6px 0 0", fontFamily: ADMIN_FONT, fontSize: 18, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            Approve {count} flagged event{count === 1 ? "" : "s"}?
          </h3>
          <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>
            They'll publish to the consumer app immediately. You can undo from the toast for 6s.
          </div>
        </div>
        <div style={{ padding: "14px 22px" }}>
          <MonoLabel>about to approve</MonoLabel>
          <div style={{
            marginTop: 8,
            border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
            background: "var(--surface-1)",
          }}>
            {preview.map(ev => (
              <div key={ev.id} style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
                padding: "8px 12px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{ev.venue} · {ev.date}</div>
                </div>
                <ConfidenceBarV2 value={ev.confidence} />
              </div>
            ))}
            {count > preview.length && (
              <div style={{ padding: "8px 12px", fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", fontStyle: "italic" }}>
                …and {count - preview.length} more.
              </div>
            )}
          </div>
          <div style={{
            marginTop: 12, padding: "10px 12px",
            background: "color-mix(in oklab, var(--warning) 8%, var(--bg-elevated))",
            border: "1px solid color-mix(in oklab, var(--warning) 28%, transparent)",
            borderRadius: 8,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <AdminIcon name="alertTri" size={14} color="var(--warning)" />
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", lineHeight: 1.5 }}>
              {count} event{count === 1 ? " has" : "s have"} confidence below 0.70. Double-check the lowest-confidence rows before approving.
            </span>
          </div>
        </div>
        <div style={{
          padding: "14px 22px", borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, justifyContent: "flex-end",
          background: "var(--surface-1)",
        }}>
          <AdminButton variant="ghost" onClick={onCancel}>Cancel</AdminButton>
          <AdminButton variant="success" icon="check" onClick={onConfirm}>Approve {count}</AdminButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MOBILE PRICES TAB CONTENT
// ─────────────────────────────────────────────────────────────────────

function AdminReviewMobilePrices({ submissions = PENDING_PRICE_SUBMISSIONS, coverage = PRICE_COVERAGE, addingId, onAdd, onCancelAdd }) {
  const missing = coverage.filter(r => r.missing);
  const present = coverage.filter(r => !r.missing);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Pending submissions */}
      {submissions.length > 0 && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Community submissions</span>
            <StatusBadge kind="signal" mono>{submissions.length} pending</StatusBadge>
          </div>
          {submissions.map(sub => (
            <div key={sub.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{sub.event}</div>
                <div style={{ fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>${sub.low}–${sub.high}</div>
              </div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>{sub.venue} · {sub.date}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{sub.submitter}</span>
                <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", fontStyle: "italic", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{sub.note}"</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <AdminButton variant="ghost" size="sm" icon="x" fullWidth>Deny</AdminButton>
                <AdminButton variant="success" size="sm" icon="check" fullWidth>Approve · cred</AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Missing-price queue */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Needs price</span>
          <StatusBadge kind="warning" mono>{missing.length}</StatusBadge>
        </div>
        {missing.map(r => (
          <React.Fragment key={r.id}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{r.venue} · {r.date}</div>
              </div>
              <AdminButton variant="outline" size="sm" icon="plus" onClick={() => onAdd && onAdd(r.id)}>Add</AdminButton>
            </div>
            {addingId === r.id && (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "color-mix(in oklab, var(--signal) 5%, transparent)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <MonoLabel>low</MonoLabel>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", gap: 4 }}>
                      <span style={{ fontFamily: ADMIN_MONO, fontSize: 13, color: "var(--fg-subtle)" }}>$</span>
                      <input type="number" placeholder="35" style={{ all: "unset", width: "100%", fontFamily: ADMIN_MONO, fontSize: 14, fontWeight: 600, color: "var(--fg)" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <MonoLabel>high</MonoLabel>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", gap: 4 }}>
                      <span style={{ fontFamily: ADMIN_MONO, fontSize: 13, color: "var(--fg-subtle)" }}>$</span>
                      <input type="number" placeholder="65" style={{ all: "unset", width: "100%", fontFamily: ADMIN_MONO, fontSize: 14, fontWeight: 600, color: "var(--fg)" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <AdminButton variant="ghost" size="sm" onClick={onCancelAdd} fullWidth>Cancel</AdminButton>
                  <AdminButton variant="primary" size="sm" icon="check" fullWidth>Save price</AdminButton>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Has price */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Has price</span>
          <MonoLabel>{present.length}</MonoLabel>
        </div>
        {present.map(r => (
          <div key={r.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{r.venue} · {r.date}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 600, color: r.stale ? "var(--fg-muted)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                ${r.price.low}–${r.price.high}
              </span>
              <SourceBadge source={r.source} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Update AdminReviewMobile to actually switch on tab
function AdminReviewMobile({ flagsEmpty = false, tab = "flags", addingPriceId, onAddPrice, onCancelAddPrice }) {
  const flagItems = flagsEmpty ? [] : FLAGGED_EVENTS;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Review</h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
          {flagItems.length} events · {PENDING_PRICE_SUBMISSIONS.length} prices waiting.
        </div>
      </div>

      <div style={{
        display: "flex", gap: 6, padding: 4,
        background: "var(--surface-1)", borderRadius: 10, border: "1px solid var(--border)",
      }}>
        {[
          { k: "flags",  label: "Event flags", count: flagItems.length },
          { k: "prices", label: "Prices",      count: PENDING_PRICE_SUBMISSIONS.length },
        ].map(t => {
          const active = tab === t.k;
          return (
            <div key={t.k} style={{
              flex: 1, textAlign: "center",
              padding: "8px 0", borderRadius: 7,
              fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 700,
              color: active ? "var(--fg)" : "var(--fg-muted)",
              background: active ? "var(--bg-elevated)" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {t.label}
              {t.count > 0 && <span style={{
                fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700,
                minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
                background: active ? "var(--signal)" : "var(--surface-2)",
                color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>{t.count}</span>}
            </div>
          );
        })}
      </div>

      {tab === "flags" && (flagItems.length === 0 ? (
        <div style={{
          padding: "28px 22px",
          background: "var(--bg-elevated)", borderRadius: 12, border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: "color-mix(in oklab, var(--success) 14%, transparent)",
            color: "var(--success)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><AdminIcon name="check" size={20} /></div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>Queue is clear.</div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", maxWidth: 280, lineHeight: 1.5 }}>
            Every flagged event has been triaged. Next sweep runs at 18:00 MT.
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {flagItems.slice(0, 3).map(ev => (
            <div key={ev.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>{ev.title}</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>{ev.venue} · {ev.date} {ev.time}</div>
              <div style={{ marginBottom: 8 }}><ConfidenceBarV2 value={ev.confidence} /></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {ev.reasons.map(r => <FlagReasonChip key={r} reason={r} />)}
              </div>
              <details style={{ marginBottom: 10 }}>
                <summary style={{ fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700, color: "var(--accent)", cursor: "pointer", letterSpacing: "0.02em" }}>LLM reasoning</summary>
                <div style={{
                  marginTop: 8, padding: "10px 12px",
                  background: "color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))",
                  border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                  borderRadius: 6, fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg)", lineHeight: 1.5,
                }}>{ev.reasoning}</div>
              </details>
              <div style={{ display: "flex", gap: 8 }}>
                <AdminButton variant="ghost" size="sm" icon="x" fullWidth>Reject</AdminButton>
                <AdminButton variant="success" size="sm" icon="check" fullWidth>Approve</AdminButton>
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === "prices" && (
        <AdminReviewMobilePrices addingId={addingPriceId} onAdd={onAddPrice} onCancelAdd={onCancelAddPrice} />
      )}
    </div>
  );
}

Object.assign(window, {
  BulkActionDock, BulkApproveConfirm,
  AddPriceInlineForm, AdminReviewMobilePrices,
  PriceRowMenu, PriceMenuItem,
});

Object.assign(window, {
  AdminReviewPage, AdminReviewMobile,
  EventFlagsSection, EventFlagRow, EventFlagInspector, EventFlagInspectorCard,
  PendingSubmissionsPanel, PriceCoverageTable, ConfidenceBarV2, SourceBadge,
  FLAGGED_EVENTS, PRICE_COVERAGE, PENDING_PRICE_SUBMISSIONS,
});
