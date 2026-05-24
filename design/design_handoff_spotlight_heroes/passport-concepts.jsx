// passport-concepts.jsx — three direction concepts for the Concert Passport hero
//
// Brief: Spotify-Wrapped maximalist energy, boarding-pass artifact tradition,
// Apple-splash cinematic restraint. SVG + CSS only, no photography. Concept
// is generic representation (NOT user data). Image-led, type plays support.
//
// Three concepts:
//   1 · ELECTRIC RIG    — stage-lighting language. Beams sweep, pulse,
//                          colour-mix overhead. The feeling of the room
//                          going dark right before the band walks on.
//   2 · STUB STACK      — boarding-pass / ticket-stub artifact stack. Stubs
//                          deal themselves into a fan, last stub lands with
//                          a soft impact. Feels like a thing you'd hold.
//   3 · SPOTLIGHT PHONE — the actual app UI is the hero, tilted in a glow
//                          aura with kinetic confetti, à la AirPods reveal.

// ── keyframes ─────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("pc-keyframes")) {
  const s = document.createElement("style");
  s.id = "pc-keyframes";
  s.textContent = `
    @keyframes pcBeamGrow {
      0%   { transform: scaleY(0) rotate(var(--pc-rot, 0deg)); opacity: 0; }
      60%  { transform: scaleY(1.05) rotate(var(--pc-rot, 0deg)); opacity: 1; }
      100% { transform: scaleY(1) rotate(var(--pc-rot, 0deg)); opacity: .9; }
    }
    @keyframes pcBeamSway {
      0%,100% { transform: rotate(var(--pc-rot, 0deg)) scaleY(1); }
      50%     { transform: rotate(calc(var(--pc-rot, 0deg) + var(--pc-sway, 4deg))) scaleY(1.04); }
    }
    @keyframes pcBeamPulse {
      0%,100% { opacity: .85; filter: blur(0); }
      50%     { opacity: 1;   filter: blur(2px); }
    }
    @keyframes pcDust {
      0%   { transform: translateY(0) translateX(0); opacity: 0; }
      20%  { opacity: 1; }
      100% { transform: translateY(var(--pc-dy, -260px)) translateX(var(--pc-dx, 0)); opacity: 0; }
    }
    @keyframes pcFixtureBlink {
      0%,40%,60%,100% { opacity: 1; }
      45%,55%         { opacity: .3; }
    }

    @keyframes pcStubDeal {
      0%   { transform: translate(var(--pc-tx, 0px), -180px) rotate(calc(var(--pc-rot, 0deg) - 12deg)); opacity: 0; }
      55%  { transform: translate(var(--pc-tx, 0px), 6px)    rotate(calc(var(--pc-rot, 0deg) + 1deg));  opacity: 1; }
      100% { transform: translate(var(--pc-tx, 0px), 0)      rotate(var(--pc-rot, 0deg));               opacity: 1; }
    }
    @keyframes pcStubHover {
      0%,100% { transform: translateY(0); }
      50%     { transform: translateY(-3px); }
    }
    @keyframes pcPerf {
      0%,100% { opacity: .6; }
      50%     { opacity: 1; }
    }

    @keyframes pcPhoneIn {
      0%   { transform: translateY(40px) scale(.92) rotate(-6deg); opacity: 0; }
      100% { transform: translateY(0)    scale(1)   rotate(-6deg); opacity: 1; }
    }
    @keyframes pcAuraPulse {
      0%   { transform: translate(-50%,-50%) scale(.85); opacity: .9; }
      100% { transform: translate(-50%,-50%) scale(1.6);  opacity: 0; }
    }
    @keyframes pcStampIn {
      0%   { transform: scale(.4) rotate(var(--pc-stamp-rot, 0deg)); opacity: 0; }
      55%  { transform: scale(1.05) rotate(var(--pc-stamp-rot, 0deg)); opacity: 1; }
      100% { transform: scale(1)   rotate(var(--pc-stamp-rot, 0deg)); opacity: 1; }
    }
    @keyframes pcConfetti {
      0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
      20%  { opacity: 1; }
      100% { transform: translate(var(--pc-cx, 80px), var(--pc-cy, -120px)) rotate(var(--pc-cr, 360deg)); opacity: 0; }
    }
    @keyframes pcShine {
      0%   { transform: translateX(-120%) skewX(-20deg); }
      100% { transform: translateX(220%)  skewX(-20deg); }
    }
  `;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════
// 1 · ELECTRIC RIG
// ═══════════════════════════════════════════════════════════════
// A row of stage-lighting fixtures along the bottom. Each fixture shoots a
// soft-edge coloured beam upward at a slight angle. Beams sway, pulse,
// overlap (screen blend). Faint atmospheric dust drifts up through them.
// The feeling: house lights down, the band hasn't walked on yet.
function PassportElectricRig() {
  const W = 580, H = 300;
  // Stage-light colour stops — pulled from real concert rigs, not brand tokens
  const beams = [
    { x: 60,  hue: "#7AE6FF", rot: -10, sway: 4,  d: 0.0, fade: 0.65 },
    { x: 110, hue: "#FF4FB5", rot: -4,  sway: -3, d: 0.15, fade: 0.7 },
    { x: 160, hue: "#FFB838", rot: -2,  sway: 5,  d: 0.30, fade: 0.55 },
    { x: 210, hue: "#A075FF", rot:  0,  sway: -4, d: 0.45, fade: 0.75 },
    { x: 260, hue: "#5DD4D6", rot:  4,  sway: 3,  d: 0.60, fade: 0.6 },
    { x: 310, hue: "#FF5566", rot: -1,  sway: -5, d: 0.10, fade: 0.7 },
    { x: 360, hue: "#C9F26E", rot:  3,  sway: 4,  d: 0.40, fade: 0.55 },
    { x: 410, hue: "#7AE6FF", rot:  8,  sway: -3, d: 0.70, fade: 0.65 },
    { x: 460, hue: "#FF4FB5", rot:  2,  sway: 5,  d: 0.20, fade: 0.7 },
    { x: 510, hue: "#FFB838", rot:  10, sway: -4, d: 0.50, fade: 0.6 },
  ];
  const dust = Array.from({ length: 40 }).map((_, i) => ({
    x: (i * 41) % W,
    y: H - 20 - ((i * 13) % 60),
    dy: -(160 + ((i * 23) % 140)),
    dx: ((i % 5) - 2) * 14,
    d: (i * 0.13) % 6,
    dur: 4 + ((i * 11) % 40) / 10,
    r: ((i * 7) % 3 === 0) ? 1.4 : 0.9,
  }));

  return (
    <div style={{
      position: "absolute", inset: 0,
      overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 110%, #1F0F2E 0%, #0A0814 70%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* atmospheric haze in upper area */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
        pointerEvents: "none",
      }}/>

      {/* beams */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        <defs>
          {beams.map((b, i) => (
            <linearGradient key={`bg-${i}`} id={`beam-${i}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor={b.hue} stopOpacity={b.fade}/>
              <stop offset="40%"  stopColor={b.hue} stopOpacity={b.fade * 0.5}/>
              <stop offset="100%" stopColor={b.hue} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>
        {beams.map((b, i) => (
          <g key={i} transform={`translate(${b.x}, ${H - 30})`}>
            {/* beam — narrow at fixture, fans out toward top */}
            <g style={{
              transformOrigin: "0 0",
              transform: `rotate(${b.rot}deg)`,
              animation: `pcBeamGrow 900ms ${b.d}s cubic-bezier(.2,.8,.2,1) both, pcBeamSway 6s ${b.d + 1}s ease-in-out infinite`,
              "--pc-rot": `${b.rot}deg`,
              "--pc-sway": `${b.sway}deg`,
            }}>
              <polygon
                points={`-6,0 6,0 60,-280 -60,-280`}
                fill={`url(#beam-${i})`}
              />
              {/* hot core */}
              <polygon
                points={`-2,0 2,0 16,-280 -16,-280`}
                fill={b.hue}
                opacity="0.85"
                style={{ filter: "blur(2px)", animation: `pcBeamPulse 3.2s ${b.d + 0.5}s ease-in-out infinite` }}
              />
            </g>
            {/* fixture glow */}
            <circle cx="0" cy="0" r="10" fill={b.hue} opacity="0.95" style={{ filter: "blur(4px)" }}/>
            <circle cx="0" cy="0" r="4" fill="#FFFFFF" opacity="0.95"
              style={{ animation: `pcFixtureBlink 5s ${b.d * 0.8}s ease-in-out infinite` }}/>
          </g>
        ))}
      </svg>

      {/* dust particles */}
      {dust.map((p, i) => (
        <span key={i} style={{
          position: "absolute",
          left: p.x, top: p.y,
          width: p.r * 2, height: p.r * 2,
          borderRadius: p.r,
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0 0 4px rgba(255,255,255,0.4)",
          "--pc-dy": `${p.dy}px`,
          "--pc-dx": `${p.dx}px`,
          animation: `pcDust ${p.dur}s ${p.d}s ease-out infinite`,
          opacity: 0,
          pointerEvents: "none",
        }}/>
      ))}

      {/* stage line — barely visible silhouette */}
      <div style={{
        position: "absolute",
        left: 0, right: 0, bottom: 0, height: 30,
        background: "linear-gradient(to bottom, transparent, #000 80%)",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute",
        left: 0, right: 0, bottom: 30, height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
        pointerEvents: "none",
      }}/>

      {/* eyebrow */}
      <div style={{
        position: "absolute",
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: "0.24em", textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 8,
        textShadow: "0 1px 6px rgba(0,0,0,0.8)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#7AE6FF",
          boxShadow: "0 0 6px #7AE6FF",
          animation: "pcBeamPulse 1.6s ease-in-out infinite",
        }}/>
        House down · waiting for stage
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2 · STUB STACK
// ═══════════════════════════════════════════════════════════════
// A handful of ticket stubs deal themselves out of frame into a stack,
// each at a slight rotation. The top stub is fully drawn (admit one,
// generic show graphic, perforated edge); the stubs behind are
// progressively rotated and dimmed. Once dealt, the stack hovers gently.
function PassportStubStack() {
  const W = 580, H = 300;
  // Stubs from back to front — z-index by index, last is top
  const stubs = [
    { tx: -6,  rot: -14, d: 0.10, hue: "#1A4A47", glyph: "△", glyphHue: "#5DD4D6" },
    { tx: -2,  rot:   8, d: 0.25, hue: "#5A2D60", glyph: "○", glyphHue: "#A075FF" },
    { tx:  4,  rot:  -5, d: 0.40, hue: "#2C1F3A", glyph: "⬡", glyphHue: "#FFB838" },
    { tx: -4,  rot:   3, d: 0.55, hue: "#1F3D8A", glyph: "+", glyphHue: "#FF7BD4" },
    { tx:  2,  rot:  -9, d: 0.70, hue: "#3A1818", glyph: "◆", glyphHue: "#FF5566" },
    { tx:  0,  rot:   4, d: 0.85, hue: "#0E1A2C", glyph: "✦", glyphHue: "#C9F26E" },
    // top — fully realised
    { tx:  0,  rot:  -2, d: 1.05, hue: "#0B0B14", glyph: "★", glyphHue: "#7AE6FF", top: true },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1640 0%, #07060F 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* subtle key-light spot from upper-right */}
      <div style={{
        position: "absolute",
        right: -60, top: -80,
        width: 300, height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,237,200,0.18) 0%, transparent 65%)",
        pointerEvents: "none",
      }}/>
      {/* floor glow under the stack */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: 30,
        width: 360, height: 60,
        transform: "translateX(-50%)",
        background: "radial-gradient(ellipse, rgba(122,230,255,0.18) 0%, transparent 60%)",
        filter: "blur(4px)",
        pointerEvents: "none",
      }}/>

      {/* stubs */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        width: 220, height: 130,
      }}>
        {stubs.map((stub, i) => (
          <div key={i} style={{
            position: "absolute",
            left: 0, top: 0,
            width: 220, height: 130,
            "--pc-tx": `${stub.tx}px`,
            "--pc-rot": `${stub.rot}deg`,
            transform: `translate(${stub.tx}px, 0) rotate(${stub.rot}deg)`,
            animation: `pcStubDeal 700ms ${stub.d}s cubic-bezier(.2,.85,.2,1) both${stub.top ? ", pcStubHover 4s 2s ease-in-out infinite" : ""}`,
            zIndex: i + 1,
            transformOrigin: "center center",
            filter: stub.top ? "drop-shadow(0 14px 24px rgba(0,0,0,0.5))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
          }}>
            {/* Ticket stub shape — full + tear-off */}
            <svg width="220" height="130" viewBox="0 0 220 130">
              {/* main body */}
              <path d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
                fill={stub.hue}
                stroke={stub.top ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}
                strokeWidth="1"/>
              {/* tear-off (right side) */}
              <path d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
                fill={stub.hue}
                stroke={stub.top ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}
                strokeWidth="1"/>
              {/* perforation dashed line */}
              <line x1="166" y1="6" x2="166" y2="124"
                stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3 4"
                style={{ animation: stub.top ? "pcPerf 2.4s ease-in-out infinite" : "none" }}/>
              {/* perforation dots */}
              {[14, 38, 62, 86, 110].map((y, j) => (
                <circle key={j} cx="166" cy={y + 6} r="1.4" fill={stub.hue}
                  stroke="rgba(255,255,255,0.25)" strokeWidth="0.5"/>
              ))}

              {stub.top && (
                <>
                  {/* ADMIT ONE header */}
                  <text x="14" y="22" fontFamily="'JetBrains Mono', monospace"
                    fontSize="9" fontWeight="800" letterSpacing="2.4"
                    fill="rgba(255,255,255,0.55)">ADMIT ONE</text>
                  {/* main glyph (generic show identity) */}
                  <circle cx="40" cy="72" r="32" fill="none"
                    stroke={stub.glyphHue} strokeWidth="2.5" opacity="0.8"/>
                  <text x="40" y="83" fontFamily="Inter, sans-serif"
                    fontSize="36" fontWeight="900"
                    fill={stub.glyphHue}
                    textAnchor="middle">{stub.glyph}</text>
                  {/* venue type column */}
                  <text x="88" y="42" fontFamily="Inter, sans-serif"
                    fontSize="15" fontWeight="900"
                    fill="rgba(255,255,255,0.92)"
                    letterSpacing="-0.5">TONIGHT</text>
                  <text x="88" y="58" fontFamily="'JetBrains Mono', monospace"
                    fontSize="8" fontWeight="700"
                    fill="rgba(255,255,255,0.55)"
                    letterSpacing="1.6">DOORS · 8 PM</text>
                  <text x="88" y="84" fontFamily="'JetBrains Mono', monospace"
                    fontSize="8" fontWeight="700"
                    fill="rgba(255,255,255,0.4)"
                    letterSpacing="1.6">GA · 21+</text>
                  {/* tear-off content (vertical mono) */}
                  <text x="195" y="12"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="8" fontWeight="800"
                    fill="rgba(255,255,255,0.55)"
                    letterSpacing="2"
                    transform="rotate(90 195 12)">NO RE-ENTRY</text>
                  {/* serial */}
                  <text x="14" y="118"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="7" fontWeight="700"
                    fill="rgba(255,255,255,0.32)"
                    letterSpacing="1.2">№ 00047</text>
                </>
              )}
              {!stub.top && (
                <>
                  {/* dim glyph hint */}
                  <text x="40" y="80" fontFamily="Inter, sans-serif"
                    fontSize="28" fontWeight="900"
                    fill={stub.glyphHue}
                    opacity="0.4"
                    textAnchor="middle">{stub.glyph}</text>
                  {/* dim mono line */}
                  <rect x="86" y="60" width="50" height="2" fill="rgba(255,255,255,0.12)"/>
                  <rect x="86" y="68" width="38" height="2" fill="rgba(255,255,255,0.08)"/>
                </>
              )}
            </svg>
          </div>
        ))}
      </div>

      {/* eyebrow */}
      <div style={{
        position: "absolute",
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: "0.24em", textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 8,
        textShadow: "0 1px 6px rgba(0,0,0,0.8)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#7AE6FF",
          boxShadow: "0 0 6px #7AE6FF",
          animation: "pcBeamPulse 1.6s ease-in-out infinite",
        }}/>
        Every night kept
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3 · SPOTLIGHT PHONE  (Apple-feature reveal energy)
// ═══════════════════════════════════════════════════════════════
// A stylised phone holds the actual Concert Passport UI. Phone sits in a
// generous glow aura with pulsing rings + drifting confetti. Subtle shine
// sweeps the phone's edge once on entry. The product IS the hero.
function PassportSpotlightPhone() {
  const W = 580, H = 300;
  // Confetti — abstract gig-energy particles
  const confetti = Array.from({ length: 22 }).map((_, i) => ({
    sx: 290 + ((i * 37) % 60) - 30,
    sy: 150 + ((i * 23) % 40) - 20,
    cx: ((i * 53) % 240) - 120,
    cy: -((i * 41) % 180) - 30,
    cr: ((i * 71) % 720) - 360,
    d: (i * 0.13) % 3,
    dur: 3 + ((i * 7) % 30) / 10,
    hue: ["#7AE6FF", "#FF7BD4", "#FFB838", "#A075FF", "#C9F26E"][i % 5],
    shape: i % 3, // 0=dot, 1=line, 2=triangle
  }));
  // Stamp grid inside the phone
  const stamps = [
    { hue: "#7AE6FF", glyph: "★", d: 0.6 },
    { hue: "#FF7BD4", glyph: "△", d: 0.75 },
    { hue: "#FFB838", glyph: "○", d: 0.9  },
    { hue: "#A075FF", glyph: "+", d: 1.05 },
    { hue: "#C9F26E", glyph: "◆", d: 1.20 },
    { hue: "#5DD4D6", glyph: "✦", d: 1.35 },
    { hue: "#FF5566", glyph: "⬡", d: 1.50 },
    { hue: "#7AE6FF", glyph: "★", d: 1.65 },
    { hue: "#FFB838", glyph: "◇", d: 1.80, future: true },
    { hue: "#FF7BD4", glyph: "?", d: 1.95, future: true },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 50%, #2B1854 0%, #0A0419 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* aura — concentric pulses behind phone */}
      {[0, 0.8, 1.6].map((d, i) => (
        <span key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 360, height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,123,212,0.25) 0%, transparent 55%)",
          transform: "translate(-50%,-50%)",
          animation: `pcAuraPulse 3s ${d}s ease-out infinite`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}/>
      ))}

      {/* radial soft light */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 420, height: 420,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 60%)",
        pointerEvents: "none",
      }}/>

      {/* confetti */}
      {confetti.map((p, i) => (
        <span key={i} style={{
          position: "absolute",
          left: p.sx, top: p.sy,
          width: p.shape === 0 ? 5 : 4,
          height: p.shape === 0 ? 5 : (p.shape === 1 ? 10 : 4),
          background: p.shape === 2 ? "transparent" : p.hue,
          borderLeft: p.shape === 2 ? `4px solid transparent` : "none",
          borderRight: p.shape === 2 ? `4px solid transparent` : "none",
          borderBottom: p.shape === 2 ? `7px solid ${p.hue}` : "none",
          borderRadius: p.shape === 0 ? "50%" : 0,
          boxShadow: `0 0 6px ${p.hue}`,
          "--pc-cx": `${p.cx}px`,
          "--pc-cy": `${p.cy}px`,
          "--pc-cr": `${p.cr}deg`,
          animation: `pcConfetti ${p.dur}s ${p.d}s ease-out infinite`,
          opacity: 0,
          pointerEvents: "none",
        }}/>
      ))}

      {/* phone */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 156, height: 320,
        marginLeft: -78, marginTop: -160,
        transform: "rotate(-6deg)",
        animation: "pcPhoneIn 800ms 0.1s cubic-bezier(.2,.85,.2,1) both",
        filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(255,123,212,0.35))",
      }}>
        {/* phone body */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 28,
          background: "#0B0810",
          border: "2px solid #1E1A24",
          padding: 5,
          overflow: "hidden",
        }}>
          {/* screen */}
          <div style={{
            position: "absolute", inset: 5,
            borderRadius: 22,
            background: "linear-gradient(180deg, #110820 0%, #07050E 100%)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* status bar */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 16px 4px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, fontWeight: 800,
              color: "rgba(255,255,255,0.6)",
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
            {/* title row */}
            <div style={{
              padding: "16px 14px 10px",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7, fontWeight: 800,
                color: "#7AE6FF",
                letterSpacing: "1.5px", textTransform: "uppercase",
              }}>Passport</div>
              <div style={{
                fontSize: 16, fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}>Your 47<br/>nights.</div>
            </div>

            {/* stamps grid */}
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
                  aspectRatio: "1 / 1",
                  borderRadius: 6,
                  border: s.future
                    ? "1px dashed rgba(255,255,255,0.15)"
                    : `1px solid ${s.hue}`,
                  background: s.future ? "transparent" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16, fontWeight: 900,
                  color: s.future ? "rgba(255,255,255,0.25)" : s.hue,
                  opacity: 0,
                  animation: `pcStampIn 380ms ${s.d}s cubic-bezier(.2,.85,.2,1) both`,
                  "--pc-stamp-rot": `${((i * 13) % 7) - 3}deg`,
                  boxShadow: s.future ? "none" : `0 0 8px ${s.hue}55`,
                }}>{s.glyph}</div>
              ))}
            </div>
          </div>
          {/* edge shine */}
          <div style={{
            position: "absolute", left: -20, top: 0, bottom: 0, width: 60,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            animation: "pcShine 1.4s 0.8s ease-out forwards",
            transform: "translateX(-120%)",
            pointerEvents: "none",
          }}/>
        </div>
      </div>

      {/* eyebrow */}
      <div style={{
        position: "absolute",
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: "0.24em", textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 8,
        textShadow: "0 1px 6px rgba(0,0,0,0.8)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "#FF7BD4",
          boxShadow: "0 0 6px #FF7BD4",
          animation: "pcBeamPulse 1.6s ease-in-out infinite",
        }}/>
        Passport · new
      </div>
    </div>
  );
}

Object.assign(window, {
  PassportElectricRig,
  PassportStubStack,
  PassportSpotlightPhone,
});
