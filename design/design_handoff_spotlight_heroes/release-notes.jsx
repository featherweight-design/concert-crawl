// release-notes.jsx — Concert Crawl release-notes + feature spotlight
//
// Pieces:
//   <ReleaseEntry release expanded/>        one release block on /changelog
//   <ReleasePage releases onOpenSpotlight/> full /changelog route
//   <UMStatusFooterRN unread onClick/>      version footer (drop-in for UMStatusFooter)
//   <FeatureDropPill release onOpen/>       floating pill — bottom-right desktop / above tab bar mobile
//   <SpotlightModal release onClose/>       full takeover: hero + carousel + founder note + CTA
//
// Stateless. Parent passes `unread` (release.version vs lastSeen) and wires nav.

// ── One-time keyframes ─────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("rn-keyframes")) {
  const s = document.createElement("style");
  s.id = "rn-keyframes";
  s.textContent = `
    @keyframes rnPulse  { 0%,100%{opacity:1} 50%{opacity:.45} }
    @keyframes rnSweep  { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
    @keyframes rnPinDrop { 0%{transform:translateY(-18px) scale(.6); opacity:0}
                           60%{transform:translateY(0) scale(1.1); opacity:1}
                           100%{transform:translateY(0) scale(1); opacity:1} }
    @keyframes rnRadar  { 0%{transform:scale(.6); opacity:.55} 100%{transform:scale(2.6); opacity:0} }
    @keyframes rnDrift  { 0%{transform:translate(0,0)} 100%{transform:translate(-12px,-8px)} }
    @keyframes rnFadeUp { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }
  `;
  document.head.appendChild(s);
}

// ── Eyebrow (mono, uppercase) ──────────────────────────────────
function RNEyebrow({ children, color, style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: color || "var(--fg-subtle)",
      letterSpacing: "0.14em", textTransform: "uppercase",
      ...style,
    }}>{children}</div>
  );
}

// ── KindTag — Added / Fixed / Changed / Removed ───────────────
function RNKindTag({ kind }) {
  const label = RN_KIND_LABEL[kind] || kind;
  const color = RN_KIND_COLOR[kind] || "var(--fg-muted)";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, fontWeight: 800,
      color,
      letterSpacing: "0.14em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 3,
      border: `1px solid ${color}`, opacity: 0.85,
      flexShrink: 0, lineHeight: 1.2,
    }}>{label}</span>
  );
}

// ── Single bullet — kind tag + text (no PR link) ──────────────
function RNItem({ item }) {
  return (
    <div style={{
      display: "flex", gap: 12,
      padding: "9px 0",
      alignItems: "flex-start",
    }}>
      <div style={{ paddingTop: 2 }}>
        <RNKindTag kind={item.kind}/>
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 14, lineHeight: 1.5,
        color: "var(--fg)",
        letterSpacing: "-0.005em",
        textWrap: "pretty",
      }}>{item.text}</div>
    </div>
  );
}

// ── Spotlight hero strip embedded in a /changelog entry ───────
function RNSpotlightStrip({ release, onOpen }) {
  const sp = release.spotlight;
  if (!sp) return null;
  return (
    <button type="button" onClick={onOpen} style={{
      all: "unset", cursor: "pointer",
      display: "block", width: "100%",
      marginBottom: 18,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid var(--border-strong)",
      background: "var(--bg-elevated)",
      position: "relative",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)",
        minHeight: 132,
      }}>
        <div style={{ position: "relative", background: "var(--surface-2)" }}>
          <SpotlightHero hero={sp.hero} compact/>
        </div>
        <div style={{
          padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 6,
          justifyContent: "center",
        }}>
          <RNEyebrow color="var(--accent)">Feature drop · announcement</RNEyebrow>
          <div style={{
            fontSize: 18, fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
            lineHeight: 1.2,
            textWrap: "pretty",
          }}>{sp.title}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            color: "var(--signal)",
            letterSpacing: "0.14em", textTransform: "uppercase",
            marginTop: 4,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            See the announcement
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Release entry — header + spotlight strip + headline + items ─
function ReleaseEntry({ release, isLatest = false, onOpenSpotlight }) {
  const groups = ["added", "fixed", "changed", "removed"];
  return (
    <div style={{
      position: "relative",
      paddingLeft: 36,
      paddingBottom: 36,
    }}>
      {/* timeline node */}
      <div style={{
        position: "absolute",
        left: 6, top: 6,
        width: 11, height: 11, borderRadius: 11,
        background: isLatest ? "var(--signal)" : "var(--bg)",
        border: `1.5px solid ${isLatest ? "var(--signal)" : "var(--border-strong)"}`,
        boxShadow: isLatest ? "0 0 8px var(--signal)" : "none",
      }}/>

      {/* meta line */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12,
        marginBottom: 8, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14, fontWeight: 800,
          color: "var(--fg)",
          letterSpacing: "0.02em",
        }}>{release.version}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 600,
          color: "var(--fg-subtle)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>{release.date}</span>
        {isLatest && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: "var(--signal)",
            letterSpacing: "0.16em", textTransform: "uppercase",
            padding: "2px 6px",
            border: "1px solid var(--signal)",
            borderRadius: 3,
          }}>Live</span>
        )}
      </div>

      {release.spotlight && <RNSpotlightStrip release={release} onOpen={() => onOpenSpotlight?.(release)}/>}

      {release.headline && (
        <div style={{
          fontSize: 19, fontWeight: 700,
          color: "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          marginBottom: 10,
          textWrap: "pretty",
        }}>{release.headline}</div>
      )}

      {groups.map(kind => {
        const inGroup = release.items.filter(i => i.kind === kind);
        if (!inGroup.length) return null;
        return inGroup.map((item, i) => <RNItem key={`${kind}-${i}`} item={item}/>);
      })}
    </div>
  );
}

// ── /changelog page ───────────────────────────────────────────
function ReleasePage({ releases = [], onFeedback, onOpenSpotlight }) {
  return (
    <div style={{
      width: "100%", minHeight: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      padding: "56px 32px 80px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            boxShadow: "0 0 6px var(--signal)",
            animation: "rnPulse 1.8s ease-in-out infinite",
          }}/>
          <RNEyebrow color="var(--signal)">Transmission log</RNEyebrow>
        </div>
        <h1 style={{
          fontSize: 46, fontWeight: 900,
          letterSpacing: "-0.035em",
          margin: "4px 0 8px",
          lineHeight: 1.04,
        }}>What we shipped.</h1>
        <p style={{
          fontSize: 16, fontWeight: 500,
          color: "var(--fg-muted)",
          margin: "0 0 36px",
          maxWidth: 540, lineHeight: 1.5,
        }}>Everything we've shipped, in one place. Spotted a bug or got an idea? <button type="button" onClick={onFeedback} style={{
          all: "unset", cursor: "pointer",
          color: "var(--accent)",
          borderBottom: "1px dotted var(--accent)",
        }}>Send us a note</button>.</p>

        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            left: 11, top: 8, bottom: 8, width: 1,
            background: "linear-gradient(to bottom, var(--border-strong), transparent 95%)",
          }}/>
          {releases.map((r, i) => (
            <ReleaseEntry key={r.version} release={r} isLatest={i === 0} onOpenSpotlight={onOpenSpotlight}/>
          ))}
        </div>

        <div style={{
          marginTop: 20,
          padding: "18px 0",
          textAlign: "center",
          color: "var(--fg-subtle)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>— end of log —</div>
      </div>
    </div>
  );
}

// ── User menu footer — version + pulse + optional unread dot ───
// Matches the existing UMStatusFooter rhythm (pulse · build [spacer] meta).
// The whole row is clickable, routing to /changelog. The "what's new" hint
// is the unread dot, not a label — keeps the row at the same density as the
// shipped footer.
function UMStatusFooterRN({ build = "v0.5.0-beta", unread = false, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="View changelog" style={{
      all: "unset", cursor: onClick ? "pointer" : "default",
      width: "100%",
      padding: "10px 14px",
      borderTop: "1px solid var(--border)",
      background: "var(--surface-1)",
      display: "flex", alignItems: "center", gap: 8,
      boxSizing: "border-box",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 5, flexShrink: 0,
        background: "var(--signal)",
        boxShadow: "0 0 5px var(--signal)",
        animation: "rnPulse 2.2s ease-in-out infinite",
      }}/>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700,
        color: "var(--fg-muted)",
        letterSpacing: "0.10em", textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>{build}</span>
      <span style={{ flex: 1 }}/>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 700,
        color: unread ? "var(--accent)" : "var(--fg-subtle)",
        letterSpacing: "0.14em", textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        {unread && (
          <span style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
            animation: "rnPulse 1.4s ease-in-out infinite",
          }}/>
        )}
        {unread ? "What's new" : "Changelog"}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
}

// ── Floating feature-drop pill ────────────────────────────────
function FeatureDropPill({ release, onOpen, onDismiss, variant = "desktop" }) {
  const sp = release?.spotlight;
  if (!sp) return null;
  const isMobile = variant === "mobile";
  return (
    <button type="button" onClick={onOpen} style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: isMobile ? "8px 12px 8px 10px" : "10px 14px 10px 12px",
      borderRadius: 999,
      background: "var(--bg-elevated)",
      border: "1px solid var(--accent)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 4px var(--overlay-hover)",
      color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      position: "relative",
      animation: "rnFadeUp 600ms cubic-bezier(.2,.8,.2,1) both",
    }}>
      {/* radar dot */}
      <span style={{
        position: "relative",
        width: 14, height: 14, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          position: "absolute", inset: 0,
          borderRadius: 14,
          background: "var(--accent)",
          opacity: 0.35,
          animation: "rnRadar 1.8s ease-out infinite",
        }}/>
        <span style={{
          width: 8, height: 8, borderRadius: 8,
          background: "var(--accent)",
          boxShadow: "0 0 8px var(--accent)",
        }}/>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: "var(--accent)",
          letterSpacing: "0.16em", textTransform: "uppercase",
        }}>Feature drop</span>
        <span style={{
          fontSize: isMobile ? 13 : 14, fontWeight: 700,
          letterSpacing: "-0.015em",
          color: "var(--fg)",
          whiteSpace: "nowrap",
        }}>{sp.title}</span>
      </div>
      {onDismiss && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: 11,
            color: "var(--fg-subtle)",
            marginLeft: 2,
            cursor: "pointer",
          }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}

// ── Animated hero: stylized city map with identity-art pins ───
function SpotlightHero({ hero = "map", compact = false }) {
  // Stylized map: soft grid + glowing pins dropping in + a heatmap halo
  const pins = [
    { x: 22, y: 38, delay: 0.0,  c: "var(--accent)" },
    { x: 38, y: 26, delay: 0.18, c: "var(--signal)" },
    { x: 55, y: 44, delay: 0.36, c: "var(--success)" },
    { x: 70, y: 30, delay: 0.54, c: "var(--accent)" },
    { x: 78, y: 60, delay: 0.72, c: "var(--signal)" },
    { x: 30, y: 64, delay: 0.90, c: "var(--success)" },
    { x: 50, y: 72, delay: 1.08, c: "var(--accent)" },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 30% 40%, var(--surface-3), var(--surface-1) 70%)",
      overflow: "hidden",
    }}>
      {/* grid */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{
        position: "absolute", inset: 0,
        opacity: 0.4,
        animation: "rnDrift 6s ease-in-out infinite alternate",
      }}>
        <defs>
          <pattern id="rngrid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0H0V6" fill="none" stroke="var(--border-strong)" strokeWidth="0.2"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#rngrid)"/>
        {/* river */}
        <path d="M-5 70 Q 25 60 50 72 T 105 65" stroke="var(--signal)" strokeWidth="0.6" fill="none" opacity="0.4"/>
        {/* road veins */}
        <path d="M0 30 L100 35" stroke="var(--border-strong)" strokeWidth="0.4" fill="none"/>
        <path d="M40 0 L46 100" stroke="var(--border-strong)" strokeWidth="0.4" fill="none"/>
        <path d="M70 0 L75 100" stroke="var(--border-strong)" strokeWidth="0.4" fill="none"/>
      </svg>

      {/* density halo */}
      <div style={{
        position: "absolute",
        left: "42%", top: "44%",
        width: 200, height: 200,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
        opacity: 0.22,
        filter: "blur(8px)",
      }}/>

      {/* pins */}
      {pins.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          transform: "translate(-50%,-100%)",
          animation: `rnPinDrop 720ms ${p.delay}s cubic-bezier(.2,.8,.2,1) both`,
        }}>
          {/* radar ring on the freshest pin */}
          {i === pins.length - 1 && (
            <span style={{
              position: "absolute",
              left: "50%", top: "calc(100% - 4px)",
              width: 12, height: 12, marginLeft: -6, marginTop: -6,
              borderRadius: 12,
              background: p.c,
              opacity: 0.4,
              animation: "rnRadar 1.8s ease-out infinite",
            }}/>
          )}
          {/* pin shape */}
          <svg width={compact ? 18 : 22} height={compact ? 24 : 28} viewBox="0 0 22 28" style={{
            filter: `drop-shadow(0 0 6px ${p.c}) drop-shadow(0 4px 6px rgba(0,0,0,0.4))`,
          }}>
            <path d="M11 1 C 5 1 1 5 1 11 C 1 17 11 27 11 27 C 11 27 21 17 21 11 C 21 5 17 1 11 1 Z"
              fill="var(--bg-elevated)" stroke={p.c} strokeWidth="1.5"/>
            <circle cx="11" cy="11" r="3.5" fill={p.c}/>
          </svg>
        </div>
      ))}

      {/* coordinate eyebrow */}
      {!compact && (
        <div style={{
          position: "absolute", top: 14, left: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--fg-subtle)",
          letterSpacing: "0.16em", textTransform: "uppercase",
        }}>40.7°N · 74.0°W · 12 shows tonight</div>
      )}
    </div>
  );
}

// ── Carousel step indicator ───────────────────────────────────
function StepDots({ count, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} type="button" onClick={() => onSelect?.(i)} style={{
          all: "unset", cursor: "pointer",
          width: i === active ? 22 : 6, height: 6, borderRadius: 6,
          background: i === active ? "var(--signal)" : "var(--border-strong)",
          transition: "width 220ms ease",
        }}/>
      ))}
    </div>
  );
}

// ── Spotlight takeover modal ──────────────────────────────────
function SpotlightModal({ release, onClose, onCTA, variant = "desktop", HeroOverride }) {
  const sp = release?.spotlight;
  const [step, setStep] = React.useState(0);
  if (!sp) return null;
  const isMobile = variant === "mobile";
  const totalSteps = sp.steps.length;

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--scrim)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: isMobile ? 0 : 32,
      zIndex: 20,
    }}>
      <div style={{
        width: isMobile ? "100%" : 580,
        maxWidth: "100%",
        height: isMobile ? "100%" : "auto",
        maxHeight: isMobile ? "100%" : "90vh",
        background: "var(--bg-elevated)",
        borderRadius: isMobile ? 0 : 20,
        border: isMobile ? "none" : "1px solid var(--border-strong)",
        boxShadow: isMobile ? "none" : "0 32px 80px rgba(0,0,0,0.55)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, system-ui",
        color: "var(--fg)",
      }}>
        {/* hero */}
        <div style={{
          position: "relative",
          height: isMobile ? 280 : 300,
          background: "var(--surface-2)",
          flexShrink: 0,
        }}>
          <SpotlightHero hero={sp.hero}/>
          {HeroOverride && (
            <div style={{ position: "absolute", inset: 0 }}>
              <HeroOverride/>
            </div>
          )}
          {/* close */}
          <button type="button" onClick={onClose} aria-label="Close" style={{
            all: "unset", cursor: "pointer",
            position: "absolute", top: 14, right: 14,
            width: 32, height: 32, borderRadius: 16,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg)",
            backdropFilter: "blur(8px)",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {/* eyebrow over hero */}
          <div style={{
            position: "absolute", left: 22, bottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 6,
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
              animation: "rnPulse 1.4s ease-in-out infinite",
            }}/>
            <RNEyebrow color="var(--accent)" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              Feature drop · {release.version}
            </RNEyebrow>
          </div>
        </div>

        {/* body */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: isMobile ? "22px 22px 18px" : "26px 30px 22px",
        }}>
          <h2 style={{
            fontSize: isMobile ? 28 : 30, fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            margin: "0 0 6px",
            textWrap: "pretty",
          }}>{sp.title}</h2>
          <div style={{
            fontSize: 16, fontWeight: 500,
            color: "var(--fg-muted)",
            margin: "0 0 22px",
            lineHeight: 1.4,
            textWrap: "pretty",
          }}>{sp.tagline}</div>

          {/* walkthrough */}
          <div style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 18,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <RNEyebrow>How it works</RNEyebrow>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700,
                color: "var(--fg-subtle)",
                letterSpacing: "0.12em",
              }}>{String(step + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}</span>
            </div>
            <div key={step} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              padding: "10px 0 16px",
              animation: "rnFadeUp 360ms ease both",
            }}>
              <div style={{
                flexShrink: 0,
                width: 36, height: 36, borderRadius: 18,
                background: "var(--surface-3)",
                border: "1px solid var(--signal)",
                color: "var(--signal)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14, fontWeight: 800,
              }}>{step + 1}</div>
              <div style={{
                flex: 1,
                fontSize: 15, lineHeight: 1.45,
                color: "var(--fg)",
                letterSpacing: "-0.005em",
                textWrap: "pretty",
                paddingTop: 5,
              }}>{sp.steps[step].caption}</div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10,
            }}>
              <button type="button" onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                style={{
                  all: "unset", cursor: step === 0 ? "default" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 800,
                  color: step === 0 ? "var(--fg-subtle)" : "var(--fg-muted)",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  opacity: step === 0 ? 0.4 : 1,
                }}>← Back</button>
              <StepDots count={totalSteps} active={step} onSelect={setStep}/>
              <button type="button" onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
                disabled={step === totalSteps - 1}
                style={{
                  all: "unset", cursor: step === totalSteps - 1 ? "default" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 800,
                  color: step === totalSteps - 1 ? "var(--fg-subtle)" : "var(--signal)",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  opacity: step === totalSteps - 1 ? 0.4 : 1,
                }}>Next →</button>
            </div>
          </div>

          {/* note from Hugh — voice-y aside, not founder-speak */}
          {sp.founderNote && (
            <div style={{
              padding: "14px 16px",
              borderLeft: "2px solid var(--accent)",
              background: "var(--surface-1)",
              borderRadius: "0 10px 10px 0",
              marginBottom: 4,
            }}>
              <RNEyebrow color="var(--accent)" style={{ marginBottom: 6 }}>{sp.founderEyebrow || "Behind the build"}</RNEyebrow>
              <div style={{
                fontSize: 14, lineHeight: 1.5,
                color: "var(--fg)",
                letterSpacing: "-0.005em",
                textWrap: "pretty",
              }}>{sp.founderNote}</div>
              <div style={{
                marginTop: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 800,
                color: "var(--fg-muted)",
                letterSpacing: "0.14em", textTransform: "uppercase",
              }}>{sp.founderSign || "— Hugh"}</div>
            </div>
          )}
        </div>

        {/* footer CTAs */}
        <div style={{
          padding: isMobile ? "14px 22px 22px" : "16px 30px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={{
            all: "unset", cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 800,
            color: "var(--fg-muted)",
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>Maybe later</button>
          <span style={{ flex: 1 }}/>
          {/* CTA — optional. Under-the-hood releases pass no ctaHref / cta. */}
          {sp.cta && sp.ctaHref ? (
            <button type="button" onClick={onCTA} style={{
              all: "unset", cursor: "pointer",
              background: "var(--signal)",
              color: "var(--fg-on-accent)",
              padding: "12px 20px",
              borderRadius: 999,
              fontWeight: 800, fontSize: 14,
              letterSpacing: "-0.01em",
              boxShadow: "0 6px 16px var(--overlay-press)",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              {sp.cta}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button type="button" onClick={onClose} style={{
              all: "unset", cursor: "pointer",
              background: "var(--signal)",
              color: "var(--fg-on-accent)",
              padding: "12px 20px",
              borderRadius: 999,
              fontWeight: 800, fontSize: 14,
              letterSpacing: "-0.01em",
              boxShadow: "0 6px 16px var(--overlay-press)",
            }}>Got it</button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ReleaseEntry, ReleasePage,
  UMStatusFooterRN, FeatureDropPill, SpotlightModal, SpotlightHero,
  RNKindTag, RNItem, RNEyebrow, RNSpotlightStrip,
});
