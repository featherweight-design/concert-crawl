// nf-following.jsx — living with follows, built ON the shipped surfaces.
//
// Browse uses the real FilterBar chrome from browse-home.jsx and the real
// <EventRowList surface="browse"/> from design_handoff_event_row_system.
// The artist page is the real <ArtistPageMobile/> from
// design_handoff_artist_page. Nothing here re-draws a screen that exists —
// this file only adds the follow layer to them.
//
// Dual-mode rule (brief Q3): native is the BASE shape and Spotify is a SOURCE
// on it. Components take source="native"|"spotify"; the only genuine
// divergence is the zero state.
//
// ⚠️ COPY IS PLACEHOLDER. Every user-facing string in this handoff is a
// structural stand-in for the copy-writer to re-assess.

const { NFArt, Mono, NFPrimary, NFGhost, NFFollow, FollowingTag, MetaChip, SpotifySlot, SourceMark,
  GlyphCheck, GlyphPlus, GlyphLock, GlyphBell, GlyphEye, GlyphSearch, GlyphChevron,
  Screen, ScreenShell, NFAppBar, NFTabBar, NFTabs, Sheet, NF_ARTISTS, CCMark, nfLocked, NoDatesLine } = window;

// Kept for the nudge-in-context mock and the desktop rows.
const NF_EVENTS = [
  { artist: "Amyl and The Sniffers", meta: "Gothic Theatre · 9:00 PM", price: "$28", followed: true },
  { artist: "Wednesday", meta: "Bluebird Theater · 8:00 PM", price: "$25", followed: true },
  { artist: "Hovvdy", meta: "Larimer Lounge · 8:30 PM", price: "$22", followed: false },
  { artist: "Militarie Gun", meta: "Marquis Theater · 7:00 PM", price: "$20", followed: true },
  { artist: "Lewis Capaldi", meta: "Red Rocks · 7:30 PM", price: "$55+", followed: false },
];
function NFEventRow({ e, showFollowing = false, source }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
      <NFArt name={e.artist} size={54} radius={8}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.artist}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.meta}</div>
        {showFollowing && <div style={{ display: "flex", gap: 5, marginTop: 1 }}><FollowingTag source={source} compact/></div>}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" }}>{e.price}</div>
    </div>
  );
}

// ── Browse rows — the shipped row system, with follow data on it ──
// `following` + `followSource` are the only fields this feature adds; the row
// renders them through its existing meta-chip budget, so nothing about the
// row's layout, truncation or price treatment changes.
function nfShows(mode) {
  const base = (window.R_SHOWS || []).map(s => ({ ...s }));
  if (mode === "zero") return base.map(s => ({ ...s, following: false }));
  const followed = new Set(["holdfast", "masego", "hermanos"]);
  const out = base.map(s => ({ ...s, following: followed.has(s.id), followSource: s.id === "masego" ? "spotify" : "native" }));
  return mode === "filtered" ? out.filter(s => s.following) : out;
}

// ── The follow filter chip ─────────────────────────────────────
// Matches the shipped FilterBar chip exactly (11px Inter 600, 5/10 padding,
// pill, --signal when active) — it sits in that row, so it obeys that row.
// "My artists", not "taste": it filters on something you explicitly did.
// Absent at zero follows — a scope that can only return nothing is a trap.
//
// Locked is NOT aria-disabled. R2 set it and contradicted both the follow-
// button spec and our own a11y note: tapping a locked control opens the
// paywall, so it must stay in the tab order and stay activatable. There is no
// disabled access state in the entitlements model at all.
function FollowFilterChip({ state = "off", count = 7 }) {
  if (state === "absent") return null;
  const on = state === "on";
  const locked = state === "locked";
  return (
    <button aria-pressed={locked ? undefined : on} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer", flexShrink: 0,
      display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999,
      border: `1px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
      background: on ? "var(--signal)" : "transparent",
      color: on ? "var(--fg-on-accent)" : locked ? "var(--fg-subtle)" : "var(--fg-muted)",
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 11, letterSpacing: "-0.005em",
    }}>
      {locked && <GlyphLock size={9}/>}
      <span>My artists{on ? ` · ${count}` : ""}</span>
      {on && <span style={{ fontSize: 12, opacity: 0.85 }}>×</span>}
    </button>
  );
}

// ── Browse chrome — verbatim structure from browse-home.jsx ─────
function NFBrowseChrome({ filterState = "off", count = 7 }) {
  const chipStyle = {
    all: "unset", boxSizing: "border-box", cursor: "pointer", flexShrink: 0,
    padding: "5px 10px", borderRadius: 999, fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 11,
    background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border-strong)",
    letterSpacing: "-0.005em", display: "inline-flex", alignItems: "center", gap: 4,
  };
  return (
    <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24, color: "var(--fg)", letterSpacing: "-0.03em" }}>What's on?</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Denver, CO</span>
        </div>
        <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
          {["list", "cal"].map(v => (
            <span key={v} style={{ padding: "0 12px", lineHeight: "30px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
              background: v === "list" ? "var(--signal)" : "transparent", color: v === "list" ? "var(--fg-on-accent)" : "var(--fg-muted)" }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <FollowFilterChip state={filterState} count={count}/>
        {["date", "venue", "price", "genre"].map(k => (
          <button key={k} style={chipStyle}>
            <span>{k}</span>
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// mode: "zero" (0 follows) · "some" (≥1) · "filtered" (scope on)
function BrowseNative({ mode = "zero", source = "native", tier = "premium", narrow = false }) {
  const { StarterShelf, YourArtistsShelf } = window;
  const filtered = mode === "filtered";
  const shows = nfShows(mode);
  return (
    <Screen>
      <window.NFAppBar/>
      <NFBrowseChrome filterState={mode === "zero" ? "absent" : filtered ? "on" : (nfLocked(tier) ? "locked" : "off")} count={7}/>
      <ScreenShell pad="0 0 8px" gap={0}>
        {mode === "zero" ? <StarterShelf narrow={narrow} tier={tier}/> : <YourArtistsShelf count={7} narrow={narrow}/>}
        {filtered && (
          <div role="status" style={{ padding: "11px 16px", background: "var(--surface-1)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <GlyphCheck size={12} c="var(--signal)" w={2.4}/>
            <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
              <strong style={{ color: "var(--fg)", fontWeight: 700 }}>{shows.length} shows</strong> by artists you follow
            </span>
          </div>
        )}
        <div style={{ padding: "14px 16px 0" }}>
          <window.EventRowList shows={shows} surface="browse" density="cozy" narrow={narrow} groupBy="date"/>
        </div>
        {filtered && (
          <div style={{ margin: "18px 16px 0", padding: 14, borderRadius: 10, border: "1px dashed var(--border-strong)", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>That's all {shows.length}.</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4, textWrap: "pretty" }}>Follow a few more artists and this list gets longer on its own.</div>
          </div>
        )}
      </ScreenShell>
      <NFTabBar active={0}/>
    </Screen>
  );
}

// ── My shows ▸ Artists ─────────────────────────────────────────
// Hugh's call: tuck following under the existing My shows surface next to
// Watching / History rather than spend a fifth nav slot on it.
function ArtistManageRow({ a, source, narrow = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
      <NFArt name={a.name} size={narrow ? 48 : 56} radius={8}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--signal)", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.next || <NoDatesLine/>}
        </div>
        {source === "spotify" && <div style={{ marginTop: 1 }}><SourceMark source="spotify"/></div>}
      </div>
      <NFFollow state="following" size="sm" iconOnly={narrow}/>
    </div>
  );
}

// The "find more artists" row. Named as a destination, not a verb-plus-noun:
// it opens the same suggestion picker as onboarding step 5, and the meta line
// says so, because "+ Follow more" beside a list of Following buttons reads
// like it might follow everything at once.
function FindArtistsRow({ dense = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
      <div style={{ width: dense ? 48 : 56, height: dense ? 48 : 56, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px dashed var(--border-strong)", color: "var(--signal)" }}><GlyphSearch size={19}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>Find artists to follow</div>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 3, textWrap: "pretty" }}>Search by name, or browse who's playing Denver soon.</div>
      </div>
      <div style={{ color: "var(--fg-subtle)" }}><GlyphChevron size={15}/></div>
    </div>
  );
}

function MyShowsArtists({ source = "native", narrow = false, count = 7 }) {
  const upcoming = NF_ARTISTS.filter(a => a.next).slice(0, 5);
  const quiet = NF_ARTISTS.filter(a => !a.next).slice(0, 2);
  return (
    <Screen>
      <NFAppBar title="My shows" back={false} action={
        <div style={{ width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", border: "1px solid var(--border-strong)" }}>
          <GlyphBell size={16}/>
        </div>}/>
      <NFTabs tabs={["Watching", "Artists", "History"]} active={1} count={count}/>
      <ScreenShell pad="0 0 8px" gap={0}>
        <div style={{ padding: "13px 16px 9px" }}><Mono size={9.5}>{upcoming.length} playing denver</Mono></div>
        {upcoming.map(a => <ArtistManageRow key={a.name} a={a} narrow={narrow} source={source === "spotify" && a.name === "The Beths" ? "spotify" : "native"}/>)}
        <div style={{ padding: "22px 16px 9px" }}><Mono size={9.5}>Nothing on the books · {quiet.length}</Mono></div>
        {quiet.map(a => <ArtistManageRow key={a.name} a={a} narrow={narrow}/>)}
        <div style={{ marginTop: 18 }}><FindArtistsRow dense={narrow}/></div>
        <div style={{ margin: "18px 16px 0", padding: "13px 14px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
          <div style={{ color: "var(--fg-muted)" }}><GlyphBell size={17}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>Alerts for these artists</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginTop: 2 }}>Push on · weekly digest on</div>
          </div>
          <div style={{ color: "var(--fg-subtle)" }}><GlyphChevron size={15}/></div>
        </div>
        {source === "spotify" && (
          <div style={{ margin: "12px 16px 0", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <SpotifySlot size={14}/>
            <div style={{ flex: 1, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.4, textWrap: "pretty" }}>
              4 of these came in from Spotify. Unfollowing here won't touch your Spotify library.
            </div>
          </div>
        )}
      </ScreenShell>
      <NFTabBar active={2}/>
    </Screen>
  );
}

// ── Artists tab · zero state ───────────────────────────────────
// EmptyState Hybrid anatomy + voice: mono status word, short headline, one
// real next move. Both routes are known-static, so a CTA pair, not chips.
function MyShowsArtistsEmpty({ tier = "premium", narrow = false }) {
  return (
    <Screen>
      <NFAppBar title="My shows" back={false}/>
      <NFTabs tabs={["Watching", "Artists", "History"]} active={1} count={0}/>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 26px", textAlign: "center" }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)", marginBottom: 18 }}>
          <GlyphPlus size={20} w={1.8}/>
        </div>
        <Mono size={10} color="var(--accent)" ls="0.18em">No one yet</Mono>
        <div style={{ fontSize: narrow ? 22 : 25, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--fg)", marginTop: 11 }}>
          Nobody on your list.
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 9, textWrap: "pretty", maxWidth: 290 }}>
          Follow an artist and we'll tell you the moment they book a Denver date. Even the ones who only come through once a year.
        </div>
        <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 8, marginTop: 22 }}>
          <NFPrimary>{nfLocked(tier) ? "See who's playing Denver" : "Find artists to follow"}</NFPrimary>
          <NFGhost>Follow from a show you're watching</NFGhost>
        </div>
      </div>
      <NFTabBar active={2}/>
    </Screen>
  );
}

// ── Spotify-connected variant (the divergence) ─────────────────
function MyShowsArtistsSpotifyFresh({ narrow = false }) {
  return (
    <Screen>
      <NFAppBar title="My shows" back={false}/>
      <NFTabs tabs={["Watching", "Artists", "History"]} active={1} count={112}/>
      <ScreenShell pad="0 0 8px" gap={0}>
        <div style={{ padding: "13px 16px", background: "var(--surface-1)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <SpotifySlot size={15}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>112 artists from Spotify</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginTop: 2 }}>Synced 2 hours ago · 6 playing Denver</div>
          </div>
          <div style={{ color: "var(--fg-subtle)" }}><GlyphChevron size={15}/></div>
        </div>
        <div style={{ padding: "14px 16px 9px" }}><Mono size={9.5}>6 playing denver</Mono></div>
        {NF_ARTISTS.filter(a => a.next).slice(0, 4).map(a => <ArtistManageRow key={a.name} a={a} narrow={narrow} source="spotify"/>)}
        <div style={{ marginTop: 18 }}><FindArtistsRow dense={narrow}/></div>
        <div style={{ margin: "18px 16px 0", padding: "13px 14px", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
            Same list, same controls. Spotify just filled it for you. Follow or unfollow anyone here without touching your Spotify account.
          </div>
        </div>
      </ScreenShell>
      <NFTabBar active={2}/>
    </Screen>
  );
}

// ── Artist page — the SHIPPED page, with follow states on it ────
// <ArtistPageMobile/> from design_handoff_artist_page, plus ONE pass-through
// prop: `followState` (locked | pending; undefined for idle/following).
//
// `state="nodates"` is not a button state — it's the artist with past Denver
// shows and nothing upcoming, rendered with a normal live Follow button.
// It needs NO change to the shipped page: with no upcoming
// shows the page renders EmptyUpcoming, which already carries its own inline
// FollowButton and its own copy for this case. The `hasShows` guard stays. See
// artist-page.jsx.
function ArtistPageScreen({ state = "idle", narrow = false, source = "native", scrolled = false }) {
  const A = window.ARTISTS;
  const noDates = state === "nodates";
  return (
    <window.ArtistPageMobile
      artist={noDates ? A.emptyFallback : A.known}
      following={state === "following"}
      followState={state === "locked" || state === "pending" ? state : undefined}
      narrow={narrow}
      scrolled={scrolled}
      direction="mat"/>
  );
}

// ── Paywall on tap ─────────────────────────────────────────────
// Ship <MiniPaywall anchor={FOLLOW_ANCHOR}/> from
// design_handoff_monetization_tier_states — this is the anatomy, not the code.
const FOLLOW_ANCHOR = {
  eyebrow: "Artist following · Premium",
  title: "We'll watch for them.",
  body: "Follow the acts you care about. When a Denver date lands, you hear about it first, not from a repost three weeks later.",
  bullets: [
    "Follow as many artists as you want",
    "A ping the moment a new Denver date is crawled",
    "One Friday email with everything coming up",
  ],
  cta: "See Premium",
};
function FollowPaywallSheet({ anchor = FOLLOW_ANCHOR }) {
  return (
    <Sheet height="64%">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Mono color="var(--signal)" size={10}>{anchor.eyebrow}</Mono>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.1 }}>{anchor.title}</div>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{anchor.body}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "13px 0 3px", borderTop: "1px solid var(--border)" }}>
        {anchor.bullets.map(b => (
          <div key={b} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ color: "var(--signal)", marginTop: 2, flexShrink: 0 }}><GlyphCheck size={13} w={2.4}/></span>
            <span style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.4 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <NFPrimary>{anchor.cta}</NFPrimary>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)" }}>Watching shows and price drops stay free.</div>
      </div>
    </Sheet>
  );
}

// ── Premium tier card — the replaced headline benefit ───────────
function PremiumBenefitCard({ variant = "after", width = 340 }) {
  const before = [
    { t: "Spotify sync: your library, your shows", lead: true },
    { t: "Price-drop alerts" },
    { t: "Concert History" },
    { t: "Calendar export" },
  ];
  const after = [
    { t: "Follow artists: get a heads-up when they play Denver", lead: true },
    { t: "Price-drop alerts on shows you're watching" },
    { t: "Concert History + Passport" },
    { t: "Calendar export" },
  ];
  const rows = variant === "before" ? before : after;
  const dead = variant === "before";
  return (
    <div style={{ width, borderRadius: 14, background: "var(--surface-1)", border: `1px solid ${dead ? "var(--danger)" : "var(--signal)"}`, padding: 17, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Mono size={9.5} color={dead ? "var(--danger)" : "var(--signal)"}>{dead ? "Today · selling a dead feature" : "Proposed"}</Mono>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)" }}>$4/mo</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>Premium</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(r => (
          <div key={r.t} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ color: r.lead ? (dead ? "var(--danger)" : "var(--signal)") : "var(--fg-subtle)", marginTop: 2, flexShrink: 0 }}><GlyphCheck size={13} w={2.4}/></span>
            <span style={{ fontSize: r.lead ? 14 : 13, fontWeight: r.lead ? 800 : 500, color: r.lead ? "var(--fg)" : "var(--fg-muted)", lineHeight: 1.4, letterSpacing: r.lead ? "-0.015em" : 0, textWrap: "pretty" }}>{r.t}</span>
          </div>
        ))}
      </div>
      <div style={{ paddingTop: 11, borderTop: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 8 }}>
        {variant === "before"
          ? <span style={{ fontSize: 11.5, color: "var(--danger)", lineHeight: 1.45, textWrap: "pretty" }}>Spotify is capped at 5 accounts. Nobody buying this can have the headline benefit.</span>
          : <><SpotifySlot size={12}/><span style={{ fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.45, textWrap: "pretty" }}>Already connected Spotify? Your library keeps filling the list automatically.</span></>}
      </div>
    </div>
  );
}

Object.assign(window, {
  NFEventRow, NF_EVENTS, nfShows, FollowFilterChip, NFBrowseChrome, BrowseNative,
  ArtistManageRow, FindArtistsRow, MyShowsArtists, MyShowsArtistsEmpty, MyShowsArtistsSpotifyFresh,
  ArtistPageScreen, FOLLOW_ANCHOR, FollowPaywallSheet, PremiumBenefitCard,
});
