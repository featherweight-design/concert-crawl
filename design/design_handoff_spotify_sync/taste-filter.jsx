// taste-filter.jsx — R2 · taste-informed FilterBar control + Free-tier upsell
//
// Hugh's must-have: scope Browse to "shows by artists I follow" in one tap.
//
// Decisions (★ = my lean):
//   ★ A TOGGLE chip that leads the existing chip row — it's a scope/mode, so it
//     sits before the dimension chips (date/venue/price/genre) and reads as a
//     switch, not a sheet-opener (no chevron).
//   ★ ADDITIVE with the other filters (AND), not a separate mode — "Following +
//     Red Rocks + this weekend" all compose.
//   ★ Active state uses --signal (the shipped FilterBar active-chip color), so it
//     obeys the existing filter system. The Spotify mark keeps it identifiable.
//     --accent stays reserved for Watching; the chip never uses it.
//   Free tier: chip shows a lock; tapping opens the upsell (paid = premium/founder).
//
//   FollowFilterChip, FilterDimChip, TasteFilterBar, TasteFilterScreen, TasteUpsellSheet

const TF_ROWS = [
  { headline: "Sleep Token", subtitle: "Even In Arcadia Tour", venue: "Fillmore Auditorium", time: "8:00 PM", genres: ["metal", "prog"], price: "$42", hue: 280, followed: true },
  { headline: "Wednesday", subtitle: "with Lightning Bug", venue: "Mission Ballroom", time: "8:00 PM", genres: ["shoegaze", "indie"], price: "$30", hue: 160, followed: true },
  { headline: "Two Friends", subtitle: "Big Bootie Tour", venue: "Red Rocks", time: "7:00 PM", genres: ["electronic"], price: "$45", hue: 210, followed: false },
  { headline: "Geese", subtitle: "3D Country Tour", venue: "Ogden Theatre", time: "9:00 PM", genres: ["rock"], price: "$25", hue: 200, followed: true },
  { headline: "David Guetta", subtitle: "", venue: "Red Rocks", time: "8:00 PM", genres: ["house"], price: "$65", hue: 30, followed: false },
  { headline: "Mannequin Pussy", subtitle: "I Got Heaven Tour", venue: "Bluebird Theater", time: "8:30 PM", genres: ["punk"], price: "$28", hue: 330, followed: true },
];

function LockGlyph({ size = 11, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.2" y="5.4" width="7.6" height="5" rx="1.2" stroke={color} strokeWidth="1.3" />
      <path d="M4 5.4V4a2 2 0 014 0v1.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── The taste toggle chip ────────────────────────────────────────
function FollowFilterChip({ active = false, locked = false, onClick }) {
  const { SpotifyLogo } = window;
  if (locked) {
    return (
      <button onClick={onClick} style={{
        all: "unset", cursor: "pointer", boxSizing: "border-box",
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 11px 6px 9px", borderRadius: 999,
        background: "transparent", border: "1px dashed var(--border-strong)",
        color: "var(--fg-subtle)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12,
      }}>
        <SpotifyLogo size={15} radius={4} />
        <span>Following</span>
        <LockGlyph />
      </button>
    );
  }
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      all: "unset", cursor: "pointer", boxSizing: "border-box",
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 12px 6px 8px", borderRadius: 999,
      background: active ? "var(--signal)" : "transparent",
      border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
      color: active ? "var(--fg-on-accent)" : "var(--fg)",
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12,
    }}>
      <SpotifyLogo size={15} radius={4} />
      <span>Following</span>
      {active && <span style={{ fontSize: 12, lineHeight: 1, marginLeft: 1 }}>✕</span>}
    </button>
  );
}

// ── Dimension chip (static, for context) ────────────────────────
function FilterDimChip({ label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "6px 10px", borderRadius: 999,
      border: "1px solid var(--border-strong)", color: "var(--fg-muted)",
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
    }}>
      {label}
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
    </span>
  );
}

// ── Filter bar (matches the shipped Browse bar) ─────────────────
function TasteFilterBar({ active, locked, onToggle }) {
  return (
    <div style={{ padding: "0 16px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24, color: "var(--fg)", letterSpacing: "-0.03em" }}>What's on?</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>Denver, CO</div>
        </div>
        <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
          {["list", "cal"].map(v => (
            <span key={v} style={{ padding: "0 12px", display: "flex", alignItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", background: v === "list" ? "var(--signal)" : "transparent", color: v === "list" ? "var(--fg-on-accent)" : "var(--fg-muted)" }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <FollowFilterChip active={active} locked={locked} onClick={onToggle} />
        <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
        <FilterDimChip label="Date" />
        <FilterDimChip label="Venue" />
        <FilterDimChip label="Price" />
        <FilterDimChip label="Genre" />
      </div>
    </div>
  );
}

// ── Full browse screen wired to the toggle ──────────────────────
function TasteFilterScreen({ tier = "premium", active = false }) {
  const paid = tier === "premium" || tier === "founder";
  const locked = !paid;
  const showActive = paid && active;
  const rows = showActive ? TF_ROWS.filter(r => r.followed) : TF_ROWS;
  const followCount = TF_ROWS.filter(r => r.followed).length;
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "58px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <window.MMark size={26} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 32, background: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 13 }}>H</div>
      </div>
      <TasteFilterBar active={active} locked={locked} onToggle={() => {}} />
      {/* active scope banner */}
      {showActive && (
        <div style={{ margin: "0 16px 6px", padding: "8px 12px", borderRadius: 10, background: "color-mix(in oklch, var(--signal) 10%, var(--surface-1))", border: "1px solid color-mix(in oklch, var(--signal) 28%, var(--border))", display: "flex", alignItems: "center", gap: 8 }}>
          <window.SpotifyLogo size={16} radius={4} />
          <span style={{ fontSize: 12, color: "var(--fg)", fontWeight: 600 }}>{followCount} Denver shows by artists you follow</span>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
            <window.EventRowCC {...r} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Free-tier upsell (tapping the locked chip) ──────────────────
function TasteUpsellSheet() {
  const { SheetChrome, DragHandle, MonoEyebrow, TierBadge, SpotifyLogo, SignalButton } = window;
  return (
    <SheetChrome height="60%">
      <DragHandle />
      <div style={{ padding: "10px 22px 22px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SpotifyLogo size={24} radius={7} />
          <MonoEyebrow size={9} color="var(--signal)" letterSpacing="0.14em">TASTE FILTER · PREMIUM</MonoEyebrow>
        </div>
        <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 8 }}>
          Slice the whole calendar by your taste.
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.45, marginBottom: 16 }}>
          Filtering Denver down to just the artists you follow is a paid perk. Connecting Spotify and spotting the odd <b style={{ color: "var(--fg)" }}>Following</b> tag stays free — this is the power tool.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 8 }}>
          {[["Following", "Filter any view to your artists in one tap"], ["Taste picks", "A 'based on your taste' shelf on browse"], ["New-show alerts", "Push + a weekly Denver digest"]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ marginTop: 6, width: 5, height: 5, borderRadius: 5, background: "var(--signal)", flexShrink: 0 }} />
              <div><span style={{ fontSize: 13.5, fontWeight: 700 }}>{t} </span><span style={{ fontSize: 13, color: "var(--fg-muted)" }}>— {d}</span></div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <SignalButton>See plans</SignalButton>
          <div style={{ textAlign: "center" }}><MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.08em" style={{ textAlign: "center" }}>PREMIUM $5/MO · FOUNDER $3 LOCKED</MonoEyebrow></div>
        </div>
      </div>
    </SheetChrome>
  );
}

Object.assign(window, { FollowFilterChip, FilterDimChip, TasteFilterBar, TasteFilterScreen, TasteUpsellSheet });
