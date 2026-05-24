// landing-poster.jsx — Concert Crawl, redesigned landing-page animated poster.
//
// Replaces the bright tri-tone screen-print blobs in gig-poster.jsx with a
// compact PosterCard built from the same DNA as the production sharable
// poster (design_handoff_shareable_cards/share-cards.jsx → PosterCard):
//
//   • Full-bleed IdentityArt (Phase 7.5 engine) as the top half
//   • Palette-aware paper scrim across the bottom half
//   • Heavy uppercase artist title with mis-registered ink-ghost
//   • Venue · city subtitle
//   • State pill (TONIGHT / GOING / SOLD OUT / PRICE DROP) — stamped top-right
//   • Mono eyebrow (city + date) top-left
//   • Compact mono date · time row above the title
//
// Drops vs. PosterCard (intentional, per landing scope):
//   • No snark line — too narrative for an animated thumbnail
//   • No "ConcertCrawl" wordmark footer — the page chrome above carries the
//     wordmark; the poster doesn't need to brand itself
//
// Sized PROPORTIONALLY so the same component renders cleanly from a 200×355
// ticker tile up to a 420×747 desktop hero card. All padding / type sizes
// derive from `width`.
//
// 9:16 (story ratio) — matches the shipped sharable poster, so the landing
// animation looks like the thing fans will actually screenshot and post.

// ── Smart line-breaking (lifted from gig-poster.jsx — works well) ──
function lpSmartBreak(name, maxLines = 3) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length === 1) return [words[0]];
  const connectors = new Set(["THE", "AND", "OF", "A", "AN", "&", "FT", "FT.", "FEAT", "FEAT."]);
  if (words.length === 2) {
    const joined = words.join(" ");
    const longest = Math.max(words[0].length, words[1].length);
    if (joined.length <= 9 && longest <= 6) return [joined];
    return [words[0], words[1]];
  }
  const groups = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i].toUpperCase();
    if (connectors.has(w) && i < words.length - 1) {
      groups.push(`${words[i]} ${words[i + 1]}`);
      i += 2;
    } else { groups.push(words[i]); i += 1; }
  }
  if (groups.length <= maxLines) return groups;
  while (groups.length > maxLines) {
    let bestI = 0, bestLen = Infinity;
    for (let j = 0; j < groups.length - 1; j++) {
      const len = groups[j].length + groups[j + 1].length + 1;
      if (len < bestLen) { bestLen = len; bestI = j; }
    }
    groups.splice(bestI, 2, `${groups[bestI]} ${groups[bestI + 1]}`);
  }
  return groups;
}

function lpAutoFit(lines, innerWidth, max, min) {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (!longest) return min;
  // Empirical: Inter Black uppercase at our letter-spacing renders at ~0.60em
  // per character. We also leave a 4% safety margin (multiply innerWidth by
  // 0.96) so a font-loading swap doesn't truncate "MANNEQUIN" or "WEDNESDAY".
  const fitted = (innerWidth * 0.96 / longest) / 0.60;
  return Math.max(min, Math.min(max, Math.floor(fitted)));
}

// ── Helper: rgba paper for the scrim gradient ─────────────────────
function lpPaperRgb(hex, a) {
  const m = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── State pill ────────────────────────────────────────────────────
// Tone "hot" (TONIGHT) is a high-energy pill — paper inverted; the pill
// is the loudest thing on the card, on purpose. Other tones sit on the
// ink color (so they read like a stamp).
function LPStatePill({ state, ink, paper, dark, w }) {
  const meta = (window.LP_STATE_PILLS || {})[state];
  if (!meta) return null;
  const isHot = meta.tone === "hot";
  // Hot pill: signal-strong colors that pop against ANY palette (using a
  // ribbon of paper + ink with a tiny pulse dot). For non-hot, render in
  // ink (so it reads as an embossed stamp on the bottom paper).
  const px = Math.round(w * 0.035);
  const py = Math.round(w * 0.018);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: Math.round(w * 0.018),
      padding: `${py}px ${px}px`,
      background: isHot ? ink : "transparent",
      color: isHot ? paper : ink,
      border: isHot ? "none" : `${Math.max(1, Math.round(w * 0.005))}px solid ${ink}`,
      borderRadius: 999,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 800,
      fontSize: Math.max(8, Math.round(w * 0.033)),
      letterSpacing: "0.14em",
      lineHeight: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: Math.max(4, Math.round(w * 0.018)),
        height: Math.max(4, Math.round(w * 0.018)),
        borderRadius: 999,
        background: isHot ? paper : ink,
        animation: isHot ? "lpPulse 1.4s ease-in-out infinite" : "none",
      }} />
      {meta.label}
    </span>
  );
}

// ── The poster itself ─────────────────────────────────────────────
function LandingPoster({ show, width = 320, height, grain = 0.10 }) {
  // PORTRAIT CARD (~5:7) — matches the aspect of the original landing
  // posters. We intentionally do NOT use the 9:16 ratio of the shipped
  // sharable poster here: the animation lives in a small hero slot where
  // a tall narrow card cuts off long band names. The shipped share card
  // is still 9:16 — it lives in its own context (story / IG share).
  const w = width;
  const h = height || Math.round(width * 1.38);

  // Resolve identity art palette for THIS artist — drives the whole color
  // story of the card.
  const id = window.identityFor(show.artist, "artist");
  const pal = id.palette;
  const dark = window.ia_isDark(pal.bg);
  const ink   = pal.ink;
  const paper = pal.bg;
  const ghost = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  // Layout proportions
  const padX = Math.round(w * 0.075);
  const padY = Math.round(w * 0.075);
  const innerW = w - padX * 2;

  // Top half: identity art. Bottom half: paper scrim with type. Tuned for
  // the 5:7 portrait aspect — the scrim handover sits a little above the
  // visual midpoint so the title block always has solid paper underneath.
  const artBottom = Math.round(h * 0.44);  // scrim begins here

  // Title sizing — auto-fit to inner width, capped by aspect.
  const lines = lpSmartBreak(show.artist || "", 3);
  const titleMax = Math.round(w * 0.22);
  const titleMin = Math.max(16, Math.round(w * 0.085));
  const titleSize = lpAutoFit(lines, innerW, titleMax, titleMin);
  const titleLh = 0.86;

  const venueSize = Math.max(10, Math.round(w * 0.052));
  const eyebrowSize = Math.max(8, Math.round(w * 0.032));
  const dateRowSize = Math.max(9, Math.round(w * 0.038));

  // Paper scrim — from transparent above the type to fully opaque
  // underneath the title block. Tuned so the artist title always sits on
  // solid paper for legibility, no matter where the identity art ends.
  const scrimGradient = `linear-gradient(180deg,
    ${lpPaperRgb(paper, 0)} 0%,
    ${lpPaperRgb(paper, 0)} ${Math.round((artBottom - padY * 1.5) / h * 100)}%,
    ${lpPaperRgb(paper, 0.85)} ${Math.round(artBottom / h * 100)}%,
    ${lpPaperRgb(paper, 1)} ${Math.min(96, Math.round((artBottom + padY) / h * 100))}%,
    ${lpPaperRgb(paper, 1)} 100%)`;

  // Mis-registered title offset — bigger cards get a bigger ghost shadow.
  const ghostOffset = Math.max(2, Math.round(w * 0.012));

  return (
    <div style={{
      width: w, height: h,
      position: "relative", overflow: "hidden",
      background: paper,
      border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
      boxShadow: `
        0 ${Math.round(w * 0.10)}px ${Math.round(w * 0.18)}px -${Math.round(w * 0.08)}px rgba(0,0,0,0.45),
        0 ${Math.round(w * 0.04)}px ${Math.round(w * 0.08)}px -${Math.round(w * 0.04)}px rgba(0,0,0,0.30)
      `,
      color: ink,
      isolation: "isolate",
    }}>
      {/* Full-bleed identity art */}
      <div style={{
        position: "absolute", inset: 0,
      }}>
        <window.IdentityArt
          name={show.artist}
          kind="artist"
          scale="hero"
          showInitials={false}
          grain={grain}
          width={w}
          height={h}
        />
      </div>

      {/* Top chrome — eyebrow (left) + state pill (right) */}
      <div style={{
        position: "absolute", left: padX, right: padX, top: padY,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: padX, zIndex: 2,
      }}>
        {/* Eyebrow: city · date — sits on a tiny paper chip so it reads */}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: Math.round(w * 0.018),
          padding: `${Math.round(w * 0.014)}px ${Math.round(w * 0.028)}px`,
          background: lpPaperRgb(paper, 0.85),
          color: ink,
          borderRadius: 999,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize: eyebrowSize,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          lineHeight: 1,
          whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}>
          {(show.city || "").split(",")[0] || "Denver"}
        </span>
        <LPStatePill state={show.state} ink={ink} paper={paper} dark={dark} w={w} />
      </div>

      {/* Bottom paper scrim */}
      <div style={{
        position: "absolute", inset: 0, background: scrimGradient,
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Bottom block — date row, title, venue */}
      <div style={{
        position: "absolute", left: padX, right: padX, bottom: padY,
        display: "flex", flexDirection: "column",
        gap: Math.round(w * 0.025),
        zIndex: 2,
      }}>
        {/* Mono date row — sits above the title, hard-aligned left */}
        <div style={{
          display: "flex", alignItems: "baseline",
          gap: Math.round(w * 0.025),
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize: dateRowSize,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: ink,
          opacity: 0.88,
          lineHeight: 1,
        }}>
          <span>{show.dateShort}</span>
          <span style={{ opacity: 0.55 }}>·</span>
          <span>{show.showTime}</span>
        </div>

        {/* Artist title — mis-registered ghost behind the ink */}
        <div style={{ position: "relative" }}>
          {/* ghost */}
          <div style={{
            position: "absolute", left: ghostOffset, top: ghostOffset,
            pointerEvents: "none",
          }}>
            {lines.map((line, i) => (
              <span key={`g-${i}`} style={{
                display: "block",
                fontFamily: "Inter, system-ui",
                fontWeight: 900,
                fontSize: titleSize,
                lineHeight: titleLh,
                letterSpacing: "-0.045em",
                textTransform: "uppercase",
                color: ghost,
                wordBreak: "keep-all",
              }}>{line}</span>
            ))}
          </div>
          {/* ink */}
          <div style={{ position: "relative" }}>
            {lines.map((line, i) => (
              <span key={`k-${i}`} style={{
                display: "block",
                fontFamily: "Inter, system-ui",
                fontWeight: 900,
                fontSize: titleSize,
                lineHeight: titleLh,
                letterSpacing: "-0.045em",
                textTransform: "uppercase",
                color: ink,
                wordBreak: "keep-all",
              }}>{line}</span>
            ))}
          </div>
        </div>

        {/* Venue — single line, smaller, semibold */}
        <div style={{
          fontFamily: "Inter, system-ui",
          fontWeight: 700,
          fontSize: venueSize,
          letterSpacing: "-0.015em",
          color: ink,
          lineHeight: 1.15,
          opacity: 0.92,
          textWrap: "balance",
        }}>
          {show.venue}<span style={{ opacity: 0.55 }}> · {(show.city || "").split(",")[0]}</span>
        </div>

        {/* Opener (optional, small caveat) */}
        {show.opener && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            fontSize: Math.max(9, Math.round(w * 0.032)),
            letterSpacing: "0.06em",
            color: ink,
            opacity: 0.6,
            textTransform: "lowercase",
            lineHeight: 1,
            marginTop: Math.round(w * 0.005),
          }}>
            + {show.opener}
          </div>
        )}
      </div>

      {/* Pulse keyframes — local to the poster so they don't leak. */}
      <style>{`
        @keyframes lpPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

window.LandingPoster = LandingPoster;
window.lpSmartBreak = lpSmartBreak;
