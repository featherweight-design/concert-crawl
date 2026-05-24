// passport-concepts-v2.jsx — pushed-further hybrids
//
// Same two directions, but cranked into Wrapped-energy territory:
//   1 · STUB STACK · ENCORE   — stubs themselves are saturated mini-posters,
//                                each its own colour world, deal in from
//                                varied angles with confetti drift overhead
//   2 · SPOTLIGHT PHONE · REVEAL — multi-hue aura, denser confetti, kinetic
//                                  stamps animating inside, more aggressive
//                                  staging

// ── keyframes ────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("pc2-keyframes")) {
  const s = document.createElement("style");
  s.id = "pc2-keyframes";
  s.textContent = `
    @keyframes pc2StubDealVaried {
      0%   { transform: translate(var(--pc-sx, 0px), var(--pc-sy, -240px)) rotate(var(--pc-srot, 0deg)) scale(.6); opacity: 0; }
      60%  { transform: translate(var(--pc-tx, 0px), 8px) rotate(calc(var(--pc-rot, 0deg) + 3deg)) scale(1.03); opacity: 1; }
      100% { transform: translate(var(--pc-tx, 0px), 0)   rotate(var(--pc-rot, 0deg))             scale(1);    opacity: 1; }
    }
    @keyframes pc2StubBreathe {
      0%,100% { transform: translate(var(--pc-tx, 0px), 0)    rotate(var(--pc-rot, 0deg)); }
      50%     { transform: translate(var(--pc-tx, 0px), -4px) rotate(calc(var(--pc-rot, 0deg) - 0.6deg)); }
    }
    @keyframes pc2Confetti {
      0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translate(var(--pc-cx, 100px), var(--pc-cy, -200px)) rotate(var(--pc-cr, 540deg)); opacity: 0; }
    }
    @keyframes pc2BgShift {
      0%,100% { transform: translate(0,0) scale(1); }
      50%     { transform: translate(8px,-6px) scale(1.04); }
    }
    @keyframes pc2Aura {
      0%   { transform: translate(-50%,-50%) scale(.7);  opacity: .85; }
      100% { transform: translate(-50%,-50%) scale(1.85); opacity: 0; }
    }
    @keyframes pc2PhoneIn {
      0%   { transform: translateY(50px) rotate(-12deg) scale(.86); opacity: 0; }
      55%  { transform: translateY(-6px) rotate(-5deg)  scale(1.02); opacity: 1; }
      100% { transform: translateY(0)    rotate(-8deg)  scale(1);   opacity: 1; }
    }
    @keyframes pc2PhoneFloat {
      0%,100% { transform: translateY(0)    rotate(-8deg); }
      50%     { transform: translateY(-6px) rotate(-7deg); }
    }
    @keyframes pc2Shine {
      0%   { transform: translateX(-140%) skewX(-22deg); }
      100% { transform: translateX(240%)  skewX(-22deg); }
    }
    @keyframes pc2StampPop {
      0%   { transform: scale(0) rotate(calc(var(--pc-srot, 0deg) - 25deg)); opacity: 0; }
      55%  { transform: scale(1.18) rotate(calc(var(--pc-srot, 0deg) + 4deg)); opacity: 1; }
      100% { transform: scale(1) rotate(var(--pc-srot, 0deg)); opacity: 1; }
    }
    @keyframes pc2Sparkle {
      0%,100% { opacity: 0; transform: scale(.6); }
      50%     { opacity: 1; transform: scale(1.2); }
    }
    @keyframes pc2Pulse {
      0%,100% { opacity: 1; }
      50%     { opacity: .55; }
    }
    @keyframes pc2EyebrowEnter {
      0%   { opacity: 0; transform: translateY(-6px); letter-spacing: 0.5em; }
      100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.24em; }
    }
  `;
  document.head.appendChild(s);
}

// ── shared confetti ──────────────────────────────────────────
function PC2Confetti({ count = 32, palette, anchor = { x: 290, y: 150 }, spread = 280 }) {
  const pieces = Array.from({ length: count }).map((_, i) => {
    const angle = (i * 360 / count) + (i * 31) % 60;
    const rad = (angle * Math.PI) / 180;
    const dist = spread + ((i * 23) % 100);
    return {
      sx: anchor.x + (((i * 13) % 60) - 30),
      sy: anchor.y + (((i * 19) % 40) - 20),
      cx: Math.cos(rad) * dist,
      cy: Math.sin(rad) * dist - 80,
      cr: ((i * 71) % 720) - 360,
      d: (i * 0.09) % 4,
      dur: 4 + ((i * 11) % 35) / 10,
      hue: palette[i % palette.length],
      shape: i % 4, // 0=dot, 1=line, 2=tri, 3=square
      size: 4 + (i % 4) * 2,
    };
  });
  return pieces.map((p, i) => {
    const common = {
      position: "absolute",
      left: p.sx, top: p.sy,
      "--pc-cx": `${p.cx}px`,
      "--pc-cy": `${p.cy}px`,
      "--pc-cr": `${p.cr}deg`,
      animation: `pc2Confetti ${p.dur}s ${p.d}s ease-out infinite`,
      opacity: 0,
      pointerEvents: "none",
      filter: `drop-shadow(0 0 6px ${p.hue})`,
    };
    if (p.shape === 0) {
      return <span key={i} style={{ ...common, width: p.size, height: p.size, borderRadius: "50%", background: p.hue }}/>;
    }
    if (p.shape === 1) {
      return <span key={i} style={{ ...common, width: 3, height: p.size + 6, background: p.hue, borderRadius: 1 }}/>;
    }
    if (p.shape === 2) {
      return <span key={i} style={{
        ...common,
        width: 0, height: 0,
        background: "transparent",
        borderLeft: `${p.size / 2 + 1}px solid transparent`,
        borderRight: `${p.size / 2 + 1}px solid transparent`,
        borderBottom: `${p.size + 2}px solid ${p.hue}`,
      }}/>;
    }
    return <span key={i} style={{ ...common, width: p.size, height: p.size, background: p.hue }}/>;
  });
}

// ════════════════════════════════════════════════════════════════
// 1 · STUB STACK · ENCORE
// ════════════════════════════════════════════════════════════════
// Stubs become saturated mini-posters. Each stub a distinct colour world
// with a bold abstract graphic — not realistic tickets, but the artifact
// energy survives via shape, perforation, mono details. Confetti drifts
// continuously across the whole frame; stubs deal in from varied angles
// (not just falling from above). Stack breathes when settled.
function PassportEncoreStubs() {
  const W = 580, H = 300;

  // Each stub: a self-contained mini-poster
  const stubs = [
    {
      // sit position
      tx: -8, rot: -16,
      // deal-in start position
      sx: -200, sy: -100, srot: -45,
      d: 0.10,
      // colours
      body: "#FF4FB5", ink: "#15052A", accent: "#FFE36B",
      // graphic
      graphic: "sunburst",
      glyph: "★", subtitle: "ENCORE",
    },
    {
      tx: 12, rot: 11, sx: 260, sy: -120, srot: 50, d: 0.25,
      body: "#FFC53A", ink: "#15052A", accent: "#FF4FB5",
      graphic: "tri", glyph: "△", subtitle: "DOORS",
    },
    {
      tx: -14, rot: -7, sx: -240, sy: 80, srot: -30, d: 0.40,
      body: "#A075FF", ink: "#FFFFFF", accent: "#5DD4D6",
      graphic: "rings", glyph: "○", subtitle: "FRONT ROW",
    },
    {
      tx: 8, rot: 5, sx: 220, sy: 60, srot: 60, d: 0.55,
      body: "#5DD4D6", ink: "#15052A", accent: "#FF7BD4",
      graphic: "stripes", glyph: "≡", subtitle: "PIT",
    },
    {
      tx: -6, rot: -11, sx: -200, sy: -160, srot: -20, d: 0.70,
      body: "#FF5566", ink: "#FFFFFF", accent: "#FFE36B",
      graphic: "halftone", glyph: "◆", subtitle: "BALCONY",
    },
    {
      tx: 4, rot: 6, sx: 230, sy: -50, srot: 30, d: 0.85,
      body: "#C9F26E", ink: "#1A2615", accent: "#A075FF",
      graphic: "quad", glyph: "⬡", subtitle: "GA",
    },
    {
      // TOP stub — the headline
      tx: 0, rot: -2, sx: 0, sy: -260, srot: -8, d: 1.05,
      body: "#0A0613", ink: "#FFFFFF", accent: "#FF4FB5",
      graphic: "headline", glyph: "★", subtitle: "ADMIT ONE",
      top: true,
    },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "linear-gradient(135deg, #2B0F3A 0%, #4A0F4A 35%, #1F0F5C 70%, #08020F 100%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* big radial colour washes that drift */}
      <div style={{
        position: "absolute",
        left: -100, top: -120,
        width: 460, height: 460,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,79,181,0.55) 0%, transparent 60%)",
        animation: "pc2BgShift 10s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        right: -80, bottom: -120,
        width: 460, height: 460,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(93,212,214,0.55) 0%, transparent 60%)",
        animation: "pc2BgShift 12s 1s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        right: 80, top: -80,
        width: 300, height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,197,58,0.4) 0%, transparent 60%)",
        animation: "pc2BgShift 11s 2s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>

      {/* confetti drifting through the whole frame */}
      <PC2Confetti
        count={28}
        palette={["#FF4FB5", "#FFC53A", "#A075FF", "#5DD4D6", "#C9F26E", "#FF5566"]}
        anchor={{ x: W / 2, y: H / 2 + 20 }}
        spread={320}
      />

      {/* stack centred */}
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
              ? "drop-shadow(0 18px 30px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(255,79,181,0.4))"
              : "drop-shadow(0 6px 12px rgba(0,0,0,0.45))",
          }}>
            <StubPoster s={s}/>
          </div>
        ))}
      </div>

      {/* light leak top-right */}
      <div style={{
        position: "absolute",
        right: -40, top: -40,
        width: 220, height: 220,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)",
        pointerEvents: "none",
      }}/>

      {/* eyebrow */}
      <div style={{
        position: "absolute",
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: "#FFFFFF",
        letterSpacing: "0.24em", textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 8,
        textShadow: "0 1px 8px rgba(0,0,0,0.9)",
        animation: "pc2EyebrowEnter 1.2s 0.2s ease-out both",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#FFE36B",
          boxShadow: "0 0 10px #FFE36B",
          animation: "pc2Pulse 1.6s ease-in-out infinite",
        }}/>
        Encore · every night kept
      </div>
    </div>
  );
}

function StubPoster({ s }) {
  return (
    <svg width="220" height="130" viewBox="0 0 220 130">
      {/* body */}
      <path d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
        fill={s.body}/>
      {/* tear-off */}
      <path d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
        fill={s.body}/>

      {/* graphic — fills left section */}
      {s.graphic === "sunburst" && (
        <g transform="translate(40, 65)">
          {[0, 30, 60, 90, 120, 150].map((a, j) => (
            <rect key={j} x="-3" y="-50" width="6" height="100"
              fill={s.accent} opacity="0.85"
              transform={`rotate(${a})`}/>
          ))}
          <circle r="14" fill={s.accent}/>
        </g>
      )}
      {s.graphic === "tri" && (
        <g transform="translate(40, 65)">
          <polygon points="-32,28 32,28 0,-30" fill={s.accent}/>
          <polygon points="-22,18 22,18 0,-20" fill={s.ink} opacity="0.85"/>
        </g>
      )}
      {s.graphic === "rings" && (
        <g transform="translate(40, 65)">
          {[36, 28, 20, 12].map((r, j) => (
            <circle key={j} r={r} fill="none"
              stroke={j % 2 === 0 ? s.accent : s.ink}
              strokeWidth="4" opacity="0.9"/>
          ))}
        </g>
      )}
      {s.graphic === "stripes" && (
        <g transform="translate(40, 65) rotate(-25)">
          {[-30, -18, -6, 6, 18, 30].map((y, j) => (
            <rect key={j} x="-44" y={y - 2} width="88" height="6"
              fill={j % 2 === 0 ? s.accent : s.ink}/>
          ))}
        </g>
      )}
      {s.graphic === "halftone" && (
        <g transform="translate(40, 65)">
          {Array.from({ length: 24 }).map((_, j) => {
            const x = ((j * 11) % 70) - 35;
            const y = ((j * 17) % 60) - 30;
            const r = 2 + ((j * 7) % 6);
            return <circle key={j} cx={x} cy={y} r={r} fill={s.accent}/>;
          })}
          <circle r="18" fill={s.ink} opacity="0.85"/>
        </g>
      )}
      {s.graphic === "quad" && (
        <g transform="translate(40, 65)">
          <rect x="-34" y="-34" width="32" height="32" fill={s.accent}/>
          <rect x="2"   y="-34" width="32" height="32" fill={s.ink} opacity="0.85"/>
          <rect x="-34" y="2"   width="32" height="32" fill={s.ink} opacity="0.85"/>
          <rect x="2"   y="2"   width="32" height="32" fill={s.accent}/>
        </g>
      )}
      {s.graphic === "headline" && (
        <g transform="translate(40, 65)">
          {/* bold concentric/sunburst combo */}
          <circle r="44" fill={s.accent} opacity="0.92"/>
          <circle r="30" fill={s.body}/>
          <circle r="20" fill={s.accent}/>
          <text x="0" y="9" fontFamily="Inter, sans-serif"
            fontSize="28" fontWeight="900" fill={s.body}
            textAnchor="middle" letterSpacing="-1.2">★</text>
        </g>
      )}

      {/* right column copy */}
      <text x="92" y="32" fontFamily="Inter, sans-serif"
        fontSize={s.top ? 20 : 17} fontWeight="900"
        fill={s.ink} letterSpacing="-0.04em">{s.top ? "TONIGHT" : s.subtitle}</text>
      <text x="92" y="48" fontFamily="'JetBrains Mono', monospace"
        fontSize="7" fontWeight="800" letterSpacing="1.6"
        fill={s.ink} opacity="0.7">{s.top ? "ADMIT ONE" : "ADMIT ONE"}</text>

      {/* divider line */}
      <line x1="92" y1="56" x2="156" y2="56"
        stroke={s.ink} strokeWidth="1.5" opacity="0.55"/>

      {/* sub label */}
      {s.top ? (
        <>
          <text x="92" y="78" fontFamily="'JetBrains Mono', monospace"
            fontSize="8" fontWeight="800" letterSpacing="1.4"
            fill={s.ink} opacity="0.75">DOORS · 8 PM</text>
          <text x="92" y="92" fontFamily="'JetBrains Mono', monospace"
            fontSize="8" fontWeight="800" letterSpacing="1.4"
            fill={s.ink} opacity="0.55">GA · 21+</text>
          <text x="92" y="118" fontFamily="'JetBrains Mono', monospace"
            fontSize="14" fontWeight="900" letterSpacing="2"
            fill={s.accent}>№ 047</text>
        </>
      ) : (
        <>
          <text x="92" y="78" fontFamily="'JetBrains Mono', monospace"
            fontSize="7" fontWeight="800" letterSpacing="1.4"
            fill={s.ink} opacity="0.6">{s.subtitle}</text>
        </>
      )}

      {/* perforation dashed line */}
      <line x1="166" y1="6" x2="166" y2="124"
        stroke={s.ink} strokeWidth="1" strokeDasharray="3 4" opacity="0.45"/>
      {[14, 38, 62, 86, 110].map((y, j) => (
        <circle key={j} cx="166" cy={y + 6} r="1.5" fill={s.body}
          stroke={s.ink} strokeWidth="0.5" opacity="0.6"/>
      ))}

      {/* tear-off vertical text */}
      <text x="195" y="12"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="8" fontWeight="800"
        fill={s.ink} opacity="0.55"
        letterSpacing="2"
        transform="rotate(90 195 12)">{s.top ? "NO RE-ENTRY" : "STUB"}</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// 2 · SPOTLIGHT PHONE · REVEAL
// ════════════════════════════════════════════════════════════════
// Multi-hue aura, denser kinetic confetti, stamps inside the phone are
// their own bold colour tiles (not glyphs on dark squares), edge shine
// sweeps across, phone hovers continuously.
function PassportRevealPhone() {
  const W = 580, H = 300;

  // Bold colour stamps inside phone — each its own mini poster tile
  const stamps = [
    { bg: "#FF4FB5", fg: "#FFE36B", glyph: "★", d: 0.55 },
    { bg: "#FFC53A", fg: "#15052A", glyph: "△", d: 0.68 },
    { bg: "#A075FF", fg: "#C9F26E", glyph: "○", d: 0.81 },
    { bg: "#5DD4D6", fg: "#15052A", glyph: "≡", d: 0.94 },
    { bg: "#C9F26E", fg: "#5A2D60", glyph: "◆", d: 1.07 },
    { bg: "#FF5566", fg: "#FFFFFF", glyph: "⬡", d: 1.20 },
    { bg: "#7AE6FF", fg: "#15052A", glyph: "✦", d: 1.33 },
    { bg: "#FF7BD4", fg: "#FFE36B", glyph: "+", d: 1.46 },
    { bg: "#FFE36B", fg: "#FF4FB5", glyph: "★", d: 1.59 },
    // future cells dashed
    { bg: "transparent", fg: "rgba(255,255,255,0.35)", glyph: "?", d: 1.72, future: true },
    { bg: "transparent", fg: "rgba(255,255,255,0.35)", glyph: "?", d: 1.85, future: true },
    { bg: "transparent", fg: "rgba(255,255,255,0.35)", glyph: "?", d: 1.98, future: true },
  ];

  // Sparkles — random tiny twinkles
  const sparkles = Array.from({ length: 14 }).map((_, i) => ({
    x: ((i * 53) % W),
    y: ((i * 71) % H),
    d: (i * 0.23) % 3,
    hue: ["#FFE36B", "#FF4FB5", "#5DD4D6", "#FFFFFF"][i % 4],
  }));

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 55%, #4A0F66 0%, #1A0938 50%, #06030F 100%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* drifting colour washes */}
      <div style={{
        position: "absolute",
        left: -120, top: -100,
        width: 420, height: 420,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,79,181,0.55) 0%, transparent 65%)",
        animation: "pc2BgShift 9s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        right: -80, bottom: -120,
        width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(93,212,214,0.45) 0%, transparent 65%)",
        animation: "pc2BgShift 11s 1.5s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        right: -60, top: -120,
        width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,197,58,0.35) 0%, transparent 65%)",
        animation: "pc2BgShift 12s 0.5s ease-in-out infinite",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}/>

      {/* multi-hue aura rings behind phone */}
      {[
        { hue: "rgba(255,79,181,0.30)", size: 380, d: 0   },
        { hue: "rgba(255,197,58,0.25)", size: 380, d: 0.7 },
        { hue: "rgba(93,212,214,0.25)", size: 380, d: 1.4 },
        { hue: "rgba(160,117,255,0.28)", size: 380, d: 2.1 },
      ].map((r, i) => (
        <span key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: r.size, height: r.size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${r.hue} 0%, transparent 60%)`,
          animation: `pc2Aura 2.8s ${r.d}s ease-out infinite`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}/>
      ))}

      {/* sparkles */}
      {sparkles.map((sp, i) => (
        <span key={i} style={{
          position: "absolute",
          left: sp.x, top: sp.y,
          width: 4, height: 4,
          borderRadius: "50%",
          background: sp.hue,
          boxShadow: `0 0 8px ${sp.hue}`,
          animation: `pc2Sparkle 1.8s ${sp.d}s ease-in-out infinite`,
          pointerEvents: "none",
        }}/>
      ))}

      {/* dense confetti */}
      <PC2Confetti
        count={36}
        palette={["#FF4FB5", "#FFC53A", "#A075FF", "#5DD4D6", "#C9F26E", "#FF5566", "#FFE36B"]}
        anchor={{ x: W / 2, y: H / 2 + 10 }}
        spread={300}
      />

      {/* phone */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 158, height: 322,
        marginLeft: -79, marginTop: -161,
        animation: "pc2PhoneIn 850ms 0.1s cubic-bezier(.2,.9,.25,1) both, pc2PhoneFloat 4.5s 1s ease-in-out infinite",
        filter: "drop-shadow(0 36px 50px rgba(0,0,0,0.65)) drop-shadow(0 0 36px rgba(255,79,181,0.35)) drop-shadow(0 0 60px rgba(160,117,255,0.25))",
      }}>
        {/* phone body */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 28,
          background: "#08040E",
          border: "2px solid #20162E",
          padding: 5,
          overflow: "hidden",
        }}>
          {/* screen */}
          <div style={{
            position: "absolute", inset: 5,
            borderRadius: 22,
            background: "linear-gradient(180deg, #1A0A2E 0%, #08030F 100%)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* status bar */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 16px 4px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, fontWeight: 800,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "1.5px",
            }}>
              <span>9:41</span>
              <span>● ▮</span>
            </div>
            {/* dynamic island */}
            <div style={{
              position: "absolute",
              left: "50%", top: 8,
              width: 50, height: 14,
              transform: "translateX(-50%)",
              borderRadius: 8,
              background: "#000",
            }}/>
            {/* title */}
            <div style={{
              padding: "16px 14px 12px",
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7, fontWeight: 800,
                color: "#FF7BD4",
                letterSpacing: "1.8px", textTransform: "uppercase",
              }}>Passport · new</div>
              <div style={{
                fontSize: 17, fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
                lineHeight: 0.98,
              }}>Every<br/>night kept.</div>
            </div>

            {/* stamps */}
            <div style={{
              flex: 1,
              padding: "8px 14px 14px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              alignContent: "start",
            }}>
              {stamps.map((s, i) => (
                <div key={i} style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: 5,
                  background: s.future ? "transparent" : s.bg,
                  border: s.future ? "1px dashed rgba(255,255,255,0.18)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16, fontWeight: 900,
                  color: s.fg,
                  opacity: 0,
                  animation: `pc2StampPop 420ms ${s.d}s cubic-bezier(.2,.9,.2,1) both`,
                  "--pc-srot": `${((i * 13) % 9) - 4}deg`,
                  boxShadow: s.future ? "none" : `0 2px 6px ${s.bg}88`,
                  overflow: "hidden",
                }}>
                  {/* mini-poster bg accent */}
                  {!s.future && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(135deg, transparent 60%, ${s.fg}30 100%)`,
                      pointerEvents: "none",
                    }}/>
                  )}
                  <span style={{ position: "relative", zIndex: 2 }}>{s.glyph}</span>
                </div>
              ))}
            </div>
          </div>
          {/* edge shine */}
          <div style={{
            position: "absolute", left: -30, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)",
            animation: "pc2Shine 1.6s 1s ease-out forwards",
            transform: "translateX(-140%)",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}/>
        </div>
      </div>

      {/* eyebrow */}
      <div style={{
        position: "absolute",
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: "#FFFFFF",
        letterSpacing: "0.24em", textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 8,
        textShadow: "0 1px 8px rgba(0,0,0,0.9)",
        animation: "pc2EyebrowEnter 1.2s 0.2s ease-out both",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#FFE36B",
          boxShadow: "0 0 10px #FFE36B",
          animation: "pc2Pulse 1.6s ease-in-out infinite",
        }}/>
        Reveal · concert passport
      </div>
    </div>
  );
}

Object.assign(window, {
  PassportEncoreStubs,
  PassportRevealPhone,
});
