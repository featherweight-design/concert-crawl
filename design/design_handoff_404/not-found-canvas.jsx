// not-found-canvas.jsx — Engineering handoff canvas for the /404 route.
// Lays out: live tweakable hero, 3-theme matrix, desktop variant, and
// annotated specs that call out token names.

const { useState, useEffect } = React;

let ThemeProvider, DesignCanvas, DCSection, DCArtboard, DCPostIt,
    TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakText,
    NotFoundScreen;

function nfBindGlobals() {
  ThemeProvider   = window.ThemeProvider;
  DesignCanvas    = window.DesignCanvas;
  DCSection       = window.DCSection;
  DCArtboard      = window.DCArtboard;
  DCPostIt        = window.DCPostIt;
  TweaksPanel     = window.TweaksPanel;
  useTweaks       = window.useTweaks;
  TweakSection    = window.TweakSection;
  TweakRadio      = window.TweakRadio;
  TweakSelect     = window.TweakSelect;
  TweakText       = window.TweakText;
  NotFoundScreen  = window.NotFoundScreen;
}

// ── Frames ─────────────────────────────────────────────────────────
// Mobile frame: 393×852 iOS-ish bounds + status bar inset.
function MobileFrame({ children }) {
  return (
    <div style={{
      width: 393, height: 852,
      background: "#000",
      position: "relative",
      overflow: "hidden",
      fontFamily: "Inter, system-ui",
    }}>
      {children}
      {/* iOS status bar — same draw as in profile-settings handoff */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 47, padding: "14px 28px 0",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        fontFamily: "Inter, system-ui",
        fontSize: 15, fontWeight: 600,
        color: "#fff",
        zIndex: 10, pointerEvents: "none",
        letterSpacing: "-0.01em",
        mixBlendMode: "difference",
      }}>
        <span>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="none"><path d="M1 8h2v2H1zM5 6h2v4H5zM9 4h2v6H9zM13 1h2v9h-2z" fill="currentColor"/></svg>
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M7 1.5L1 4.5l6 5 6-5z" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="1" y="1" width="18" height="9" rx="2" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.4"/><rect x="20" y="4" width="1.5" height="3" rx=".5" fill="currentColor"/></svg>
        </div>
      </div>
    </div>
  );
}

function DesktopFrame({ children }) {
  return (
    <div style={{ width: 1280, height: 860, background: "#000", overflow: "hidden" }}>
      {children}
    </div>
  );
}

// ── Annotation overlays ────────────────────────────────────────────
// Light dashed leader line + label, anchored absolutely.
function Annot({ top, left, right, bottom, label, tokens, w = 200, align = "left" }) {
  return (
    <div style={{
      position: "absolute",
      top, left, right, bottom,
      width: w,
      pointerEvents: "none",
      fontFamily: "'JetBrains Mono', monospace",
      zIndex: 50,
      textAlign: align,
    }}>
      <div style={{
        background: "#FFF6D6",
        border: "1px solid #E6CC66",
        borderRadius: 6,
        padding: "6px 9px",
        fontSize: 10,
        lineHeight: 1.45,
        color: "#3a2a05",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 9, marginBottom: 3 }}>
          {label}
        </div>
        {tokens.map((t, i) => (
          <div key={i} style={{ fontWeight: 500 }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ── Tweakable live artboard ─────────────────────────────────────────
function LiveMobile({ tweaks }) {
  return (
    <MobileFrame>
      <NotFoundScreen
        chrome="mobile"
        posterName={tweaks.poster}
        attemptedPath={tweaks.path}
        themeKey={tweaks.theme}
        flavor={tweaks.flavor}
      />
    </MobileFrame>
  );
}
function LiveDesktop({ tweaks }) {
  return (
    <DesktopFrame>
      <NotFoundScreen
        chrome="desktop"
        posterName={tweaks.poster}
        attemptedPath={tweaks.path}
        themeKey={tweaks.theme}
        flavor={tweaks.flavor}
      />
    </DesktopFrame>
  );
}

// ── App ─────────────────────────────────────────────────────────────
const NF_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "electric",
  "poster": "404",
  "path": "/shows/the-show-that-wasnt",
  "flavor": "show"
}/*EDITMODE-END*/;

function NotFoundCanvas() {
  const [t, setT] = useTweaks(NF_TWEAK_DEFAULTS);

  return (
    <>
      <DesignCanvas
        title="404 — Route Not Found"
        subtitle="Phase 8.x · Catch-all route at /404. Full-bleed, no app chrome. IdentityArt poster as visual anchor. Single CTA to Browse. Same anatomy on mobile (stacked) and desktop (two-column)."
      >

        {/* ── 1 · Live tweakable artboard ───────────────────── */}
        <DCSection
          id="live"
          title="1 · Live"
          subtitle="Tweaks panel cycles theme, poster name (seeds IdentityArt), and attempted path. The 'poster name' is what makes the art block deterministic — same string in = same art out."
        >
          <DCArtboard id="live-mobile" label="Mobile · live" width={393} height={852}>
            <LiveMobile tweaks={t}/>
          </DCArtboard>
          <DCArtboard id="live-desktop" label="Desktop · live" width={1280} height={860}>
            <LiveDesktop tweaks={t}/>
          </DCArtboard>
        </DCSection>

        {/* ── 2 · Mobile · 3 themes ─────────────────────────── */}
        <DCSection
          id="themes-mobile"
          title="2 · Mobile · all three themes"
          subtitle="Electric is the default. Same poster (name='404') across themes so reviewers can verify token retinting; IdentityArt itself is theme-independent (its palette is hashed from the name, not the theme) — that's intentional, the poster is a fixed visual anchor regardless of which theme the user is in."
        >
          <DCArtboard id="m-electric" label="Electric (default)" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="electric"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="m-jade" label="Jade" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="jade"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="m-light" label="Light" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="light"/></MobileFrame>
          </DCArtboard>
        </DCSection>

        {/* ── 3 · Desktop · 3 themes ────────────────────────── */}
        <DCSection
          id="themes-desktop"
          title="3 · Desktop · all three themes"
          subtitle="Two-column layout activates at ≥768px. Poster column is a fixed 560px; content column flexes. Vertical centering keeps the headline at eye level regardless of viewport height."
        >
          <DCArtboard id="d-electric" label="Electric (default)" width={1280} height={860}>
            <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="electric"/></DesktopFrame>
          </DCArtboard>
          <DCArtboard id="d-jade" label="Jade" width={1280} height={860}>
            <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="jade"/></DesktopFrame>
          </DCArtboard>
          <DCArtboard id="d-light" label="Light" width={1280} height={860}>
            <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="light"/></DesktopFrame>
          </DCArtboard>
        </DCSection>

        {/* ── 4 · Annotated · mobile ────────────────────────── */}
        <DCSection
          id="spec-mobile"
          title="4 · Annotated spec · mobile (393)"
          subtitle="Token names, not hex values. Anything coloured here comes from the active ThemeProvider — no inline colors."
        >
          <DCArtboard id="m-annot" label="Mobile · spec" width={760} height={920}>
            <div style={{ position: "relative", width: "100%", height: "100%", padding: 24, background: "#f5f2ea" }}>
              {/* The actual screen, centered */}
              <div style={{
                position: "absolute", top: 24, left: 24, width: 393, height: 852,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}>
                <MobileFrame><NotFoundScreen chrome="mobile" themeKey="electric"/></MobileFrame>
              </div>

              {/* Annotations on the right — leader-line is implied; the
                  reader is expected to map by vertical position. */}
              <Annot top={70}  left={440} w={290} label="Poster · IdentityArt"
                tokens={[
                  "<IdentityArt name='404' kind='artist'",
                  "             scale='hero' grain={0.10}",
                  "             showInitials={false} />",
                  "container: 100% × 444",
                  "fade-out: linear-gradient → var(--bg)",
                ]}/>
              <Annot top={186} left={440} w={290} label="Wordmark lockup · top-left overlay"
                tokens={[
                  "CCMark (size 28) + wordmark (Inter 800 / 17 / -0.02em)",
                  "scrim: var(--scrim)  blur(8px)",
                  "radius 8 / padding 6×10",
                ]}/>
              <Annot top={284} left={440} w={290} label="Poster meta · faux gig-poster"
                tokens={[
                  "top-left:  'Denver · 404'   mono 10 / 700",
                  "top-right: 'Cancelled' pill  mono 9.5 / 700",
                  "bottom-L:  '404' stamp        Inter 900 / 52",
                  "bottom-R:  'tonight · 8pm' strike, mono 11",
                ]}/>
              <Annot top={420} left={440} w={290} label="Status rail"
                tokens={[
                  "dot: var(--accent), 6×6",
                  "label: 'Route not found' · mono 10.5 / 700 / 0.16em",
                  "rule:  1px var(--border)",
                  "code:  '404' · mono 10.5 / var(--fg-subtle)",
                ]}/>
              <Annot top={524} left={440} w={290} label="Headline"
                tokens={[
                  "Inter 900 · 38px · -0.035em · 1.0",
                  "color: var(--fg)",
                  "text-wrap: balance",
                ]}/>
              <Annot top={602} left={440} w={290} label="Body"
                tokens={[
                  "Inter 500 · 14.5px · 1.55 · -0.005em",
                  "color: var(--fg-muted)",
                  "max-width: 440 · text-wrap: pretty",
                ]}/>
              <Annot top={690} left={440} w={290} label="Primary CTA"
                tokens={[
                  "Inter 800 · 14.5px · -0.01em",
                  "bg: var(--signal)",
                  "color: var(--fg-on-accent)",
                  "h 48 · radius 999 · full width on mobile",
                  "→ '/' (Browse home)",
                ]}/>
              <Annot top={788} left={440} w={290} label="Mono footer · attempted path"
                tokens={[
                  "label: mono 9.5 / 700 / 0.14em / uppercase",
                  "       color: var(--fg-subtle)",
                  "value: mono 11.5 / 500",
                  "       color: var(--fg-muted)",
                  "       word-break: break-all",
                ]}/>

              <DCPostIt top={760} left={20} rotate={-3} width={180}>
                <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12, color: "#3a2a05" }}>
                  Voice<br/>
                  <span style={{ fontWeight: 500, fontSize: 11.5 }}>
                    Matches Hybrid empty state: "Crickets." / "Empty queue."
                    Brand presence first, status clear, no apology.
                  </span>
                </div>
              </DCPostIt>
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── 5 · Annotated · desktop ───────────────────────── */}
        <DCSection
          id="spec-desktop"
          title="5 · Annotated spec · desktop (1280)"
          subtitle="Two-column split. Poster column = 560px fixed, content column flexes. Content column is vertically centered with 64×80 padding."
        >
          <DCArtboard id="d-annot" label="Desktop · spec" width={1280} height={1080}>
            <div style={{ position: "relative", width: "100%", height: "100%", padding: 20, background: "#f5f2ea" }}>
              <div style={{
                position: "absolute", top: 20, left: 20, width: 1240, height: 860,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}>
                {/* shrink to fit canvas — render at 0.97 scale via wrapper */}
                <div style={{ width: 1240, height: 860, transform: "scale(0.9677)", transformOrigin: "top left" }}>
                  <div style={{ width: 1280, height: 860 }}>
                    <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="electric"/></DesktopFrame>
                  </div>
                </div>
              </div>

              <Annot top={920} left={20} w={300} label="Poster column"
                tokens={[
                  "width: 560 (fixed)",
                  "height: 100% of viewport",
                  "background: identityFor(name).palette.bg",
                  "wordmark overlays top-left, padded 36 / 36",
                ]}/>
              <Annot top={920} left={340} w={300} label="Content column"
                tokens={[
                  "flex: 1 · padding: 64 80",
                  "align: center / justify: flex-start",
                  "max-width on stack: 520",
                  "gap: 22 between major rows",
                ]}/>
              <Annot top={920} left={660} w={300} label="Headline · desktop"
                tokens={[
                  "Inter 900 · 56px · -0.04em · 1.0",
                  "color: var(--fg)",
                  "text-wrap: balance",
                ]}/>
              <Annot top={920} left={980} w={280} label="Primary CTA · desktop"
                tokens={[
                  "h 52 · padding 0 28 · intrinsic width",
                  "→ '/' (Browse home)",
                  "no secondary CTA · keep the page decisive",
                ]}/>
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── 6 · Catch-all flavors (generic + display) ─────── */}
        <DCSection
          id="flavors"
          title="6 · Catch-all flavors · generic + display"
          subtitle="Section 1–5 above shows the brand-locked `flavor=&quot;show&quot;` — leans hard into the gig-poster metaphor. Two quieter flavors here for cases where the show metaphor is too on-the-nose (legal pages, marketing routes, settings deep-links). Same anatomy, same components, different copy + cleaner poster. Pick one at the route level; don't mix."
        >
          <DCArtboard id="generic-m" label="flavor='generic' · mobile" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="electric" flavor="generic"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="generic-d" label="flavor='generic' · desktop" width={1280} height={860}>
            <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="electric" flavor="generic"/></DesktopFrame>
          </DCArtboard>
          <DCArtboard id="display-m" label="flavor='display' · mobile" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="electric" flavor="display"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="display-d" label="flavor='display' · desktop" width={1280} height={860}>
            <DesktopFrame><NotFoundScreen chrome="desktop" themeKey="electric" flavor="display"/></DesktopFrame>
          </DCArtboard>
        </DCSection>

        {/* ── 7 · `generic` · 3 themes ───────────────────────── */}
        <DCSection
          id="flavors-themes"
          title="7 · `generic` · all three themes"
          subtitle="Same retint contract as the show flavor: poster palette is name-hashed (theme-independent), everything around it tracks the active ThemeProvider."
        >
          <DCArtboard id="generic-electric" label="Electric" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="electric" flavor="generic"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="generic-jade" label="Jade" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="jade" flavor="generic"/></MobileFrame>
          </DCArtboard>
          <DCArtboard id="generic-light" label="Light" width={393} height={852}>
            <MobileFrame><NotFoundScreen chrome="mobile" themeKey="light" flavor="generic"/></MobileFrame>
          </DCArtboard>
        </DCSection>

        {/* ── 8 · Poster name variations ─────────────────────── */}
        <DCSection
          id="poster-variations"
          title="8 · Poster · alternate seeds"
          subtitle="The IdentityArt block is fully driven by the poster-name string. Below: '404' (default · always ship this for consistency) and three optional rotation candidates for if engineering wants to mount-time pick from a curated list. Each maps to a different palette + template combo, deterministically — same string always renders the same poster."
        >
          {[
            { name: "404",                  label: "default · ship this" },
            { name: "the show that wasnt",  label: "alt · cheeky" },
            { name: "ghost set",            label: "alt · short" },
            { name: "wrong night friend",   label: "alt · longer line" },
          ].map(v => (
            <DCArtboard key={v.name} id={`v-${v.name}`} label={`name='${v.name}' · ${v.label}`} width={393} height={852}>
              <MobileFrame>
                <NotFoundScreen chrome="mobile" themeKey="electric" posterName={v.name}/>
              </MobileFrame>
            </DCArtboard>
          ))}
        </DCSection>

      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Flavor">
          <TweakRadio
            label="Flavor"
            value={t.flavor}
            onChange={v => setT("flavor", v)}
            options={[
              { label: "Show",    value: "show" },
              { label: "Generic", value: "generic" },
              { label: "Display", value: "display" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Theme">
          <TweakRadio
            label="Theme"
            value={t.theme}
            onChange={v => setT("theme", v)}
            options={[
              { label: "Electric", value: "electric" },
              { label: "Jade",     value: "jade" },
              { label: "Light",    value: "light" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Poster">
          <TweakSelect
            label="Seed name"
            value={t.poster}
            onChange={v => setT("poster", v)}
            options={[
              { label: "404 (default)",            value: "404" },
              { label: "the show that wasnt",     value: "the show that wasnt" },
              { label: "ghost set",                value: "ghost set" },
              { label: "wrong night friend",       value: "wrong night friend" },
              { label: "tonight in denver",        value: "tonight in denver" },
              { label: "lost gig",                 value: "lost gig" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Path">
          <TweakText
            label="Attempted"
            value={t.path}
            placeholder="/shows/the-show-that-wasnt"
            onChange={v => setT("path", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

window.__nf_canvas_ready = true;
window.NotFoundCanvas = NotFoundCanvas;
window.nfBindGlobals = nfBindGlobals;
