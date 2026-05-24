// more-features-showtime.jsx — extending the Stub Stack · Showtime language
// to two more priority features.
//
//   TierShowtime    — Upgrade Flow + Tier Badges (#2): three luminous
//                     MEDALLIONS (not cards), pulling from the existing
//                     Concert Crawl tier system:
//                       Supporter · + glyph · $2/mo · brand pink
//                       Premium   · ★ glyph · $5/mo · brand cyan
//                       Founder   · ♔ glyph · $3/mo locked · cyan+pink gradient
//                                                first 100 only
//                     Founder is centered + larger + extra halo.
//   HistoryShowtime — Concert History (#3): horizontal cascade of stubs
//                     fanned across a year axis, with a "47 nights kept"
//                     counter. Same stub artifact as Passport; different
//                     composition + counter dressing.
//
// All glyphs render as HTML overlays on top of their SVG containers —
// dominant-baseline rendering across browsers/fonts isn't reliable for
// symbol glyphs, so we position glyphs with HTML flex centering for pixel-
// perfect placement.
//
// Re-uses keyframes from passport-concepts-v2.jsx (pc2StubDealVaried,
// pc2StubBreathe, pc2BgShift, pc2Sparkle, pc2Pulse, pc2EyebrowEnter).

// ── Shared backdrop ──────────────────────────────────────────
function ShowtimeBackdrop({ founderGlow }) {
  return (
    <>
      <div style={{
        position: "absolute",
        right: -60, top: -80,
        width: 360, height: 360,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,184,56,0.22) 0%, transparent 65%)",
        animation: "pc2BgShift 12s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        left: -80, bottom: -100,
        width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 65%)",
        animation: "pc2BgShift 14s 1s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      {founderGlow && (
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 280, height: 280,
          marginLeft: -140, marginTop: -140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,227,107,0.18) 0%, transparent 65%)",
          pointerEvents: "none",
        }}/>
      )}
    </>
  );
}

function ShowtimeSparkles({ W = 580, H = 300, count = 12 }) {
  const sparkles = Array.from({ length: count }).map((_, i) => ({
    x: ((i * 47) % W),
    y: ((i * 71) % H),
    d: (i * 0.23) % 3,
    hue: ["#7AE6FF", "#FFE36B", "#FF7BD4", "#FFFFFF"][i % 4],
  }));
  return sparkles.map((sp, i) => (
    <span key={i} style={{
      position: "absolute",
      left: sp.x, top: sp.y,
      width: 3, height: 3,
      borderRadius: "50%",
      background: sp.hue,
      boxShadow: `0 0 6px ${sp.hue}`,
      animation: `pc2Sparkle 2.2s ${sp.d}s ease-in-out infinite`,
      pointerEvents: "none",
    }}/>
  ));
}

function ShowtimeEyebrow({ children, dotHue = "#7AE6FF" }) {
  return (
    <div style={{
      position: "absolute",
      left: 18, top: 16,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 800,
      color: "rgba(255,255,255,0.92)",
      letterSpacing: "0.24em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 8,
      textShadow: "0 1px 8px rgba(0,0,0,0.9)",
      animation: "pc2EyebrowEnter 1.2s 0.2s ease-out both",
      zIndex: 30,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 6,
        background: dotHue,
        boxShadow: `0 0 8px ${dotHue}`,
        animation: "pc2Pulse 1.6s ease-in-out infinite",
      }}/>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tier glyphs — pulled from monetization-shared.jsx TierBadge
// ════════════════════════════════════════════════════════════════
// Plus / star / crown — the existing iconography. Crown is the marquee mark
// for Founder; star is Premium (already on the user's "Star" tier today);
// plus is Supporter (the existing tier-badge glyph). Rendered as SVG so
// they scale with the parent transform, and they sit inside a flex-centred
// HTML wrapper for exact placement on top of the medallion ring.
function TierGlyph({ tier, size = 50, color, stroke }) {
  if (tier === "supporter") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d="M12 4.5 L12 19.5 M4.5 12 L19.5 12"
          stroke={color} strokeWidth="3.6" strokeLinecap="round"/>
      </svg>
    );
  }
  if (tier === "premium") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <polygon
          points="12,2.5 14.85,8.45 21.5,9.45 16.5,13.85 18.05,20.5 12,17.05 5.95,20.5 7.5,13.85 2.5,9.45 9.15,8.45"
          fill={color}/>
      </svg>
    );
  }
  if (tier === "founder") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        {/* peaks (3-point crown) */}
        <path d="M3 17 L3 7.5 L7.5 13 L12 4 L16.5 13 L21 7.5 L21 17 Z"
          fill={color}
          stroke={stroke || color}
          strokeWidth="0.6"
          strokeLinejoin="round"/>
        {/* base bar */}
        <rect x="3" y="17.5" width="18" height="2.6" rx="0.5" fill={color}/>
        {/* jewels */}
        <circle cx="7.5" cy="11.2" r="0.95" fill={stroke || color}/>
        <circle cx="12"  cy="6.5"  r="0.95" fill={stroke || color}/>
        <circle cx="16.5" cy="11.2" r="0.95" fill={stroke || color}/>
      </svg>
    );
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
// TIER MEDALLION (replaces the rectangular tier card)
// ════════════════════════════════════════════════════════════════
// Disc with the tier glyph, halo behind, label + price below. Founder is
// ~20% larger with a gradient ring (cyan → pink) and an extra dual-hue
// halo. Reads as a trophy / earned-badge — different artifact vocabulary
// from stubs, but same dark stage + washes + sparkles.
function TierMedallion({ tier }) {
  const isFounder = tier.key === "founder";
  const discSize = isFounder ? 134 : 108;
  const haloSize = discSize * 1.6;

  return (
    <div style={{
      position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      width: 160,
    }}>
      {/* halo glow behind */}
      <div style={{
        position: "absolute",
        left: "50%", top: discSize / 2,
        width: haloSize, height: haloSize,
        marginLeft: -haloSize / 2, marginTop: -haloSize / 2,
        borderRadius: "50%",
        background: isFounder
          ? `radial-gradient(circle, ${tier.accent2}55 0%, ${tier.accent}33 32%, transparent 65%)`
          : `radial-gradient(circle, ${tier.accent}33 0%, transparent 65%)`,
        opacity: isFounder ? 0.85 : 0.55,
        pointerEvents: "none",
      }}/>

      {/* disc */}
      <div style={{
        position: "relative",
        width: discSize, height: discSize,
        zIndex: 2,
      }}>
        <svg width={discSize} height={discSize} viewBox="0 0 120 120"
          style={{ position: "absolute", inset: 0 }}>
          {isFounder && (
            <defs>
              <linearGradient id={`founder-ring-${tier.key}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={tier.accent}/>
                <stop offset="100%" stopColor={tier.accent2}/>
              </linearGradient>
            </defs>
          )}
          {/* outer ring */}
          <circle cx="60" cy="60" r="57"
            fill="rgba(255,255,255,0.04)"
            stroke={isFounder ? `url(#founder-ring-${tier.key})` : tier.accent}
            strokeWidth="2.5"/>
          {/* inner subtle ring */}
          <circle cx="60" cy="60" r="48"
            fill="none"
            stroke={tier.accent}
            strokeWidth="0.6"
            opacity="0.45"/>
          {/* cardinal ticks */}
          {[0, 90, 180, 270].map(a => (
            <line key={a}
              x1="60" y1="3" x2="60" y2="8"
              stroke={tier.accent}
              strokeWidth="1.4"
              opacity="0.7"
              transform={`rotate(${a} 60 60)`}/>
          ))}
        </svg>
        {/* HTML overlay glyph — perfectly centered */}
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <TierGlyph
            tier={tier.key}
            size={discSize * 0.46}
            color={tier.accent}
            stroke={isFounder ? tier.accent2 : null}/>
        </div>
      </div>

      {/* label */}
      <div style={{
        textAlign: "center",
        zIndex: 2,
        position: "relative",
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: isFounder ? 16 : 14, fontWeight: 900,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "-0.02em",
          marginBottom: 3,
          textShadow: "0 1px 8px rgba(0,0,0,0.8)",
        }}>{tier.name.toUpperCase()}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: tier.accent,
          letterSpacing: "1.5px",
          textShadow: "0 1px 6px rgba(0,0,0,0.8)",
        }}>{tier.priceText}</div>
        {isFounder && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 800,
            color: tier.accent2,
            letterSpacing: "1.8px",
            marginTop: 3,
            opacity: 0.92,
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}>FIRST 100 ONLY</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TIER BADGES · Showtime
// ════════════════════════════════════════════════════════════════
function TierShowtime() {
  // Pricing + glyphs match design_handoff_monetization · TIERS:
  //   Supporter $2/mo  · plus  · brand pink   (var(--accent))
  //   Premium   $5/mo  · star  · brand cyan   (var(--signal))
  //   Founder   $3/mo locked, first 100 · crown · cyan + pink gradient
  // Hero is theme-independent so colours are pinned to electric values.
  const tiers = [
    {
      key: "supporter", name: "Supporter",
      priceText: "$2 / MONTH",
      accent: "#FF7BD4",
      pos: { tx: -180, rot: -3 },
      from: { sx: -260, sy: -100, srot: -20 },
      d: 0.10,
    },
    {
      key: "founder", name: "Founder",
      priceText: "$3 / MO · FOR LIFE",
      accent: "#7AE6FF",
      accent2: "#FF7BD4",
      pos: { tx: 0, rot: -1 },
      from: { sx: 0, sy: -240, srot: -8 },
      d: 0.45, founder: true,
    },
    {
      key: "premium", name: "Premium",
      priceText: "$5 / MONTH",
      accent: "#7AE6FF",
      pos: { tx: 180, rot: 3 },
      from: { sx: 260, sy: -100, srot: 20 },
      d: 0.25,
    },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      {/* Founder central two-tone spotlight */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 300, height: 300,
        marginLeft: -150, marginTop: -190,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.18) 0%, rgba(255,123,212,0.12) 35%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {tiers.map((t) => (
        <div key={t.key} style={{
          position: "absolute",
          left: "50%", top: "50%",
          marginTop: -100,
          marginLeft: -80,
          "--pc-sx": `${t.from.sx}px`,
          "--pc-sy": `${t.from.sy}px`,
          "--pc-srot": `${t.from.srot}deg`,
          "--pc-tx": `${t.pos.tx}px`,
          "--pc-rot": `${t.pos.rot}deg`,
          transform: `translate(${t.pos.tx}px, 0) rotate(${t.pos.rot}deg)`,
          transformOrigin: "center center",
          animation: `pc2StubDealVaried 800ms ${t.d}s cubic-bezier(.2,.85,.2,1) both${t.founder ? ", pc2StubBreathe 4.5s 1.7s ease-in-out infinite" : ""}`,
          zIndex: t.founder ? 10 : 5,
          filter: t.founder
            ? `drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 0 26px ${t.accent}66)`
            : `drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 16px ${t.accent}33)`,
        }}>
          <TierMedallion tier={t}/>
        </div>
      ))}

      <ShowtimeEyebrow dotHue="#7AE6FF">Pick your seat</ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CONCERT HISTORY · Showtime
// ════════════════════════════════════════════════════════════════
function HistoryShowtime() {
  const stubs = [
    { x: 70,  rot: -4,  sx: -120, sy: -160, srot: -22, d: 0.10,
      accent: "#FFB838", glyph: "△", year: "'22" },
    { x: 130, rot:  2,  sx: -80,  sy:  80, srot:  14, d: 0.20,
      accent: "#5DD4D6", glyph: "○", year: "'23" },
    { x: 195, rot: -3,  sx: -40,  sy: -120, srot: -10, d: 0.30,
      accent: "#FF7BD4", glyph: "⬡", year: "'23" },
    { x: 260, rot:  1,  sx:   0,  sy:  100, srot:   8, d: 0.40,
      accent: "#A075FF", glyph: "◆", year: "'24" },
    { x: 325, rot: -2,  sx:  40,  sy: -120, srot: -14, d: 0.50,
      accent: "#C9F26E", glyph: "+", year: "'24" },
    { x: 390, rot:  3,  sx:  80,  sy:   80, srot:  18, d: 0.60,
      accent: "#FFE36B", glyph: "✦", year: "'25" },
    { x: 470, rot: -1.5, sx: 220, sy: -200, srot: -8,  d: 0.85,
      accent: "#7AE6FF", glyph: "★", year: "'26", current: true },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop/>

      {/* year axis */}
      <div style={{
        position: "absolute",
        left: 24, right: 200, top: 88,
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), rgba(255,255,255,0.18), transparent)",
      }}/>
      {stubs.map((s, i) => (
        <div key={`yr-${i}`} style={{
          position: "absolute",
          left: s.x, top: 96,
          transform: "translateX(-50%)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: s.current ? s.accent : "rgba(255,255,255,0.55)",
          letterSpacing: "1.5px",
          opacity: 0,
          animation: `pc2EyebrowEnter 600ms ${s.d + 0.2}s ease-out both`,
        }}>
          <span style={{
            display: "block",
            width: 1, height: 6,
            background: s.current ? s.accent : "rgba(255,255,255,0.35)",
            margin: "0 auto 4px",
          }}/>
          {s.year}
        </div>
      ))}

      {/* big counter, top-right */}
      <div style={{
        position: "absolute",
        right: 24, top: 14,
        textAlign: "right",
        zIndex: 5,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: "1.8px", textTransform: "uppercase",
          opacity: 0,
          animation: "pc2EyebrowEnter 800ms 1s ease-out both",
        }}>Nights kept</div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 56, fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          marginTop: 2,
          textShadow: "0 0 24px rgba(122,230,255,0.35)",
          opacity: 0,
          animation: "pc2EyebrowEnter 1s 1.1s ease-out both",
        }}>47</div>
      </div>

      {/* stubs cascade */}
      {stubs.map((s, i) => {
        const scale = s.current ? 0.88 : 0.66;
        return (
          <div key={i} style={{
            position: "absolute",
            left: s.x, top: 190,
            width: 220, height: 130,
            marginLeft: -110, marginTop: -65,
            "--pc-sx": `${s.sx}px`,
            "--pc-sy": `${s.sy}px`,
            "--pc-srot": `${s.srot}deg`,
            "--pc-tx": "0px",
            "--pc-rot": `${s.rot}deg`,
            transform: `rotate(${s.rot}deg) scale(${scale})`,
            transformOrigin: "center center",
            animation: `pc2StubDealVaried 800ms ${s.d}s cubic-bezier(.2,.85,.2,1) both${s.current ? ", pc2StubBreathe 4.5s 2s ease-in-out infinite" : ""}`,
            zIndex: s.current ? 20 : (10 - i),
            filter: s.current
              ? `drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 0 18px ${s.accent}55)`
              : "drop-shadow(0 5px 10px rgba(0,0,0,0.5))",
            opacity: s.current ? 1 : 0.85,
          }}>
            <HistoryStub s={s}/>
          </div>
        );
      })}

      <ShowtimeEyebrow dotHue="#7AE6FF">Every night, every year</ShowtimeEyebrow>
    </div>
  );
}

function HistoryStub({ s }) {
  return (
    <div style={{ position: "relative", width: 220, height: 130 }}>
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* body */}
        <path d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
          fill={s.current ? "#0C0A14" : "#1A1626"}
          stroke={s.current ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}
          strokeWidth="1"/>
        <path d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
          fill={s.current ? "#0C0A14" : "#1A1626"}
          stroke={s.current ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}
          strokeWidth="1"/>

        {/* ring (glyph rendered as HTML overlay below) */}
        <circle cx="40" cy="65" r="30" fill="none"
          stroke={s.accent} strokeWidth="2"
          opacity={s.current ? 0.95 : 0.6}/>

        {/* right column */}
        <text x="88" y={s.current ? 32 : 30}
          fontFamily="Inter, sans-serif"
          fontSize={s.current ? 17 : 14} fontWeight="900"
          fill={s.current ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)"}
          letterSpacing="-0.04em">{s.current ? "TONIGHT" : "ATTENDED"}</text>
        <text x="88" y="46"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="8" fontWeight="800" letterSpacing="1.5"
          fill={s.accent}
          opacity={s.current ? 0.85 : 0.65}>ADMIT ONE</text>
        <line x1="88" y1="54" x2="156" y2="54"
          stroke={s.accent} strokeWidth="1" opacity="0.5"/>
        {s.current ? (
          <>
            <text x="88" y="74"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8" fontWeight="700" letterSpacing="1.4"
              fill="rgba(255,255,255,0.6)">DOORS · 8 PM</text>
            <text x="88" y="88"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8" fontWeight="700" letterSpacing="1.4"
              fill="rgba(255,255,255,0.45)">GA · 21+</text>
            <text x="88" y="116"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11" fontWeight="900" letterSpacing="2"
              fill={s.accent}>№ 047</text>
          </>
        ) : (
          <text x="88" y="74"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="7" fontWeight="700" letterSpacing="1.4"
            fill="rgba(255,255,255,0.4)">{s.year} · KEPT</text>
        )}

        {/* perforation */}
        <line x1="166" y1="6" x2="166" y2="124"
          stroke={s.accent} strokeWidth="1" strokeDasharray="3 4"
          opacity={s.current ? 0.55 : 0.4}/>
        {[14, 38, 62, 86, 110].map((y, j) => (
          <circle key={j} cx="166" cy={y + 6} r="1.5"
            fill={s.current ? "#0C0A14" : "#1A1626"}
            stroke={s.accent} strokeWidth="0.5"
            opacity={s.current ? 0.6 : 0.45}/>
        ))}

        {/* vertical tear-off */}
        <text x="195" y="12"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="8" fontWeight="800"
          fill={s.accent}
          opacity={s.current ? 0.7 : 0.45}
          letterSpacing="2"
          transform="rotate(90 195 12)">{s.current ? "NO RE-ENTRY" : "STUB"}</text>
      </svg>

      {/* SVG overlay glyph — centroid-centered polygon, pixel-perfect */}
      <div style={{
        position: "absolute",
        left: `${(40/220)*100}%`,
        top: `${(65/130)*100}%`,
        transform: "translate(-50%, -50%)",
        opacity: s.current ? 1 : 0.75,
        pointerEvents: "none",
      }}>
        <window.StubGlyph kind={s.glyph} size={s.current ? 40 : 32} color={s.accent}/>
      </div>
    </div>
  );
}

Object.assign(window, {
  ShowtimeBackdrop, ShowtimeSparkles, ShowtimeEyebrow,
  TierGlyph, TierMedallion, TierShowtime,
  HistoryShowtime, HistoryStub,
});
