// heroes-canvas.jsx — design canvas composition for spotlight heroes
//
// 4 sections:
//   1 · Full-bleed heroes in default electric theme (sized to match the
//       desktop spotlight hero area: 580 × 300)
//   2 · Strip-size previews (200 × 132) — what each hero looks like on the
//       /changelog spotlight strip
//   3 · Theme coverage — pick a few heroes and show across electric/jade/light
//   4 · Mounted-in-modal sanity check — one hero shown inside a real
//       SpotlightModal so we can see chrome + copy + CTA balance

const {
  ThemeProvider,
  DesignCanvas, DCSection, DCArtboard,
  SpotlightHeroV2, SH_HEROES, SpotlightModal,
} = window;

// ── Build a fake release per hero so SpotlightModal can mount ──
const HERO_RELEASES = {
  price: {
    version: "v0.6.0-beta",
    date: "Jun 2, 2026",
    spotlight: {
      title: "Submit a Price — and trust the price you see.",
      tagline: "Crawled, submitted, verified. Every price on Concert Crawl is something you can trace.",
      hero: "price",
      cta: "Submit a price",
      ctaHref: "#/submit-price",
      steps: [
        { caption: "Spot a price we don't have? Submit it from any event." },
        { caption: "Other crawlers verify. Once it's verified, it shows on the card." },
        { caption: "Submitted prices expire after 7 days. The signal stays fresh." },
      ],
      founderNote: "I've been quietly running this since the price block shipped — finally felt right to call it out. The map hero was running here by mistake. My bad.",
      founderSign: "— Hugh",
    },
    items: [],
  },
  tiers: {
    version: "v0.7.0-beta",
    date: "Jun 18, 2026",
    spotlight: {
      title: "Three tiers. Founder first.",
      tagline: "Pay if you can. Free always works. Founder seats close at 500.",
      hero: "tiers",
      cta: "See the tiers",
      ctaHref: "#/upgrade",
      steps: [
        { caption: "Supporter — calendar export, concert history, no nag screens." },
        { caption: "Premium — everything in Supporter, plus price-drop alerts and Spotify sync." },
        { caption: "Founder — limited to the first 500. Lifetime, badge, sticker in the post." },
      ],
      founderNote: "If you have the means and the app earned a place on your home screen, this is how you keep it lit. If not, free always works — that part isn't going away.",
      founderSign: "— Hugh",
    },
    items: [],
  },
  history: {
    version: "v0.8.0-beta",
    date: "Jul 5, 2026",
    spotlight: {
      title: "Every show you've ever been to, in one place.",
      tagline: "Concert History — your back catalog, finally.",
      hero: "history",
      cta: "Open history",
      ctaHref: "#/history",
      steps: [
        { caption: "We import what we can from your Spotify and ticket emails." },
        { caption: "Backfill the rest — search a band, pick the date, done." },
        { caption: "Year-end recap drops in December. Annual roll-up too." },
      ],
      founderNote: "I started this for myself, honestly. Lost track of how many times I'd seen Pile and that bugged me. Now the count is just there.",
      founderSign: "— Hugh",
    },
    items: [],
  },
  share: {
    version: "v0.9.0-beta",
    date: "Jul 20, 2026",
    spotlight: {
      title: "One tap. Post the show.",
      tagline: "Shareable cards built around each show's identity art. Three sizes, one tap.",
      hero: "share",
      cta: "Share a show",
      ctaHref: "#/share",
      steps: [
        { caption: "Tap share from any event detail. Story, square, or link size." },
        { caption: "Cards carry the show's identity art — same hash you see on Browse." },
        { caption: "Post anywhere. The card links back so friends land on the right show." },
      ],
      founderNote: "I want fans bringing fans, not the algorithm. These cards are designed to look great in a story without screaming 'app install'.",
      founderSign: "— Hugh",
    },
    items: [],
  },
  watchers: {
    version: "v0.6.1-beta",
    date: "Jun 9, 2026",
    spotlight: {
      title: "Who else is watching.",
      tagline: "A live count of the crawl on every show. No names. Just signal.",
      hero: "watchers",
      cta: "See it on a show",
      ctaHref: "#/event/amyl",
      steps: [
        { caption: "Open any event — the watcher count sits beside the price block." },
        { caption: "Updates live as people add the show to their Watching list." },
        { caption: "Names are never shown. Aggregate only." },
      ],
      founderNote: "This is the smallest, most useful number we've added. When you see 247 other people watching, the show suddenly feels real.",
      founderSign: "— Hugh",
    },
    items: [],
  },
  "passport-stamps": {
    version: "v1.0.0",
    date: "Aug 18, 2026",
    spotlight: {
      title: "Your passport. Built one show at a time.",
      tagline: "Concert Passport — every show you've been to, stamped onto a page you can share.",
      hero: "passport-stamps",
      cta: "Open passport",
      ctaHref: "#/passport",
      steps: [
        { caption: "Every attended show becomes a stamp on your passport page." },
        { caption: "Tap a stamp to see the night — venue, openers, your price." },
        { caption: "Share a page or a single stamp. It's yours." },
      ],
      founderNote: "Shipping this with the public launch. It's the most personal thing we've built — and the one I most want to see on someone else's phone.",
      founderSign: "— Hugh",
    },
    items: [],
  },
};

// ── Frame helpers ─────────────────────────────────────────────
function HeroFrame({ theme = "electric", w, h, hero, compact = false }) {
  return (
    <ThemeProvider theme={theme} style={{
      width: w, height: h,
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <SpotlightHeroV2 hero={hero} compact={compact}/>
      </div>
    </ThemeProvider>
  );
}

function StripFrame({ theme = "electric", hero }) {
  // Mirrors RNSpotlightStrip's left column geometry (200×132).
  return (
    <ThemeProvider theme={theme} style={{
      width: 200, height: 132,
      borderRadius: 10,
      border: "1px solid var(--border-strong)",
      overflow: "hidden",
      position: "relative",
      background: "var(--surface-2)",
    }}>
      <SpotlightHeroV2 hero={hero} compact={true}/>
    </ThemeProvider>
  );
}

// Inline hero contents — used as direct DCArtboard children. DCSection's
// child filter only recognises elements whose type is exactly DCArtboard,
// so we DON'T wrap. Instead, this helper produces the inner content
// (hero scene + corner key label) that gets dropped inside <DCArtboard>.
function HeroInner({ hero, theme = "electric", w, h, compact = false, keyName }) {
  return (
    <>
      <HeroFrame theme={theme} w={w} h={h} hero={hero} compact={compact}/>
      {keyName && (
        <div style={{
          position: "absolute",
          left: 12, bottom: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.14em", textTransform: "uppercase",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          padding: "4px 8px",
          borderRadius: 3,
          border: "1px solid rgba(255,255,255,0.1)",
          zIndex: 10,
          pointerEvents: "none",
        }}>hero · "{keyName}"</div>
      )}
    </>
  );
}

// ── Mounted-in-modal demo ─────────────────────────────────────
// Uses SpotlightModal's HeroOverride prop (added to the local copy of
// release-notes.jsx) to slot the V2 dispatcher in. Production wire-up is
// the same shape — modal stays generic, dispatcher decides what to mount.
function MountedModal({ release, theme = "electric" }) {
  const Hero = React.useMemo(
    () => () => <SpotlightHeroV2 hero={release.spotlight?.hero}/>,
    [release.spotlight?.hero]
  );
  return (
    <ThemeProvider theme={theme} style={{
      width: 620, height: 780,
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      <SpotlightModal release={release} onClose={() => {}} onCTA={() => {}} HeroOverride={Hero}/>
    </ThemeProvider>
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  const fullHeroes = [
    { key: "price",            label: "Submit a Price" },
    { key: "tiers",            label: "Upgrade flow + tier badges" },
    { key: "history",          label: "Concert History" },
    { key: "share",            label: "Shareable Show Cards" },
    { key: "watchers",         label: "Who Else Is Watching" },
    { key: "passport-stamps",  label: "Concert Passport · direction A (stamps)" },
    { key: "passport-stars",   label: "Concert Passport · direction B (constellation)" },
    { key: "venue-stamps",     label: "Venue Passport · direction A (stamps)" },
    { key: "venue-stars",      label: "Venue Passport · direction B (constellation)" },
  ];

  return (
    <DesignCanvas
      title="Spotlight Heroes · Concert Crawl"
      subtitle="Animated hero scenes for SpotlightModal. SVG + CSS keyframes only, themed via tokens, no external deps. Validating the visual language on the most novel features (price, tiers, history, share, watchers) and the passport pair (concert + venue) in two directions."
    >
      {/* ── 1 · Full-size heroes ── */}
      <DCSection
        id="full"
        title="1 · Full-size heroes  ·  electric theme"
        subtitle="Each hero sized 580×300 — the spotlight modal hero area on desktop. Hero key shown bottom-left for handoff. The 'map' hero is the existing one for reference; everything below is new."
      >
        <DCArtboard id="full-map" label="map (existing — reference)" width={580} height={300}>
          <HeroInner hero="map" w={580} h={300} keyName="map"/>
        </DCArtboard>
        {fullHeroes.map(h => (
          <DCArtboard key={h.key} id={`full-${h.key}`} label={h.label} width={580} height={300}>
            <HeroInner hero={h.key} w={580} h={300} keyName={h.key}/>
          </DCArtboard>
        ))}
      </DCSection>

      {/* ── 2 · Strip-size previews ── */}
      <DCSection
        id="strips"
        title="2 · Strip-size previews  ·  /changelog inline hero"
        subtitle="200×132 — the geometry of the spotlight strip in RNSpotlightStrip. Eyebrows + small labels hide; the central motif still has to read."
      >
        <DCArtboard id="strip-all" label="All heroes · strip size · electric" width={1240} height={520}>
          <ThemeProvider theme="electric" style={{
            width: 1240, height: 520,
            background: "var(--bg)",
            padding: 32,
            display: "grid",
            gridTemplateColumns: "repeat(5, 200px)",
            gridAutoRows: "min-content",
            gap: 28,
            justifyContent: "center",
            alignContent: "center",
          }}>
            {[{key:"map",label:"map"}, ...fullHeroes].map(h => (
              <div key={h.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <StripFrame theme="electric" hero={h.key}/>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 700,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  textAlign: "center",
                }}>{h.key}</div>
              </div>
            ))}
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      {/* ── 3 · Theme coverage ── */}
      <DCSection
        id="themes"
        title="3 · Theme coverage  ·  electric · jade · light"
        subtitle="The most expressive scenes across the 3 themes. Every color comes from tokens (--accent, --signal, --success, --fg, --fg-muted, --bg, --surface-*). If anything looks off in light theme it's the token, not the hero."
      >
        {["price", "tiers", "watchers", "passport-stamps", "passport-stars"].flatMap(key => [
          <DCArtboard key={`th-${key}-electric`} id={`th-${key}-electric`} label={`${key} · electric`} width={460} height={240}>
            <HeroFrame theme="electric" w={460} h={240} hero={key}/>
          </DCArtboard>,
          <DCArtboard key={`th-${key}-jade`} id={`th-${key}-jade`} label={`${key} · jade`} width={460} height={240}>
            <HeroFrame theme="jade" w={460} h={240} hero={key}/>
          </DCArtboard>,
          <DCArtboard key={`th-${key}-light`} id={`th-${key}-light`} label={`${key} · light`} width={460} height={240}>
            <HeroFrame theme="light" w={460} h={240} hero={key}/>
          </DCArtboard>,
        ])}
      </DCSection>

      {/* ── 4 · Mounted-in-modal sanity check ── */}
      <DCSection
        id="mounted"
        title="4 · Mounted in SpotlightModal  ·  in-context check"
        subtitle="One scene per hero, plus a few in jade/light so we can spot chrome conflicts (close button contrast, eyebrow legibility over the hero, CTA stacking). Real SpotlightModal — same as production."
      >
        <DCArtboard id="mm-price" label="price · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.price} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-tiers" label="tiers · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.tiers} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-history" label="history · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.history} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-share" label="share · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.share} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-watchers" label="watchers · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.watchers} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-passport-stamps" label="passport-stamps · electric" width={620} height={780}>
          <MountedModal release={HERO_RELEASES["passport-stamps"]} theme="electric"/>
        </DCArtboard>
        <DCArtboard id="mm-tiers-jade" label="tiers · jade" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.tiers} theme="jade"/>
        </DCArtboard>
        <DCArtboard id="mm-watchers-light" label="watchers · light" width={620} height={780}>
          <MountedModal release={HERO_RELEASES.watchers} theme="light"/>
        </DCArtboard>
      </DCSection>

      {/* ── 5 · Handoff notes ── */}
      <DCSection
        id="handoff"
        title="5 · Hero key contract"
        subtitle="What lives in spotlight-heroes.jsx and how it slots into release-notes.jsx."
      >
        <DCArtboard id="contract" label="Contract" width={1200} height={420}>
          <ThemeProvider theme="electric" style={{
            width: 1200, height: 420,
            background: "var(--bg)",
            padding: "36px 44px",
            color: "var(--fg)",
            fontFamily: "Inter, system-ui",
            display: "flex", flexDirection: "column", gap: 18,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700,
              color: "var(--signal)",
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>hero keys shipping in v0.6.x → v1.0</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: "var(--fg)",
              lineHeight: 1.7,
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "20px 24px",
              whiteSpace: "pre-wrap",
            }}>{`spotlight.hero = "price"             // 1 · Submit a Price
spotlight.hero = "tiers"             // 2 · Upgrade Flow + Tier Badges
spotlight.hero = "history"           // 3 · Concert History
spotlight.hero = "share"             // 5 · Shareable Show Cards
spotlight.hero = "watchers"          // 6 · Who Else Is Watching
spotlight.hero = "passport-stamps"   // 14 · Concert Passport (paper direction)
spotlight.hero = "passport-stars"    // 14 · Concert Passport (constellation direction)
spotlight.hero = "venue-stamps"      // 15 · Venue Passport (paper direction)
spotlight.hero = "venue-stars"       // 15 · Venue Passport (constellation direction)`}</div>

            <div style={{
              fontSize: 14, fontWeight: 500,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
              textWrap: "pretty",
            }}>
              Wire-up: replace the <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>SpotlightHero</code> import in
              {" "}<code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>release-notes.jsx</code> with
              {" "}<code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>SpotlightHeroV2</code> — it dispatches by key
              and falls back to the existing <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>"map"</code> hero
              for older releases.
              <br/><br/>
              Heroes 4 (calendar), 7 (spotify), 8 (artist-follow), 9 (price-drop alerts), 10 (setlist), 11 (venue guide), 12 (last-time-in-denver), and 13 (support act) deferred — pick winners from this set and we'll build that batch in a follow-up session.
            </div>
          </ThemeProvider>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
