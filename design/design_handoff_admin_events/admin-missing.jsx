// admin-missing.jsx — "Missing from crawl" surface (4th Review tab).
//
// New capability: the crawler stamps last_seen_at on every row it finds in a venue's
// daily sweep. When a row it EXPECTED is absent for N sweeps, it's flagged here —
// the venue likely pulled the event (cancellation / postponement / silent change),
// or it's a false-positive crawl miss. Admin triages: Mark postponed · Mark cancelled · Dismiss.
//
// Reuses admin primitives + LifecycleBadge from admin-events-mgmt.jsx. Tokens var(--*).

const MISSING_EVENTS = [
  { id: "evt-2790", title: "Lord Huron", artist: "Lord Huron", venue: "Mission Ballroom", date: "Jun 19", time: "8:00 PM", lastSeen: "Jun 12", missed: 4, cadence: "daily", note: "Was on Mission's calendar for 6 weeks, then vanished between sweeps." },
  { id: "evt-2774", title: "The Beths", artist: "The Beths", venue: "Bluebird Theater", date: "Jun 21", time: "8:30 PM", lastSeen: "Jun 13", missed: 3, cadence: "daily", note: "Dropped from the Bluebird events page; ticket link now 404s." },
  { id: "evt-2769", title: "Drug Church + Anxious", artist: "Drug Church", venue: "Larimer Lounge", date: "Jun 18", time: "7:30 PM", lastSeen: "Jun 14", missed: 2, cadence: "daily", note: "Still listed on AXS but gone from the venue page — possible reschedule." },
  { id: "evt-2741", title: "Snail Mail", artist: "Snail Mail", venue: "Gothic Theatre", date: "Jul 03", time: "8:00 PM", lastSeen: "Jun 11", missed: 5, cadence: "daily", note: "Five clean sweeps with no sign of it. Likely cancelled." },
];

// Context chips for a missing row.
function MissedChips({ ev }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <StatusBadge kind={ev.missed >= 4 ? "danger" : "warning"} variant="outline" mono>missed {ev.missed} sweeps</StatusBadge>
      <StatusBadge kind="neutral" mono>expected {ev.cadence}</StatusBadge>
    </div>
  );
}

function MissingActions({ size = "sm", stacked = false }) {
  return (
    <div style={{ display: "flex", gap: 6, flexDirection: stacked ? "column" : "row", width: stacked ? "100%" : "auto" }}>
      <AdminButton variant="outline" size={size} icon="pause" fullWidth={stacked}>Postponed</AdminButton>
      <AdminButton variant="outline" size={size} icon="x" fullWidth={stacked}>Cancelled</AdminButton>
      <AdminButton variant="ghost" size={size} icon="check" fullWidth={stacked}>Dismiss</AdminButton>
    </div>
  );
}

// Desktop row.
function MissingRow({ ev }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 18, alignItems: "center",
      padding: "16px 18px", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.005em" }}>{ev.title}</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>{ev.venue}</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>{ev.date} {ev.time}</span>
        </div>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5, marginBottom: 8, maxWidth: 560 }}>{ev.note}</div>
        <MissedChips ev={ev} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: ADMIN_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>last seen</div>
        <div style={{ fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 700, color: "var(--warning)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{ev.lastSeen}</div>
      </div>
      <MissingActions />
    </div>
  );
}

function MissingSection({ items = MISSING_EVENTS }) {
  if (items.length === 0) {
    return (
      <Panel title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Missing from crawl</span>
        <StatusBadge kind="success" mono>all accounted for</StatusBadge>
      </>} padding={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: "color-mix(in oklab, var(--success) 14%, transparent)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}><AdminIcon name="check" size={18} /></div>
          <div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Nothing's gone missing.</div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Every event the crawler expected showed up in the last sweep.</div>
          </div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel
      title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Missing from crawl</span>
        <StatusBadge kind="danger" mono>{items.length} flagged</StatusBadge>
      </>}
      action={<AdminButton variant="ghost" size="sm" icon="filter">Sort · most missed</AdminButton>}
      padding={0}
    >
      <div style={{
        padding: "11px 18px", borderBottom: "1px solid var(--border)",
        background: "color-mix(in oklab, var(--warning) 7%, transparent)",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <AdminIcon name="alertTri" size={15} color="var(--warning)" />
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg)", lineHeight: 1.5 }}>
          The crawler expected these in a venue's daily sweep but didn't find them. Usually a cancellation, postponement, or silent lineup change — sometimes just a crawl miss. They stay <strong>Upcoming</strong> until you act.
        </span>
      </div>
      {items.map(ev => <MissingRow key={ev.id} ev={ev} />)}
    </Panel>
  );
}

// Mobile card.
function MissingMobileCard({ ev }) {
  return (
    <div style={{ padding: 14, borderRadius: 13, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 14.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>{ev.title}</div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>last seen</div>
          <div style={{ fontFamily: ADMIN_MONO, fontSize: 12.5, fontWeight: 700, color: "var(--warning)", marginTop: 2 }}>{ev.lastSeen}</div>
        </div>
      </div>
      <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 3 }}>{ev.venue} · {ev.date}</div>
      <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5, margin: "8px 0" }}>{ev.note}</div>
      <div style={{ marginBottom: 12 }}><MissedChips ev={ev} /></div>
      <MissingActions stacked />
    </div>
  );
}

function MissingMobile({ items = MISSING_EVENTS }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        padding: "11px 13px", borderRadius: 11,
        background: "color-mix(in oklab, var(--warning) 8%, transparent)",
        border: "1px solid color-mix(in oklab, var(--warning) 28%, transparent)",
        display: "flex", gap: 9, alignItems: "flex-start",
      }}>
        <AdminIcon name="alertTri" size={14} color="var(--warning)" />
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg)", lineHeight: 1.5 }}>
          Expected in a daily sweep but not found. They stay <strong>Upcoming</strong> until you act.
        </span>
      </div>
      {items.map(ev => <MissingMobileCard key={ev.id} ev={ev} />)}
    </div>
  );
}

Object.assign(window, {
  MISSING_EVENTS, MissedChips, MissingActions, MissingRow, MissingSection, MissingMobileCard, MissingMobile,
});
