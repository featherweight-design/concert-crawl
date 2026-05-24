// priority-2-heroes.jsx — the seven pre-public-launch heroes that slot
// into the Showtime stage (dark backdrop · warm + cool drifting washes ·
// mono eyebrow w/ pulsing dot · brand 7-colour accents).
//
//   FollowingShowtime    — Artist Following (#8): artist plate + slow ping
//                          rings emanating + announce-card slides up.
//                          Motion: notification ping (smaller / slower
//                          than Watchers; intent is "we just told you"
//                          not "a crowd is gathering").
//   PriceDropShowtime    — Price Drop Alerts (#9): old price ticks down
//                          to new price, mono arrow trail descending,
//                          SAVED chip lands.
//   SetlistShowtime      — Setlist Preview (#10): receipt-style numbered
//                          tracklist, lines type in with clip-path.
//   FirstTimerShowtime   — Venue First-Timer Guide (#11): geometric venue
//                          plate + info chips deal in around it from
//                          outside the frame.
//   LastTimeShowtime     — Last Time in Denver (#12): 3 past visits
//                          cascade across a time axis → bigger TONIGHT
//                          stub. Same stub artifact as Passport/History
//                          but compressed to one artist's history in
//                          one city.
//   SupportActShowtime   — Support Act Spotlight (#13): 2 artist cards
//                          — headliner behind, opener in front; opener
//                          lifts/breathes.
//   VenuePassportShowtime — Venue Passport Card (#15, paired with #14):
//                          one oversized passport card centred; 10
//                          mini-stamps ink into its inner grid one by
//                          one.
//
// Particle restraint: nothing here uses pc2Sparkle. Sparkles remain
// reserved for the marquee Passport hero.
//
// Re-uses (from more-features-showtime.jsx):
//   <ShowtimeBackdrop/>, <ShowtimeEyebrow/>, window.StubGlyph
// Re-uses keyframes from passport-concepts-v2.jsx:
//   pc2StubDealVaried, pc2StubBreathe, pc2BgShift, pc2Pulse, pc2EyebrowEnter

// ── Hero-specific keyframes ─────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("p2-keyframes")) {
  const s = document.createElement("style");
  s.id = "p2-keyframes";
  s.textContent = `
    /* Following — slow ping (smaller scale than Watchers' radar) */
    @keyframes p2Ping {
      0%   { transform: translate(-50%, -50%) scale(0.55); opacity: 0.55; }
      80%  { opacity: 0.10; }
      100% { transform: translate(-50%, -50%) scale(1);    opacity: 0; }
    }
    @keyframes p2NotifIn {
      0%   { opacity: 0; transform: translateY(14px) scale(.96); }
      55%  { opacity: 1; transform: translateY(-2px) scale(1.01); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes p2HeartBeat {
      0%,100% { transform: scale(1); }
      45%     { transform: scale(1.18); }
      55%     { transform: scale(0.96); }
    }

    /* Price Drop — old price slides up & out, new price ticks in */
    @keyframes p2OldOut {
      0%,18%  { opacity: 0.85; transform: translateY(0)   scale(1); }
      40%     { opacity: 0;    transform: translateY(-22px) scale(.92); }
      100%    { opacity: 0;    transform: translateY(-22px) scale(.92); }
    }
    @keyframes p2NewIn {
      0%,30%  { opacity: 0; transform: translateY(22px) scale(.92); }
      55%     { opacity: 1; transform: translateY(0)    scale(1.05); }
      75%,100%{ opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes p2ArrowFall {
      0%   { transform: translateY(-26px); opacity: 0; }
      18%  { opacity: 1; }
      82%  { opacity: 1; }
      100% { transform: translateY(28px);  opacity: 0; }
    }
    @keyframes p2SavedIn {
      0%   { opacity: 0; transform: translateX(-12px) scale(.9); }
      100% { opacity: 1; transform: translateX(0)     scale(1); }
    }

    /* Setlist — line types in left → right via clip-path */
    @keyframes p2LineType {
      0%   { opacity: 0; clip-path: inset(0 100% 0 0); }
      8%   { opacity: 1; }
      100% { opacity: 1; clip-path: inset(0 0 0 0);   }
    }

    /* First-Timer — chip deals in from its own --p2-fx/--p2-fy offset */
    @keyframes p2ChipDeal {
      0%   { opacity: 0; transform: translate(var(--p2-fx, 0), var(--p2-fy, 0)) scale(.85); }
      55%  { opacity: 1; transform: translate(0,0) scale(1.04); }
      100% { opacity: 1; transform: translate(0,0) scale(1); }
    }
    @keyframes p2PlateIn {
      0%   { opacity: 0; transform: translate(-50%, -50%) scale(.92); }
      100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* Last-Time — small breathe used on the TONIGHT stub */
    /* (cascade reuses pc2StubDealVaried) */

    /* Support Act — opener lifts/breathes in front of the headliner */
    @keyframes p2OpenerLift {
      0%,100% { transform: translate(0, 0)   rotate(var(--p2-rot, 0deg)); }
      50%     { transform: translate(0, -4px) rotate(calc(var(--p2-rot, 0deg) - 0.6deg)); }
    }
    @keyframes p2CardDeal {
      0%   { opacity: 0; transform: translate(var(--p2-tx, 0px), 22px) rotate(var(--p2-rot, 0deg)) scale(.94); }
      55%  { opacity: 1; transform: translate(var(--p2-tx, 0px), -3px) rotate(var(--p2-rot, 0deg)) scale(1.02); }
      100% { opacity: 1; transform: translate(var(--p2-tx, 0px), 0)    rotate(var(--p2-rot, 0deg)) scale(1); }
    }

    /* Venue Passport — single card deals in, mini-stamps ink in inside */
    @keyframes p2PassportIn {
      0%   { opacity: 0; transform: translate(-50%, -50%) rotate(-2deg) scale(.9); }
      60%  { opacity: 1; transform: translate(-50%, -50%) rotate(-2deg) scale(1.02); }
      100% { opacity: 1; transform: translate(-50%, -50%) rotate(-2deg) scale(1); }
    }
    @keyframes p2MiniStampIn {
      0%   { opacity: 0; transform: scale(0) rotate(var(--p2-mrot, 0deg)); }
      60%  { opacity: 1; transform: scale(1.18) rotate(var(--p2-mrot, 0deg)); }
      100% { opacity: 1; transform: scale(1)    rotate(var(--p2-mrot, 0deg)); }
    }
  `;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════════════
// 8 · ARTIST FOLLOWING · Showtime
// ════════════════════════════════════════════════════════════════
function FollowingShowtime() {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* slow ping rings emanating from artist plate */}
      {[0, 1.0, 2.0].map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          left: 140, top: "50%",
          width: 240, height: 240,
          borderRadius: "50%",
          border: "1.5px solid #FF7BD4",
          opacity: 0,
          transform: "translate(-50%, -50%) scale(0.55)",
          animation: `p2Ping 3.4s ${d}s ease-out infinite`,
          pointerEvents: "none",
        }}/>
      ))}

      {/* artist plate (identity-art riso stripes placeholder) */}
      <div style={{
        position: "absolute",
        left: 60, top: "50%",
        width: 160, height: 160,
        marginTop: -80,
        borderRadius: 8,
        overflow: "hidden",
        border: "1.5px solid rgba(255,255,255,0.18)",
        filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,123,212,0.35))",
        opacity: 0,
        animation: "pc2EyebrowEnter 700ms 0.25s ease-out both",
        zIndex: 5,
      }}>
        {/* riso stripes */}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "#2A1A2A" }}>
          {[0,1,2,3,4].map(j => (
            <div key={j} style={{
              flex: 1,
              background: j % 2 === 0 ? "#FF7BD4" : "#A075FF",
              opacity: 0.85,
              transform: j % 2 === 0 ? "translateY(-3px)" : "translateY(3px)",
              marginRight: j < 4 ? 1 : 0,
              mixBlendMode: "screen",
            }}/>
          ))}
        </div>
        {/* halftone overlay */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const x = col * 16 + 10, y = row * 22 + 8;
            const dist = Math.sqrt((5 - col) ** 2 + (3 - row) ** 2);
            const r = Math.max(0.7, 3.4 - dist * 0.45);
            return <circle key={i} cx={x} cy={y} r={r} fill="#FFE36B" opacity="0.85"/>;
          })}
        </svg>
        {/* artist name */}
        <div style={{
          position: "absolute",
          left: 10, bottom: 10, right: 10,
          fontFamily: "Inter, sans-serif",
          fontSize: 16, fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: "-0.03em",
          textShadow: "0 2px 6px rgba(0,0,0,0.65)",
          lineHeight: 1,
        }}>RUN THE JEWELS</div>
        {/* + FOLLOWING bell chip — differentiated from Watching's dot */}
        <div style={{
          position: "absolute",
          right: 8, top: 8,
          padding: "3px 8px 3px 6px",
          background: "rgba(0,0,0,0.62)",
          border: "1px solid #FF7BD4",
          borderRadius: 999,
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, fontWeight: 800,
          color: "#FF7BD4",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            transformOrigin: "top center",
            animation: "p2HeartBeat 1.6s ease-in-out infinite",
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M3 9 L9 9 M3 9 Q3 4 6 3 Q9 4 9 9"
                stroke="#FF7BD4" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
                fill="rgba(255,123,212,0.18)"/>
              <circle cx="6" cy="10.5" r="0.8" fill="#FF7BD4"/>
            </svg>
          </span>
          Following
        </div>
      </div>

      {/* right column: 2 notification cards stack */}
      <div style={{
        position: "absolute",
        right: 36, top: "50%",
        marginTop: -86, width: 220,
        display: "flex", flexDirection: "column", gap: 12,
        zIndex: 6,
      }}>
        <div style={{
          padding: "11px 13px",
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid #7AE6FF",
          borderRadius: 6,
          boxShadow: "0 0 18px rgba(122,230,255,0.35)",
          opacity: 0,
          animation: "p2NotifIn 600ms 0.9s cubic-bezier(.2,.85,.2,1) both",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5, fontWeight: 800,
            color: "#7AE6FF",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            marginBottom: 5,
          }}>★ New show announced</div>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14, fontWeight: 900,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 4,
          }}>Ogden Theatre · Denver</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "1.4px",
            textTransform: "uppercase",
          }}>Nov 14 · Thu</div>
        </div>

        <div style={{
          padding: "9px 13px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6,
          opacity: 0,
          animation: "p2NotifIn 600ms 1.4s cubic-bezier(.2,.85,.2,1) both",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5, fontWeight: 800,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
          }}>Presale</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "#FFE36B",
            letterSpacing: "1.4px",
          }}>TUE 10 AM</div>
        </div>
      </div>

      <window.ShowtimeEyebrow dotHue="#FF7BD4">Following · we'll ping you</window.ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 9 · PRICE DROP ALERTS · Showtime
// ════════════════════════════════════════════════════════════════
// Centred composition: header → price ticker → descending arrow trail
// → SAVED chip → full-width thin sparkline floor. All vertical, all
// centred — no left/right asymmetry.
function PriceDropShowtime() {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* central halo — leans amber/lime to signal "save" */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 300, height: 300,
        marginLeft: -150, marginTop: -150,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,242,110,0.22) 0%, rgba(255,184,56,0.10) 35%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {/* MAIN centred column */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 5,
        width: 360,
      }}>
        <div style={{
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: 0,
          animation: "pc2EyebrowEnter 700ms 0.3s ease-out both",
        }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8.5, fontWeight: 800,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
        }}>Resale · Sleep Token · Tonight</div>

        {/* price stack */}
        <div style={{ position: "relative", height: 96, width: 220, marginTop: 6 }}>
          {/* old price — slides up + fades */}
          <div style={{
            position: "absolute",
            left: "50%", top: 0,
            transform: "translateX(-50%)",
            fontFamily: "Inter, sans-serif",
            fontSize: 32, fontWeight: 900,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "-0.04em",
            textDecoration: "line-through",
            textDecorationColor: "rgba(255,255,255,0.45)",
            animation: "p2OldOut 4.0s 1.1s ease-in-out infinite",
          }}>$120</div>

          {/* new price */}
          <div style={{
            position: "absolute",
            left: "50%", top: 18,
            transform: "translateX(-50%)",
            fontFamily: "Inter, sans-serif",
            fontSize: 74, fontWeight: 900,
            color: "#C9F26E",
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            textShadow: "0 0 24px rgba(201,242,110,0.45)",
            animation: "p2NewIn 4.0s 1.1s ease-in-out infinite",
          }}>$48</div>

          {/* small downward arrow trail — LEFT of the price as a visual cue */}
          <div style={{
            position: "absolute",
            left: -8, top: 14,
            width: 22, height: 70,
            pointerEvents: "none",
          }}>
            {[0, 0.7, 1.4].map((d, i) => (
              <svg key={i} width="22" height="12" viewBox="0 0 22 12"
                style={{
                  position: "absolute",
                  left: 0, top: i * 22,
                  opacity: 0,
                  animation: `p2ArrowFall 2.4s ${d}s ease-in-out infinite`,
                }}>
                <path d="M3 3 L11 9 L19 3"
                  fill="none" stroke="#C9F26E" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round"
                  opacity={0.85 - i * 0.20}/>
              </svg>
            ))}
          </div>
          {/* mirror trail on RIGHT for symmetry */}
          <div style={{
            position: "absolute",
            right: -8, top: 14,
            width: 22, height: 70,
            pointerEvents: "none",
          }}>
            {[0.35, 1.05, 1.75].map((d, i) => (
              <svg key={i} width="22" height="12" viewBox="0 0 22 12"
                style={{
                  position: "absolute",
                  left: 0, top: i * 22,
                  opacity: 0,
                  animation: `p2ArrowFall 2.4s ${d}s ease-in-out infinite`,
                }}>
                <path d="M3 3 L11 9 L19 3"
                  fill="none" stroke="#C9F26E" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round"
                  opacity={0.85 - i * 0.20}/>
              </svg>
            ))}
          </div>
        </div>

        {/* SAVED chip */}
        <div style={{
          marginTop: 10,
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 11px",
          background: "rgba(201,242,110,0.10)",
          border: "1.5px solid #C9F26E",
          borderRadius: 999,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "#C9F26E",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          opacity: 0,
          animation: "p2SavedIn 500ms 1.5s cubic-bezier(.2,.85,.2,1) both",
        }}>
          <span style={{ fontSize: 12 }}>↓</span> Saved $72
        </div>

        {/* tiny inline sparkline — trend floor */}
        <div style={{
          marginTop: 14,
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: 0,
          animation: "pc2EyebrowEnter 700ms 1.9s ease-out both",
        }}>
          <svg width="180" height="22" viewBox="0 0 180 22" style={{ display: "block" }}>
            <polyline
              points="0,6 22,5 44,9 66,7 88,13 110,14 132,17 154,19 180,20"
              fill="none" stroke="#FFB838" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"
              opacity="0.75"/>
            <circle cx="180" cy="20" r="2.6" fill="#C9F26E"
              style={{ filter: "drop-shadow(0 0 4px #C9F26E)" }}/>
          </svg>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 700,
            color: "rgba(255,255,255,0.40)",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            marginTop: 4,
          }}>Watching 14 d · lowest yet</div>
        </div>
        </div>
      </div>

      <window.ShowtimeEyebrow dotHue="#C9F26E">Watch · alert · save</window.ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 10 · SETLIST PREVIEW · Showtime
// ════════════════════════════════════════════════════════════════
function SetlistShowtime() {
  const tracks = [
    { n: "01", name: "OH MY DARLING DON'T CRY",  dur: "4:12", debut: false },
    { n: "02", name: "NEAR HEAVENLY",            dur: "3:48", debut: false },
    { n: "03", name: "OUT OF SIGHT",             dur: "5:21", debut: true  },
    { n: "04", name: "CROWN ON THE GROUND",      dur: "6:04", debut: false },
    { n: "05", name: "PANTHER LIKE A PANTHER",   dur: "7:18", debut: true  },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* central halo behind receipt */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 360, height: 280,
        marginLeft: -180, marginTop: -140,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(122,230,255,0.18) 0%, transparent 65%)",
        pointerEvents: "none",
      }}/>

      {/* receipt card — centred horizontally and vertically */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 380,
        zIndex: 5,
      }}>
        <div style={{
          padding: "16px 22px 16px",
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 6,
          boxShadow: "0 18px 40px rgba(0,0,0,0.55), 0 0 24px rgba(122,230,255,0.10)",
          opacity: 0,
          animation: "pc2EyebrowEnter 700ms 0.2s ease-out both",
        }}>
        {/* HEADER — centred title with mono flanks for balance */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 12,
          paddingBottom: 9,
          borderBottom: "1px dashed rgba(255,255,255,0.20)",
          marginBottom: 10,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5, fontWeight: 800,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            textAlign: "left",
          }}>Likely · last 7</div>

          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 16, fontWeight: 900,
            color: "rgba(255,255,255,0.96)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}>SETLIST · TONIGHT</div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5, fontWeight: 800,
            color: "#7AE6FF",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            textAlign: "right",
          }}>5 / 14</div>
        </div>

        {/* TRACKS — 5 rows, mono numbers + dur, Inter for name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tracks.map((t, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr auto",
              gap: 12, alignItems: "baseline",
              opacity: 0,
              animation: `p2LineType 420ms ${0.45 + i * 0.15}s cubic-bezier(.2,.85,.2,1) both`,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700,
                color: "rgba(255,255,255,0.42)",
                letterSpacing: "0.8px",
              }}>{t.n}</span>
              <span style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13, fontWeight: 700,
                color: t.debut ? "#FFE36B" : "rgba(255,255,255,0.94)",
                letterSpacing: "-0.01em",
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
                {t.name}
                {t.debut && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 7, fontWeight: 800,
                    color: "#FFE36B",
                    letterSpacing: "1.4px",
                    padding: "1px 5px",
                    border: "1px solid #FFE36B",
                    borderRadius: 2,
                  }}>★ DEBUT?</span>
                )}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700,
                color: "rgba(255,255,255,0.42)",
                letterSpacing: "0.8px",
              }}>{t.dur}</span>
            </div>
          ))}
        </div>

        {/* FOOTER — mirror-balanced like header */}
        <div style={{
          marginTop: 11, paddingTop: 9,
          borderTop: "1px dashed rgba(255,255,255,0.20)",
          display: "flex", justifyContent: "space-between",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8.5, fontWeight: 800,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "1.6px",
          textTransform: "uppercase",
        }}>
          <span>Est. 1h 42m</span>
          <span style={{ color: "#7AE6FF" }}>tap to see full list</span>
        </div>
        </div>
      </div>

      <window.ShowtimeEyebrow dotHue="#7AE6FF">What they're playing</window.ShowtimeEyebrow>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 11 · VENUE FIRST-TIMER GUIDE · Showtime
// ════════════════════════════════════════════════════════════════
// Geometric venue plate centred, info chips deal in around it from
// outside the frame. Each chip carries its own fx/fy entrance vector so
// the deal looks like the chips are arriving from where they came from.
function FirstTimerShowtime() {
  // Two tight stacks of 3 chips: left side venue-arrival info, right side
  // amenities. Each chip deals in from outside the frame on its own vector.
  const left = [
    { accent: "#FFB838", label: "DOORS · 7 PM",        fx: "-50px", fy:  "0px", d: 0.40 },
    { accent: "#FF7BD4", label: "PARKING · LOT 7 · $20", fx: "-50px", fy: "-10px", d: 0.55 },
    { accent: "#A075FF", label: "21 + · ID READY",      fx: "-50px", fy: "-20px", d: 0.70 },
  ];
  const right = [
    { accent: "#7AE6FF", label: "BAR OPENS · 6 PM",     fx:  "50px", fy:  "0px", d: 0.85 },
    { accent: "#C9F26E", label: "FOOD · CASHLESS",     fx:  "50px", fy: "-10px", d: 1.00 },
    { accent: "#FFE36B", label: "BAGS · CLEAR ONLY",   fx:  "50px", fy: "-20px", d: 1.15 },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* central venue plate — geometric silhouette only */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 180, height: 180,
        transform: "translate(-50%, -54%) scale(0.92)",
        opacity: 0,
        animation: "p2PlateIn 700ms 0.15s cubic-bezier(.2,.85,.2,1) both",
        zIndex: 3,
        filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 22px rgba(122,230,255,0.30))",
      }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ display: "block" }}>
          {/* outer geometric plate (octagon) */}
          <polygon
            points="44,8 136,8 172,44 172,136 136,172 44,172 8,136 8,44"
            fill="rgba(255,255,255,0.04)"
            stroke="#7AE6FF" strokeWidth="1.6" opacity="0.85"/>
          {/* inner concentric — like a venue floor plan */}
          <polygon
            points="58,28 122,28 152,58 152,122 122,152 58,152 28,122 28,58"
            fill="none" stroke="#7AE6FF" strokeWidth="0.8" opacity="0.45"/>
          {/* stage marker (top arc) */}
          <path d="M 65 38 Q 90 22 115 38"
            fill="none" stroke="#FF7BD4" strokeWidth="2.5"
            strokeLinecap="round"/>
          <text x="90" y="56"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="7" fontWeight="800" letterSpacing="2"
            fill="#FF7BD4" textAnchor="middle">STAGE</text>
          {/* GA pit dots */}
          <g opacity="0.55">
            {[0,1,2,3,4].map(r =>
              [-2,-1,0,1,2].map(c => (
                <circle key={`${r}-${c}`}
                  cx={90 + c * 12} cy={88 + r * 11} r="1.4"
                  fill="#7AE6FF"/>
              ))
            )}
          </g>
          {/* compass — n marker */}
          <g transform="translate(90 158)">
            <circle r="5.5" fill="rgba(0,0,0,0.3)" stroke="#FFE36B" strokeWidth="1"/>
            <text x="0" y="2"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="6" fontWeight="800" letterSpacing="0.5"
              fill="#FFE36B" textAnchor="middle">N</text>
          </g>
        </svg>
        {/* venue label overlay */}
        <div style={{
          position: "absolute",
          left: "50%", bottom: -28,
          transform: "translateX(-50%)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "2px",
            marginBottom: 2,
          }}>FIRST TIME AT</div>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17, fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}>THE GOTHIC</div>
        </div>
      </div>

      {/* LEFT chip stack */}
      <div style={{
        position: "absolute",
        left: 22, top: "50%",
        transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 7,
        alignItems: "flex-start",
        zIndex: 4,
      }}>
        {left.map((c, i) => (
          <FirstTimerChip key={i} c={c} side="left"/>
        ))}
      </div>

      {/* RIGHT chip stack */}
      <div style={{
        position: "absolute",
        right: 22, top: "50%",
        transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 7,
        alignItems: "flex-end",
        zIndex: 4,
      }}>
        {right.map((c, i) => (
          <FirstTimerChip key={i} c={c} side="right"/>
        ))}
      </div>

      <window.ShowtimeEyebrow dotHue="#7AE6FF">First time? · here's the lay</window.ShowtimeEyebrow>
    </div>
  );
}

function FirstTimerChip({ c, side }) {
  return (
    <div style={{
      "--p2-fx": c.fx,
      "--p2-fy": c.fy,
      opacity: 0,
      animation: `p2ChipDeal 520ms ${c.d}s cubic-bezier(.2,.85,.2,1) both`,
      padding: "5px 10px",
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${c.accent}55`,
      [side === "left" ? "borderLeft" : "borderRight"]: `2.5px solid ${c.accent}`,
      borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, fontWeight: 800,
      color: c.accent,
      letterSpacing: "1.4px",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      boxShadow: `0 0 10px ${c.accent}22`,
    }}>{c.label}</div>
  );
}

// ════════════════════════════════════════════════════════════════
// 12 · LAST TIME IN DENVER · Showtime
// ════════════════════════════════════════════════════════════════
// Polaroid memory metaphor. ONE singular memory artifact (a tilted
// polaroid of the last visit) on the left, and a clear TONIGHT plate on
// the right. A thin dot trail underneath maps the prior visits across
// time. Deliberately different vocabulary from Concert History: that's a
// cascade of stubs (the collection); this is a single recalled moment
// (the memory).
function LastTimeShowtime() {
  // visits including tonight — used only for the dot trail and stats
  const visits = [
    { date: "JUN '22", venue: "LARIMER" },
    { date: "FEB '24", venue: "GOTHIC"  },
    { date: "OCT '24", venue: "MISSION" },
    { date: "TONIGHT", venue: "OGDEN", current: true },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* POLAROID — left, the recalled visit */}
      <div style={{
        position: "absolute",
        left: 56, top: "50%",
        width: 168, height: 200,
        marginTop: -110,
        "--pc-sx": "-40px",
        "--pc-sy": "-180px",
        "--pc-srot": "-18deg",
        "--pc-tx": "0px",
        "--pc-rot": "-4deg",
        transform: "rotate(-4deg)",
        transformOrigin: "center center",
        animation: "pc2StubDealVaried 850ms 0.20s cubic-bezier(.2,.85,.2,1) both, pc2StubBreathe 5s 2s ease-in-out infinite",
        zIndex: 4,
        filter: "drop-shadow(0 16px 28px rgba(0,0,0,0.60)) drop-shadow(0 0 18px rgba(160,117,255,0.25))",
      }}>
        {/* paper card */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#F4EFE3",
          borderRadius: 3,
          padding: "10px 10px 0",
          display: "flex", flexDirection: "column",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
        }}>
          {/* riso art panel — rings treatment in violet/pink */}
          <div style={{
            position: "relative",
            flex: 1,
            background: "#2A1A2A",
            overflow: "hidden",
          }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <g transform="translate(3 3)" style={{ mixBlendMode: "screen" }}>
                {[44, 34, 24, 14].map((r, i) => (
                  <circle key={`s-${i}`} cx="58" cy="42" r={r}
                    fill="none" stroke="#FF7BD4"
                    strokeWidth="3" opacity="0.72"/>
                ))}
              </g>
              <g style={{ mixBlendMode: "screen" }}>
                {[44, 34, 24, 14].map((r, i) => (
                  <circle key={`p-${i}`} cx="58" cy="42" r={r}
                    fill="none" stroke="#A075FF"
                    strokeWidth="3" opacity="0.85"/>
                ))}
              </g>
            </svg>
            {/* mono band caption inside art — distance / 'years ago' */}
            <div style={{
              position: "absolute",
              left: 8, top: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7.5, fontWeight: 800,
              color: "#FFE36B",
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              padding: "2px 6px",
              background: "rgba(0,0,0,0.55)",
              borderRadius: 2,
            }}>2 yrs ago</div>
          </div>
          {/* paper margin under photo — polaroid signature */}
          <div style={{
            padding: "10px 4px 14px",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            <div style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14, fontWeight: 900,
              color: "#15131A",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}>Gothic Theatre</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5, fontWeight: 800,
              color: "#6B5E78",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
            }}>Feb 14 · 2024</div>
          </div>
        </div>
        {/* tape strip top-left for analog feel */}
        <div style={{
          position: "absolute",
          left: -12, top: 14,
          width: 48, height: 16,
          background: "rgba(255,227,107,0.55)",
          border: "1px solid rgba(255,227,107,0.7)",
          transform: "rotate(-22deg)",
          mixBlendMode: "screen",
        }}/>
      </div>

      {/* RIGHT: artist + tonight plate */}
      <div style={{
        position: "absolute",
        right: 36, top: "50%",
        marginTop: -100, width: 240,
        zIndex: 5,
        display: "flex", flexDirection: "column", gap: 6,
        opacity: 0,
        animation: "pc2EyebrowEnter 750ms 0.55s ease-out both",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
        }}>Sleep Token · in Denver</div>

        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 30, fontWeight: 900,
          color: "rgba(255,255,255,0.96)",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          marginTop: 2,
        }}>3 visits<br/>+ tonight</div>

        {/* divider */}
        <div style={{
          height: 1, marginTop: 10, marginBottom: 6,
          background: "linear-gradient(to right, rgba(122,230,255,0.50), transparent)",
        }}/>

        <div style={{
          padding: "9px 12px",
          background: "rgba(122,230,255,0.06)",
          border: "1.5px solid #7AE6FF",
          borderRadius: 4,
          boxShadow: "0 0 18px rgba(122,230,255,0.25)",
          display: "flex", flexDirection: "column", gap: 2,
          animation: "pc2StubBreathe 5s 1.6s ease-in-out infinite",
          "--pc-rot": "0deg", "--pc-tx": "0px",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "#7AE6FF",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
          }}>Tonight · visit 4</div>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17, fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}>Ogden Theatre</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "1.4px",
          }}>AUG 18 · DOORS 8 PM</div>
        </div>
      </div>

      {/* DOT TRAIL — thin timeline across the bottom */}
      <div style={{
        position: "absolute",
        left: 50, right: 50, bottom: 26,
        display: "grid",
        gridTemplateColumns: `repeat(${visits.length}, 1fr)`,
        alignItems: "center",
        zIndex: 3,
      }}>
        {/* underline */}
        <div style={{
          position: "absolute",
          left: 0, right: 0, top: "50%",
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18) 10%, rgba(255,255,255,0.18) 90%, transparent)",
          opacity: 0,
          animation: "pc2EyebrowEnter 800ms 0.9s ease-out both",
        }}/>
        {visits.map((v, i) => (
          <div key={i} style={{
            position: "relative",
            textAlign: "center",
            opacity: 0,
            animation: `pc2EyebrowEnter 600ms ${1.0 + i * 0.16}s ease-out both`,
          }}>
            <span style={{
              display: "inline-block",
              width: v.current ? 8 : 5,
              height: v.current ? 8 : 5,
              borderRadius: "50%",
              background: v.current ? "#7AE6FF" : "rgba(255,255,255,0.55)",
              boxShadow: v.current ? "0 0 10px #7AE6FF" : "none",
              animation: v.current ? "pc2Pulse 1.6s ease-in-out infinite" : "none",
            }}/>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7.5, fontWeight: 800,
              color: v.current ? "#7AE6FF" : "rgba(255,255,255,0.50)",
              letterSpacing: "1.4px",
              marginTop: 4,
            }}>{v.date}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7, fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "1.2px",
              marginTop: 1,
            }}>{v.venue}</div>
          </div>
        ))}
      </div>

      <window.ShowtimeEyebrow dotHue="#A075FF">Last time in town</window.ShowtimeEyebrow>
    </div>
  );
}

// (LastTimeStub removed — v2 uses a polaroid memory artifact instead of
// a cascade of stubs to differentiate from Concert History.)
function __LastTimeStub_deprecated() { return null; }

// ════════════════════════════════════════════════════════════════
// 13 · SUPPORT ACT SPOTLIGHT · Showtime
// ════════════════════════════════════════════════════════════════
// Two artist cards. Headliner is small + behind + slightly faded. Opener
// is large + front + breathes (the spotlight). Both render an identity-
// art region (riso treatment) so they read as poster-cards not portraits.
function SupportActShowtime() {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* central spotlight halo — points at the opener */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 320, height: 320,
        marginLeft: -120, marginTop: -160,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,227,107,0.20) 0%, rgba(122,230,255,0.10) 35%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {/* HEADLINER — back, slightly right of centre */}
      <div style={{
        position: "absolute",
        left: 300, top: "50%",
        marginTop: -85,
        "--p2-tx": "0px",
        "--p2-rot": "5deg",
        opacity: 0,
        animation: "p2CardDeal 720ms 0.2s cubic-bezier(.2,.85,.2,1) both",
        zIndex: 4,
        filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.55))",
      }}>
        <ArtistPosterCard
          band="Sleep Token"
          role="HEADLINER · 9:30 PM"
          palette={{ bg: "#1A2A30", primary: "#5DD4D6", secondary: "#FFB838" }}
          style="stripes"
          size="small"
        />
      </div>

      {/* OPENER — front, slightly left of centre, overlapping the headliner */}
      <div style={{
        position: "absolute",
        left: 140, top: "50%",
        marginTop: -110,
        "--p2-tx": "0px",
        "--p2-rot": "-3deg",
        opacity: 0,
        animation: "p2CardDeal 800ms 0.6s cubic-bezier(.2,.85,.2,1) both, p2OpenerLift 4.5s 1.7s ease-in-out infinite",
        zIndex: 8,
        filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(255,227,107,0.40))",
      }}>
        <ArtistPosterCard
          band="Marriages"
          role="★ OPENING · 8:00 PM"
          palette={{ bg: "#2A1A1A", primary: "#FFE36B", secondary: "#FF7BD4" }}
          style="rings"
          size="large"
          highlight
        />
      </div>

      {/* mono caption strip — bottom-centre */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: 18,
        transform: "translateX(-50%)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 800,
        color: "rgba(255,255,255,0.6)",
        letterSpacing: "1.8px",
        textTransform: "uppercase",
        opacity: 0,
        animation: "pc2EyebrowEnter 700ms 1.4s ease-out both",
        textAlign: "center",
      }}>
        <span style={{ color: "#FFE36B" }}>13 followers</span> &nbsp;·&nbsp; new to you
      </div>

      <window.ShowtimeEyebrow dotHue="#FFE36B">Don't miss the opener</window.ShowtimeEyebrow>
    </div>
  );
}

function ArtistPosterCard({ band, role, palette, style, size, highlight }) {
  const W = size === "large" ? 160 : 120;
  const H = size === "large" ? 220 : 170;
  return (
    <div style={{
      position: "relative",
      width: W, height: H,
      borderRadius: 8,
      background: palette.bg,
      border: highlight ? "1.5px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* art region */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {style === "stripes" && (
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                flex: 1,
                background: i % 2 === 0 ? palette.primary : palette.secondary,
                opacity: 0.88,
                marginRight: i < 4 ? 1 : 0,
                transform: i % 2 === 0 ? "translateY(-3px)" : "translateY(3px)",
                mixBlendMode: "screen",
              }}/>
            ))}
          </div>
        )}
        {style === "rings" && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <g transform="translate(3 3)" style={{ mixBlendMode: "screen" }}>
              {[44, 34, 24, 14].map((r, i) => (
                <circle key={`s-${i}`} cx="50" cy="44" r={r}
                  fill="none" stroke={palette.secondary}
                  strokeWidth="3" opacity="0.7"/>
              ))}
            </g>
            <g style={{ mixBlendMode: "screen" }}>
              {[44, 34, 24, 14].map((r, i) => (
                <circle key={`p-${i}`} cx="50" cy="44" r={r}
                  fill="none" stroke={palette.primary}
                  strokeWidth="3" opacity="0.85"/>
              ))}
            </g>
          </svg>
        )}
      </div>
      {/* label */}
      <div style={{
        background: palette.bg,
        padding: size === "large" ? "10px 13px 12px" : "7px 10px 9px",
        borderTop: `1.5px solid ${palette.primary}`,
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: size === "large" ? 15 : 11.5, fontWeight: 900,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          marginBottom: 4,
        }}>{band}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: size === "large" ? 8 : 7, fontWeight: 800,
          color: palette.primary,
          letterSpacing: "1.6px",
          textTransform: "uppercase",
        }}>{role}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 15 · VENUE PASSPORT CARD · Showtime (paired with #14 Concert Passport)
// ════════════════════════════════════════════════════════════════
// One oversized passport card, centred and tilted. Inside the card: venue
// title, big stamp count, and a 5×2 grid of 10 mini-stamp pucks that ink
// in one-by-one. Sparkles intentionally absent — only #14 Passport carries
// the sparkle treatment, even though they're a paired set.
function VenuePassportShowtime() {
  const stamps = Array.from({ length: 10 }).map((_, i) => {
    // alternating accents across the 7-colour set
    const accents = ["#FF7BD4", "#7AE6FF", "#FFE36B", "#A075FF", "#C9F26E", "#FFB838", "#5DD4D6"];
    const glyphs = ["★", "○", "△", "◆", "+", "✦", "⭡"];
    return {
      accent: accents[i % accents.length],
      glyph: glyphs[i % glyphs.length],
      d: 0.85 + i * 0.13,
      mrot: ((i * 41) % 11) - 5,
    };
  });

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)",
      fontFamily: "Inter, system-ui",
    }}>
      <window.ShowtimeBackdrop founderGlow={false}/>

      {/* radial halo behind card */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 360, height: 360,
        marginLeft: -180, marginTop: -180,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,123,212,0.22) 0%, rgba(122,230,255,0.10) 35%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {/* one big passport card */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 420, height: 220,
        transform: "translate(-50%, -50%) rotate(-2deg) scale(.9)",
        opacity: 0,
        animation: "p2PassportIn 800ms 0.2s cubic-bezier(.2,.85,.2,1) both",
        borderRadius: 10,
        background: "linear-gradient(135deg, #1A0E26 0%, #0F0A1A 100%)",
        border: "1.5px solid rgba(255,123,212,0.42)",
        boxShadow: "0 22px 44px rgba(0,0,0,0.65), 0 0 36px rgba(255,123,212,0.30), inset 0 0 0 1px rgba(255,255,255,0.04)",
        padding: "18px 22px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        zIndex: 5,
      }}>
        {/* left column: venue heading */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5, fontWeight: 800,
              color: "#FF7BD4",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>Venue Passport · 04</div>
            <div style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 30, fontWeight: 900,
              color: "rgba(255,255,255,0.97)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              textShadow: "0 1px 8px rgba(0,0,0,0.6)",
            }}>RED ROCKS</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 800,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              marginTop: 4,
            }}>Morrison · CO</div>
          </div>

          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5, fontWeight: 800,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              marginBottom: 3,
            }}>Nights stamped</div>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8,
            }}>
              <span style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 56, fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "-0.05em",
                lineHeight: 0.9,
                textShadow: "0 0 22px rgba(255,123,212,0.40)",
              }}>10</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 800,
                color: "#7AE6FF",
                letterSpacing: "1.6px",
                textTransform: "uppercase",
              }}>since '22</span>
            </div>
          </div>
        </div>

        {/* right column: 5×2 mini-stamp grid */}
        <div style={{
          position: "relative",
          padding: "6px 4px",
          borderLeft: "1px dashed rgba(255,123,212,0.30)",
          paddingLeft: 18,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 800,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>Stamp ledger</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 10,
            width: "100%",
          }}>
            {stamps.map((st, i) => (
              <div key={i} style={{
                width: 30, height: 30, position: "relative",
                opacity: 0,
                transform: `scale(0) rotate(${st.mrot}deg)`,
                "--p2-mrot": `${st.mrot}deg`,
                animation: `p2MiniStampIn 480ms ${st.d}s cubic-bezier(.2,.85,.2,1) both`,
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: "50%",
                  border: `1.5px solid ${st.accent}`,
                  background: "rgba(0,0,0,0.35)",
                  boxShadow: `0 0 10px ${st.accent}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <window.StubGlyph kind={st.glyph} size={15} color={st.accent}/>
                </div>
              </div>
            ))}
          </div>
          {/* tiny footer date */}
          <div style={{
            position: "absolute",
            right: 0, bottom: 0,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7.5, fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "1.4px",
            textTransform: "uppercase",
          }}>Aug 18 '26</div>
        </div>

        {/* corner perforation hint */}
        <div style={{
          position: "absolute",
          top: 10, right: 10,
          width: 38, height: 38,
          borderRadius: "50%",
          border: "1px dashed rgba(255,123,212,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7, fontWeight: 800,
          color: "#FF7BD4",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          transform: "rotate(-8deg)",
          pointerEvents: "none",
        }}>
          STAMPED
        </div>
      </div>

      <window.ShowtimeEyebrow dotHue="#FF7BD4">The venues you collect</window.ShowtimeEyebrow>
    </div>
  );
}

Object.assign(window, {
  FollowingShowtime,
  PriceDropShowtime,
  SetlistShowtime,
  FirstTimerShowtime, FirstTimerChip,
  LastTimeShowtime,
  SupportActShowtime, ArtistPosterCard,
  VenuePassportShowtime,
});
