// pwa-data.jsx — PWA cluster (#969 install · #970 offline · #971 push)
// Shared atoms + copy maps + fixtures. Tokens only (var(--*)), all 3 themes.
//
// VOICE BAR (Sour Patch #782): honest > cheerful, specific > generic, callouts
// are questions not claims, never brochure-y, no false urgency. Every displayed
// string below reads as though a concert-goer typed it. On build the *_COPY maps
// lift verbatim into apps/web/src/components/*/definitions/copy.ts.

const G_FONT = "Inter, system-ui, -apple-system, sans-serif";
const G_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ── Brand mark — VERBATIM COPY of CCMark from browse-home.jsx ───────────────
// Source of truth: browse-home.jsx `function CCMark`. Do not restyle — colors
// come from theme tokens (--bg / --accent / --signal). Copied (not imported) so
// this handoff loads standalone; keep in sync if the source mark ever changes.
function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// Canonical wordmark lockup (matches AppBar in browse-home.jsx).
function Wordmark({ size = 17 }) {
  return (
    <span style={{ fontFamily: G_FONT, fontWeight: 800, fontSize: size,
      color: "var(--fg)", letterSpacing: "-0.02em" }}>
      concert<span style={{ color: "var(--accent)" }}>crawl.</span>
    </span>
  );
}

// ── Mono eyebrow ───────────────────────────────────────────────────────────
function Eyebrow({ children, color = "var(--fg-subtle)", size = 9.5, style }) {
  return <div style={{ fontFamily: G_MONO, fontSize: size, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase", color, ...style }}>{children}</div>;
}

// ── Bottom sheet primitive ─────────────────────────────────────────────────
// role="dialog", labelled, escape closes, focus lands inside on mount, focus is
// trapped (Tab cycles within). The scrim is inert — a tap on it counts as
// dismiss (which for the push sheet == "Not now"). Grabber + rounded top.
function BottomSheet({ open, onClose, labelId, children, maxH = "88%" }) {
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    const focusables = () => el.querySelectorAll(
      'button, [href], input, [tabindex]:not([tabindex="-1"])');
    const first = focusables()[0];
    first && first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose && onClose(); }
      if (e.key === "Tab") {
        const f = Array.from(focusables());
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        // If focus isn't inside the panel yet, pull it back in — otherwise Tab escapes.
        if (i === -1) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
        if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex",
      flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0,
        background: "var(--scrim)", backdropFilter: "blur(1.5px)" }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelId}
        style={{ position: "relative", background: "var(--bg-elevated)",
          borderTop: "1px solid var(--border-strong)",
          borderRadius: "22px 22px 0 0", maxHeight: maxH, overflowY: "auto",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
          padding: "10px 20px calc(20px + env(safe-area-inset-bottom))" }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--border-strong)",
          margin: "0 auto 14px" }} />
        {children}
      </div>
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────
// Primary CTA = --signal (per CLAUDE.md; --accent is brand-presence only).
function PrimaryButton({ children, onClick, full, style }) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", boxSizing: "border-box",
      cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, minHeight: 48, width: full ? "100%" : undefined, padding: "0 20px",
      borderRadius: 12, background: "var(--signal)", color: "var(--fg-on-accent)",
      fontFamily: G_FONT, fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em",
      ...style }}>{children}</button>
  );
}
function GhostButton({ children, onClick, full, style }) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", boxSizing: "border-box",
      cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, minHeight: 48, width: full ? "100%" : undefined, padding: "0 20px",
      borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent",
      color: "var(--fg-muted)", fontFamily: G_FONT, fontWeight: 700, fontSize: 15,
      letterSpacing: "-0.01em", ...style }}>{children}</button>
  );
}

// ── Small tokenized icons ──────────────────────────────────────────────────
function Icon({ name, size = 18, color = "currentColor", sw = 1.7 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    // iOS system share (square + up arrow)
    share:   <><path d="M12 3v12M8.5 6.5L12 3l3.5 3.5" /><path d="M6 11v8a1 1 0 001 1h10a1 1 0 001-1v-8" /></>,
    plus:    <path d="M12 5v14M5 12h14" />,
    home:    <><path d="M4 10.5L12 4l8 6.5" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></>,
    retry:   <><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M19 9a8 8 0 00-14-2M5 15a8 8 0 0014 2" /></>,
    bell:    <><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M9.5 20a2.5 2.5 0 005 0" /></>,
    calendar:<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
    pin:     <><path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 10-13 0C5.5 15.6 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.4" /></>,
    chevron: <path d="M9 5l7 7-7 7" />,
    close:   <path d="M6 6l12 12M18 6L6 18" />,
    ext:     <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h6" /></>,
    check:   <path d="M4 12l5 5L20 6" />,
    ticket:  <><path d="M3 9a2 2 0 012-2h14a2 2 0 012 2 2 2 0 000 4 2 2 0 01-2 2H5a2 2 0 01-2-2 2 2 0 000-4z" /><path d="M13 7v10" strokeDasharray="1.5 2.2" /></>,
    download:<><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></>,
    cloudoff:<><path d="M4 4l16 16" /><path d="M6.5 18A4.5 4.5 0 016 9a6 6 0 0110.6-2.3M19.7 13.2A3.5 3.5 0 0117.5 18H10" /></>,
    search:  <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
    grid:    <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
    eye:     <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.7" /></>,
    user:    <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" /></>,
    card:    <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10.5h18" /></>,
    sliders: <><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" /></>,
    theme:   <><circle cx="12" cy="12" r="7.5" /><path d="M12 4.5v15" /><path d="M12 19.5a7.5 7.5 0 000-15z" fill={color} stroke="none" /></>,
  };
  return <svg {...p} aria-hidden="true">{paths[name] || null}</svg>;
}

// ── Account glyph (matches the browse chrome circle) ───────────────────────
function AccountButton() {
  return (
    <button aria-label="Account menu" style={{ all: "unset", cursor: "pointer",
      width: 40, height: 40, borderRadius: 20, boxSizing: "border-box",
      border: "1.5px solid var(--border-strong)", display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="6" r="3.5" stroke="var(--fg-muted)" strokeWidth="1.5" />
        <path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="var(--fg-muted)"
          strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// ── Search circle (matches browse AppBar) + bottom tab bar ────────────────
function SearchCircle() {
  return (
    <button aria-label="Search" style={{ all: "unset", cursor: "pointer",
      width: 36, height: 36, borderRadius: 18, boxSizing: "border-box",
      border: "1.5px solid var(--border-strong)", display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name="search" size={16} color="var(--fg-muted)" sw={1.6} />
    </button>
  );
}

// Bottom nav — the real app chrome (browse · venues · watching · account).
function PwaTabBar({ active = "browse", handle = "H" }) {
  const tabs = [
    { key: "browse", label: "browse", icon: "grid" },
    { key: "venues", label: "venues", icon: "pin" },
    { key: "watching", label: "watching", icon: "eye" },
  ];
  return (
    <nav aria-label="Primary" style={{ display: "flex", alignItems: "center",
      justifyContent: "space-around", height: 58, flexShrink: 0,
      borderTop: "1px solid var(--border)", background: "var(--bg-elevated)",
      paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button key={t.key} aria-label={t.label} aria-current={on ? "page" : undefined}
            style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4, minWidth: 56, minHeight: 44, justifyContent: "center",
              color: on ? "var(--signal)" : "var(--fg-subtle)" }}>
            <Icon name={t.icon} size={19} color={on ? "var(--signal)" : "var(--fg-subtle)"} sw={1.7} />
            <span style={{ fontFamily: G_MONO, fontSize: 9, fontWeight: on ? 700 : 500,
              letterSpacing: "0.06em", textTransform: "lowercase" }}>{t.label}</span>
          </button>
        );
      })}
      <button aria-label="Account" aria-current={active === "account" ? "page" : undefined}
        style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", minWidth: 56, minHeight: 44 }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, display: "flex",
          alignItems: "center", justifyContent: "center", fontFamily: G_FONT, fontWeight: 800,
          fontSize: 13, color: "#fff", boxSizing: "border-box",
          background: "linear-gradient(135deg, var(--accent), var(--signal))",
          outline: active === "account" ? "2px solid var(--signal)" : "none", outlineOffset: 2 }}>{handle}</span>
      </button>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COPY MAPS  — lift verbatim into copy.ts
// ═══════════════════════════════════════════════════════════════════════════

// #969 — Install prompt
const INSTALL_COPY = {
  slotLabel: "Install",            // header chrome action
  slotAria: "Install Concert Crawl",
  // Android/desktop native-prompt path uses the browser's own dialog; our slot
  // just triggers it. iOS has no beforeinstallprompt, so the slot opens a sheet.
  sheet: {
    eyebrow: "Add to Home Screen",
    title: "Put Concert Crawl on your home screen",
    sub: "Safari won't do it for you on iPhone — here's the 10-second version.",
    steps: [
      { icon: "share", n: "1", label: "Tap Share",
        detail: "The square-with-an-arrow, down in Safari's toolbar." },
      { icon: "plus",  n: "2", label: "Scroll to \u201cAdd to Home Screen\u201d",
        detail: "It's a few rows down, past the AirDrop stuff." },
      { icon: "home",  n: "3", label: "Tap Add",
        detail: "Top-right corner. Now it opens full-screen, no address bar." },
    ],
    done: "Got it",
  },
  // Dismissal-persistence UX: first dismiss quiets the slot for 30 days; a
  // second dismiss retires it for good (Settings can still re-trigger).
  dismissNote: "We'll quit asking. You can still add it from Settings whenever.",
};

// #970 — Offline states
const OFFLINE_COPY = {
  pillLabel: "Offline · cached OK",
  pillAria: "You're offline. Cached shows are still available.",
  fallback: {
    eyebrow: "No signal",
    title: "You're offline \u2014 here's what you can still see.",
    sub: "The shows you've already looked at are saved on your phone. Live prices and anything new will load when you're back.",
    retry: "Try again",
    shortcutsLabel: "Saved on your phone",
    // shown when the list is populated but auth-only content was skipped
    authNote: "Your account stuff (watchlist, settings) needs a connection \u2014 it'll be back when you are.",
    // empty state — honest, not defeatist
    empty: {
      title: "Nothing cached yet.",
      sub: "First visit, or a fresh phone? There's nothing saved to show offline yet. Hit retry once you've got signal and we'll start keeping the shows you browse.",
      link: "Back to cached content",
    },
  },
};

// #971 — Web push
const PUSH_COPY = {
  // post-watch permission sheet (fires ~500ms after first Watch tap)
  postWatch: {
    eyebrow: "You're watching this show",
    title: "Want a heads-up if anything changes?",
    sub: "We'll ping you if tickets drop, sell out, or the show moves \u2014 only for shows you're watching. Nothing else.",
    turnOn: "Turn on notifications",
    notNow: "Not now",
    footnote: "You can change this anytime in Settings.",
  },
  // iOS Safari, not installed — push can't work until it's a home-screen app
  iosNotInstalled: {
    eyebrow: "One extra step on iPhone",
    title: "To get pinged on iPhone, add Concert Crawl to your Home Screen first.",
    sub: "Apple only lets web apps send notifications once they're installed. Takes 10 seconds.",
    showMe: "Show me how",
    notNow: "Not now",
  },
  settings: {
    heading: "Notifications",
    master: "Push notifications",
    masterOnDetail: "On \u2014 this device",
    masterOffDetail: "Off",
    subs: [
      { key: "watch", label: "Watch updates",
        detail: "Price drops, sell-outs, date changes, cancellations \u2014 for shows you're watching.", def: true },
      { key: "price", label: "Price drops",
        detail: "A separate ping the moment a watched show gets cheaper.", def: true },
    ],
    // never asked yet, master off
    empty: {
      title: "No notifications yet.",
      sub: "Watch a show and we'll ask if you want a heads-up when its tickets or details change. Or flip this on now.",
      cta: "Turn on notifications",
    },
    // browser permission was denied — we genuinely can't re-ask
    denied: {
      title: "Notifications are blocked in your browser.",
      sub: "You (or your phone) told the browser no, and we can't override that \u2014 only you can. Flip it back on in your browser's site settings, then come back here.",
      link: "How to unblock notifications",
      badge: "Blocked",
    },
    // installed-iOS reminder when master is off there
    iosHint: "On iPhone, notifications only work from the home-screen app \u2014 which you've got. Nice.",
  },
  // Per-category notification content (OS-level card body). Shapes, voice-passed.
  notifications: [
    { key: "cancelled", tag: "Cancelled",
      title: "Amyl and the Sniffers at the Roxy \u2014 cancelled.",
      body: "The show's off. Tap for refund details." },
    { key: "postponed", tag: "Postponed",
      title: "Amyl at the Roxy moved to Aug 14.",
      body: "Same tickets, new night. Can't make it? Refund info inside." },
    { key: "soldout", tag: "Sold out",
      title: "Amyl at the Roxy is sold out.",
      body: "Official waitlist may open closer to the date \u2014 we'll watch it." },
    { key: "backonsale", tag: "Back on sale",
      title: "Tickets for Amyl at the Roxy just went back on sale.",
      body: "A batch reopened. They tend to go fast \u2014 no pressure though." },
    { key: "pricedrop", tag: "Price drop",
      title: "$32 tickets for Amyl at the Roxy just went on sale.",
      body: "Down from $48. Cheapest we've seen for this one." },
  ],
};

// ── Fixtures — cached content for the offline fallback ─────────────────────
const CACHED_EVENTS = [
  { artist: "Amyl and the Sniffers", venue: "The Roxy", when: "Tonight · 9:00 PM", price: "$28" },
  { artist: "Wednesday", venue: "Mission Ballroom", when: "Fri · 8:00 PM", price: "$30" },
  { artist: "Geese", venue: "Ogden Theatre", when: "Sat · 9:00 PM", price: "$25" },
];
const CACHED_VENUES = [
  { name: "The Roxy", meta: "Capacity 1,100 · 6 upcoming" },
  { name: "Mission Ballroom", meta: "Capacity 3,950 · 12 upcoming" },
];

Object.assign(window, {
  PWA_FONT: G_FONT, PWA_MONO: G_MONO,
  CCMark, Wordmark, Eyebrow, BottomSheet, PrimaryButton, GhostButton, Icon, AccountButton,
  SearchCircle, PwaTabBar,
  INSTALL_COPY, OFFLINE_COPY, PUSH_COPY, CACHED_EVENTS, CACHED_VENUES,
});
