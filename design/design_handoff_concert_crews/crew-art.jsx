// crew-art.jsx — Concert Crews (#1226) · the crew identity system
//
// ── Why this is NOT identity-art.jsx ──────────────────────────────────
// identity-art.jsx draws ARTISTS and VENUES as risograph gig posters: fixed
// riso palettes (hardcoded hex), off-white paper, ink overprint with
// mix-blend-mode, halftone, grain, full-bleed rectangles, seeded by NAME.
// It reads as "a poster for a thing" — which is exactly what an artist or a
// venue is.
//
// A crew is not a thing you look at. It's a group you belong to. So the crew
// system draws a PATCH — a sew-on tour patch / enamel badge:
//
//                 identity-art (event/venue)      crew-art (crew)
//   silhouette    full-bleed rectangle            squircle w/ stitched border
//   color         8 fixed riso palettes (hex)     THEME TOKENS ONLY
//   theme         ignores it — paper is paper     reskins with the theme
//   surface       printed: grain, overprint,       textile: flat token fields,
//                 mis-registration, halftone      woven lattice, no grain,
//                                                 no blend modes
//   structure     loose, organic, off-center      strict 6-fold radial symmetry
//   rotation      whole image at 90° steps        weave only; sigil upright
//   marks         halftone / stripes / grooves    crest sigils
//   seed          artist or venue NAME            crew ID (immutable)
//   reads as      content                         your people
//
// The two systems share no code, no palette, no template and no seed
// namespace. Put a patch next to a poster (canvas §1) and they are not
// relatives.
//
// ── The seed ──────────────────────────────────────────────────────────
// Seeded from `crew.id` — the immutable row id minted at creation.
//   · NOT membership. A face that reshuffles when someone joins is not
//     recognizable in a picker (brief §3.5).
//   · NOT the name either. Renaming "Thursdays" → "The Thursday Problem"
//     must not hand the crew a new face — the picker is the whole reason
//     the art exists.
// So: rename freely, add and lose members freely. The patch never moves.
//
// ── Public API ────────────────────────────────────────────────────────
//   <CrewPatch crewId salt size scale shape/>   scale: hero | tile | micro
//   crewIdentityFor(crewId, {salt}) → { chord, weave, sigil, ground, hash }
//   nextPatchSalt(crewId, salt) → the salt a reroll would store
//   patchSaltSequence(crewId, n) → the salts a crew passes through, in order
//   CREW_CHORDS · CREW_WEAVES · CREW_SIGILS · CREW_GROUNDS   (registries)
//
// 5 chords × 4 weaves × 5 sigils × 3 grounds = 300 distinct patches.
// No dependencies. Everything is inline SVG + CSS custom properties.

// ── Seed ──────────────────────────────────────────────────────────────
// seed = crew.id + ":" + patchSalt
//
// `patchSalt` is a small integer on the crew row, 0 at creation, incremented
// ONLY by an explicit "New patch" action from the creator. It is the one
// sanctioned way a crew's face changes, and it does not weaken the locked §3.5
// constraint:
//   · still never derived from membership — joins and leaves move nothing
//   · still never derived from the name — renames move nothing
//   · still stable in a picker — it moves only when a human decided it should
// The distinction is intent. Reshuffling on its own is what made the rejected
// membership hash unrecognizable; a deliberate reroll is the crew's own
// decision about how it wants to look, taken once and then stable again.
function crewHash(crewId, salt = 0) {
  let h = 0x811c9dc5 >>> 0;
  const s = "crew:" + String(crewId || "") + ":" + String(salt || 0);
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ── Chords — the only color source is the token set ───────────────────
// A chord is a PAIR OF TOKEN ROLES, never a color. Flip the theme and every
// crew reskins with it; ship a tenth theme and no crew art changes.
const CREW_CHORDS = [
  { id: "c0", label: "signal · accent",  primary: "--signal",  secondary: "--accent"  },
  { id: "c1", label: "accent · signal",  primary: "--accent",  secondary: "--signal"  },
  { id: "c2", label: "signal · success", primary: "--signal",  secondary: "--success" },
  { id: "c3", label: "accent · warning", primary: "--accent",  secondary: "--warning" },
  { id: "c4", label: "success · accent", primary: "--success", secondary: "--accent"  },
];

// ── Grounds — the woven field the sigil sits on ───────────────────────
function ground_halo({ sec }) {
  return (
    <g>
      {[46, 36, 26].map((r, i) => (
        <circle key={i} cx="50" cy="50" r={r} fill={sec} fillOpacity={0.07 + i * 0.045}/>
      ))}
    </g>
  );
}
function ground_wedges({ sec }) {
  const wedges = [];
  for (let i = 0; i < 6; i++) {
    if (i % 2) continue;
    const a0 = (i * 60 - 90) * Math.PI / 180, a1 = ((i + 1) * 60 - 90) * Math.PI / 180;
    const R = 70;
    wedges.push(`M50 50 L${(50 + Math.cos(a0) * R).toFixed(2)} ${(50 + Math.sin(a0) * R).toFixed(2)} L${(50 + Math.cos(a1) * R).toFixed(2)} ${(50 + Math.sin(a1) * R).toFixed(2)} Z`);
  }
  return (
    <g>
      <rect x="0" y="0" width="100" height="100" fill={sec} fillOpacity="0.08"/>
      {wedges.map((d, i) => <path key={i} d={d} fill={sec} fillOpacity="0.13"/>)}
    </g>
  );
}
function ground_bands({ sec }) {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x="0" y={i * 14.3} width="100" height="7.2" fill={sec}
          fillOpacity={i % 2 ? 0.16 : 0.07}/>
      ))}
    </g>
  );
}
const CREW_GROUNDS = [
  { id: "halo",   label: "Halo",   render: ground_halo },
  { id: "wedges", label: "Wedges", render: ground_wedges },
  { id: "bands",  label: "Bands",  render: ground_bands },
];

// ── Weaves — the fabric. Thin strokes, low opacity, never a poster stripe ──
// Each weave is ONE <rect> filled with an SVG <pattern>, not a run of hand-
// emitted lines. R1 emitted 52 <line> nodes per twill patch and 40 per knot;
// across the canvas's ~169 patches that was tens of thousands of SVG layout
// boxes and it saturated the renderer. A pattern tiles natively, draws the same
// fabric, and is the right thing to ship regardless — a crew patch should cost
// a handful of nodes at any size.
function weave_twill({ pri, sw, pid }) {
  return (
    <g>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width="12" height="12">
          <line x1="0" y1="12" x2="12" y2="0" stroke={pri} strokeWidth={sw} strokeOpacity="0.26"/>
          <line x1="0" y1="0" x2="12" y2="12" stroke={pri} strokeWidth={sw * 0.7} strokeOpacity="0.15"/>
        </pattern>
      </defs>
      <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`}/>
    </g>
  );
}
function weave_knot({ pri, sw, pid }) {
  return (
    <g>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width="16" height="16">
          <line x1="0" y1="16" x2="16" y2="0" stroke={pri} strokeWidth={sw} strokeOpacity="0.24" strokeDasharray="7 5"/>
          <line x1="0" y1="0" x2="16" y2="16" stroke={pri} strokeWidth={sw} strokeOpacity="0.24" strokeDasharray="7 5"/>
        </pattern>
      </defs>
      <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`}/>
    </g>
  );
}
function weave_braid({ pri, sw, pid }) {
  return (
    <g>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width="13" height="13">
          <path d="M0 9.5 L6.5 3 L13 9.5" fill="none" stroke={pri} strokeWidth={sw} strokeOpacity="0.24"/>
        </pattern>
      </defs>
      <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`}/>
    </g>
  );
}
// Warp is radial, so it can't tile — but it's 15 nodes, not 52, so it stays
// explicit geometry.
function weave_warp({ pri, sw }) {
  const spokes = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * Math.PI / 180;
    spokes.push(<line key={i} x1="50" y1="50"
      x2={(50 + Math.cos(a) * 80).toFixed(2)} y2={(50 + Math.sin(a) * 80).toFixed(2)}
      stroke={pri} strokeWidth={sw} strokeOpacity="0.22"/>);
  }
  return (
    <g>
      {spokes}
      {[20, 32, 44].map(r => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={pri} strokeWidth={sw * 0.8} strokeOpacity="0.18"/>
      ))}
    </g>
  );
}
const CREW_WEAVES = [
  { id: "twill", label: "Twill", render: weave_twill },
  { id: "warp",  label: "Warp",  render: weave_warp  },
  { id: "braid", label: "Braid", render: weave_braid },
  { id: "knot",  label: "Knot",  render: weave_knot  },
];

// ── Sigils — the crest. Upright at every size, 6-fold where symmetric ──
function radial(n, fn) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(<g key={i} transform={`rotate(${(360 / n) * i} 50 50)`}>{fn(i)}</g>);
  return out;
}
function sigil_triad({ pri, sec }) {
  return (
    <g>
      <circle cx="50" cy="50" r="21" fill="none" stroke={pri} strokeWidth="3.2"/>
      {radial(3, () => <circle cx="50" cy="29" r="6.4" fill={pri}/>)}
      <circle cx="50" cy="50" r="6" fill={sec}/>
    </g>
  );
}
function sigil_bloom({ pri, sec }) {
  return (
    <g>
      {radial(6, () => <ellipse cx="50" cy="34" rx="6" ry="13" fill={pri} fillOpacity="0.92"/>)}
      <circle cx="50" cy="50" r="8" fill={sec}/>
      <circle cx="50" cy="50" r="8" fill="none" stroke={pri} strokeWidth="2"/>
    </g>
  );
}
function sigil_beacon({ pri, sec }) {
  return (
    <g>
      <rect x="47" y="42" width="6" height="26" rx="3" fill={pri}/>
      <circle cx="50" cy="33" r="7.5" fill={sec}/>
      <path d="M32 40a24 24 0 0 1 36 0" fill="none" stroke={pri} strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M25 48a34 34 0 0 1 50 0" fill="none" stroke={pri} strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.6"/>
    </g>
  );
}
function sigil_keystone({ pri, sec }) {
  const hex = (r) => Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
  }).join(" L ");
  return (
    <g>
      <path d={`M ${hex(24)} Z`} fill="none" stroke={pri} strokeWidth="3.2"/>
      <path d={`M ${hex(13)} Z`} fill={sec}/>
      {radial(3, () => <rect x="48.6" y="17" width="2.8" height="8" rx="1.4" fill={pri}/>)}
    </g>
  );
}
function sigil_tangle({ pri, sec }) {
  return (
    <g>
      {radial(3, () => <circle cx="50" cy="41" r="13" fill="none" stroke={pri} strokeWidth="3.2"/>)}
      <circle cx="50" cy="50" r="4.5" fill={sec}/>
    </g>
  );
}
const CREW_SIGILS = [
  { id: "triad",    label: "Triad",    render: sigil_triad    },
  { id: "bloom",    label: "Bloom",    render: sigil_bloom    },
  { id: "beacon",   label: "Beacon",   render: sigil_beacon   },
  { id: "keystone", label: "Keystone", render: sigil_keystone },
  { id: "tangle",   label: "Tangle",   render: sigil_tangle   },
];

// ── Resolve ───────────────────────────────────────────────────────────
function crewIdentityFor(crewId, opts = {}) {
  const hash = crewHash(crewId, opts.salt || 0);
  const chord  = opts.chord  ? (CREW_CHORDS.find(c => c.id === opts.chord)   || CREW_CHORDS[hash % CREW_CHORDS.length])           : CREW_CHORDS[hash % CREW_CHORDS.length];
  const weave  = opts.weave  ? (CREW_WEAVES.find(w => w.id === opts.weave)   || CREW_WEAVES[(hash >>> 5) % CREW_WEAVES.length])   : CREW_WEAVES[(hash >>> 5) % CREW_WEAVES.length];
  const sigil  = opts.sigil  ? (CREW_SIGILS.find(s => s.id === opts.sigil)   || CREW_SIGILS[(hash >>> 11) % CREW_SIGILS.length])  : CREW_SIGILS[(hash >>> 11) % CREW_SIGILS.length];
  const ground = opts.ground ? (CREW_GROUNDS.find(g => g.id === opts.ground) || CREW_GROUNDS[(hash >>> 17) % CREW_GROUNDS.length]): CREW_GROUNDS[(hash >>> 17) % CREW_GROUNDS.length];
  const spin = ((hash >>> 21) % 6) * 60;
  return { hash, chord, weave, sigil, ground, spin };
}

// ── Reroll ────────────────────────────────────────────────────
// The four layers are hashed from independent bit-slices, so consecutive salts
// land on the previous value for some layer often (weave ~1-in-4, ground
// ~1-in-3). Every salt still yields a DISTINCT patch, but "I pulled a new one"
// must not return something that reads as a tweak of the last one — a pull that
// keeps the fabric and only swaps the crest is the most disappointing possible
// outcome of pressing the button.
//
// So a candidate salt must satisfy BOTH:
//   1. a different weave — the fabric always changes, because it's the layer
//      that covers the whole patch and therefore dominates the read; and
//   2. at most one shared layer in total, so the rest of the patch moves too.
// The reroll action scans forward for the first salt that qualifies and stores
// that integer. The stored value is still a plain int and the patch is still
// fully reproducible from (crew.id, patchSalt) alone — the scan happens once, at
// the moment of the tap, never at render time.
function nextPatchSalt(crewId, currentSalt = 0, maxShared = 1) {
  const cur = crewIdentityFor(crewId, { salt: currentSalt });
  for (let s = currentSalt + 1; s <= currentSalt + 60; s++) {
    const n = crewIdentityFor(crewId, { salt: s });
    if (n.weave.id === cur.weave.id) continue;   // rule 1 — fabric must change
    let shared = 0;
    if (n.sigil.id === cur.sigil.id) shared++;
    if (n.ground.id === cur.ground.id) shared++;
    if (n.chord.id === cur.chord.id) shared++;
    if (shared <= maxShared) return s;           // rule 2
  }
  return currentSalt + 1; // unreachable in practice; never loop forever
}
// The salts a crew would actually pass through, in order.
function patchSaltSequence(crewId, n = 6, from = 0) {
  const out = [from];
  for (let i = 1; i < n; i++) out.push(nextPatchSalt(crewId, out[out.length - 1]));
  return out;
}

// ── <CrewPatch/> ──────────────────────────────────────────────────────
// Decorative by default (aria-hidden). The crew's NAME is the accessible
// label and always sits OUTSIDE the patch — the patch never carries text, so
// there is no contrast-over-art problem to solve (another break from
// identity-art's initials stamp).
function CrewPatch({ crewId, salt = 0, size = 96, scale = "hero", chord, weave, sigil, ground, style, className }) {
  const id = crewIdentityFor(crewId, { salt, chord, weave, sigil, ground });
  // useId, not a module-scope counter: server and client counters diverge under
  // SSR, hydrating the clipPath/pattern refs onto ids that don't exist.
  const uid = `cp${React.useId().replace(/:/g, "")}`;
  const pri = `var(${id.chord.primary})`;
  const sec = `var(${id.chord.secondary})`;
  // micro drops the weave and the stitch: at 24–28px they turn to mud, and the
  // sigil + chord is what actually makes a crew recognizable in a picker.
  const showWeave = scale !== "micro";
  const showStitch = scale === "hero";
  const sw = scale === "hero" ? 1.6 : 2.2;
  const r = 28; // squircle radius in viewBox units

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}
      aria-hidden="true" focusable="false"
      style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }}>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect x="2" y="2" width="96" height="96" rx={r} ry={r}/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="2" y="2" width="96" height="96" rx={r} ry={r} fill="var(--surface-2)"/>
        {id.ground.render({ sec, pri })}
        {showWeave && (
          <g transform={`rotate(${id.spin} 50 50)`}>{id.weave.render({ pri, sw, pid: `${uid}-w` })}</g>
        )}
        {id.sigil.render({ pri, sec })}
      </g>
      {/* patch edge + stitching — the silhouette that says "badge", not "poster" */}
      <rect x="2" y="2" width="96" height="96" rx={r} ry={r}
        fill="none" stroke="var(--border-strong)" strokeWidth="2"/>
      {showStitch && (
        <rect x="7.5" y="7.5" width="85" height="85" rx={r - 5} ry={r - 5}
          fill="none" stroke="var(--fg-subtle)" strokeWidth="1.1"
          strokeDasharray="3 4.5" strokeOpacity="0.55"/>
      )}
    </svg>
  );
}

Object.assign(window, {
  crewHash, crewIdentityFor, CrewPatch, nextPatchSalt, patchSaltSequence,
  CREW_CHORDS, CREW_WEAVES, CREW_SIGILS, CREW_GROUNDS,
});
