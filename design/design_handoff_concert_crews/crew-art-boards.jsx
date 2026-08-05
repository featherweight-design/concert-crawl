// crew-art-boards.jsx — documentation boards for the crew patch system.
//
// Split out of the product canvas: the patch argument (anatomy, the two-systems
// comparison, the gallery, the registries, the scales, the seed proof, the theme
// reskin) is self-contained, and mounting ~60 hero patches next to ~40 product
// artboards put enough SVG on one page to saturate the renderer. It now has its
// own file — `Crew Patch System.html` — and `Concert Crews.html` keeps the
// product surfaces.
//
// Also home to the three shared documentation atoms (Board / Note / SpecTable),
// which both canvases use.

const { ThemeProvider } = window;
const { RailHeader, MonoEyebrow } = window;
const { CrewPatch, crewIdentityFor, CREW_CHORDS, CREW_WEAVES, CREW_SIGILS, CREW_GROUNDS } = window;
const { CREWS } = window;
const { IdentityArt } = window;

// A plain themed board for specimens + annotations.
// Boards must never silently truncate. `overflow: hidden` on this container is
// what let three separate content additions disappear below the fold with no
// signal — the artboard frame already clips, so the only thing a second clip
// bought was hiding the mistake. `height: auto` + `minHeight: 100%` lets the
// board grow past its frame instead, which is immediately visible.
function Board({ theme = "electric", pad = 22, gap = 16, children, center }) {
  return (
    <ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "auto", minHeight: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: pad, display: "flex", flexDirection: "column", gap, alignItems: center ? "center" : "stretch", justifyContent: center ? "center" : "flex-start", boxSizing: "border-box" }}>
        {children}
      </div>
    </ThemeProvider>
  );
}
function Note({ children, tone = "muted" }) {
  return <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.5, color: tone === "muted" ? "var(--fg-muted)" : "var(--fg)", textWrap: "pretty", maxWidth: 560 }}>{children}</div>;
}
function SpecTable({ rows, cols = ["", "", ""] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `170px 190px 1fr`, gap: "0 14px", width: "100%" }}>
      {cols.map((c, i) => <MonoEyebrow key={"h" + i} size={9} color="var(--fg-subtle)" style={{ paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{c}</MonoEyebrow>)}
      {rows.map((r, i) => r.map((cell, j) => (
        <div key={`${i}-${j}`} style={{
          padding: "9px 0", borderBottom: "1px solid var(--border)",
          fontFamily: j === 0 ? "'JetBrains Mono', monospace" : "Inter, system-ui",
          fontSize: j === 0 ? 10.5 : 12, fontWeight: j === 0 ? 700 : (j === 1 ? 700 : 500),
          color: j === 0 ? "var(--signal)" : (j === 1 ? "var(--fg)" : "var(--fg-muted)"),
          letterSpacing: j === 0 ? "0.06em" : "-0.005em", lineHeight: 1.45, textWrap: "pretty",
        }}>{cell}</div>
      )))}
    </div>
  );
}

// ── §1 helpers — the patch system ──────────────────────────────
const GALLERY_IDS = ["cr_7f3a91","cr_2b8d04","cr_9e15cc","cr_41a7b2","cr_c0de55","cr_a1","cr_b2","cr_c3","cr_d4","cr_e5","cr_f6","cr_g7","cr_h8","cr_i9","cr_j0","cr_k1"];
function PatchGallery({ theme = "electric", ids = GALLERY_IDS, cols = 4, size = 96 }) {
  return (
    <Board theme={theme}>
      <RailHeader tone="signal" eyebrow="CREW PATCH · GALLERY" code={`${ids.length} SEEDS`}/>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, justifyItems: "center" }}>
        {ids.map(id => {
          const idn = crewIdentityFor(id);
          return (
            <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <CrewPatch crewId={id} size={size} scale="hero"/>
              <MonoEyebrow size={8} color="var(--fg-subtle)" letterSpacing="0.08em">{idn.sigil.id} · {idn.weave.id}</MonoEyebrow>
            </div>
          );
        })}
      </div>
    </Board>
  );
}
function PatchAnatomy() {
  const layers = [
    ["1 · patch body", "squircle + border-strong edge + dashed stitch inset", "The silhouette. A badge, not a poster: recognizable at 24px before any colour reads."],
    ["2 · ground", "halo / wedges / bands, --secondary at 7–16%", "The woven field. Flat token fills, no gradients, no paper."],
    ["3 · weave", "twill / warp / braid / knot, --primary at 15–26%", "The fabric. Rotates in 60° steps; dropped entirely at micro."],
    ["4 · sigil", "triad / bloom / beacon / keystone / tangle", "The crest. 6-fold symmetric, always upright, full-strength token colour."],
  ];
  return (
    <Board>
      <RailHeader tone="signal" eyebrow="ANATOMY" code="4 LAYERS"/>
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <CrewPatch crewId="cr_7f3a91" size={150} scale="hero"/>
          <MonoEyebrow size={9}>cr_7f3a91</MonoEyebrow>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
          {layers.map(([a, b, c]) => (
            <div key={a} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <MonoEyebrow size={9.5} color="var(--signal)">{a}</MonoEyebrow>
              <span style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5, color: "var(--fg)" }}>{b}</span>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </Board>
  );
}
function RegistryBoard() {
  return (
    <Board>
      <RailHeader tone="signal" eyebrow="REGISTRIES" code="5 × 4 × 5 × 3 = 300"/>
      {[["SIGILS", CREW_SIGILS, "sigil"], ["WEAVES", CREW_WEAVES, "weave"], ["GROUNDS", CREW_GROUNDS, "ground"]].map(([label, reg, key]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <MonoEyebrow size={9}>{label}</MonoEyebrow>
          <div style={{ display: "flex", gap: 12 }}>
            {reg.map(r => (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <CrewPatch crewId="cr_7f3a91" size={64} scale="hero" {...{ [key]: r.id }}/>
                <MonoEyebrow size={8} color="var(--fg-subtle)">{r.label}</MonoEyebrow>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <MonoEyebrow size={9}>CHORDS · TOKEN ROLE PAIRS, NEVER COLOURS</MonoEyebrow>
        <div style={{ display: "flex", gap: 12 }}>
          {CREW_CHORDS.map(c => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <CrewPatch crewId="cr_7f3a91" size={64} scale="hero" chord={c.id}/>
              <MonoEyebrow size={8} color="var(--fg-subtle)">{c.label}</MonoEyebrow>
            </div>
          ))}
        </div>
      </div>
    </Board>
  );
}
function NotThisBoard() {
  const rows = [
    ["silhouette", "full-bleed rectangle", "squircle with a stitched edge"],
    ["colour", "8 fixed riso palettes (hex)", "theme tokens only"],
    ["theme", "ignores it; paper is paper", "reskins with the theme"],
    ["surface", "printed: grain, overprint, halftone", "textile: flat fields, woven lattice"],
    ["structure", "loose, organic, off-centre", "strict 6-fold radial symmetry"],
    ["seed", "artist / venue NAME", "crew ID (immutable)"],
    ["reads as", "content", "your people"],
  ];
  return (
    <Board>
      <RailHeader tone="accent" eyebrow="NOT THIS" code="TWO SYSTEMS"/>
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
          <div style={{ width: 118, height: 118, borderRadius: 8, overflow: "hidden" }}>
            <IdentityArt name="Hermanos Gutiérrez" kind="artist" scale="tile" showInitials={false} grain={0.1}/>
          </div>
          <MonoEyebrow size={8.5} color="var(--fg-subtle)">identity-art · artist</MonoEyebrow>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
          <div style={{ width: 118, height: 118, borderRadius: 8, overflow: "hidden" }}>
            <IdentityArt name="Mission Ballroom" kind="venue" scale="tile" showInitials={false} grain={0.1}/>
          </div>
          <MonoEyebrow size={8.5} color="var(--fg-subtle)">identity-art · venue</MonoEyebrow>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: "var(--border-strong)" }}/>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
          <CrewPatch crewId="cr_7f3a91" size={118} scale="hero"/>
          <MonoEyebrow size={8.5} color="var(--signal)">crew-art · crew</MonoEyebrow>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "center" }}>
          <CrewPatch crewId="cr_41a7b2" size={118} scale="hero"/>
          <MonoEyebrow size={8.5} color="var(--signal)">crew-art · crew</MonoEyebrow>
        </div>
      </div>
      <SpecTable cols={["", "identity-art (event · venue)", "crew-art (crew)"]} rows={rows}/>
    </Board>
  );
}
function ScaleBoard() {
  return (
    <Board>
      <RailHeader tone="signal" eyebrow="SCALES" code="HERO · TILE · MICRO"/>
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end" }}>
        {[["hero", 120], ["hero", 72], ["tile", 48], ["micro", 34], ["micro", 26], ["micro", 22]].map(([sc, sz], i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <CrewPatch crewId="cr_7f3a91" size={sz} scale={sc}/>
            <MonoEyebrow size={8} color="var(--fg-subtle)">{sc} · {sz}</MonoEyebrow>
          </div>
        ))}
      </div>
      <Note>
        <strong style={{ color: "var(--fg)" }}>micro drops the weave and the stitch.</strong> At 22–34px a lattice turns to
        mud and dashed stitching aliases; what survives — and what actually makes a crew recognisable in the Browse
        pill and the notification bell — is the sigil plus the chord. Same seed, less detail, same identity.
      </Note>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
        {CREWS.map(c => (
          <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 5px", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-strong)" }}>
            <CrewPatch crewId={c.id} size={24} scale="micro"/>
            <span style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 11.5, color: "var(--fg)" }}>{c.name}</span>
          </span>
        ))}
      </div>
    </Board>
  );
}
function SeedBoard() {
  return (
    <Board>
      <RailHeader tone="accent" eyebrow="THE SEED" code="crew.id + salt"/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {[
          { label: "renamed", note: "\"Thursdays\" → \"The Thursday Problem\"", ids: ["cr_7f3a91", "cr_7f3a91"], names: ["Thursdays", "The Thursday Problem"] },
          { label: "membership changed", note: "6 members → 9 members", ids: ["cr_7f3a91", "cr_7f3a91"], names: ["6 members", "9 members"] },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <MonoEyebrow size={9} color="var(--signal)">{row.label}</MonoEyebrow>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {row.ids.map((id, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: "var(--fg-subtle)" }}>→</span>}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <CrewPatch crewId={id} size={62} scale="hero"/>
                    <MonoEyebrow size={8} color="var(--fg-subtle)">{row.names[i]}</MonoEyebrow>
                  </div>
                </React.Fragment>
              ))}
              <span style={{ marginLeft: 6, fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12.5, color: "var(--success)" }}>identical</span>
            </div>
          </div>
        ))}
      </div>
      <SpecTable cols={["candidate seed", "verdict", "why"]} rows={[
        ["crew.id + patchSalt", "SHIPPED", "crew.id is minted once and survives renames, joins, leaves, removals and handoff. patchSalt starts at 0 and moves ONLY on an explicit creator reroll: the one sanctioned way a face changes, and a decision rather than a side effect."],
        ["membership hash", "rejected", "Brief §3.5. The face reshuffles every time someone joins, so the picker stops being a picker."],
        ["crew.name", "rejected", "Renaming a crew is normal and cheap. Handing it a new face for a typo fix is not."],
        ["creator user id", "rejected", "Two crews by the same person collide, and it silently encodes who owns it."],
      ]}/>
      <Note>Eng note: mint <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--signal)" }}>crew.id</code> client-side before the insert so the create-sheet preview is the real patch, not an approximation of it. <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--signal)" }}>patchSalt</code> is an int column defaulting to 0.</Note>
    </Board>
  );
}

// ── Reroll ──────────────────────────────────────────────────
function RerollBoard() {
  return (
    <Board>
      <RailHeader tone="signal" eyebrow="REROLL · patchSalt" code="CREATOR ONLY"/>
      <Note>The six patches a crew actually passes through, in order. The four layers are hashed from independent bit-slices, so consecutive salts often keep one. A candidate must have a <strong style={{ color: "var(--fg)" }}>different weave</strong> (the fabric covers the whole patch, so it dominates the read) <strong style={{ color: "var(--fg)" }}>and</strong> at most one shared layer overall; the action stores the first salt that qualifies — about half the time that's the next integer, otherwise it lands further on, which is why the salts below advance unevenly. Still a plain int, still reproducible from (crew.id, patchSalt) — the scan runs once, at the tap.</Note>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        {window.patchSaltSequence("cr_7f3a91", 6).map((s, i) => {
          const idn = crewIdentityFor("cr_7f3a91", { salt: s });
          return (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <CrewPatch crewId="cr_7f3a91" salt={s} size={92} scale="hero"/>
              <MonoEyebrow size={8.5} color={i === 0 ? "var(--signal)" : "var(--fg-subtle)"}>{i === 0 ? "salt 0 · default" : `pull ${i} · salt ${s}`}</MonoEyebrow>
              <MonoEyebrow size={8} color="var(--fg-subtle)">{idn.sigil.id}·{idn.weave.id}</MonoEyebrow>
            </div>
          );
        })}
      </div>
      <SpecTable cols={["rule", "behaviour", "why"]} rows={[
        ["who", "Creator only, confirmed", "It changes the crew's face for every member, so it sits with rename and delete rather than with a personal preference."],
        ["distance", "Different weave + ≤ 1 shared layer", "Guarantees a pull reads as a new patch rather than a tweak of the last one. Measured over 50 consecutive pulls across 10 crews: worst case 1 shared layer, 0 shared weaves. The first qualifying salt is the next integer about half the time. Enforced by nextPatchSalt()."],
        ["when", "Any time, no cooldown", "A crew of twelve self-polices; a cooldown would only punish the one crew that genuinely hates its first pull."],
        ["preview", "Now → New, side by side", "A comparison, not a gamble. Shuffle again is free until they commit."],
        ["notify", "No notification", "Cosmetic and visible on next open. A bell for a colour change is noise. §3.11's bar is activity, not decoration."],
        ["history", "Salt only moves forward", "No undo stack. If they want the old one back they keep rolling; storing patch history for a decoration isn't worth a column."],
      ]}/>
    </Board>
  );
}

// ── The variant space ────────────────────────────────────────
// 5 sigils × 4 weaves × 3 grounds × 5 chords = 300. Enumerating all 300 is
// neither readable nor useful, so the space is shown as three orthogonal slices
// — every sigil against every weave (the 20 that carry the silhouette), then
// grounds and chords swept independently. Any real patch is one cell from each.
function SigilWeaveMatrix({ theme = "electric" }) {
  return (
    <Board pad={20} theme={theme}>
      <RailHeader tone="signal" eyebrow="VARIANT SPACE · SIGIL × WEAVE" code="20 OF 300"/>
      <Note>The two layers that decide whether two patches are confusable. Rows are the five crests; columns are the four fabrics. Ground and chord are held constant (halo, signal·accent) so only these two vary.</Note>
      <div style={{ display: "grid", gridTemplateColumns: "58px repeat(4, 1fr)", gap: "0 10px", alignItems: "center" }}>
        <span/>
        {CREW_WEAVES.map(w => <MonoEyebrow key={w.id} size={9} color="var(--fg-subtle)" style={{ paddingBottom: 6, textAlign: "center" }}>{w.label}</MonoEyebrow>)}
        {CREW_SIGILS.map(s => (
          <React.Fragment key={s.id}>
            <MonoEyebrow size={9} color="var(--signal)">{s.label}</MonoEyebrow>
            {CREW_WEAVES.map(w => (
              <div key={w.id} style={{ display: "flex", justifyContent: "center", padding: "7px 0" }}>
                <CrewPatch crewId="cr_7f3a91" size={78} scale="hero" sigil={s.id} weave={w.id} ground="halo" chord="c0"/>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Board>
  );
}
function GroundChordMatrix() {
  return (
    <Board pad={20}>
      <RailHeader tone="accent" eyebrow="VARIANT SPACE · GROUND × CHORD" code="15 OF 300"/>
      <Note>The two layers that decide how a patch <em>reads</em> rather than what it <em>is</em>. Rows are the three woven fields; columns are the five token-role chords. Sigil and weave held constant (triad, twill). Every cell reskins with the theme — no cell contains a colour.</Note>
      <div style={{ display: "grid", gridTemplateColumns: "58px repeat(5, 1fr)", gap: "0 10px", alignItems: "center" }}>
        <span/>
        {CREW_CHORDS.map(c => <MonoEyebrow key={c.id} size={8.5} color="var(--fg-subtle)" style={{ paddingBottom: 6, textAlign: "center" }}>{c.label}</MonoEyebrow>)}
        {CREW_GROUNDS.map(g => (
          <React.Fragment key={g.id}>
            <MonoEyebrow size={9} color="var(--accent)">{g.label}</MonoEyebrow>
            {CREW_CHORDS.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "center", padding: "7px 0" }}>
                <CrewPatch crewId="cr_7f3a91" size={76} scale="hero" ground={g.id} chord={c.id} sigil="triad" weave="twill"/>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Board>
  );
}
function VariantMathBoard() {
  return (
    <Board>
      <RailHeader tone="signal" eyebrow="THE SPACE, COUNTED" code="300"/>
      <SpecTable cols={["layer", "options", "what it contributes"]} rows={[
        ["sigil", "5 · triad bloom beacon keystone tangle", "The crest. The single strongest cue: it is what survives at 22px when the weave is dropped."],
        ["weave", "4 · twill warp braid knot", "The fabric, plus a 6-step rotation, so the same weave reads differently across crews."],
        ["ground", "3 · halo wedges bands", "The field the crest sits on. Changes the patch's weight more than its identity."],
        ["chord", "5 · token role PAIRS, never colours", "Which two token roles the patch is drawn in. Reskins with every theme; ship a tenth and no crew changes."],
        ["total", "5 × 4 × 3 × 5 = 300", "Distinct patches per crew id × salt. A twelve-person crew will never see a collision; a picker of five never comes close."],
      ]}/>
      <Note>Rotation is deliberately excluded from the count. It varies the weave layer only and never the crest — a rotated twill is the same patch, not a 301st one — so counting it would overstate how distinguishable the space really is.</Note>
    </Board>
  );
}
function ThemeReskinBoard() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {["electric", "jade", "light"].map(th => (
        <ThemeProvider key={th} theme={th} style={{ flex: 1 }}>
          <div style={{ width: "100%", height: "100%", background: "var(--bg)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <MonoEyebrow size={9} color="var(--signal)">{th.toUpperCase()}</MonoEyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, justifyItems: "center" }}>
              {["cr_7f3a91", "cr_2b8d04", "cr_41a7b2", "cr_9e15cc"].map(id => <CrewPatch key={id} crewId={id} size={82} scale="hero"/>)}
            </div>
          </div>
        </ThemeProvider>
      ))}
    </div>
  );
}

Object.assign(window, {
  Board, Note, SpecTable, GALLERY_IDS,
  PatchGallery, PatchAnatomy, RegistryBoard, NotThisBoard, ScaleBoard, SeedBoard, ThemeReskinBoard,
  RerollBoard, SigilWeaveMatrix, GroundChordMatrix, VariantMathBoard,
});
