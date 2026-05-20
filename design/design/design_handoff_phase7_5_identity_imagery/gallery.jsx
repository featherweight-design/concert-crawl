// gallery.jsx — Phase 7.5 distribution gallery
// 12 artists + 12 venues at hero scale, plus a small-tile strip so we can
// sanity-check distinctness at glanceable size.

const ARTISTS_12 = [
  "Wednesday",
  "Bright Eyes",
  "Mannequin Pussy",
  "Lewis Capaldi",
  "Amyl and the Sniffers",
  "David Guetta",
  "Puscifer",
  "Wisp",
  "Two Friends",
  "Hippie Sabotage",
  "Geese",
  "YUNGBLUD",
];

const VENUES_12 = [
  "Red Rocks Amphitheatre",
  "Mission Ballroom",
  "Gothic Theatre",
  "Bluebird Theater",
  "Ogden Theatre",
  "Fillmore Auditorium",
  "Larimer Lounge",
  "Cervantes' Masquerade",
  "Globe Hall",
  "Marquis Theater",
  "Hi-Dive",
  "Summit Music Hall",
];

function GalleryGrid({ items, kind, artProps = {}, columns = 4, cardW = 200, cardH = 200, showLabel = true }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, ${cardW}px)`,
      gap: 16,
    }}>
      {items.map((name, i) => (
        <div key={i} style={{
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{
            width: cardW, height: cardH, borderRadius: 12, overflow: "hidden",
            border: "1px solid var(--border)",
          }}>
            <IdentityArt name={name} kind={kind} scale="hero" {...artProps} />
          </div>
          {showLabel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2,
              fontFamily: "'Inter', sans-serif", color: "var(--fg)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {identityFor(name, kind).template.label} · {identityFor(name, kind).palette.id}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Tile strip — 12 small squares with no initials, to sanity-check small-scale
function TileStrip({ items, kind, artProps = {} }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((name, i) => (
        <div key={i} title={name} style={{
          width: 88, height: 88, borderRadius: 8, overflow: "hidden",
          border: "1px solid var(--border)",
        }}>
          <IdentityArt name={name} kind={kind} scale="tile" showInitials={false}
            grain={0.06} {...artProps} />
        </div>
      ))}
    </div>
  );
}

// A "what changes when you change the name by one letter" demo
function CollisionCheck({ artProps = {} }) {
  const pairs = [
    { a: "Mission Ballroom", aKind: "venue", b: "Mission Ballroom", bKind: "artist", note: "same name, different namespace — must differ" },
    { a: "Wednesday", aKind: "artist", b: "Wednesdays", aKind2: "artist", bKind: "artist", note: "one-letter delta" },
    { a: "Red Rocks Amphitheatre", aKind: "venue", b: "Red Rocks Amphitheater", bKind: "venue", note: "spelling delta" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pairs.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center",
          fontFamily: "'Inter', sans-serif", color: "var(--fg)" }}>
          <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden",
            border: "1px solid var(--border)" }}>
            <IdentityArt name={p.a} kind={p.aKind} scale="tile" showInitials={false} {...artProps} />
          </div>
          <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden",
            border: "1px solid var(--border)" }}>
            <IdentityArt name={p.b} kind={p.bKind} scale="tile" showInitials={false} {...artProps} />
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
            maxWidth: 220 }}>
            <div style={{ color: "var(--fg)", fontWeight: 600 }}>{p.a} ↔ {p.b}</div>
            <div style={{ marginTop: 2 }}>{p.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Templates × palettes matrix — for QA the engine
function TemplateMatrix({ kind = "artist" }) {
  const templates = ia_templatesFor(kind);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {templates.map((tpl) => (
        <div key={tpl.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {tpl.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 88px)", gap: 8 }}>
            {IA_PALETTES.map((p) => (
              <div key={p.id} style={{ width: 88, height: 88, borderRadius: 8, overflow: "hidden",
                border: "1px solid var(--border)" }}>
                <IdentityArt
                  name={`seed-${tpl.id}-${p.id}-${kind}`}
                  kind={kind}
                  scale="tile"
                  showInitials={false}
                  templateOverride={tpl.id}
                  paletteOverride={p.id}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Palette swatches
function PaletteSwatches() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {IA_PALETTES.map((p) => (
        <div key={p.id} style={{
          padding: 10, border: "1px solid var(--border)", borderRadius: 10,
          background: "var(--surface-1)", color: "var(--fg)",
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ display: "flex", height: 44, borderRadius: 6, overflow: "hidden",
            border: "1px solid var(--border)" }}>
            <div style={{ flex: 1, background: p.bg }} />
            <div style={{ flex: 1, background: p.primary }} />
            <div style={{ flex: 1, background: p.secondary }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <span style={{ color: "var(--fg)", fontWeight: 700 }}>{p.id}</span>
            <span style={{ color: "var(--fg-muted)" }}>{p.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  ARTISTS_12, VENUES_12,
  GalleryGrid, TileStrip, CollisionCheck, TemplateMatrix, PaletteSwatches,
});
