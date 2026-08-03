// crew-social-rail.jsx — crew presence on event detail (§3.8, deliverable 5)
// and the bell-only crew notifications (§3.11).
//
// ── RECONCILED with design_handoff_event_detail_cta_tooltip R2 (Aug 3) ──
// R1 of this file drew its own bordered "social rail" carrying crew members AND
// a watching count. That was correct against the event detail page as it existed
// when §3.8 was written — back then watching was a bare number. It isn't any
// more. The shipped page now has `WatchStrip`: row 1 is the eye toggle, row 2 is
// the watcher crawl (avatar stack, named handles, and an "All 13" that opens a
// roster overlay). So R1's rail was:
//   · duplicating the watcher count that row 2 already states, and
//   · drawing a second avatar-cluster language beside `AvatarStack`/`UMAvatar`.
//
// The fix is not to restyle the rail. It's to notice that §3.8's "one social
// line, crew first, then watching" describes a page where one control owned both
// populations — and the shipped page splits them, correctly, because GOING and
// WATCHING are different populations. The CTA pass already found the rule:
//
//     a status line belongs to the control it describes.
//
// The watcher crawl belongs to the eye. Crew attendance belongs to GOING. So:
//
//     ┌ Going ─────────────────────────────┐   ← GoingCTA (shipped, unchanged)
//     │ cassidy, mvp_ross + 2 more going   │   ← CrewGoingLine  (this file)
//     └────────────────────────────────────┘
//     ┌ 👁 Watch to get pinged… ───────────┐   ← WatchStrip row 1 (shipped)
//     │ sc_setlist_bassbin6 + 11 · All 13  │   ← WatchStrip row 2 (shipped)
//     └────────────────────────────────────┘
//
// §3.8's intent is intact — crew reads first, and there is exactly one social
// statement per control instead of two competing rails. No count is stated
// twice. Zero changes to the shipped components.
//
// Exports: CrewGoingLine, EventDetailMock, CrewNotifRow, NotifList, MuteRows

const { CREW_COPY: CR } = window;

// ── Crew avatars — the shipped disc, plus #762's honest-identity case ──
// Handled members use the SHIPPED `Avatar` from watcher-roster.jsx (UMAvatar +
// deterministic per-handle tone). R1 drew its own MemberDot for both cases; the
// only thing genuinely missing from the shipped primitive is the handle-LESS
// member, because watchers are never anonymous-but-shown — they're counted
// separately as `anon`. Crews must show them in the roster, so that one case
// stays local: a dashed, letterless disc. No invented initials (#762).
function CrewDisc({ member, size = 26 }) {
  if (member.handle) return <window.Avatar handle={member.handle} size={size}/>;
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: size, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      border: "1.5px dashed var(--border-strong)", boxShadow: "0 0 0 2px var(--surface-1)",
    }}>
      <span style={{ width: size * 0.22, height: size * 0.22, borderRadius: size, background: "var(--fg-subtle)", opacity: 0.7 }}/>
    </span>
  );
}
function CrewDiscStack({ members, size = 26, max = 3 }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", position: "relative", isolation: "isolate", paddingLeft: 2 }}>
      {shown.map((m, i) => (
        <span key={m.id} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: shown.length - i }}>
          <CrewDisc member={m} size={size}/>
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          marginLeft: -size * 0.22, zIndex: 0, width: size, height: size, borderRadius: size,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--surface-2)", border: "1.5px solid var(--border-strong)",
          boxShadow: "0 0 0 2px var(--surface-1)",
          fontFamily: CS_MONO, fontWeight: 700, fontSize: size * 0.36, color: "var(--fg-muted)",
        }} aria-hidden="true">+{extra}</span>
      )}
    </span>
  );
}

// ── The crew line ─────────────────────────────────────────────────────
// Attached to Going, in Going's own container, so it reads as Going's status —
// the same relationship the crawl has to the eye. Not a bordered object of its
// own: two bordered social blocks stacked was exactly the "two competing rails"
// §3.8 rules out.
//
// Degradation ladder — #762's don't-fake-identity plus the CTA pass's MEASURED
// name budget (`WatcherWord`). The line observes its own box and steps down
// rather than letting a handle cross a clip edge:
//   2 names → 1 name → drop the "going" suffix       ← measured on the TEXT span
//   faces give way to names at the tightest widths   ← measured on the CONTAINER
//
// The split matters. Levels 0–2 only change text INSIDE the observed span, so
// measuring the span is safe. Dropping the faces removes a SIBLING, which widens
// the span the measurement was taken on — measure that on the span and you get
// the exact oscillation shape already fixed twice in WhenWhere and MetaRow
// (drop faces → span widens → observer resets → faces return → …). So the faces
// are gated on the ROW's width, which dropping them cannot change.
//
// Both rulings are the CTA pass's own — names outrank the suffix, and at the
// tightest widths the faces give way to the names because the names are the
// payload and the CREW chip already says what kind of line this is.
function CrewGoingLine({ going = [], wide, compact }) {
  const ref = React.useRef(null);
  const rowRef = React.useRef(null);
  const lastW = React.useRef(-1);
  const named = going.filter(m => m.handle);
  const anon = named.length === 0;
  const maxNames = Math.min(named.length, wide ? 3 : 2);
  // 0..2 = names dropped; 3 = "going" suffix dropped. Text-only, span-measured.
  const [level, setLevel] = React.useState(0);
  // Faces: gated on the ROW box, independent of the text ladder.
  const [roomForFaces, setRoomForFaces] = React.useState(true);

  React.useLayoutEffect(() => { setLevel(0); }, [going.length, wide]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || anon) return;
    if (el.scrollWidth > el.clientWidth + 0.5 && level < 3) setLevel(l => l + 1);
  }, [level, going.length, wide, anon, roomForFaces]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    lastW.current = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - lastW.current) > 1) { lastW.current = w; setLevel(0); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 296 is measured, not guessed: the stack (74) + chip (58) + gaps (18) leave
  // 146px, and one handle plus a "+ N more" tail needs ~170. Below that the
  // faces are spending width the names need.
  React.useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const measure = () => setRoomForFaces(row.clientWidth >= 296);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  // Guard sits below every hook: a crew line that gains or loses its last
  // member must not change the hook count between renders.
  if (!going.length) return null;

  const shown = Math.max(1, maxNames - Math.min(level, maxNames - 1));
  const { named: names, extra } = window.nameMembers(going, shown);
  const suffix = level < 3;
  const showFaces = !anon && roomForFaces;
  const text = anon
    ? CR.rail.crewGoingCount(going.length)
    : (extra > 0
        ? `${names.join(", ")} + ${extra} more${suffix ? " going" : ""}`
        : `${names.join(", ")}${suffix ? " going" : ""}`);
  // The ladder drops names for WIDTH, not for privacy — so the full list stays
  // available to AT at every rung, the same contract as the row's `crewGoingSr`.
  // Handle-less members are counted here too, never invented (#762).
  const allNamed = named.map(m => (m.you ? "you" : m.handle));
  const unnamed = going.length - allNamed.length;
  const srFull = anon
    ? null
    : CR.a11y.goingList(allNamed.concat(unnamed > 0 ? [`${unnamed} more`] : []));
  return (
    <div ref={rowRef} style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: compact ? "8px 10px 0" : "9px 12px 0",
    }}>
      {showFaces
        ? <CrewDiscStack members={going} size={wide ? 26 : 23} max={3}/>
        : <span style={{ width: 7, height: 7, borderRadius: 7, background: "var(--signal)", flexShrink: 0, boxShadow: "0 0 8px var(--signal)" }}/>}
      <span ref={ref} aria-hidden={srFull ? "true" : undefined} style={{
        flex: 1, minWidth: 0, fontFamily: CS_UI, fontWeight: 600, fontSize: wide ? 12.5 : 12,
        color: "var(--fg)", letterSpacing: "-0.005em", lineHeight: 1.4, whiteSpace: "nowrap",
      }}>{text}</span>
      {srFull && <span style={CS_SR}>{srFull}</span>}
      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 7px", borderRadius: 5,
        background: "color-mix(in oklch, var(--signal) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--signal) 34%, transparent)" }}>
        <window.LensGlyph size={10}/>
        <MonoEyebrow size={8.5} color="var(--signal)" letterSpacing="0.1em">CREW</MonoEyebrow>
      </span>
    </div>
  );
}

// ── Event detail mock — the shipped block, with the crew line inside it ──
// Renders the REAL GoingCTA and WatchStrip from event-cta-v2.jsx. The only crew
// addition is CrewGoingLine, and it sits inside the commit block above the
// strip. Also deliberately renders the artist hero with IdentityArt two elements
// from a crew patch, so the two visual languages can be compared in one screen.
function EventDetailMock({ going = [], watching = false, wide, showCrewPatch, goingState = "default" }) {
  const s = window.R_HERMANOS;
  const [isWatching, setIsWatching] = React.useState(watching);
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "relative", height: wide ? 250 : 200, flexShrink: 0, zIndex: 0 }}>
        <IdentityArt name={s.artist} kind="artist" scale="hero" showInitials={false} grain={0.08}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, var(--bg) 100%)" }}/>
        <div style={{ position: "absolute", top: wide ? 18 : 54, left: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: 34, background: "var(--scrim)", border: "1px solid var(--border-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="9" height="15" viewBox="0 0 9 15" aria-hidden="true"><path d="M7 1L1.5 7.5 7 14" stroke="var(--fg)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </div>
      </div>
      <div style={{ flex: 1, padding: wide ? "0 26px 22px" : "0 16px 18px", display: "flex", flexDirection: "column", gap: 13, marginTop: -30, overflow: "hidden", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 style={{ margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 32 : 25, letterSpacing: "-0.035em", lineHeight: 1.05 }}>{s.artist}</h1>
          <MonoEyebrow size={10}>{s.venue.toUpperCase()} · SAT OCT 3 · 7:00 PM</MonoEyebrow>
        </div>

        {/* The shipped commit block — Direction D. Crew line rides with Going. */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10, padding: wide ? 14 : 12,
          borderRadius: 14, background: "var(--surface-1)", border: "1px solid var(--border)",
        }}>
          <MonoEyebrow size={9} color="var(--fg-subtle)">YOUR MOVE</MonoEyebrow>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <window.GoingCTA show={s} state={goingState} h={52}/>
            <CrewGoingLine going={going} wide={wide}/>
          </div>
          <window.WatchStrip
            watching={isWatching}
            people={window.WATCHERS}
            anon={window.WATCHERS_ANON}
            onChange={setIsWatching}
            nameLimit={wide ? 3 : 2}
            compact={!wide}
          />
        </div>

        {showCrewPatch && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 11, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <CrewPatch crewId="cr_7f3a91" size={44} scale="tile"/>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <MonoEyebrow size={9} color="var(--fg-subtle)">SAME SCREEN, TWO SYSTEMS</MonoEyebrow>
              <span style={{ fontFamily: CS_UI, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.4 }}>Poster above, patch here. Not relatives.</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <MonoEyebrow size={9.5}>TICKETS</MonoEyebrow>
          <div style={{ height: 44, borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)" }}/>
        </div>
      </div>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────
function CrewNotifRow({ crewId, text, when, unread, muted, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "10px 0",
      borderBottom: last ? "none" : "1px solid var(--border)", opacity: muted ? 0.55 : 1,
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <CrewPatch crewId={crewId} size={38} scale="micro"/>
        {unread && <span style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 9, background: "var(--signal)", border: "2px solid var(--bg)" }} aria-hidden="true"/>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontFamily: CS_UI, fontWeight: unread ? 700 : 600, fontSize: 13.5, color: "var(--fg)", lineHeight: 1.35, textWrap: "pretty" }}>{text}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <MonoEyebrow size={9} color="var(--fg-subtle)">{when}</MonoEyebrow>
          <span style={{ width: 2.5, height: 2.5, borderRadius: 3, background: "var(--fg-subtle)" }}/>
          <MonoEyebrow size={9} color="var(--fg-subtle)">{window.crewById(crewId).name.toUpperCase()}</MonoEyebrow>
          {muted && <><span style={{ width: 2.5, height: 2.5, borderRadius: 3, background: "var(--fg-subtle)" }}/><MonoEyebrow size={9} color="var(--warning)">MUTED</MonoEyebrow></>}
        </div>
      </div>
      <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)" }} aria-hidden="true">
        <svg width="14" height="4" viewBox="0 0 16 4"><circle cx="2" cy="2" r="1.8" fill="currentColor"/><circle cx="8" cy="2" r="1.8" fill="currentColor"/><circle cx="14" cy="2" r="1.8" fill="currentColor"/></svg>
      </span>
    </div>
  );
}

function NotifList({ wide }) {
  const rows = [
    { crewId: "cr_7f3a91", text: CR.notif.going("mvp_ross", "Holdfast."), when: "12m ago", unread: true },
    { crewId: "cr_7f3a91", text: CR.notif.goingNoName("Hermanos Gutiérrez"), when: "2h ago", unread: true },
    { crewId: "cr_41a7b2", text: CR.notif.joined("kitfisto", "Night Shift"), when: "yesterday" },
    { crewId: "cr_2b8d04", text: CR.notif.going("omar.wav", "Four Tet"), when: "2d ago", muted: true },
    { crewId: "cr_9e15cc", text: CR.notif.left("bexlikesdrums", "Basement Show Union"), when: "5d ago" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionRail title="Notifications" meta="CREW · BELL ONLY"/>
      <div style={{
        display: "flex", gap: 9, padding: "10px 12px", borderRadius: 10,
        background: "var(--surface-1)", border: "1px solid var(--border)",
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="var(--fg-subtle)" strokeWidth="1.3" fill="none"/>
          <path d="M7 4v3.4M7 9.6v.1" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: CS_UI, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.45, textWrap: "pretty" }}>
          Crew activity lands here and nowhere else. It never becomes a push notification — same rule as price checks.
        </span>
      </div>
      <div style={{ display: wide ? "grid" : "block", gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : undefined, gap: wide ? "0 30px" : 0 }}>
        {rows.map((r, i) => <CrewNotifRow key={i} {...r} last={i === rows.length - 1 && !wide}/>)}
      </div>
    </div>
  );
}

// ── Per-crew mute — Settings › Notifications ──────────────────────────
function MuteRows({ wide }) {
  const muted = { cr_2b8d04: true };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      <SectionRail title="Crew activity" meta="PER CREW"/>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {window.CREWS.slice(0, 4).map((c, i) => {
          const on = !muted[c.id];
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderTop: i ? "1px solid var(--border)" : "none" }}>
              <CrewPatch crewId={c.id} size={34} scale="micro"/>
              <span style={{ flex: 1, minWidth: 0, fontFamily: CS_UI, fontWeight: 700, fontSize: 14, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
              {!on && <MonoEyebrow size={9} color="var(--warning)">{CR.roster.muted.toUpperCase()}</MonoEyebrow>}
              <button type="button" role="switch" aria-checked={on} aria-label={CR.a11y.crewActivity(c.name)} style={{
                all: "unset", cursor: "pointer", boxSizing: "border-box",
                width: 44, height: 26, borderRadius: 26, flexShrink: 0, position: "relative",
                background: on ? "var(--signal)" : "var(--surface-3)",
                border: `1px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 20,
                  background: on ? "var(--fg-on-accent)" : "var(--fg-subtle)",
                }}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { CrewGoingLine, CrewDisc, CrewDiscStack, EventDetailMock, CrewNotifRow, NotifList, MuteRows });
