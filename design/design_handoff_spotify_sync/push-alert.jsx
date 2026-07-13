// push-alert.jsx — R2 · new-show push alerts (Premium; delivery behind #737)
//
// Fires when an artist you follow on Spotify announces a Denver date.
// Design is decoupled from #737's timeline; copy + rendering are ready.
//
// Decisions (★):
//   ★ Copy VARIES by the auto-watch setting (R1): auto-on states the outcome
//     ("added to your Watching"); highlight-only invites the tap ("want in?").
//   ★ Recognition voice, never surveillance — "just added a Denver date", never
//     "we saw you listen to…".
//   ★ v1 can ship push-only; once #737 lands the same event also drops into the
//     in-app notifications tray (shown here as InAppReceipt).
//
//   CCAppIcon, PushBanner, LockScreen, InAppReceipt, PUSH_COPY

// Fixed-brand app icon (OS chrome — not themed; hardcoded electric hex).
function CCAppIcon({ size = 40 }) {
  const trail = [[14,76,1.5],[24,70,2],[34,64,2.5],[42,58,3],[50,50,4],[58,42,5],[66,32,6]];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ borderRadius: size * 0.22, display: "block" }}>
      <rect width="96" height="96" fill="#070A1A" rx="22" />
      <circle cx="72" cy="24" r="20" fill="#FF7BD4" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="#FF7BD4" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="#7AE6FF" />
      {trail.map((d, i) => <circle key={i} cx={d[0]} cy={d[1]} r={d[2]} fill="#7AE6FF" opacity={0.35 + i * 0.09} />)}
    </svg>
  );
}

const PUSH_COPY = {
  autoOn:    { title: "Big Head Todd — new Denver date", body: "Fillmore · Oct 12. Added to your Watching." },
  highlight: { title: "Big Head Todd — new Denver date", body: "Fillmore · Oct 12. Want in? Tap to watch." },
  presale:   { title: "Presale: Turnstile at Mission", body: "Opens tomorrow, 10:00 AM. You're watching this one." },
};

// ── Notification banner (platform-styled) ───────────────────────
function PushBanner({ platform = "ios", title, body, app = "Concert Crawl", time = "now" }) {
  if (platform === "android") {
    return (
      <div style={{ borderRadius: 24, background: "rgba(28,28,32,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: "13px 15px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CCAppIcon size={16} />
          <span style={{ fontFamily: "Roboto, Inter, sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontWeight: 500, whiteSpace: "nowrap" }}>{app}</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>·</span>
          <span style={{ fontFamily: "Roboto, Inter, sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>{time}</span>
        </div>
        <div style={{ fontFamily: "Roboto, Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#fff", lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontFamily: "Roboto, Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2, lineHeight: 1.3 }}>{body}</div>
      </div>
    );
  }
  // iOS
  return (
    <div style={{ borderRadius: 22, background: "rgba(245,245,247,0.16)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 30px rgba(0,0,0,0.28)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <CCAppIcon size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "-apple-system, Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#fff", letterSpacing: "-0.01em" }}>{title}</span>
            <span style={{ fontFamily: "-apple-system, Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>{time}</span>
          </div>
          <div style={{ fontFamily: "-apple-system, Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 2, lineHeight: 1.3 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ── Full lock screen ────────────────────────────────────────────
function LockScreen({ platform = "ios", variant = "autoOn" }) {
  const c = PUSH_COPY[variant];
  const android = platform === "android";
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: 46, background: android
        ? "linear-gradient(165deg, #1a2436, #0c1420 55%, #060b14)"
        : "linear-gradient(165deg, #2a2440, #141024 50%, #0a0810)" }}>
      {/* status row */}
      <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 28px", fontFamily: android ? "Roboto, sans-serif" : "-apple-system, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
        <span>{android ? "" : "9:41"}</span>
        <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {android && <span style={{ marginRight: 6 }}>9:41</span>}
          <span style={{ fontSize: 11 }}>📶</span>
        </span>
      </div>
      {/* clock */}
      <div style={{ position: "absolute", top: android ? 92 : 74, left: 0, right: 0, textAlign: "center", color: "#fff" }}>
        <div style={{ fontFamily: android ? "Roboto, sans-serif" : "-apple-system, sans-serif", fontSize: android ? 15 : 20, fontWeight: android ? 500 : 590, opacity: 0.9, letterSpacing: "0.02em" }}>{android ? "Fri, Oct 3" : "Friday, October 3"}</div>
        <div style={{ fontFamily: android ? "Roboto, sans-serif" : "-apple-system, sans-serif", fontSize: android ? 78 : 88, fontWeight: android ? 400 : 300, lineHeight: 1, marginTop: android ? 0 : 2, letterSpacing: "-0.02em" }}>9:41</div>
      </div>
      {/* notification */}
      <div style={{ position: "absolute", left: 12, right: 12, top: android ? 250 : 300 }}>
        <PushBanner platform={platform} title={c.title} body={c.body} />
      </div>
      {/* home affordance */}
      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: android ? 0 : 138, height: 5, borderRadius: 5, background: "rgba(255,255,255,0.5)" }} />
      </div>
    </div>
  );
}

// ── In-app notifications tray (once #737 lands; token-themed) ───
function InAppReceipt() {
  const { SpotifyLogo, MonoEyebrow } = window;
  const items = [
    { title: "Big Head Todd — new Denver date", meta: "Fillmore · Oct 12 · added to Watching", time: "2m", src: true, unread: true },
    { title: "Presale: Turnstile at Mission", meta: "Opens tomorrow 10:00 AM", time: "3h", src: true, unread: true },
    { title: "Price drop — Sleep Token", meta: "$42 → $34 at Fillmore", time: "1d", src: false, unread: false },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "58px 18px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em", marginBottom: 4 }}>Notifications</div>
      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em" style={{ marginBottom: 14 }}>2 NEW</MonoEyebrow>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 11, padding: "13px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.src ? <SpotifyLogo size={22} radius={6} /> : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v3M9 13v3M2 9h3M13 9h3" stroke="var(--signal)" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="9" r="3" stroke="var(--signal)" strokeWidth="1.6"/></svg>}
              </div>
              {it.unread && <span style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 9, background: "var(--signal)", border: "2px solid var(--bg)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{it.title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{it.meta}</div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", flexShrink: 0, letterSpacing: "0.04em" }}>{it.time}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.5 }}>
        Follow-triggered alerts carry the Spotify mark, so it's always clear why you got them.
      </div>
    </div>
  );
}

Object.assign(window, { CCAppIcon, PushBanner, LockScreen, InAppReceipt, PUSH_COPY });
