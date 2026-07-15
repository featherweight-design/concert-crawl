// shareable-canvas.jsx — Riso Poster (the winner) + trigger UX +
// Watching list share. Receipt and Stub directions dropped per feedback.

const { DesignCanvas, DCSection, DCArtboard } = window;

// Helper: scale a fixed-pixel card down so the artboard fits a sane size.
function ScaledCard({ ratio, theme = "electric", paper = false, children }) {
  const r = window.SC_RATIOS[ratio];
  const target = ratio === "story" ? 360 : ratio === "square" ? 360 : 720;
  const scale = target / r.w;
  return (
    <div style={{
      width: target, height: r.h * scale,
      background: paper ? "transparent" : "var(--bg)",
      overflow: "hidden", position: "relative",
      boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.10)",
      borderRadius: 18,
    }}>
      <window.ThemeProvider theme={theme}>
        <div style={{
          width: r.w, height: r.h,
          transform: `scale(${scale})`, transformOrigin: "top left",
        }}>
          {children}
        </div>
      </window.ThemeProvider>
    </div>
  );
}

function SCCard({ direction, event, ratio, mint, theme, opts }) {
  return (
    <ScaledCard ratio={ratio} theme={theme}>
      <window.ShareCard direction={direction} event={event} ratio={ratio}
        mint={mint} opts={opts} />
    </ScaledCard>
  );
}

// Scale a Passport card to fit its artboard. Compact renders ~1:1; share
// (1080²) scales down. Themed wrapper so tokens resolve.
function PassportScaled({ mode, theme = "electric", target }) {
  const M = window.PP_MODES[mode];
  const t = target || (mode === "compact" ? 300 : 400);
  const scale = t / M.W;
  return (
    <div style={{
      width: M.W * scale, height: M.H * scale,
      overflow: "hidden", position: "relative",
      borderRadius: M.radius * scale,
      boxShadow: "0 16px 44px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.12)",
    }}>
      <window.ThemeProvider theme={theme}>
        <div style={{
          width: M.W, height: M.H,
          transform: `scale(${scale})`, transformOrigin: "top left",
        }}>
          <window.PassportCard mode={mode} theme={theme} />
        </div>
      </window.ThemeProvider>
    </div>
  );
}

function ShareableCanvas() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);

  const eventGoing = window.SHARE_EVENTS.callboy;
  const eventSold  = window.SHARE_EVENTS.geese;
  const eventDrop  = window.SHARE_EVENTS.amyl;

  const mint1 = window.mintMeta(eventGoing, window.SHARE_USER, 247);
  const mint2 = window.mintMeta(eventSold,  window.SHARE_USER, 248);
  const mint3 = window.mintMeta(eventDrop,  window.SHARE_USER, 249);

  // Watching list — use the real W_SHOWS dataset from Saved & Watching so the
  // composite mirrors what users actually see in-app (current prices, deltas,
  // sold-out, presale, stale).
  const watchingList = window.W_SHOWS || [];

  const theme = t.theme;
  const cardOpts = { showMint: t.showMint, showQR: t.showQR };

  return (
    <>
      <DesignCanvas storageKey="shareable-cards-canvas">
        {/* ── Trigger UX ───────────────────────────────────── */}
        <DCSection id="trigger" title="Trigger · Event Detail v2"
          subtitle="Share lives next to Back in the hero (no heart — Watch is the eye below the title). Bottom sheet shows the live Riso preview + destinations.">
          <DCArtboard id="trigger-closed" label="Closed (entry point)" width={420} height={870}>
            <window.ThemeProvider theme={theme}>
              <window.ShareTriggerEventDetail event={eventGoing} mint={mint1}
                sheetOpen={false}/>
            </window.ThemeProvider>
          </DCArtboard>
          <DCArtboard id="trigger-poster" label="Sheet open · Riso preview" width={420} height={870}>
            <window.ThemeProvider theme={theme}>
              <window.ShareTriggerEventDetail event={eventGoing} mint={mint1}
                sheetDirection="poster" sheetOpen={true}/>
            </window.ThemeProvider>
          </DCArtboard>
        </DCSection>

        {/* ── Riso Poster — the winner ───────────────────── */}
        <DCSection id="dir-poster" title="Riso Poster"
          subtitle="Identity art owns the top half. Metadata, title, venue, snark, wordmark consolidate at the bottom.">
          <DCArtboard id="poster-going-story" label="Going · 9:16" width={380} height={680}>
            <SCCard direction="poster" event={eventGoing} ratio="story"
              mint={mint1} theme={theme} opts={cardOpts}/>
          </DCArtboard>
          <DCArtboard id="poster-going-square" label="Going · 1:1" width={380} height={400}>
            <SCCard direction="poster" event={eventGoing} ratio="square"
              mint={mint1} theme={theme} opts={cardOpts}/>
          </DCArtboard>
          <DCArtboard id="poster-going-link" label="Going · 1.91:1 · SMS preview" width={740} height={400}>
            <SCCard direction="poster" event={eventGoing} ratio="link"
              mint={mint1} theme={theme} opts={cardOpts}/>
          </DCArtboard>
          <DCArtboard id="poster-soldout-story" label="Sold out · 9:16" width={380} height={680}>
            <SCCard direction="poster" event={eventSold} ratio="story"
              mint={mint2} theme={theme} opts={cardOpts}/>
          </DCArtboard>
          <DCArtboard id="poster-drop-square" label="Price drop · 1:1" width={380} height={400}>
            <SCCard direction="poster" event={eventDrop} ratio="square"
              mint={mint3} theme={theme} opts={cardOpts}/>
          </DCArtboard>
        </DCSection>

        {/* ── Concert Passport — inherited from concert_history ─── */}
        <DCSection id="passport" title="Concert Passport"
          subtitle="A personal shrine of past-attended shows — not a per-event card. Identity-art stamp wall up top, tokened scrim panel below. Compact ships inline on Concert History; share is the 1:1 social render.">
          <DCArtboard id="passport-compact" label="Compact · 320×500 · in-app" width={360} height={560}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <PassportScaled mode="compact" theme={theme} target={300} />
            </div>
          </DCArtboard>
          <DCArtboard id="passport-share" label="Share · 1080×1080 · /passport/:userId/:ratio.png" width={500} height={560}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <PassportScaled mode="share" theme={theme} target={440} />
            </div>
          </DCArtboard>
        </DCSection>

      </DesignCanvas>

      <window.TweaksPanel>
        <window.TweakSection label="Theme" />
        <window.TweakRadio label="Theme" value={t.theme}
          options={["electric", "jade", "light"]}
          onChange={(v) => setTweak("theme", v)}/>

        <window.TweakSection label="Card chrome" />
        <window.TweakToggle label="User handle"
          value={t.showMint} onChange={(v) => setTweak("showMint", v)}/>
      </window.TweaksPanel>
    </>
  );
}

window.ShareableCanvas = ShareableCanvas;
