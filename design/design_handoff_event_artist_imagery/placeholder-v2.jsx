// placeholder-v2.jsx — three RETUNES of the Phase 7.5 generated placeholder.
//
// The placeholder is permanent (30% of event surfaces, 55% of artist pages) and
// is not being designed away. What it currently carries — 8 saturated palettes,
// 5 templates, a radial-gradient blob field, a grain pass, a vignette and a
// monogram chip — was a stopgap's worth of variety competing with the row's real
// job. All three retunes below keep the same deterministic contract:
//
//     hash(namespace + name) → template · geometry · (palette)
//     same name, forever the same art.
//
// What they drop, in all three: the monogram chip (the surface label already
// carries the name — and per the brief a placeholder must not pretend to be a
// picture of anyone), the vignette, and the grain pass.
//
// Exports: PlaceholderV2, PV_OPTIONS, PV_NAMES

const PV_OPTIONS = [
  { id: "ink-series", label: "P1 · Ink series",
    blurb: "One ink pair, borrowed from whichever photo treatment wins. Two templates. All variance is geometry — angle, stride, focal corner, rotation — never colour, so a mixed list reads as one print run.",
    themeAware: false },
  { id: "theme-quiet", label: "P2 · Theme quiet",
    blurb: "Built from theme tokens instead of ink, at low contrast: a --surface ground, marks in --fg at 8–14%, one --signal accent. Recedes into the app on all nine themes and can never out-shout a photo beside it.",
    themeAware: true },
  { id: "muted-riso", label: "P3 · Muted riso",
    blurb: "Keeps the riso identity but cuts 8 palettes to 3 desaturated papers with a single ink each, and 5 templates to 3. The closest to what ships today — still recognisably generated art, an octave quieter.",
    themeAware: false },
];

// P1 — inks default to the venue/press pair; the canvas passes the live pick.
const PV_INK = { paper: "#EDE6D7", ink: "#1B2A4A", pop: "#F0567A" };

// P3 — three desaturated papers, one ink each. Papers only; no dark papers, so
// the tile never turns into a black square next to a photograph.
const PV_MUTED = [
  { id: "m0", paper: "#E9E3D6", ink: "#3A4F6B", pop: "#B8657A" },
  { id: "m1", paper: "#E6E4DE", ink: "#4A5240", pop: "#A8794E" },
  { id: "m2", paper: "#EAE2E2", ink: "#57414F", pop: "#7E7391" },
];

const PV_NAMES = [
  "Hermanos Gutiérrez", "Holdfast.", "Four Tet",
  "Geese", "Masego", "Cassandra Jenkins",
];

function pv_rng(hash) {
  let s = (hash || 1) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ── Marks ────────────────────────────────────────────────────────────────────
// Two families only. Both are stroke/fill geometry with no gradients — the
// gradient blobs are what made the old mesh template read as "loading shimmer".

// Bars: silkscreen rules, one offset second pass. Angle + stride + weight vary.
function pv_bars({ rng, ink, pop, scale, opacity = 1 }) {
  const angle = [0, 22, 45, 68, 90, 112, 135][Math.floor(rng() * 7)];
  const n = scale === "micro" ? 4 : scale === "tile" ? 6 : 9;
  const w = 400 / n;
  const fill = 0.34 + rng() * 0.3;
  const off = 5 + rng() * 5;
  const bars = [];
  for (let i = 0; i < n; i++) if (i % 2 === 0) bars.push(i * w);
  return (
    <g transform={`rotate(${angle} 200 200)`} opacity={opacity}>
      <g transform={`translate(${off} ${off * 0.7})`}>
        {bars.map((x, i) => <rect key={`b${i}`} x={x - 90} y="-90" width={w * fill} height="580" fill={pop} opacity="0.55"/>)}
      </g>
      {bars.map((x, i) => <rect key={`a${i}`} x={x - 90} y="-90" width={w * fill} height="580" fill={ink}/>)}
    </g>
  );
}

// Grooves: record arcs from an off-centre focal point. Focal + stride + weight vary.
function pv_grooves({ rng, ink, pop, scale, opacity = 1 }) {
  const f = [{ x: 62, y: 338 }, { x: 338, y: 62 }, { x: 70, y: 70 }, { x: 330, y: 330 }, { x: 200, y: 210 }][Math.floor(rng() * 5)];
  const n = scale === "micro" ? 5 : scale === "tile" ? 8 : 13;
  const stride = 26 + rng() * 16;
  const sw = scale === "hero" ? 7 : 10;
  const off = 4 + rng() * 4;
  const rings = [...Array(n)].map((_, i) => 26 + i * stride);
  return (
    <g opacity={opacity}>
      <g transform={`translate(${off} ${off * 0.7})`}>
        {rings.map((r, i) => <circle key={`g${i}`} cx={f.x} cy={f.y} r={r} fill="none" stroke={pop} strokeWidth={sw} opacity="0.5"/>)}
      </g>
      {rings.map((r, i) => <circle key={`h${i}`} cx={f.x} cy={f.y} r={r} fill="none" stroke={ink} strokeWidth={sw - (i % 2 ? 2 : 0)}/>)}
    </g>
  );
}

// Field: an even dot screen with a directional weight — the quiet one. Used by
// P2 and as P3's third template in place of the gradient mesh.
function pv_field({ rng, ink, pop, scale, opacity = 1 }) {
  const cell = scale === "micro" ? 44 : scale === "tile" ? 34 : 26;
  const cells = Math.ceil(400 / cell);
  const dir = Math.floor(rng() * 4);
  const corner = [{ x: 0, y: 400 }, { x: 400, y: 400 }, { x: 0, y: 0 }, { x: 400, y: 0 }][dir];
  const bandAt = 0.3 + rng() * 0.4;
  const dots = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
    const d = Math.hypot((cx - corner.x) / 400, (cy - corner.y) / 400);
    const r = Math.min(1, d * 0.9) * cell * 0.46;
    if (r > 0.5) dots.push({ cx, cy, r });
  }
  return (
    <g opacity={opacity}>
      {dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={ink}/>)}
      <rect x="-20" y={400 * bandAt} width="440" height={scale === "hero" ? 13 : 18} fill={pop} opacity="0.72"/>
    </g>
  );
}

const PV_MARKS = [pv_bars, pv_grooves, pv_field];

// ── PlaceholderV2 ────────────────────────────────────────────────────────────
// option: ink-series | theme-quiet | muted-riso
// ink:    { paper, ink, pop } — P1 only; the canvas feeds it the live photo pick
function PlaceholderV2({ name, option = "ink-series", kind = "artist", scale = "tile", ink, width, height, style }) {
  const hash = window.ia_hashName(name, kind === "venue" ? "venue" : "artist");
  const rng = pv_rng(hash);
  let paper, inkC, popC, marks, opacity = 1;
  if (option === "theme-quiet") {
    paper = "var(--surface-1)";
    inkC = "color-mix(in oklch, var(--fg) 13%, transparent)";
    popC = "color-mix(in oklch, var(--signal) 42%, transparent)";
    marks = [pv_grooves, pv_field];
  } else if (option === "muted-riso") {
    const p = PV_MUTED[(hash >>> 8) % PV_MUTED.length];
    paper = p.paper; inkC = p.ink; popC = p.pop;
    marks = PV_MARKS;
  } else {
    const k = ink || PV_INK;
    paper = k.paper; inkC = k.ink; popC = k.pop;
    marks = [pv_bars, pv_grooves];
  }
  const Mark = marks[hash % marks.length];
  const rot = ((hash >>> 16) & 3) * 90;
  return (
    <div style={{
      position: "relative", width: width != null ? width : "100%", height: height != null ? height : "100%",
      overflow: "hidden", background: paper, ...style,
    }}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
        style={{ display: "block" }} aria-hidden="true">
        <rect width="400" height="400" fill={paper}/>
        <g transform={`rotate(${rot} 200 200)`}>{Mark({ rng, ink: inkC, pop: popC, scale, opacity })}</g>
      </svg>
      {option !== "theme-quiet" && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          boxShadow: `inset 0 0 0 1px ${option === "muted-riso" ? "rgba(25,20,24,0.28)" : "rgba(27,42,74,0.3)"}`,
        }}/>
      )}
    </div>
  );
}

Object.assign(window, { PlaceholderV2, PV_OPTIONS, PV_NAMES, PV_INK, PV_MUTED });
