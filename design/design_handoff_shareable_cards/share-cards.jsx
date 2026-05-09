// share-cards.jsx — three directions × three aspect ratios.
//
// All cards render in a fixed-pixel artboard, then scale via CSS transform when
// presented in the canvas. Production renders the same SVG/HTML at 1080px,
// 1080×1920, etc. and rasterizes server-side.
//
// Directions:
//   A · Stub    — clean ticket-stub, identity art hero, modular cards vocabulary
//   B · Poster  — full-bleed riso art, heavy display type overlay, snark
//   C · Receipt — mono boarding-pass / ledger, serial number, perforations
//
// Ratios:
//   story  9:16  (1080×1920)
//   square 1:1   (1080×1080)
//   link   1.91:1 (1200×628)

const SC_RATIOS = {
  story:  { w: 1080, h: 1920, label: "9:16 · Story" },
  square: { w: 1080, h: 1080, label: "1:1 · Feed"   },
  link:   { w: 1200, h: 628,  label: "1.91:1 · Link" },
};

// Card "scale factor" — the fixed-pixel design renders at 1× and the canvas
// shrinks it via transform: scale(). This keeps every card pixel-accurate.
function scProps(ratio) {
  const r = SC_RATIOS[ratio];
  return { width: r.w, height: r.h, ratio: r };
}

// ──────────────────────────────────────────────────────────────────────
// Shared atoms
// ──────────────────────────────────────────────────────────────────────

// Wordmark lockup. "concertcrawl." in display weight + slash + "share".
function ShareWordmark({ size = 24, color, opacity = 1, kind = "full" }) {
  const c = color || "var(--fg)";
  return (
    <span style={{
      fontFamily: "Inter, system-ui",
      fontWeight: 800,
      fontSize: size,
      letterSpacing: "-0.035em",
      color: c,
      opacity,
      whiteSpace: "nowrap",
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "baseline",
      gap: size * 0.18,
    }}>
      <span>concertcrawl.</span>
      {kind === "share" && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          fontSize: size * 0.55,
          opacity: 0.7,
          letterSpacing: "0.04em",
        }}>/share</span>
      )}
    </span>
  );
}

// QR placeholder — solid black square with "QR" centered. We don't render real
// QR; engineering will swap in `qrcode-svg` against the share URL.
function QRBlock({ size = 80, fg = "#0a0a0a", bg = "#ffffff", code }) {
  // Faux module pattern — deterministic, looks QR-ish at a glance
  const cells = 17;
  const c = String(code || "concertcrawl/e/abc");
  let h = 0;
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
  const seed = (i) => {
    h = (h ^ (i + 1)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
    return h & 1;
  };
  const m = size / cells;
  const dots = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Reserve corner finders
      const inFinder =
        (x < 5 && y < 5) || (x > cells - 6 && y < 5) || (x < 5 && y > cells - 6);
      if (inFinder) continue;
      if (seed(x * cells + y)) dots.push([x, y]);
    }
  }
  const finder = (x, y) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x * m} y={y * m} width={m * 5} height={m * 5} fill={fg} />
      <rect x={(x + 1) * m} y={(y + 1) * m} width={m * 3} height={m * 3} fill={bg} />
      <rect x={(x + 1.5) * m} y={(y + 1.5) * m} width={m * 2} height={m * 2} fill={fg} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill={bg} />
      {dots.map(([x, y], i) => (
        <rect key={i} x={x * m} y={y * m} width={m} height={m} fill={fg} />
      ))}
      {finder(0, 0)}
      {finder(cells - 5, 0)}
      {finder(0, cells - 5)}
    </svg>
  );
}

// Tiny mono kbd-like pill used for "GOING" / "SOLD OUT" / etc.
function StatePill({ label, kind = "going", scale = 1, color }) {
  const colors = {
    going:    { fg: "var(--fg-on-accent)", bg: "var(--accent)" },
    soldout:  { fg: "var(--fg-on-accent)", bg: "var(--warning)" },
    drop:     { fg: "var(--bg)",            bg: "var(--success)" },
    watching: { fg: "var(--fg-on-accent)",  bg: "var(--signal)"  },
    tonight:  { fg: "var(--bg)",            bg: "var(--success)" },
  };
  const c = color || colors[kind] || colors.going;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700,
      fontSize: 11 * scale,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: c.fg,
      background: c.bg,
      padding: `${4 * scale}px ${9 * scale}px`,
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      gap: 6 * scale,
      lineHeight: 1,
    }}>
      <span style={{
        width: 5 * scale, height: 5 * scale, borderRadius: 999,
        background: c.fg, opacity: 0.8,
      }}/>
      {label}
    </span>
  );
}

function stateLabel(state) {
  switch (state) {
    case "going":    return "I'm going";
    case "soldout":  return "Sold out";
    case "drop":     return "Price drop";
    case "watching": return "Watching";
    case "tonight":  return "Tonight";
    default:         return "Going";
  }
}

// ──────────────────────────────────────────────────────────────────────
// DIRECTION A — STUB (safe)
// Identity-art hero, info block below, ticket-stub edge perforation.
// ──────────────────────────────────────────────────────────────────────

function StubCard({ event, ratio = "story", mint, sharer, showMint = true, showQR = true }) {
  const { w, h } = SC_RATIOS[ratio];
  const isStory = ratio === "story";
  const isLink  = ratio === "link";
  const isSquare = ratio === "square";

  // For 1.91:1 link card — two-pane layout (art left, info right)
  if (isLink) {
    return (
      <div style={{
        width: w, height: h, position: "relative",
        background: "var(--bg)", color: "var(--fg)",
        display: "grid", gridTemplateColumns: "1fr 1.3fr", overflow: "hidden",
      }}>
        <div style={{ position: "relative" }}>
          <IdentityArt name={event.artist} kind="artist" scale="hero"
            width="100%" height="100%" showInitials={false} />
        </div>
        <div style={{
          padding: "56px 60px", display: "flex", flexDirection: "column",
          justifyContent: "space-between", gap: 24,
        }}>
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <StatePill kind={event.state} label={stateLabel(event.state)} scale={1.4} />
              {event.pricePill && (
                <StatePill kind="watching" label={event.pricePill} scale={1.4}
                  color={{ fg: "var(--bg)", bg: "var(--fg)" }} />
              )}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--fg-muted)", marginBottom: 14,
            }}>{event.date}  ·  {event.showTime}</div>
            <h1 style={{
              fontFamily: "Inter, system-ui", fontWeight: 800,
              fontSize: 64, lineHeight: 0.96, letterSpacing: "-0.04em",
              margin: 0, color: "var(--fg)",
            }}>{event.artist}</h1>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 600,
              fontSize: 26, lineHeight: 1.15, color: "var(--fg-muted)",
              marginTop: 14, letterSpacing: "-0.01em",
            }}>{event.venue}<span style={{ color: "var(--fg-subtle)" }}> · {event.city}</span></div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <ShareWordmark size={28} kind="share" />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              fontSize: 16, color: "var(--fg-muted)", letterSpacing: "0.04em",
            }}>{showMint && mint && mint.by ? mint.by : ""}</div>
          </div>
        </div>
      </div>
    );
  }

  // 9:16 / 1:1 — art on top (hero), info below, perforation between
  const heroRatio = isStory ? 0.55 : 0.5;
  const heroH = Math.round(h * heroRatio);
  return (
    <div style={{
      width: w, height: h, position: "relative",
      background: "var(--bg)", color: "var(--fg)", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "relative", width: "100%", height: heroH, flexShrink: 0 }}>
        <IdentityArt name={event.artist} kind="artist" scale="hero"
          width="100%" height="100%" showInitials={false} />
        {/* State pill stamped on hero */}
        <div style={{ position: "absolute", left: 48, top: 48 }}>
          <StatePill kind={event.state} label={stateLabel(event.state)} scale={2.4} />
        </div>
        {/* Date stamp on hero — corner */}
        <div style={{
          position: "absolute", right: 48, top: 48,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          fontSize: 22, letterSpacing: "0.06em", color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)", textAlign: "right",
        }}>{event.dateShort}<br/>
          <span style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
            {event.showTime}
          </span>
        </div>
      </div>

      {/* Perforation strip */}
      <div style={{
        position: "relative", height: 36, flexShrink: 0,
        background: "var(--bg)",
        borderTop: "2px dashed var(--border-strong)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          position: "absolute", left: -18, top: -18,
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--bg-elevated, var(--bg))",
          border: "1px solid var(--border)",
        }}/>
        <div style={{
          position: "absolute", right: -18, top: -18,
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--bg-elevated, var(--bg))",
          border: "1px solid var(--border)",
        }}/>
      </div>

      {/* Stub body */}
      <div style={{
        flex: 1, padding: isStory ? "56px 56px 48px" : "44px 48px 40px",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <h1 style={{
          fontFamily: "Inter, system-ui", fontWeight: 800,
          fontSize: isStory ? 96 : 72, lineHeight: 0.94,
          letterSpacing: "-0.045em", margin: 0,
          color: "var(--fg)", textWrap: "balance",
        }}>{event.artist}</h1>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 600,
          fontSize: isStory ? 32 : 26, lineHeight: 1.15,
          color: "var(--fg-muted)", letterSpacing: "-0.01em",
        }}>{event.venue}<span style={{ color: "var(--fg-subtle)" }}> · {event.city}</span></div>

        <div style={{ flex: 1 }}/>

        {/* Footer rule */}
        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 22,
          display: "grid", gridTemplateColumns: showQR && isStory ? "1fr auto" : "1fr",
          gap: 24, alignItems: "end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ShareWordmark size={isStory ? 32 : 26} kind="share" />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
              fontSize: 13, color: "var(--fg-subtle)", letterSpacing: "0.04em",
            }}>
              {showMint && mint && mint.by ? mint.by : ""}
            </div>
          </div>
          {showQR && isStory && (
            <QRBlock size={120} fg="var(--fg)" bg="var(--bg)" code={event.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// DIRECTION B — POSTER (interesting)
// Full-bleed identity art, heavy display type overlay, mis-registered.
// ──────────────────────────────────────────────────────────────────────

function PosterCard({ event, ratio = "story", mint, sharer, showMint = true }) {
  const { w, h } = SC_RATIOS[ratio];
  const isStory = ratio === "story";
  const isLink = ratio === "link";

  // Identity art uses the artist's palette — pull it
  const id = window.identityFor(event.artist, "artist");
  const dark = window.ia_isDark(id.palette.bg);
  const ink     = id.palette.ink;
  const paper   = id.palette.bg;
  const inkOffset = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  // Title sizing per ratio — tighter so the bottom block doesn't crowd
  const titleSize    = isStory ? 180 : isLink ? 110 : 158;
  const subtitleSize = isStory ? 42  : isLink ? 28  : 34;
  const snarkSize    = isStory ? 30  : isLink ? 20  : 26;
  const padding      = isStory ? 72  : isLink ? 52  : 58;

  // Anonymous = leave the signature off entirely.
  const showSig = showMint && mint && mint.by;

  // Bottom paper scrim only — top half of the card is full-bleed art.
  const r = parseInt(paper.slice(1, 3), 16);
  const g = parseInt(paper.slice(3, 5), 16);
  const b = parseInt(paper.slice(5, 7), 16);
  const paperRgb = (a) => `rgba(${r},${g},${b},${a})`;
  const scrimGradient = `linear-gradient(180deg,
    ${paperRgb(0)} 0%,
    ${paperRgb(0)} 38%,
    ${paperRgb(0.85)} 52%,
    ${paperRgb(1)} 62%,
    ${paperRgb(1)} 100%)`;

  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: paper,
    }}>
      {/* Full-bleed identity art */}
      <IdentityArt name={event.artist} kind="artist" scale="hero"
        width="100%" height="100%" showInitials={false}
        style={{ position: "absolute", inset: 0 }} />

      {/* No top scrim, no top chrome — the top half of the card is unobstructed
          art. State pill + date are pulled into the bottom block. */}

      {/* Bottom paper scrim — guarantees title + venue + snark + wordmark all read */}
      <div style={{ position: "absolute", inset: 0, background: scrimGradient, pointerEvents: "none" }}/>

      {/* Bottom block — metadata row, title, venue, snark, wordmark */}
      <div style={{
        position: "absolute", left: padding, right: padding,
        bottom: padding,
        display: "flex", flexDirection: "column",
        gap: isStory ? 28 : isLink ? 14 : 22,
      }}>
        {/* Metadata row — state pill (left) + date/time (right) */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 14,
            background: ink, color: paper,
            padding: isStory ? "14px 22px" : isLink ? "10px 18px" : "12px 20px",
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: isStory ? 22 : isLink ? 16 : 20,
            letterSpacing: "0.1em", textTransform: "uppercase",
            lineHeight: 1,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: paper, opacity: 0.65 }}/>
            {stateLabel(event.state)}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
            fontSize: isStory ? 44 : isLink ? 28 : 36,
            letterSpacing: "0.04em", color: ink, textAlign: "right",
            textTransform: "uppercase", lineHeight: 1.0,
          }}>{event.dateShort}
            <span style={{
              display: "block", marginTop: 4,
              fontSize: isStory ? 26 : isLink ? 16 : 22,
              opacity: 0.85, fontWeight: 700, letterSpacing: "0.04em",
            }}>{event.showTime}</span>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {/* mis-registration ghost */}
          <h1 style={{
            position: "absolute", left: isStory ? 8 : 5, top: isStory ? 6 : 4, margin: 0,
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: titleSize, lineHeight: 0.86,
            letterSpacing: "-0.06em", color: inkOffset,
            textTransform: "uppercase", pointerEvents: "none",
            textWrap: "balance",
          }}>{event.artist}</h1>
          <h1 style={{
            position: "relative", margin: 0,
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: titleSize, lineHeight: 0.86,
            letterSpacing: "-0.06em", color: ink,
            textTransform: "uppercase",
            textWrap: "balance",
          }}>{event.artist}</h1>
        </div>

        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700,
          fontSize: subtitleSize, lineHeight: 1.05,
          letterSpacing: "-0.015em", color: ink,
        }}>
          {event.venue} <span style={{ opacity: 0.6 }}>· {event.city}</span>
        </div>

        {!isLink && (
          <div style={{
            maxWidth: isStory ? 820 : 880,
            fontFamily: "Inter, system-ui", fontWeight: 500,
            fontSize: snarkSize, lineHeight: 1.3,
            color: ink, opacity: 0.78,
            fontStyle: "italic",
            textWrap: "pretty",
          }}>
            "{event.snark}"
          </div>
        )}

        {/* Footer — big "ConcertCrawl" wordmark + (optional) handle */}
        <div style={{
          marginTop: isStory ? 16 : 8,
          paddingTop: isStory ? 28 : 18,
          borderTop: `2px solid ${ink}`,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          gap: 24,
        }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: isStory ? 78 : isLink ? 42 : 60,
            letterSpacing: "-0.04em", color: ink, lineHeight: 1,
          }}>ConcertCrawl</div>
          {showSig && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              fontSize: isStory ? 36 : isLink ? 22 : 30, color: ink, opacity: 0.85,
              letterSpacing: "0.04em", textAlign: "right", lineHeight: 1,
            }}>{mint.by}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// DIRECTION C — RECEIPT (weird)
// JetBrains Mono boarding-pass / ledger. Serial number, perforations, dotted
// fields. Identity art compressed to a stamp.
// ──────────────────────────────────────────────────────────────────────

function ReceiptCard({ event, ratio = "story", mint, sharer, showMint = true }) {
  const { w, h } = SC_RATIOS[ratio];
  const isStory = ratio === "story";
  const isLink  = ratio === "link";
  const isSquare = ratio === "square";

  // Cream/paper background, regardless of theme — receipts are paper.
  const PAPER  = "#F5F1E6";
  const INK    = "#1A1815";
  const INK_FAINT = "rgba(26,24,21,0.55)";
  const INK_GHOST = "rgba(26,24,21,0.32)";
  const RULE   = "rgba(26,24,21,0.22)";

  // Field row — "LABEL .... value"
  const Field = ({ label, value, mono = true, big = false }) => (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 8,
      borderBottom: `1px dotted ${RULE}`,
      paddingBottom: big ? 10 : 6,
      paddingTop: big ? 14 : 10,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700, fontSize: big ? 14 : 12,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: INK_FAINT, flexShrink: 0, minWidth: big ? 130 : 110,
      }}>{label}</span>
      <span style={{
        flex: 1,
        fontFamily: mono ? "'JetBrains Mono', monospace" : "Inter, system-ui",
        fontWeight: 600,
        fontSize: big ? 28 : 18,
        color: INK,
        letterSpacing: mono ? "0.02em" : "-0.01em",
        textAlign: "right",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{value}</span>
    </div>
  );

  // Tiny identity-art chip used as the "stamp"
  const ArtStamp = ({ size }) => (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `1px solid ${INK}`, position: "relative", overflow: "hidden",
    }}>
      <IdentityArt name={event.artist} kind="artist" scale="micro"
        width="100%" height="100%" showInitials={false} grain={0.2} />
    </div>
  );

  // For link card: 2-column layout
  if (isLink) {
    return (
      <div style={{
        width: w, height: h, background: PAPER, color: INK,
        position: "relative", overflow: "hidden",
        display: "grid", gridTemplateColumns: "1.2fr 1fr",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ padding: "44px 50px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{
                fontSize: 11, letterSpacing: "0.18em", fontWeight: 700,
                textTransform: "uppercase", color: INK_FAINT,
              }}>concertcrawl. · receipt of attendance</div>
              <div style={{
                fontSize: 36, fontWeight: 700, marginTop: 6,
                fontFamily: "Inter, system-ui", letterSpacing: "-0.025em",
                lineHeight: 1.0,
              }}>{event.artist}</div>
            </div>
            <ArtStamp size={70} />
          </div>

          <div style={{ marginTop: 6 }}>
            <Field label="Venue"  value={event.venue} mono={false} />
            <Field label="City"   value={event.city} mono={false} />
            <Field label="Date"   value={event.dateLong} mono={false} />
            <Field label="Doors / Show" value={`${event.doors} / ${event.showTime}`} />
            <Field label="State"  value={stateLabel(event.state).toUpperCase()} />
          </div>
        </div>

        {/* Right stub — the "claim" half */}
        <div style={{
          padding: "44px 44px 40px",
          borderLeft: `2px dashed ${INK_GHOST}`,
          background: "rgba(26,24,21,0.03)",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase", color: INK_FAINT }}>
              Claim no.
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, marginTop: 4, lineHeight: 1, letterSpacing: "0.02em" }}>
              {showMint && mint ? `#${mint.serial}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
            <div style={{ fontSize: 12, color: INK_FAINT, letterSpacing: "0.06em" }}>
              {showMint && mint && mint.by ? <>minted<br/>{mint.mintedAtShort}<br/>by {mint.by}</> : null}
            </div>
            <QRBlock size={92} fg={INK} bg={PAPER} code={event.id} />
          </div>
        </div>
      </div>
    );
  }

  // 9:16 / 1:1 — full receipt
  const padX = isStory ? 72 : 56;
  const padY = isStory ? 80 : 56;
  return (
    <div style={{
      width: w, height: h, background: PAPER, color: INK,
      position: "relative", overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Perforated edges (top + bottom) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 24,
        backgroundImage: `radial-gradient(circle at 12px 12px, ${PAPER} 11px, transparent 12px)`,
        backgroundSize: "24px 24px", backgroundColor: "rgba(0,0,0,0)",
      }}/>
      <svg width="100%" height="20" viewBox={`0 0 ${w} 20`}
        style={{ position: "absolute", top: 22, left: 0, display: "block" }}>
        {Array.from({ length: Math.floor(w / 24) }).map((_, i) => (
          <circle key={i} cx={12 + i * 24} cy={10} r={6} fill={PAPER}
            stroke={RULE} strokeWidth="1"/>
        ))}
      </svg>

      <div style={{
        padding: `${padY + 10}px ${padX}px ${padY}px`,
        display: "flex", flexDirection: "column", height: "100%",
        boxSizing: "border-box",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          paddingBottom: 14, borderBottom: `2px solid ${INK}`,
        }}>
          <div>
            <div style={{
              fontSize: isStory ? 13 : 11, letterSpacing: "0.18em", fontWeight: 700,
              textTransform: "uppercase", color: INK_FAINT,
            }}>concertcrawl.</div>
            <div style={{
              fontSize: isStory ? 22 : 18, letterSpacing: "0.1em", fontWeight: 700,
              textTransform: "uppercase", marginTop: 4, color: INK,
            }}>Receipt of attendance</div>
          </div>
          <ArtStamp size={isStory ? 110 : 80} />
        </div>

        {/* Big artist + venue */}
        <div style={{
          marginTop: 28,
          fontFamily: "Inter, system-ui", fontWeight: 800,
          fontSize: isStory ? 110 : 78, lineHeight: 0.92,
          letterSpacing: "-0.045em", color: INK,
          textWrap: "balance",
        }}>{event.artist}</div>
        <div style={{
          marginTop: 14,
          fontFamily: "Inter, system-ui", fontWeight: 600,
          fontSize: isStory ? 32 : 24, lineHeight: 1.15,
          color: INK_FAINT, letterSpacing: "-0.01em",
        }}>{event.venue}, {event.city}</div>

        {/* Field block */}
        <div style={{ marginTop: isStory ? 50 : 32 }}>
          <Field label="Date"        value={event.dateLong} mono={false} big={isStory}/>
          <Field label="Doors / Show" value={`${event.doors} / ${event.showTime}`} big={isStory}/>
          <Field label="Venue ID"    value={event.id.slice(-12).toUpperCase()} big={isStory}/>
          <Field label="State"       value={stateLabel(event.state).toUpperCase()} big={isStory}/>
          {showMint && mint && mint.by && (
            <>
              <Field label="Minted" value={mint.mintedAtShort} big={isStory}/>
              <Field label="By"     value={mint.by} big={isStory}/>
            </>
          )}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Footer — claim no + QR */}
        <div style={{
          marginTop: 24, paddingTop: 18,
          borderTop: `2px solid ${INK}`,
          display: "grid",
          gridTemplateColumns: isStory ? "1fr auto" : "1fr auto",
          gap: 24, alignItems: "end",
        }}>
          <div>
            <div style={{
              fontSize: isStory ? 13 : 11, letterSpacing: "0.18em", fontWeight: 700,
              textTransform: "uppercase", color: INK_FAINT,
            }}>Claim no.</div>
            <div style={{
              fontSize: isStory ? 96 : 64, fontWeight: 700, marginTop: 4, lineHeight: 1,
              letterSpacing: "0.02em",
            }}>{showMint && mint ? `#${mint.serial}` : ""}</div>
            <div style={{
              fontSize: 13, color: INK_FAINT, marginTop: 8, letterSpacing: "0.06em",
            }}>concertcrawl</div>
          </div>
          <QRBlock size={isStory ? 160 : 110} fg={INK} bg={PAPER} code={event.id} />
        </div>
      </div>

      {/* Bottom perforation */}
      <svg width="100%" height="20"
        style={{ position: "absolute", bottom: 22, left: 0, display: "block" }}>
        {Array.from({ length: Math.floor(w / 24) }).map((_, i) => (
          <circle key={i} cx={12 + i * 24} cy={10} r={6} fill={PAPER}
            stroke={RULE} strokeWidth="1"/>
        ))}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Card switcher — uniform API
// ──────────────────────────────────────────────────────────────────────
function ShareCard({ direction = "stub", event, ratio = "story", mint, sharer, opts = {} }) {
  const Comp = direction === "poster"  ? PosterCard
            : direction === "receipt" ? ReceiptCard
            : StubCard;
  return <Comp event={event} ratio={ratio} mint={mint} sharer={sharer} {...opts} />;
}

window.SC_RATIOS = SC_RATIOS;
window.ShareCard = ShareCard;
window.StubCard = StubCard;
window.PosterCard = PosterCard;
window.ReceiptCard = ReceiptCard;
window.ShareWordmark = ShareWordmark;
window.QRBlock = QRBlock;
window.StatePill = StatePill;
window.stateLabel = stateLabel;
