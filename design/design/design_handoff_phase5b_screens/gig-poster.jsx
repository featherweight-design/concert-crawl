// gig-poster.jsx — Simplified screen-printed gig posters for the Landing hero.
//
// REDESIGN (v2): The previous version had too many decorative elements
// competing with the artist name (star burst, halftone, misregistered text,
// "PRESENTS" stamps). Per design feedback, simplified to:
//   • Clean paper card, tilted slightly
//   • Small date label up top
//   • Big bold artist name (auto-fit, smart line breaks, up to 3 lines)
//   • Venue + supporting act below
//   • Small footer scrap with city
//
// Two layout variants are provided so we can A/B in Tweaks:
//   • "block"    — full-bleed bold sans across the card (wireframe match)
//   • "stripe"   — artist name on a colored stripe band
//
// Animation also overhauled: instead of "lift then snap", we now CROSSFADE
// continuously — the outgoing poster drifts up + fades, while the incoming
// poster fades up underneath at the same time. No discontinuity.

// ── Bold tri-tone screen-print palettes ─────────────────────────
// Each poster uses three saturated inks: a flat color "field" (background),
// a contrasting "ink" for type. The halo color is computed automatically
// from the field's luminance — white halo on dark fields, black halo on
// light fields — so type stays legible wherever it overlaps the shape.
const POSTER_PALETTES = [
  { field: "#F25C24", ink: "#0E0E0E" }, // orange + black
  { field: "#1453E5", ink: "#F5F1E4" }, // electric blue + cream
  { field: "#1FA875", ink: "#0A2820" }, // emerald + deep green
  { field: "#E5006E", ink: "#0E0E14" }, // magenta + black
  { field: "#FFC400", ink: "#0E0E0E" }, // marigold + black
  { field: "#0E1F3D", ink: "#FF6A00" }, // navy + orange
  { field: "#7A2EE0", ink: "#F4EFE2" }, // violet + cream
  { field: "#0E5C46", ink: "#F2D43B" }, // forest + chartreuse
];

// Compute halo color from the field hex — pure black or pure white,
// whichever has more contrast against the background.
function haloColor(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceptual luminance (Rec. 709 weights).
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.5 ? "#000000" : "#FFFFFF";
}

function pickPalette(seed) {
  const h = String(seed).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return POSTER_PALETTES[h % POSTER_PALETTES.length];
}

// ── Smart line-breaking ─────────────────────────────────────────
// Given an artist name and a target width/font-context, decide how to break
// it into lines. Rules:
//   • 1 word → 1 line
//   • 2 words → split into 2 lines if either word is "long" (>5ch) OR the
//     joined string is >9 chars; otherwise keep on 1 line
//   • 3+ words → up to 3 lines, balanced. Never split a word.
//   • Connector words (THE, AND, OF, &) try to attach to the next word.
function smartLineBreak(name, maxLines = 3) {
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

  // 3+ words: try grouping. Connectors stick to the FOLLOWING word.
  // Build groups by attaching connectors forward.
  const groups = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i].toUpperCase();
    if (connectors.has(w) && i < words.length - 1) {
      groups.push(`${words[i]} ${words[i + 1]}`);
      i += 2;
    } else {
      groups.push(words[i]);
      i += 1;
    }
  }

  // If groups already fits in maxLines, return as-is.
  if (groups.length <= maxLines) return groups;

  // Otherwise, keep merging shortest adjacent pair until <= maxLines.
  while (groups.length > maxLines) {
    let bestI = 0, bestLen = Infinity;
    for (let i = 0; i < groups.length - 1; i++) {
      const len = groups[i].length + groups[i + 1].length + 1;
      if (len < bestLen) { bestLen = len; bestI = i; }
    }
    groups.splice(bestI, 2, `${groups[bestI]} ${groups[bestI + 1]}`);
  }
  return groups;
}

// ── Auto-fit font size: pick the largest size where the longest line
// still fits the card width.  Ballpark: char-width ≈ 0.55 * fontSize for
// our heavy sans cap.
function autoFitFontSize(lines, innerWidth, max = 88, min = 28) {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (!longest) return min;
  // Approximate char width for Inter Black at uppercase: 0.58em (slightly
  // generous to absorb tight letterspacing + tracking variance).
  const fitted = (innerWidth / longest) / 0.58;
  return Math.max(min, Math.min(max, Math.floor(fitted)));
}

// ── Date pretty-print ───────────────────────────────────────────
function formatDate(date) {
  try {
    const d = new Date(date + "T12:00:00");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    return {
      pretty: `${months[d.getMonth()]} ${d.getDate()}`,
      dow: days[d.getDay()],
    };
  } catch (e) {
    return { pretty: date, dow: "" };
  }
}

// ── A single poster card ─────────────────────────────────────────
// Bold dual-tone screen print: solid `field` background, `ink` type,
// with a single iconic shape (oversized blob/circle) bleeding off one
// edge. References: Dr. Teeth (orange/black blob), Death Cab (blue/gray
// blocks), moe. (green monster on teal). Two heavy ink colors, no fades.
function GigPoster({ show, width = 320, height = 460, palette, variant = "block" }) {
  const pal = palette || pickPalette(show.artist);
  // Halo contrasts with the ink (text), not the field — so light text
  // gets a dark halo and dark text gets a light halo, regardless of
  // what color the type happens to cross underneath.
  const halo = haloColor(pal.ink);
  const { pretty: prettyDate, dow } = formatDate(show.date);
  const venue = show.venue || "";

  // Inner padding for type
  const padX = Math.round(width * 0.07);
  const innerW = width - padX * 2;

  const lines = smartLineBreak(show.artist || "", 3);
  // Reserve the right ~40% of the card for the iconic shape — fit the
  // artist type into the left ~60% so the two never collide.
  const typeMaxW = Math.round(width * 0.60) - padX;
  const fontSize = autoFitFontSize(lines, typeMaxW, Math.round(width * 0.24), 24);

  // Pick a shape variant deterministically from the artist name so the
  // same show always renders the same way.
  const shapeIdx = String(show.artist || "x").charCodeAt(0) % 4;

  return (
    <div style={{
      width, height, position: "relative",
      background: pal.field,
      boxShadow: `
        0 1px 0 rgba(0,0,0,0.08) inset,
        0 30px 60px -20px rgba(0,0,0,0.55),
        0 12px 24px -12px rgba(0,0,0,0.35)
      `,
      overflow: "hidden",
      border: `1px solid ${pal.ink}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Bold iconic shape — bleeds off one edge. SVG so it scales.
          Confined to the mid-band (y ~12%–80%) and offset to one side
          so it never collides with the date row at top, the venue row
          at bottom, or the dominant artist type in the middle. */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width} height={height}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        {shapeIdx === 0 && (
          // Big organic blob, RIGHT side, mid-band only.
          // Confined to y 14%–78% so it never touches date or venue rows.
          <path
            d={`M ${width * 0.55} ${height * 0.14}
               C ${width * 0.80} ${height * 0.16}, ${width * 1.05} ${height * 0.24}, ${width * 1.02} ${height * 0.40}
               C ${width * 0.98} ${height * 0.55}, ${width * 0.68} ${height * 0.50}, ${width * 0.65} ${height * 0.62}
               C ${width * 0.62} ${height * 0.74}, ${width * 0.92} ${height * 0.78}, ${width * 0.85} ${height * 0.62}
               C ${width * 0.78} ${height * 0.45}, ${width * 0.60} ${height * 0.40}, ${width * 0.55} ${height * 0.14} Z`}
            fill={pal.ink}
            opacity="0.95"
          />
        )}
        {shapeIdx === 1 && (
          // Stacked blocks — RIGHT side, mid-band only (y 18%–46%).
          // Pushed off the date row at top and away from venue/opener at bottom.
          <g fill={pal.ink} opacity="0.92">
            <rect x={width * 0.55} y={height * 0.18} width={width * 0.18} height={height * 0.05} />
            <rect x={width * 0.78} y={height * 0.18} width={width * 0.22} height={height * 0.05} />
            <rect x={width * 0.55} y={height * 0.26} width={width * 0.30} height={height * 0.05} />
            <rect x={width * 0.90} y={height * 0.26} width={width * 0.10} height={height * 0.05} />
            <rect x={width * 0.55} y={height * 0.34} width={width * 0.15} height={height * 0.05} />
            <rect x={width * 0.75} y={height * 0.34} width={width * 0.25} height={height * 0.05} />
            <rect x={width * 0.55} y={height * 0.42} width={width * 0.45} height={height * 0.05} />
          </g>
        )}
        {shapeIdx === 2 && (
          // Big circle, RIGHT side, mid-band only.
          // Centered at y 50% with radius 32% so its edges stay between y 18% and 82%.
          <circle
            cx={width * 0.92}
            cy={height * 0.50}
            r={width * 0.42}
            fill={pal.ink}
            opacity="0.95"
          />
        )}
        {shapeIdx === 3 && (
          // Diagonal slash band + dot — RIGHT side, mid-band only.
          // Slash band confined to y 18%–48%, dot at y 65% (well clear of venue row).
          <g fill={pal.ink} opacity="0.95">
            <path d={`M ${width * 0.50} ${height * 0.18}
                     L ${width * 1.02} ${height * 0.18}
                     L ${width * 1.02} ${height * 0.32}
                     L ${width * 0.50} ${height * 0.48} Z`} />
            <circle cx={width * 0.82} cy={height * 0.65} r={width * 0.14} />
          </g>
        )}
      </svg>

      {/* Top date row */}
      <div style={{
        position: "relative", zIndex: 1,
        flexShrink: 0,
        padding: `${Math.round(height * 0.045)}px ${padX}px 0`,
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: Math.max(10, Math.round(width * 0.034)),
        color: pal.ink, letterSpacing: "0.10em",
        textTransform: "lowercase", fontWeight: 600,
        textShadow: `
          -1px -1px 0 ${halo},
           1px -1px 0 ${halo},
          -1px  1px 0 ${halo},
           1px  1px 0 ${halo}
        `,
      }}>
        <span>{dow.toLowerCase()} · {prettyDate.toLowerCase()} · {show.time || ""}</span>
      </div>

      {/* Big artist block — visually dominant, left-anchored so the
          right-side shape has clear space. */}
      <div style={{
        position: "relative", zIndex: 1,
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: `0 ${padX}px`,
        marginTop: -Math.round(height * 0.04),
      }}>
        {lines.map((line, i) => (
          <span
            key={i}
            style={{
              display: "block",
              fontFamily: "'Inter', system-ui",
              fontWeight: 900,
              fontSize,
              lineHeight: 0.92,
              letterSpacing: "-0.045em",
              textTransform: "uppercase",
              color: pal.ink,
              wordBreak: "keep-all",
              maxWidth: typeMaxW,
              // Tri-tone contrast halo: a thin `pop` outline ensures the
              // type stays legible if it ever clips the shape (or the
              // shape's edge clips the text).
              textShadow: `
                -1px -1px 0 ${halo},
                 1px -1px 0 ${halo},
                -1px  1px 0 ${halo},
                 1px  1px 0 ${halo}
              `,
            }}
          >{line}</span>
        ))}
      </div>

      {/* Bottom support: venue + opener */}
      <div style={{
        position: "relative", zIndex: 1,
        flexShrink: 0,
        padding: `0 ${padX}px ${Math.round(height * 0.06)}px`,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {show.opener && (
          <span style={{
            fontFamily: "'Caveat', cursive, 'Inter', system-ui",
            fontWeight: 600,
            fontSize: Math.max(14, Math.round(width * 0.05)),
            color: pal.ink, opacity: 0.9,
            lineHeight: 1.0,
            textShadow: `
              -1px -1px 0 ${halo},
               1px -1px 0 ${halo},
              -1px  1px 0 ${halo},
               1px  1px 0 ${halo}
            `,
          }}>+ {show.opener}</span>
        )}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: Math.max(10, Math.round(width * 0.032)),
          color: pal.ink, letterSpacing: "0.06em",
          textTransform: "lowercase", fontWeight: 600,
          opacity: 0.85,
          textShadow: `
            -1px -1px 0 ${halo},
             1px -1px 0 ${halo},
            -1px  1px 0 ${halo},
             1px  1px 0 ${halo}
          `,
        }}>{venue.toLowerCase()}</span>
      </div>
    </div>
  );
}

// ── Stack of posters with continuous crossfade ──────────────────
// Three layers: top (current), mid (next, slightly behind/offset), bottom.
// On advance, top drifts up + fades while a NEW bottom slides in at the
// back of the stack. The mid promotes to top and bottom promotes to mid.
function GigPosterStack({
  shows = [],
  width = 320, height = 460,
  autoplay = true,
  intervalMs = 5500,
  paused = false,
  variant = "block",
}) {
  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState("rest"); // "rest" | "advancing"

  const advance = React.useCallback(() => {
    if (phase !== "rest") return;
    setPhase("advancing");
    // Mid-animation, swap the underlying index so on settle, layers re-rank.
    setTimeout(() => {
      setIdx(i => (i + 1) % shows.length);
      setPhase("rest");
    }, 900);
  }, [phase, shows.length]);

  React.useEffect(() => {
    if (!autoplay || paused || shows.length < 2) return;
    const t = setTimeout(advance, intervalMs);
    return () => clearTimeout(t);
  }, [autoplay, paused, advance, idx, intervalMs, shows.length]);

  if (shows.length === 0) return null;

  const order = [
    shows[idx % shows.length],
    shows[(idx + 1) % shows.length],
    shows[(idx + 2) % shows.length],
  ];
  const palettes = order.map(s => pickPalette(s.artist));

  // Three rest layers — top, mid, bottom — natural pile.
  const layers = [
    { x: 0,   y: 0,   r: -1.5, scale: 1     },  // top (current)
    { x: 14,  y: 10,  r: 3.5,  scale: 0.985 },  // mid (next)
    { x: -10, y: 20,  r: -5,   scale: 0.97  },  // bottom (after-next)
  ];

  // Stage padding to accommodate offsets + lift travel.
  const padX = Math.max(28, Math.round(width * 0.10));
  const padY = Math.max(36, Math.round(height * 0.10));
  const stageW = width + padX * 2;
  const stageH = height + padY * 2;

  return (
    <div
      style={{
        width: stageW, height: stageH,
        position: "relative",
        perspective: 1400,
      }}
      onClick={advance}
      role="button"
      aria-label="Next poster"
    >
      {layers.map((layer, i) => {
        const isTop = i === 0;
        const isMid = i === 1;
        const isBottom = i === 2;
        const show = order[i];
        const pal = palettes[i];

        let transform, opacity;
        if (phase === "advancing") {
          if (isTop) {
            // Top drifts up + slightly left + rotates further; fades out.
            transform = `translate(${layer.x - 24}px, ${layer.y - 110}px) rotate(${layer.r - 12}deg) scale(${layer.scale * 1.04})`;
            opacity = 0;
          } else if (isMid) {
            // Mid moves toward top resting position.
            transform = `translate(${layers[0].x}px, ${layers[0].y}px) rotate(${layers[0].r}deg) scale(${layers[0].scale})`;
            opacity = 1;
          } else {
            // Bottom moves toward mid resting position.
            transform = `translate(${layers[1].x}px, ${layers[1].y}px) rotate(${layers[1].r}deg) scale(${layers[1].scale})`;
            opacity = 1;
          }
        } else {
          transform = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.r}deg) scale(${layer.scale})`;
          opacity = 1;
        }

        return (
          <div
            key={`${idx}-${i}`}
            style={{
              position: "absolute",
              left: padX, top: padY,
              zIndex: 10 - i,
              transform,
              transformOrigin: "30% 100%",
              transition: phase === "advancing"
                ? "transform 0.85s cubic-bezier(0.32, 0.72, 0.28, 1), opacity 0.7s ease-out"
                : "transform 0.4s ease-out, opacity 0.4s ease-out",
              opacity,
              cursor: "pointer",
              willChange: "transform, opacity",
              filter: isBottom ? "brightness(0.94)" : isMid ? "brightness(0.97)" : "none",
            }}
          >
            <GigPoster show={show} width={width} height={height} palette={pal} variant={variant} />
          </div>
        );
      })}

      {/* Hint dots */}
      {shows.length > 1 && (
        <div style={{
          position: "absolute",
          left: "50%", bottom: 0,
          transform: "translateX(-50%)",
          display: "flex", gap: 6,
          zIndex: 20,
        }}>
          {shows.map((_, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (i === idx % shows.length || phase !== "rest") return;
                setIdx(i);
              }}
              style={{
                width: i === idx % shows.length ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx % shows.length ? "var(--fg, #fff)" : "rgba(255,255,255,0.30)",
                cursor: "pointer",
                transition: "width 0.3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

window.GigPoster = GigPoster;
window.GigPosterStack = GigPosterStack;
window.POSTER_PALETTES = POSTER_PALETTES;
window.smartLineBreak = smartLineBreak;
