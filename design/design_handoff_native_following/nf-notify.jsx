// nf-notify.jsx — where the preferences go, and what actually fires.
//
// Brief Q2 answer: nothing new. The shipped Settings ▸ Notifications screen
// already has the right shape (Push notifications · device enable · Watch
// updates · Price drops). Follow prefs are two more rows in the SAME list,
// because they're the same kind of promise. No "Following" settings section,
// no prefs hanging off a connection that native users don't have.

const { NFArt, Mono, NFPrimary, NFGhost, NFFollow, SpotifySlot, CCMark, NFWordmark,
  GlyphCheck, GlyphPlus, GlyphBell, GlyphEye, GlyphChevron, GlyphLock,
  Screen, ScreenShell, NFAppBar, NFTabBar, Sheet } = window;

// ── Settings row atoms (match the live screen) ──────────────────
function NFToggle({ on = true }) {
  return (
    <div role="switch" aria-checked={on} style={{ width: 46, height: 27, borderRadius: 27, flexShrink: 0, padding: 3,
      background: on ? "var(--signal)" : "var(--surface-3)", border: `1px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
      display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center" }}>
      <div style={{ width: 21, height: 21, borderRadius: 21, background: on ? "var(--fg-on-accent)" : "var(--fg-subtle)" }}/>
    </div>
  );
}
function SettingRow({ title, body, on = true, sub = false, isNew = false, disabled = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, padding: sub ? "13px 16px 13px 34px" : "15px 16px",
      borderRadius: sub ? 0 : 12, background: sub ? "transparent" : "var(--surface-1)",
      border: sub ? "none" : "1px solid var(--border)", borderTop: sub ? "1px solid var(--border)" : undefined,
      opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: sub ? 14 : 15.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>{title}</span>
          {isNew && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em",
            padding: "2px 6px", borderRadius: 4, color: "var(--signal)", border: "1px solid var(--signal)" }}>NEW</span>}
        </div>
        {body && <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.4, textWrap: "pretty" }}>{body}</div>}
      </div>
      <NFToggle on={on}/>
    </div>
  );
}

// ── Settings ▸ Notifications — mobile ──────────────────────────
// The two new rows sit ABOVE Watch updates: an artist announcement is the
// earliest signal in the chain, and reading top-down should feel like the
// funnel does (artist announces → you watch it → price moves).
function NotificationSettings({ narrow = false, tier = "premium", source = "native", deviceOff = true, autoWatch = false }) {
  const locked = window.nfLocked(tier);
  return (
    <Screen>
      <NFAppBar title="Notifications"/>
      <ScreenShell pad={narrow ? "14px 16px 24px" : "16px 16px 24px"} gap={11}>
        <SettingRow title="Push notifications" body="On for your account" on={true}/>
        {deviceOff && (
          <div style={{ padding: 15, borderRadius: 12, flexShrink: 0, background: "var(--surface-1)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>Notifications are on for your account, but not for this device yet.</div>
            <NFPrimary dense full={false} style={{ alignSelf: "flex-start" }}>Enable on this device</NFPrimary>
          </div>
        )}
        <div style={{ paddingTop: 6, flexShrink: 0 }}><Mono size={9.5}>Artists you follow</Mono></div>
        <div style={{ borderRadius: 12, flexShrink: 0, background: "var(--surface-1)", border: `1px solid ${locked ? "var(--border-strong)" : "var(--border)"}`, overflow: "hidden" }}>
          {locked ? (
            <div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <span style={{ color: "var(--signal)", marginTop: 2 }}><GlyphLock size={15}/></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>New show alerts</div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.4, textWrap: "pretty" }}>Following artists is part of Premium. Upgrade and these switch on.</div>
                </div>
              </div>
              <NFGhost dense>See Premium</NFGhost>
            </div>
          ) : (
            <>
              <div style={{ padding: "15px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>New show alerts</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 4, color: "var(--signal)", border: "1px solid var(--signal)" }}>NEW</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.4, textWrap: "pretty" }}>An artist you follow books a Denver date. Sent when we find it, not on a schedule.</div>
                </div>
                <NFToggle on={true}/>
              </div>
              <SettingRow sub title="Add them to Watching for me" body="Off means you get the ping and decide yourself." on={autoWatch}/>
            </>
          )}
        </div>
        <SettingRow title="Weekly digest" body="One email Friday morning with everything your artists have coming up." on={true} isNew/>
        <div style={{ paddingTop: 6, flexShrink: 0 }}><Mono size={9.5}>Shows you're watching</Mono></div>
        <SettingRow title="Watch updates" body="Price drops, sell-outs, date changes, cancellations. For shows you're watching." on={true}/>
        <SettingRow title="Price drops" body="A separate ping the moment a watched show gets cheaper." on={true}/>
        {source === "spotify" && (
          <div style={{ marginTop: 6, padding: "13px 14px", borderRadius: 10, flexShrink: 0, border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ marginTop: 1 }}><SpotifySlot size={13}/></div>
            <div style={{ flex: 1, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
              These cover artists from Spotify too. One set of switches, whatever filled the list. Manage the connection in <span style={{ color: "var(--signal)", fontWeight: 600 }}>Connections</span>.
            </div>
          </div>
        )}
      </ScreenShell>
    </Screen>
  );
}

// ── First-watch nudge — three directions (brief Q5) ─────────────
// The card fires once, right after a user's first Watch. Today it's a Spotify
// pitch end to end. All three keep the single-fire rule and the dismissable
// card geometry; they differ in what the ask IS.
const NUDGE_COPY = {
  artist: {
    label: "A · Artist-anchored",
    eyebrow: "Nice pick",
    title: "Follow Amyl and The Sniffers?",
    body: "You just watched their Gothic Theatre date. Follow them and we'll flag the next one too. Denver only, no tour-wide spam.",
    cta: "Follow Amyl and The Sniffers",
    alt: "Not right now",
    why: "★ Recommended. Concrete, one tap, one artist — and it teaches the mechanic by doing it once. The artist is already on screen, so there's nothing to search for.",
  },
  alerts: {
    label: "B · Alert-anchored",
    eyebrow: "One more thing",
    title: "Want a heads-up next time?",
    body: "Follow the artists you care about and we'll ping you the moment they announce a Denver date. Most people find out from a sold-out repost.",
    cta: "Pick artists to follow",
    alt: "Maybe later",
    why: "Sells the benefit, not the button — but sends the user off to a picker, so the first follow is two screens away instead of one tap.",
  },
  inline: {
    label: "C · No card — inline on the confirmation",
    // No eyebrow. R2 had "Watching" sitting above "Watching this show." —
    // two layers saying one thing. The confirmation IS the header here.
    eyebrow: null,
    title: "Watching this show.",
    body: "Follow the artist too and you'll hear about every Denver date, not just this one.",
    cta: "Follow the artist",
    alt: null,
    why: "Zero interruption, and it never nags. But it's easy to miss, and the nudge slot is the one place we know a new user is paying attention.",
  },
};
function FirstWatchNudge({ variant = "artist", tier = "premium" }) {
  const c = NUDGE_COPY[variant];
  if (variant === "inline") return (
    <div style={{ borderRadius: 12, border: "1px solid var(--accent)", background: "var(--surface-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px" }}>
        <span style={{ color: "var(--accent)" }}><GlyphEye size={16}/></span>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>{c.title}</span>
      </div>
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{c.body}</div>
        <NFFollow state={window.nfLocked(tier) ? "locked" : "idle"} size="sm"/>
      </div>
    </div>
  );
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--border-strong)", background: "var(--surface-1)", padding: 16, display: "flex", flexDirection: "column", gap: 13, position: "relative" }}>
      <div style={{ position: "absolute", top: 12, right: 13, fontSize: 17, color: "var(--fg-subtle)", cursor: "pointer", lineHeight: 1 }} aria-label="Dismiss">×</div>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {variant === "artist"
          ? <NFArt name="Amyl and The Sniffers" size={46} radius={9}/>
          : <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--signal)" }}><GlyphBell size={20}/></div>}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
          <Mono size={9} color="var(--signal)">{c.eyebrow}</Mono>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.025em", marginTop: 5, lineHeight: 1.15 }}>{c.title}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{c.body}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <NFPrimary dense>{window.nfLocked(tier) ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphLock size={12}/>{c.cta}</span> : c.cta}</NFPrimary>
        <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 600, color: "var(--fg-subtle)", cursor: "pointer" }}>{c.alt}</div>
      </div>
    </div>
  );
}
function NudgeInContext({ variant = "artist", tier = "premium" }) {
  return (
    <Screen>
      <NFAppBar/>
      <ScreenShell pad="14px 16px 20px" gap={13}>
        <FirstWatchNudge variant={variant} tier={tier}/>
        <div style={{ paddingTop: 4 }}><Mono size={9.5}>Tonight · fri aug 21</Mono></div>
        {window.NF_EVENTS.slice(0, 3).map(e => <window.NFEventRow key={e.artist} e={e}/>)}
      </ScreenShell>
      <NFTabBar active={0}/>
    </Screen>
  );
}

// ── Push alert — crawl-triggered, so the copy names the trigger ─
const NF_PUSH = {
  autoOff: { title: "Amyl and The Sniffers · Denver", body: "Sat Aug 29 at Gothic Theatre. $28. Want in?" },
  autoOn:  { title: "Amyl and The Sniffers · Denver", body: "Sat Aug 29 at Gothic Theatre. Added to your Watching." },
  many:    { title: "3 artists you follow just booked Denver", body: "Amyl and The Sniffers, Wednesday and Turnstile. Tap for dates." },
};
function LockScreenMock({ variant = "autoOff", platform = "ios" }) {
  const c = NF_PUSH[variant];
  const ios = platform === "ios";
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg,#141024 0%,#241a30 45%,#0d0a16 100%)", padding: "0 14px", display: "flex", flexDirection: "column" }}>
      <div style={{ paddingTop: 62, textAlign: "center", color: "rgba(255,255,255,0.92)", fontFamily: ios ? "Inter, system-ui" : "Roboto, system-ui" }}>
        <div style={{ fontSize: 15, fontWeight: 500, opacity: 0.7 }}>Friday, August 21</div>
        <div style={{ fontSize: ios ? 74 : 62, fontWeight: ios ? 300 : 400, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 2 }}>9:41</div>
      </div>
      <div style={{ marginTop: 34, borderRadius: ios ? 20 : 26, padding: ios ? "13px 14px" : "14px 16px",
        background: ios ? "rgba(255,255,255,0.16)" : "rgba(28,28,32,0.94)", backdropFilter: "blur(20px)",
        border: ios ? "1px solid rgba(255,255,255,0.14)" : "none",
        display: "flex", gap: 11, alignItems: "flex-start", fontFamily: ios ? "Inter, system-ui" : "Roboto, system-ui" }}>
        <div style={{ width: 34, height: 34, borderRadius: ios ? 9 : 34, overflow: "hidden", flexShrink: 0, background: "#070A1A" }}>
          <div style={{ "--bg": "#070A1A", "--accent": "#FF7BD4", "--signal": "#7AE6FF" }}><CCMark size={34}/></div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{ios ? "CONCERT CRAWL" : "Concert Crawl"}</span>
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>now</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginTop: 3, letterSpacing: "-0.01em" }}>{c.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 2, lineHeight: 1.35 }}>{c.body}</div>
        </div>
      </div>
    </div>
  );
}

// ── In-app notification row (post-#737 tray) ───────────────────
function TrayRows() {
  const rows = [
    { unread: true, artist: "Amyl and The Sniffers", kind: "New date", body: "Gothic Theatre · Sat Aug 29 · $28", when: "2m", source: "native" },
    { unread: true, artist: "Turnstile", kind: "New date", body: "Mission Ballroom · Fri Oct 17 · $45", when: "1h", source: "native" },
    { unread: false, artist: "The Beths", kind: "New date", body: "Ogden Theatre · Sat Nov 8 · $32", when: "2d", source: "spotify" },
    { unread: false, artist: "Wednesday", kind: "Price drop", body: "$25 → $19 at Bluebird Theater", when: "3d", source: "watch" },
  ];
  return (
    <Screen>
      <NFAppBar title="Notifications" action={<Mono size={9.5} color="var(--signal)">Mark all read</Mono>}/>
      <ScreenShell pad="0 0 8px" gap={0}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none",
            background: r.unread ? "var(--surface-1)" : "transparent" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <NFArt name={r.artist} size={44} radius={8}/>
              {r.unread && <div style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 9, background: "var(--signal)", border: "2px solid var(--bg)" }}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: r.kind === "Price drop" ? "var(--success)" : "var(--signal)" }}>{r.kind}</span>
                {r.source === "spotify" && <SpotifySlot size={9}/>}
                {r.source === "watch" && <span style={{ color: "var(--accent)" }}><GlyphEye size={11}/></span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: r.unread ? 800 : 600, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.artist}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.body}</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", flexShrink: 0 }}>{r.when}</div>
          </div>
        ))}
      </ScreenShell>
      <NFTabBar active={0}/>
    </Screen>
  );
}

// ── Weekly digest email — native rewrite ───────────────────────
// Email clients can't read CSS vars, so this is the one place we use inline
// hex (electric-derived), same exception the Spotify digest took.
const D = { bg: "#070A1A", card: "#11162E", line: "#1F2748", fg: "#E8F3FF", mut: "#9AA8C7", sub: "#5A6788", sig: "#7AE6FF", acc: "#FF7BD4", ink: "#070A1A" };
function DigestEmail({ zero = false }) {
  const shows = [
    { a: "Amyl and The Sniffers", v: "Gothic Theatre", d: "Sat Aug 29", p: "$28" },
    { a: "MJ Lenderman", v: "Gothic Theatre", d: "Tue Sep 30", p: "$32" },
    { a: "Wednesday", v: "Bluebird Theater", d: "Wed Sep 3", p: "$25" },
    { a: "Geese", v: "Marquis Theater", d: "Sun Sep 21", p: "$24" },
    { a: "Turnstile", v: "Mission Ballroom", d: "Fri Oct 17", p: "$45" },
  ];
  const mono = "'JetBrains Mono', Consolas, monospace";
  return (
    <table cellPadding="0" cellSpacing="0" border="0" width="100%" style={{ background: D.bg, fontFamily: "Inter, Helvetica, Arial, sans-serif", borderCollapse: "collapse" }}>
      <tbody>
        <tr><td style={{ padding: "26px 24px 18px" }}>
          <table cellPadding="0" cellSpacing="0" border="0"><tbody><tr>
            <td style={{ paddingRight: 9 }}><div style={{ "--bg": D.bg, "--accent": D.acc, "--signal": D.sig, lineHeight: 0 }}><CCMark size={26}/></div></td>
            <td style={{ fontSize: 16, fontWeight: 800, color: D.fg, letterSpacing: "-0.02em" }}>concert<span style={{ color: D.acc }}>crawl.</span></td>
          </tr></tbody></table>
        </td></tr>
        <tr><td style={{ padding: "0 24px 6px", fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: D.sig }}>
          {zero ? "Your artists · quiet week" : "Your artists · week of aug 21"}
        </td></tr>
        <tr><td style={{ padding: "0 24px 10px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: D.fg }}>
          {zero ? "Nobody you follow is playing." : "Five of your artists are in town."}
        </td></tr>
        <tr><td style={{ padding: "0 24px 20px", fontSize: 14, lineHeight: 1.5, color: D.mut }}>
          {zero
            ? "Not a single Denver date from your 7 artists this week. Here are two acts you might want on the list instead."
            : "Everything below is an artist you follow with a Denver date on the books. Newest announcements first."}
        </td></tr>
        {(zero ? shows.slice(0, 2) : shows).map((s, i) => (
          <tr key={s.a}><td style={{ padding: "0 24px 9px" }}>
            <table cellPadding="0" cellSpacing="0" border="0" width="100%" style={{ background: D.card, borderRadius: 10, borderCollapse: "separate" }}>
              <tbody><tr>
                <td width="62" style={{ padding: 12, verticalAlign: "top" }}>
                  <div style={{ width: 62, height: 62, borderRadius: 8, background: `linear-gradient(135deg, oklch(0.38 0.10 ${window.nfHue(s.a)}), oklch(0.20 0.06 ${window.nfHue(s.a) + 45}))` }}/>
                </td>
                <td style={{ padding: "12px 12px 12px 0", verticalAlign: "top" }}>
                  {!zero && i < 2 && <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: D.sig, paddingBottom: 4 }}>JUST ANNOUNCED</div>}
                  {zero && <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: D.sub, paddingBottom: 4 }}>NOT FOLLOWING YET</div>}
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: D.fg, letterSpacing: "-0.02em" }}>{s.a}</div>
                  <div style={{ fontFamily: mono, fontSize: 10.5, color: D.mut, letterSpacing: "0.06em", paddingTop: 4 }}>{s.d.toUpperCase()} · {s.v.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: D.fg, paddingTop: 6 }}>{s.p}
                    <a href="#" style={{ color: D.sig, textDecoration: "none", fontWeight: 700, paddingLeft: 10 }}>{zero ? "Follow →" : "See show →"}</a>
                  </div>
                </td>
              </tr></tbody>
            </table>
          </td></tr>
        ))}
        {!zero && <tr><td style={{ padding: "6px 24px 0", fontSize: 13, color: D.mut }}>
          <a href="#" style={{ color: D.sig, textDecoration: "none", fontWeight: 700 }}>+ 2 more shows in October →</a>
        </td></tr>}
        <tr><td style={{ padding: "24px 24px 0" }}><div style={{ height: 1, background: D.line }}/></td></tr>
        <tr><td style={{ padding: "16px 24px 26px", fontSize: 11.5, lineHeight: 1.55, color: D.sub }}>
          You follow 7 artists. <a href="#" style={{ color: D.mut, textDecoration: "underline" }}>Manage who</a> · <a href="#" style={{ color: D.mut, textDecoration: "underline" }}>Turn off the weekly digest</a><br/>
          <span style={{ color: "#3D4763" }}>Concert Crawl · Denver, CO · <a href="#" style={{ color: "#3D4763", textDecoration: "underline" }}>all email settings</a></span>
        </td></tr>
      </tbody>
    </table>
  );
}
// The HTML digest has a `zero` state, so the text part needs one too: an
// HTML/plain-text disagreement is a defect, not a formatting detail.
function DigestPlainText({ zero = false }) {
  const lines = zero ? [
    "CONCERT CRAWL: YOUR ARTISTS, QUIET WEEK",
    "",
    "Nobody you follow is playing.",
    "",
    "Not a single Denver date from your 7 artists this week. Here are two acts",
    "you might want on the list instead.",
    "",
    "NOT FOLLOWING YET",
    "1. Amyl and The Sniffers, Sat Aug 29, Gothic Theatre, $28",
    "2. MJ Lenderman, Tue Sep 30, Gothic Theatre, $32",
    "",
    "Follow them: concertcrawl.app/artists",
    "",
    "---",
    "You follow 7 artists. Manage who: concertcrawl.app/artists",
    "Turn off the weekly digest: concertcrawl.app/settings/notifications",
  ] : [
    "CONCERT CRAWL: YOUR ARTISTS, WEEK OF AUG 21",
    "",
    "Five of your artists are in town.",
    "",
    "JUST ANNOUNCED",
    "1. Amyl and The Sniffers, Sat Aug 29, Gothic Theatre, $28",
    "2. MJ Lenderman, Tue Sep 30, Gothic Theatre, $32",
    "",
    "ALSO COMING UP",
    "3. Wednesday, Wed Sep 3, Bluebird Theater, $25",
    "4. Geese, Sun Sep 21, Marquis Theater, $24",
    "5. Turnstile, Fri Oct 17, Mission Ballroom, $45",
    "",
    "+2 more in October: concertcrawl.app/artists",
    "",
    "---",
    "You follow 7 artists. Manage who: concertcrawl.app/artists",
    "Turn off the weekly digest: concertcrawl.app/settings/notifications",
  ];
  return (
    <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.65, color: "var(--fg-muted)", whiteSpace: "pre-wrap" }}>{lines.join("\n")}</pre>
  );
}

Object.assign(window, {
  NFToggle, SettingRow, NotificationSettings, NUDGE_COPY, FirstWatchNudge, NudgeInContext,
  NF_PUSH, LockScreenMock, TrayRows, DigestEmail, DigestPlainText,
});
