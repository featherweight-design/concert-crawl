// priority-1-heroes.jsx — remaining priority-1 beta-launch heroes.
//
//   CalendarShowtime  — Calendar Export (#4): calendar grid + stamps land
//                        on dates (current pulses). Motion: stamp-pop.
//   ShareableShowtime — Shareable Show Cards (#5): 3 poster cards, each
//                        with its OWN identity-art style (stripes, mesh,
//                        halftone) and its own band/show. Motion: card
//                        reveal + shine.
//   WatchersShowtime  — Who Else Is Watching (#6): centred count +
//                        emanating sonar rings. Motion: continuous radar.
//   SpotifyShowtime   — Spotify Sync (#7): EQ-bar visualizer (slower,
//                        more musical) + imported artist tags.
//   PricesShowtime    — Submit-a-Price (#1): verified consensus at centre,
//                        submitted price tags drift inward + dissolve.
//                        Motion: inflow (opposite of Watchers' outflow).
//
// Particle restraint: Passport keeps its 12 sparkles. The rest lean on
// their own artifact's motion.

// ── Hero-specific keyframes ─────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("p1-keyframes")) {
  const s = document.createElement("style");
  s.id = "p1-keyframes";
  s.textContent = `
    /* Calendar */
    @keyframes pcCalStamp {
      0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      55%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes pcCalPulse {
      0%,100% { transform: translate(-50%, -50%) scale(1); }
      50%     { transform: translate(-50%, -50%) scale(1.06); }
    }

    /* Shareable */
    @keyframes pcShareCardIn {
      0%   { transform: translate(var(--pc-tx, 0px), 60px) rotate(var(--pc-rot, 0deg)) scale(.85); opacity: 0; }
      55%  { transform: translate(var(--pc-tx, 0px), -4px) rotate(var(--pc-rot, 0deg)) scale(1.02); opacity: 1; }
      100% { transform: translate(var(--pc-tx, 0px), 0)    rotate(var(--pc-rot, 0deg)) scale(1);    opacity: 1; }
    }
    @keyframes pcShineSweep {
      0%   { transform: translateX(-150%) skewX(-22deg); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateX(220%)  skewX(-22deg); opacity: 0; }
    }
    @keyframes pcShareArrow {
      0%,10% { opacity: 0; transform: translate(0, 0) scale(.85); }
      20%    { opacity: 1; transform: translate(0, 0) scale(1.1); }
      30%    { opacity: 1; transform: translate(2px, -2px) scale(1); }
      60%    { opacity: 1; transform: translate(2px, -2px) scale(1); }
      100%   { opacity: 0; transform: translate(8px, -8px) scale(.9); }
    }

    /* Watchers */
    @keyframes pcRingEmanate {
      0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0.85; }
      80%  { opacity: 0.15; }
      100% { transform: translate(-50%, -50%) scale(1.0);  opacity: 0; }
    }
    @keyframes pcCenterPulse {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.04); }
    }

    /* Spotify */
    @keyframes pcEqWave {
      0%,100% { transform: scaleY(var(--eq-min, 0.25)); }
      50%     { transform: scaleY(var(--eq-max, 1));    }
    }
    @keyframes pcArtistTagIn {
      0%   { opacity: 0; transform: translateY(14px) scale(.92); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Submit-a-Price — tags drift inward + dissolve */
    @keyframes pcPriceTagDrift {
      0%   { opacity: 0; transform: translate(0, 0); }
      12%  { opacity: 1; }
      55%  { opacity: 0.85; transform: translate(calc(var(--pc-dx, 0px) * 0.6), calc(var(--pc-dy, 0px) * 0.6)); }
      100% { opacity: 0;    transform: translate(calc(var(--pc-dx, 0px) * 0.95), calc(var(--pc-dy, 0px) * 0.95)); }
    }
  `;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════════════
// CALENDAR EXPORT · Showtime
// ════════════════════════════════════════════════════════════════
function CalendarShowtime() {
  const showDates = [
    { date: 8,  accent: "#FF7BD4", glyph: "△", d: 0.55 },
    { date: 14, accent: "#A075FF", glyph: "○", d: 0.75 },
    { date: 22, accent: "#FFE36B", glyph: "⬡", d: 0.95 },
    { date: 27, accent: "#7AE6FF", glyph: "★", d: 1.20, current: true },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: "absolute",
        left: "50%", top: 38,
        transform: "translateX(-50%)",
      }}>
        <div style={{
          textAlign: "center",
          opacity: 0,
          animation: "pc2EyebrowEnter 600ms 0.15s ease-out both",
        }}>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 22, fontWeight: 900,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}>JUN 2026</div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        left: "50%", top: 78,
        transform: "translateX(-50%)",
      }}>
        <div style={{
          opacity: 0,
          animation: "pc2EyebrowEnter 700ms 0.3s ease-out both",
        }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 32px)",
          gap: 4,
          marginBottom: 4,
        }}>
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 800,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "1.5px",
              textAlign: "center",
            }}>{d}</div>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 32px)",
          gridTemplateRows: "repeat(4, 32px)",
          gap: 4,
        }}>
          {Array.from({ length: 28 }).map((_, i) => {
            const date = i + 1;
            const stamp = showDates.find(s => s.date === date);
            return (
              <div key={i} style={{
                position: "relative",
                width: 32, height: 32,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.07)",
                background: stamp ? "rgba(255,255,255,0.03)" : "transparent",
              }}>
                <span style={{
                  position: "absolute",
                  top: 2, left: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8, fontWeight: 700,
                  color: stamp ? stamp.accent : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.3px",
                }}>{date}</span>

                {stamp && (
                  <div style={{
                    position: "absolute",
                    left: "50%", top: "56%",
                    width: stamp.current ? 22 : 16,
                    height: stamp.current ? 22 : 16,
                    borderRadius: "50%",
                    border: `1.5px solid ${stamp.accent}`,
                    background: "rgba(0,0,0,0.4)",
                    opacity: 0,
                    transform: "translate(-50%, -50%) scale(0)",
                    animation: `pcCalStamp 460ms ${stamp.d}s cubic-bezier(.2,.85,.2,1) both${stamp.current ? ", pcCalPulse 3s 1.8s ease-in-out infinite" : ""}`,
                    boxShadow: stamp.current
                      ? `0 0 14px ${stamp.accent}, 0 0 28px ${stamp.accent}55`
                      : `0 0 6px ${stamp.accent}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* SVG glyph — centroid-centered */}
                    <window.StubGlyph kind={stamp.glyph}
                      size={stamp.current ? 14 : 11}
                      color={stamp.accent}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        left: "50%", bottom: 22,
        transform: "translateX(-50%)",
      }}>
        <div style={{
          display: "flex", gap: 18,
          opacity: 0,
          animation: "pc2EyebrowEnter 700ms 1.7s ease-out both",
        }}>
        {["↓ APPLE", "↓ GOOGLE", "↓ .ICS"].map((label, i) => (
          <span key={i} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
          }}>{label}</span>
        ))}
        </div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Sync your shows</ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SHAREABLE CARDS · Showtime
// ════════════════════════════════════════════════════════════════
// Three cards, each its OWN identity-art style — stripes, mesh, halftone —
// pulled from the existing Concert Crawl identity-art system. Each card a
// different band so the cards feel like distinct posters.
function ShareableShowtime() {
  const cards = [
    {
      tx: -120, rot: -10, d: 0.30,
      palette: { bg: "#1A2A30", primary: "#5DD4D6", secondary: "#FFB838" },
      style: "stripes",
      band: "sleep token",
      meta: "DENVER",
    },
    {
      tx: 120, rot: 10, d: 0.45,
      palette: { bg: "#2A1A2A", primary: "#FF7BD4", secondary: "#A075FF" },
      style: "rings",
      band: "pile",
      meta: "MARQUIS",
    },
    {
      tx: 0, rot: -2, d: 0.65,
      palette: { bg: "#0C0A14", primary: "#7AE6FF", secondary: "#FF7BD4" },
      style: "halftone",
      band: "wednesday",
      meta: "OGDEN · JUN 14",
      main: true,
    },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 280, height: 280,
        marginLeft: -140, marginTop: -140,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.20) 0%, rgba(255,123,212,0.12) 35%, transparent 70%)",
        opacity: 0,
        animation: "pc2EyebrowEnter 1.2s 0.6s ease-out both",
        pointerEvents: "none",
      }}/>

      {cards.map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          marginLeft: -70, marginTop: -100,
          "--pc-tx": `${c.tx}px`,
          "--pc-rot": `${c.rot}deg`,
          transform: `translate(${c.tx}px, 0) rotate(${c.rot}deg)`,
          animation: `pcShareCardIn 720ms ${c.d}s cubic-bezier(.2,.85,.2,1) both`,
          zIndex: c.main ? 10 : 5,
          filter: c.main
            ? "drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(122,230,255,0.4))"
            : "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
        }}>
          <ShareCard {...c}/>
        </div>
      ))}

      {/* share-arrow indicator on main card's upper-right */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        marginLeft: 50, marginTop: -110,
        width: 30, height: 30,
        borderRadius: "50%",
        background: "rgba(122,230,255,0.18)",
        border: "1.5px solid #7AE6FF",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 14,
        opacity: 0,
        animation: "pcShareArrow 3.6s 1.6s ease-out infinite",
        boxShadow: "0 0 14px rgba(122,230,255,0.55)",
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 8.5 L8.5 3 M5 3 L8.5 3 L8.5 6.5"
            stroke="#7AE6FF" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">Take it with you</ShowtimeEyebrow>
    </div>
  );
}

function ShareCard({ palette, main, style, band, meta }) {
  return (
    <div style={{
      position: "relative",
      width: 140, height: 200,
      borderRadius: 8,
      background: palette.bg,
      border: main ? "1.5px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* identity-art region */}
      <div style={{
        flex: 1,
        position: "relative",
        background: palette.bg,
        overflow: "hidden",
      }}>
        {style === "stripes" && <ShareArtStripes palette={palette}/>}
        {style === "rings"   && <ShareArtRings   palette={palette}/>}
        {style === "halftone"&& <ShareArtHalftone palette={palette}/>}

        {/* shine — only main card */}
        {main && (
          <div style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0, width: "55%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)",
            transform: "translateX(-150%) skewX(-22deg)",
            animation: "pcShineSweep 1.4s 1.3s ease-out forwards",
            mixBlendMode: "screen",
            pointerEvents: "none",
            zIndex: 5,
          }}/>
        )}
      </div>

      {/* paper scrim + title */}
      <div style={{
        background: palette.bg,
        padding: "9px 11px 11px",
        borderTop: `1px solid ${palette.primary}`,
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: main ? 13 : 11, fontWeight: 900,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          marginBottom: 3,
        }}>{band}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7, fontWeight: 800,
          color: palette.primary,
          letterSpacing: "1.4px",
          textTransform: "uppercase",
        }}>{meta}</div>
      </div>
    </div>
  );
}

// ── Per-card identity-art styles ──────────────────────────────
function ShareArtStripes({ palette }) {
  // silkscreen vertical stripes with subtle mis-registration
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isPrimary = i % 2 === 0;
        return (
          <div key={i} style={{
            flex: 1,
            background: isPrimary ? palette.primary : palette.secondary,
            opacity: 0.88,
            marginRight: i < 4 ? 1 : 0,
            transform: isPrimary ? "translateY(-3px)" : "translateY(3px)",
            mixBlendMode: "screen",
          }}/>
        );
      })}
    </div>
  );
}

function ShareArtRings({ palette }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {/* mis-registered secondary rings */}
      <g transform="translate(3 3)" style={{ mixBlendMode: "screen" }}>
        {[44, 34, 24, 14].map((r, i) => (
          <circle key={`s-${i}`} cx="62" cy="42" r={r}
            fill="none" stroke={palette.secondary}
            strokeWidth="3" opacity="0.7"/>
        ))}
      </g>
      {/* primary rings */}
      <g style={{ mixBlendMode: "screen" }}>
        {[44, 34, 24, 14].map((r, i) => (
          <circle key={`p-${i}`} cx="62" cy="42" r={r}
            fill="none" stroke={palette.primary}
            strokeWidth="3" opacity="0.85"/>
        ))}
      </g>
    </svg>
  );
}

function ShareArtHalftone({ palette }) {
  return (
    <>
      {/* mass anchored bottom-left */}
      <div style={{
        position: "absolute",
        left: "-30%", bottom: "-25%",
        width: "115%", height: "115%",
        borderRadius: "50%",
        background: palette.primary,
        mixBlendMode: "screen",
        opacity: 0.78,
      }}/>
      {/* halftone dot field from opposite corner */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        {Array.from({ length: 30 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const x = col * 16 + 10;
          const y = row * 16 + 8;
          // dot size: bigger toward top-right corner
          const dist = Math.sqrt((5 - col) * (5 - col) + row * row);
          const r = Math.max(0.8, 4 - dist * 0.55);
          return <circle key={i} cx={x} cy={y} r={r} fill={palette.secondary} opacity="0.9"/>;
        })}
      </svg>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// WHO ELSE IS WATCHING · Showtime
// ════════════════════════════════════════════════════════════════
function WatchersShowtime() {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 240, height: 240,
        marginLeft: -120, marginTop: -120,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.30) 0%, transparent 65%)",
        pointerEvents: "none",
      }}/>

      {[0, 0.7, 1.4, 2.1].map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 360, height: 360,
          borderRadius: "50%",
          border: "2px solid #7AE6FF",
          opacity: 0,
          transform: "translate(-50%, -50%) scale(0.18)",
          animation: `pcRingEmanate 2.8s ${d}s ease-out infinite`,
          pointerEvents: "none",
        }}/>
      ))}

      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        zIndex: 5,
        opacity: 0,
        animation: "pc2EyebrowEnter 800ms 0.4s ease-out both",
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 82, fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          textShadow: "0 0 30px rgba(122,230,255,0.55), 0 0 60px rgba(122,230,255,0.3)",
          animation: "pcCenterPulse 3s 0.8s ease-in-out infinite",
        }}>247</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 800,
          color: "#7AE6FF",
          letterSpacing: "2.2px",
          marginTop: 8,
          textTransform: "uppercase",
        }}>watching now</div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Aggregate · no names</ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SPOTIFY SYNC · Showtime
// ════════════════════════════════════════════════════════════════
// Slowed EQ bars — durations 1.8–3.2s (vs the original 0.65–1.2s) for a
// more musical, less frenetic rhythm. Three imported artists below.
function SpotifyShowtime() {
  const bars = Array.from({ length: 14 }).map((_, i) => {
    const min = 0.20 + Math.abs(Math.sin(i * 0.8) * 0.18);
    const max = 0.60 + Math.abs(Math.sin(i * 0.6 + 1) * 0.40);
    // slower durations: 1.8–3.2s
    const dur = 1.8 + Math.abs(Math.sin(i * 0.42) * 1.4);
    return { min, max, dur, offset: -i * 0.18 };
  });

  const artists = [
    { name: "GEESE",           accent: "#FF7BD4", d: 0.95 },
    { name: "MJ LENDERMAN",    accent: "#7AE6FF", d: 1.10 },
    { name: "BIG THIEF",       accent: "#FFE36B", d: 1.25 },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: "absolute",
        right: 24, top: 14,
        textAlign: "right",
        opacity: 0,
        animation: "pc2EyebrowEnter 700ms 1.0s ease-out both",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: "1.8px", textTransform: "uppercase",
        }}>Artists imported</div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 56, fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          marginTop: 2,
          textShadow: "0 0 24px rgba(255,123,212,0.35)",
        }}>27</div>
      </div>

      <div style={{
        position: "absolute",
        left: 36, right: 36, top: 96,
        height: 130,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: 8,
        opacity: 0,
        animation: "pc2EyebrowEnter 700ms 0.3s ease-out both",
      }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            flex: 1, maxWidth: 14,
            height: "100%",
            "--eq-min": b.min,
            "--eq-max": b.max,
            background: i % 2 === 0 ? "#7AE6FF" : "#FF7BD4",
            borderRadius: "3px 3px 0 0",
            transformOrigin: "bottom center",
            transform: `scaleY(${b.min})`,
            animation: `pcEqWave ${b.dur}s ${b.offset}s ease-in-out infinite alternate`,
            boxShadow: i % 2 === 0
              ? "0 0 8px rgba(122,230,255,0.5)"
              : "0 0 8px rgba(255,123,212,0.5)",
          }}/>
        ))}
      </div>

      <div style={{
        position: "absolute",
        left: 36, right: 36, top: 226,
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)",
        opacity: 0,
        animation: "pc2EyebrowEnter 600ms 0.5s ease-out both",
      }}/>

      <div style={{
        position: "absolute",
        left: "50%", bottom: 18,
        transform: "translateX(-50%)",
        display: "flex", gap: 10,
      }}>
        {artists.map((a, i) => (
          <span key={i} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: a.accent,
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            padding: "4px 9px",
            border: `1px solid ${a.accent}66`,
            borderRadius: 3,
            background: "rgba(255,255,255,0.04)",
            opacity: 0,
            animation: `pcArtistTagIn 450ms ${a.d}s cubic-bezier(.2,.85,.2,1) both`,
          }}>{a.name}</span>
        ))}
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">Library, on stage</ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUBMIT A PRICE · Showtime
// ════════════════════════════════════════════════════════════════
// Central verified consensus ($48 with ✓). Submitted price tags drift in
// from off-screen edges and dissolve as they reach the centre — the
// "submissions become consensus" reading. Motion: inflow (mirror of
// Watchers' outflow).
function PricesShowtime() {
  // dx/dy is the vector from the tag's starting position to the centre.
  // Each tag's keyframe translates by dx/dy * progress.
  const tags = [
    { sx: -210, sy: -70,  val: "$45", src: "CRAWLER",  accent: "#FFB838", d: 0.0,  dur: 3.4 },
    { sx:  225, sy: -50,  val: "$52", src: "RESALE",   accent: "#A075FF", d: 0.55, dur: 3.6 },
    { sx: -240, sy:  60,  val: "$50", src: "OFFICIAL", accent: "#5DD4D6", d: 1.10, dur: 3.2 },
    { sx:  230, sy:  90,  val: "$47", src: "CRAWLER",  accent: "#FF7BD4", d: 1.65, dur: 3.5 },
    { sx: -180, sy: -130, val: "$48", src: "CRAWLER",  accent: "#C9F26E", d: 2.20, dur: 3.3 },
    { sx:  200, sy: -130, val: "$49", src: "CRAWLER",  accent: "#FFE36B", d: 2.75, dur: 3.4 },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      {/* central halo */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 240, height: 240,
        marginLeft: -120, marginTop: -120,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,230,255,0.28) 0%, transparent 65%)",
        pointerEvents: "none",
      }}/>

      {/* central verified consensus */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 5,
      }}>
        <div style={{
          textAlign: "center",
          opacity: 0,
          animation: "pc2EyebrowEnter 800ms 0.4s ease-out both",
        }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "2px",
          marginBottom: 4,
          textTransform: "uppercase",
        }}>Face value</div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 76, fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          textShadow: "0 0 30px rgba(122,230,255,0.55), 0 0 60px rgba(122,230,255,0.25)",
          animation: "pcCenterPulse 3s 1s ease-in-out infinite",
        }}>$48</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          marginTop: 10,
          padding: "3px 11px",
          border: "1.5px solid #7AE6FF",
          borderRadius: 999,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "#7AE6FF",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6 L5 9 L10 3"
              stroke="#7AE6FF" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Verified
        </div>
        </div>
      </div>

      {/* floating submitted-price tags drifting inward */}
      {tags.map((t, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          marginLeft: t.sx, marginTop: t.sy,
          "--pc-dx": `${-t.sx}px`,
          "--pc-dy": `${-t.sy}px`,
          opacity: 0,
          animation: `pcPriceTagDrift ${t.dur}s ${t.d}s ease-in-out infinite`,
          padding: "4px 9px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${t.accent}55`,
          borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: t.accent,
          letterSpacing: "1.4px",
          display: "inline-flex", alignItems: "center", gap: 7,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: `0 0 8px ${t.accent}33`,
        }}>
          <span style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 11 }}>{t.val}</span>
          <span style={{ opacity: 0.75 }}>{t.src}</span>
        </div>
      ))}

      {/* report count below */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: 18,
        transform: "translateX(-50%)",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "1.8px", textTransform: "uppercase",
          opacity: 0,
          animation: "pc2EyebrowEnter 800ms 1.4s ease-out both",
        }}>6 reports · last 7 days</div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Crowd-sourced · verified</ShowtimeEyebrow>
    </div>
  );
}

Object.assign(window, {
  CalendarShowtime,
  ShareableShowtime, ShareCard, ShareArtStripes, ShareArtRings, ShareArtHalftone,
  WatchersShowtime,
  SpotifyShowtime,
  PricesShowtime,
});
