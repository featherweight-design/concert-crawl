// price-hero-concepts.jsx — direction exploration for the Submit-a-Price spotlight hero
//
// Borrows the visual language from design_handoff_phase7_5_identity_imagery
// (IA_PALETTES, ia_blend, ia_grainBg, ia_isDark) — paper paletted, riso/
// silkscreen blends, mis-registration, halftones, big poster typography.
//
// Three concepts on the SAME feature so we can pick a direction before
// rolling it out to the other 8 heroes:
//
//   A · HALFTONE HEADLINE — big poster mass + halftone dots, "$48" headline
//                           with faux ink mis-registration shadow
//   B · CONCENTRIC SIGNAL — record-groove rings labeled with submitted
//                           prices, verified center pulses
//   C · STRIPES RECEIPT  — silkscreen stripes + a tilted ledger receipt
//                           with the submitted prices typing in
//
// Each concept is theme-INDEPENDENT (paper palette is fixed per render);
// chrome around it still themes via tokens. Each takes a `palette` prop so
// we can A/B-test palettes. Each takes `compact` so we can preview at strip
// size (200×132) — the changelog hero strip.

// ── Keyframes (riso-print metaphors) ──────────────────────────
if (typeof document !== "undefined" && !document.getElementById("phc-keyframes")) {
  const s = document.createElement("style");
  s.id = "phc-keyframes";
  s.textContent = `
    @keyframes phcDotIn {
      0%   { opacity: 0; transform: scale(0); transform-origin: center; }
      60%  { opacity: 1; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes phcMisReg {
      0%,100% { transform: translate(6px, 4px); }
      50%     { transform: translate(4px, 6px); }
    }
    @keyframes phcStamp {
      0%   { opacity: 0; transform: scale(.7) rotate(-3deg); }
      55%  { opacity: 1; transform: scale(1.06) rotate(.6deg); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    @keyframes phcInkStamp {
      0%   { opacity: 0; transform: scale(.5) rotate(var(--phc-rot, -8deg)); }
      55%  { opacity: .95; transform: scale(1.1) rotate(calc(var(--phc-rot, -8deg) + 2deg)); }
      100% { opacity: .92; transform: scale(1) rotate(var(--phc-rot, -8deg)); }
    }
    @keyframes phcMark {
      0%   { opacity: 0; transform: translateY(6px) rotate(var(--phc-rot, 0deg)); }
      100% { opacity: .55; transform: translateY(0) rotate(var(--phc-rot, 0deg)); }
    }
    @keyframes phcDrift {
      0%,100% { transform: translateY(0); }
      50%     { transform: translateY(-2px); }
    }
    @keyframes phcRingDraw {
      0%   { stroke-dashoffset: var(--phc-circ, 1000); opacity: 0; }
      25%  { opacity: .9; }
      100% { stroke-dashoffset: 0; opacity: .9; }
    }
    @keyframes phcRingPulse {
      0%,100% { transform: scale(1); opacity: .9; }
      50%     { transform: scale(1.04); opacity: 1; }
    }
    @keyframes phcStripeWipe {
      0%   { transform: translateX(-110%); }
      100% { transform: translateX(0); }
    }
    @keyframes phcSlideIn {
      0%   { opacity: 0; transform: translate(var(--phc-tx, 0), 18px) rotate(var(--phc-rot, 0deg)); }
      100% { opacity: 1; transform: translate(var(--phc-tx, 0), 0) rotate(var(--phc-rot, 0deg)); }
    }
    @keyframes phcType {
      0%   { opacity: 0; transform: translateX(-4px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes phcFade {
      0%,100% { opacity: .55; }
      50%     { opacity: .85; }
    }
  `;
  document.head.appendChild(s);
}

// ── shared helpers ────────────────────────────────────────────
function PHCGrain({ palette }) {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: window.ia_grainBg(0.12),
      mixBlendMode: "multiply",
      opacity: window.ia_isDark(palette.bg) ? 0.5 : 0.85,
      zIndex: 6,
    }}/>
  );
}

function PHCEyebrow({ palette, children, compact, position = "tl" }) {
  if (compact) return null;
  const dark = window.ia_isDark(palette.bg);
  const pos = position === "br" ? { right: 18, bottom: 14, left: "auto", top: "auto" }
            : position === "tr" ? { right: 18, top: 14, left: "auto" }
            : { left: 18, top: 14 };
  return (
    <div style={{
      position: "absolute", ...pos, zIndex: 7,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 800,
      color: palette.ink,
      letterSpacing: "0.22em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 6,
      mixBlendMode: dark ? "screen" : "multiply",
    }}>{children}</div>
  );
}

function PHCFrame({ palette, children }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      overflow: "hidden",
      background: palette.bg,
      fontFamily: "Inter, system-ui",
    }}>
      {children}
      <PHCGrain palette={palette}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// A · HALFTONE HEADLINE
// ════════════════════════════════════════════════════════════════
// A primary-ink mass anchored bottom-left + a halftone-dot field of
// secondary radiating from the opposite corner. Big "$48" display headline
// at right with a 2-px primary-ink shadow that reads as mis-registration.
// Submitted prices float as small mono marks. Tiny "VERIFIED" stamp.
function PriceConceptA({ palette, compact = false }) {
  const W = 580, H = 300;
  const cell = compact ? 11 : 16;
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const anchor = { x: 0, y: H }; // bottom-left mass anchor
  const dots = [];
  let idx = 0;
  for (let yi = 0; yi < rows; yi++) {
    for (let xi = 0; xi < cols; xi++) {
      const x = xi * cell + cell / 2;
      const y = yi * cell + cell / 2;
      const dx = (x - anchor.x) / W;
      const dy = (y - anchor.y) / H;
      const d = Math.sqrt(dx * dx + dy * dy);
      const rNorm = Math.min(1, Math.max(0, d * 0.85));
      const r = rNorm * (cell * 0.48);
      if (r > 0.6) dots.push({ x, y, r, i: idx++ });
    }
  }
  // submitted prices as background marks
  const submits = compact ? [
    { x: 14, y: 24, val: "$45", rot: -6, d: 0.3 },
    { x: 70, y: 18, val: "$52", rot: 4,  d: 0.5 },
    { x: 24, y: 96, val: "$50", rot: 8,  d: 0.7 },
  ] : [
    { x: 30,  y: 50,  val: "$45", rot: -8, d: 0.6 },
    { x: 130, y: 30,  val: "$52", rot:  4, d: 0.85 },
    { x: 240, y: 65,  val: "$50", rot: -3, d: 1.10 },
    { x: 60,  y: 220, val: "$47", rot:  6, d: 1.35 },
    { x: 190, y: 250, val: "$49", rot: -5, d: 1.60 },
  ];
  const headlineFs = compact ? 64 : 142;
  const blend = window.ia_blend(palette);
  return (
    <PHCFrame palette={palette}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* primary mass — bottom-left anchored */}
        <g style={{ mixBlendMode: blend }}>
          <circle cx="0" cy={H} r={Math.max(W, H) * 0.7} fill={palette.primary}
            opacity="0"
            style={{ animation: "phcStamp 700ms 0.05s cubic-bezier(.2,.8,.2,1) both" }}/>
        </g>
        {/* halftone — secondary, dots radiate from upper-right */}
        <g style={{ mixBlendMode: blend }}>
          {dots.map((d) => (
            <circle key={d.i} cx={W - d.x} cy={d.y} r={d.r}
              fill={palette.secondary}
              opacity="0"
              style={{ animation: `phcDotIn 220ms ${0.4 + (d.i % 30) * 0.02}s ease-out both` }}/>
          ))}
        </g>
      </svg>

      {/* submitted price marks (mono) */}
      {submits.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: s.x, top: s.y,
          "--phc-rot": `${s.rot}deg`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 9 : 14, fontWeight: 700,
          color: palette.ink,
          letterSpacing: "0.04em",
          mixBlendMode: window.ia_isDark(palette.bg) ? "screen" : "multiply",
          opacity: 0,
          animation: `phcMark 500ms ${s.d}s ease-out both`,
          zIndex: 4,
        }}>{s.val}</div>
      ))}

      {/* big "$48" headline with mis-registration shadow */}
      <div style={{
        position: "absolute",
        right: compact ? 12 : 28,
        bottom: compact ? 10 : 18,
        fontFamily: "Inter, sans-serif",
        fontWeight: 900,
        fontSize: headlineFs,
        letterSpacing: "-0.06em",
        lineHeight: 0.9,
        color: palette.ink,
        textShadow: `${compact ? 2 : 4}px ${compact ? 2 : 4}px 0 ${palette.primary}`,
        opacity: 0,
        animation: "phcStamp 600ms 1.0s cubic-bezier(.2,.8,.2,1) both",
        zIndex: 5,
      }}>$48</div>

      {/* tiny eyebrow + check */}
      {!compact && (
        <div style={{
          position: "absolute",
          right: 32, bottom: 158,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 800,
          color: palette.ink,
          letterSpacing: "0.24em",
          padding: "5px 9px",
          background: palette.bg,
          border: `2px solid ${palette.ink}`,
          transform: "rotate(-3deg)",
          "--phc-rot": "-3deg",
          opacity: 0,
          animation: "phcInkStamp 500ms 1.4s cubic-bezier(.2,.8,.2,1) both",
          mixBlendMode: window.ia_isDark(palette.bg) ? "screen" : "multiply",
          zIndex: 5,
        }}>VERIFIED ✓</div>
      )}

      <PHCEyebrow palette={palette} compact={compact} position="tl">
        Crowd-sourced · 6 reports
      </PHCEyebrow>
    </PHCFrame>
  );
}

// ════════════════════════════════════════════════════════════════
// B · CONCENTRIC SIGNAL
// ════════════════════════════════════════════════════════════════
// Record-groove rings emanating from an off-center focal point. Each ring
// labeled with a submitted price near its perimeter. Mis-registered
// secondary rings sit underneath the primary. The verified $48 sits at
// the focal with a "verified" eyebrow. Outermost ring pulses subtly.
function PriceConceptB({ palette, compact = false }) {
  const W = 580, H = 300;
  const focal = compact ? { x: 100, y: 66 } : { x: 200, y: 150 };
  // Submitted-price rings, each at its own radius
  const rings = compact ? [
    { r: 36, val: "$45", d: 0.3, ang: -110 },
    { r: 56, val: "$52", d: 0.5, ang: -50 },
    { r: 78, val: "$48", d: 0.7, ang: 60,  current: true },
    { r: 102,val: "$50", d: 0.9, ang: 130 },
    { r: 128,val: "$47", d: 1.1, ang: -150 },
    { r: 156,val: "$49", d: 1.3, ang: 20 },
  ] : [
    { r: 70,  val: "$45", d: 0.3,  ang: -110 },
    { r: 105, val: "$52", d: 0.5,  ang: -55 },
    { r: 140, val: "$48", d: 0.7,  ang: 60,  current: true },
    { r: 180, val: "$50", d: 0.9,  ang: 145 },
    { r: 220, val: "$47", d: 1.1,  ang: -150 },
    { r: 260, val: "$49", d: 1.3,  ang: 25 },
  ];
  const blend = window.ia_blend(palette);
  const dark = window.ia_isDark(palette.bg);

  return (
    <PHCFrame palette={palette}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* mis-registered secondary rings — drift continuously */}
        <g transform="translate(5 4)" style={{
          mixBlendMode: blend,
          animation: "phcMisReg 4s ease-in-out infinite",
        }}>
          {rings.map((ring, i) => {
            const circ = 2 * Math.PI * ring.r;
            return (
              <circle key={`s-${i}`}
                cx={focal.x} cy={focal.y} r={ring.r}
                fill="none"
                stroke={palette.secondary}
                strokeWidth={compact ? 3.5 : 5}
                strokeDasharray={circ} strokeDashoffset={circ}
                style={{
                  "--phc-circ": circ,
                  animation: `phcRingDraw 800ms ${ring.d}s cubic-bezier(.2,.8,.2,1) both`,
                }}/>
            );
          })}
        </g>
        {/* primary rings on top */}
        <g style={{ mixBlendMode: blend }}>
          {rings.map((ring, i) => {
            const circ = 2 * Math.PI * ring.r;
            return (
              <circle key={`p-${i}`}
                cx={focal.x} cy={focal.y} r={ring.r}
                fill="none"
                stroke={palette.primary}
                strokeWidth={compact ? 3.5 : 5}
                strokeDasharray={circ} strokeDashoffset={circ}
                style={{
                  "--phc-circ": circ,
                  animation: `phcRingDraw 800ms ${ring.d}s cubic-bezier(.2,.8,.2,1) both`,
                  transformOrigin: `${focal.x}px ${focal.y}px`,
                  ...(ring.current ? { animationFillMode: "both" } : {}),
                }}/>
            );
          })}
        </g>
      </svg>

      {/* price labels at ring perimeters */}
      {rings.map((ring, i) => {
        const rad = (ring.ang * Math.PI) / 180;
        const lx = focal.x + Math.cos(rad) * ring.r;
        const ly = focal.y + Math.sin(rad) * ring.r;
        return (
          <div key={`l-${i}`} style={{
            position: "absolute",
            left: lx, top: ly,
            transform: "translate(-50%,-50%)",
            padding: compact ? "1px 4px" : "2px 6px",
            background: palette.bg,
            border: `1.5px solid ${palette.ink}`,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 8 : 11, fontWeight: 800,
            color: palette.ink,
            letterSpacing: "0.04em",
            opacity: 0,
            animation: `phcMark 320ms ${ring.d + 0.6}s ease-out both`,
            mixBlendMode: dark ? "screen" : "multiply",
            zIndex: 5,
            whiteSpace: "nowrap",
          }}>{ring.val}</div>
        );
      })}

      {/* verified center */}
      <div style={{
        position: "absolute",
        left: focal.x, top: focal.y,
        transform: "translate(-50%,-50%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: compact ? 2 : 4,
        zIndex: 6,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 7 : 10, fontWeight: 800,
          color: palette.ink,
          letterSpacing: "0.22em", textTransform: "uppercase",
          opacity: 0,
          animation: "phcMark 400ms 1.6s ease-out both",
          mixBlendMode: dark ? "screen" : "multiply",
        }}>Verified</div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          fontSize: compact ? 28 : 60,
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          color: palette.ink,
          textShadow: `${compact ? 1.5 : 3}px ${compact ? 1.5 : 3}px 0 ${palette.primary}`,
          opacity: 0,
          animation: "phcStamp 600ms 1.7s cubic-bezier(.2,.8,.2,1) both",
        }}>$48</div>
      </div>

      <PHCEyebrow palette={palette} compact={compact} position="tr">
        6 reports · 1 verified
      </PHCEyebrow>
    </PHCFrame>
  );
}

// ════════════════════════════════════════════════════════════════
// C · STRIPES RECEIPT
// ════════════════════════════════════════════════════════════════
// Vertical silkscreen stripes with mis-registration. A tilted "ledger"
// receipt card on top, listing submitted prices in mono; final line
// stamped "$48 VERIFIED". Big italic "$48" diagonal display headline
// crosses behind the receipt for the headline-poster feel.
function PriceConceptC({ palette, compact = false }) {
  const W = 580, H = 300;
  const stripeCount = compact ? 5 : 8;
  const stripeW = W / stripeCount;
  const fill = 0.55; // ratio of stripe filled with ink
  const stripes = [];
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) stripes.push({ x: i * stripeW, w: stripeW * fill, i });
  }
  const blend = window.ia_blend(palette);
  const dark = window.ia_isDark(palette.bg);

  const reports = compact ? [
    { val: "$45", tag: "OFFICIAL" },
    { val: "$52", tag: "RESALE" },
    { val: "$48", tag: "CRAWLER ✓", check: true },
  ] : [
    { val: "$45", tag: "OFFICIAL" },
    { val: "$52", tag: "RESALE" },
    { val: "$48", tag: "CRAWLER", check: true },
    { val: "$50", tag: "RESALE" },
    { val: "$47", tag: "CRAWLER", check: true },
    { val: "$49", tag: "CRAWLER", check: true },
  ];

  return (
    <PHCFrame palette={palette}>
      {/* stripes background */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* secondary, offset */}
        <g transform="translate(6 4)" style={{ mixBlendMode: blend }}>
          {stripes.map((s) => (
            <rect key={`s2-${s.i}`} x={s.x} y="-20" width={s.w} height={H + 40}
              fill={palette.secondary}
              opacity="0"
              style={{ animation: `phcDotIn 240ms ${0.05 + s.i * 0.06}s ease-out both` }}/>
          ))}
        </g>
        {/* primary, on top */}
        <g style={{ mixBlendMode: blend }}>
          {stripes.map((s) => (
            <rect key={`s1-${s.i}`} x={s.x} y="-20" width={s.w} height={H + 40}
              fill={palette.primary}
              opacity="0"
              style={{ animation: `phcDotIn 240ms ${0.15 + s.i * 0.06}s ease-out both` }}/>
          ))}
        </g>
      </svg>

      {/* huge italic display "$48" headline behind the receipt */}
      {!compact && (
        <div style={{
          position: "absolute",
          left: -10, top: 18,
          fontFamily: "Inter, sans-serif",
          fontWeight: 900, fontStyle: "italic",
          fontSize: 220,
          letterSpacing: "-0.07em",
          lineHeight: 0.9,
          color: palette.ink,
          opacity: 0,
          mixBlendMode: dark ? "screen" : "multiply",
          animation: "phcStamp 700ms 0.6s cubic-bezier(.2,.8,.2,1) both",
          zIndex: 2,
          pointerEvents: "none",
          transform: "rotate(-2deg)",
        }}>$48</div>
      )}

      {/* receipt card */}
      <div style={{
        position: "absolute",
        right: compact ? 10 : 28,
        top: "50%",
        transform: "translateY(-50%) rotate(3deg)",
        "--phc-rot": "3deg",
        width: compact ? 116 : 240,
        background: palette.bg,
        border: `2px solid ${palette.ink}`,
        boxShadow: `${compact ? -3 : -6}px ${compact ? 4 : 6}px 0 ${palette.primary}, ${compact ? -3 : -6}px ${compact ? 4 : 6}px 0 1px ${palette.ink}`,
        padding: compact ? "8px 10px 10px" : "16px 18px 18px",
        fontFamily: "'JetBrains Mono', monospace",
        color: palette.ink,
        opacity: 0,
        animation: "phcSlideIn 600ms 0.8s cubic-bezier(.2,.8,.2,1) both",
        zIndex: 4,
      }}>
        {/* receipt eyebrow */}
        <div style={{
          fontSize: compact ? 7 : 9, fontWeight: 800,
          letterSpacing: "0.24em", textTransform: "uppercase",
          paddingBottom: compact ? 4 : 6,
          marginBottom: compact ? 6 : 10,
          borderBottom: `1.5px dashed ${palette.ink}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Price Log</span>
          <span style={{ opacity: 0.6 }}>JUN 02</span>
        </div>
        {/* rows */}
        {reports.map((r, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            fontSize: compact ? 7 : 11, fontWeight: 700,
            padding: compact ? "1px 0" : "3px 0",
            opacity: 0,
            animation: `phcType 260ms ${1.0 + i * 0.10}s ease-out both`,
          }}>
            <span style={{
              color: r.check ? palette.primary : palette.ink,
              opacity: r.check ? 1 : 0.7,
              fontWeight: r.check ? 800 : 600,
            }}>{r.tag}</span>
            <span style={{
              color: palette.ink,
              fontWeight: 800,
              fontSize: compact ? 8 : 13,
            }}>{r.val}</span>
          </div>
        ))}
        {/* total */}
        <div style={{
          marginTop: compact ? 6 : 10,
          paddingTop: compact ? 6 : 10,
          borderTop: `1.5px solid ${palette.ink}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: 0,
          animation: `phcType 320ms ${1.0 + reports.length * 0.10 + 0.15}s ease-out both`,
        }}>
          <span style={{
            fontSize: compact ? 7 : 10, fontWeight: 800,
            letterSpacing: "0.22em", textTransform: "uppercase",
          }}>Verified</span>
          <span style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: compact ? 16 : 28,
            letterSpacing: "-0.04em",
            color: palette.ink,
          }}>$48</span>
        </div>
      </div>

      {/* "VERIFIED" ink stamp atop the receipt — corner */}
      {!compact && (
        <div style={{
          position: "absolute",
          right: 200, top: 56,
          padding: "5px 10px",
          border: `2.5px solid ${palette.primary}`,
          color: palette.primary,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 900,
          letterSpacing: "0.24em", textTransform: "uppercase",
          background: "transparent",
          opacity: 0,
          "--phc-rot": "-14deg",
          animation: "phcInkStamp 500ms 1.7s cubic-bezier(.2,.8,.2,1) both",
          mixBlendMode: dark ? "screen" : "multiply",
          zIndex: 5,
        }}>Verified</div>
      )}

      <PHCEyebrow palette={palette} compact={compact} position="tl">
        Price log · 6 reports
      </PHCEyebrow>
    </PHCFrame>
  );
}

// ── Dispatcher ────────────────────────────────────────────────
function PriceConcept({ concept = "A", palette, compact = false }) {
  const Comp = concept === "B" ? PriceConceptB
            : concept === "C" ? PriceConceptC
            : PriceConceptA;
  return <Comp palette={palette} compact={compact}/>;
}

Object.assign(window, {
  PriceConceptA, PriceConceptB, PriceConceptC, PriceConcept,
});
