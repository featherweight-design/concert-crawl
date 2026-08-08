// nf-canvas.jsx — the canvas itself. Lives in a file rather than an inline
// <script type="text/babel"> block: Babel standalone evaluates inline blocks
// before it finishes fetching src blocks, so an inline canvas ran before
// theme-context.jsx had assigned window.CC_THEME_KEYS and threw on first pass.

const { ThemeProvider, CC_THEMES, CC_THEME_KEYS } = window;
const { DesignCanvas, DCSection, DCArtboard } = window;
const { IOSDevice } = window;
const { NFNote, NotePaper, Mono, NFFollow, FollowingTag, FollowFilterChip, Screen, ScreenShell, Scrim,
  NFAppBar, NFTabBar, NFArt, ShelfFollowBadge } = window;
const { FollowStepGenres, FollowStepArtists, StarterShelf, ArtistSearchResults, BillFollowScreen, BulkFollowSheet } = window;
const { BrowseNative, MyShowsArtists, MyShowsArtistsEmpty, MyShowsArtistsSpotifyFresh, ArtistPageScreen,
  FollowPaywallSheet, PremiumBenefitCard } = window;
const { NotificationSettings, FirstWatchNudge, NudgeInContext, NUDGE_COPY, LockScreenMock, TrayRows, DigestEmail, DigestPlainText } = window;
const { NotificationSettingsDesktop, BrowseDesktop, MyShowsArtistsDesktop, FollowStepDesktop } = window;

const PW = 402, PH = 874, NW = 320, NH = 800, DW = 1280, DH = 880;

function Phone({ theme = "electric", w = PW, h = PH, children }) {
  return (
    <ThemeProvider theme={theme}>
      <IOSDevice width={w} height={h} dark={theme !== "light"}>
        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>{children}</div>
      </IOSDevice>
    </ThemeProvider>
  );
}
function PhoneOverlay({ theme = "electric", behind, children, w = PW, h = PH }) {
  return (
    <ThemeProvider theme={theme}>
      <IOSDevice width={w} height={h} dark={theme !== "light"}>
        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>{behind}</div>
          <Scrim/>{children}
        </div>
      </IOSDevice>
    </ThemeProvider>
  );
}
function Bezel({ children }) {
  return <div style={{ width: PW, height: PH, borderRadius: 48, background: "#000", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)" }}>{children}</div>;
}
function Desk({ theme = "electric", children }) {
  return (
    <ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}>{children}</div>
    </ThemeProvider>
  );
}
function Panel({ theme = "electric", children, pad = 22, gap = 16 }) {
  return (
    <ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui",
        padding: pad, display: "flex", flexDirection: "column", gap, overflowY: "auto" }}>{children}</div>
    </ThemeProvider>
  );
}
function EmailClient({ subject = "Your artists · week of Aug 21", children }) {
  return (
    <div style={{ width: 660, background: "#EDEBE6", borderRadius: 14, overflow: "hidden", border: "1px solid #D8D4CB" }}>
      <div style={{ padding: "14px 18px", background: "#FBFAF6", borderBottom: "1px solid #E3DFD4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 30, background: "linear-gradient(135deg,#7AE6FF,#FF7BD4)", flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#26241E" }}>Concert Crawl <span style={{ color: "#8A857A", fontWeight: 500 }}>&lt;hey@concertcrawl.app&gt;</span></div>
            <div style={{ fontSize: 12, color: "#8A857A" }}>to you · Fri 8:02 AM</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#26241E", marginTop: 10 }}>{subject}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Follow-state gallery ───────────────────────────────────────
function StateGallery() {
  const states = [
    ["idle", "Shipped skin, unchanged: --signal fill."],
    ["following", "Shipped skin, unchanged: --signal at 14% with a --signal border and check. A tinted BUTTON, not a mono chip — pairing a filled button with a chip made the two states read as different controls."],
    ["locked", "Reuses the shipped signed-out skin, plus a lock. Same size, position and label as idle. Never disabled — tapping opens the paywall."],
    ["pending", "Label swap only. No size change, so the row never reflows mid-tap."],
  ];
  return (
    <Panel gap={13}>
      <Mono color="var(--signal)" size={10}>NFFollow · four states</Mono>
      {states.map(([s, why]) => (
        <div key={s} style={{ padding: 13, borderRadius: 11, background: "var(--surface-1)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <NFFollow state={s} size="sm"/>
            <NFFollow state={s}/>
            <NFFollow state={s} iconOnly/>
            <div style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "var(--surface-3)" }}><ShelfFollowBadge state={s} size={30}/></div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{s}</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{why}</div>
        </div>
      ))}
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }}/>
      <Mono color="var(--signal)" size={10}>Shelf badge · the quiet variant</Mono>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
        Six filled Follow buttons across a discovery rail was too loud. In shelves and pickers the affordance collapses to a badge on the art — same two states, same gesture, no shouting. Full buttons stay for the artist page, search rows and the bill.
      </div>
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }}/>
      <Mono color="var(--signal)" size={10}>FollowingTag · read-only attribution</Mono>
      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
        <FollowingTag/><FollowingTag compact/><FollowingTag source="spotify"/>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
        On event rows this is the shipped RowMetaChip ("Following", tone=strong) from the event-row system — we only changed one thing: the Spotify logo is now conditional on followSource, where R1 hardcoded it. Native follows are unmarked; imported ones keep the mark, so a mixed list stays legible.
      </div>
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }}/>
      <Mono color="var(--signal)" size={10}>Scope chip · four states</Mono>
      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
        <FollowFilterChip state="off"/><FollowFilterChip state="on" count={7}/><FollowFilterChip state="locked"/>
        <span style={{ padding: "8px 12px", borderRadius: 999, border: "1px dashed var(--border-strong)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--fg-subtle)" }}>ABSENT AT 0</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
        "My artists", not "taste" — it filters on something you explicitly did. At zero follows the chip is <strong style={{ color: "var(--fg)" }}>absent</strong>, not empty and not locked: a scope that can only ever return nothing is a trap.
      </div>
    </Panel>
  );
}

// ── Dual-mode matrix ───────────────────────────────────────────
function DualModeMatrix() {
  const rows = [
    ["Follow affordance", "NFFollow", "NFFollow", "Identical"],
    ["Row attribution", "RowMetaChip \u201cFollowing\u201d", "same chip + Spotify mark", "One data field (followSource)"],
    ["Management surface", "My shows ▸ Artists", "My shows ▸ Artists + sync header", "One screen"],
    ["Browse scope chip", "My artists (absent at 0)", "My artists", "Identical"],
    ["Browse shelf", "Starter shelf → Your artists", "Your artists (never starter)", "Same slot, two payloads"],
    ["Notification prefs", "Settings ▸ Notifications", "Settings ▸ Notifications", "Identical — no connection-attached prefs"],
    ["Weekly digest", "Native template", "Native template", "Identical"],
    ["Zero state", "\"Nobody on your list.\"", "Never reached", "THE ONLY REAL FORK"],
  ];
  return (
    <Panel gap={0} pad={20}>
      <Mono color="var(--signal)" size={10} style={{ marginBottom: 12 }}>Flag off vs flag on</Mono>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", marginBottom: 6 }}>Native is the base shape.</div>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, marginBottom: 16, textWrap: "pretty" }}>
        Spotify becomes a <em>source</em> on native components, not a parallel IA. Every row below is one component with a <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "var(--signal)" }}>source</code> prop — except the last, which is the only place the two populations genuinely differ.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {["Surface", "Flag OFF (native)", "Flag ON (Spotify)"].map(h => (
          <div key={h} style={{ padding: "9px 11px", background: "var(--surface-2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-muted)" }}>{h}</div>
        ))}
        {rows.map((r, i) => (
          <React.Fragment key={r[0]}>
            <div style={{ padding: "10px 11px", borderTop: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--fg)" }}>{r[0]}</div>
            <div style={{ padding: "10px 11px", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>{r[1]}</div>
            <div style={{ padding: "10px 11px", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", fontSize: 11.5, color: i === rows.length - 1 ? "var(--warning)" : "var(--fg-muted)", lineHeight: 1.4 }}>{r[2]}</div>
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}

// ── Nudge comparison ───────────────────────────────────────────
function NudgeCompare({ variant }) {
  const c = NUDGE_COPY[variant];
  const rec = variant === "artist";
  return (
    <Panel gap={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Mono color={rec ? "var(--signal)" : "var(--fg-subtle)"} size={10}>{c.label}</Mono>
        {rec && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 4, color: "var(--signal)", border: "1px solid var(--signal)" }}>★ LEAN</span>}
      </div>
      <FirstWatchNudge variant={variant}/>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty", paddingTop: 4, borderTop: "1px solid var(--border)" }}>{c.why}</div>
      <div style={{ paddingTop: 4 }}><Mono size={9.5}>Free tier · paywall on tap</Mono></div>
      <FirstWatchNudge variant={variant} tier="free"/>
    </Panel>
  );
}

// ── Tweaks ─────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "electric",
  "surface": "browse-zero",
  "tier": "premium",
  "source": "native",
  "width": "390"
}/*EDITMODE-END*/;
const { TweaksPanel, useTweaks, TweakSection, TweakSelect, TweakRadio } = window;
const THEME_OPTS = CC_THEME_KEYS.map(k => ({ value: k, label: CC_THEMES[k].label }));

function liveSurface(t) {
  const narrow = t.width === "320";
  switch (t.surface) {
    case "onb-genres":   return <FollowStepGenres narrow={narrow}/>;
    case "onb-artists":  return <FollowStepArtists narrow={narrow} tier={t.tier}/>;
    case "browse-zero":  return <BrowseNative mode="zero" tier={t.tier} source={t.source}/>;
    case "browse-some":  return <BrowseNative mode="some" tier={t.tier} source={t.source}/>;
    case "browse-filt":  return <BrowseNative mode="filtered" tier={t.tier} source={t.source}/>;
    case "artists":      return t.source === "spotify" ? <MyShowsArtistsSpotifyFresh narrow={narrow}/> : <MyShowsArtists narrow={narrow} source={t.source}/>;
    case "artists-zero": return <MyShowsArtistsEmpty narrow={narrow} tier={t.tier}/>;
    case "artist-page":  return <ArtistPageScreen narrow={narrow} state={t.tier === "premium" || t.tier === "founder" ? "idle" : "locked"}/>;
    case "search":       return <ArtistSearchResults narrow={narrow} tier={t.tier}/>;
    case "bill":         return <BillFollowScreen tier={t.tier}/>;
    case "settings":     return <NotificationSettings narrow={narrow} tier={t.tier} source={t.source}/>;
    case "tray":         return <TrayRows/>;
    case "nudge":        return <NudgeInContext variant="artist" tier={t.tier}/>;
    default:             return <BrowseNative mode="zero" tier={t.tier}/>;
  }
}
function LiveTweaks() {
  const [t, setT] = useTweaks(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Live preview">
        <TweakSelect label="Surface" value={t.surface} onChange={v => setT("surface", v)} options={[
          { value: "onb-genres",   label: "Onboarding · genres" },
          { value: "onb-artists",  label: "Onboarding · bulk follow" },
          { value: "browse-zero",  label: "Browse · 0 follows" },
          { value: "browse-some",  label: "Browse · 7 follows" },
          { value: "browse-filt",  label: "Browse · scope on" },
          { value: "artists",      label: "My shows ▸ Artists" },
          { value: "artists-zero", label: "My shows ▸ Artists · empty" },
          { value: "artist-page",  label: "Artist page · follow block" },
          { value: "search",       label: "Search · follow inline" },
          { value: "bill",         label: "Event detail · the bill" },
          { value: "settings",     label: "Settings ▸ Notifications" },
          { value: "tray",         label: "Notifications tray" },
          { value: "nudge",        label: "First-watch nudge" },
        ]}/>
        <TweakSelect label="Tier" value={t.tier} onChange={v => setT("tier", v)} options={[
          { value: "premium", label: "Premium (paid)" },
          { value: "founder", label: "Founder (paid)" },
          { value: "supporter", label: "Supporter (paywall on tap)" },
          { value: "free", label: "Free (paywall on tap)" },
        ]}/>
        <TweakRadio label="Follow source" value={t.source} onChange={v => setT("source", v)} options={[
          { value: "native", label: "Native" }, { value: "spotify", label: "Spotify flag on" },
        ]}/>
        <TweakRadio label="Width" value={t.width} onChange={v => setT("width", v)} options={[
          { value: "390", label: "390" }, { value: "320", label: "320" },
        ]}/>
      </TweakSection>
      <TweakSection label="Theme">
        <TweakSelect label="Theme" value={t.theme} onChange={v => setT("theme", v)} options={THEME_OPTS}/>
      </TweakSection>
    </TweaksPanel>
  );
}
function LivePhone() {
  const [t] = useTweaks(TWEAK_DEFAULTS);
  const narrow = t.width === "320";
  return <Phone theme={t.theme} w={narrow ? NW : PW} h={narrow ? NH : PH}>{liveSurface(t)}</Phone>;
}

// ── Canvas ─────────────────────────────────────────────────────
function App() {
  return (
    <>
      {/* DesignCanvas takes only children/minScale/maxScale/style — a title or
          subtitle passed here is silently dropped, so the framing lives in the
          first DCSection's subtitle, which does render. */}
      <DesignCanvas>

        <DCSection id="live" title="Native artist following"
          subtitle="⚠️ ALL COPY IS PLACEHOLDER — every user-facing string here is a structural stand-in that sizes the layout and proves the state machine. It needs a pass from the copy-writer before build. · Replacing Spotify-powered personalization with following you do in our app. Native is the base information architecture and Spotify becomes a source prop on it — one component set, one settings screen, one digest; the only genuine fork is the zero state. Every screen is the SHIPPED component with a follow layer added, not a lookalike: real FilterBar + EventRowList on Browse, real EventDetail (one new billBlock prop), real ArtistPageMobile, real IdentityArt. Following is Premium-gated (paywall on tap, button never disabled). Token-only across Electric / Jade / Light; --signal = CTA + status, --accent stays reserved for Watching a show, so Following never borrows it. Mobile 390 + 320 and desktop ship together. · Flip surface · tier · source · width · theme in the Tweaks panel.">
          <DCArtboard id="live-phone" label="Responds to Tweaks" width={PW} height={PH}><LivePhone/></DCArtboard>
          <DCArtboard id="live-answers" label="The five questions, answered" width={340} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="warn" title="Copy is placeholder — route to the copy-writer" items={[
                "Every user-facing string in this handoff is a STRUCTURAL stand-in: it sizes the layout and proves the state machine, it is not shipping copy. Headlines, body, button labels, empty-state voice, push copy, digest subject lines and the Premium benefit wording all need a pass from the copy-writer.",
                "Two things here are design decisions, not copy: the vocabulary (Watching = shows, Following = artists, ‘My artists’ = the Browse scope) and the promise structure of the alert rows (crawl-triggered, never scheduled). Keep those; rewrite everything around them.",
              ]}/>
              <NFNote tone="warn" title="Built on the shipped components, not lookalikes" items={[
                "Browse renders the real FilterBar chrome from browse-home.jsx and the real EventRowList (surface=browse) from design_handoff_event_row_system.",
                "Event detail is the real EventDetail from design_handoff_event_detail_v2. The only change is one new optional prop, billBlock, rendered directly under the Watch CTA.",
                "The artist page is the real ArtistPageMobile from design_handoff_artist_page, with two pass-through props added: followState and followers.",
                "Art is the real IdentityArt from Phase 7.5 — no stand-in gradients anywhere in this pass.",
              ]}/>
              <NFNote tone="note" title="1 · Discovery + cold start" items={[
                "Three on-ramps, cheapest first: an onboarding step (genres → suggested artists, multi-select, one commit), follow-from-search-results (search already indexes artists — no new route), and follow-the-bill on event detail where discovery actually happens.",
                "Day one with zero follows: the Browse shelf slot RECRUITS instead of apologising. Same geometry as the Spotify taste shelf, different job. The scope chip is absent, not empty.",
              ]}/>
              <NFNote tone="note" title="2 · Notification preferences" items={[
                "Nothing new. Two rows added to the shipped Settings ▸ Notifications list, above Watch updates — an announcement is the earliest signal in the chain, so top-down reads like the funnel runs.",
                "Auto-watch demoted to a sub-row of New show alerts. It's a modifier on an alert, not a peer setting.",
              ]}/>
              <NFNote tone="note" title="3 · Dual-mode" items={[
                "Not a reskin, and not a different shape either: native is the base and Spotify is a source prop. See the matrix in §8.",
              ]}/>
              <NFNote tone="note" title="4 · Premium" items={[
                "Following takes the headline slot; Spotify sync drops to a fine-print line for the connected few. See §7.",
              ]}/>
              <NFNote tone="note" title="5 · First-watch nudge" items={[
                "Three directions in §6. Lean: artist-anchored — the artist is already on screen, so the first follow is one tap instead of a trip to a picker.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="coldstart" title="1 · Cold start — making the first follows cheap"
          subtitle="Spotify imported 100+ artists in one tap; native adds one at a time. Every surface here exists to close that gap. The onboarding step is the big one: genres narrow the field, then a grid of artists who already have Denver dates, multi-select, one commit at the end. The tile IS the checkbox — a 12-artist grid is 12 targets, not 24.">
          <DCArtboard id="cs-genres" label="Onboarding · step 6 of 8 · genres" width={PW} height={PH}><Phone><FollowStepGenres/></Phone></DCArtboard>
          <DCArtboard id="cs-artists" label="Onboarding · step 7 of 8 · bulk follow" width={PW} height={PH}><Phone><FollowStepArtists/></Phone></DCArtboard>
          <DCArtboard id="cs-artists-320" label="Bulk follow · 320" width={NW} height={NH}><Phone w={NW} h={NH}><FollowStepArtists narrow/></Phone></DCArtboard>
          <DCArtboard id="cs-artists-free" label="Bulk follow · Free (picks held)" width={PW} height={PH}><Phone><FollowStepArtists tier="free"/></Phone></DCArtboard>
          <DCArtboard id="cs-desk" label="Bulk follow · desktop" width={DW} height={DH}><Desk><FollowStepDesktop/></Desk></DCArtboard>
          <DCArtboard id="cs-search" label="Search · follow from the result row" width={PW} height={PH}><Phone><ArtistSearchResults/></Phone></DCArtboard>
          <DCArtboard id="cs-search-desk" label="Search · desktop" width={DW} height={DH}><Desk><window.ArtistSearchDesktop/></Desk></DCArtboard>
          <DCArtboard id="cs-bill" label="Event detail · follow the bill" width={PW} height={PH}><Phone><BillFollowScreen/></Phone></DCArtboard>
          <DCArtboard id="cs-bill-free" label="Bill · Free/Supporter (one paywall)" width={PW} height={PH}><Phone><BillFollowScreen tier="supporter"/></Phone></DCArtboard>
          <DCArtboard id="cs-bill-desk" label="Bill · desktop (in the rail)" width={DW} height={DH}><Desk><window.BillFollowDesktop/></Desk></DCArtboard>
          <DCArtboard id="cs-bulk-sheet" label="Bulk-follow sheet" width={PW} height={PH}><PhoneOverlay behind={<BillFollowScreen/>}><BulkFollowSheet/></PhoneOverlay></DCArtboard>
          <DCArtboard id="cs-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="warn" title="Onboarding track is being reopened" items={[
                "CLAUDE.md §7 marks onboarding COMPLETE. Hugh reopened it for this. CORRECTED: the shipped flow is ALREADY six steps (welcome · how · today · theme · notyet · done), so adding two makes EIGHT, not six. R2's note said 'steps 4–5 of 6' and silently dropped theme and notyet — that was a miscount on our side, not a proposed cut. Follow now sits at steps 6 and 7: welcome · how · today · theme · notyet · genres · artists · done. Both new steps are skippable and neither blocks sign-in.",
                "Eight steps is a long flow. If that's too long, the fix is a product decision about which EXISTING step to cut, not about squeezing the follow step — say the word and we'll draw it.",
                "Genres are a NARROWING device only — they seed the suggestion query, they are not stored as a taste profile. Don't build a genre-preferences table off this.",
              ]}/>
              <NFNote title="Cold start" items={[
                "Suggestion query = artists with an upcoming Denver date, filtered by picked genres, ordered by follower count. Every suggestion is followable by construction.",
                "Multi-select is one write at commit, not N writes as you tap — a 10-artist pick is one request and one undo.",
                "Free / Supporter: selection is allowed, commit is paywalled, and the picks survive the upgrade round-trip. Losing a 10-artist selection to a paywall is the worst version of this screen.",
                "Search: 'Artists' section leads 'Shows' when the query matches an artist name. Every result is followable by construction — search filters to artists with at least one visible event, so a zero-show artist can never appear. An artist with PAST Denver shows and no upcoming date does appear, and gets a normal live Follow button.",
                "The bill locks as ONE unit below Premium: 'Follow all N' and the per-row buttons gate together, so a 4-act bill is one paywall and one tap, not four. Above Premium the rows stay independent for partial follows.",
                "Desktop bill block lives in the detail page's RAIL, under the Watch button — same adjacency as mobile. In the wide column it would be 700px from the decision it follows.",
              ]}/>
              <NFNote title="A11y" items={[
                "Artist tiles are role=checkbox + aria-checked; the grid is a labelled group. Selection is check glyph + border + fill, never colour alone.",
                "Commit button text carries the count ('Follow 4 artists'), so the number is announced, not just seen.",
                "Icon-only NFFollow (320 + desktop grids) carries aria-label; every variant is ≥44px except the sm row button at 32px paired with a full-row tap target.",
                "'Follow all 3' on the bill announces the resulting count, and each row keeps its own button for partial follows.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="dayone" title="2 · Day one with zero follows"
          subtitle="The honest problem: with no follows, the discovery shelf has nothing to say and the scope filter matches nothing. Answer — the shelf slot changes JOB rather than going empty, and the chip disappears rather than lying. Nothing on Browse ever renders an apology.">
          <DCArtboard id="d1-zero" label="Browse · 0 follows (starter shelf)" width={PW} height={PH}><Phone><BrowseNative mode="zero"/></Phone></DCArtboard>
          <DCArtboard id="d1-zero-320" label="Browse · 0 follows · 320" width={NW} height={NH}><Phone w={NW} h={NH}><BrowseNative mode="zero"/></Phone></DCArtboard>
          <DCArtboard id="d1-some" label="Browse · 7 follows (your artists)" width={PW} height={PH}><Phone><BrowseNative mode="some"/></Phone></DCArtboard>
          <DCArtboard id="d1-filt" label="Browse · scope on (3 shows)" width={PW} height={PH}><Phone><BrowseNative mode="filtered"/></Phone></DCArtboard>
          <DCArtboard id="d1-empty" label="Artists tab · nobody yet" width={PW} height={PH}><Phone><MyShowsArtistsEmpty/></Phone></DCArtboard>
          <DCArtboard id="d1-desk-zero" label="Browse · 0 follows · desktop" width={DW} height={DH}><Desk><BrowseDesktop mode="zero"/></Desk></DCArtboard>
          <DCArtboard id="d1-desk-some" label="Browse · 7 follows · desktop" width={DW} height={DH}><Desk><BrowseDesktop mode="some"/></Desk></DCArtboard>
          <DCArtboard id="d1-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="The slot, not the shelf" items={[
                "Spotify's 'Based on your taste' shelf and the native 'Your artists' shelf are the SAME slot at the top of Browse. At zero follows that slot renders the starter shelf instead. One region, three payloads — eng ships one component with a mode.",
                "Starter shelf content = artists with upcoming Denver dates, follower-count ordered, shuffled per session so it isn't the same six forever. No taste data required, which is the point.",
                "Once you have ≥1 follow the starter shelf never comes back, even at 1 follow. From then on the shelf header carries only an 'All →' link to the Artists tab, and recruiting more artists is the 'Find artists to follow' row inside that tab.",
              ]}/>
              <NFNote title="Empty states, per the Hybrid contract" items={[
                "Artists tab zero state uses the Hybrid anatomy: mono status word ('NO ONE YET'), short headline, one informative line, a real destination as primary. No chip suggestions — both routes are known-static.",
                "Voice check: 'Nobody on your list.' sits with 'Crickets.' and 'Empty queue.' — playful, still clear about state.",
                "Scoped-Browse end card ('That's all 3.') is a terminus, not an empty state — the list has content, it just ended.",
              ]}/>
              <NFNote title="A11y" items={[
                "Scope banner is role=status so flipping the chip announces the new count.",
                "The chip going absent at 0 must not shift focus — it's absent from first render for a 0-follow user, never removed mid-session (following your first artist is a navigation away from Browse).",
                "Horizontal shelves are keyboard-reachable and don't trap focus; each card is a link named artist + venue + date.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="system" title="3 · The follow affordance"
          subtitle="One button, FOUR states, and a read-only tag for everywhere the follow is context rather than an action. --accent is reserved for Watching a show (settled in the Spotify R1 audit) so Following never borrows it — the disambiguator is shape and copy, not colour.">
          <DCArtboard id="sys-states" label="NFFollow · FollowingTag · scope chip" width={430} height={PH}><StateGallery/></DCArtboard>
          <DCArtboard id="sys-artist-idle" label="Artist page · not following" width={PW} height={PH}><Phone><ArtistPageScreen state="idle"/></Phone></DCArtboard>
          <DCArtboard id="sys-artist-following" label="Artist page · following" width={PW} height={PH}><Phone><ArtistPageScreen state="following"/></Phone></DCArtboard>
          <DCArtboard id="sys-artist-locked" label="Artist page · Free (locked)" width={PW} height={PH}><Phone><ArtistPageScreen state="locked"/></Phone></DCArtboard>
          <DCArtboard id="sys-artist-nodates" label="Artist page · no upcoming date" width={PW} height={PH}><Phone><ArtistPageScreen state="nodates"/></Phone></DCArtboard>
          <DCArtboard id="sys-paywall" label="Paywall on tap" width={PW} height={PH}><PhoneOverlay behind={<ArtistPageScreen state="locked"/>}><FollowPaywallSheet/></PhoneOverlay></DCArtboard>
          <DCArtboard id="sys-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="warn" title="For eng" items={[
                "The paywall sheet here is a MOCK of the anatomy. Ship <MiniPaywall anchor={FOLLOW_ANCHOR}/> from design_handoff_monetization_tier_states/monetization-paywall.jsx — FOLLOW_ANCHOR is exported from nf-following.jsx. Don't fork the paywall.",
                "Logged-out follow tap goes to the tier picker, not this sheet (per the brief). Same button, different destination.",
                "R2's fifth state ('unavailable') is DELETED. Artists are a projection off event billing strings, so an artist row only exists because a crawl found them on a bill: a zero-show artist can't exist, can't appear in search, and has no page (the detail endpoint 404s). There was nothing to render it on.",
                "What replaced it: 'played Denver before, nothing upcoming' — real, common, and the clearest case for the feature. A live Follow button, plus a muted 'no dates announced' line in artist ROWS (search, shelves, the Artists tab). Same treatment as the Artists tab's 'nothing on the books' group.",
                "CORRECTED: this needs NO change to the shipped artist page. An earlier note claimed the hasShows guard hid the follow block in this case; it doesn't. With no upcoming shows the page renders EmptyUpcoming, which already carries its own inline FollowButton and its own copy for exactly this case (shipped with #1115), and on desktop the sticky rail's FollowBlock was never gated on hasShows at all. Keep the guard; the only change is threading followState into EmptyUpcoming so locked and pending render there. Lifting it would put TWO live follows on one screen.",
                "No follower count. R2 drew one; it's new API work and production has zero manual follows, so it would read 0–2 for months and undercut the artist it was meant to vouch for. Revisit when the numbers are real.",
              ]}/>
              <NFNote title="Why 'following' is the quiet state" items={[
                "The state we want tapped is the one that isn't done yet, so idle gets the fill and following gets the outline. This also keeps a 12-row list from being twelve --signal blocks.",
                "The artist page keeps ONE live follow affordance, held by two guards from design_handoff_artist_page R2: showFollow on the sticky sub-header, and hasShows on FollowBlock. If the empty-upcoming block is showing, the follow lives inside it — never both.",
              ]}/>
              <NFNote title="A11y" items={[
                "aria-pressed on the button reflects following; SR reads 'Follow, button, not pressed' / 'Following, button, pressed'.",
                "Locked sets NO aria-disabled at all: a lock glyph plus aria-describedby pointing at the gate sentence. Tapping must open the paywall, so the control stays in the tab order and stays activatable. R2 set aria-disabled on the scope chip, contradicting this; fixed. There is no disabled access state in the entitlements model.",
                "The gate is one helper, nfLocked(tier) = free || supporter. R2 tested tier === 'free' inline on six surfaces, which leaked a live Follow button to Supporter. Never test the tier string directly.",
                "Pending swaps the label only; no width change, so the target doesn't move under a finger mid-tap.",
                "The lg follow button is 48px; sm is 32px and only used where the whole row is also a target.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="manage" title="4 · Where follows live — My shows ▸ Artists"
          subtitle="Hugh's call: tuck following into the existing My shows surface next to Watching and History rather than spend a fifth nav slot on it. The tab is 'Artists' (the noun you manage); the verb everywhere else stays 'Following'. Two groups — playing Denver, and nothing on the books — because a followed artist with no date isn't a failure, it's the whole point of following them.">
          <DCArtboard id="mg-mobile" label="Artists · 7 followed" width={PW} height={PH}><Phone><MyShowsArtists/></Phone></DCArtboard>
          <DCArtboard id="mg-320" label="Artists · 320" width={NW} height={NH}><Phone w={NW} h={NH}><MyShowsArtists narrow/></Phone></DCArtboard>
          <DCArtboard id="mg-empty" label="Artists · empty" width={PW} height={PH}><Phone><MyShowsArtistsEmpty/></Phone></DCArtboard>
          <DCArtboard id="mg-spotify" label="Artists · Spotify flag ON (112 imported)" width={PW} height={PH}><Phone><MyShowsArtistsSpotifyFresh/></Phone></DCArtboard>
          <DCArtboard id="mg-mixed" label="Artists · mixed native + imported" width={PW} height={PH}><Phone><MyShowsArtists source="spotify"/></Phone></DCArtboard>
          <DCArtboard id="mg-desk" label="Artists · desktop" width={DW} height={DH}><Desk><MyShowsArtistsDesktop/></Desk></DCArtboard>
          <DCArtboard id="mg-desk-empty" label="Artists · desktop · empty" width={DW} height={DH}><Desk><MyShowsArtistsDesktop empty/></Desk></DCArtboard>
          <DCArtboard id="mg-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="warn" title="Open with Hugh — one naming decision" items={[
                "The mobile tab bar is browse · search · watching · me, but this screen is titled 'My shows' with Watching / Artists / History tabs. The bottom-nav label and the screen title disagree today. Recommend the nav tab reads 'my shows' once Artists lands — 'watching' naming a screen that also holds artists and history is the drift. Vocabulary table in CLAUDE.md §4a needs the same edit.",
                "Not proposing any change to the Watching concept itself — that stays the only word for tracking a show.",
              ]}/>
              <NFNote tone="note" title="Structure" items={[
                "Two groups, not one list: 'playing Denver' (date in --signal — the payoff) then 'nothing on the books' (muted). Sorted by soonest date, then alphabetically.",
                "The alerts row at the bottom is a deep link into Settings ▸ Notifications with its current state as the meta line. It is not a second place to change the setting.",
                "The 'Find artists to follow' row opens the same suggestion picker as onboarding step 7 — one picker, two entry points. It's a labelled row, not a '+ Follow more' button: sitting under a column of Following buttons, a button read like it might follow everything at once.",
                "Unfollow is the same button, tapped again. No confirm: it's cheap and reversible, and the artist stays on screen until you navigate away.",
              ]}/>
              <NFNote title="A11y" items={[
                "Tabs are a real tablist with aria-selected + arrow-key nav; the count is inside the tab's accessible name ('Artists, 7').",
                "Group headings are h2s so SR users can jump between playing / not playing.",
                "The imported footnote is associated with the list, not decorative — an SR user needs to know unfollowing here won't touch Spotify.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="prefs" title="5 · Notification preferences + what actually fires"
          subtitle="Two rows into the shipped Settings ▸ Notifications screen. New show alerts sits above Watch updates because an announcement is the earliest signal in the chain, and auto-watch becomes a sub-row of it rather than a peer. Alerts are crawl-triggered, so the copy says so — no 'every Friday' promise on something that fires when we find it.">
          <DCArtboard id="pf-mobile" label="Settings ▸ Notifications" width={PW} height={PH}><Phone><NotificationSettings/></Phone></DCArtboard>
          <DCArtboard id="pf-320" label="Settings · 320" width={NW} height={NH}><Phone w={NW} h={NH}><NotificationSettings narrow/></Phone></DCArtboard>
          <DCArtboard id="pf-locked" label="Settings · Free (group locked)" width={PW} height={PH}><Phone><NotificationSettings tier="free"/></Phone></DCArtboard>
          <DCArtboard id="pf-spotify" label="Settings · Spotify flag ON" width={PW} height={PH}><Phone><NotificationSettings source="spotify"/></Phone></DCArtboard>
          <DCArtboard id="pf-desk" label="Settings ▸ Notifications · desktop" width={DW} height={DH}><Desk><NotificationSettingsDesktop/></Desk></DCArtboard>
          <DCArtboard id="pf-desk-locked" label="Settings · desktop · Free" width={DW} height={DH}><Desk><NotificationSettingsDesktop tier="free"/></Desk></DCArtboard>
          <DCArtboard id="pf-push-1" label="Push · alert only (auto-watch off)" width={PW} height={PH}><Bezel><LockScreenMock variant="autoOff"/></Bezel></DCArtboard>
          <DCArtboard id="pf-push-2" label="Push · auto-watch on · Android" width={PW} height={PH}><Bezel><LockScreenMock variant="autoOn" platform="android"/></Bezel></DCArtboard>
          <DCArtboard id="pf-push-3" label="Push · batched (3 at once)" width={PW} height={PH}><Bezel><LockScreenMock variant="many"/></Bezel></DCArtboard>
          <DCArtboard id="pf-tray" label="In-app tray (post-#737)" width={PW} height={PH}><Phone><TrayRows/></Phone></DCArtboard>
          <DCArtboard id="pf-email" label="Weekly digest · native" width={700} height={900}>
            <div style={{ width: "100%", height: "100%", background: "#DEDBD3", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 18, overflowY: "auto" }}>
              <EmailClient><DigestEmail/></EmailClient>
            </div>
          </DCArtboard>
          <DCArtboard id="pf-email-zero" label="Digest · quiet week" width={700} height={700}>
            <div style={{ width: "100%", height: "100%", background: "#DEDBD3", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 18, overflowY: "auto" }}>
              <EmailClient subject="A quiet week for your artists"><DigestEmail zero/></EmailClient>
            </div>
          </DCArtboard>
          <DCArtboard id="pf-email-text" label="Plain-text part" width={470} height={480}>
            <Panel pad={18} gap={10}><Mono size={9.5}>text/plain</Mono><DigestPlainText/></Panel>
          </DCArtboard>
          <DCArtboard id="pf-email-text-zero" label="Plain-text part · quiet week" width={470} height={400}>
            <Panel pad={18} gap={10}><Mono size={9.5}>text/plain · zero</Mono><DigestPlainText zero/></Panel>
          </DCArtboard>
          <DCArtboard id="pf-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Why no new settings section" items={[
                "The Spotify build hung auto-watch, push and digest off the connection. A native follower has no connection, and these are the same class of promise as Watch updates — so they belong in the same list, grouped 'Artists you follow' / 'Shows you're watching'.",
                "Auto-watch is a modifier on an alert, not a peer setting. Sub-row, indented, only meaningful when its parent is on.",
                "Free / Supporter: the whole artist group renders as one locked card with an upgrade route — not four dead toggles.",
              ]}/>
              <NFNote tone="warn" title="Crawl-triggered, not scheduled" items={[
                "Copy must not imply a schedule: 'Sent when we find it, not on a schedule.' Batching (the 3-at-once push) needs a debounce window from eng — a big crawl run shouldn't fire eight pushes in ninety seconds. Recommend batching anything within one crawl run into a single notification.",
                "The weekly digest keeps its Friday cadence and is the only scheduled thing here. It's a recap, not the alert.",
                "CLAUDE.md logs a 'no we'll-notify-you promises until notifications ship' rule. These screens make the promise, so they can't land before delivery does (#737).",
              ]}/>
              <NFNote title="Digest + A11y" items={[
                "Email uses inline hex (electric-derived) — the token rule governs app screens, not email. Same exception the Spotify digest took.",
                "Quiet week still sends, light, with two follow suggestions: it keeps the habit and recruits at the same time. Never a blank send.",
                "Unsubscribe is per-family first ('turn off the weekly digest') with global email settings secondary.",
                "Toggles are role=switch + aria-checked, labelled by the row title, described by the body line. Every row ≥44px.",
                "Tray unread = dot + bold weight, never colour alone; the kind eyebrow ('NEW DATE' / 'PRICE DROP') is real read text.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="nudge" title="6 · The first-watch nudge"
          subtitle="Fires once, right after a user's first Watch. Today it's a Spotify pitch end to end — logo, headline, CTA. Three replacements, all keeping the single-fire rule and the dismissable geometry; they differ in what the ask IS. ★ = my lean.">
          <DCArtboard id="nu-a" label="A · Artist-anchored ★" width={420} height={700}><NudgeCompare variant="artist"/></DCArtboard>
          <DCArtboard id="nu-b" label="B · Alert-anchored" width={420} height={700}><NudgeCompare variant="alerts"/></DCArtboard>
          <DCArtboard id="nu-c" label="C · No card — inline" width={420} height={700}><NudgeCompare variant="inline"/></DCArtboard>
          <DCArtboard id="nu-context" label="A · in context on Browse" width={PW} height={PH}><Phone><NudgeInContext variant="artist"/></Phone></DCArtboard>
          <DCArtboard id="nu-notes" label="Notes" width={330} height={700}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Recommendation: A" items={[
                "The artist is already on screen — the user just watched their show — so A makes the first follow one tap with zero search. B is a better sentence but a worse funnel: it routes to a picker, so the first follow is two screens away.",
                "C is the safest and the weakest. The nudge slot is the one moment we know a new user is paying attention; spending it on nothing is a waste.",
                "A and C aren't exclusive. Ship A as the nudge and C's inline row on the watch confirmation as the permanent, non-nagging path.",
              ]}/>
              <NFNote title="Rules that survive the pivot" items={[
                "Single-fire, dismissable, never reappears — the R1 no-nag rule.",
                "Free tier still gets the nudge, with the lock on the CTA. It's a discovery moment for the paid perk at a natural point, matching the hybrid-gating call.",
                "No surveillance voice. 'You just watched their Gothic Theatre date' is a receipt for something the user did. Never 'we noticed you…'.",
              ]}/>
              <NFNote title="A11y" items={[
                "Dismiss is a real 44px button with aria-label='Dismiss'; the card is not a focus trap.",
                "The card announces once on appear (role=status), not on every Browse render.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
          <DCArtboard id="nu-desk" label="Desktop · replaces the rail's watch card" width={DW} height={DH}><Desk><window.FirstWatchNudgeDesktop/></Desk></DCArtboard>
        </DCSection>

        <DCSection id="premium" title="7 · What Premium promises instead"
          subtitle="Premium currently headlines 'Spotify sync: your library, your shows' — a benefit capped at five accounts. Following takes the slot, phrased as the outcome rather than the mechanic. Spotify survives as a fine-print line for the connected few, which is honest and costs nothing.">
          <DCArtboard id="pr-before" label="Before · selling a dead feature" width={400} height={430}><Panel pad={24}><PremiumBenefitCard variant="before"/></Panel></DCArtboard>
          <DCArtboard id="pr-after" label="After · following headlines" width={400} height={430}><Panel pad={24}><PremiumBenefitCard variant="after"/></Panel></DCArtboard>
          <DCArtboard id="pr-notes" label="Notes" width={330} height={430}>
            <NotePaper><NFNote tone="note" title="Copy" items={[
              "'Follow artists — get a heads-up when they play Denver' leads with the outcome, not the mechanic. The mechanic (following) is the bullet; the payoff (hearing about it) is the promise.",
              "Concert History moves up into the visible set now that the top line isn't spent on Spotify.",
              "Full tier-page copy is the copy-editor's; this is the benefit ORDER and the headline claim. 17 sections of Spotify-named strings still need the sweep — flagging, not owning.",
            ]}/></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="dual" title="8 · Dual-mode + theme parity"
          subtitle="Flag on and flag off run through one component set. The matrix names every surface and what actually differs — one row genuinely forks. Theme parity is token-only across Electric / Jade / Light; flip all three in Tweaks to verify the rest.">
          <DCArtboard id="du-matrix" label="Flag off vs flag on" width={620} height={560}><DualModeMatrix/></DCArtboard>
          <DCArtboard id="du-jade" label="Browse · 0 follows · Jade" width={PW} height={PH}><Phone theme="jade"><BrowseNative mode="zero"/></Phone></DCArtboard>
          <DCArtboard id="du-light" label="Artists tab · Light" width={PW} height={PH}><Phone theme="light"><MyShowsArtists/></Phone></DCArtboard>
          <DCArtboard id="du-light-set" label="Settings · Light" width={PW} height={PH}><Phone theme="light"><NotificationSettings/></Phone></DCArtboard>
          <DCArtboard id="du-jade-empty" label="Artists · empty · Jade" width={PW} height={PH}><Phone theme="jade"><MyShowsArtistsEmpty/></Phone></DCArtboard>
          <DCArtboard id="du-light-desk" label="Browse · desktop · Light" width={DW} height={DH}><Desk theme="light"><BrowseDesktop mode="some"/></Desk></DCArtboard>
          <DCArtboard id="du-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Dual-mode contract" items={[
                "One component set, one settings screen, one digest template, one management surface. Spotify is source=\"spotify\" — it adds the logo slot and a sync header, it does not add a screen.",
                "That means the flag flipping ON for a user is additive, never a re-navigation: their Artists tab is the same tab, just pre-filled. Flipping OFF (if we ever revoke) leaves a populated native list, not a broken screen.",
                "The Spotify logo slot is a PLACEHOLDER for the official asset (never a redrawn mark), same contract as spotify-shared.jsx. Spotify green is not an app colour — the only green is inside the official file.",
              ]}/>
              <NFNote title="Theme parity" items={[
                "Every colour is a token. --signal carries CTAs and the 'has a date' state; --accent appears only in the wordmark, the CCMark halo and Watching affordances.",
                "Light needs the check-glyph-plus-border treatment on selected tiles to hold AA — the fill alone is too close to the surface. Verified on the Light artboards here.",
                "Identity art here is a stand-in. Production swaps <IdentityArt namespace=\"artist\"/> from design_handoff_phase7_5_identity_imagery at the same sizes and crops.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

      </DesignCanvas>
      <LiveTweaks/>
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
