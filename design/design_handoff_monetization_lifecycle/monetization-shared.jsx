// monetization-shared.jsx — data + primitives shared across the upgrade flow
//
// Exports (all on window):
//   TIERS, ROLES, getFounderState()
//   <MMark/>            local copy of CCMark from browse-home.jsx (per CLAUDE.md)
//   <TierBadge tier/>   Supporter · Premium · Founder · Free
//   <RoleBadge role/>   Admin · Promoter · Beta · Member
//   <BadgeRow/>         convenience cluster
//   <MonoEyebrow/>      uppercase mono meta line
//   <RailHeader/>       header rail (dot · eyebrow · hairline · code) — matches feedback modal
//   <ScarcityRail/>     seats + time bar for Founder
//   <TrialBanner/>      14-day Premium trial CTA
//   <DragHandle/>       bottom-sheet handle
//   <SheetChrome/>      shared bottom-sheet container
//   <ModalChrome/>      shared desktop modal container

// ── Tier + role data ──────────────────────────────────────────
const TIERS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    priceText: "$0",
    priceUnit: "forever",
    tagline: "The whole point. Always free.",
    rationale: "No backend cost to scale, no reason to charge.",
    features: [
      { text: "Browse, search, filter every show",
        desc: "Every venue, every artist, every date. No paywall on the core." },
      { text: "Save shows you're watching",
        desc: "Stash shows you're maybe-going-to. Sorted, sortable, yours." },
      { text: "See community-submitted prices",
        desc: "Real-world ticket prices from people who actually went." },
      { text: "Submit prices yourself",
        desc: "Pay it forward — log what you paid, help everyone else." },
    ],
    cta: "You're here.",
    badge: null,
  },
  {
    key: "supporter",
    name: "Supporter",
    price: 2,
    priceText: "$2",
    priceUnit: "/ month",
    tagline: "Stuff we can run without scaling.",
    rationale: "Existing infrastructure. You're chipping in.",
    features: [
      { text: "Everything in Free",
        desc: "Browse, save, submit prices — all carries over." },
      { text: "Your concert history, kept",
        desc: "Every show you've been to. Searchable. Stays yours forever." },
      { text: "Calendar export — Apple + Google",
        desc: "Two-way sync to your calendar of choice. Or grab the .ics." },
      { text: "Supporter badge on your profile",
        desc: "Small cosmetic chip. People will know." },
    ],
    cta: "Become a Supporter",
  },
  {
    key: "premium",
    name: "Premium",
    price: 5,
    priceText: "$5",
    priceUnit: "/ month",
    tagline: "Stuff that actually costs us money.",
    rationale: "Notification workers, email at volume, price polling, the alerts pipeline.",
    features: [
      { text: "Everything in Supporter",
        desc: "History + calendar export + the badge come along." },
      { text: "Follow artists",
        desc: "Tag bands you care about. We watch their show pages so you don't have to." },
      { text: "New-show alerts (push + email)",
        desc: "Real-time. The moment a followed artist drops a date near you." },
      { text: "Price-drop alerts",
        desc: "We watch ticket prices on your watched shows. When they fall, you hear about it." },
      { text: "More coming \u2605",
        desc: "We're building. Premium subscribers ride along — quietly, without an email blast.",
        future: true },
    ],
    cta: "Start 14-day free trial",
    ctaShort: "Go Premium",
    highlighted: true,
  },
  {
    key: "founder",
    name: "Founder",
    price: 3,
    priceText: "$3",
    priceUnit: "/ month · locked forever",
    tagline: "Full Premium. Permanent discount.",
    rationale: "First 100 subscribers or 30 days. Whichever comes first.",
    features: [
      { text: "Everything in Premium",
        desc: "Follows, alerts, price drops — all the working bits." },
      { text: "Price never goes up. Promise.",
        desc: "$3/mo today, $3/mo when the regular price doubles. We won't ask." },
      { text: "Founder badge on your profile",
        desc: "Distinct from Supporter/Premium. Reserved for the first 100." },
      { text: "More coming \u2605",
        desc: "Everything Premium gets, on your locked-in price.",
        future: true },
    ],
    cta: "Claim Founder pricing",
    scarce: true,
  },
];

const ROLES = [
  { key: "admin",    label: "Admin",    grants: "Full Premium" },
  { key: "promoter", label: "Promoter", grants: "Full Premium" },
  { key: "beta",     label: "Beta",     grants: "Full Premium" },
  { key: "member",   label: "Member",   grants: null }, // neutral fallback
];

function getFounderState(kind = "open-many") {
  // Returns { open, seatsClaimed, seatsTotal, daysLeft, hoursLeft, hot }
  switch (kind) {
    case "open-many":   return { open: true, seatsClaimed: 23, seatsTotal: 100, daysLeft: 27, hoursLeft: 14, hot: false };
    case "open-few":    return { open: true, seatsClaimed: 88, seatsTotal: 100, daysLeft: 19, hoursLeft: 6,  hot: true  };
    case "ending-soon": return { open: true, seatsClaimed: 62, seatsTotal: 100, daysLeft: 2,  hoursLeft: 11, hot: true  };
    case "closed":      return { open: false };
    default:            return { open: true, seatsClaimed: 23, seatsTotal: 100, daysLeft: 27, hoursLeft: 14, hot: false };
  }
}

// ── Cluster Path mark ────────────────────────────────────────
// Verbatim copy of CCMark in browse-home.jsx (CLAUDE.md §1).
function MMark({ size = 24 }) {
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

// ── Mono eyebrow ─────────────────────────────────────────────
function MonoEyebrow({ children, color = "var(--fg-subtle)", size = 10, weight = 700, letterSpacing = "0.14em", style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: size, fontWeight: weight,
      textTransform: "uppercase", letterSpacing,
      color, ...style,
    }}>{children}</div>
  );
}

// ── Rail header (matches feedback modal pattern) ─────────────
function RailHeader({ tone = "accent", eyebrow, code }) {
  const c = tone === "signal" ? "var(--signal)"
          : tone === "warning" ? "var(--warning)"
          : tone === "muted" ? "var(--fg-subtle)"
          : "var(--accent)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}` }}/>
      <MonoEyebrow color={c} letterSpacing="0.16em">{eyebrow}</MonoEyebrow>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {code !== undefined && (
        <MonoEyebrow letterSpacing="0.14em">{code}</MonoEyebrow>
      )}
    </div>
  );
}

// ── Tier badge ────────────────────────────────────────────────
// Visual hierarchy: Free (none) · Supporter (subtle) · Premium (signal) · Founder (signal + accent)
function TierBadge({ tier, size = "md" }) {
  const sz = size === "sm" ? { pad: "3px 7px", fs: 9,  glyph: 8,  gap: 5, radius: 4 }
          : size === "lg" ? { pad: "5px 11px", fs: 11, glyph: 10, gap: 6, radius: 6 }
          : { pad: "4px 9px", fs: 10, glyph: 9, gap: 5, radius: 5 };

  if (tier === "free" || !tier) return null;

  const styles = {
    supporter: {
      bg: "color-mix(in oklch, var(--accent) 14%, transparent)",
      bd: "color-mix(in oklch, var(--accent) 36%, transparent)",
      fg: "var(--accent)",
      glyph: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>+</span>,
      label: "Supporter",
    },
    premium: {
      bg: "color-mix(in oklch, var(--signal) 14%, transparent)",
      bd: "color-mix(in oklch, var(--signal) 38%, transparent)",
      fg: "var(--signal)",
      glyph: (
        <svg width={sz.glyph} height={sz.glyph} viewBox="0 0 10 10">
          <polygon points="5,0 6.3,3.4 10,3.7 7.1,6 8.1,9.7 5,7.6 1.9,9.7 2.9,6 0,3.7 3.7,3.4" fill="currentColor"/>
        </svg>
      ),
      label: "Premium",
    },
    founder: {
      bg: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, transparent), color-mix(in oklch, var(--signal) 18%, transparent))",
      bd: "color-mix(in oklch, var(--signal) 50%, transparent)",
      fg: "var(--fg)",
      glyph: (
        <svg width={sz.glyph} height={sz.glyph} viewBox="0 0 10 10">
          <path d="M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z" fill="var(--signal)" stroke="var(--accent)" strokeWidth="0.7" strokeLinejoin="round"/>
        </svg>
      ),
      label: "Founder",
    },
  };
  const s = styles[tier];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: sz.gap,
      padding: sz.pad, borderRadius: sz.radius,
      background: s.bg, border: `1px solid ${s.bd}`,
      color: s.fg,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 800, fontSize: sz.fs,
      letterSpacing: "0.12em", textTransform: "uppercase",
      whiteSpace: "nowrap", lineHeight: 1,
    }}>
      {s.glyph}
      <span>{s.label}</span>
    </span>
  );
}

// ── Role badge ────────────────────────────────────────────────
// Neutral / utilitarian — roles are relationships to the product, not status.
function RoleBadge({ role, size = "md" }) {
  if (!role || role === "member") return null;
  const sz = size === "sm" ? { pad: "3px 7px", fs: 9, gap: 5, radius: 4 }
          : size === "lg" ? { pad: "5px 11px", fs: 11, gap: 6, radius: 6 }
          : { pad: "4px 9px", fs: 10, gap: 5, radius: 5 };
  const r = ROLES.find(x => x.key === role);
  if (!r) return null;
  const dot = role === "admin" ? "var(--warning)"
            : role === "promoter" ? "var(--accent)"
            : "var(--signal)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: sz.gap,
      padding: sz.pad, borderRadius: sz.radius,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      color: "var(--fg-muted)",
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700, fontSize: sz.fs,
      letterSpacing: "0.16em", textTransform: "uppercase",
      whiteSpace: "nowrap", lineHeight: 1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 5, background: dot }}/>
      <span>{r.label}</span>
    </span>
  );
}

// ── Badge row (tier + role co-existence) ─────────────────────
function BadgeRow({ tier, role, size = "md", gap = 6 }) {
  return (
    <div style={{ display: "inline-flex", gap, alignItems: "center", flexWrap: "wrap" }}>
      <RoleBadge role={role} size={size}/>
      <TierBadge tier={tier} size={size}/>
    </div>
  );
}

// ── Scarcity rail — for Founder tier ─────────────────────────
function ScarcityRail({ state, intensity = "medium" }) {
  if (!state || !state.open) return null;
  const pct = (state.seatsClaimed / state.seatsTotal) * 100;
  const seatsLeft = state.seatsTotal - state.seatsClaimed;
  const timeText = state.daysLeft >= 1
    ? `${state.daysLeft}d ${state.hoursLeft}h left`
    : `${state.hoursLeft}h left`;
  const hot = state.hot || seatsLeft <= 15 || state.daysLeft <= 3;

  if (intensity === "subtle") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MonoEyebrow color="var(--fg-muted)" size={9} letterSpacing="0.12em">
          {seatsLeft} of {state.seatsTotal} left · {timeText}
        </MonoEyebrow>
      </div>
    );
  }

  if (intensity === "loud") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
            color: hot ? "var(--accent)" : "var(--signal)",
            letterSpacing: "-0.02em", lineHeight: 1,
          }}>
            {seatsLeft}
            <span style={{ fontWeight: 600, fontSize: 12, color: "var(--fg-muted)", letterSpacing: "0.04em", marginLeft: 6 }}>
              of {state.seatsTotal} left
            </span>
          </div>
          <MonoEyebrow color={hot ? "var(--accent)" : "var(--fg-muted)"} size={10} letterSpacing="0.14em">
            {timeText}
          </MonoEyebrow>
        </div>
        <div style={{
          height: 4, borderRadius: 4, background: "var(--surface-2)",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0, width: `${pct}%`,
            background: hot
              ? "linear-gradient(90deg, var(--signal), var(--accent))"
              : "var(--signal)",
            borderRadius: 4,
            boxShadow: hot ? "0 0 10px var(--accent)" : "0 0 8px var(--signal)",
          }}/>
        </div>
      </div>
    );
  }

  // medium (default)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <MonoEyebrow color={hot ? "var(--accent)" : "var(--signal)"} size={10} letterSpacing="0.14em">
          {state.seatsClaimed} / {state.seatsTotal} claimed
        </MonoEyebrow>
        <MonoEyebrow color="var(--fg-muted)" size={10} letterSpacing="0.14em">
          {timeText}
        </MonoEyebrow>
      </div>
      <div style={{
        height: 3, borderRadius: 3, background: "var(--surface-2)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: hot ? "var(--accent)" : "var(--signal)",
          borderRadius: 3,
        }}/>
      </div>
    </div>
  );
}

// ── Trial banner ──────────────────────────────────────────────
function TrialBanner({ tone = "default", compact = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: compact ? "8px 12px" : "10px 14px",
      borderRadius: 10,
      background: "color-mix(in oklch, var(--signal) 10%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--signal) 30%, var(--border))",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--signal)" strokeWidth="1.5"/>
        <path d="M8 4.5 L8 8 L10.5 9.5" fill="none" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.01em",
        }}>
          Try Premium free for 14 days.
        </div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 11,
          color: "var(--fg-muted)", marginTop: 1,
        }}>
          No card. No catch. Cancel any time, lose nothing.
        </div>
      </div>
    </div>
  );
}

// ── Drag handle (mobile bottom sheet) ────────────────────────
function DragHandle() {
  return (
    <div style={{
      display: "flex", justifyContent: "center", padding: "8px 0 4px",
    }}>
      <div style={{
        width: 36, height: 4, borderRadius: 4,
        background: "var(--border-strong)", opacity: 0.6,
      }}/>
    </div>
  );
}

// ── Bottom sheet chrome ──────────────────────────────────────
function SheetChrome({ children, height = "88%" }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      height,
      background: "var(--bg)",
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      border: "1px solid var(--border)",
      borderBottom: "none",
      boxShadow: "0 -20px 50px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      color: "var(--fg)",
    }}>
      {children}
    </div>
  );
}

// ── Scrim — dims the page behind a sheet/modal ───────────────
function Scrim({ tone = "dark" }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--scrim)",
      backdropFilter: "blur(4px) saturate(120%)",
      WebkitBackdropFilter: "blur(4px) saturate(120%)",
    }}/>
  );
}

// ── Desktop modal chrome ─────────────────────────────────────
function ModalChrome({ children, width = 640, height }) {
  return (
    <div style={{
      width, maxHeight: height || "min(86vh, 820px)",
      borderRadius: 18,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      color: "var(--fg)",
    }}>
      {children}
    </div>
  );
}

// ── Page-behind sketch — a stripped-down "Settings" or "Event detail"
// to suggest the modal/sheet is summoned from somewhere real.
function PageBehindMock({ scene = "settings" }) {
  if (scene === "event") {
    return (
      <div style={{
        width: "100%", height: "100%", background: "var(--bg)",
        padding: "62px 16px 16px", color: "var(--fg)",
        fontFamily: "Inter, system-ui",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MMark size={24}/>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 10 }}>
          Sleep Token
        </div>
        <MonoEyebrow size={10}>FILLMORE · JUN 14 · 8:00 PM</MonoEyebrow>
        <div style={{ height: 180, borderRadius: 12, background: `linear-gradient(135deg, oklch(0.30 0.10 280), oklch(0.18 0.05 320))`, border: "1px solid var(--border)" }}/>
        <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
          Goth-prog quartet from London. Masks, rituals, riffs.
        </div>
      </div>
    );
  }
  // settings
  return (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)",
      padding: "62px 16px 16px", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MMark size={24}/>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 8 }}>
        Settings
      </div>
      {["Profile","Themes","Notifications","Concert Crawl Premium","Account","Sign out"].map((l, i) => (
        <div key={i} style={{
          padding: "12px 14px", borderRadius: 10,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          fontSize: 14, fontWeight: 600,
          color: i === 3 ? "var(--fg)" : "var(--fg-muted)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{l}</span>
          {i === 3 && <MonoEyebrow color="var(--signal)" size={9}>UPGRADE</MonoEyebrow>}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  TIERS, ROLES, getFounderState,
  MMark, TierBadge, RoleBadge, BadgeRow,
  MonoEyebrow, RailHeader, ScarcityRail, TrialBanner,
  DragHandle, SheetChrome, Scrim, ModalChrome, PageBehindMock,
});
