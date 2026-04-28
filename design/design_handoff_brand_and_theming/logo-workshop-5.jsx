// Logo workshop · Round 5
// Focus: original ClusterPath from v3, shown across all v3 cool palettes.
// No new variants — this round is about color, scale, and lockup, so we can
// pick a palette and move on.

const N5 = {
  midnight:    { bg: "#0A0E22", fg: "#5CD0FF", glow: "#A06BFF" },
  ultraviolet: { bg: "#0E0B22", fg: "#B68BFF", glow: "#5CFFD6" },
  forest:      { bg: "#0A1F1C", fg: "#7BFFB0", glow: "#5CB8FF" },
  electric:    { bg: "#070A1A", fg: "#7AE6FF", glow: "#FF7BD4" },
  jade:        { bg: "#06201F", fg: "#1FFFC2", glow: "#9B5CFF" },
};
const PAL5 = Object.entries(N5).map(([name, p]) => ({ name, ...p }));
const SIG5 = N5.electric; // signature pick from v3

// ============================================================
// CLUSTER · PATH — pristine, identical to v3 original.
// dots traveling along an implied curve, growing toward a focal halo
// ============================================================
function ClusterPath({ size = 96, p = SIG5 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 },
    { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 },
    { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },
    { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill={p.bg} />
      <circle cx="72" cy="24" r="20" fill={p.glow} opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill={p.glow} opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill={p.fg} />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill={p.fg} opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// Mark-only (no bg fill) — for use on light surfaces or chrome
function ClusterPathMark({ size = 96, fg = "#1B1A17", glow }) {
  const useGlow = glow || fg;
  const trail = [
    { x: 14, y: 76, r: 1.5 },
    { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 },
    { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },
    { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <circle cx="72" cy="24" r="20" fill={useGlow} opacity="0.18" />
      <circle cx="72" cy="24" r="12" fill={useGlow} opacity="0.36" />
      <circle cx="72" cy="24" r="7"  fill={fg} />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill={fg} opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ============================================================
// LAYOUT
// ============================================================
function LogoWorkshop5() {
  return (
    <div style={{ background: "var(--paper)", padding: 28, minHeight: "100vh" }}>
      <Mono size={10}>LOGO WORKSHOP · ROUND 5 · CLUSTER PATH IN COLOR</Mono>
      <Hand size={28} weight={700} style={{ display: "block", marginTop: 4 }}>
        Just the original — across the five cool palettes.
      </Hand>
      <Hand size={14} style={{ display: "block", marginTop: 4, opacity: 0.78, lineHeight: 1.4, maxWidth: 820 }}>
        Round 4 was a miss; pulling back to what worked. The trail-toward-halo from v3 stays untouched —
        same dots, same focal beam, same proportions. The decision here is which palette carries it best.
        Goal: pick one and move on.
      </Hand>

      {/* Hero row · signature electric, big */}
      <div style={{ marginTop: 22, padding: 22, background: SIG5.bg, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <ClusterPath size={220} p={SIG5} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: SIG5.glow, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              signature
            </span>
            <span style={{ fontFamily: "var(--ui)", fontSize: 56, fontWeight: 900, color: SIG5.fg, letterSpacing: "-0.03em", lineHeight: 0.95 }}>
              concert
            </span>
            <span style={{ fontFamily: "var(--ui)", fontSize: 56, fontWeight: 900, color: SIG5.glow, letterSpacing: "-0.03em", lineHeight: 0.95 }}>
              crawl.
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: SIG5.fg, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, marginTop: 8 }}>
              electric · cyan + pink on near-black
            </span>
          </div>
        </div>
      </div>

      {/* Five palettes, hero treatment, side by side */}
      <div style={{ marginTop: 26 }}>
        <Mono size={10}>FIVE PALETTES · HERO</Mono>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {PAL5.map((p, i) => (
            <PaletteCard key={i} p={p} />
          ))}
        </div>
      </div>

      {/* Wordmark lockups — full pairing in each palette */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>WORDMARK LOCKUPS</Mono>
        <Hand size={13} style={{ display: "block", marginTop: 2, opacity: 0.7 }}>
          Mark + wordmark side by side, exactly how it'd appear in product chrome.
        </Hand>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {PAL5.map((p, i) => (
            <Lockup key={i} p={p} />
          ))}
        </div>
      </div>

      {/* Size ladder — does it hold up tiny? — across palettes */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>SIZE LADDER · 16 / 24 / 40 / 64 / 96</Mono>
        <Hand size={13} style={{ display: "block", marginTop: 2, opacity: 0.7 }}>
          The mark has fine dots — the real question is whether the trail still reads as a trail at 16px.
        </Hand>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {PAL5.map((p, i) => (
            <SizeRow key={i} p={p} />
          ))}
        </div>
      </div>

      {/* Lamppost / sticker test */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>LAMPPOST TEST</Mono>
        <Hand size={13} style={{ display: "block", marginTop: 2, opacity: 0.7 }}>
          On a sticker stuck to a flyer wall — which palette keeps shouting?
        </Hand>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 14 }}>
          {PAL5.map((p, i) => (
            <Sticker5 key={i} p={p} />
          ))}
        </div>
      </div>

      {/* In-context: app icon + browser tab */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>IN CONTEXT · APP ICON + BROWSER TAB</Mono>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {PAL5.map((p, i) => (
            <ContextRow key={i} p={p} />
          ))}
        </div>
      </div>

      {/* Mark on light — same dots, on paper */}
      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>MARK ON LIGHT · INK + GLOW HUE</Mono>
        <Hand size={13} style={{ display: "block", marginTop: 2, opacity: 0.7 }}>
          The dark version is the home; here's how the trail reads on paper using each palette's accent hue for the halo.
        </Hand>
        <div style={{ marginTop: 14, display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-end" }}>
          {PAL5.map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <ClusterPathMark size={72} fg="#1B1A17" glow={p.glow} />
              <Mono size={9}>{p.name}</Mono>
            </div>
          ))}
        </div>
      </div>

      {/* Closing note */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--ink)" }}>
        <Mono size={10}>NEXT</Mono>
        <Hand size={16} style={{ display: "block", marginTop: 4, lineHeight: 1.45, maxWidth: 740 }}>
          Pick a palette. My read: <Highlight color={SIG5.glow}><span style={{ color: SIG5.bg }}>electric</span></Highlight> still
          carries it strongest — the cyan trail + pink halo gets the longest visual reach. <strong>jade</strong> and <strong>midnight</strong> are
          the calmer alternates if pink feels too club-flyer. Once chosen, we lock the mark and move on to the product.
        </Hand>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function PaletteCard({ p }) {
  const isSig = p.bg === SIG5.bg;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "stretch",
      border: isSig ? "2px solid var(--ink)" : "1px solid var(--ink)",
      background: "var(--paper)",
    }}>
      <div style={{ background: p.bg, padding: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ClusterPath size={132} p={p} />
      </div>
      <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Mono size={10} style={{ color: "var(--ink)", fontWeight: 600 }}>{p.name}</Mono>
          <Mono size={8} style={{ opacity: 0.6 }}>
            {hex(p.fg)} · {hex(p.glow)}
          </Mono>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Swatch c={p.bg} border />
          <Swatch c={p.fg} />
          <Swatch c={p.glow} />
        </div>
      </div>
      {isSig && (
        <div style={{ padding: "0 12px 8px" }}>
          <Mono size={8} style={{ color: "var(--accent)", fontWeight: 700 }}>★ signature</Mono>
        </div>
      )}
    </div>
  );
}

function Lockup({ p }) {
  return (
    <div style={{
      background: p.bg, padding: "18px 22px", display: "flex", alignItems: "center",
      gap: 18,
    }}>
      <ClusterPath size={72} p={p} />
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 28, fontWeight: 900, color: p.fg, letterSpacing: "-0.025em", lineHeight: 1 }}>
          concert<span style={{ color: p.glow }}>crawl</span>
          <span style={{ color: p.glow }}>.</span>
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: p.fg, opacity: 0.55, marginTop: 6, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {p.name}
        </span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
        <Swatch c={p.bg} border light />
        <Swatch c={p.fg} />
        <Swatch c={p.glow} />
      </div>
    </div>
  );
}

function SizeRow({ p }) {
  const sizes = [16, 24, 40, 64, 96];
  return (
    <div style={{ background: p.bg, padding: "14px 18px", display: "flex", alignItems: "center", gap: 22 }}>
      <Mono size={9} style={{ color: p.fg, opacity: 0.6, width: 78, flexShrink: 0 }}>{p.name}</Mono>
      {sizes.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <ClusterPath size={s} p={p} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: p.fg, opacity: 0.5 }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function Sticker5({ p }) {
  return (
    <div style={{
      transform: `rotate(${(p.name.length % 5) - 2}deg)`,
      padding: 10, background: p.bg, border: `2px solid ${p.fg}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      boxShadow: "3px 3px 0 rgba(0,0,0,0.25)",
    }}>
      <ClusterPath size={84} p={p} />
      <span style={{ fontFamily: "var(--ui)", fontWeight: 900, fontSize: 12, color: p.fg, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        concert <span style={{ color: p.glow }}>crawl.</span>
      </span>
      <Mono size={8} style={{ color: p.fg, opacity: 0.5 }}>{p.name}</Mono>
    </div>
  );
}

function ContextRow({ p }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* iOS-style app icon — rounded square */}
      <div style={{
        width: 64, height: 64, borderRadius: 14, overflow: "hidden",
        boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
      }}>
        <ClusterPath size={64} p={p} />
      </div>
      {/* Browser tab — favicon + title on paper-toned chrome */}
      <div style={{
        width: "100%", maxWidth: 180, height: 28,
        background: "#fff", border: "1px solid var(--ink)", borderRadius: "6px 6px 0 0",
        display: "flex", alignItems: "center", gap: 6, padding: "0 8px",
      }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
          <ClusterPath size={14} p={p} />
        </div>
        <span style={{ fontFamily: "var(--ui)", fontSize: 10, color: "var(--ink)", letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          concertcrawl
        </span>
      </div>
      <Mono size={9}>{p.name}</Mono>
    </div>
  );
}

function Swatch({ c, border = false, light = false }) {
  return (
    <div style={{
      width: 14, height: 14, background: c,
      border: border ? `1px solid ${light ? "rgba(255,255,255,0.4)" : "var(--ink)"}` : "none",
    }} />
  );
}

function hex(c) {
  return c.toUpperCase();
}

window.LogoWorkshop5 = LogoWorkshop5;
