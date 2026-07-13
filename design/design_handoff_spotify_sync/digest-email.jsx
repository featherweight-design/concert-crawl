// digest-email.jsx — R2 · weekly digest email (Premium), #783 email family
//
// EMAIL CONSTRAINT: email clients don't support CSS custom properties, so this
// is the ONE place we use inline hex, not var(--*). Single branded palette
// (electric-derived) — email isn't per-user themed. Table layout, mobile-first,
// with a plain-text fallback. This does NOT break the token rule (that governs
// app screens); it's an email.
//
// Decisions (★):
//   ★ Feature up to 5 shows, then "+N more this week" → opens the web list.
//   ★ Zero week: still send, but LIGHT — a calm zero note + 2 taste picks so the
//     email always earns its open (never a blank "nothing this week").
//   ★ Unsubscribe: per-family (turn off just this digest) sits first; a global
//     "all emails" link is secondary. Granular by default.
//
//   DigestEmail({ zero }), DigestPlainText

const DE_C = {
  page: "#04050C", card: "#0B0E20", surf: "#11162E", surf2: "#171D3A",
  border: "#242C4E", fg: "#E8F3FF", muted: "#9AA8C7", subtle: "#5A6788",
  signal: "#7AE6FF", accent: "#FF7BD4", onSignal: "#070A1A",
};
const DE_SHOWS = [
  { artist: "Sleep Token", tour: "Even In Arcadia Tour", venue: "Fillmore Auditorium", date: "Thu · Jul 17", price: "$42", hue: 280 },
  { artist: "Wednesday", tour: "with Lightning Bug", venue: "Mission Ballroom", date: "Fri · Jul 18", price: "$30", hue: 160 },
  { artist: "Geese", tour: "3D Country Tour", venue: "Ogden Theatre", date: "Sat · Jul 19", price: "$25", hue: 200 },
  { artist: "Mannequin Pussy", tour: "I Got Heaven Tour", venue: "Bluebird Theater", date: "Sun · Jul 20", price: "$28", hue: 330 },
];

function DEArt({ hue, size = 56 }) {
  return <div style={{ width: size, height: size, borderRadius: 8, background: `linear-gradient(135deg, hsl(${hue} 45% 40%), hsl(${hue + 40} 40% 26%))` }} />;
}
function DEWordmark() {
  return (
    <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 17, color: DE_C.fg, letterSpacing: "-0.02em" }}>
      concert<span style={{ color: DE_C.accent }}>crawl.</span>
    </span>
  );
}

function DEShowRow({ s, last }) {
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
      <tbody>
        <tr>
          <td style={{ padding: "14px 0", borderBottom: last ? "none" : `1px solid ${DE_C.border}`, verticalAlign: "top" }}>
            <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr>
              <td width="56" style={{ verticalAlign: "top" }}><DEArt hue={s.hue} /></td>
              <td style={{ verticalAlign: "top", padding: "0 10px" }}>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 700, fontSize: 15, color: DE_C.fg, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{s.artist}</div>
                {s.tour && <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 12.5, color: DE_C.muted, marginTop: 2 }}>{s.tour}</div>}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: DE_C.muted, marginTop: 5, letterSpacing: "0.02em" }}>{s.venue} · {s.date}</div>
              </td>
              <td width="70" style={{ verticalAlign: "top", textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: DE_C.signal }}>{s.price}</div>
                <a href="#" style={{ display: "inline-block", marginTop: 7, fontFamily: "Inter, Arial, sans-serif", fontSize: 11, fontWeight: 700, color: DE_C.signal, textDecoration: "none", border: `1px solid ${DE_C.border}`, borderRadius: 7, padding: "5px 10px" }}>View</a>
              </td>
            </tr></tbody></table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function DigestEmail({ zero = false }) {
  const count = DE_SHOWS.length + 1; // +1 "more"
  return (
    <div style={{ background: DE_C.page, padding: "22px 0", fontFamily: "Inter, Arial, sans-serif" }}>
      <table role="presentation" width="600" cellPadding="0" cellSpacing="0" align="center" style={{ width: 600, maxWidth: "100%", margin: "0 auto", background: DE_C.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${DE_C.border}` }}>
        <tbody>
          {/* header */}
          <tr><td style={{ padding: "20px 24px 0" }}>
            <table role="presentation" width="100%"><tbody><tr>
              <td><DEWordmark /></td>
              <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.14em", color: DE_C.subtle, textTransform: "uppercase" }}>Weekly · Spotify</td>
            </tr></tbody></table>
          </td></tr>

          {zero ? (
            <>
              <tr><td style={{ padding: "22px 24px 6px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em", color: DE_C.subtle, textTransform: "uppercase", marginBottom: 10 }}>This week in Denver</div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 900, fontSize: 25, color: DE_C.fg, letterSpacing: "-0.02em", lineHeight: 1.15 }}>A quiet one for your artists.</div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 14, color: DE_C.muted, lineHeight: 1.5, marginTop: 8 }}>Nobody you follow is playing Denver this week. Here's a couple we think you'd click with anyway.</div>
              </td></tr>
              <tr><td style={{ padding: "10px 24px 4px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.14em", color: DE_C.subtle, textTransform: "uppercase", marginBottom: 2 }}>Based on your taste</div>
                <DEShowRow s={DE_SHOWS[0]} />
                <DEShowRow s={DE_SHOWS[2]} last />
              </td></tr>
            </>
          ) : (
            <>
              <tr><td style={{ padding: "22px 24px 6px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em", color: DE_C.subtle, textTransform: "uppercase", marginBottom: 10 }}>This week in Denver</div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 900, fontSize: 25, color: DE_C.fg, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                  <span style={{ color: DE_C.signal }}>5 shows</span> by artists you follow.
                </div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 14, color: DE_C.muted, lineHeight: 1.5, marginTop: 8 }}>The ones you told Spotify you love — all playing Denver in the next 7 days.</div>
              </td></tr>
              <tr><td style={{ padding: "6px 24px 4px" }}>
                {DE_SHOWS.map((s, i) => <DEShowRow key={i} s={s} />)}
                <table role="presentation" width="100%"><tbody><tr><td style={{ padding: "13px 0 2px", textAlign: "center" }}>
                  <a href="#" style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 13, fontWeight: 700, color: DE_C.signal, textDecoration: "none" }}>+1 more this week →</a>
                </td></tr></tbody></table>
              </td></tr>
            </>
          )}

          {/* CTA */}
          <tr><td style={{ padding: "8px 24px 20px" }}>
            <table role="presentation" width="100%"><tbody><tr><td style={{ textAlign: "center" }}>
              <a href="#" style={{ display: "block", background: DE_C.signal, color: DE_C.onSignal, fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 14, textDecoration: "none", padding: "13px", borderRadius: 12 }}>Open Concert Crawl</a>
            </td></tr></tbody></table>
          </td></tr>

          {/* footer */}
          <tr><td style={{ padding: "16px 24px 22px", borderTop: `1px solid ${DE_C.border}` }}>
            <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 11.5, color: DE_C.subtle, lineHeight: 1.6 }}>
              You get this because you follow artists on Spotify and turned on the weekly digest.<br />
              <a href="#" style={{ color: DE_C.muted, textDecoration: "underline" }}>Turn off the weekly digest</a> &nbsp;·&nbsp; <a href="#" style={{ color: DE_C.subtle, textDecoration: "underline" }}>all email settings</a>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: DE_C.subtle, marginTop: 12, letterSpacing: "0.04em" }}>Concert Crawl · Denver, CO</div>
          </td></tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Plain-text fallback ─────────────────────────────────────────
function DigestPlainText() {
  const txt = `CONCERT CRAWL — This week in Denver
========================================

5 shows by artists you follow on Spotify,
all playing Denver in the next 7 days.

- Sleep Token — Even In Arcadia Tour
  Fillmore Auditorium · Thu Jul 17 · $42
  ${"https://concertcrawl.app/e/sleep-token"}

- Wednesday — with Lightning Bug
  Mission Ballroom · Fri Jul 18 · $30

- Geese — 3D Country Tour
  Ogden Theatre · Sat Jul 19 · $25

- Mannequin Pussy — I Got Heaven Tour
  Bluebird Theater · Sun Jul 20 · $28

+1 more this week → https://concertcrawl.app/browse

----------------------------------------
You get this because you follow artists on
Spotify and turned on the weekly digest.
Turn off the weekly digest:  {link}
All email settings:          {link}
Concert Crawl · Denver, CO`;
  return (
    <pre style={{ margin: 0, padding: "18px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--fg-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowX: "auto" }}>{txt}</pre>
  );
}

Object.assign(window, { DigestEmail, DigestPlainText });
