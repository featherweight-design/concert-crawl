// notifications-chrome.jsx — #737 placement within "no new persistent nav slots"
//
// Three placements, mocked side-by-side in §1 of the canvas:
//   A  Nested (Hugh's)   pip on the profile affordance → menu → "Notifications" row → panel
//   B  Inbox strip  ★    pip on the profile affordance → menu LEADS with unread preview → panel
//   C  Profile sub-tab   pip on the profile affordance → profile page gains an "Alerts" segment
//
// ★ = recommended. All three obey the fence: the bell owns no nav slot of its
// own. Mobile's "profile affordance" is the existing `me` bottom-nav tab;
// desktop's is the existing top-right avatar. Nothing is added to either bar.
//
// The pip is --signal (status color), 8px, with a 2px ring in the bar's own
// background so it holds AA separation on Electric / Jade / Light alike.

// ── Pip ──────────────────────────────────────────────────────────
function NotifPip({ size = 8, ring = "var(--bg)", ringW = 2, animate = true, style }) {
  return (
    <span className={animate ? "notif-pip" : undefined} aria-hidden="true" style={{
      width: size, height: size, borderRadius: size,
      background: "var(--signal)",
      boxShadow: `0 0 0 ${ringW}px ${ring}`,
      animation: animate ? "notifPip 2.4s ease-in-out infinite" : "none",
      ...style,
    }}/>
  );
}

// ── Avatar — the existing account affordance, pip added ──────────
// variant="flat"  the real desktop account disc from browse-desktop.jsx's
//                 TopNavBD (36px, --surface-2 / --border, initials at 700/13).
// variant="halo"  the menu-header avatar from user-menu.jsx's UMAvatar.
// Only the pip is new. Neither disc is restyled.
function NotifAvatarButton({ initial = "JR", size = 36, unread = 0, onClick,
  ring = "var(--bg-elevated)", variant = "flat" }) {
  const halo = variant === "halo";
  return (
    <button type="button" onClick={onClick}
      aria-label={window.NOTIF_COPY.bellLabel(unread)}
      aria-haspopup="dialog"
      style={{
        all: "unset", cursor: "pointer", position: "relative", boxSizing: "border-box",
        width: size, height: size, borderRadius: size / 2,
        background: "var(--surface-2)",
        border: `1px solid ${halo ? "var(--border-strong)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: halo ? "var(--fg)" : "var(--fg-muted)", fontFamily: "Inter, system-ui",
        fontWeight: halo ? 800 : 700, fontSize: halo ? size * 0.42 : 13, flexShrink: 0,
      }}>
      {halo && <span aria-hidden="true" style={{
        position: "absolute", inset: -2, borderRadius: (size + 4) / 2,
        background: "radial-gradient(circle at 30% 30%, var(--accent) 0%, transparent 70%)",
        opacity: 0.35, pointerEvents: "none",
      }}/>}
      <span style={{ position: "relative" }}>{initial}</span>
      {unread > 0 && <NotifPip ring={ring} style={{ position: "absolute", top: -1, right: -1 }}/>}
    </button>
  );
}

// ── Mobile header — unchanged from browse-home.jsx AppBar ────────
function CCAppBar({ pad = "62px 16px 10px" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: pad, background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <window.CCMark size={28}/>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
          color: "var(--fg)", letterSpacing: "-0.02em" }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 18, border: "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5"/>
          <path d="M11 11L14.5 14.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// ── Mobile bottom nav — TabBarCC, with the pip riding `me` ───────
const TAB_ICONS = [
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
];
function CCTabBar({ active = 0, unread = 0, onMe }) {
  const labels = ["browse", "search", "watching", "me"];
  return (
    <div style={{ height: 52, borderTop: "1px solid var(--border)", display: "flex",
      alignItems: "center", justifyContent: "space-around",
      background: "var(--bg-elevated)", flexShrink: 0, paddingBottom: 2 }}>
      {labels.map((label, i) => {
        const isMe = i === 3, piped = isMe && unread > 0;
        return (
          <button type="button" key={label} onClick={isMe ? onMe : undefined}
            aria-label={piped ? `${label}. ${window.NOTIF_COPY.pipLabel}` : label}
            aria-current={i === active ? "page" : undefined}
            style={{ all: "unset", cursor: "pointer", position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              minWidth: 56, minHeight: 44, justifyContent: "center",
              color: i === active ? "var(--signal)" : "var(--fg-subtle)" }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              {TAB_ICONS[i]}
              {piped && <NotifPip ring="var(--bg-elevated)"
                style={{ position: "absolute", top: -2, right: -4 }}/>}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              fontWeight: i === active ? 700 : 500, letterSpacing: "0.04em" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Inbox strip — Option B's payoff: unread visible at first tap ──
function InboxStrip({ items, onSeeAll, max = 2 }) {
  const C = window.NOTIF_COPY;
  const unread = items.filter((n) => !n.read);
  const n = unread.length;
  if (!n) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        minHeight: 44, boxSizing: "border-box",
        borderBottom: "1px solid var(--border)", cursor: "pointer" }}
        role="button" tabIndex={0} onClick={onSeeAll}>
        <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6,
          background: "var(--surface-2)", display: "inline-flex", alignItems: "center",
          justifyContent: "center", color: "var(--fg-muted)", flexShrink: 0 }}>
          <window.NGlyph name="bell" size={11}/>
        </span>
        <span style={{ flex: 1, fontFamily: "Inter, system-ui", fontSize: 13.5,
          fontWeight: 600, color: "var(--fg)" }}>{C.menuRow}</span>
        <window.NMono>{C.markedAll}</window.NMono>
      </div>
    );
  }
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 6px" }}>
        <window.NMono color="var(--signal)">{C.panelTitle}</window.NMono>
        <NotifPip size={6} ring="var(--bg-elevated)" animate={false}/>
        <span style={{ flex: 1 }}/>
        <window.NMono ls="0.1em">{C.panelSub(n)}</window.NMono>
      </div>
      {unread.slice(0, max).map((it) => <window.NotifItem key={it.id} n={it} compact/>)}
      <button type="button" onClick={onSeeAll} style={{
        all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 6, width: "100%", boxSizing: "border-box",
        padding: "11px 14px", fontFamily: "Inter, system-ui", fontSize: 12.5,
        fontWeight: 700, color: "var(--signal)" }}>
        {C.seeAll(n)}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Menu row (Option A) ──────────────────────────────────────────
function MenuNotifRow({ count, onClick }) {
  const C = window.NOTIF_COPY;
  return (
    <div role="button" tabIndex={0} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
      minHeight: 44, boxSizing: "border-box",
      borderBottom: "1px solid var(--border)", cursor: "pointer",
      background: count ? "var(--overlay-hover)" : "transparent" }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6,
        background: "var(--surface-2)", display: "inline-flex", alignItems: "center",
        justifyContent: "center", color: count ? "var(--signal)" : "var(--fg-muted)", flexShrink: 0 }}>
        <window.NGlyph name="bell" size={11}/>
      </span>
      <span style={{ flex: 1, fontFamily: "Inter, system-ui", fontSize: 13.5,
        fontWeight: count ? 800 : 600, color: "var(--fg)" }}>{C.menuRow}</span>
      {count > 0 && <window.NMono color="var(--signal)" ls="0.1em">{C.panelSub(count)}</window.NMono>}
    </div>
  );
}

// ── The shipped user menu, faithful ─────────────────────────────
// Mirrors the live desktop menu: identity card (avatar + BETA · FOUNDER +
// email + collapse chevron) → YOU / Submitted prices · APP / Theme · Settings
// → OPERATIONS / Admin → Sign out → build footer with What's new.
//
// #737 adds exactly one thing: the notifications section directly under the
// identity card. Everything below it is untouched.
//
// mode: "strip"  unread preview inline (recommended)
//       "row"    a plain "Notifications" row (option A)
//       "panel"  the full panel swapped in place, with a back row
function MenuEyebrow({ children }) {
  return <div style={{ padding: "10px 14px 4px", background: "var(--bg-elevated)" }}>
    <window.NMono>{children}</window.NMono></div>;
}
function MenuRow({ label, meta, kbd, danger, leading, trailing, onClick, last }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", minHeight: 44,
      borderBottom: last ? "none" : "1px solid var(--border)", cursor: "pointer", boxSizing: "border-box" }}>
      {leading}
      <span style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontSize: 13.5,
        fontWeight: 600, color: danger ? "var(--warning)" : "var(--fg)",
        letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis" }}>{label}</span>
      {trailing}
      {meta && <window.NMono ls="0.10em">{meta}</window.NMono>}
      {kbd && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        color: "var(--fg-muted)", padding: "2px 6px", borderRadius: 4,
        border: "1px solid var(--border)", background: "var(--surface-1)" }}>{kbd}</span>}
    </div>
  );
}

function CCUserMenu({ items, mode = "strip", onOpenPanel, onBack, width = "100%",
  submissions = 9, admin = true, sheet = false, panelMaxHeight = 340 }) {
  const count = window.unreadCount(items);
  const shellRadius = sheet ? { borderTopLeftRadius: 22, borderTopRightRadius: 22 }
    : { borderRadius: 14 };
  return (
    <div style={{ width, background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)", ...shellRadius, overflow: "hidden",
      fontFamily: "Inter, system-ui", boxShadow: sheet ? "0 -16px 48px var(--shadow, rgba(0,0,0,0.45))"
        : "0 24px 64px var(--shadow, rgba(0,0,0,0.45))", display: "flex", flexDirection: "column" }}>
      {sheet && (
        <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }}/>
        </div>
      )}
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--border)" }}>
        <NotifAvatarButton initial="H" size={42} unread={0} variant="halo" ring="var(--bg-elevated)"/>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <window.NMono color="var(--accent)">Beta · Founder</window.NMono>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700, color: "var(--fg)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>hugh@featherweight.design</div>
        </div>
        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, display: "flex",
          alignItems: "center", justifyContent: "center", color: "var(--fg-muted)",
          border: "1px solid var(--border)", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>

      {mode === "panel" ? (
        <>
          <div role="button" tabIndex={0} onClick={onBack} style={{ display: "flex", alignItems: "center",
            gap: 8, padding: "10px 14px", minHeight: 44, boxSizing: "border-box",
            borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="var(--fg-muted)" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/></svg>
            <window.NMono>{window.NOTIF_COPY.menuBack}</window.NMono>
          </div>
          <window.NotifBody items={items} maxHeight={panelMaxHeight} hasMore={items.length > 6}/>
        </>
      ) : (
        <>
          {mode === "strip"
            ? <InboxStrip items={items} onSeeAll={onOpenPanel}/>
            : <MenuNotifRow count={count} onClick={onOpenPanel}/>}
          <MenuEyebrow>You</MenuEyebrow>
          <MenuRow label="Submitted prices" meta={`${submissions} live`} kbd="P"/>
          <MenuEyebrow>App</MenuEyebrow>
          <MenuRow label="Theme" trailing={
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <window.CCMark size={14}/></span>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
                color: "var(--fg-muted)" }}>Electric</span>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="var(--fg-muted)" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>}/>
          <MenuRow label="Settings" kbd="⌘,"/>
          {admin && <>
            <MenuEyebrow>Operations</MenuEyebrow>
            <MenuRow label="Admin" meta="⌘⇧A" leading={
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6,
                background: "var(--surface-2)", display: "inline-flex", alignItems: "center",
                justifyContent: "center", color: "var(--signal)", flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
                    stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M5.5 8.2l1.8 1.8L10.5 7" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>}/>
          </>}
          <MenuRow label="Sign out" danger last/>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)",
            background: "var(--surface-1)", display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 5,
              background: "var(--signal)" }}/>
            <window.NMono ls="0.10em">v1.158.5</window.NMono>
            <span style={{ flex: 1 }}/>
            <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 5,
              background: "var(--accent)" }}/>
            <window.NMono color="var(--accent)" ls="0.10em">What's new ›</window.NMono>
          </div>
        </>
      )}
    </div>
  );
}
const MiniMenu = CCUserMenu;

// ── Option C — profile page with an "Alerts" segment ─────────────
function ProfileSegments({ items, active = "alerts", onOpen }) {
  const count = window.unreadCount(items);
  const S = window.NOTIF_COPY.segments;
  const segs = [["shows", S.shows, 0], ["alerts", S.alerts, count], ["prices", S.prices, 0]];
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      background: "var(--bg)" }}>
      <div style={{ display: "flex", gap: 6, padding: "4px 16px 12px" }}>
        {segs.map(([k, label, c]) => (
          <button type="button" key={k} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8, minHeight: 34,
            background: k === active ? "var(--surface-2)" : "transparent",
            border: `1px solid ${k === active ? "var(--border-strong)" : "var(--border)"}`,
            fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
            color: k === active ? "var(--fg)" : "var(--fg-muted)" }}>
            {label}
            {c > 0 && <NotifPip size={6} ring="var(--bg)" animate={false}/>}
          </button>
        ))}
      </div>
      <div className="notif-scroll" style={{ flex: 1, minHeight: 0, background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border)" }}>
        <window.NotifBody items={items} onOpen={onOpen} hasMore={items.length > 6}/>
      </div>
    </div>
  );
}

// ── The two existing trailing-group occupants, lifted verbatim ───
// InstallSlot  — design_handoff_pwa_cluster/pwa-install.jsx (PR #1044)
// OfflinePill  — design_handoff_pwa_cluster/pwa-offline.jsx
// Reproduced here (not restyled) so the crowding the #737 constraint is about
// is REAL in the mock: this is what the bell would have had to squeeze past.
function InstallSlotCC({ compact = true }) {
  return (
    <button type="button" aria-label="Install Concert Crawl" style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 7,
      minHeight: 44, padding: compact ? "0 12px" : "0 14px", borderRadius: 999,
      border: "1px solid color-mix(in oklab, var(--signal) 45%, transparent)",
      background: "color-mix(in oklab, var(--signal) 12%, transparent)",
      color: "var(--signal)", fontFamily: "Inter, system-ui", fontWeight: 700,
      fontSize: 13, letterSpacing: "-0.01em", flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v8m0 0L5 7m3 3l3-3M2.5 12.5h11" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Install
    </button>
  );
}
function OfflinePillCC() {
  return (
    <div role="status" aria-live="polite" aria-label="You're offline" style={{
      display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40,
      padding: "0 12px", borderRadius: 999, boxSizing: "border-box", flexShrink: 0,
      background: "color-mix(in oklab, var(--warning) 14%, transparent)",
      border: "1px solid color-mix(in oklab, var(--warning) 34%, transparent)" }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999,
        background: "var(--warning)", flexShrink: 0,
        boxShadow: "0 0 0 3px color-mix(in oklab, var(--warning) 22%, transparent)" }}/>
      <window.NMono color="var(--warning)" ls="0.06em">Offline</window.NMono>
    </div>
  );
}

// ── Desktop chrome — TopNavBD from browse-desktop.jsx, pip added ─
// 64px bar, --bg-elevated, 0 32px padding, lockup + pill nav (Browse · Search
// · Saved), trailing group = 280px ⌘K search field, then the conditional PWA
// install slot / offline pill, then the 36px account disc. The ONLY change
// #737 makes to this bar is the pip on that disc — no slot is added.
function DesktopHeader({ unread = 0, onAvatar, install = true, offline = false, active = "browse" }) {
  const tabs = [["browse", "Browse"], ["search", "Search"], ["watching", "Watching"]];
  return (
    <header style={{ height: 64, flexShrink: 0, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 32px",
      borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <window.CCMark size={32}/>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            color: "var(--fg)", letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }} aria-label="Primary">
          {tabs.map(([k, label]) => (
            <span key={k} style={{ padding: "8px 14px", borderRadius: 8,
              fontFamily: "Inter, system-ui", fontSize: 13, letterSpacing: "-0.01em",
              fontWeight: k === active ? 700 : 500,
              color: k === active ? "var(--fg)" : "var(--fg-muted)",
              background: k === active ? "var(--surface-2)" : "transparent" }}>{label}</span>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, height: 36,
          padding: "0 12px", borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)", width: 280, boxSizing: "border-box",
          color: "var(--fg-subtle)", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>Search artists, venues, genres…</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, padding: "2px 5px", borderRadius: 3,
            border: "1px solid var(--border-strong)" }}>⌘K</span>
        </span>
        {offline && <OfflinePillCC/>}
        {install && !offline && <InstallSlotCC/>}
        <NotifAvatarButton initial="JR" unread={unread} onClick={onAvatar}/>
      </div>
    </header>
  );
}

Object.assign(window, {
  NotifPip, NotifAvatarButton, CCAppBar, CCTabBar, InstallSlotCC, OfflinePillCC,
  InboxStrip, MenuNotifRow, CCUserMenu, MiniMenu, MenuRow, MenuEyebrow,
  ProfileSegments, DesktopHeader,
});
