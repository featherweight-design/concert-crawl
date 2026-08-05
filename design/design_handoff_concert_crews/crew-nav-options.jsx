// crew-nav-options.jsx — B1: where Crews lives in the nav.
//
// ── Why R1's answer doesn't survive ───────────────────────────────────
// R1 drew a four-slot bar — browse · search · watching · me — and proposed a
// fifth tab. Production ships something else:
//
//   1  browse    /events
//   2  venues    /venues
//   3  my shows  /watching (+ /history)
//   4  account   (menu trigger, not a destination)
//
// Three corrections, all load-bearing:
//   · there is NO search tab — R1 invented one and then "kept" it;
//   · venues EXISTS and R1 silently dropped it;
//   · slot 3 is labelled "my shows", not "watching" — locked vocabulary from
//     #70, chosen to avoid a Watching > Watching > History nesting. Renaming it
//     is not available.
//
// Hugh approved "Crews as a fifth tab" against R1's picture. The slots he was
// told were free aren't, so that approval doesn't transfer and this is a fresh
// decision. Options below are drawn against the real bar at 320.
//
// Exports: NAV_SHIPPED, NavBarSpec, NavOptionA, NavOptionB, NavOptionC,
//          NavCompare, MyShowsWithCrews

const NAV_UI = "Inter, system-ui, sans-serif";
const NAV_MONO = "'JetBrains Mono', ui-monospace, monospace";

// ── The bar — LIFTED from CCTabBar ───────────────────────────────────
// design_handoff_in_app_notifications/notifications-chrome.jsx:83–116 (#737).
// R2 first hand-drew this twice, which was indefensible: that file was open the
// same round to lift ProfileSegments for CrewTabs. Geometry, icon spec and
// button semantics are the shipped ones now —
//   bar     height 52 · space-around · align center · paddingBottom 2
//   icons   18px · strokeWidth 1.5 · currentColor (inherited from the button)
//   labels  9px mono · 0.04em · weight 700 active / 500 inactive
//   slot    real <button> · minWidth 56 · minHeight 44 · aria-label + aria-current
//
// Two deliberate departures, both narrow:
//  1. LABELS come from NAV_SHIPPED. CCTabBar still says `browse · search ·
//     watching · me` and browse-home's TabBarCC says `… saved …` — both stale,
//     and "saved" is forbidden vocabulary. The geometry is current; the labels
//     are not.
//  2. "my shows" uses an EYE. CCTabBar's slot-3 glyph is a heart, which brief §7
//     locks against ("its icon is an eye, never a heart"). Flagged as a stale
//     glyph in a shipped component rather than silently matched.
// venues + crews are new glyphs at the same 18 / 1.5 / currentColor spec.
const NAV_ICONS = {
  browse: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  venues: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.5 15.5V7.4L9 3l6.5 4.4v8.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 15.5v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  shows:  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4.2c3.6 0 6.3 2.9 7.2 4.8-.9 1.9-3.6 4.8-7.2 4.8S2.7 10.9 1.8 9C2.7 7.1 5.4 4.2 9 4.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  crews:  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.8" y="1.8" width="14.4" height="14.4" rx="4.6" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="9" r="4.2" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/></svg>,
  me:     <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};
function NavIcon({ kind }) { return NAV_ICONS[kind] || null; }

function NavBar({ tabs, active, width, badge }) {
  const list = tabs || NAV_SHIPPED;
  return (
    <div style={{
      width, height: 52, borderTop: "1px solid var(--border)", display: "flex",
      alignItems: "center", justifyContent: "space-around",
      background: "var(--bg-elevated)", flexShrink: 0, paddingBottom: 2,
    }}>
      {list.map(t => {
        const on = t.key === active;
        return (
          <button type="button" key={t.key}
            aria-label={t.label} aria-current={on ? "page" : undefined}
            style={{
              all: "unset", cursor: "pointer", position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              minWidth: 56, minHeight: 44, justifyContent: "center",
              color: on ? "var(--signal)" : "var(--fg-subtle)",
            }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              {NAV_ICONS[t.key]}
              {badge === t.key && <span style={{ position: "absolute", top: -2, right: -4, width: 7, height: 7, borderRadius: 7, background: "var(--signal)", border: "1.5px solid var(--bg-elevated)" }}/>}
            </span>
            <span style={{
              fontFamily: NAV_MONO, fontSize: 9, fontWeight: on ? 700 : 500,
              letterSpacing: "0.04em", whiteSpace: "nowrap",
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// The bar as production ships it. Slot 4 is a menu TRIGGER, not a destination —
// which matters, because it means the bar really has three destinations and one
// affordance, not four peers.
const NAV_SHIPPED = [
  { key: "browse", label: "browse",   href: "/events" },
  { key: "venues", label: "venues",   href: "/venues" },
  { key: "shows",  label: "my shows", href: "/watching" },
  { key: "me",     label: "me",       href: null, trigger: true },
];

// (NavBar is defined above, lifted from CCTabBar.)

// ── Option A — a genuine fifth tab ────────────────────────────────────
// Costs: 320 / 5 = 64px per slot. "my shows" is 8 characters plus a space and
// is the label that decides whether this survives; measured in the canvas.
const NAV_A = [
  NAV_SHIPPED[0], NAV_SHIPPED[1], NAV_SHIPPED[2],
  { key: "crews", label: "crews", href: "/crews" },
  NAV_SHIPPED[3],
];

// ── THE RULING (Aug 4, 2026) ──────────────────────────────────────────
// Option A. Crews ships as a fifth tab. It fits at 320 on shipped geometry
// (280px of slots in a 320px bar, 40px slack, zero clipping), and since it fits
// it gets its own slot rather than being nested two levels down.
//
// NAV_PRODUCT is what every product artboard renders. NAV_SHIPPED stays as the
// "shipped today" reference for the §1 comparison board only — one source each,
// so a product screen can't drift from the spec board again.
//
// #1460 (consolidate Browse + Venues into one discovery destination) would free
// a slot and make this bar roomier. Crews does not wait on it, and if it lands
// the fifth tab simply becomes a fourth — nothing in this design changes.
const NAV_PRODUCT = NAV_A;
function NavOptionA({ width = 320, active = "crews" }) {
  return <NavBar tabs={NAV_A} active={active} width={width}/>;
}

// ── Option B — Crews inside "my shows" ────────────────────────────────
// The bar is untouched. /crews becomes a third segment beside Watching and
// Concerts, using the SHIPPED ProfileSegments pill grammar the crew home
// already adopted — so the pattern is already in the design.
function MyShowsWithCrews({ width = 320, active = "crews" }) {
  const segs = [["watching", "Watching", 12], ["concerts", "Concerts", 34], ["crews", "Crews", 5]];
  return (
    <div style={{ width, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{ padding: "12px 14px 6px" }}>
        <span style={{ fontFamily: NAV_UI, fontWeight: 900, fontSize: 24, letterSpacing: "-0.035em", color: "var(--fg)" }}>My shows</span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "4px 14px 12px", overflowX: "auto" }}>
        {segs.map(([k, label, n]) => {
          const on = k === active;
          return (
            <span key={k} style={{
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
              padding: "7px 9px", borderRadius: 8, minHeight: 34, boxSizing: "border-box",
              background: on ? "var(--surface-2)" : "transparent",
              border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
              fontFamily: NAV_UI, fontSize: 12.5, fontWeight: 700,
              color: on ? "var(--fg)" : "var(--fg-muted)", whiteSpace: "nowrap",
            }}>
              {label}
              <span style={{ fontFamily: NAV_MONO, fontWeight: 700, fontSize: 10, color: on ? "var(--signal)" : "var(--fg-subtle)" }}>{n}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
function NavOptionB({ width = 320 }) {
  return <NavBar tabs={NAV_SHIPPED} active="shows" width={width}/>;
}

// ── Option C — Crews replaces venues in the bar ───────────────────────
// Shown for completeness and NOT recommended: venues is a shipped destination
// with its own crawl and its own SEO surface. Trading a shipped destination for
// a launch feature is a product bet, not a nav tidy.
const NAV_C = [NAV_SHIPPED[0], { key: "crews", label: "crews", href: "/crews" }, NAV_SHIPPED[2], NAV_SHIPPED[3]];
function NavOptionC({ width = 320 }) {
  return <NavBar tabs={NAV_C} active="crews" width={width}/>;
}

// The segment row as it appears in the product (Option B) — "my shows" owns
// Watching · Concerts · Crews. Same ProfileSegments grammar as the crew tabs.
function MyShowsSegments({ narrow, active = "crews" }) {
  const segs = [["watching", "Watching", 12], ["concerts", "Concerts", 34], ["crews", "Crews", 5]];
  return (
    <div role="tablist" aria-label="My shows sections" style={{ display: "flex", gap: narrow ? 4 : 6, overflowX: "auto", scrollbarWidth: "none" }}>
      {segs.map(([k, label, n]) => {
        const on = k === active;
        return (
          <button key={k} type="button" role="tab" aria-selected={on} style={{
            all: "unset", boxSizing: "border-box", cursor: "pointer", flexShrink: 0,
            minHeight: 44, display: "inline-flex", alignItems: "center",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: narrow ? 5 : 6, boxSizing: "border-box",
              padding: narrow ? "7px 9px" : "7px 12px", borderRadius: 8, minHeight: 34,
              background: on ? "var(--surface-2)" : "transparent",
              border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
              fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
              color: on ? "var(--fg)" : "var(--fg-muted)", whiteSpace: "nowrap",
            }}>
              {label}
              <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 700, fontSize: 10, color: on ? "var(--signal)" : "var(--fg-subtle)" }}>{n}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  NAV_SHIPPED, NAV_A, NAV_C, NAV_PRODUCT, NavBar, NavIcon, MyShowsSegments,
  NavOptionA, NavOptionB, NavOptionC, MyShowsWithCrews,
});
