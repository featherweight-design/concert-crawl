// price-concepts-canvas.jsx — direction-exploration canvas
//
// 3 concepts × multiple palettes, plus mounted-in-modal sanity check for the
// strongest direction (let Hugh pick).

const {
  ThemeProvider,
  DesignCanvas, DCSection, DCArtboard,
  IA_PALETTES,
  PriceConceptA, PriceConceptB, PriceConceptC,
  SpotlightModal,
} = window;

const HERO_W = 580, HERO_H = 300;

// Pick a representative subset: 2 light papers + 2 dark papers
const PALETTE_PICKS = {
  p0: IA_PALETTES.find(p => p.id === "p0"), // light · fuchsia + cobalt
  p1: IA_PALETTES.find(p => p.id === "p1"), // light · tangerine + teal
  p4: IA_PALETTES.find(p => p.id === "p4"), // dark  · ember + aqua
  p5: IA_PALETTES.find(p => p.id === "p5"), // dark  · gold + marine
  p6: IA_PALETTES.find(p => p.id === "p6"), // dark  · violet + lime
  p7: IA_PALETTES.find(p => p.id === "p7"), // light · cobalt + coral
};

// Wrapper to render a hero in a fixed-size box without theme tokens
// (the art is theme-INDEPENDENT — paper palette comes from IA_PALETTES).
function HeroBox({ w = HERO_W, h = HERO_H, children, label, palette }) {
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}>
      {children}
      <div style={{
        position: "absolute",
        left: 12, bottom: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 800,
        color: "rgba(0,0,0,0.85)",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(6px)",
        padding: "4px 8px",
        borderRadius: 3,
        letterSpacing: "0.14em", textTransform: "uppercase",
        zIndex: 20,
        pointerEvents: "none",
      }}>{label}</div>
      {palette && (
        <div style={{
          position: "absolute",
          right: 10, top: 10,
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 6px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
          borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, fontWeight: 800,
          color: "rgba(0,0,0,0.85)",
          letterSpacing: "0.14em",
          zIndex: 20,
          pointerEvents: "none",
        }}>
          <span style={{ width: 8, height: 8, background: palette.bg, border: "1px solid rgba(0,0,0,0.3)" }}/>
          <span style={{ width: 8, height: 8, background: palette.primary }}/>
          <span style={{ width: 8, height: 8, background: palette.secondary }}/>
          <span style={{ paddingLeft: 4 }}>{palette.id}</span>
        </div>
      )}
    </div>
  );
}

// ── Wrap SpotlightModal so we can mount a price-concept hero in it ─
// SpotlightModal accepts an optional HeroOverride prop (added to the local
// copy of release-notes.jsx). When supplied, it renders that component in
// the hero slot instead of dispatching by release.spotlight.hero. This
// mirrors the production pattern we'd want: a single dispatcher (or per-
// release override) decides which hero mounts.
function MountedConceptModal({ concept, palette }) {
  const Hero = React.useMemo(() => () => (
    concept === "B" ? <PriceConceptB palette={palette}/>
  : concept === "C" ? <PriceConceptC palette={palette}/>
                    : <PriceConceptA palette={palette}/>
  ), [concept, palette]);

  const release = {
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
  };

  return (
    <ThemeProvider theme="electric" style={{
      width: 620, height: 780,
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      <SpotlightModal release={release} onClose={() => {}} onCTA={() => {}} HeroOverride={Hero}/>
    </ThemeProvider>
  );
}

function App() {
  return (
    <DesignCanvas
      title="Price hero · direction exploration"
      subtitle="Three poster-style takes on the Submit-a-Price hero, all pulling from the existing identity-art language (paper palettes, riso blends, mis-registration, halftones, grain). Theme-independent on purpose — these heroes own their own palette the same way artists/venues own theirs. Pick a direction and we'll port it across the other 8 features."
    >
      {/* ── 1 · Concepts at a glance ── */}
      <DCSection
        id="overview"
        title="1 · Concepts at a glance"
        subtitle="Each concept adapts a template from the identity-art system to a price-specific narrative. Same palette across the row so the structural difference is what reads."
      >
        <DCArtboard id="ov-a" label="A · Halftone Headline · p1 tangerine + teal" width={HERO_W} height={HERO_H}>
          <HeroBox label='concept "A" · halftone' palette={PALETTE_PICKS.p1}>
            <PriceConceptA palette={PALETTE_PICKS.p1}/>
          </HeroBox>
        </DCArtboard>
        <DCArtboard id="ov-b" label="B · Concentric Signal · p1 tangerine + teal" width={HERO_W} height={HERO_H}>
          <HeroBox label='concept "B" · concentric' palette={PALETTE_PICKS.p1}>
            <PriceConceptB palette={PALETTE_PICKS.p1}/>
          </HeroBox>
        </DCArtboard>
        <DCArtboard id="ov-c" label="C · Stripes Receipt · p1 tangerine + teal" width={HERO_W} height={HERO_H}>
          <HeroBox label='concept "C" · stripes' palette={PALETTE_PICKS.p1}>
            <PriceConceptC palette={PALETTE_PICKS.p1}/>
          </HeroBox>
        </DCArtboard>
      </DCSection>

      {/* ── 2 · Concept A · Halftone Headline · palette swaps ── */}
      <DCSection
        id="concept-a"
        title='2 · Concept A  ·  "Halftone Headline"'
        subtitle="Bottom-left mass + halftone field from the opposite corner. Big '$48' display headline with primary-ink mis-registration shadow. Submitted prices float as background marks. Tiny VERIFIED ink stamp top-right. Most directly gig-poster of the three."
      >
        {[PALETTE_PICKS.p0, PALETTE_PICKS.p1, PALETTE_PICKS.p4, PALETTE_PICKS.p5].map(pal => (
          <DCArtboard key={`a-${pal.id}`} id={`a-${pal.id}`}
            label={`A · ${pal.id} · ${pal.name}`} width={HERO_W} height={HERO_H}>
            <HeroBox label={`A · ${pal.id}`} palette={pal}>
              <PriceConceptA palette={pal}/>
            </HeroBox>
          </DCArtboard>
        ))}
      </DCSection>

      {/* ── 3 · Concept B · Concentric Signal · palette swaps ── */}
      <DCSection
        id="concept-b"
        title='3 · Concept B  ·  "Concentric Signal"'
        subtitle="Record-groove rings emanate from the focal $48. Each ring is one submitted price; mis-registered secondary rings drift continuously. Music-graphic vocabulary applied to the price data — fits Concert Crawl's record-shop DNA."
      >
        {[PALETTE_PICKS.p0, PALETTE_PICKS.p1, PALETTE_PICKS.p4, PALETTE_PICKS.p6].map(pal => (
          <DCArtboard key={`b-${pal.id}`} id={`b-${pal.id}`}
            label={`B · ${pal.id} · ${pal.name}`} width={HERO_W} height={HERO_H}>
            <HeroBox label={`B · ${pal.id}`} palette={pal}>
              <PriceConceptB palette={pal}/>
            </HeroBox>
          </DCArtboard>
        ))}
      </DCSection>

      {/* ── 4 · Concept C · Stripes Receipt · palette swaps ── */}
      <DCSection
        id="concept-c"
        title='4 · Concept C  ·  "Stripes Receipt"'
        subtitle="Mis-registered silkscreen stripes behind a tilted paper receipt listing each submitted price and its source. Italic '$48' display headline runs behind the receipt. VERIFIED ink stamp lands at the end. Most literal — the most data-y read of the three."
      >
        {[PALETTE_PICKS.p0, PALETTE_PICKS.p1, PALETTE_PICKS.p4, PALETTE_PICKS.p7].map(pal => (
          <DCArtboard key={`c-${pal.id}`} id={`c-${pal.id}`}
            label={`C · ${pal.id} · ${pal.name}`} width={HERO_W} height={HERO_H}>
            <HeroBox label={`C · ${pal.id}`} palette={pal}>
              <PriceConceptC palette={pal}/>
            </HeroBox>
          </DCArtboard>
        ))}
      </DCSection>

      {/* ── 5 · Strip-size previews ── */}
      <DCSection
        id="strips"
        title="5 · Strip size  ·  /changelog inline hero"
        subtitle="200×132. The concept has to survive at thumbnail scale because the changelog re-opens the spotlight from this strip. Same palettes for direct comparison."
      >
        <DCArtboard id="strip-grid" label="All concepts × all palette flavors · strip size" width={1100} height={560}>
          <div style={{
            width: 1100, height: 560,
            background: "#f0eee9",
            padding: 32,
            display: "grid",
            gridTemplateColumns: "100px repeat(4, 200px)",
            columnGap: 24,
            rowGap: 20,
            alignItems: "center",
          }}>
            {/* header row */}
            <div/>
            {[PALETTE_PICKS.p1, PALETTE_PICKS.p0, PALETTE_PICKS.p4, PALETTE_PICKS.p6].map(pal => (
              <div key={`hdr-${pal.id}`} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 800,
                color: "rgba(0,0,0,0.7)",
                letterSpacing: "0.12em", textTransform: "uppercase",
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <div style={{ display: "flex", gap: 3 }}>
                  <span style={{ width: 18, height: 18, background: pal.bg, border: "1px solid rgba(0,0,0,0.2)" }}/>
                  <span style={{ width: 18, height: 18, background: pal.primary }}/>
                  <span style={{ width: 18, height: 18, background: pal.secondary }}/>
                </div>
                <div>{pal.id}</div>
              </div>
            ))}

            {/* row A */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: "rgba(0,0,0,0.85)",
              letterSpacing: "0.16em", textTransform: "uppercase",
              textAlign: "right",
            }}>A · halftone</div>
            {[PALETTE_PICKS.p1, PALETTE_PICKS.p0, PALETTE_PICKS.p4, PALETTE_PICKS.p6].map(pal => (
              <div key={`sa-${pal.id}`} style={{
                width: 200, height: 132,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                overflow: "hidden",
                position: "relative",
              }}>
                <PriceConceptA palette={pal} compact={true}/>
              </div>
            ))}

            {/* row B */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: "rgba(0,0,0,0.85)",
              letterSpacing: "0.16em", textTransform: "uppercase",
              textAlign: "right",
            }}>B · concentric</div>
            {[PALETTE_PICKS.p1, PALETTE_PICKS.p0, PALETTE_PICKS.p4, PALETTE_PICKS.p6].map(pal => (
              <div key={`sb-${pal.id}`} style={{
                width: 200, height: 132,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                overflow: "hidden",
                position: "relative",
              }}>
                <PriceConceptB palette={pal} compact={true}/>
              </div>
            ))}

            {/* row C */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: "rgba(0,0,0,0.85)",
              letterSpacing: "0.16em", textTransform: "uppercase",
              textAlign: "right",
            }}>C · stripes</div>
            {[PALETTE_PICKS.p1, PALETTE_PICKS.p0, PALETTE_PICKS.p4, PALETTE_PICKS.p6].map(pal => (
              <div key={`sc-${pal.id}`} style={{
                width: 200, height: 132,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.18)",
                overflow: "hidden",
                position: "relative",
              }}>
                <PriceConceptC palette={pal} compact={true}/>
              </div>
            ))}
          </div>
        </DCArtboard>
      </DCSection>

      {/* ── 6 · In real SpotlightModal ── */}
      <DCSection
        id="mounted"
        title="6 · Mounted in SpotlightModal  ·  in-context check"
        subtitle="One of each concept dropped into the production modal to spot chrome conflicts: the close button contrast over light paper, the eyebrow vs. paper texture, how the founder note + CTA stack feel below a colorful hero. The chrome themes (electric here); the art does not."
      >
        <DCArtboard id="m-a" label="A · halftone · p1" width={620} height={780}>
          <MountedConceptModal concept="A" palette={PALETTE_PICKS.p1}/>
        </DCArtboard>
        <DCArtboard id="m-b" label="B · concentric · p4" width={620} height={780}>
          <MountedConceptModal concept="B" palette={PALETTE_PICKS.p4}/>
        </DCArtboard>
        <DCArtboard id="m-c" label="C · stripes · p0" width={620} height={780}>
          <MountedConceptModal concept="C" palette={PALETTE_PICKS.p0}/>
        </DCArtboard>
      </DCSection>

      {/* ── 7 · Notes ── */}
      <DCSection
        id="notes"
        title="7 · Direction notes"
        subtitle="My read — Hugh's call."
      >
        <DCArtboard id="notes-card" label="Notes" width={1200} height={480}>
          <div style={{
            width: 1200, height: 480,
            background: "#f0eee9",
            padding: "36px 44px",
            color: "#15131A",
            fontFamily: "Inter, sans-serif",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: "rgba(0,0,0,0.6)",
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>Read</div>
            <ul style={{
              fontSize: 15, lineHeight: 1.55, color: "#15131A",
              margin: 0, paddingLeft: 22,
              maxWidth: 940,
              textWrap: "pretty",
            }}>
              <li><strong>A · Halftone Headline</strong> is the most "Concert Crawl" — biggest type, strongest poster feel, halftone reads as gig-flyer. Cost: small data ($45 / $47 / $49 marks) is decorative, not legible.</li>
              <li><strong>B · Concentric Signal</strong> earns its data: every ring IS one report; the verified center IS the consensus. Most narratively literal. Cost: more chart-like, less poster-like — leans technical.</li>
              <li><strong>C · Stripes Receipt</strong> is the most explanatory — Hugh's founder voice would land hardest here because the receipt mirrors the actual UI. Cost: busiest, most "infographic", least restrained.</li>
            </ul>

            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: "rgba(0,0,0,0.6)",
              letterSpacing: "0.18em", textTransform: "uppercase",
              marginTop: 6,
            }}>Recommendation</div>
            <div style={{
              fontSize: 15, lineHeight: 1.55, color: "#15131A",
              maxWidth: 940,
              textWrap: "pretty",
            }}>
              Lean <strong>A</strong> as the visual language for the rest of the heroes. It's the most flexible — every feature has a "headline number or word" we can blow up (47 shows, 247 watching, 10 nights, Founder 001, the band name). And it scales gracefully to strip size where B's ring labels collapse and C's receipt becomes a postage stamp.
              <br/><br/>
              <strong>Hybrid path:</strong> use A as the system spine, but reserve B's concentric metaphor specifically for <em>price-drop alerts</em> (which IS a soundwave/ping) and reserve C's receipt for <em>concert history</em> (which IS a ledger). One language, three templates, three uses — exactly like the identity-art system has 5 templates instead of one.
            </div>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
