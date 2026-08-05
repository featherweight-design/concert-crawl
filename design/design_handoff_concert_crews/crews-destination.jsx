// crews-destination.jsx — the Crews destination (brief §3.2, deliverable 1).
//
// List → detail. The list is a picker; the detail is the social home:
// identity, roster, what's coming up, and what the crew has already been to.
//
// TENSE (§3.3, locked):
//   upcoming  ≥1 member going   — forward-looking is discovery
//   past      ≥2 members going  — a memory is only shared if you were both there
// The two tenses are drawn as DIFFERENT OBJECTS on purpose: upcoming is the
// shipped event row (it's a show you might buy a ticket to), past is a ticket
// stub (it's a thing that happened). You can tell which half of the page
// you're in with the type turned off.
//
// LEAD ORDER (§8, Design's call): upcoming leads when it has anything at all;
// the shared past leads only when upcoming is empty. Reason — a crew with
// something coming up is answering "what are my people going to?", which is
// the question the feature exists for; a crew with nothing coming up needs a
// reason to be open, and that's the history. Sibling of #1357's Concerts
// (Upcoming above Past), which is the point of the resemblance.
//
// Exports: CrewsList, CrewHome, CrewHero, UpcomingBand, PastBand, RosterList,
//          StubRow, CrewEmpty, crewUpcoming, CrewsScreen, CrewsDesktop

const { CREW_COPY: CC } = window;

// ── Shared: assemble a crew's upcoming shows from the shipped row data ──
// Crew presence is DATA on the existing show shape (crewGoing), not a new row.
function crewUpcoming(crewId) {
  const going = window.CREW_GOING[crewId] || {};
  return window.R_SHOWS
    .filter(s => going[s.id] && going[s.id].length)
    .map(s => {
      const members = going[s.id];
      const { named, extra } = window.nameMembers(members, 2);
      return { ...s, crewGoing: members.length, crewMembers: members,
        crewGoingSr: CC.a11y.goingList(named.concat(extra ? [`${extra} more`] : [])) };
    })
    .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
}

// ── Empty states — the SHIPPED <EmptyState/> (CLAUDE.md §4) ────────────
// design_handoff_empty_state/empty-state.jsx, Hybrid variant, copied into this
// folder verbatim. CrewEmpty is a thin forwarder, not a reimplementation: it
// only pins variant="hybrid" and supplies the eyebrow, because every crew empty
// state wants the same mono status rail with a different section label. All
// geometry, type scale, rail and CTA atoms are the shipped component's.
//   dense  → inline inside a band (nothing upcoming / no past / empty lens)
//   full   → owns the surface (no crews yet)
// `state` drives the rail's right-hand code: no-data "0 / 0", filtered
// "0 hits", error "err". An empty crew lens is genuinely a FILTERED result, so
// it gets "0 hits" — which is the honest thing for a lens that found nothing.
function CrewEmpty({ eyebrow, title, body, cta, onCta, secondary, onSecondary, state = "no-data", dense = true }) {
  return (
    <window.EmptyState
      variant="hybrid"
      state={state}
      density={dense ? "dense" : "default"}
      eyebrow={eyebrow}
      title={title}
      body={body}
      primaryCta={cta ? { label: cta, onClick: onCta } : undefined}
      secondaryCta={secondary ? { label: secondary, onClick: onSecondary } : undefined}
    />
  );
}

// ── Ticket stub — the shared past, artifact-shaped (§8, Design's call) ──
// Not a list of rows and not a poster wall. A poster wall would be the exact
// mistake the brief names: it would put event/venue generative art in charge
// of what a crew's memory looks like. A stub is a physical object you keep,
// it carries the count natively, and it can never be confused with a show
// you could still buy a ticket to.
function StubRow({ night, wide }) {
  const { named, extra } = window.nameMembers(night.went, wide ? 3 : 2);
  const [mon, day] = night.dateLabel.replace(",", "").split(" ");
  const others = night.went.length - (night.went.some(m => m.you) ? 1 : 0);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: wide ? "62px 1fr auto" : "54px 1fr auto",
      alignItems: "center", gap: wide ? 16 : 12,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      borderRadius: 10, overflow: "hidden", position: "relative",
    }}>
      {/* stub end — perforated */}
      <div style={{
        alignSelf: "stretch", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1,
        padding: "12px 0", background: "var(--surface-2)",
        borderRight: "1.5px dashed var(--border-strong)",
      }}>
        <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">{mon}</MonoEyebrow>
        <span style={{ fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 19 : 17, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1 }}>{day}</span>
      </div>
      <div style={{ minWidth: 0, padding: "10px 0", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontFamily: CS_UI, fontWeight: 700, fontSize: wide ? 15 : 14, letterSpacing: "-0.01em", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{night.artist}</div>
        <div style={{ fontFamily: CS_MONO, fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{night.venue}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: wide ? "0 16px 0 0" : "0 12px 0 0" }}>
        <MemberCluster members={night.went} size={wide ? 26 : 23} max={wide ? 5 : 3} label={CC.a11y.goingList(named)}/>
        {wide && (
          <MonoEyebrow size={9.5} color="var(--fg-subtle)">
            {night.went.some(m => m.you) ? CC.detail.together(others) : `${night.went.length} went`}
          </MonoEyebrow>
        )}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────
// Grammar is LIFTED from `ProfileSegments` in
// design_handoff_in_app_notifications/notifications-chrome.jsx (#737) — the
// shipped consumer precedent for an in-page section switcher with counts, and a
// surface the user reaches from the same `me` menu. Pill segments, not underline
// tabs: borderRadius 8, padding "7px 12px", 34px pill, gap 6, Inter 12.5 at
// weight 700 on BOTH states, active = --surface-2 + --border-strong, inactive =
// transparent + --border.
//
// Two deliberate deviations, both forced:
//   · ProfileSegments marks presence with a NotifPip (a dot: "something is
//     unread"). Crews needs MAGNITUDE — 4 shows vs 6 nights vs 6 people is the
//     entire reason counts sit on the tabs — so the pip becomes a mono numeral,
//     --signal when active and --fg-subtle when not. Same slot, same 6px gap;
//     a dot cannot carry a quantity.
//   · The painted pill stays 34px (shipped grammar) but the BUTTON is 44px so
//     the touch target clears the mobile minimum. The pill is an inner span and
//     the extra 10px is transparent padding.
//   · At ≤320 the horizontal padding tightens to 9px and the gap to 4. The
//     shipped precedent does NOT settle this: ProfileSegments carries three
//     short labels ("Shows"/"Alerts"/"Prices") plus a 6px dot, while Crews
//     carries "Coming up"/"Been there"/"Who's in" plus a numeral — intrinsically
//     wider than the surface the grammar came from. At 12px padding the three
//     pills measure 312px against a 294px content box, so the third clipped.
//     Tightening the padding is the smallest change that keeps intrinsic sizing;
//     `flex: 1` would have been a second departure from the grammar.
//   · The row can also scroll horizontally as a backstop, so a longer
//     translation degrades to a swipe instead of a clipped pill.
//
// Full ARIA tabs pattern: roving tabIndex, ←/→ with wrap, Home/End, and
// id + aria-controls / aria-labelledby pairing to the panel.
function CrewTabs({ tabs, active, onSelect, wide, narrow, idBase = "crewtab" }) {
  const refs = React.useRef({});
  const onKeyDown = (e) => {
    const i = tabs.findIndex(t => t.key === active);
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault();
    onSelect && onSelect(tabs[n].key);
    const el = refs.current[tabs[n].key];
    if (el && el.focus) el.focus();
  };
  return (
    <div role="tablist" aria-label={CC.detail.tabsLabel} onKeyDown={onKeyDown}
      style={{
        display: "flex", gap: narrow ? 4 : 6, paddingBottom: 2,
        overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <button key={t.key} type="button" role="tab"
            id={`${idBase}-${t.key}`} aria-controls={`${idBase}-panel`}
            aria-selected={on} tabIndex={on ? 0 : -1}
            ref={(el) => { refs.current[t.key] = el; }}
            onClick={() => onSelect && onSelect(t.key)}
            style={{
              all: "unset", boxSizing: "border-box", cursor: "pointer",
              minHeight: 44, display: "inline-flex", alignItems: "center", flexShrink: 0,
            }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: narrow ? 5 : 6, boxSizing: "border-box",
              padding: narrow ? "7px 9px" : "7px 12px", borderRadius: 8, minHeight: 34,
              background: on ? "var(--surface-2)" : "transparent",
              border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
              fontFamily: CS_UI, fontSize: 12.5, fontWeight: 700,
              color: on ? "var(--fg)" : "var(--fg-muted)", whiteSpace: "nowrap",
            }}>
              {t.label}
              <span style={{
                fontFamily: CS_MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.04em",
                color: on ? "var(--signal)" : "var(--fg-subtle)",
              }}>{t.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Network states (B4) ────────────────────────────────────────
// Skeletons mirror the real row's geometry exactly — same patch box, same two
// text lines, same cluster — so the page doesn't reflow when data lands. That's
// the whole job: a spinner would be less work and would move everything.
// A full roster is NOT an empty state. R1 used CrewEmpty for the at-cap case,
// which forced the status rail to claim "0 / 0" about a list with twelve people
// in it (and "0 hits" under `filtered` is no better). CrewNotice is the same
// voice and geometry minus the rail — for saying something true about a list
// that HAS contents.
function CrewNotice({ eyebrow, title, body, cta, onCta, tone = "warning" }) {
  const c = tone === "warning" ? "var(--warning)" : "var(--signal)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 7,
      padding: "16px 16px 15px", borderRadius: 12,
      background: "var(--surface-1)", border: `1px solid color-mix(in oklch, ${c} 28%, var(--border))`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: c, boxShadow: `0 0 8px ${c}` }}/>
        <MonoEyebrow size={9.5} color={c} letterSpacing="0.14em">{eyebrow}</MonoEyebrow>
      </div>
      <div style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: "var(--fg)" }}>{title}</div>
      <div style={{ fontFamily: CS_UI, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty", maxWidth: 380 }}>{body}</div>
      {cta && <div style={{ marginTop: 4 }}><Btn tone="ghost" size="sm" onClick={onCta}>{cta}</Btn></div>}
    </div>
  );
}

function Shimmer({ w, h, r = 6, style }) {
  return (
    <span aria-hidden="true" style={{
      display: "block", width: w, height: h, borderRadius: r, flexShrink: 0,
      background: "linear-gradient(90deg, var(--surface-1) 0%, var(--surface-2) 50%, var(--surface-1) 100%)",
      backgroundSize: "200% 100%", animation: "ccShimmer 1.3s ease-in-out infinite",
      ...style,
    }}/>
  );
}
function ShimmerKeyframes() {
  return <style>{"@keyframes ccShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){[style*='ccShimmer']{animation:none!important}}"}</style>;
}
function CrewRowSkeleton({ wide }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: wide ? 15 : 13,
      padding: wide ? "13px 15px" : "11px 12px", borderRadius: 12,
      background: "var(--surface-1)", border: "1px solid var(--border)", minHeight: 64,
    }}>
      <Shimmer w={wide ? 54 : 48} h={wide ? 54 : 48} r={14}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <Shimmer w="52%" h={13}/>
        <Shimmer w="31%" h={9}/>
      </div>
      <Shimmer w={64} h={24} r={99}/>
    </div>
  );
}
// One error object for all three surfaces — the shipped EmptyState in its
// `error` state, so a failed fetch and an empty result are visibly the same
// family rather than two invented layouts.
function CrewError({ title, body, onRetry, dense = true, eyebrow = "CONNECTION" }) {
  return (
    <CrewEmpty state="error" dense={dense} eyebrow={eyebrow} title={title} body={body}
      cta={CC.net.retry} onCta={onRetry}/>
  );
}

// ── Crew hero — identity. The patch is the face; the name sits beside it ──
function CrewHero({ crew, wide, onLens, onInvite, muted }) {
  const isCreator = crew.createdBy === "u_you";
  const { named } = window.nameMembers(crew.members, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? 18 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: wide ? 18 : 14 }}>
        <CrewPatch crewId={crew.id} size={wide ? 92 : 72} scale="hero"/>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 style={{
            margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 34 : 25,
            letterSpacing: "-0.035em", color: "var(--fg)", lineHeight: 1.05, textWrap: "balance",
          }}>{crew.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <MonoEyebrow size={9.5}>{CC.list.memberCount(crew.members.length)}</MonoEyebrow>
            <span style={{ width: 3, height: 3, borderRadius: 3, background: "var(--fg-subtle)" }}/>
            <MonoEyebrow size={9.5}>{isCreator ? "YOU STARTED IT" : `STARTED BY ${(window.CREWS.find(c=>c.id===crew.id).members.find(m=>m.id===crew.createdBy)||{}).handle || "A MEMBER"}`}</MonoEyebrow>
            {muted && <><span style={{ width: 3, height: 3, borderRadius: 3, background: "var(--fg-subtle)" }}/><MonoEyebrow size={9.5} color="var(--warning)">MUTED</MonoEyebrow></>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn tone="primary" size="sm" onClick={onLens}>
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="1" y="1" width="12" height="12" rx="4" stroke="currentColor" strokeWidth="1.6" fill="none"/>
            <circle cx="7" cy="7" r="3.4" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          </svg>
          {CC.detail.seeLens}
        </Btn>
        <Btn tone="ghost" size="sm" onClick={onInvite}>{CC.detail.invite}</Btn>
        <Btn tone="quiet" size="sm" style={{ padding: "0 11px" }}>
          <svg width="16" height="5" viewBox="0 0 18 5" aria-hidden="true">
            <circle cx="2.5" cy="2.5" r="2" fill="currentColor"/><circle cx="9" cy="2.5" r="2" fill="currentColor"/><circle cx="15.5" cy="2.5" r="2" fill="currentColor"/>
          </svg>
          <span style={CS_SR}>Crew options</span>
        </Btn>
      </div>
    </div>
  );
}

// ── Upcoming — the shipped event row, surface="crew" ───────────────────
// Grouped by date, exactly like Browse: the crew home's upcoming half IS a
// small calendar, so it carries the date in a header and the row drops it
// (event-row Rule 1, context subtraction). That's also what keeps line 3 down
// to "8:00 PM · Mission Ballroom" inside a carded row at 320.
function UpcomingBand({ crew, wide, narrow, inTab }) {
  const shows = crewUpcoming(crew.id);
  const groups = {};
  for (const s of shows) (groups[s.dateLabel] = groups[s.dateLabel] || []).push(s);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {!inTab && <SectionRail title={CC.detail.upcomingTitle} meta={shows.length ? `${shows.length}` : undefined}/>}
      {shows.length === 0
        ? <CrewEmpty eyebrow={CC.detail.upcomingTitle} title={CC.empty.noUpcomingTitle} body={CC.empty.noUpcomingBody}/>
        : (
          <>
            <div style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-subtle)" }}>{CC.detail.upcomingSub}</div>
            <div style={{ display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, flexDirection: wide ? undefined : "column", gap: wide ? "2px 26px" : 10, alignContent: "start" }}>
              {Object.entries(groups).map(([label, rows]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                    <MonoEyebrow size={9.5} color="var(--fg-subtle)">{label}</MonoEyebrow>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                  </div>
                  {rows.map(s => <EventRow key={s.id} show={s} surface="crew" density="cozy" carded narrow={narrow}/>)}
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  );
}

// ── Shared past ───────────────────────────────────────────────────────
function PastBand({ crew, wide, inTab }) {
  const nights = window.CREW_NIGHTS[crew.id] || [];
  const years = [...new Set(nights.map(n => n.year))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {!inTab && <SectionRail title={CC.detail.pastTitle} meta={nights.length ? CC.detail.pastStat(nights.length) : undefined}/>}
      {nights.length === 0
        ? <CrewEmpty eyebrow={CC.detail.pastTitle} title={CC.empty.noPastTitle} body={CC.empty.noPastBody}/>
        : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              {inTab && <MonoEyebrow size={9.5} color="var(--signal)">{CC.detail.pastStat(nights.length)}</MonoEyebrow>}
              <div style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-subtle)", textWrap: "pretty" }}>{CC.detail.pastSub}</div>
            </div>
            {years.map(y => (
              <div key={y} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 4 }}>
                  <MonoEyebrow size={9.5} color="var(--fg-subtle)">{y}</MonoEyebrow>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                </div>
                <div style={{ display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, flexDirection: wide ? undefined : "column", gap: 7 }}>
                  {nights.filter(n => n.year === y).map(n => <StubRow key={n.id} night={n} wide={wide}/>)}
                </div>
              </div>
            ))}
          </>
        )}
    </div>
  );
}

// ── Roster ────────────────────────────────────────────────────────────
// Handle-less members are listed, counted, and honestly labelled — never
// given an invented display name (#762).
function RosterList({ crew, manage, wide, inTab }) {
  const isCreator = crew.createdBy === "u_you";
  const full = crew.members.length >= CC.cap;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {inTab ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <MonoEyebrow size={9.5} color={full ? "var(--warning)" : "var(--fg-subtle)"}>{crew.members.length} / {CC.cap} SPOTS</MonoEyebrow>
          {!full && <Btn tone="ghost" size="sm">{CC.detail.invite}</Btn>}
        </div>
      ) : (
        <SectionRail title={CC.detail.rosterTitle} meta={`${crew.members.length}/${CC.cap}`}
          action={!full && <Btn tone="ghost" size="sm">{CC.detail.invite}</Btn>}/>
      )}
      {full && <CrewNotice eyebrow="ROSTER FULL" title={CC.empty.atCapTitle} body={CC.empty.atCapBody} cta={CC.list.create}/>}
      <div style={{ display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, flexDirection: wide ? undefined : "column", gap: 2 }}>
        {crew.members.map((m, i) => (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", gap: 11, minHeight: 48, padding: "6px 0",
            borderTop: i === 0 || (wide && i === 1) ? "none" : "1px solid var(--border)",
          }}>
            <MemberDot member={m} size={32} showYou={m.you}/>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {m.handle ? (
                <span style={{ fontFamily: CS_UI, fontWeight: 700, fontSize: 14, color: "var(--fg)", letterSpacing: "-0.01em" }}>
                  {m.handle}{m.you && <span style={{ color: "var(--fg-subtle)", fontWeight: 600 }}> · {CC.roster.you}</span>}
                </span>
              ) : (
                <span style={{ fontFamily: CS_UI, fontWeight: 600, fontSize: 14, color: "var(--fg-subtle)", fontStyle: "normal" }}>{CC.roster.noHandle}</span>
              )}
              <MonoEyebrow size={9} color="var(--fg-subtle)">
                {m.id === crew.createdBy ? CC.roster.creator : (m.handle ? CC.roster.joined("in June") : CC.roster.noHandleHelp)}
              </MonoEyebrow>
            </div>
            {manage && isCreator && !m.you && <Btn tone="quiet" size="sm">{CC.roster.remove}</Btn>}
            {manage && m.you && !isCreator && <Btn tone="danger" size="sm">{CC.roster.leave}</Btn>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Crew list row ─────────────────────────────────────────────────────
function CrewRow({ crew, wide, onOpen }) {
  const up = window.crewUpcomingCount(crew.id);
  return (
    <a href={`#crew-${crew.id}`} onClick={(e) => { e.preventDefault(); onOpen && onOpen(crew.id); }}
      style={{
        display: "flex", alignItems: "center", gap: wide ? 15 : 13, textDecoration: "none",
        padding: wide ? "13px 15px" : "11px 12px", borderRadius: 12,
        background: "var(--surface-1)", border: "1px solid var(--border)", minHeight: 64,
      }}>
      <CrewPatch crewId={crew.id} size={wide ? 54 : 48} scale="tile"/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: wide ? 16 : 15, letterSpacing: "-0.02em", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{crew.name}</span>
        <MonoEyebrow size={9.5} color={up ? "var(--signal)" : "var(--fg-subtle)"}>
          {crew.members.length === 1 ? CC.list.justYou : CC.list.upcomingMeta(up)}
        </MonoEyebrow>
      </div>
      <MemberCluster members={crew.members} size={wide ? 26 : 24} max={wide ? 5 : 3}
        label={CC.list.memberCount(crew.members.length)}/>
      <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true" style={{ flexShrink: 0, marginLeft: 2 }}>
        <path d="M1 1l6 6-6 6" stroke="var(--fg-subtle)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

// ── The list ──────────────────────────────────────────────────────────
function CrewsList({ crews, wide, empty, gated, state = "ready", onRetry }) {
  const list = crews || window.CREWS;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? 18 : 15 }}>
      <ShimmerKeyframes/>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <MonoEyebrow size={9.5}>{CC.list.eyebrow}</MonoEyebrow>
          <h1 style={{ margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 38 : 28, letterSpacing: "-0.035em", color: "var(--fg)", lineHeight: 1 }}>{CC.list.title}</h1>
        </div>
        {!empty && state === "ready" && <Btn tone={gated ? "ghost" : "primary"} size="sm">{CC.list.create}{gated && <span style={{ fontFamily: CS_MONO, fontSize: 9, letterSpacing: "0.1em", color: "var(--signal)" }}>★</span>}</Btn>}
      </div>
      {state === "loading" ? (
        <>
          <MonoEyebrow size={9.5} color="var(--fg-subtle)" style={{ marginTop: -6 }} aria-live="polite">{CC.net.loadingCrews}</MonoEyebrow>
          <div style={{ display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, flexDirection: wide ? undefined : "column", gap: 8 }}>
            {[0, 1, 2, 3].map(i => <CrewRowSkeleton key={i} wide={wide}/>)}
          </div>
        </>
      ) : state === "error" ? (
        <CrewError dense={false} title={CC.net.errListTitle} body={CC.net.errListBody} onRetry={onRetry}/>
      ) : empty ? (
        <CrewEmpty dense={false} eyebrow={CC.list.eyebrow} title={CC.empty.noCrewsTitle} body={CC.empty.noCrewsBody} cta={CC.list.create}/>
      ) : (
        <>
          <div style={{ fontFamily: CS_UI, fontSize: 13, color: "var(--fg-muted)", maxWidth: 460, lineHeight: 1.45, textWrap: "pretty", marginTop: -6 }}>{CC.list.subtitle}</div>
          <div style={{ display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, flexDirection: wide ? undefined : "column", gap: 8 }}>
            {list.map(c => <CrewRow key={c.id} crew={c} wide={wide}/>)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Crew home ─────────────────────────────────────────────────────────
function CrewHome({ crewId, wide, narrow, manage, muted, tab, lead, state = "ready", onRetry }) {
  const crew = window.crewById(crewId);
  const shows = crewUpcoming(crewId);
  const nights = window.CREW_NIGHTS[crewId] || [];
  const soloMember = crew.members.length === 1;
  // The lead-order call (README §2 item 3) now decides which tab OPENS.
  const pastOpens = lead === "past" || (lead == null && shows.length === 0 && nights.length > 0);
  const initial = tab || (pastOpens ? "past" : "upcoming");
  const [active, setActive] = React.useState(initial);
  React.useEffect(() => { setActive(initial); }, [initial, crewId]);

  // Loading shows the hero SHAPE but never a name or a patch — both would be
  // guesses, and the patch especially must not flash a wrong identity.
  if (state === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: wide ? 22 : 18 }}>
        <ShimmerKeyframes/>
        <div style={{ display: "flex", alignItems: "center", gap: wide ? 18 : 14 }}>
          <Shimmer w={wide ? 92 : 72} h={wide ? 92 : 72} r={22}/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            <Shimmer w="62%" h={wide ? 30 : 23}/>
            <Shimmer w="38%" h={10}/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>{[132, 104, 44].map(w => <Shimmer key={w} w={w} h={36} r={10}/>)}</div>
        <MonoEyebrow size={9.5} color="var(--fg-subtle)" aria-live="polite">{CC.net.loadingCrew}</MonoEyebrow>
        <div style={{ display: "flex", gap: 6 }}>{[104, 104, 92].map(w => <Shimmer key={w} w={w} h={34} r={8}/>)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map(i => <Shimmer key={i} w="100%" h={70} r={12}/>)}
        </div>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: wide ? 22 : 18 }}>
        <CrewError dense={false} title={CC.net.errCrewTitle} body={CC.net.errCrewBody} onRetry={onRetry}/>
      </div>
    );
  }
  const tabs = [
    { key: "upcoming", label: CC.detail.upcomingTitle, count: shows.length },
    { key: "past",     label: CC.detail.pastTitle,     count: nights.length },
    { key: "roster",   label: CC.detail.rosterTitle,   count: crew.members.length },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? 22 : 18 }}>
      <CrewHero crew={crew} wide={wide} muted={muted}/>
      {soloMember && <CrewEmpty eyebrow="CREW OF ONE" title={CC.empty.crewOfOneTitle} body={CC.empty.crewOfOneBody} cta={CC.detail.invite}/>}
      <CrewTabs tabs={tabs} active={active} onSelect={setActive} wide={wide} narrow={narrow} idBase={`ct-${crewId}`}/>
      <div role="tabpanel" id={`ct-${crewId}-panel`} aria-labelledby={`ct-${crewId}-${active}`}
        tabIndex={0} style={{ display: "flex", flexDirection: "column" }}>
        {active === "upcoming" && <UpcomingBand crew={crew} wide={wide} narrow={narrow} inTab/>}
        {active === "past" && <PastBand crew={crew} wide={wide} inTab/>}
        {active === "roster" && <RosterList crew={crew} wide={wide} manage={manage} inTab/>}
      </div>
    </div>
  );
}

// ── Screens ───────────────────────────────────────────────────────────
function CrewsScreen({ children, narrow, active = "crews", scroll = 0, segments = false }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI, display: "flex", flexDirection: "column" }}>
      <CrewAppBar/>
      {segments && (
        <div style={{ padding: `0 ${narrow ? 13 : 16}px 10px`, flexShrink: 0 }}>
          <window.MyShowsSegments narrow={narrow}/>
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden", padding: `${scroll ? 0 : 4}px ${narrow ? 13 : 16}px 16px`, marginTop: scroll ? -scroll : 0 }}>{children}</div>
      <CrewBottomNav active={active} narrow={narrow}/>
    </div>
  );
}

// ── Desktop header — LIFTED from DesktopHeader ────────────────────────
// design_handoff_in_app_notifications/notifications-chrome.jsx:390 (#737).
// Third time this pattern bit: R1 hardcoded the mobile bar, R2 hand-drew it
// twice, and R3 fixed the mobile bar's semantics while leaving the desktop
// header an ungrounded recreation — from the same file, read the same round,
// 270 lines further down than where I stopped.
//
// Shipped spec, now matched: 64px bar · --bg-elevated · 0 32px · CCMark 32 +
// gap 10 · PILL nav (8px/14px, radius 8, --surface-2 active, 13px 700/500) ·
// trailing group = 280px ⌘K field, conditional install slot / offline pill,
// 36px account disc.
//
// Two departures, same shape as the CCTabBar lift:
//  1. LABELS + ROUTES come from NAV_PRODUCT. DesktopHeader's own tabs are
//     `browse · search · watching` — stale the same way CCTabBar's were, and
//     under Option A the bar carries five slots.
//  2. Items are real <a>s with aria-current and 44px targets; the shipped
//     component uses <span>s. Keeping that would re-break the parity rule R3
//     item 4 exists to fix, so the pill VISUAL is lifted and the SEMANTICS are
//     upgraded. Owed upstream.
// The ⌘K field and install slot are the shipped ones, rendered not re-drawn —
// and their absence was substantive, since desktop search lives in this header.
function CrewsDesktop({ children, active = "crews", maxWidth = 900, install = true, offline = false }) {
  const nav = (window.NAV_PRODUCT || []).filter(t => !t.trigger);
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header style={{
        height: 64, flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 32px",
        borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CMark size={32}/>
            <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 17, color: "var(--fg)", letterSpacing: "-0.02em" }}>
              concert<span style={{ color: "var(--accent)" }}>crawl.</span>
            </span>
          </div>
          <nav style={{ display: "flex", gap: 4 }} aria-label="Primary">
            {nav.map(t => {
              const on = t.key === active;
              return (
                <a key={t.key} href={t.href || "#"} aria-current={on ? "page" : undefined}
                  style={{
                    display: "inline-flex", alignItems: "center", minHeight: 44,
                    padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                    fontFamily: CS_UI, fontSize: 13, letterSpacing: "-0.01em",
                    fontWeight: on ? 700 : 500,
                    color: on ? "var(--fg)" : "var(--fg-muted)",
                    background: on ? "var(--surface-2)" : "transparent",
                  }}>{t.label}</a>
              );
            })}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px",
            borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border)",
            width: 280, boxSizing: "border-box", color: "var(--fg-subtle)", flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: CS_UI, fontSize: 13 }}>Search artists, venues, genres…</span>
            <span style={{ marginLeft: "auto", fontFamily: CS_MONO, fontSize: 10, padding: "2px 5px", borderRadius: 3, border: "1px solid var(--border-strong)" }}>⌘K</span>
          </span>
          {offline && window.OfflinePillCC && <window.OfflinePillCC/>}
          {install && !offline && window.InstallSlotCC && <window.InstallSlotCC/>}
          {/* NOT NotifAvatarButton. Shipped geometry (36px disc), but that
              component's aria-label is "Notifications" because in #737 this disc
              is where the notification pip lives — #737 IS that feature. On the
              crews header the slot is the ACCOUNT menu and there's no pip to
              show, so adopting the component would inherit the wrong accessible
              name. Geometry lifted, semantics correct for this surface. */}
          <button type="button" aria-label="Account" aria-haspopup="menu" style={{
            all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 36,
            boxSizing: "border-box", flexShrink: 0, background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: CS_UI, fontWeight: 700, fontSize: 12.5, letterSpacing: "-0.01em",
            color: "var(--fg-muted)",
          }}>H</button>
        </div>
      </header>
      <div style={{ flex: 1, overflow: "hidden", padding: "28px 30px" }}>
        <div style={{ maxWidth, margin: "0 auto" }}>{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  crewUpcoming, CrewEmpty, CrewNotice, CrewError, Shimmer, ShimmerKeyframes, CrewRowSkeleton,
  StubRow, CrewHero, CrewTabs, UpcomingBand, PastBand,
  RosterList, CrewRow, CrewsList, CrewHome, CrewsScreen, CrewsDesktop,
});
