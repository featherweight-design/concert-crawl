// passport-card.jsx — the Concert Passport.
//
// A personal shrine of past-attended shows. **Not** a per-event share card —
// it's the one card that's about *you*, not one gig. Ownership inherited into
// this handoff from concert_history per PR #916 (2026-07-12).
// Related eng: #85 "Concert passport (visual shareable grid)".
//
// ── Two modes ─────────────────────────────────────────────────────────────
//   compact — 320×500. Sidebar / inline surface. Ships on the Concert History
//             page under a "See your Passport →" teaser link. In-app preview.
//   share   — 1080×1080. Matches the existing square share ratio, so the
//             render pipeline reuses the /share/:eventId/:ratio.png shape as a
//             sibling route (likely /passport/:userId/:ratio.png).
//
// ── Visual system (coherent with the Riso Poster direction) ─────────────────
//   • The wall IS the identity-art layer. Every stamp is a live <IdentityArt>
//     tile of that show's artist, so the top of the card is literally built
//     from the same generative palette engine the Poster's hero uses.
//     Palettes are theme-independent (Phase 7.5 contract) — the wall looks the
//     same across Electric / Jade / Light.
//   • The bottom info panel is a --scrim glassmorphism block that reads theme
//     tokens (--fg / --fg-muted / --bg / --border-strong / --signal). Chrome
//     swaps with theme; the art does not.
//   • Stands on its own conceptually: a stamp book of nights you were there —
//     each tile a real show — not a single hero image of one gig.

const PP_MODES = {
  compact: {
    W: 320, H: 500, cols: 3, rows: 3,
    pad: 15, gap: 8, radius: 20, stampRadius: 9,
    headEyebrow: 9.5, headHandle: 9, pillPadV: 5, pillPadH: 9, pillGap: 6,
    padTop: 54, padBottom: 132,
    statBig: 30, statMid: 17, statLabel: 8, panelGap: 10,
    wordmark: 15, dot: 13, footTag: 9.5,
    stampArtist: 10, stampDate: 8, panelPadX: 16, panelPadB: 15,
    grain: 0.12,
  },
  share: {
    W: 1080, H: 1080, cols: 4, rows: 4,
    pad: 44, gap: 15, radius: 30, stampRadius: 16,
    headEyebrow: 21, headHandle: 19, pillPadV: 11, pillPadH: 20, pillGap: 12,
    padTop: 116, padBottom: 268,
    statBig: 74, statMid: 40, statLabel: 17, panelGap: 22,
    wordmark: 42, dot: 34, footTag: 20,
    stampArtist: 22, stampDate: 17, panelPadX: 48, panelPadB: 44,
    grain: 0.1,
  },
};

// Deterministic tiny rotation per show id so the wall reads "stamped", stable
// across re-renders. ±~2°.
function pp_rot(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((h % 9) - 4) * 0.55;
}

function pp_dateParts(iso) {
  const d = new Date(iso);
  return {
    month: d.toLocaleString("en-US", { month: "short", timeZone: "America/Denver" }).toUpperCase(),
    day: d.getUTCDate(),
  };
}

// ── One stamp = one attended show, rendered as a mini identity-art tile ─────
function PassportStamp({ show, cfg }) {
  const { month, day } = pp_dateParts(show.dateISO);
  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      borderRadius: cfg.stampRadius,
      overflow: "hidden",
      transform: `rotate(${pp_rot(show.id)}deg)`,
      transformOrigin: "center center",
      // Hairline frame + lift — this is a frame on an image, not screen chrome,
      // so it uses a neutral translucent ink that reads on any riso paper.
      boxShadow: "0 0 0 1.5px rgba(255,255,255,0.14), 0 6px 16px -6px rgba(0,0,0,0.6)",
    }}>
      <window.IdentityArt name={show.artist} kind="artist" scale="micro"
        showInitials={false} grain={cfg.grain}
        width="100%" height="100%"
        style={{ position: "absolute", inset: 0 }} />

      {/* Label scrim — dark bottom gradient guarantees the print reads over
          both light and dark riso papers. */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: "62%",
        background: "linear-gradient(0deg, rgba(6,7,15,0.82) 0%, rgba(6,7,15,0.34) 46%, rgba(6,7,15,0) 100%)",
        pointerEvents: "none",
      }} />

      {/* Date stamp — top-left, mono, like an ink date punch */}
      <div style={{
        position: "absolute", left: cfg.stampRadius * 0.55, top: cfg.stampRadius * 0.55,
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
        fontSize: cfg.stampDate, lineHeight: 1.05,
        letterSpacing: "0.08em", color: "#fff",
        textShadow: "0 1px 4px rgba(0,0,0,0.55)",
      }}>
        {month}<br/>{String(day).padStart(2, "0")}
      </div>

      {/* Artist — bottom, print weight */}
      <div style={{
        position: "absolute", left: cfg.stampRadius * 0.6, right: cfg.stampRadius * 0.6,
        bottom: cfg.stampRadius * 0.55,
        fontFamily: "Inter, system-ui", fontWeight: 800,
        fontSize: cfg.stampArtist, lineHeight: 0.98,
        letterSpacing: "-0.02em", color: "#fff",
        textWrap: "balance",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>{show.artist}</div>
    </div>
  );
}

// A quiet "+N more" tile that finishes the wall when history overflows the grid.
function PassportMoreTile({ n, cfg }) {
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      borderRadius: cfg.stampRadius, overflow: "hidden",
      border: "1.5px dashed var(--border-strong)",
      background: "var(--surface-1)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: cfg.stampDate * 0.4,
      transform: `rotate(${pp_rot("more-tile")}deg)`,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 900,
        fontSize: cfg.statMid, letterSpacing: "-0.03em", color: "var(--fg)",
        lineHeight: 1,
      }}>+{n}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
        fontSize: cfg.stampDate, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--fg-muted)",
      }}>more</span>
    </div>
  );
}

// ── Glass pill (the "--scrim glassmorphism where relevant" bit) ─────────────
function PassportPill({ cfg, children, muted }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: cfg.pillGap,
      padding: `${cfg.pillPadV}px ${cfg.pillPadH}px`,
      borderRadius: 999,
      background: "var(--scrim)",
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.16)",
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase",
      color: muted ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.94)",
      whiteSpace: "nowrap", lineHeight: 1,
    }}>{children}</span>
  );
}

function PassportStat({ value, label, cfg, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cfg.statLabel * 0.32, minWidth: 0 }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 900,
        fontSize: typeof value === "number" ? cfg.statBig : cfg.statMid,
        letterSpacing: "-0.03em", lineHeight: 1,
        color: accent ? "var(--signal)" : "var(--fg)",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
        fontSize: cfg.statLabel, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--fg-muted)",
      }}>{label}</span>
    </div>
  );
}

// ── PassportCard ────────────────────────────────────────────────────────────
// Props:
//   mode   — "compact" | "share"
//   shows  — attended-show list (latest first). Defaults to H_SHOWS.
//   stats  — h_stats(shows). Recomputed from shows if absent.
//   handle — "@handle" printed in the header. Defaults to SHARE_USER.handle.
//   year   — passport year label. Defaults to 2026.
function PassportCard({ mode = "share", shows, stats, handle, year = 2026 }) {
  const cfg = PP_MODES[mode] || PP_MODES.share;
  const list = shows || (window.H_SHOWS || []);
  const st = stats || (window.h_stats ? window.h_stats(list) : { nights: 0, venues: 0, topGenre: null, first: null });
  const who = handle || (window.SHARE_USER ? window.SHARE_USER.handle : "@you").replace(/^@?/, "@");

  const capacity = cfg.cols * cfg.rows;
  const overflow = Math.max(0, list.length - capacity);
  // If we overflow, reserve the final slot for a "+N more" tile.
  const surfaced = overflow > 0 ? list.slice(0, capacity - 1) : list.slice(0, capacity);

  const since = st.first
    ? new Date(st.first.dateISO).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "America/Denver" })
    : null;

  return (
    <div style={{
      position: "relative", width: cfg.W, height: cfg.H, overflow: "hidden",
      borderRadius: cfg.radius, background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
    }}>
      {/* ── Identity-art stamp wall ─────────────────────────────── */}
      <div style={{
        position: "absolute",
        top: cfg.padTop, left: cfg.pad, right: cfg.pad, bottom: cfg.padBottom - cfg.gap,
        display: "grid",
        gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
        gridTemplateRows: `repeat(${cfg.rows}, 1fr)`,
        gap: cfg.gap,
      }}>
        {surfaced.map((s) => (
          <PassportStamp key={s.id} show={s} cfg={cfg} />
        ))}
        {overflow > 0 && <PassportMoreTile n={overflow} cfg={cfg} />}
      </div>

      {/* ── Header row — glass pills float over the top of the wall ── */}
      <div style={{
        position: "absolute", top: cfg.pad, left: cfg.pad, right: cfg.pad,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: cfg.pad, fontSize: cfg.headEyebrow,
      }}>
        <PassportPill cfg={cfg}>
          <span style={{
            width: cfg.pillGap * 1.1, height: cfg.pillGap * 1.1, borderRadius: "50%",
            background: "var(--signal)",
            boxShadow: "0 0 10px var(--signal)",
          }} />
          Passport · {year}
        </PassportPill>
        <span style={{ fontSize: cfg.headHandle }}>
          <PassportPill cfg={cfg} muted>{who}</PassportPill>
        </span>
      </div>

      {/* ── Bottom info panel — tokened scrim + glass fade ────────── */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: cfg.padBottom,
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 58%)",
        backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)",
        // mask keeps the blur/scrim only over the lower band so the wall above
        // stays crisp instead of getting a hard blurred seam.
        WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 42%)",
        maskImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 42%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", left: cfg.panelPadX, right: cfg.panelPadX, bottom: cfg.panelPadB,
        display: "flex", flexDirection: "column", gap: cfg.panelGap,
      }}>
        {/* Stat readout */}
        <div style={{
          display: "flex", alignItems: "flex-end", gap: cfg.panelPadX * 0.9,
        }}>
          <PassportStat value={st.nights} label={st.nights === 1 ? "night" : "nights"} cfg={cfg} accent />
          <PassportStat value={st.venues} label={st.venues === 1 ? "venue" : "venues"} cfg={cfg} />
          <PassportStat
            value={st.topGenre ? st.topGenre.name : "—"}
            label="top genre" cfg={cfg}
          />
        </div>

        {/* Footer — wordmark + since / overflow tag */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: cfg.pad,
          paddingTop: cfg.panelGap * 0.7,
          borderTop: "1px solid var(--border-strong)",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: cfg.wordmark, letterSpacing: "-0.035em",
            color: "var(--fg)", lineHeight: 1,
          }}>ConcertCrawl</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: cfg.footTag, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--fg-muted)", whiteSpace: "nowrap",
          }}>{since ? `since ${since}` : "your year in shows"}</span>
        </div>
      </div>
    </div>
  );
}

window.PassportCard = PassportCard;
window.PassportStamp = PassportStamp;
window.PP_MODES = PP_MODES;
