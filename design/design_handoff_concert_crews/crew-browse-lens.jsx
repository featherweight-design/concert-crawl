// crew-browse-lens.jsx — the Browse lens (brief §3.2, deliverable 2).
//
// ── The call the brief left open (§8) ─────────────────────────────────
// "How the crew picker reads in the Browse filter bar without the bar gaining
// visual weight."
//
// Answer: it doesn't go in the filter bar. A crew is not a filter — filters
// narrow the calendar by an attribute of the SHOW (date, venue, price, genre);
// a crew narrows it by WHO. Making it a fifth chip would put it in a row it
// doesn't belong to and add a chip to a bar we've spent two passes keeping
// thin.
//
// Instead the lens uses the row that already exists above the chips — the one
// holding "What's on?" / "DENVER, CO" and the list/cal toggle — and it
// RETITLES THE PAGE:
//
//   resting   What's on?           [◎ Crews ▾] [LIST|CAL]
//             DENVER, CO
//             ( date )( venue )( price )( genre )
//
//   lens on   Thursdays            [▨ Thursdays ▾] [LIST|CAL]
//             ● CREW LENS · 4 SHOWS ──────────── × CLEAR
//             ( date )( venue )( price )( genre )
//
// Resting costs NOTHING — one 32px pill in a row that had spare width, and the
// filter bar is byte-for-byte what ships today. Switching a crew on changes the
// page title to the crew's name and adds one thin dismissible rail where the
// location eyebrow was. So the weight lands on the title block (the thing that
// should change when you change what you're looking at) and on a rail you can
// clear, never on the chips. Filters still compose on top of the lens.
//
// The card presence question (§8) resolves in event-row.jsx: crew presence is
// a COUNT chip that displaces `following` in the meta budget. Names are event
// detail's job — see crew-social-rail.jsx.
//
// Exports: CrewLensPill, CrewLensTitle, CrewPickerSheet, CrewPickerPopover,
//          BrowseLensMobile, BrowseLensDesktop, lensShows

const { CREW_COPY: CL } = window;

function lensShows(crewId) {
  return window.crewUpcoming(crewId);
}

function LensGlyph({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.2" y="1.2" width="13.6" height="13.6" rx="4.6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="8" r="1.4" fill="currentColor"/>
    </svg>
  );
}
function Chevron({ size = 9 }) {
  return <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
}

// ── The pill — one control, 32px tall, sits beside the view toggle ─────
function CrewLensPill({ crew, maxWidth = 132, onClick }) {
  const on = !!crew;
  return (
    <button type="button" onClick={onClick}
      aria-pressed={on}
      aria-label={on ? CL.a11y.lensOn(crew.name) : CL.lens.pickerTitle}
      style={{
        all: "unset", boxSizing: "border-box", cursor: "pointer",
        height: 32, minHeight: 32, maxWidth, padding: on ? "0 8px 0 4px" : "0 9px 0 8px",
        borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6,
        background: on ? "color-mix(in oklch, var(--signal) 16%, transparent)" : "transparent",
        border: `1px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
        color: on ? "var(--signal)" : "var(--fg-muted)",
        fontFamily: CS_UI, fontWeight: 700, fontSize: 11.5, letterSpacing: "-0.005em",
      }}>
      {on ? <CrewPatch crewId={crew.id} size={22} scale="micro"/> : <LensGlyph size={13}/>}
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {on ? crew.name : CL.lens.chipResting}
      </span>
      <Chevron/>
    </button>
  );
}

// ── The title block — this is what carries the lens state ─────────────
function CrewLensTitle({ crew, count, wide, onClear, onPick }) {
  const on = !!crew;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{
            fontFamily: CS_UI, fontWeight: on ? 900 : 800, fontSize: wide ? 32 : 24,
            color: "var(--fg)", letterSpacing: "-0.03em", lineHeight: 1.08,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{on ? crew.name : "What's on?"}</span>
          {!on && <MonoEyebrow size={9.5} color="var(--fg-muted)" letterSpacing="0.06em">Denver, CO</MonoEyebrow>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <CrewLensPill crew={crew} onClick={onPick} maxWidth={wide ? 200 : 126}/>
          <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
            {["list", "cal"].map(v => (
              <span key={v} style={{
                padding: "0 10px", display: "inline-flex", alignItems: "center",
                fontFamily: CS_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                background: v === "list" ? "var(--signal)" : "transparent",
                color: v === "list" ? "var(--fg-on-accent)" : "var(--fg-muted)",
              }}>{v}</span>
            ))}
          </div>
        </div>
      </div>
      {on && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)", flexShrink: 0, boxShadow: "0 0 8px var(--signal)" }}/>
          <MonoEyebrow size={9.5} color="var(--signal)" style={{ whiteSpace: "nowrap" }}>
            {CL.lens.railEyebrow} · {count} {count === 1 ? "SHOW" : "SHOWS"}
          </MonoEyebrow>
          <div style={{ flex: 1, height: 1, background: "var(--border)", minWidth: 8 }}/>
          <button type="button" onClick={onClear} aria-label={CL.a11y.lensOff} style={{
            all: "unset", cursor: "pointer", flexShrink: 0, minHeight: 22,
            fontFamily: CS_MONO, fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap",
            letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)",
            borderBottom: "1px solid var(--border-strong)", lineHeight: 1.5,
          }}>× {CL.lens.railClear}</button>
        </div>
      )}
    </div>
  );
}

// ── The filter bar — UNCHANGED. Shown so the diff is visibly nothing. ──
function FilterChips({ narrow }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {["Any date", "Any venue", "Any price", "Any genre"].map(l => (
        <span key={l} style={{
          padding: "5px 10px", borderRadius: 999, border: "1px solid var(--border-strong)",
          fontFamily: CS_UI, fontWeight: 600, fontSize: 11, color: "var(--fg-muted)",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>{l}<Chevron/></span>
      ))}
    </div>
  );
}

// ── Picker — built to FilterSheet's ANATOMY, not its API ──────────────
// CLAUDE.md §4 points filter sheets/popovers at `filter-system.jsx`, and it's
// copied into this folder for reference. The crew picker deliberately does NOT
// consume `FilterSheet` / `FilterPopover`, and this is the same reasoning as
// decision #2 above: those components are driven by `FILTER_DEFS[filterKey]`,
// whose options are `{value, label}` pairs describing an attribute of a SHOW.
// A crew is not a show attribute — feeding one into FILTER_DEFS would make the
// lens a filter dimension, which is the exact thing this design argues against.
// The rows also need artwork and a per-row meta line, which that API has no
// slot for.
//
// So it borrows the anatomy instead, down to the atoms: grabber, mono label +
// title header with a round × close, the reset row FIRST ("Everyone", standing
// in for "Any date"), 16/20 rows at 15.5px, active rows in --signal at 700, and
// the same Checkmark glyph. Selection applies immediately and dismisses, like
// the shipped sheets. Eng should extend the real components with an optional
// leading-media + meta slot rather than clone this file.
function PickerCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 5" stroke="var(--signal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function PickerClose() {
  return (
    <button type="button" aria-label={CL.a11y.close} style={{
      all: "unset", cursor: "pointer", width: 32, height: 32, borderRadius: 16,
      background: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--fg-muted)", flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
    </button>
  );
}
function CrewPickerRow({ crew, selected, none, compact }) {
  const pad = compact ? "10px 14px" : "12px 20px";
  const up = none ? 0 : window.crewUpcomingCount(crew.id);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: pad,
      borderBottom: "1px solid var(--border)", boxSizing: "border-box",
      background: selected ? "var(--surface-1)" : "transparent",
    }}>
      {none ? (
        <span style={{ width: 38, height: 38, borderRadius: 12, border: "1.5px dashed var(--border-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)", flexShrink: 0 }}>
          <LensGlyph size={16}/>
        </span>
      ) : <CrewPatch crewId={crew.id} size={38} scale="tile"/>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{
          fontFamily: CS_UI, fontWeight: selected ? 700 : 500, fontSize: compact ? 13.5 : 15.5,
          color: selected ? "var(--signal)" : "var(--fg)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{none ? CL.lens.pickerNone : crew.name}</span>
        <MonoEyebrow size={9} color={!none && up ? "var(--signal)" : "var(--fg-subtle)"}>
          {none ? "EVERY SHOW IN DENVER" : CL.list.upcomingMeta(up)}
        </MonoEyebrow>
      </div>
      {selected && <PickerCheck/>}
    </div>
  );
}
function CrewPickerBody({ selectedId, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <CrewPickerRow none selected={!selectedId} compact={compact}/>
      {window.CREWS.map(c => <CrewPickerRow key={c.id} crew={c} selected={c.id === selectedId} compact={compact}/>)}
    </div>
  );
}
function CrewPickerSheet({ selectedId }) {
  return (
    <SheetChrome height="72%">
      <DragHandle/>
      <div style={{
        padding: "10px 20px 12px", display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <MonoEyebrow size={10} color="var(--signal)" letterSpacing="0.14em">{CL.lens.railEyebrow}</MonoEyebrow>
          <span style={{ fontFamily: CS_UI, fontWeight: 700, fontSize: 18, color: "var(--fg)", letterSpacing: "-0.02em" }}>{CL.lens.pickerTitle}</span>
          <span style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-muted)", textWrap: "pretty" }}>{CL.lens.pickerSub}</span>
        </div>
        <PickerClose/>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}><CrewPickerBody selectedId={selectedId}/></div>
    </SheetChrome>
  );
}
function CrewPickerPopover({ selectedId }) {
  return (
    <div style={{
      width: 320, borderRadius: 12, background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      boxShadow: "0 20px 48px -12px rgba(0,0,0,0.55), 0 4px 12px -4px rgba(0,0,0,0.35)",
      padding: "6px 0", color: "var(--fg)", fontFamily: CS_UI,
    }}>
      <div style={{ padding: "8px 14px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
        <MonoEyebrow size={9.5} color="var(--signal)" letterSpacing="0.14em">{CL.lens.railEyebrow}</MonoEyebrow>
        <span style={{ fontFamily: CS_UI, fontSize: 11.5, color: "var(--fg-muted)" }}>{CL.lens.pickerSub}</span>
      </div>
      <CrewPickerBody selectedId={selectedId} compact/>
    </div>
  );
}

// ── The calendar itself — the SHIPPED row, grouped by date, unforked ───
function LensList({ crewId, narrow, wide }) {
  const crew = crewId ? window.crewById(crewId) : null;
  const shows = crewId ? lensShows(crewId) : window.R_SHOWS;
  if (crewId && shows.length === 0) {
    return <div style={{ paddingTop: 6 }}><window.CrewEmpty eyebrow={CL.lens.railEyebrow} state="filtered" title={CL.empty.lensEmptyTitle} body={CL.empty.lensEmptyBody(crew.name)} cta={window.CREW_COPY.detail.invite}/></div>;
  }
  const groups = {};
  for (const s of shows) (groups[s.dateLabel] = groups[s.dateLabel] || []).push(s);
  return (
    <div style={{ display: wide ? "grid" : "block", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, gap: wide ? "0 32px" : 0, alignContent: "start" }}>
      {Object.entries(groups).map(([label, rows]) => (
        <div key={label}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingTop: 12, paddingBottom: 4 }}>
            <span style={{ fontFamily: CS_UI, fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)" }}>{label}</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
          </div>
          {rows.map((s, i) => (
            <div key={s.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <EventRow show={s} surface={crewId ? "crewLens" : "browse"} density="cozy" narrow={narrow}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Screens ───────────────────────────────────────────────────────────
function BrowseLensMobile({ crewId, narrow }) {
  const crew = crewId ? window.crewById(crewId) : null;
  const count = crewId ? lensShows(crewId).length : 0;
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "58px 16px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CMark size={26}/><Wordmark size={16}/></div>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: "1.5px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ padding: `0 ${narrow ? 13 : 16}px 12px`, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <CrewLensTitle crew={crew} count={count}/>
        <FilterChips narrow={narrow}/>
      </div>
      <div style={{ flex: 1, overflow: "hidden", padding: `0 ${narrow ? 13 : 16}px` }}>
        <LensList crewId={crewId} narrow={narrow}/>
      </div>
      <CrewBottomNav active="browse" narrow={narrow}/>
    </div>
  );
}

function BrowseLensDesktop({ crewId, picker }) {
  const crew = crewId ? window.crewById(crewId) : null;
  const count = crewId ? lensShows(crewId).length : 0;
  return (
    <window.CrewsDesktop active="browse" maxWidth={980}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
        <CrewLensTitle crew={crew} count={count} wide/>
        <FilterChips/>
        <div style={{ height: 1, background: "var(--border)" }}/>
        <LensList crewId={crewId} wide/>
        {picker && (
          <div style={{ position: "absolute", top: 40, right: 96, zIndex: 10 }}>
            <CrewPickerPopover selectedId={crewId}/>
          </div>
        )}
      </div>
    </window.CrewsDesktop>
  );
}

Object.assign(window, {
  lensShows, LensGlyph, CrewLensPill, CrewLensTitle, FilterChips,
  CrewPickerSheet, CrewPickerPopover, LensList, BrowseLensMobile, BrowseLensDesktop,
});
