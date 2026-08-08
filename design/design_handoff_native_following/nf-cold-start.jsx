// nf-cold-start.jsx — the on-ramp. Native following's whole problem is that
// Spotify imported 100+ artists in one tap and we add one at a time, so every
// surface here exists to make the FIRST follows cheap:
//   1. onboarding step  — genres → suggested artists, multi-select, bulk commit
//   2. starter shelf    — the zero-follow Browse slot recruits instead of apologising
//   3. search results   — follow without leaving search (search already indexes artists)
//   4. the bill         — follow the openers you came to discover, from the show

const { NFArt, Mono, NFPrimary, NFGhost, NFFollow, FollowingTag, GenreChip, MetaChip,
  GlyphCheck, GlyphPlus, GlyphSearch, GlyphChevron, GlyphLock, Screen, ScreenShell, NFAppBar,
  NFTabBar, Sheet, Scrim, NF_ARTISTS, NF_GENRES, CCMark, NFWordmark, nfLocked, NoDatesLine } = window;

// ── Progress dots (matches onboarding-screens.jsx ProgressDots) ─
// EIGHT steps. The shipped flow is already six — welcome · how · today ·
// theme · notyet · done — and the follow step adds two more, slotting in
// after the founder note and before "You're in":
//   welcome · how · today · theme · notyet · GENRES · ARTISTS · done
// R2's note said "steps 4–5 of 6", which silently dropped theme and notyet.
// That was a miscount on our side, not a proposed cut.
function NFDots({ total = 8, index = 5 }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 6,
          background: i === index ? "var(--signal)" : i < index ? "var(--fg-subtle)" : "var(--border-strong)" }}/>
      ))}
    </div>
  );
}

// ── Selectable artist card (multi-select, bulk-add) ─────────────
// The tile IS the checkbox — no separate follow button in select mode, so a
// 12-artist grid is 12 targets instead of 24. Sizing is fluid (the grid owns
// the columns) so the layout is ALWAYS two-up, 320 through desktop.
function ArtistPick({ artist, selected = false }) {
  return (
    <div role="checkbox" aria-checked={selected} style={{
      minWidth: 0, cursor: "pointer", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 8,
      background: selected ? "var(--surface-2)" : "var(--surface-1)",
      border: `1px solid ${selected ? "var(--signal)" : "var(--border)"}`,
      boxShadow: selected ? "inset 0 0 0 1px var(--signal)" : "none",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 9, overflow: "hidden" }}>
        <window.IdentityArt name={artist.name} kind="artist" scale="tile" showInitials={false}/>
        <div style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? "var(--signal)" : "rgba(0,0,0,0.5)",
          border: `1.5px solid ${selected ? "var(--signal)" : "rgba(255,255,255,0.6)"}`,
          color: selected ? "var(--fg-on-accent)" : "rgba(255,255,255,0.95)" }}>
          {selected ? <GlyphCheck size={12} w={2.6}/> : <GlyphPlus size={11} w={2.4}/>}
        </div>
      </div>
      <div style={{ padding: "0 2px 2px", minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist.name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)",
          letterSpacing: "0.06em", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {artist.next ? artist.next.split(" · ")[1] : "no date yet"}
        </div>
      </div>
    </div>
  );
}

function PickGrid({ cols = 2, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 10 }}>{children}</div>;
}

// ── Onboarding · genre step ────────────────────────────────────
function FollowStepGenres({ narrow = false, picked = ["punk", "indie rock", "shoegaze"] }) {
  return (
    <Screen>
      <div style={{ padding: narrow ? "54px 16px 0" : "58px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <NFDots total={8} index={5}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>Skip</span>
      </div>
      <ScreenShell pad={narrow ? "22px 16px 16px" : "26px 20px 16px"} gap={0}>
        <Mono color="var(--signal)" size={10}>Step 6 of 8 · your artists</Mono>
        <h1 style={{ margin: "10px 0 0", fontSize: narrow ? 25 : 28, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--fg)" }}>
          What do you actually listen to?
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.5, color: "var(--fg-muted)", textWrap: "pretty" }}>
          Pick a few. We'll show you artists playing Denver soon. Follow the ones you know and we'll flag their next date.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
          {NF_GENRES.map(g => <GenreChip key={g} active={picked.includes(g)}>{g}</GenreChip>)}
        </div>
      </ScreenShell>
      <div style={{ padding: narrow ? "12px 16px 26px" : "12px 20px 30px", borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", flexDirection: "column", gap: 8 }}>
        <NFPrimary>Show me {picked.length ? "artists" : "who's playing"} →</NFPrimary>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)" }}>
          {picked.length ? `${picked.length} selected` : "Or skip. You can follow anyone from search later."}
        </div>
      </div>
    </Screen>
  );
}

// ── Onboarding · suggested artists step (the bulk-add moment) ───
function FollowStepArtists({ narrow = false, selected = ["Amyl and The Sniffers", "Wednesday", "The Beths", "Mannequin Pussy"], tier = "premium" }) {
  const list = NF_ARTISTS.slice(0, 10);
  const n = selected.length;
  const locked = nfLocked(tier);
  return (
    <Screen>
      <div style={{ padding: narrow ? "54px 16px 0" : "58px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <NFDots total={8} index={6}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>Skip</span>
      </div>
      <div style={{ padding: narrow ? "20px 16px 12px" : "24px 20px 12px" }}>
        <Mono color="var(--signal)" size={10}>Step 7 of 8 · playing denver</Mono>
        <h1 style={{ margin: "9px 0 0", fontSize: narrow ? 24 : 27, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--fg)" }}>
          Know any of these?
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.45, color: "var(--fg-muted)", textWrap: "pretty" }}>
          Punk, indie rock and shoegaze acts with Denver dates on the books. Tap to add. Pick as many as you like.
        </p>
      </div>
      <ScreenShell pad={narrow ? "0 16px 14px" : "0 20px 14px"} gap={10}>
        <PickGrid cols={2}>
          {list.map(a => <ArtistPick key={a.name} artist={a} selected={selected.includes(a.name)}/>)}
        </PickGrid>
        <button style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          minHeight: 44, borderRadius: 10, border: "1px dashed var(--border-strong)", color: "var(--fg-muted)",
          fontSize: 13, fontWeight: 700, marginTop: 2 }}>
          <GlyphSearch size={13}/>Search for someone specific
        </button>
      </ScreenShell>
      <div style={{ padding: narrow ? "12px 16px 26px" : "12px 20px 30px", borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", flexDirection: "column", gap: 8 }}>
        {locked
          ? <><NFPrimary><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphLock size={13}/>Follow {n} {n === 1 ? "artist" : "artists"} with Premium</span></NFPrimary>
              <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)", textWrap: "pretty" }}>Your picks are held while you upgrade. Nothing gets lost.</div></>
          : <><NFPrimary>{n ? `Follow ${n} ${n === 1 ? "artist" : "artists"} →` : "Continue without following →"}</NFPrimary>
              <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)" }}>{n ? "Unfollow any of them any time." : "You can follow anyone from search later."}</div></>}
      </div>
    </Screen>
  );
}

// ── Browse · the zero-follow slot ──────────────────────────────
// The Spotify build pinned a "Based on your taste" shelf here. With zero
// follows that shelf has nothing to say — so the slot RECRUITS instead of
// rendering an apology. Same geometry, different job.
// ── Shelf follow badge ───────────────────────────────────
// Six full Follow buttons in a row was too loud, and pairing a filled button
// with a mono "Following" chip made the two states look like different
// controls. One badge, both states, same geometry — the same affordance the
// onboarding picker uses, so the gesture is learned once.
function ShelfFollowBadge({ state = "idle", size = 34 }) {
  const on = state === "following";
  const locked = state === "locked";
  const label = on ? "Following" : "Follow";
  const gateId = `nfgate${React.useId().replace(/:/g, "")}`;
  return (
    <>
    <button aria-pressed={locked ? undefined : on} aria-label={label}
      aria-describedby={locked ? gateId : undefined} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      position: "absolute", top: 7, right: 7, width: size, height: size, borderRadius: size,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: on ? "color-mix(in oklab, var(--signal) 22%, rgba(0,0,0,0.5))" : "rgba(0,0,0,0.5)",
      border: `1.5px solid ${on ? "var(--signal)" : "rgba(255,255,255,0.6)"}`,
      color: on ? "var(--signal)" : "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)",
    }}>
      {on ? <GlyphCheck size={14} w={2.6}/> : locked ? <GlyphLock size={13}/> : <GlyphPlus size={13} w={2.4}/>}
    </button>
    {locked && (
      <span id={gateId} style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
        overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
        Following artists is a Premium feature. Opens upgrade options.
      </span>
    )}
    </>
  );
}

function ShelfCard({ artist, state, w = 138 }) {
  return (
    <div style={{ width: w, flexShrink: 0, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ position: "relative", width: w, height: w, borderRadius: 10, overflow: "hidden" }}>
        <window.IdentityArt name={artist.name} kind="artist" scale="tile" showInitials={false}/>
        <ShelfFollowBadge state={state}/>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist.name}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: state === "following" ? "var(--signal)" : "var(--fg-subtle)", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: -3 }}>{artist.next || "no date yet"}</div>
    </div>
  );
}

function ShelfHead({ eyebrow, title, body, action }) {
  return (
    <div style={{ padding: "0 16px 11px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        <Mono color="var(--signal)" size={10}>{eyebrow}</Mono>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>{title}</div>
        {body && <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{body}</div>}
      </div>
      {action && <button style={{ all: "unset", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--fg-subtle)", paddingBottom: 2 }}>{action}<GlyphChevron size={10}/></button>}
    </div>
  );
}

function StarterShelf({ narrow = false, tier = "premium" }) {
  const list = NF_ARTISTS.slice(0, 6);
  const locked = nfLocked(tier);
  return (
    <div style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "14px 0 16px" }}>
      <ShelfHead eyebrow="Start here" title="Follow someone. Anyone."
        body="Follow an artist and we'll flag it the moment they announce a Denver date. These are already on the books."/>
      <div style={{ display: "flex", gap: 10, padding: "2px 16px 0", overflowX: "auto" }}>
        {list.map(a => <ShelfCard key={a.name} artist={a} state={locked ? "locked" : "idle"} w={narrow ? 124 : 138}/>)}
      </div>
      <div style={{ padding: "13px 16px 0" }}>
        <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--signal)" }}>Browse all artists<GlyphChevron size={11}/></button>
      </div>
    </div>
  );
}

// ── Browse · the populated slot (≥1 follow) ────────────────────
function YourArtistsShelf({ count = 7, narrow = false }) {
  const list = NF_ARTISTS.filter(a => a.next).slice(0, 5);
  return (
    <div style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "14px 0 16px" }}>
      <ShelfHead eyebrow={`Your artists · ${count} followed`} title="Coming to Denver" action="All"/>
      <div style={{ display: "flex", gap: 10, padding: "2px 16px 0", overflowX: "auto" }}>
        {list.map(a => <ShelfCard key={a.name} artist={a} state="following" w={narrow ? 124 : 138}/>)}
      </div>
    </div>
  );
}

// ── Search · follow from the result row ────────────────────────
// Search already indexes artists. Adding the button here removes the
// "you must be on their page to follow them" trap without a new route.
function ArtistSearchResults({ narrow = false, tier = "premium", query = "amyl" }) {
  // Every artist in this list is followable BY CONSTRUCTION: search filters to
  // artists with at least one visible event, so a zero-show artist can never
  // appear here. NF_ARTISTS[9] has no upcoming date — past Denver shows only —
  // and still gets a live Follow button. That's the whole point of the feature.
  const results = [
    { ...NF_ARTISTS[1], state: "idle" },
    { name: "Amyl and The Sniffers", sub: "at Gothic Theatre · Aug 29", kind: "show" },
    { ...NF_ARTISTS[3], state: "following" },
    { ...NF_ARTISTS[9], state: "idle" },
  ];
  const locked = nfLocked(tier);
  return (
    <Screen>
      <div style={{ padding: "58px 16px 12px", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 44, padding: "0 13px", borderRadius: 11,
          background: "var(--surface-1)", border: "1px solid var(--border-strong)", color: "var(--fg-subtle)" }}>
          <GlyphSearch size={15}/>
          <span style={{ fontSize: 15, color: "var(--fg)", fontWeight: 600 }}>{query}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 17, color: "var(--fg-subtle)" }}>×</span>
        </div>
      </div>
      <ScreenShell pad="0 0 8px" gap={0}>
        <div style={{ padding: "6px 16px 9px" }}><Mono size={9.5}>Artists · 3</Mono></div>
        {results.filter(r => r.kind !== "show").map(a => (
          <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <NFArt name={a.name} size={narrow ? 48 : 56} radius={8}/>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.next || <NoDatesLine/>}
              </div>
            </div>
            <NFFollow state={locked && a.state === "idle" ? "locked" : a.state} size="sm" iconOnly={narrow}/>
          </div>
        ))}
        <div style={{ padding: "20px 16px 9px" }}><Mono size={9.5}>Shows · 1</Mono></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
          <NFArt name="Gothic Theatre" size={narrow ? 48 : 56} radius={8}/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>Amyl and The Sniffers</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>Sat Aug 29 · Gothic Theatre</div>
          </div>
          <div style={{ color: "var(--fg-subtle)" }}><GlyphChevron size={15}/></div>
        </div>
        <div style={{ margin: "16px 16px 0", padding: "12px 13px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
            <strong style={{ color: "var(--fg)", fontWeight: 700 }}>Been Stellar</strong> is in here because they've played Denver before, and they're followable even with nothing on the books. Artists who have never played Denver aren't in the index at all, so they can't appear here.
          </div>
        </div>
      </ScreenShell>
      <NFTabBar active={1}/>
    </Screen>
  );
}

// ── Event detail · follow the bill ─────────────────────────────
// The support slots are where discovery actually happens. One "Follow all"
// action per bill, then per-artist rows underneath.
function BillFollowBlock({ tier = "premium", allFollowed = false, bill }) {
  const rows = bill || [
    { name: "Electric Callboy", role: "Headliner", state: "following" },
    { name: "Bad Omens", role: "Support", state: allFollowed ? "following" : "idle" },
    { name: "Loveless", role: "Support", state: allFollowed ? "following" : "idle" },
  ];
  const remaining = rows.filter(b => b.state === "idle").length;
  // "Follow all N" locks as ONE unit and the per-row buttons lock with it:
  // below Premium the whole block is a single paywall, one tap. Locking rows
  // independently would make a 4-act bill four separate paywall hits.
  const locked = nfLocked(tier);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface-1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 13px" }}>
        <Mono size={9.5}>On the bill · {rows.length}</Mono>
        {remaining > 0 && (
          <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, minHeight: 34, padding: "0 11px",
            borderRadius: 8, border: "1px solid var(--border-strong)", color: "var(--fg)",
            fontSize: 12, fontWeight: 800, letterSpacing: "-0.01em" }}>
            {locked ? <GlyphLock size={11}/> : <GlyphPlus size={11} w={2.4}/>}Follow all {remaining}
          </button>
        )}
      </div>
      {rows.map(b => (
        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", borderTop: "1px solid var(--border)" }}>
          <NFArt name={b.name} size={40} circle/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{b.role}</div>
          </div>
          <NFFollow state={locked && b.state === "idle" ? "locked" : b.state} size="sm"/>
        </div>
      ))}
    </div>
  );
}

// The SHIPPED Event Detail v2, with the bill block in its new `billBlock` slot
// (directly under the Watch CTA). Not a new screen, not a redesign — one
// section added to the component that already exists.
function BillFollowScreen({ tier = "premium", allFollowed = false, withBill = true }) {
  const ev = { ...window.EV2_EVENT, billBlock: withBill ? <BillFollowBlock tier={tier} allFollowed={allFollowed}/> : null };
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)" }}>
      <window.EventDetail event={ev} chrome="mobile"/>
    </div>
  );
}

// ── Bulk-follow sheet (reachable from the bill + the shelf) ─────
function BulkFollowSheet({ selected = ["Militarie Gun", "Been Stellar"] }) {
  const list = NF_ARTISTS.slice(0, 6);
  return (
    <Sheet height="72%">
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Mono color="var(--signal)" size={10}>Follow more · shoegaze &amp; punk</Mono>
        <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.025em", color: "var(--fg)" }}>Pick as many as you like.</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, margin: "0 -20px" }}>
        {list.map(a => {
          const on = selected.includes(a.name);
          return (
            <div key={a.name} role="checkbox" aria-checked={on} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 20px",
              borderTop: "1px solid var(--border)", background: on ? "var(--surface-1)" : "transparent", cursor: "pointer" }}>
              <NFArt name={a.name} size={44} radius={7}/>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>{a.next || "no Denver dates yet"}</div>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: on ? "var(--signal)" : "transparent", border: `1.5px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
                color: on ? "var(--fg-on-accent)" : "transparent" }}><GlyphCheck size={12} w={2.6}/></div>
            </div>
          );
        })}
      </div>
      <NFPrimary>Follow {selected.length} {selected.length === 1 ? "artist" : "artists"}</NFPrimary>
    </Sheet>
  );
}

Object.assign(window, {
  NFDots, ArtistPick, PickGrid, FollowStepGenres, FollowStepArtists,
  ShelfFollowBadge, ShelfCard, ShelfHead, StarterShelf, YourArtistsShelf, ArtistSearchResults,
  BillFollowBlock, BillFollowScreen, BulkFollowSheet,
});
