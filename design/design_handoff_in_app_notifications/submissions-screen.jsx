// submissions-screen.jsx — "Submitted prices" as a real mobile surface
//
// Folded into #737 because the `me` menu is being built anyway and this row
// currently dead-ends into Settings with no screen of its own. Vocabulary and
// card chrome follow Phase 8 / 8.5: floor–ceiling range, tier, vendor,
// corroboration count, and the neutral "update" framing for disputes.
//
// Three statuses, all blameless:
//   live      corroborated and showing on the event page
//   pending   waiting on corroboration (needs 2)
//   updated   someone logged a different number and it was corroborated —
//             yours is archived, not deleted, no penalty (Phase 8.5 lock)
//
// This is also where a `contest_resolved` notification deep-links to.

const SUB_STATUS = {
  live:    { label: "Live",    ink: "var(--success)" },
  pending: { label: "Pending", ink: "var(--signal)" },
  updated: { label: "Updated", ink: "var(--fg-muted)" },
};

const SUBMISSIONS = [
  { id: "p1", status: "live", artist: "Chat Pile", venue: "Gothic Theatre", date: "Thu Oct 23",
    floor: 52, ceiling: null, tier: "GA", vendor: "AXS", when: "yesterday",
    note: "Two fans backed it." },
  { id: "p2", status: "pending", artist: "Ekko Astral", venue: "Hi-Dive", date: "Wed Sep 3",
    floor: 18, ceiling: 24, tier: "GA", vendor: "Venue box office", when: "5h",
    note: "Needs one more confirm." },
  { id: "p3", status: "live", artist: "Turnstile", venue: "Mission Ballroom", date: "Fri Nov 7",
    floor: 45, ceiling: 62, tier: "GA", vendor: "Ticketmaster", when: "4d",
    note: "Someone logged $48. Didn't get corroborated — yours stays live." },
  { id: "p4", status: "updated", artist: "Hurray for the Riff Raff", venue: "Gothic Theatre",
    date: "Sat Aug 30", floor: 38, ceiling: null, tier: "GA", vendor: "AXS", when: "Jul 19",
    note: "Kel saw $32 and two fans backed it. Yours is archived, not gone." },
];

const SUBS_COPY = {
  title: "Submitted prices",
  sub: (n) => `${n} live`,
  empty: "Nothing logged yet.",
  emptyBody: "See a real price at the door or on a listing? Log it and the rest of the crawl gets it too.",
  emptyAction: "Submit a price",
};

function SubStatusPill({ status }) {
  const s = SUB_STATUS[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px",
      borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-1)",
      flexShrink: 0 }}>
      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 5, background: s.ink }}/>
      <window.NMono ls="0.10em">{s.label}</window.NMono>
    </span>
  );
}

function SubmissionCard({ s }) {
  const range = s.ceiling ? `$${s.floor}–$${s.ceiling}` : `$${s.floor}`;
  return (
    <div role="button" tabIndex={0} className="notif-row" style={{
      display: "flex", flexDirection: "column", gap: 8, padding: "13px 14px",
      borderBottom: "1px solid var(--border)", cursor: "pointer", minHeight: 64 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "Inter, system-ui", fontSize: 20, fontWeight: 800,
          color: s.status === "updated" ? "var(--fg-muted)" : "var(--fg)",
          letterSpacing: "-0.02em", flexShrink: 0 }}>{range}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontSize: 13.5,
          fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</span>
        <SubStatusPill status={s.status}/>
      </div>
      <window.NMono ls="0.10em">{s.venue} · {s.date} · {s.tier} · {s.vendor}</window.NMono>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ flex: 1, fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.42,
          color: "var(--fg-muted)", textWrap: "pretty" }}>{s.note}</span>
        <window.NMono ls="0.10em" style={{ flexShrink: 0 }}>{s.when}</window.NMono>
      </div>
    </div>
  );
}

// Full mobile screen — sits between the `me` menu and Settings.
function SubmissionsScreen({ items = SUBMISSIONS }) {
  const live = items.filter((s) => s.status === "live").length;
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 14px 12px" }}>
        <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, display: "flex",
          alignItems: "center", justifyContent: "center", border: "1px solid var(--border)",
          color: "var(--fg-muted)", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 16, fontWeight: 800,
            color: "var(--fg)", letterSpacing: "-0.02em" }}>{SUBS_COPY.title}</span>
          <window.NMono color="var(--success)">{SUBS_COPY.sub(live)}</window.NMono>
        </div>
      </div>
      <div className="notif-scroll" style={{ flex: 1, minHeight: 0,
        background: "var(--bg-elevated)", borderTop: "1px solid var(--border)" }}>
        {items.length === 0 ? (
          <div style={{ padding: "42px 26px", textAlign: "center", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 17, fontWeight: 800,
              color: "var(--fg)", letterSpacing: "-0.02em" }}>{SUBS_COPY.empty}</div>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, lineHeight: 1.5,
              color: "var(--fg-muted)", maxWidth: 262, textWrap: "pretty" }}>{SUBS_COPY.emptyBody}</div>
          </div>
        ) : items.map((s) => <SubmissionCard key={s.id} s={s}/>)}
      </div>
    </div>
  );
}

Object.assign(window, { SubmissionsScreen, SubmissionCard, SubStatusPill, SUBMISSIONS, SUBS_COPY, SUB_STATUS });
