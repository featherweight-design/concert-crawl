// identity-art.jsx — Concert Crawl, Phase 7.5
// Deterministic generative identity imagery for artists + venues.
//
// Engine: hashName(name, namespace) → 32-bit FNV-1a → drives template +
// palette + rotation + per-template variation. Same input → same image.
//
// Aesthetic: risograph / silkscreen gig-poster. Bold limited palettes,
// mis-registered overprint, halftones, off-white papers.
//
// Templates (5):
//   mesh        (shared)  — riso overprint blobs
//   stripes     (shared)  — silkscreen stripes w/ mis-registration
//   concentric  (shared)  — record-groove arcs from off-center
//   halftone    (artist)  — gig-poster halftone field over a mass
//   blueprint   (venue)   — architectural plan-view grid + footprint
//
// Public API:
//   <IdentityArt name kind="artist|venue" scale="hero|tile|micro"
//                showInitials grain={0..1}
//                templateOverride paletteOverride rotateOverride />
//
//   identityFor(name, kind) → resolved {template, palette, rotate, hash}
//   IA_TEMPLATES, IA_PALETTES — registries (for galleries, swatches)
//
// Two seed namespaces ("artist", "venue") so an artist and venue with the
// same name don't collide.
//
// All output is SVG inside a fixed 400×400 viewBox; scale via width/height.

// ── Hash ───────────────────────────────────────────────────────
function ia_hashName(name, namespace) {
  let h = 0x811c9dc5 >>> 0;
  const s = (namespace || "x") + ":" + (name || "");
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function ia_rngFromHash(hash) {
  let state = (hash || 1) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}
function ia_pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

// Perceived luminance from #rrggbb. Drives blend-mode + initials contrast.
function ia_isDark(hex) {
  if (!hex) return false;
  const m = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}
// Blend mode that builds rather than crushes ink: multiply on light paper,
// screen on dark paper. (Multiply on dark paper turns inks toward black —
// the reason p2/p4/p5/p6 read as black squares before this fix.)
function ia_blend(palette) { return ia_isDark(palette.bg) ? "screen" : "multiply"; }

// ── Palettes (riso-inspired; hold across all 3 themes) ─────────
// Each palette: bg paper color, primary ink, secondary ink, on-bg text ink.
// Mix of light papers and dark papers — gives gallery rhythm.
const IA_PALETTES = [
  { id: "p0", name: "fuchsia + cobalt",   bg: "#F1E6D5", primary: "#FF3B95", secondary: "#1F3D8A", ink: "#191418" },
  { id: "p1", name: "tangerine + teal",   bg: "#F0E5D0", primary: "#FF6A24", secondary: "#0F8585", ink: "#191418" },
  { id: "p2", name: "saffron + crimson",  bg: "#15131A", primary: "#FFC53A", secondary: "#E5394F", ink: "#F1E6D5" },
  { id: "p3", name: "mint + plum",        bg: "#F2EEDF", primary: "#5BBE96", secondary: "#5A2D60", ink: "#191418" },
  { id: "p4", name: "ember + aqua",       bg: "#10131A", primary: "#FF5566", secondary: "#5DD4D6", ink: "#F1E6D5" },
  { id: "p5", name: "gold + marine",      bg: "#0E1A2C", primary: "#E8B042", secondary: "#5C84D6", ink: "#F1E6D5" },
  { id: "p6", name: "violet + lime",      bg: "#1A1226", primary: "#A075FF", secondary: "#C9F26E", ink: "#F1E6D5" },
  { id: "p7", name: "cobalt + coral",     bg: "#ECE6D2", primary: "#3A4FBE", secondary: "#FF7E5A", ink: "#191418" },
];

// ── Initials ───────────────────────────────────────────────────
function ia_getInitials(name, max = 2) {
  if (!name) return "??";
  const cleaned = String(name).replace(/[^A-Za-z0-9 &]/g, "").trim();
  if (!cleaned) return "??";
  const stop = /^(the|and|of|for|a|an|&|to|in|on|at)$/i;
  const words = cleaned.split(/\s+/).filter(w => w && !stop.test(w));
  if (words.length === 0) return cleaned.slice(0, max).toUpperCase();
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ── Templates ──────────────────────────────────────────────────
// Each template's render(args) returns an SVG <g>…</g> JSX subtree drawn
// inside a 0..400 box. Args: { rng, hash, palette, scale, kind }.
// scale: 'hero' (full detail) | 'tile' (simplified) | 'micro' (very simple)

// Helper: filterUrl id unique per render (for halftone patterns etc.)
let __ia_uid = 0;
function ia_uid(prefix) { return `${prefix}-${(++__ia_uid).toString(36)}`; }

// — Template: MESH (riso overprint blobs) ——————————————————————
function tpl_mesh({ rng, palette, scale }) {
  const blobCount = scale === "hero" ? 5 : scale === "tile" ? 4 : 3;
  const blobs = [];
  for (let i = 0; i < blobCount; i++) {
    const cx = 60 + rng() * 280;
    const cy = 60 + rng() * 280;
    const r  = 100 + rng() * 160;
    const fill = i % 2 === 0 ? palette.primary : palette.secondary;
    blobs.push({ cx, cy, r, fill, k: i });
  }
  // No clip needed — parent svg clips the viewBox.
  const blend = ia_blend(palette);
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g style={{ mixBlendMode: blend }}>
        {blobs.map((b, i) => {
          const gid = `mesh-grad-${i}-${b.k}-${Math.round(b.cx)}-${Math.round(b.cy)}`;
          return (
            <g key={i}>
              <defs>
                <radialGradient id={gid} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor={b.fill} stopOpacity="0.95" />
                  <stop offset="60%"  stopColor={b.fill} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={b.fill} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${gid})`} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

// — Template: STRIPES (silkscreen, mis-registered) —————————————
function tpl_stripes({ rng, palette, scale }) {
  const angle = ia_pick(rng, [0, 30, 45, 60, 90, 120, 135]);
  const stripeCount = scale === "hero" ? 8 : scale === "tile" ? 6 : 4;
  const w = 400 / stripeCount;
  const offsetX = 6, offsetY = 4; // mis-registration
  const widthMul = 0.55 + rng() * 0.25; // 0.55..0.8 of a stripe is filled
  const stripes = [];
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) stripes.push({ x: i * w, w: w * widthMul });
  }
  const blend = ia_blend(palette);
  // Cover the rotated area generously
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform={`rotate(${angle} 200 200)`}>
        {/* secondary, offset */}
        <g transform={`translate(${offsetX} ${offsetY})`} style={{ mixBlendMode: blend }}>
          {stripes.map((s, i) => (
            <rect key={`s2-${i}`} x={s.x - 80} y="-80" width={s.w} height="560" fill={palette.secondary} />
          ))}
        </g>
        {/* primary, on top */}
        <g style={{ mixBlendMode: blend }}>
          {stripes.map((s, i) => (
            <rect key={`s1-${i}`} x={s.x - 80} y="-80" width={s.w} height="560" fill={palette.primary} />
          ))}
        </g>
      </g>
    </g>
  );
}

// — Template: CONCENTRIC (record grooves / sound waves) —————————
function tpl_concentric({ rng, palette, scale }) {
  const focal = ia_pick(rng, [
    { cx: 80, cy: 320 }, { cx: 320, cy: 80 },
    { cx: 80, cy: 80 },  { cx: 320, cy: 320 },
    { cx: 200, cy: 200 },
  ]);
  const ringCount = scale === "hero" ? 12 : scale === "tile" ? 8 : 5;
  const stride = 28 + rng() * 14;
  const baseStroke = scale === "hero" ? 6 : 9;
  const offsetX = 4, offsetY = 3;
  const rings = [];
  for (let i = 0; i < ringCount; i++) {
    const r = 30 + i * stride;
    rings.push({ r, sw: baseStroke + (i % 2 === 0 ? 0 : 2) });
  }
  const blend = ia_blend(palette);
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform={`translate(${offsetX} ${offsetY})`} style={{ mixBlendMode: blend }}>
        {rings.map((r, i) => (
          <circle key={`c2-${i}`} cx={focal.cx} cy={focal.cy} r={r.r}
            fill="none" stroke={palette.secondary} strokeWidth={r.sw} />
        ))}
      </g>
      <g style={{ mixBlendMode: blend }}>
        {rings.map((r, i) => (
          <circle key={`c1-${i}`} cx={focal.cx} cy={focal.cy} r={r.r}
            fill="none" stroke={palette.primary} strokeWidth={r.sw} />
        ))}
      </g>
    </g>
  );
}

// — Template: HALFTONE (gig-poster, artist-leaning) ———————————————
function tpl_halftone({ rng, palette, scale }) {
  // A primary mass shape, with a halftone-dot field of secondary on top.
  // Mass is a big circle/half-disc anchored to one of 4 corners, rotated.
  const cornerIdx = Math.floor(rng() * 4);
  const corners = [
    { cx: 0, cy: 400 },   // bottom-left
    { cx: 400, cy: 400 }, // bottom-right
    { cx: 0, cy: 0 },     // top-left
    { cx: 400, cy: 0 },   // top-right
  ];
  const c = corners[cornerIdx];
  const massR = 320 + rng() * 80;
  // Cell size is per-SCALE because the dot count is (400/cell)² — 16 gives a
  // hero 625 dots, which is right for a full-bleed image and absurd for a 44px
  // row thumbnail. R1's tile/micro values (22/32) still emitted 331/156 circles
  // per thumbnail; at ~100 rows on a page that was the single largest source of
  // SVG nodes in the Crews canvas. Coarser cells are visually identical at
  // those sizes.
  const cellSize = scale === "hero" ? 16 : scale === "tile" ? 40 : 64;
  const cells = Math.ceil(400 / cellSize);
  const dots = [];
  for (let yi = 0; yi < cells; yi++) {
    for (let xi = 0; xi < cells; xi++) {
      const x = xi * cellSize + cellSize / 2;
      const y = yi * cellSize + cellSize / 2;
      // gradient-like radius — bigger toward opposite corner
      const dx = (x - c.cx) / 400;
      const dy = (y - c.cy) / 400;
      const d = Math.sqrt(dx * dx + dy * dy);
      const rNorm = Math.min(1, Math.max(0, d * 0.85)); // 0..1
      const r = rNorm * (cellSize * 0.48);
      if (r > 0.4) dots.push({ x, y, r });
    }
  }
  const blend = ia_blend(palette);
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      {/* Primary mass */}
      <g style={{ mixBlendMode: blend }}>
        <circle cx={c.cx} cy={c.cy} r={massR} fill={palette.primary} />
      </g>
      {/* Secondary halftone */}
      <g style={{ mixBlendMode: blend }}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={palette.secondary} />
        ))}
      </g>
    </g>
  );
}

// — Template: BLUEPRINT (architectural, venue-leaning) ———————————
function tpl_blueprint({ rng, palette, scale }) {
  // Plan-view: fine grid + a footprint rect + a circle (room/stage) +
  // a couple of dimension lines with ticks.
  const gridStep = scale === "hero" ? 20 : scale === "tile" ? 32 : 48;
  const lines = [];
  for (let v = gridStep; v < 400; v += gridStep) {
    lines.push({ x1: v, y1: 0, x2: v, y2: 400, sw: 0.6 });
    lines.push({ x1: 0, y1: v, x2: 400, y2: v, sw: 0.6 });
  }
  // Heavier grid every 5 steps
  for (let v = gridStep * 5; v < 400; v += gridStep * 5) {
    lines.push({ x1: v, y1: 0, x2: v, y2: 400, sw: 1.2 });
    lines.push({ x1: 0, y1: v, x2: 400, y2: v, sw: 1.2 });
  }
  // Footprint
  const fpW = 180 + rng() * 100;
  const fpH = 140 + rng() * 90;
  const fpX = (400 - fpW) / 2 + (rng() - 0.5) * 40;
  const fpY = (400 - fpH) / 2 + (rng() - 0.5) * 40;
  // Stage circle (in lower portion of footprint)
  const stageR = Math.min(fpW, fpH) * (0.18 + rng() * 0.1);
  const stageCx = fpX + fpW * (0.4 + rng() * 0.2);
  const stageCy = fpY + fpH * (0.6 + rng() * 0.25);
  // Diagonal sweep line (sightlines / approach)
  const sweepAngle = ia_pick(rng, [-25, -15, 15, 25]);
  const isLightPaper = palette.bg.match(/^#[EF]/i);
  const gridStroke = isLightPaper ? "rgba(25,20,24,0.18)" : "rgba(241,230,213,0.18)";
  const heavyStroke = isLightPaper ? "rgba(25,20,24,0.32)" : "rgba(241,230,213,0.32)";
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      {/* Grid */}
      <g>
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={l.sw > 1 ? heavyStroke : gridStroke} strokeWidth={l.sw} />
        ))}
      </g>
      {/* Footprint */}
      <g style={{ mixBlendMode: ia_blend(palette) }}>
        <rect x={fpX} y={fpY} width={fpW} height={fpH}
          fill="none" stroke={palette.secondary} strokeWidth={scale === "hero" ? 4 : 5} />
        {/* Inner rule */}
        <rect x={fpX + 10} y={fpY + 10} width={fpW - 20} height={fpH - 20}
          fill="none" stroke={palette.secondary} strokeWidth={1.2} strokeDasharray="4 5" />
        {/* Stage circle */}
        <circle cx={stageCx} cy={stageCy} r={stageR}
          fill={palette.primary} fillOpacity="0.85" />
        <circle cx={stageCx} cy={stageCy} r={stageR}
          fill="none" stroke={palette.secondary} strokeWidth={2} />
        {/* Sightlines */}
        <g transform={`rotate(${sweepAngle} ${stageCx} ${stageCy})`}>
          <line x1={stageCx} y1={stageCy} x2={stageCx + 220} y2={stageCy}
            stroke={palette.primary} strokeWidth={1.5} strokeDasharray="2 4" />
        </g>
        {/* Dimension ticks along bottom */}
        {scale === "hero" && (
          <g>
            <line x1={fpX} y1={fpY + fpH + 16} x2={fpX + fpW} y2={fpY + fpH + 16}
              stroke={palette.secondary} strokeWidth={1.2} />
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <line key={i}
                x1={fpX + fpW * t} y1={fpY + fpH + 12}
                x2={fpX + fpW * t} y2={fpY + fpH + 20}
                stroke={palette.secondary} strokeWidth={1.2} />
            ))}
          </g>
        )}
      </g>
    </g>
  );
}

const IA_TEMPLATES = [
  { id: "mesh",       label: "Mesh",       render: tpl_mesh,       kinds: ["artist", "venue"] },
  { id: "stripes",    label: "Stripes",    render: tpl_stripes,    kinds: ["artist", "venue"] },
  { id: "concentric", label: "Concentric", render: tpl_concentric, kinds: ["artist", "venue"] },
  { id: "halftone",   label: "Halftone",   render: tpl_halftone,   kinds: ["artist"] },
  { id: "blueprint",  label: "Blueprint",  render: tpl_blueprint,  kinds: ["venue"] },
];

// Templates available for a given kind
function ia_templatesFor(kind) {
  return IA_TEMPLATES.filter(t => t.kinds.includes(kind));
}

// ── Resolve identity (deterministic) ───────────────────────────
function identityFor(name, kind, opts = {}) {
  const ns = kind === "venue" ? "venue" : "artist";
  const hash = ia_hashName(name, ns);
  const tplPool = ia_templatesFor(kind);
  const tplIdx = (hash >>> 0) % tplPool.length;
  const palIdx = (hash >>> 8) % IA_PALETTES.length;
  const rotate = [(hash >>> 16) & 3, ((hash >>> 18) & 1)]; // [0..3]*90, mirror
  const template = opts.templateOverride
    ? (IA_TEMPLATES.find(t => t.id === opts.templateOverride) || tplPool[tplIdx])
    : tplPool[tplIdx];
  const palette = opts.paletteOverride
    ? (IA_PALETTES.find(p => p.id === opts.paletteOverride) || IA_PALETTES[palIdx])
    : IA_PALETTES[palIdx];
  return { hash, template, palette, rotate, kind };
}

// ── Grain overlay (CSS-only; cheap; tweakable) ──────────────────
function ia_grainBg(strength = 0.12) {
  // SVG turbulence as a data-uri
  const t = Math.max(0, Math.min(1, strength));
  if (t <= 0.001) return "none";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${t} 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// ── <IdentityArt /> ─────────────────────────────────────────────
function IdentityArt({
  name,
  kind = "artist",
  scale = "hero",                 // 'hero' | 'tile' | 'micro'
  width,                          // CSS px (defaults 100% of parent)
  height,                         // CSS px
  showInitials,                   // overlay initials. default: hero only
  grain = 0.10,                   // 0..1 grain intensity
  templateOverride,
  paletteOverride,
  rotateOverride,                 // 0|1|2|3 for 90deg increments
  className,
  style,
}) {
  const id = identityFor(name, kind, { templateOverride, paletteOverride });
  const rot = (rotateOverride != null ? rotateOverride : id.rotate[0]) % 4;
  const rng = ia_rngFromHash(id.hash);
  const tpl = id.template.render({ rng, hash: id.hash, palette: id.palette, scale, kind });
  const initialsOn = showInitials != null ? showInitials : scale === "hero";
  const initials = ia_getInitials(name);
  // Initials shown as a chunky stamp in a corner — doesn't fight the art
  const grainUrl = ia_grainBg(grain);
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: width != null ? width : "100%",
        height: height != null ? height : "100%",
        overflow: "hidden",
        background: id.palette.bg,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        style={{ display: "block" }}
      >
        <g transform={`rotate(${rot * 90} 200 200)`}>{tpl}</g>
      </svg>

      {/* Grain — CSS layer above the SVG */}
      {grain > 0.001 && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: grainUrl, mixBlendMode: "multiply",
          opacity: id.palette.bg.match(/^#[EF]/i) ? 0.85 : 0.55,
        }} />
      )}

      {/* Initials stamp — chip backplate guarantees contrast over busy art */}
      {initialsOn && (() => {
        const dark = ia_isDark(id.palette.bg);
        const chipBg = dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)";
        const chipFg = dark ? "#FFFFFF" : "#15131A";
        const heroFs = scale === "hero" ? 44 : 22;
        return (
          <div style={{
            position: "absolute",
            left: 12, bottom: 12,
            padding: scale === "hero" ? "6px 12px" : "3px 8px",
            borderRadius: scale === "hero" ? 10 : 6,
            background: chipBg,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            fontSize: heroFs,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: chipFg,
            pointerEvents: "none",
          }}>{initials}</div>
        );
      })()}

      {/* Subtle vignette so foreground UI (back btn, scrim) reads */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)",
      }} />
    </div>
  );
}

// ── Exports ────────────────────────────────────────────────────
Object.assign(window, {
  ia_hashName, ia_getInitials, ia_templatesFor, ia_isDark,
  IA_PALETTES, IA_TEMPLATES,
  identityFor, IdentityArt,
});
