// admin-events-mgmt.jsx — Event Management surface (search + act on ANY event).
//
// Lives as a second tab inside /admin/review ("Queue" | "All events"). The Queue
// tab is the existing low-confidence moderation queue (EventFlagsSection from
// admin-review.jsx). The "All events" tab is THIS surface: search + filter + sort
// across the whole catalog (verified AND unverified), with per-row + bulk actions.
//
// Reuses: admin-primitives (AdminButton, StatusBadge, AdminTable, Panel, MonoLabel,
// AdminIcon, RelTime, Spinner, ADMIN_FONT/MONO), admin-review (ConfidenceBarV2,
// SourceBadge, EventFlagsSection). Tokens are consumer Electric/Jade/Light via
// theme-context.jsx — every color reads var(--*).

// ─────────────────────────────────────────────────────────────────────
// Sample data — Denver venues, mix of verified + unverified, some junk.
// ─────────────────────────────────────────────────────────────────────
const ALL_EVENTS = [
  { id: "evt-3001", title: "Khruangbin", artist: "Khruangbin", venue: "Mission Ballroom", date: "Jun 16", time: "9:00 PM", verified: true,  confidence: 0.94, genres: ["psych", "funk"], price: { low: 55, high: 95 }, source: "structured", created: "2h ago" },
  { id: "evt-3002", title: "Swing Nights w/ The Atomic Five", artist: "The Atomic Five", venue: "Cervantes' Masquerade Ball", date: "Jun 18", time: "7:00 PM", verified: true, confidence: 0.71, genres: [], price: { low: 15, high: 15 }, source: "llm", created: "1d ago", note: "non-concert — slipped past auto-approve" },
  { id: "evt-3003", title: "Wednesday + MJ Lenderman", artist: "Wednesday", venue: "Gothic Theatre", date: "Jun 20", time: "8:00 PM", verified: false, confidence: 0.74, genres: ["indie", "country"], price: { low: 28, high: 35 }, source: "llm", created: "3h ago" },
  { id: "evt-3004", title: "boygenius (acoustic)", artist: "boygenius", venue: "Bluebird Theater", date: "Jun 22", time: null, verified: false, confidence: 0.49, genres: ["indie"], price: null, source: "llm", created: "3h ago" },
  { id: "evt-3005", title: "Cigarettes After Sex", artist: "Cigarettes After Sex", venue: "Mission Ballroom", date: "Jun 27", time: "8:30 PM", verified: true, confidence: 0.95, genres: ["dream-pop"], price: { low: 65, high: 110 }, source: "structured", created: "5h ago" },
  { id: "evt-3006", title: "Geese", artist: "Geese", venue: "Ogden Theatre", date: "Jun 24", time: "8:00 PM", verified: true, confidence: 0.88, genres: ["post-punk"], price: { low: 30, high: 30 }, source: "structured", created: "yesterday" },
  { id: "evt-3007", title: "King Gizzard & the Lizard Wizard", artist: "King Gizzard & the Lizard Wizard", venue: "Red Rocks", date: "Jul 02", time: "7:30 PM", verified: true, confidence: 0.91, genres: ["psych", "rock"], price: { low: 59, high: 89 }, source: "community", created: "yesterday" },
  { id: "evt-3008", title: "Open Mic Comedy Showcase", artist: "—", venue: "Larimer Lounge", date: "Jun 17", time: "8:00 PM", verified: true, confidence: 0.63, genres: [], price: null, source: "llm", created: "2d ago", note: "non-concert — comedy" },
  { id: "evt-3009", title: "Wet Leg", artist: "Wet Leg", venue: "Gothic Theatre", date: "Jun 18", time: "8:00 PM", verified: false, confidence: 0.69, genres: ["indie", "rock"], price: { low: 42, high: 65 }, source: "llm", created: "6h ago" },
  { id: "evt-3010", title: "Father John Misty", artist: "Father John Misty", venue: "Gothic Theatre", date: "Jun 22", time: "8:00 PM", verified: false, confidence: 0.58, genres: ["folk"], price: null, source: "llm", created: "6h ago" },
  { id: "evt-3011", title: "Vampire Weekend", artist: "Vampire Weekend", venue: "Red Rocks", date: "Jul 11", time: "7:00 PM", verified: true, confidence: 0.90, genres: ["indie"], price: { low: 78, high: 165 }, source: "admin", created: "May 14" },
  { id: "evt-3012", title: "Hippo Campus", artist: "Hippo Campus", venue: "Summit", date: "Jun 29", time: "8:30 PM", verified: true, confidence: 0.86, genres: ["indie-pop"], price: { low: 39, high: 39 }, source: "structured", created: "3d ago" },
];

// Lifecycle axis (events schema enum: upcoming | postponed | cancelled). Distinct
// from the verified/unverified moderation axis. Default upcoming; two examples set.
ALL_EVENTS.forEach(e => { if (!e.lifecycle) e.lifecycle = "upcoming"; });
(ALL_EVENTS.find(e => e.id === "evt-3009") || {}).lifecycle = "postponed";
(ALL_EVENTS.find(e => e.id === "evt-3011") || {}).lifecycle = "cancelled";
// Sold-out is orthogonal to lifecycle (backed by an event_report, not events.status).
(ALL_EVENTS.find(e => e.id === "evt-3007") || {}).soldOut = true;

const EM_TOTAL = 248; // total in catalog (for "12 of 248" readout)

function emMissing(ev) {
  const out = [];
  if (!ev.price) out.push("no price");
  if (!ev.time) out.push("no time");
  if (!ev.genres || ev.genres.length === 0) out.push("no genre");
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Small cell pieces
// ─────────────────────────────────────────────────────────────────────
function EventStatusBadge({ verified }) {
  return verified
    ? <StatusBadge kind="success" dot>Verified</StatusBadge>
    : <StatusBadge kind="warning" dot>Unverified</StatusBadge>;
}

function GenreCell({ genres }) {
  if (!genres || genres.length === 0) {
    return <StatusBadge kind="danger" variant="outline" mono>no genre</StatusBadge>;
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {genres.map(g => <StatusBadge key={g} kind="neutral" mono>{g}</StatusBadge>)}
    </div>
  );
}

function MissingChips({ ev }) {
  const m = emMissing(ev).filter(x => x !== "no genre"); // genre shown in its own column
  if (m.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      {m.map(x => <StatusBadge key={x} kind="warning" variant="outline" mono>{x}</StatusBadge>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Filter bar
// ─────────────────────────────────────────────────────────────────────
function SearchInput({ value = "", placeholder = "Search events, artists, venues…", focused = false, width = 340 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      height: 38, padding: "0 13px", width, maxWidth: "100%",
      borderRadius: 9,
      background: "var(--bg-elevated)",
      border: `1.5px solid ${focused ? "var(--signal)" : "var(--border-strong)"}`,
      boxShadow: focused ? "0 0 0 3px color-mix(in oklab, var(--signal) 18%, transparent)" : "none",
      transition: "border-color .12s, box-shadow .12s",
    }}>
      <AdminIcon name="search" size={15} color={focused ? "var(--signal)" : "var(--fg-subtle)"} />
      <span style={{
        flex: 1, fontFamily: ADMIN_FONT, fontSize: 13.5,
        color: value ? "var(--fg)" : "var(--fg-subtle)", fontWeight: value ? 500 : 400,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value || placeholder}</span>
      {value
        ? <button style={{ all: "unset", cursor: "pointer", display: "flex", color: "var(--fg-subtle)", padding: 2 }}><AdminIcon name="x" size={13} /></button>
        : <Kbd>/</Kbd>}
    </div>
  );
}

// Verification axis filter (All / Verified / Unverified) — distinct from the
// Status (events.status) lifecycle axis. Named for the axis it owns.
function VerificationSegmented({ value = "all" }) {
  const opts = [
    { k: "all", label: "All" },
    { k: "verified", label: "Verified" },
    { k: "unverified", label: "Unverified" },
  ];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", padding: 3, gap: 2,
      background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 9, height: 36, boxSizing: "border-box",
    }}>
      {opts.map(o => {
        const active = o.k === value;
        return (
          <span key={o.k} style={{
            display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px", borderRadius: 6,
            fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: active ? 700 : 500,
            color: active ? "var(--fg)" : "var(--fg-muted)",
            background: active ? "var(--bg-elevated)" : "transparent",
            boxShadow: active ? "0 1px 2px rgba(0,0,0,0.10), 0 0 0 1px var(--border)" : "none",
          }}>{o.label}</span>
        );
      })}
    </div>
  );
}

// Dropdown-style filter field: mono label + value + chevron.
function FilterField({ label, value, active, open, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 9, height: 36, padding: "0 12px",
      borderRadius: 9,
      background: open ? "var(--surface-2)" : "var(--surface-1)",
      border: `1px solid ${active || open ? "var(--signal)" : "var(--border-strong)"}`,
      transition: "border-color .12s, background .12s",
    }}>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{label}</span>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: 600, color: danger ? "var(--warning)" : active ? "var(--signal)" : "var(--fg)" }}>{value}</span>
      <AdminIcon name="chevD" size={13} color="var(--fg-muted)" />
    </button>
  );
}

// A popover that drops under a FilterField. items: [{label, count?, checked?, type?}]
function FilterPopover({ title, items, multi, footer, width = 240, anchorRight = false }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 6px)", [anchorRight ? "right" : "left"]: 0,
      width, padding: 6, zIndex: 40,
      background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 11,
      boxShadow: "0 16px 40px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.16)",
    }}>
      {title && <div style={{ padding: "6px 8px 8px" }}><MonoLabel>{title}</MonoLabel></div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 7,
            background: it.checked && !multi ? "color-mix(in oklab, var(--signal) 12%, transparent)" : "transparent",
            cursor: "pointer",
          }}>
            {multi && (
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${it.checked ? "var(--signal)" : "var(--border-strong)"}`,
                background: it.checked ? "var(--signal)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{it.checked && <AdminIcon name="check" size={11} color="var(--fg-on-accent)" />}</span>
            )}
            <span style={{ flex: 1, fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: it.checked ? 600 : 500, color: "var(--fg)" }}>{it.label}</span>
            {typeof it.count === "number" && (
              <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums" }}>{it.count}</span>
            )}
            {it.checked && !multi && <AdminIcon name="check" size={14} color="var(--signal)" />}
          </div>
        ))}
      </div>
      {footer && <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>{footer}</div>}
    </div>
  );
}

function EventsFilterBar({ search = "", searchFocused = false, status = "all", lifecycle = "Any", venue = "All venues", date = "Next 30d", genre = "Any", missing = "None", sort = "Date ↓", shown = ALL_EVENTS.length, openFilter = null }) {
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 13,
      padding: 16, display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Row 1 — search + sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SearchInput value={search} focused={searchFocused} />
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <FilterField label="Sort" value={sort} open={openFilter === "sort"} />
          {openFilter === "sort" && (
            <FilterPopover title="Sort by" width={220} anchorRight items={[
              { label: "Date (soonest)", checked: true },
              { label: "Date (latest)" },
              { label: "Created (newest)" },
              { label: "Created (oldest)" },
              { label: "Confidence (lowest)" },
              { label: "Confidence (highest)" },
            ]} />
          )}
        </div>
      </div>
      {/* Row 2 — filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <VerificationSegmented value={status} />
        <span style={{ width: 1, height: 22, background: "var(--border)", margin: "0 2px" }} />
        <FilterField label="Status" value={lifecycle} active={lifecycle !== "Any"} />
        <div style={{ position: "relative" }}>
          <FilterField label="Venue" value={venue} active={venue !== "All venues"} open={openFilter === "venue"} />
          {openFilter === "venue" && (
            <FilterPopover title="Venue" items={[
              { label: "All venues", checked: true },
              { label: "Bluebird Theater", count: 18 },
              { label: "Mission Ballroom", count: 24 },
              { label: "Gothic Theatre", count: 21 },
              { label: "Ogden Theatre", count: 16 },
              { label: "Larimer Lounge", count: 12 },
              { label: "Cervantes' Masquerade Ball", count: 9 },
              { label: "Red Rocks", count: 31 },
            ]} />
          )}
        </div>
        <FilterField label="Date" value={date} active={date !== "All dates"} />
        <FilterField label="Genre" value={genre} active={genre !== "Any"} />
        <div style={{ position: "relative" }}>
          <FilterField label="Missing" value={missing} danger={missing !== "None"} open={openFilter === "missing"} />
          {openFilter === "missing" && (
            <FilterPopover title="Missing-data flags" multi width={210} items={[
              { label: "No price", count: 3, checked: true },
              { label: "No show time", count: 1, checked: false },
              { label: "No genre", count: 2, checked: true },
              { label: "No doors time", count: 7, checked: false },
            ]} footer={<>
              <AdminButton variant="ghost" size="sm" fullWidth>Clear</AdminButton>
              <AdminButton variant="primary" size="sm" fullWidth>Apply</AdminButton>
            </>} />
          )}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: "var(--fg)", fontWeight: 700 }}>{shown}</span> of {EM_TOTAL}
        </span>
        <AdminButton variant="ghost" size="sm" icon="x">Clear all</AdminButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Row overflow menu
// ─────────────────────────────────────────────────────────────────────
function EventMenuItem({ icon, children, onClick, destructive, helper }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 11px", borderRadius: 7,
      color: destructive ? "var(--danger)" : "var(--fg)", fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 500,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = destructive ? "color-mix(in oklab, var(--danger) 10%, transparent)" : "var(--surface-1)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
      <AdminIcon name={icon} size={15} color={destructive ? "var(--danger)" : "var(--fg-muted)"} />
      <span style={{ flex: 1 }}>{children}</span>
      {helper && <span style={{ fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "var(--fg-subtle)", textTransform: "uppercase" }}>{helper}</span>}
    </button>
  );
}

function EventRowMenu({ ev }) {
  const e = ev || {};
  const lc = e.lifecycle || "upcoming";
  return (
    <div style={{
      position: "absolute", right: 6, top: "100%", marginTop: 2, minWidth: 224, padding: 5, zIndex: 30,
      background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 11,
      boxShadow: "0 16px 40px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.16)",
    }}>
      <EventMenuItem icon="external">View detail</EventMenuItem>
      <EventMenuItem icon="edit">Edit…</EventMenuItem>
      <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />
      {e.verified
        ? <EventMenuItem icon="refresh">Send back to review</EventMenuItem>
        : <EventMenuItem icon="check" helper="approve">Verify</EventMenuItem>}
      {lc !== "postponed" && <EventMenuItem icon="pause">Mark postponed</EventMenuItem>}
      {lc !== "cancelled" && <EventMenuItem icon="x">Mark cancelled</EventMenuItem>}
      {lc !== "upcoming" && <EventMenuItem icon="play">Mark upcoming</EventMenuItem>}
      {e.soldOut
        ? <EventMenuItem icon="check">Mark available</EventMenuItem>
        : <EventMenuItem icon="alertTri">Mark sold out</EventMenuItem>}
      <EventMenuItem icon="flag">Mark non-concert</EventMenuItem>
      <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />
      <EventMenuItem icon="x" destructive>Delete…</EventMenuItem>
    </div>
  );
}

// Lifecycle pill (event schema: upcoming | postponed | cancelled).
function LifecycleBadge({ status = "upcoming" }) {
  const map = {
    upcoming:  { kind: "neutral", label: "Upcoming" },
    postponed: { kind: "warning", label: "Postponed" },
    cancelled: { kind: "danger",  label: "Cancelled" },
  };
  const m = map[status] || map.upcoming;
  return <StatusBadge kind={m.kind} mono dot={status !== "upcoming"}>{m.label}</StatusBadge>;
}

// Compact verified/unverified mark for the table Status cell's second line.
function VerifyMark({ verified }) {
  if (verified) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--success)", textTransform: "uppercase" }}>
      <AdminIcon name="check" size={12} color="var(--success)" />verified
    </span>
  );
  return <StatusBadge kind="warning" variant="outline" mono>unverified</StatusBadge>;
}

// ─────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────
function EmCheckbox({ checked, indeterminate }) {
  return (
    <span style={{
      width: 17, height: 17, borderRadius: 4, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${checked || indeterminate ? "var(--signal)" : "var(--border-strong)"}`,
      background: checked || indeterminate ? "var(--signal)" : "var(--bg-elevated)",
    }}>
      {checked && <AdminIcon name="check" size={12} color="var(--fg-on-accent)" />}
      {indeterminate && !checked && <span style={{ width: 8, height: 2, borderRadius: 1, background: "var(--fg-on-accent)" }} />}
    </span>
  );
}

function EventsTable({ rows = ALL_EVENTS, selected = new Set(), openMenuId = null }) {
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someChecked = rows.some(r => selected.has(r.id));
  return (
    <Panel padding={0} style={{ overflow: "visible" }}>
      <AdminTable style={{ border: "none", borderRadius: 13, overflow: "visible" }}>
        <THead>
          <tr>
            <TH width={44} style={{ paddingLeft: 16 }}><EmCheckbox checked={allChecked} indeterminate={someChecked && !allChecked} /></TH>
            <TH>Event</TH>
            <TH>Venue / date</TH>
            <TH>Status</TH>
            <TH>Genre</TH>
            <TH width={132}>Confidence</TH>
            <TH align="right">Created</TH>
            <TH width={44}></TH>
          </tr>
        </THead>
        <tbody>
          {rows.map(r => {
            const sel = selected.has(r.id);
            return (
              <tr key={r.id} style={{
                background: sel ? "color-mix(in oklab, var(--signal) 8%, transparent)" : "transparent",
              }}>
                <td style={{ padding: "13px 14px 13px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                  <EmCheckbox checked={sel} />
                </td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 13.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.005em" }}>{r.title}</div>
                  {r.artist && r.artist !== r.title && r.artist !== "—" && (
                    <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{r.artist}</div>
                  )}
                  <MissingChips ev={r} />
                </td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)" }}>{r.venue}</div>
                  <div style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: r.time ? "var(--fg-subtle)" : "var(--warning)", marginTop: 2 }}>
                    {r.date}{r.time ? ` · ${r.time}` : " · no time"}
                  </div>
                </td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <LifecycleBadge status={r.lifecycle} />
                    {r.soldOut && <StatusBadge kind="accent" mono>sold out</StatusBadge>}
                  </div>
                  <div style={{ marginTop: 6 }}><VerifyMark verified={r.verified} /></div>
                </td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}><GenreCell genres={r.genres} /></td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}><ConfidenceBarV2 value={r.confidence} /></td>
                <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "top", textAlign: "right" }}>
                  <RelTime value={r.created} />
                </td>
                <td style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid var(--border)", verticalAlign: "top", position: "relative" }}>
                  <button style={{
                    all: "unset", cursor: "pointer", padding: 7, borderRadius: 7, display: "flex",
                    color: openMenuId === r.id ? "var(--fg)" : "var(--fg-muted)",
                    background: openMenuId === r.id ? "var(--surface-2)" : "transparent",
                  }}><AdminIcon name="more" size={16} /></button>
                  {openMenuId === r.id && <EventRowMenu ev={r} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bulk action dock (floating, elevated — theme-aware, not --ink)
// ─────────────────────────────────────────────────────────────────────
function BulkDock({ count = 3 }) {
  return (
    <div style={{
      position: "sticky", bottom: 20, alignSelf: "center", marginInline: "auto", zIndex: 50,
      display: "flex", alignItems: "center", gap: 10, padding: "9px 10px 9px 16px",
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 13,
      boxShadow: "0 18px 48px rgba(0,0,0,0.34), 0 3px 10px rgba(0,0,0,0.18)",
    }}>
      <span style={{
        minWidth: 24, height: 24, padding: "0 8px", borderRadius: 12, background: "var(--signal)", color: "var(--fg-on-accent)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
      }}>{count}</span>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>selected</span>
      <span style={{ width: 1, height: 20, background: "var(--border)" }} />
      <AdminButton variant="ghost" size="sm" icon="flag">Mark non-concert</AdminButton>
      <AdminButton variant="ghost" size="sm" icon="refresh">Send back to review</AdminButton>
      <AdminButton variant="danger" size="sm" icon="x">Delete {count}</AdminButton>
      <button title="Clear selection" style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-subtle)", display: "flex" }}>
        <AdminIcon name="x" size={15} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────────
function ModalScrim({ children }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100, background: "var(--scrim, rgba(0,0,0,0.5))",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>{children}</div>
  );
}

// Single-event delete — simple confirm (no typed gate; a single event is reversible enough).
function DeleteEventConfirm({ ev }) {
  const e = ev || ALL_EVENTS[0];
  return (
    <ModalScrim>
      <div style={{
        width: 460, maxWidth: "100%", background: "var(--bg-elevated)",
        border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)", borderTop: "3px solid var(--danger)",
        borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        <div style={{ padding: "22px 24px 14px" }}>
          <MonoLabel color="var(--danger)">destructive action</MonoLabel>
          <h3 style={{ margin: "9px 0 0", fontFamily: ADMIN_FONT, fontSize: 21, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Delete this event?</h3>
          <div style={{
            marginTop: 12, padding: "11px 13px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 9,
          }}>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{e.title}</div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{e.venue} · {e.date}{e.time ? ` · ${e.time}` : ""}</div>
          </div>
          <div style={{ marginTop: 12, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            It'll be removed from the catalog and the consumer app immediately. Fan-submitted prices on it are dropped too. <span style={{ color: "var(--fg)" }}>This is recorded in the audit log.</span>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", background: "var(--surface-1)" }}>
          <AdminButton variant="ghost">Cancel</AdminButton>
          <AdminButton variant="danger" icon="x">Delete event</AdminButton>
        </div>
      </div>
    </ModalScrim>
  );
}

// Bulk delete — typed-DELETE gate (mirrors DeleteVenueConfirm). phase: "type" | "armed".
function BulkDeleteConfirm({ count = 4, items = ALL_EVENTS, phase = "type" }) {
  const preview = items.slice(0, 4);
  const armed = phase === "armed";
  return (
    <ModalScrim>
      <div style={{
        width: 520, maxWidth: "100%", background: "var(--bg-elevated)",
        border: "1px solid color-mix(in oklab, var(--danger) 32%, transparent)", borderTop: "3px solid var(--danger)",
        borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "22px 24px 14px" }}>
          <MonoLabel color="var(--danger)">destructive action · bulk</MonoLabel>
          <h3 style={{ margin: "9px 0 0", fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>Delete {count} events?</h3>
          <div style={{ marginTop: 10, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            This <strong style={{ color: "var(--danger)", fontWeight: 700 }}>can't be undone</strong>. All {count} are removed from the catalog and the consumer app at once, along with any fan-submitted prices on them. Every deletion is recorded in the audit log.
          </div>
        </div>
        <div style={{ padding: "0 24px 14px" }}>
          <MonoLabel>about to delete</MonoLabel>
          <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden", background: "var(--surface-1)" }}>
            {preview.map(ev => (
              <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{ev.venue} · {ev.date}</div>
                </div>
                <EventStatusBadge verified={ev.verified} />
              </div>
            ))}
            {count > preview.length && (
              <div style={{ padding: "8px 12px", fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", fontStyle: "italic" }}>…and {count - preview.length} more.</div>
            )}
          </div>
        </div>
        <div style={{ padding: "0 24px 18px" }}>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
            Type <strong style={{ color: "var(--danger)", fontFamily: ADMIN_MONO, letterSpacing: "0.06em" }}>DELETE</strong> to confirm.
          </div>
          <div style={{ background: "var(--surface-1)", border: armed ? "1.5px solid var(--danger)" : "1px solid var(--border-strong)", borderRadius: 10, padding: "0 14px" }}>
            <div style={{ padding: "12px 0", fontFamily: ADMIN_MONO, fontSize: 16, fontWeight: 700, color: armed ? "var(--fg)" : "var(--fg-subtle)", letterSpacing: "0.08em" }}>
              {armed ? "DELETE" : "DELETE"}
              {!armed && <span style={{ animation: "emBlink 1s steps(1) infinite" }}>|</span>}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", background: "var(--surface-1)" }}>
          <AdminButton variant="ghost">Keep events</AdminButton>
          <button disabled={!armed} style={{
            all: "unset", boxSizing: "border-box", cursor: armed ? "pointer" : "not-allowed",
            display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 16px", borderRadius: 8,
            border: `1px solid ${armed ? "var(--danger)" : "var(--border-strong)"}`,
            background: armed ? "var(--danger)" : "var(--surface-2)",
            color: armed ? "var(--fg-on-accent)" : "var(--fg-subtle)",
            fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700,
          }}>
            <AdminIcon name="x" size={14} />{armed ? `Delete ${count} forever` : "Type DELETE to enable"}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}

// Mark non-concert — lighter confirm (sets tag + unpublishes; not a delete).
function MarkNonConcertConfirm({ ev }) {
  const e = ev || ALL_EVENTS[1];
  return (
    <ModalScrim>
      <div style={{
        width: 460, maxWidth: "100%", background: "var(--bg-elevated)",
        border: "1px solid var(--border)", borderTop: "3px solid var(--warning)",
        borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        <div style={{ padding: "22px 24px 14px" }}>
          <MonoLabel color="var(--warning)">moderation</MonoLabel>
          <h3 style={{ margin: "9px 0 0", fontFamily: ADMIN_FONT, fontSize: 21, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Mark as non-concert?</h3>
          <div style={{ marginTop: 12, padding: "11px 13px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 9 }}>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{e.title}</div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{e.venue} · {e.date}{e.time ? ` · ${e.time}` : ""}</div>
          </div>
          <div style={{ marginTop: 12, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            This adds the <StatusBadge kind="neutral" mono>non-concert</StatusBadge> tag and <span style={{ color: "var(--fg)", fontWeight: 600 }}>unpublishes it from the consumer app</span>. The record stays in the system — you can re-publish or delete it later. Nothing is deleted.
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", background: "var(--surface-1)" }}>
          <AdminButton variant="ghost">Cancel</AdminButton>
          <AdminButton variant="primary" icon="flag">Mark &amp; unpublish</AdminButton>
        </div>
      </div>
    </ModalScrim>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Empty + loading
// ─────────────────────────────────────────────────────────────────────
function EventsEmptyState() {
  return (
    <Panel padding={0}>
      <div style={{ padding: "72px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, marginBottom: 14,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)",
        }}><AdminIcon name="search" size={22} /></div>
        <MonoLabel>0 results</MonoLabel>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 4 }}>Crickets.</div>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.55, maxWidth: 360, marginTop: 4 }}>
          Nothing matches those filters. Loosen them up or clear everything to see the whole catalog.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <AdminButton variant="ghost" icon="x">Clear all filters</AdminButton>
          <AdminButton variant="outline" icon="search">Edit search</AdminButton>
        </div>
      </div>
    </Panel>
  );
}

function SkelBlock({ w, h = 12, r = 6 }) {
  return <span style={{ display: "inline-block", width: w, height: h, borderRadius: r, background: "var(--surface-2)", animation: "emPulse 1.4s ease-in-out infinite" }} />;
}

function EventsLoading() {
  return (
    <Panel padding={0}>
      <AdminTable style={{ border: "none", borderRadius: 13 }}>
        <THead>
          <tr>
            <TH width={44} style={{ paddingLeft: 16 }}><EmCheckbox /></TH>
            <TH>Event</TH><TH>Venue / date</TH><TH>Status</TH><TH>Genre</TH><TH width={132}>Confidence</TH><TH align="right">Created</TH><TH width={44}></TH>
          </tr>
        </THead>
        <tbody>
          {Array.from({ length: 7 }).map((_, i) => (
            <tr key={i}>
              <td style={{ padding: "15px 14px 15px 16px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={17} h={17} r={4} /></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={130 + (i % 3) * 30} /><div style={{ marginTop: 6 }}><SkelBlock w={80} h={10} /></div></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={96} /><div style={{ marginTop: 6 }}><SkelBlock w={64} h={10} /></div></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={74} h={18} r={9} /></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={56} h={18} r={9} /></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={104} /></td>
              <td style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)", textAlign: "right" }}><SkelBlock w={52} /></td>
              <td style={{ padding: "15px 12px", borderBottom: "1px solid var(--border)" }}><SkelBlock w={16} h={16} r={4} /></td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Review tabs + page
// ─────────────────────────────────────────────────────────────────────
// Three-tab segmented control — same pill used on desktop + mobile (Option B).
// flags | prices | all events. Matches the live mobile Review tab pill.
function ReviewTabs({ active = "all", flagsCount = 0, pricesCount = 61, missingCount = 0, fullWidth = false, compact = false }) {
  const tabs = [
    { k: "flags",   label: compact ? "Flags" : "Event flags", count: flagsCount,   kind: "warning" },
    { k: "prices",  label: "Prices",                          count: pricesCount,  kind: "signal" },
    { k: "missing", label: "Missing",                         count: missingCount, kind: "danger" },
    { k: "all",     label: compact ? "All" : "All events",    count: null },
  ];
  const px = compact ? 8 : 16, fs = compact ? 12 : 13.5;
  return (
    <div style={{
      display: fullWidth ? "flex" : "inline-flex", gap: compact ? 3 : 6, padding: 4, width: fullWidth ? "100%" : "auto",
      background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 11,
    }}>
      {tabs.map(t => {
        const a = t.k === active;
        return (
          <div key={t.k} style={{
            flex: fullWidth ? 1 : "0 0 auto", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: `9px ${px}px`, borderRadius: 8,
            background: a ? "var(--bg-elevated)" : "transparent",
            boxShadow: a ? "0 1px 2px rgba(0,0,0,0.18), 0 0 0 1px var(--border)" : "none",
          }}>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: fs, fontWeight: a ? 700 : 600, color: a ? "var(--fg)" : "var(--fg-muted)" }}>{t.label}</span>
            {t.count != null && t.count > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 6px", borderRadius: 9,
                fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: a ? `var(--${t.kind})` : "var(--surface-2)", color: a ? "var(--fg-on-accent)" : "var(--fg-muted)",
              }}>{t.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The "All events" tab body (filter bar + table). Optional dock/states injected by canvas.
function AllEventsContent(props = {}) {
  const { rows = ALL_EVENTS, selected, openMenuId, openFilter, filterState = {}, body } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <EventsFilterBar {...filterState} openFilter={openFilter} shown={rows.length} />
      {body || <EventsTable rows={rows} selected={selected || new Set()} openMenuId={openMenuId} />}
    </div>
  );
}

// Full Review page, restructured into tabs (Option B). active: "flags" | "prices" | "all".
// flags  → real EventFlagsSection (unchanged content, now in a tab)
// prices → real PendingSubmissionsPanel + PriceCoverageTable (unchanged, now in a tab)
// all    → the new Event Management surface
function ReviewEventsPage(props = {}) {
  const { active = "all", flagsEmpty = false, ...rest } = props;
  const flagItems = flagsEmpty ? [] : (window.FLAGGED_EVENTS || []);
  const missingCount = (window.MISSING_EVENTS || []).length;
  let body;
  if (active === "flags") {
    body = <EventFlagsSection items={flagItems} selectedId={(flagItems[0] || {}).id} />;
  } else if (active === "prices") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <PendingSubmissionsPanel />
        <PriceCoverageTable />
      </div>
    );
  } else if (active === "missing") {
    body = <MissingSection />;
  } else {
    body = <AllEventsContent {...rest} />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Operations · moderation"
        title={<span>Review <StatusBadge kind="warning" mono style={{ marginLeft: 12, verticalAlign: "middle" }}>14 pending</StatusBadge></span>}
        subtitle="Most events auto-approve. Flags, price submissions, and crawl-misses land here for triage — and All events searches the whole catalog."
        actions={<AdminButton variant="outline" size="sm" icon="external">Approval history</AdminButton>}
      />
      <ReviewTabs active={active} flagsCount={flagItems.length} pricesCount={61} missingCount={missingCount} />
      {body}
    </div>
  );
}

if (typeof document !== "undefined" && !document.getElementById("em-anim")) {
  const s = document.createElement("style");
  s.id = "em-anim";
  s.textContent = "@keyframes emPulse{0%,100%{opacity:.55}50%{opacity:1}}@keyframes emBlink{0%,100%{opacity:1}50%{opacity:0}}";
  document.head.appendChild(s);
}

Object.assign(window, {
  ALL_EVENTS, EM_TOTAL, emMissing,
  EventStatusBadge, GenreCell, MissingChips, LifecycleBadge, VerifyMark,
  SearchInput, VerificationSegmented, FilterField, FilterPopover, EventsFilterBar,
  EventRowMenu, EventMenuItem, EmCheckbox, EventsTable, BulkDock,
  DeleteEventConfirm, BulkDeleteConfirm, MarkNonConcertConfirm,
  EventsEmptyState, EventsLoading, SkelBlock,
  ReviewTabs, AllEventsContent, ReviewEventsPage,
});
