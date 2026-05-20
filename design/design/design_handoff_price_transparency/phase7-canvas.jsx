// phase7-canvas.jsx — Composes Phase 7 surfaces into the design canvas.
// Sections:
//   1. Event Detail (mobile) — three variants, drop & spike events
//   2. Event Detail (desktop) — same three variants
//   3. States — no-price, stale, sold-out
//   4. Browse list — price chips in context (drop, sold-out, mixed)
//   5. Watching affordance + tone reference
//
// Theme + tone tweakable from the Tweaks panel.

const E = window.PHASE7_EVENTS;
const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "electric",
  "tone": "snark"
}/*EDITMODE-END*/;

function ArtboardLabel({ children, tone = "neutral" }) {
  // small-cap label that lives inside the artboard at the top
  const colorByTone = {
    neutral: "rgba(255,255,255,0.5)",
    accent:  "var(--accent)",
    signal:  "var(--signal)",
  }[tone];
  return null;  // we use DCArtboard's own label slot for naming; no in-frame chrome
}

function Phone({ children, height = 720 }) {
  return (
    <div style={{
      width: 360, height, borderRadius: 28, overflow: "hidden",
      boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>{children}</div>
  );
}

function DesktopFrame({ children, width = 880, height = 620 }) {
  return (
    <div style={{
      width, height, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.06)",
      background: "var(--bg)",
    }}>{children}</div>
  );
}

// ── Tweaks panel ────────────────────────────────────────────────
function Phase7Tweaks() {
  const TweaksPanel  = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakRadio   = window.TweakRadio;
  const TweakSelect  = window.TweakSelect;
  const useTweaks    = window.useTweaks;
  if (!TweaksPanel) return null;
  const [tweaks, setTweak] = useTweaks(DEFAULTS);

  // Dispatch an event so the canvas re-renders
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("phase7:tweaks", { detail: tweaks }));
  }, [tweaks]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakRadio
          label="Palette"
          value={tweaks.theme}
          onChange={(v) => setTweak("theme", v)}
          options={[
            { label: "Electric", value: "electric" },
            { label: "Jade",     value: "jade" },
            { label: "Light",    value: "light" },
          ]}
        />
      </TweakSection>
      <TweakSection title="Voice">
        <TweakRadio
          label="Copy tone"
          value={tweaks.tone}
          onChange={(v) => setTweak("tone", v)}
          options={[
            { label: "Dry",     value: "dry" },
            { label: "Deadpan", value: "deadpan" },
            { label: "Snarky",  value: "snark" },
          ]}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ── Tone preview block ──────────────────────────────────────────
// Shows the same micro-copy strings under each tone so the user can
// compare them without flipping the tweaks panel.
function TonePreview({ themeTokens }) {
  const TONE = window.TONE_COPY;
  const ph = window.phase7;
  const sample = E.electricCallboy.price;
  const flag = ph.deltaFlag(sample);
  const delta = ph.deltaVsOpen(sample);
  const tones = [
    { key: "dry",     label: "Dry — pure factual" },
    { key: "deadpan", label: "Deadpan — Concert Crawl voice (default)" },
    { key: "snark",   label: "Snarky — anti-Ticketmaster" },
  ];
  function tVarsLocal(t) {
    const v = {};
    for (const [k, val] of Object.entries(t)) v[`--${k}`] = val;
    return v;
  }
  return (
    <div style={{
      ...tVarsLocal(themeTokens),
      width: 780, padding: 22, borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 14,
      }}>Tone reference · Same data, three voices</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {tones.map(t => {
          const c = TONE[t.key];
          return (
            <div key={t.key} style={{
              padding: 14, borderRadius: 10,
              background: "var(--surface-1)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{
                fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12,
                color: "var(--signal)", letterSpacing: "-0.01em",
              }}>{t.label}</div>

              <ToneRow label="No price"   value={c.noPrice}/>
              <ToneRow label=""           value={c.noPriceSub} sub/>
              <ToneRow label="Drop"       value={c.drop(-4)}/>
              <ToneRow label="Spike"      value={c.spike(8)}/>
              <ToneRow label="Sold out"   value={c.soldOut}/>
              <ToneRow label="Stale (>24h)" value={c.veryStale("46h ago")}/>
              <ToneRow label="Watch CTA"  value={c.watchCta}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToneRow({ label, value, sub = false }) {
  return (
    <div>
      {label && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{label}</div>
      )}
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: sub ? 11 : 12.5,
        color: sub ? "var(--fg-subtle)" : "var(--fg)",
        fontWeight: sub ? 500 : 600, letterSpacing: "-0.005em",
        lineHeight: 1.4, marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

// ── Tokens reference card ───────────────────────────────────────
function TokensReference({ themeTokens }) {
  const ph = window.phase7;
  function tVarsLocal(t) {
    const v = {};
    for (const [k, val] of Object.entries(t)) v[`--${k}`] = val;
    return v;
  }
  const swatches = [
    { name: "--signal",  desc: "Price numerics, links to source"   },
    { name: "--success", desc: "Drop indicator (rare, intentional)" },
    { name: "--warning", desc: "Stale flag, sold-out badge"        },
    { name: "--accent",  desc: "Watch active state, primary CTA"   },
    { name: "--fg-muted",desc: "Fees summary, secondary numerics" },
    { name: "--fg-subtle",desc: "Timestamps, source attribution"  },
  ];
  return (
    <div style={{
      ...tVarsLocal(themeTokens),
      width: 780, padding: 22, borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 14,
      }}>Color usage · Where each token shows up</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {swatches.map(s => (
          <div key={s.name} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 10, borderRadius: 8,
            background: "var(--surface-1)", border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `var(${s.name})`,
              border: "1px solid var(--border-strong)",
              flexShrink: 0,
            }}/>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "var(--fg)", fontWeight: 600,
              }}>{s.name}</div>
              <div style={{
                fontFamily: "Inter, system-ui", fontSize: 11,
                color: "var(--fg-muted)", marginTop: 1,
              }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Canvas root ─────────────────────────────────────────────────
function Phase7Canvas() {
  const [tweaks, setTweaks] = React.useState(DEFAULTS);
  React.useEffect(() => {
    function onTweaks(e) { setTweaks(e.detail); }
    window.addEventListener("phase7:tweaks", onTweaks);
    return () => window.removeEventListener("phase7:tweaks", onTweaks);
  }, []);

  const themeDef = window.CC_THEMES[tweaks.theme] || window.CC_THEMES.electric;
  const themeTokens = themeDef.tokens;
  const tone = tweaks.tone || "deadpan";

  // Browse-list compositions
  const browseTonight = [E.amyl, E.electricCallboy, E.geese];
  const browseMixed   = [E.guetta, E.twoFriends, E.yungblud, E.amyl, E.geese];

  // Drop event for the "drop" demo (Amyl)
  const dropEvent = E.amyl;
  // Spike event (Guetta) — quietly trended up
  const spikeEvent = E.electricCallboy;

  const DCSection  = window.DCSection;
  const DCArtboard = window.DCArtboard;
  const DesignCanvas = window.DesignCanvas;
  const M = window.MockEventDetailMobile;
  const D = window.MockEventDetailDesktop;
  const B = window.MockBrowseList;

  return (
    <DesignCanvas>
      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="event-detail-mobile"
        title="Event Detail · Mobile"
        subtitle="Three price-block variants on the same show — pick a direction."
      >
        <DCArtboard id="ed-m-a" label="A · Compact (in info block)" width={360} height={720}>
          <Phone>
            <M event={spikeEvent} variant="A" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="ed-m-b" label="B · Spacious (dedicated card)" width={360} height={720}>
          <Phone>
            <M event={spikeEvent} variant="B" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="ed-m-c" label="C · Editorial (one sentence)" width={360} height={720}>
          <Phone>
            <M event={spikeEvent} variant="C" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
      </DCSection>

      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="drop-demo"
        title="Price drop · Mobile"
        subtitle="Same three variants on a show whose price recently dropped (Amyl: $28 → $24)."
      >
        <DCArtboard id="drop-a" label="A · Compact" width={360} height={720}>
          <Phone>
            <M event={dropEvent} variant="A" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="drop-b" label="B · Spacious" width={360} height={720}>
          <Phone>
            <M event={dropEvent} variant="B" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="drop-c" label="C · Editorial" width={360} height={720}>
          <Phone>
            <M event={dropEvent} variant="C" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
      </DCSection>

      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="event-detail-desktop"
        title="Event Detail · Desktop"
        subtitle="Same three variants in the desktop article column."
      >
        <DCArtboard id="ed-d-a" label="A · Compact" width={880} height={680}>
          <DesktopFrame width={880} height={680}>
            <D event={spikeEvent} variant="A" tone={tone} themeTokens={themeTokens}/>
          </DesktopFrame>
        </DCArtboard>
        <DCArtboard id="ed-d-b" label="B · Spacious" width={880} height={680}>
          <DesktopFrame width={880} height={680}>
            <D event={spikeEvent} variant="B" tone={tone} themeTokens={themeTokens}/>
          </DesktopFrame>
        </DCArtboard>
        <DCArtboard id="ed-d-c" label="C · Editorial" width={880} height={680}>
          <DesktopFrame width={880} height={680}>
            <D event={spikeEvent} variant="C" tone={tone} themeTokens={themeTokens}/>
          </DesktopFrame>
        </DCArtboard>
      </DCSection>

      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="states"
        title="States"
        subtitle="What fans see when the price story isn't a clean number. We keep these quiet — the value prop is the show, not the price."
      >
        <DCArtboard id="state-noprice" label="No price · TBA" width={360} height={720}>
          <Phone>
            <M event={E.yungblud} variant="B" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="state-stale" label="Stale (>24h)" width={360} height={720}>
          <Phone>
            <M event={E.twoFriends} variant="B" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
        <DCArtboard id="state-soldout" label="Sold out" width={360} height={720}>
          <Phone>
            <M event={E.geese} variant="B" tone={tone} themeTokens={themeTokens}/>
          </Phone>
        </DCArtboard>
      </DCSection>

      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="browse-cards"
        title="Browse / Search · Price chip"
        subtitle="Tight, low-noise. A quiet dot when the price has dropped meaningfully. No data → falls back to the existing TBA affordance."
      >
        <DCArtboard id="browse-tonight" label="Tonight (mixed states)" width={360} height={300}>
          <div style={{ width: 360, height: 300, background: "var(--bg)", overflow: "hidden",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <B events={browseTonight} tone={tone} themeTokens={themeTokens} label="Tonight"/>
          </div>
        </DCArtboard>
        <DCArtboard id="browse-mixed" label="This week (no-data, drop, spike, sold-out)" width={360} height={400}>
          <div style={{ width: 360, height: 400, background: "var(--bg)", overflow: "hidden",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <B events={browseMixed} tone={tone} themeTokens={themeTokens} label="This week"/>
          </div>
        </DCArtboard>
      </DCSection>

      {/* ─────────────────────────────────────────────────────── */}
      <DCSection
        id="reference"
        title="Reference"
        subtitle="Voice and color tokens used by the price block."
      >
        <DCArtboard id="ref-tone" label="Tone reference" width={780} height={560}>
          <TonePreview themeTokens={themeTokens}/>
        </DCArtboard>
        <DCArtboard id="ref-tokens" label="Color usage" width={780} height={320}>
          <TokensReference themeTokens={themeTokens}/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.Phase7Canvas = Phase7Canvas;
window.Phase7Tweaks = Phase7Tweaks;
