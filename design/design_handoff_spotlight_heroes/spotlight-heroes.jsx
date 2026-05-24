// spotlight-heroes.jsx — animated hero scenes for SpotlightModal
//
// Each hero is a self-contained SVG + CSS keyframes scene that mounts inside
// <SpotlightHeroV2 hero="key"/>. They obey the contract from
// design_handoff_release_notes/README.md "Hero system — how to add a new one":
//
//   - full-bleed (position absolute, inset 0)
//   - themed via tokens only (var(--bg), var(--accent), var(--signal), ...)
//   - no video files / external assets
//   - own pulses + parallax
//
// Heroes shipped here: price · tiers · history · share · watchers ·
// passport-stamps · passport-stars · venue-stamps · venue-stars
//
// Each hero accepts {compact} — compact mode is the changelog strip
// (200×132). The eyebrow + small labels are hidden in compact mode so the
// scene reads at thumbnail scale.

// ── Keyframes ─────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("sh-keyframes")) {
  const s = document.createElement("style");
  s.id = "sh-keyframes";
  s.textContent = `
    @keyframes shPulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes shDrift  { 0%{transform:translate(0,0)} 100%{transform:translate(-10px,-6px)} }
    @keyframes shConverge {
      0%   { transform: translate(-50%, calc(-50% + var(--sh-dy,0px))); opacity: 0 }
      18%  { opacity: .95 }
      72%  { transform: translate(-50%, -50%); opacity: .95 }
      100% { transform: translate(-50%, -50%); opacity: .18 }
    }
    @keyframes shVerify {
      0%,100% { box-shadow: 0 0 0 0 var(--sh-glow, transparent), 0 4px 12px rgba(0,0,0,0.3) }
      50%     { box-shadow: 0 0 24px 2px var(--sh-glow, transparent), 0 4px 12px rgba(0,0,0,0.3) }
    }
    @keyframes shFloat {
      0%,100% { transform: translateY(0) }
      50%     { transform: translateY(-7px) }
    }
    @keyframes shHalo {
      0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .35 }
      50%     { transform: translate(-50%,-50%) scale(1.35); opacity: .12 }
    }
    @keyframes shRing {
      0%   { transform: translate(-50%,-50%) scale(.3); opacity: .55 }
      100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0 }
    }
    @keyframes shStamp {
      0%   { transform: scale(.4) rotate(var(--sh-tilt,0deg)); opacity: 0 }
      55%  { transform: scale(1.08) rotate(calc(var(--sh-tilt,0deg) - 1deg)); opacity: 1 }
      100% { transform: scale(1) rotate(var(--sh-tilt,0deg)); opacity: .92 }
    }
    @keyframes shStar {
      0%   { transform: translate(-50%,-50%) scale(0); opacity: 0 }
      35%  { transform: translate(-50%,-50%) scale(1.4); opacity: 1 }
      100% { transform: translate(-50%,-50%) scale(1); opacity: .9 }
    }
    @keyframes shLine {
      0%   { stroke-dashoffset: 100; opacity: 0 }
      25%  { opacity: .85 }
      100% { stroke-dashoffset: 0; opacity: .85 }
    }
    @keyframes shFan {
      0%   { transform: translate(-50%,-50%) rotate(0deg); opacity: 0 }
      25%  { opacity: 1 }
      100% { transform: translate(calc(-50% + var(--sh-dx,0px)), calc(-50% + var(--sh-dy,0px))) rotate(var(--sh-rot,0deg)); opacity: 1 }
    }
    @keyframes shPlusOne {
      0%   { transform: translate(-50%,-50%) scale(.6); opacity: 0 }
      20%  { opacity: 1 }
      100% { transform: translate(-50%, calc(-50% - 38px)) scale(1); opacity: 0 }
    }
    @keyframes shTickerFlip {
      0%,18%   { opacity: 0; transform: translateY(8px) }
      24%,76%  { opacity: 1; transform: translateY(0) }
      82%,100% { opacity: 0; transform: translateY(-8px) }
    }
    @keyframes shTwinkle { 0%,100%{opacity:.3} 50%{opacity:.9} }
    @keyframes shOrbit {
      0%   { transform: rotate(0deg) translateX(var(--sh-r,60px)) rotate(0deg) }
      100% { transform: rotate(360deg) translateX(var(--sh-r,60px)) rotate(-360deg) }
    }
    @keyframes shFadeUp { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }
  `;
  document.head.appendChild(s);
}

// ── Shared bits ───────────────────────────────────────────────
function SHEyebrow({ children, color, compact, position = "tl" }) {
  if (compact) return null;
  const pos = position === "br" ? { right: 14, bottom: 14, left: "auto", top: "auto" }
            : position === "tr" ? { right: 14, top: 14, left: "auto" }
            : { left: 14, top: 14 };
  return (
    <div style={{
      position: "absolute", ...pos,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: color || "var(--fg-subtle)",
      letterSpacing: "0.16em", textTransform: "uppercase",
      zIndex: 4,
      display: "inline-flex", alignItems: "center", gap: 6,
      whiteSpace: "nowrap",
    }}>{children}</div>
  );
}

function SHDot({ color = "var(--accent)", size = 6, glow = true }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size, borderRadius: size,
      background: color,
      boxShadow: glow ? `0 0 ${size}px ${color}` : "none",
      animation: "shPulse 1.6s ease-in-out infinite",
    }}/>
  );
}

function SHGrid({ opacity = 0.32 }) {
  const id = React.useId();
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      position: "absolute", inset: 0, opacity,
      animation: "shDrift 7s ease-in-out infinite alternate",
    }}>
      <defs>
        <pattern id={`g-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M6 0H0V6" fill="none" stroke="var(--border-strong)" strokeWidth="0.2"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#g-${id})`}/>
    </svg>
  );
}

function SHFrame({ children }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 30% 40%, var(--surface-3), var(--surface-1) 75%)",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// ── 1 · price — crowd-sourced signal ──────────────────────────
// Multiple price reports float in from off-axis positions and converge onto
// a horizontal "verified" line at center, where the consensus price pulses.
function PriceHero({ compact }) {
  const reports = [
    { x: 14, dy: -52, val: "$45", d: 0.0 },
    { x: 28, dy:  64, val: "$52", d: 0.5 },
    { x: 42, dy: -38, val: "$48", d: 1.0 },
    { x: 58, dy:  56, val: "$50", d: 1.5 },
    { x: 72, dy: -60, val: "$47", d: 2.0 },
    { x: 86, dy:  44, val: "$49", d: 2.5 },
  ];
  return (
    <SHFrame>
      <SHGrid opacity={0.28}/>

      {/* center "verified" axis */}
      <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={{
        position: "absolute", inset: 0,
      }}>
        <line x1="6" y1="50" x2="94" y2="50"
          stroke="var(--signal)" strokeWidth="0.18"
          strokeDasharray="0.6 0.6" opacity="0.5"/>
      </svg>

      {/* converging price reports */}
      {reports.map((r, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${r.x}%`, top: "50%",
          "--sh-dy": `${r.dy}px`,
          animation: `shConverge 5.5s ${r.d}s ease-in-out infinite`,
          display: "inline-flex", alignItems: "center", gap: 5,
          transform: "translate(-50%, -50%)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
            flexShrink: 0,
          }}/>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 9 : 11, fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: "0.04em",
            padding: "2px 6px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}>{r.val}</span>
        </div>
      ))}

      {/* verified consensus */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: compact ? "8px 14px" : "12px 20px",
        background: "var(--bg-elevated)",
        border: "1.5px solid var(--signal)",
        borderRadius: 999,
        "--sh-glow": "var(--signal)",
        animation: "shVerify 2.4s ease-in-out infinite",
        color: "var(--signal)",
        zIndex: 3,
      }}>
        <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L5 9.5L10 3.5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 16 : 22, fontWeight: 800,
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}>$48</span>
        {!compact && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "var(--signal)",
            letterSpacing: "0.16em", textTransform: "uppercase",
            paddingLeft: 4,
            borderLeft: "1px solid var(--border-strong)",
            marginLeft: 4,
          }}>Verified</span>
        )}
      </div>

      <SHEyebrow compact={compact} color="var(--accent)">
        <SHDot color="var(--accent)" size={6}/> Crowd-sourced · 6 reports
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 2 · tiers — three badges, Founder centered ─────────────────
// Three tier badges float in with their own pulse rhythms. Founder sits in
// the middle with the largest halo and a "001" mark.
function TiersHero({ compact }) {
  const tiers = [
    { key: "S", label: "Supporter", color: "var(--signal)",  x: 22, scale: compact ? 0.65 : 0.85, d: 0.0, dur: 3.4 },
    { key: "F", label: "Founder",   color: "var(--accent)",  x: 50, scale: compact ? 0.85 : 1.10, d: 0.6, dur: 2.6, founder: true },
    { key: "P", label: "Premium",   color: "var(--success)", x: 78, scale: compact ? 0.70 : 0.92, d: 1.2, dur: 3.0 },
  ];
  return (
    <SHFrame>
      <SHGrid opacity={0.22}/>

      {/* Founder halo */}
      <div style={{
        position: "absolute",
        left: "50%", top: compact ? "52%" : "48%",
        width: compact ? 140 : 220, height: compact ? 140 : 220,
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent) 0%, transparent 62%)",
        opacity: 0.35,
        animation: "shHalo 3.2s ease-in-out infinite",
        pointerEvents: "none",
      }}/>

      {tiers.map((t) => (
        <div key={t.key} style={{
          position: "absolute",
          left: `${t.x}%`, top: compact ? "52%" : "48%",
          transform: `translate(-50%, -50%) scale(${t.scale})`,
          animation: `shFadeUp 600ms ${t.d}s both`,
        }}>
          <div style={{
            animation: `shFloat ${t.dur}s ease-in-out ${t.d}s infinite`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            {/* shield badge */}
            <div style={{ position: "relative" }}>
              <svg width="96" height="108" viewBox="0 0 96 108" style={{
                display: "block",
                filter: t.founder
                  ? `drop-shadow(0 0 18px ${t.color}) drop-shadow(0 8px 12px rgba(0,0,0,0.45))`
                  : `drop-shadow(0 0 10px ${t.color}) drop-shadow(0 6px 10px rgba(0,0,0,0.35))`,
              }}>
                <defs>
                  <linearGradient id={`tg-${t.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--surface-3)"/>
                    <stop offset="100%" stopColor="var(--surface-1)"/>
                  </linearGradient>
                </defs>
                {/* shield outline */}
                <path d="M48 4 L88 16 L88 56 C88 78 70 96 48 104 C26 96 8 78 8 56 L8 16 Z"
                  fill={`url(#tg-${t.key})`}
                  stroke={t.color}
                  strokeWidth={t.founder ? 2.5 : 1.8}/>
                {/* inner facet */}
                <path d="M48 14 L80 24 L80 56 C80 74 66 88 48 95 C30 88 16 74 16 56 L16 24 Z"
                  fill="none" stroke={t.color} strokeWidth="0.6" opacity="0.5"/>
                {/* big letter mark */}
                <text x="48" y="62" textAnchor="middle"
                  fontFamily="Inter, sans-serif" fontWeight="900"
                  fontSize="36" fill={t.color}
                  letterSpacing="-0.02em">{t.key}</text>
                {/* founder mark */}
                {t.founder && (
                  <>
                    <circle cx="48" cy="22" r="3" fill={t.color}/>
                    <text x="48" y="84" textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="9" fontWeight="700" fill={t.color}
                      letterSpacing="0.18em">001</text>
                  </>
                )}
              </svg>

              {/* pulse ring on founder */}
              {t.founder && !compact && (
                <span style={{
                  position: "absolute",
                  left: "50%", top: "50%",
                  width: 96, height: 96, marginLeft: -48, marginTop: -48,
                  borderRadius: "50%",
                  border: `1.5px solid ${t.color}`,
                  opacity: 0.5,
                  animation: "shRing 2.4s ease-out infinite",
                  pointerEvents: "none",
                }}/>
              )}
            </div>

            {/* label */}
            {!compact && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 800,
                color: t.color,
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}>{t.label}</div>
            )}
          </div>
        </div>
      ))}

      <SHEyebrow compact={compact} color="var(--accent)">
        <SHDot color="var(--accent)" size={6}/> Three tiers · founder first
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 3 · history — timeline rail with ticket stubs dropping on ──
// Horizontal year axis. Ticket-stub rectangles drop onto it on a stagger.
// Counter on the right ticks up to "47 shows".
function HistoryHero({ compact }) {
  const years = ["'22", "'23", "'24", "'25", "'26"];
  // Each stub: x% on axis, color, delay, label
  const stubs = [
    { x: 10, c: "var(--accent)",  d: 0.0, lbl: "MAY" },
    { x: 18, c: "var(--signal)",  d: 0.25, lbl: "JUL" },
    { x: 24, c: "var(--success)", d: 0.5, lbl: "SEP" },
    { x: 33, c: "var(--accent)",  d: 0.75, lbl: "FEB" },
    { x: 40, c: "var(--signal)",  d: 1.0, lbl: "APR" },
    { x: 48, c: "var(--accent)",  d: 1.25, lbl: "OCT" },
    { x: 55, c: "var(--success)", d: 1.5, lbl: "JAN" },
    { x: 62, c: "var(--signal)",  d: 1.75, lbl: "MAR" },
    { x: 70, c: "var(--accent)",  d: 2.0, lbl: "AUG" },
    { x: 78, c: "var(--signal)",  d: 2.25, lbl: "NOV" },
    { x: 86, c: "var(--success)", d: 2.5, lbl: "JAN" },
  ];

  return (
    <SHFrame>
      <SHGrid opacity={0.18}/>

      {/* axis line */}
      <div style={{
        position: "absolute",
        left: "4%", right: "4%", top: "68%", height: 1,
        background: "linear-gradient(to right, transparent, var(--border-strong) 8%, var(--border-strong) 92%, transparent)",
      }}/>

      {/* year ticks */}
      {years.map((y, i) => {
        const x = 8 + (i * (84 / (years.length - 1)));
        return (
          <div key={y} style={{
            position: "absolute",
            left: `${x}%`, top: "calc(68% + 6px)",
            transform: "translateX(-50%)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 8 : 10, fontWeight: 700,
            color: "var(--fg-subtle)",
            letterSpacing: "0.12em",
          }}>
            <div style={{
              width: 1, height: 6,
              background: "var(--border-strong)",
              margin: "0 auto 4px",
            }}/>
            {y}
          </div>
        );
      })}

      {/* ticket stubs */}
      {stubs.map((s, i) => {
        const h = compact ? (22 + (i % 3) * 6) : (36 + (i % 3) * 10);
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${s.x}%`,
            top: "68%",
            transform: "translate(-50%, -100%)",
            transformOrigin: "bottom center",
            animation: `shStamp 600ms ${s.d}s cubic-bezier(.2,.8,.2,1) both`,
            "--sh-tilt": `${((i % 5) - 2) * 1.5}deg`,
          }}>
            <div style={{
              width: compact ? 16 : 22, height: h,
              background: "var(--bg-elevated)",
              border: `1.5px solid ${s.c}`,
              borderRadius: 3,
              boxShadow: `0 0 8px ${s.c}`,
              position: "relative",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end",
              paddingBottom: 3,
            }}>
              {/* perforation */}
              <div style={{
                position: "absolute",
                left: 1, right: 1, top: "35%",
                borderTop: "1px dashed var(--border-strong)",
                opacity: 0.7,
              }}/>
              {/* color slab */}
              <div style={{
                position: "absolute",
                left: 1, right: 1, top: 1, height: "30%",
                background: s.c,
                opacity: 0.25,
                borderRadius: "2px 2px 0 0",
              }}/>
              {!compact && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7, fontWeight: 800,
                  color: s.c,
                  letterSpacing: "0.04em",
                }}>{s.lbl}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* counter */}
      {!compact && (
        <div style={{
          position: "absolute",
          right: 22, top: 18,
          display: "flex", flexDirection: "column", alignItems: "flex-end",
          gap: 2,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            color: "var(--fg-subtle)",
            letterSpacing: "0.16em", textTransform: "uppercase",
          }}>Total shows</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 44, fontWeight: 900,
            color: "var(--signal)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textShadow: "0 0 16px var(--signal)",
            animation: "shPulse 2.6s ease-in-out infinite",
          }}>47</div>
        </div>
      )}

      <SHEyebrow compact={compact}>
        <SHDot color="var(--signal)" size={6}/> Shows attended · 2022 → today
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 4 · share — three poster cards fanning out ────────────────
// Cards start stacked at center, fan out to reveal three identity-art posters.
// Subtle "→" arrow CTA pulses behind.
function ShareHero({ compact }) {
  const cards = [
    { dx: compact ? -58 : -110, dy: compact ?  4 : 10, rot: -10, c: "var(--accent)",  d: 0.0 },
    { dx: 0,                    dy: 0,                  rot:  0,  c: "var(--signal)",  d: 0.25, primary: true },
    { dx: compact ?  58 : 110,  dy: compact ?  4 : 10, rot:  10, c: "var(--success)", d: 0.5 },
  ];
  const W = compact ? 70 : 130;
  const H = compact ? 96 : 176;

  return (
    <SHFrame>
      <SHGrid opacity={0.18}/>

      {/* radial bloom behind */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: compact ? 200 : 320, height: compact ? 200 : 320,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
        opacity: 0.18,
        animation: "shHalo 3.6s ease-in-out infinite",
        pointerEvents: "none",
      }}/>

      {cards.map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: W, height: H,
          "--sh-dx": `${c.dx}px`,
          "--sh-dy": `${c.dy}px`,
          "--sh-rot": `${c.rot}deg`,
          transform: `translate(calc(-50% + ${c.dx}px), calc(-50% + ${c.dy}px)) rotate(${c.rot}deg)`,
          animation: `shFan 700ms ${c.d}s cubic-bezier(.2,.8,.2,1) both`,
          zIndex: c.primary ? 3 : 2,
        }}>
          {/* paper card */}
          <div style={{
            width: "100%", height: "100%",
            background: "var(--bg-elevated)",
            border: `1.5px solid ${c.primary ? c.c : "var(--border-strong)"}`,
            borderRadius: 8,
            boxShadow: c.primary
              ? `0 12px 36px rgba(0,0,0,0.5), 0 0 24px ${c.c}`
              : "0 8px 22px rgba(0,0,0,0.4)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* identity-art placeholder strip */}
            <div style={{
              flex: 1, position: "relative",
              background: `linear-gradient(135deg, ${c.c} 0%, transparent 70%), var(--surface-2)`,
              overflow: "hidden",
            }}>
              {/* riso-style overlapping circles */}
              <div style={{
                position: "absolute",
                left: "20%", top: "30%",
                width: "55%", height: "55%",
                borderRadius: "50%",
                background: c.c,
                opacity: 0.7,
                mixBlendMode: "screen",
              }}/>
              <div style={{
                position: "absolute",
                right: "10%", bottom: "15%",
                width: "40%", height: "40%",
                borderRadius: "50%",
                background: c.primary ? "var(--accent)" : "var(--signal)",
                opacity: 0.6,
                mixBlendMode: "screen",
              }}/>
            </div>
            {/* bottom block */}
            <div style={{
              padding: compact ? "4px 6px 6px" : "8px 10px 10px",
              background: "var(--bg-elevated)",
              borderTop: `1px solid ${c.c}`,
            }}>
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: compact ? 7 : 11, fontWeight: 900,
                color: "var(--fg)",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
                marginBottom: 2,
              }}>amyl & the<br/>sniffers</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: compact ? 5 : 7, fontWeight: 700,
                color: c.c,
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>{c.primary ? "OGDEN · JUN 14" : "DENVER"}</div>
            </div>
          </div>
        </div>
      ))}

      {/* share glyph nestled top-right */}
      {!compact && (
        <div style={{
          position: "absolute",
          right: 22, top: 22,
          width: 38, height: 38, borderRadius: 19,
          background: "var(--bg-elevated)",
          border: "1.5px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--accent)",
          boxShadow: "0 0 14px var(--accent)",
          animation: "shFloat 3s ease-in-out infinite",
          zIndex: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8 L13 8 M9 4 L13 8 L9 12"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <SHEyebrow compact={compact} color="var(--accent)">
        <SHDot color="var(--accent)" size={6}/> One tap. Post the show.
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 5 · watchers — big count + ripples + "+1" badges ──────────
// Aggregate fan count. Concentric rings expand from the count, "+1"
// markers spawn around the perimeter and float up & fade.
function WatchersHero({ compact }) {
  // pre-position +1s around a circle
  const N = 6;
  const plusOnes = Array.from({ length: N }).map((_, i) => {
    const angle = (i * 360) / N + 18;
    const r = compact ? 60 : 100;
    const rad = (angle * Math.PI) / 180;
    return {
      dx: Math.cos(rad) * r,
      dy: Math.sin(rad) * r,
      d: (i * 0.45) % 2.4,
    };
  });

  return (
    <SHFrame>
      <SHGrid opacity={0.16}/>

      {/* ripple rings */}
      {[0, 0.8, 1.6].map((d, i) => (
        <span key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: compact ? 60 : 90, height: compact ? 60 : 90,
          borderRadius: "50%",
          border: "1.5px solid var(--signal)",
          opacity: 0.45,
          animation: `shRing 2.6s ${d}s ease-out infinite`,
          pointerEvents: "none",
        }}/>
      ))}

      {/* glow behind */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: compact ? 130 : 220, height: compact ? 130 : 220,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--signal) 0%, transparent 65%)",
        opacity: 0.22,
        pointerEvents: "none",
      }}/>

      {/* big count */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        zIndex: 3,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 38 : 72, fontWeight: 900,
          color: "var(--fg)",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          animation: "shPulse 2.4s ease-in-out infinite",
          textShadow: "0 0 24px var(--signal)",
        }}>247</div>
        {!compact && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 800,
            color: "var(--signal)",
            letterSpacing: "0.22em", textTransform: "uppercase",
            marginTop: 8,
          }}>watching now</div>
        )}
      </div>

      {/* +1 badges floating up from around the perimeter */}
      {plusOnes.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `calc(50% + ${p.dx}px)`,
          top: `calc(50% + ${p.dy}px)`,
          transform: "translate(-50%,-50%)",
          animation: `shPlusOne 2.4s ${p.d}s ease-out infinite`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 9 : 11, fontWeight: 800,
          color: "var(--accent)",
          padding: "3px 7px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent)",
          borderRadius: 999,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          boxShadow: "0 0 10px var(--accent)",
          zIndex: 4,
        }}>+1</div>
      ))}

      <SHEyebrow compact={compact}>
        <SHDot color="var(--signal)" size={6}/> Aggregate · no names
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 6 · passport-stamps — Concert Passport, direction A ───────
// Paper-toned passport page. Grid of stamp tiles inks in on a stagger,
// each tilted slightly. Some cells stay empty (future shows).
function PassportStampsHero({ compact }) {
  const cols = compact ? 5 : 6;
  const rows = compact ? 3 : 4;
  // Pick which cells are stamped vs empty
  const stamped = new Set(compact
    ? [0,1,2,4,5,6,8,9,10,12,13]
    : [0,1,2,3,5,6,7,8,9,11,12,13,14,16,17,18,21]);

  const stamps = [
    { lbl: "OGD", c: "var(--accent)" },
    { lbl: "RR",  c: "var(--signal)" },
    { lbl: "BLU", c: "var(--success)" },
    { lbl: "LAR", c: "var(--accent)" },
    { lbl: "FOX", c: "var(--signal)" },
    { lbl: "MIS", c: "var(--success)" },
  ];

  return (
    <SHFrame>
      {/* paper texture: warm tinted backplate */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, var(--surface-2), var(--surface-1))",
      }}/>

      {/* page binding spine left */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: compact ? 8 : 14,
        background: "linear-gradient(to right, var(--bg) 0%, transparent 100%)",
        opacity: 0.6,
      }}/>

      {/* stamp grid */}
      <div style={{
        position: "absolute",
        inset: compact ? "30px 18px 18px 22px" : "44px 32px 32px 36px",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: compact ? 6 : 10,
      }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const isStamped = stamped.has(i);
          const s = stamps[i % stamps.length];
          const tilt = ((i * 37) % 11) - 5;
          const delay = i * 0.08;
          return (
            <div key={i} style={{
              position: "relative",
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* dashed empty cell */}
              <div style={{
                position: "absolute", inset: 0,
                border: "1px dashed var(--border-strong)",
                borderRadius: 4,
                opacity: 0.35,
              }}/>

              {isStamped && (
                <div style={{
                  width: "100%", height: "100%",
                  borderRadius: 4,
                  border: `1.5px solid ${s.c}`,
                  background: "var(--bg-elevated)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 1,
                  "--sh-tilt": `${tilt}deg`,
                  transform: `rotate(${tilt}deg)`,
                  animation: `shStamp 520ms ${delay}s cubic-bezier(.2,.8,.2,1) both`,
                  boxShadow: `0 0 8px ${s.c}, inset 0 0 0 1px var(--bg-elevated)`,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* color wash */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: s.c,
                    opacity: 0.15,
                  }}/>
                  {/* label */}
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: compact ? 8 : 11, fontWeight: 900,
                    color: s.c,
                    letterSpacing: "0.06em",
                    zIndex: 2,
                  }}>{s.lbl}</div>
                  {!compact && (
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 6, fontWeight: 700,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                      zIndex: 2,
                    }}>'{22 + (i % 4)}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SHEyebrow compact={compact} color="var(--accent)">
        <SHDot color="var(--accent)" size={6}/> Concert Passport · 47 stamps
      </SHEyebrow>

      {!compact && (
        <div style={{
          position: "absolute",
          right: 18, bottom: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 700,
          color: "var(--fg-subtle)",
          letterSpacing: "0.18em", textTransform: "uppercase",
        }}>PAGE 03 / 12</div>
      )}
    </SHFrame>
  );
}

// ── 7 · passport-stars — Concert Passport, direction B ────────
// Star map: little background twinkles, bigger nodes appear in sequence with
// lines drawing between them — the journey across attended shows.
function PassportStarsHero({ compact }) {
  // background twinkles
  const twinkles = Array.from({ length: compact ? 30 : 60 }).map((_, i) => ({
    x: (i * 73) % 100,
    y: (i * 41) % 100,
    d: (i * 0.17) % 3,
    r: ((i * 13) % 7) === 0 ? 1.4 : 0.7,
  }));
  // journey nodes (path)
  const nodes = [
    { x: 14, y: 72, d: 0.0,  lbl: "OGD" },
    { x: 28, y: 48, d: 0.35, lbl: "FOX" },
    { x: 38, y: 64, d: 0.7,  lbl: "MIS" },
    { x: 52, y: 32, d: 1.05, lbl: "RR"  },
    { x: 60, y: 56, d: 1.4,  lbl: "BLU" },
    { x: 72, y: 38, d: 1.75, lbl: "LAR" },
    { x: 84, y: 60, d: 2.1,  lbl: "GLB" },
  ];

  return (
    <SHFrame>
      {/* night sky base */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 60% 30%, var(--surface-3) 0%, var(--bg) 80%)",
      }}/>

      {/* twinkles */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}>
        {twinkles.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r * 0.2}
            fill="var(--fg-muted)"
            opacity="0.6"
            style={{ animation: `shTwinkle 2.2s ${t.d}s ease-in-out infinite` }}/>
        ))}

        {/* journey lines (drawn one after another) */}
        {nodes.slice(0, -1).map((n, i) => {
          const m = nodes[i + 1];
          const len = Math.hypot(m.x - n.x, m.y - n.y);
          return (
            <line key={i}
              x1={n.x} y1={n.y} x2={m.x} y2={m.y}
              stroke="var(--signal)" strokeWidth="0.25"
              strokeDasharray={len} strokeDashoffset={len}
              style={{
                animation: `shLine 700ms ${m.d - 0.1}s cubic-bezier(.2,.8,.2,1) both`,
                opacity: 0,
              }}/>
          );
        })}
      </svg>

      {/* journey nodes */}
      {nodes.map((n, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${n.x}%`, top: `${n.y}%`,
          transform: "translate(-50%,-50%)",
          animation: `shStar 600ms ${n.d}s cubic-bezier(.2,.8,.2,1) both`,
          zIndex: 3,
        }}>
          <div style={{
            width: compact ? 8 : 12, height: compact ? 8 : 12, borderRadius: "50%",
            background: "var(--signal)",
            boxShadow: "0 0 12px var(--signal), 0 0 24px var(--signal)",
            position: "relative",
          }}/>
          {!compact && i % 2 === 0 && (
            <div style={{
              position: "absolute",
              left: "50%", top: "calc(100% + 4px)",
              transform: "translateX(-50%)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, fontWeight: 700,
              color: "var(--fg-muted)",
              letterSpacing: "0.14em",
              whiteSpace: "nowrap",
            }}>{n.lbl}</div>
          )}
        </div>
      ))}

      {/* freshest pulse on last node */}
      <div style={{
        position: "absolute",
        left: `${nodes[nodes.length - 1].x}%`,
        top: `${nodes[nodes.length - 1].y}%`,
      }}>
        <span style={{
          position: "absolute",
          left: 0, top: 0,
          width: 16, height: 16, marginLeft: -8, marginTop: -8,
          borderRadius: 8,
          background: "var(--signal)",
          opacity: 0.4,
          animation: "shRing 2s ease-out infinite",
        }}/>
      </div>

      <SHEyebrow compact={compact}>
        <SHDot color="var(--signal)" size={6}/> Constellation · 47 nights
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 8 · venue-stamps — Venue Passport, direction A ────────────
// One big headline stamp ("RED ROCKS · 10") with smaller satellite stamps
// (the individual nights) inking in around it.
function VenueStampsHero({ compact }) {
  const sats = [
    { x: 18, y: 28, d: 0.2 },
    { x: 82, y: 24, d: 0.4 },
    { x: 12, y: 56, d: 0.6 },
    { x: 88, y: 50, d: 0.8 },
    { x: 22, y: 80, d: 1.0 },
    { x: 78, y: 80, d: 1.2 },
    { x: 50, y: 14, d: 1.4 },
    { x: 50, y: 90, d: 1.6 },
    { x: 30, y: 14, d: 1.8 },
    { x: 70, y: 90, d: 2.0 },
  ];
  const months = ["JUN", "AUG", "SEP", "OCT", "MAY", "JUL", "APR", "AUG", "JUL", "SEP"];

  return (
    <SHFrame>
      {/* paper backplate */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, var(--surface-2), var(--surface-1))",
      }}/>
      {/* radial halo behind headline */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: compact ? 180 : 300, height: compact ? 180 : 300,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
        opacity: 0.22,
        animation: "shHalo 3.4s ease-in-out infinite",
      }}/>

      {/* satellite stamps */}
      {sats.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`, top: `${s.y}%`,
          transform: `translate(-50%,-50%) rotate(${((i * 37) % 13) - 6}deg)`,
          animation: `shStamp 520ms ${s.d}s cubic-bezier(.2,.8,.2,1) both`,
          padding: compact ? "3px 5px" : "5px 8px",
          background: "var(--bg-elevated)",
          border: "1.5px solid var(--signal)",
          borderRadius: 3,
          boxShadow: "0 0 8px var(--signal)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 7 : 9, fontWeight: 800,
          color: "var(--signal)",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}>
          {months[i]} '{22 + (i % 4)}
        </div>
      ))}

      {/* headline stamp */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%) rotate(-2deg)",
        padding: compact ? "10px 14px" : "16px 24px",
        background: "var(--bg-elevated)",
        border: "2.5px solid var(--accent)",
        borderRadius: 4,
        boxShadow: "0 0 24px var(--accent), 0 8px 22px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4,
        zIndex: 3,
        "--sh-glow": "var(--accent)",
        animation: "shVerify 2.6s ease-in-out infinite",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 9 : 11, fontWeight: 800,
          color: "var(--accent)",
          letterSpacing: "0.22em",
        }}>RED ROCKS</div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: compact ? 34 : 56, fontWeight: 900,
          color: "var(--fg)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}>10</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 7 : 9, fontWeight: 700,
          color: "var(--fg-muted)",
          letterSpacing: "0.22em", textTransform: "uppercase",
        }}>nights · since '22</div>
      </div>

      <SHEyebrow compact={compact} color="var(--accent)">
        <SHDot color="var(--accent)" size={6}/> Venue Passport · stamp recap
      </SHEyebrow>
    </SHFrame>
  );
}

// ── 9 · venue-stars — Venue Passport, direction B ─────────────
// One big central star (venue) with smaller orbiting stars (visits). Soft
// connecting lines radiate from the center.
function VenueStarsHero({ compact }) {
  const N = 10;
  const orbits = Array.from({ length: N }).map((_, i) => {
    const angle = (i * 360) / N + 12;
    const ring = i < 6 ? 0 : 1;
    const r = ring === 0 ? (compact ? 56 : 98) : (compact ? 78 : 140);
    const rad = (angle * Math.PI) / 180;
    return {
      dx: Math.cos(rad) * r,
      dy: Math.sin(rad) * r,
      d: 0.15 + i * 0.12,
      angle, r,
    };
  });

  // twinkles
  const twinkles = Array.from({ length: compact ? 22 : 44 }).map((_, i) => ({
    x: (i * 71) % 100,
    y: (i * 43) % 100,
    d: (i * 0.19) % 3,
  }));

  return (
    <SHFrame>
      {/* night sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 50%, var(--surface-3) 0%, var(--bg) 80%)",
      }}/>

      {/* twinkles */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}>
        {twinkles.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r="0.18"
            fill="var(--fg-muted)" opacity="0.6"
            style={{ animation: `shTwinkle 2.4s ${t.d}s ease-in-out infinite` }}/>
        ))}
      </svg>

      {/* radiating lines from center to each orbit */}
      <svg width="100%" height="100%" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {orbits.map((o, i) => (
          <line key={i}
            x1="50%" y1="50%"
            x2={`calc(50% + ${o.dx}px)`} y2={`calc(50% + ${o.dy}px)`}
            stroke="var(--accent)" strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0"
            style={{ animation: `shFadeUp 600ms ${o.d}s both`, animationFillMode: "forwards" }}/>
        ))}
      </svg>

      {/* orbit stars */}
      {orbits.map((o, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `calc(50% + ${o.dx}px)`,
          top: `calc(50% + ${o.dy}px)`,
          animation: `shStar 600ms ${o.d}s cubic-bezier(.2,.8,.2,1) both`,
          zIndex: 3,
        }}>
          <div style={{
            width: compact ? 6 : 10, height: compact ? 6 : 10, borderRadius: "50%",
            background: "var(--signal)",
            boxShadow: "0 0 10px var(--signal)",
            transform: "translate(-50%,-50%)",
          }}/>
        </div>
      ))}

      {/* central venue star */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        zIndex: 4,
      }}>
        {/* big star */}
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: compact ? 38 : 60, height: compact ? 38 : 60,
            marginLeft: compact ? -19 : -30,
            marginTop: compact ? -19 : -30,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent) 0%, transparent 65%)",
            opacity: 0.6,
            animation: "shHalo 3s ease-in-out infinite",
          }}/>
          <div style={{
            width: compact ? 14 : 22, height: compact ? 14 : 22, borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 18px var(--accent), 0 0 36px var(--accent)",
          }}/>
        </div>
        {!compact && (
          <>
            <div style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 22, fontWeight: 900,
              color: "var(--fg)",
              letterSpacing: "-0.03em",
              marginTop: 12,
              textShadow: "0 2px 8px var(--bg)",
            }}>Red Rocks</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 800,
              color: "var(--accent)",
              letterSpacing: "0.22em", textTransform: "uppercase",
              textShadow: "0 1px 4px var(--bg)",
            }}>10 nights</div>
          </>
        )}
      </div>

      <SHEyebrow compact={compact}>
        <SHDot color="var(--accent)" size={6}/> Venue Passport · constellation
      </SHEyebrow>
    </SHFrame>
  );
}

// ── Dispatcher ────────────────────────────────────────────────
const SH_HEROES = {
  price:             PriceHero,
  tiers:             TiersHero,
  history:           HistoryHero,
  share:             ShareHero,
  watchers:          WatchersHero,
  "passport-stamps": PassportStampsHero,
  "passport-stars":  PassportStarsHero,
  "venue-stamps":    VenueStampsHero,
  "venue-stars":     VenueStarsHero,
};

// SpotlightHeroV2 — drop-in replacement for SpotlightHero that ALSO knows
// the existing "map" hero (delegates to window.SpotlightHero from
// release-notes.jsx). Use this in the modal so existing releases still work.
function SpotlightHeroV2({ hero = "map", compact = false }) {
  if (hero === "map" && window.SpotlightHero) {
    return <window.SpotlightHero hero="map" compact={compact}/>;
  }
  const H = SH_HEROES[hero];
  if (!H) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: "var(--surface-1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-subtle)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
      }}>missing: {hero}</div>
    );
  }
  return <H compact={compact}/>;
}

Object.assign(window, {
  PriceHero, TiersHero, HistoryHero, ShareHero, WatchersHero,
  PassportStampsHero, PassportStarsHero, VenueStampsHero, VenueStarsHero,
  SpotlightHeroV2, SH_HEROES,
});
