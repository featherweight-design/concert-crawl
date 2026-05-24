// passport-concepts-v3.jsx — the in-between
//
// Stub Stack · Showtime — between v1 (restraint) and v2 (Encore push).
//
// Keeps:    dark cinematic stage, restrained per-stub graphic (one circle +
//           one glyph, not a full mini-poster), intimate "keepsake" tone.
// Adds:     ONE accent colour per stub (perforation, glyph, mono details)
//           so the stack reads as a *collection of distinct nights* not
//           "six dim siblings of the top stub". Two slow background washes
//           (warm amber from upper-right, cool teal from lower-left).
//           Twelve sparkles drifting — a fraction of v2's confetti density.
//           Varied deal-in angles but tighter spread than Encore.

if (typeof document !== "undefined" && !document.getElementById("pc3-keyframes")) {
  const s = document.createElement("style");
  s.id = "pc3-keyframes";
  s.textContent = `
    /* Re-uses pc2StubDealVaried, pc2StubBreathe, pc2BgShift, pc2Sparkle,
       pc2Pulse, pc2EyebrowEnter from passport-concepts-v2.jsx — they only
       need to exist on the page once. */
  `;
  document.head.appendChild(s);
}

function PassportShowtimeStubs() {
  const W = 580, H = 300;

  // Per-stub identity: ONE accent colour, otherwise restrained.
  const stubs = [
    { tx: -10, rot: -14, sx: -160, sy: -120, srot: -28, d: 0.10,
      body: "#1F1730", accent: "#FFB838", glyph: "△", subtitle: "DOORS" },
    { tx: 10,  rot: 10,  sx: 180,  sy: -100, srot: 32,  d: 0.25,
      body: "#1A2A30", accent: "#5DD4D6", glyph: "○", subtitle: "FRONT" },
    { tx: -12, rot: -6,  sx: -200, sy: 60,   srot: -20, d: 0.40,
      body: "#2A1A2A", accent: "#FF7BD4", glyph: "⬡", subtitle: "PIT"   },
    { tx: 6,   rot: 4,   sx: 190,  sy: 40,   srot: 25,  d: 0.55,
      body: "#241F38", accent: "#A075FF", glyph: "◆", subtitle: "GA"    },
    { tx: -5,  rot: -9,  sx: -180, sy: -140, srot: -15, d: 0.70,
      body: "#1A2820", accent: "#C9F26E", glyph: "+", subtitle: "BALC"  },
    { tx: 4,   rot: 5,   sx: 200,  sy: -60,  srot: 18,  d: 0.85,
      body: "#2A1F1A", accent: "#FFE36B", glyph: "✦", subtitle: "ENCORE"},
    // top — headline
    { tx: 0,   rot: -2,  sx: 0,    sy: -220, srot: -6,  d: 1.05,
      body: "#0C0A14", accent: "#7AE6FF", glyph: "★", subtitle: "ADMIT ONE",
      top: true },
  ];

  const sparkles = Array.from({ length: 12 }).map((_, i) => ({
    x: ((i * 47) % W),
    y: ((i * 71) % H),
    d: (i * 0.23) % 3,
    hue: ["#7AE6FF", "#FFE36B", "#FF7BD4", "#FFFFFF"][i % 4],
  }));

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* ONE warm wash + ONE cool wash — slow drift, screen blend */}
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

      {/* sparkles — 12 not 28 */}
      {sparkles.map((sp, i) => (
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
      ))}

      {/* floor glow under stack */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: 30,
        width: 360, height: 60,
        transform: "translateX(-50%)",
        background: "radial-gradient(ellipse, rgba(122,230,255,0.20) 0%, transparent 60%)",
        filter: "blur(4px)",
        pointerEvents: "none",
      }}/>

      {/* stack */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        width: 220, height: 130,
      }}>
        {stubs.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            left: 0, top: 0,
            width: 220, height: 130,
            "--pc-sx": `${s.sx}px`,
            "--pc-sy": `${s.sy}px`,
            "--pc-srot": `${s.srot}deg`,
            "--pc-tx": `${s.tx}px`,
            "--pc-rot": `${s.rot}deg`,
            transform: `translate(${s.tx}px, 0) rotate(${s.rot}deg)`,
            transformOrigin: "center center",
            animation: `pc2StubDealVaried 800ms ${s.d}s cubic-bezier(.2,.85,.2,1) both${s.top ? ", pc2StubBreathe 4.5s 2s ease-in-out infinite" : ""}`,
            zIndex: i + 1,
            filter: s.top
              ? "drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(122,230,255,0.28))"
              : "drop-shadow(0 5px 10px rgba(0,0,0,0.45))",
          }}>
            <ShowtimeStub s={s}/>
          </div>
        ))}
      </div>

      {/* eyebrow */}
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
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#7AE6FF",
          boxShadow: "0 0 8px #7AE6FF",
          animation: "pc2Pulse 1.6s ease-in-out infinite",
        }}/>
        Showtime · every night kept
      </div>
    </div>
  );
}

// ── StubGlyph ─────────────────────────────────────────────────
// Renders the central stub mark as an SVG polygon whose CENTROID sits at
// the (12,12) center of a 0–24 viewBox. Combined with translate(-50%, -50%)
// on the wrapper, the glyph is pixel-perfect centered — no font-metric
// guesswork. Used by Passport stubs, History stubs, and Calendar stamps.
function StubGlyph({ kind, size = 36, color }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", style: { display: "block" } };
  switch (kind) {
    case "★":
      return (
        <svg {...p}>
          <polygon
            points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
            fill={color}/>
        </svg>
      );
    case "△":
      return (
        <svg {...p}><polygon points="12,2 20.66,17 3.34,17" fill={color}/></svg>
      );
    case "○":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" fill="none"
            stroke={color} strokeWidth="2.8"/>
        </svg>
      );
    case "⭡":
      return (
        <svg {...p}>
          <polygon
            points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
            fill={color}/>
        </svg>
      );
    case "◆":
      return (
        <svg {...p}>
          <polygon points="12,2 22,12 12,22 2,12" fill={color}/>
        </svg>
      );
    case "+":
      return (
        <svg {...p}>
          <path d="M12 3 L12 21 M3 12 L21 12"
            stroke={color} strokeWidth="3.8"
            strokeLinecap="round" fill="none"/>
        </svg>
      );
    case "✦":
      return (
        <svg {...p}>
          <polygon
            points="12,1 15,9 23,12 15,15 12,23 9,15 1,12 9,9"
            fill={color}/>
        </svg>
      );
    default:
      return null;
  }
}

function ShowtimeStub({ s }) {
  return (
    <div style={{ position: "relative", width: 220, height: 130 }}>
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* body */}
        <path d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
          fill={s.body}
          stroke={s.top ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}
          strokeWidth="1"/>
        <path d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
          fill={s.body}
          stroke={s.top ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}
          strokeWidth="1"/>

      {/* single restrained mark — ring (glyph rendered as HTML overlay below) */}
      <circle cx="40" cy="65" r="30" fill="none"
        stroke={s.accent} strokeWidth="2"
        opacity={s.top ? 0.9 : 0.65}/>

      {/* right column copy */}
      <text x="88" y={s.top ? 32 : 30}
        fontFamily="Inter, sans-serif"
        fontSize={s.top ? 17 : 14} fontWeight="900"
        fill="rgba(255,255,255,0.95)"
        letterSpacing="-0.04em">{s.top ? "TONIGHT" : s.subtitle}</text>
      <text x="88" y="46"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="8" fontWeight="800" letterSpacing="1.5"
        fill={s.accent}
        opacity="0.85">ADMIT ONE</text>
      <line x1="88" y1="54" x2="156" y2="54"
        stroke={s.accent} strokeWidth="1" opacity="0.5"/>

      {s.top ? (
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
          fill="rgba(255,255,255,0.4)">DOORS · 8 PM</text>
      )}

      {/* perforation in accent */}
      <line x1="166" y1="6" x2="166" y2="124"
        stroke={s.accent} strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>
      {[14, 38, 62, 86, 110].map((y, j) => (
        <circle key={j} cx="166" cy={y + 6} r="1.5" fill={s.body}
          stroke={s.accent} strokeWidth="0.5" opacity="0.55"/>
      ))}

      {/* vertical tear-off text */}
      <text x="195" y="12"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="8" fontWeight="800"
        fill={s.accent}
        opacity={s.top ? 0.7 : 0.5}
        letterSpacing="2"
        transform="rotate(90 195 12)">{s.top ? "NO RE-ENTRY" : "STUB"}</text>
      </svg>

      {/* SVG overlay glyph — centroid-centered polygon, pixel-perfect */}
      <div style={{
        position: "absolute",
        left: `${(40/220)*100}%`,
        top: `${(65/130)*100}%`,
        transform: "translate(-50%, -50%)",
        opacity: s.top ? 1 : 0.8,
        pointerEvents: "none",
      }}>
        <StubGlyph kind={s.glyph} size={s.top ? 40 : 32} color={s.accent}/>
      </div>
    </div>
  );
}

Object.assign(window, { PassportShowtimeStubs, ShowtimeStub, StubGlyph });
