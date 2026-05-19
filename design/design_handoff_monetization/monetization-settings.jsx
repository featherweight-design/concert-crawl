// monetization-settings.jsx — user settings surfaces under the new tier+role system
//
// What's here:
//   <PlanCardDesktop user/>         — the big "Plan" card on the desktop Settings page
//   <PlanRailMobile user/>          — same idea, sized for the mobile Settings sheet
//   <UserDropdownDesktop user/>     — the avatar dropdown in the AppBar
//   <SettingsDesktopMock user/>     — full mock of Settings > Plan
//   <SettingsMobileMock user/>      — full mock of mobile Settings sheet
//
// "user" object shape:
//   { handle, email, tier, role, trial, joined, founderState }
//     tier  : "free" | "supporter" | "premium" | "founder"  (what they pay for)
//     role  : "member" | "admin" | "promoter" | "beta"       (relationship)
//     trial : null | { daysLeft }                            (Premium trial)

const { TIERS, ROLES, MMark, TierBadge, RoleBadge, BadgeRow,
        MonoEyebrow, getFounderState } = window;

// ── Plan card copy per state ─────────────────────────────────
// Returns { eyebrowTier, eyebrowRest, headline, body, punchline, ctas, accent }
function getPlanCardContent(user) {
  const { tier = "free", role = "member", trial } = user || {};
  const isRoleHolder = role && role !== "member";
  const r = ROLES.find(x => x.key === role);

  if (trial) {
    return {
      eyebrowTier: "PREMIUM · TRIAL",
      eyebrowRest: `YOUR PLAN · ${trial.daysLeft}D LEFT`,
      headline: "Trying Premium.",
      body: `${trial.daysLeft} days to see what sticks. No card yet — we'll nudge you before it ends.`,
      punchline: "—— No surprise charges. Promise.",
      accent: "var(--signal)",
      tier: "premium",
      ctas: [
        { label: "See plans", primary: true },
        { label: "End trial early", ghost: true },
      ],
    };
  }

  if (tier === "free") {
    if (isRoleHolder) {
      return {
        eyebrowTier: "FREE · YOUR PLAN",
        eyebrowRest: `${r.label.toUpperCase()} ROLE`,
        headline: "Free for life. (Plus everything Beta unlocks.)",
        body: `Your ${r.label} role covers Premium for as long as it's active. No card needed — you're already supporting us by being here.`,
        punchline: "—— Want to chip in anyway? Founder's still open.",
        accent: "var(--accent)",
        tier: null,
        ctas: [
          { label: "Chip in · see options", primary: true },
        ],
      };
    }
    return {
      eyebrowTier: "FREE · YOUR PLAN",
      eyebrowRest: "ON THE HOUSE",
      headline: "Free. The whole point.",
      body: "Browse, search, save shows, submit prices — all included. Three tiers when you want more out of it.",
      punchline: "—— No card, no commitment, no FOMO emails.",
      accent: "var(--fg-muted)",
      tier: null,
      ctas: [
        { label: "See the tiers", primary: true },
      ],
    };
  }

  if (tier === "supporter") {
    return {
      eyebrowTier: "SUPPORTER · YOUR PLAN",
      eyebrowRest: isRoleHolder ? `${r.label.toUpperCase()} ROLE · VOLUNTARY` : "$2 / MONTH",
      headline: isRoleHolder ? "$2 a month. Voluntary." : "$2 a month. Thanks.",
      body: isRoleHolder
        ? `Your ${r.label} role already covers Premium features. This is your voluntary support — it keeps the lights on.`
        : "History, calendar export, and the Supporter badge are switched on. You're chipping in for things we run on existing infrastructure.",
      punchline: isRoleHolder ? "—— Truly optional. Cancel any time." : "—— Cancel any time. Thanks for being here.",
      accent: "var(--accent)",
      tier: "supporter",
      ctas: [
        { label: "Upgrade to Premium", primary: true },
        { label: "Manage subscription", ghost: true },
      ],
    };
  }

  if (tier === "premium") {
    return {
      eyebrowTier: "PREMIUM · YOUR PLAN",
      eyebrowRest: isRoleHolder ? `${r.label.toUpperCase()} ROLE · VOLUNTARY` : "$5 / MONTH",
      headline: isRoleHolder ? "$5 a month. Voluntary." : "Premium. You're in.",
      body: isRoleHolder
        ? `You'd already have Premium via your ${r.label} role — but you chose to pay anyway. We see you.`
        : "Follows, alerts, price drops. You're paying for the stuff that costs us money to run.",
      punchline: isRoleHolder ? "—— Truly, thank you." : "—— More coming. Quietly.",
      accent: "var(--signal)",
      tier: "premium",
      ctas: [
        { label: "Manage subscription", primary: true },
      ],
    };
  }

  // founder
  return {
    eyebrowTier: "FOUNDER · YOUR PLAN",
    eyebrowRest: isRoleHolder ? `${r.label.toUpperCase()} ROLE · LOCKED $3` : "LOCKED $3 / MONTH",
    headline: "Founder. Locked in.",
    body: "$3 a month, never goes up. You showed up at the start.",
    punchline: "—— Even when we charge new users.",
    accent: "var(--accent)",
    tier: "founder",
    ctas: [
      { label: "Manage subscription", primary: true },
    ],
  };
}

// ── Desktop Plan card ───────────────────────────────────────
function PlanCardDesktop({ user }) {
  const c = getPlanCardContent(user || {});
  return (
    <div style={{
      position: "relative",
      borderRadius: 14,
      padding: "20px 22px 22px",
      background: `radial-gradient(circle at 100% 0%, color-mix(in oklch, ${c.accent} 14%, transparent) 0%, transparent 55%), var(--bg-elevated)`,
      border: `1px solid color-mix(in oklch, ${c.accent} 45%, var(--border-strong))`,
      boxShadow: c.tier === "founder"
        ? "0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent), 0 30px 60px -40px color-mix(in oklch, var(--accent) 40%, transparent)"
        : "none",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 14,
      maxWidth: 620,
    }}>
      {/* Eyebrow row: tier badge + role chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {c.tier
          ? <TierBadge tier={c.tier} size="md"/>
          : <span style={{
              padding: "4px 9px", borderRadius: 5,
              background: "var(--surface-2)", border: "1px solid var(--border-strong)",
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 10,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--fg-muted)",
            }}>Free</span>
        }
        <MonoEyebrow size={10} color="var(--fg-subtle)" letterSpacing="0.14em">{c.eyebrowRest}</MonoEyebrow>
      </div>

      <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.05 }}>
        {c.headline}
      </div>
      <div style={{ fontWeight: 500, fontSize: 14.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 520 }}>
        {c.body}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: 12.5, color: c.accent, letterSpacing: "0.02em" }}>
        {c.punchline}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        {c.ctas.map((cta, i) => (
          <button key={i} style={{
            all: "unset", cursor: "pointer",
            padding: "11px 16px", borderRadius: 10,
            background: cta.primary ? c.accent : "transparent",
            color: cta.primary ? "var(--fg-on-accent)" : "var(--fg-muted)",
            border: cta.primary ? "none" : "1px solid var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
            letterSpacing: "-0.005em",
            boxShadow: cta.primary && c.tier === "founder" ? "0 0 22px color-mix(in oklch, var(--accent) 35%, transparent)" : "none",
          }}>{cta.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Role rail (shown under Plan card for role-holders) ──────
function RoleRail({ user }) {
  const { role = "member" } = user || {};
  if (!role || role === "member") return null;
  const r = ROLES.find(x => x.key === role);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      maxWidth: 620,
    }}>
      <RoleBadge role={role} size="md"/>
      <div style={{ flex: 1, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
        Your <strong style={{ color: "var(--fg)" }}>{r.label}</strong> role grants {r.grants}. {role === "admin" ? "Comes with admin tools." : role === "promoter" ? "Promoter perks coming." : "Survey access + early features."}
      </div>
    </div>
  );
}

// ── Mobile Plan rail ─────────────────────────────────────────
function PlanRailMobile({ user }) {
  const c = getPlanCardContent(user || {});
  return (
    <div style={{
      position: "relative",
      borderRadius: 14,
      padding: "16px 16px 18px",
      background: `radial-gradient(circle at 100% 0%, color-mix(in oklch, ${c.accent} 14%, transparent) 0%, transparent 60%), var(--bg-elevated)`,
      border: `1px solid color-mix(in oklch, ${c.accent} 40%, var(--border-strong))`,
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {c.tier
          ? <TierBadge tier={c.tier} size="sm"/>
          : <span style={{
              padding: "3px 8px", borderRadius: 4,
              background: "var(--surface-2)", border: "1px solid var(--border-strong)",
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 9,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--fg-muted)",
            }}>Free</span>
        }
        <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.14em">{c.eyebrowRest}</MonoEyebrow>
      </div>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.025em", lineHeight: 1.08 }}>
        {c.headline}
      </div>
      <div style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.45 }}>
        {c.body}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: 11.5, color: c.accent, letterSpacing: "0.02em", marginTop: 2 }}>
        {c.punchline}
      </div>
      {/* Single primary CTA on mobile */}
      {c.ctas[0] && (
        <button style={{
          all: "unset", cursor: "pointer", textAlign: "center", marginTop: 8,
          padding: "11px 14px", borderRadius: 10,
          background: c.accent, color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13.5,
        }}>{c.ctas[0].label}</button>
      )}
    </div>
  );
}

// ── User dropdown (desktop AppBar) ──────────────────────────
function UserDropdownDesktop({ user }) {
  const { handle = "@hugh", email = "hugh@featherweigh...", tier = "free", role = "member", trial, activeTheme = "Electric" } = user || {};
  const isRoleHolder = role && role !== "member";
  const isAdmin = role === "admin";
  const c = getPlanCardContent(user || {});

  // Plan row accent border — ties the row visually to the tier chip up top.
  // Free has no border. Paid tiers get their accent. Founder gets a gradient.
  const planAccent = c.tier === "founder"
    ? "linear-gradient(180deg, var(--signal) 0%, var(--accent) 100%)"
    : c.tier === "premium" ? "var(--signal)"
    : c.tier === "supporter" ? "var(--accent)"
    : trial ? "var(--signal)"
    : isRoleHolder ? "var(--signal)"
    : null;

  return (
    <div style={{
      width: 320, padding: 14,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Avatar + identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 44,
          background: "var(--signal)",
          border: "2px solid var(--signal)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 18,
          flexShrink: 0,
        }}>{handle[1].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Role + tier badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {isRoleHolder && <RoleBadge role={role} size="sm"/>}
            {c.tier && <TierBadge tier={c.tier} size="sm"/>}
            {!isRoleHolder && !c.tier && (
              <span style={{
                padding: "3px 7px", borderRadius: 4,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9,
                letterSpacing: "0.14em", color: "var(--fg-muted)",
              }}>FREE</span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </div>
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)", cursor: "pointer", flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* PLAN section — accent-bordered to match the tier chip */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MonoEyebrow size={9} letterSpacing="0.16em">Plan</MonoEyebrow>
        <div style={{
          position: "relative",
          padding: "10px 12px 10px 14px", borderRadius: 10,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          overflow: "hidden",
        }}>
          {/* Left accent stripe (paid tiers / trial / role-holder only) */}
          {planAccent && (
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              background: planAccent,
            }}/>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: "-0.01em" }}>
              {c.tier === "founder" ? "Founder · locked $3/mo"
                : c.tier === "premium" ? (trial ? `Premium · trial · ${trial.daysLeft}d left` : "Premium · $5/mo")
                : c.tier === "supporter" ? "Supporter · $2/mo"
                : isRoleHolder ? `Free · ${(ROLES.find(x=>x.key===role) || {}).label} grants Premium`
                : "Free"}
            </div>
            <MonoEyebrow size={9}>
              {c.tier === "founder" ? "Forever. Even when we charge new users."
                : trial ? "Then $5/mo on day 15"
                : c.tier === "premium" ? "Manage subscription"
                : c.tier === "supporter" ? "Upgrade or cancel"
                : isRoleHolder && !c.tier ? "No card on file"
                : "See the tiers"}
            </MonoEyebrow>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ color: c.tier === "founder" ? "var(--accent)" : c.tier === "premium" ? "var(--signal)" : "var(--fg-subtle)", flexShrink: 0 }}>
            <path d="M5 3 L9 7 L5 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Nav rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <DropdownNavItem label="Submitted prices" suffix="5 LIVE"/>
        {/* Theme row — matches theme-picker UserMenuRow pattern */}
        <DropdownThemeRow active={activeTheme}/>
        <DropdownNavItem label="Settings" suffix="⌘ ,"/>
      </div>

      {isAdmin && (
        <>
          <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MonoEyebrow size={9} letterSpacing="0.16em">Operations</MonoEyebrow>
            <DropdownNavItem label="Admin" icon={(
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 1 L12 3 L12 7 C12 10 9.5 12.5 7 13 C4.5 12.5 2 10 2 7 L2 3 L7 1Z" fill="none" stroke="var(--signal)" strokeWidth="1.4"/>
              </svg>
            )}/>
          </div>
        </>
      )}

      <div style={{ height: 1, background: "var(--border)" }}/>

      <DropdownNavItem label="Sign out" tone="warning"/>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MonoEyebrow size={9}>v1.21.0</MonoEyebrow>
        <MonoEyebrow size={9} color="var(--fg-subtle)">dev</MonoEyebrow>
      </div>
    </div>
  );
}

// ── Theme row — trigger that opens 3-col swatch popover ────────
// Lifted from design_handoff_theme_picker · UserMenuRow pattern.
// Closed state shown here; real popover behavior handled by the
// theme-picker code shipping into app-bar.jsx.
function DropdownThemeRow({ active = "Electric" }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      display: "flex", alignItems: "center", gap: 10,
      cursor: "pointer",
    }}>
      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)", letterSpacing: "-0.005em" }}>Theme</span>
      <div style={{ flex: 1 }}/>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MMark size={18}/>
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>{active}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)" }}>›</span>
      </span>
    </div>
  );
}

function DropdownNavItem({ label, suffix, tone, icon }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      display: "flex", alignItems: "center", gap: 10,
      cursor: "pointer",
      color: tone === "warning" ? "var(--warning)" : "var(--fg)",
    }}>
      {icon}
      <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.005em" }}>{label}</span>
      <div style={{ flex: 1 }}/>
      {suffix && <MonoEyebrow size={9.5} letterSpacing="0.16em">{suffix}</MonoEyebrow>}
    </div>
  );
}

// ── Full mocks ──────────────────────────────────────────────
function SettingsDesktopMock({ user }) {
  const { handle = "@hugh", joined = "Apr 2026", cred = "0" } = user || {};
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "grid", gridTemplateColumns: "280px 1fr" }}>
      {/* sidebar */}
      <div style={{
        borderRight: "1px solid var(--border)",
        padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 36,
            background: "var(--signal)",
            border: "2px solid var(--signal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 14,
          }}>{handle[1].toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>{handle}</div>
            <MonoEyebrow size={9}>— · joined {joined}</MonoEyebrow>
          </div>
        </div>
        <div style={{
          padding: "3px 8px", borderRadius: 4,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10,
          letterSpacing: "0.16em", color: "var(--fg-muted)", alignSelf: "flex-start",
        }}>{cred} CRED</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
          {["Profile", "Plan", "My submissions", "Appearance", "Account", "Danger zone"].map((l, i) => (
            <div key={i} style={{
              padding: "10px 12px", borderRadius: 8,
              background: l === "Plan" ? "color-mix(in oklch, var(--accent) 16%, var(--surface-1))" : "transparent",
              border: l === "Plan" ? "1px solid color-mix(in oklch, var(--accent) 40%, var(--border))" : "1px solid transparent",
              color: l === "Plan" ? "var(--fg)" : (l === "Danger zone" ? "var(--danger)" : "var(--fg-muted)"),
              fontWeight: l === "Plan" ? 800 : 600, fontSize: 13.5,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: "var(--surface-2)", opacity: 0.6 }}/>
              {l}
            </div>
          ))}
        </div>
      </div>
      {/* content */}
      <div style={{ padding: "32px 40px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 42, letterSpacing: "-0.035em", lineHeight: 1 }}>Plan</div>
            <div style={{ fontWeight: 500, fontSize: 15, color: "var(--fg-muted)", marginTop: 6 }}>
              What you're paying us. (Or not.)
            </div>
          </div>
        </div>
        <div style={{ height: 22 }}/>
        <PlanCardDesktop user={user}/>
        <div style={{ height: 14 }}/>
        <RoleRail user={user}/>
      </div>
    </div>
  );
}

function SettingsMobileMock({ user }) {
  const { handle = "@hugh", joined = "Apr 2026", cred = "0" } = user || {};
  const r = ROLES.find(x => x.key === user?.role);
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column" }}>
      {/* Header — DONE | Settings */}
      <div style={{
        display: "flex", alignItems: "center", padding: "62px 16px 12px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--signal)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 3 L4 7 L9 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          DONE
        </div>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 17 }}>Settings</div>
        <div style={{ width: 50 }}/>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "18px 16px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Identity row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 56,
            background: "var(--signal)",
            border: "2px solid var(--signal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 22,
          }}>{handle[1].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>{handle}</span>
              {r && r.key !== "member" && <RoleBadge role={r.key} size="sm"/>}
            </div>
            <MonoEyebrow size={9.5}>— · joined {joined}</MonoEyebrow>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                padding: "3px 8px", borderRadius: 4,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9,
                letterSpacing: "0.16em", color: "var(--fg-muted)",
              }}>{cred} CRED</span>
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Submit a price to start earning.</span>
            </div>
          </div>
          <button style={{
            all: "unset", cursor: "pointer",
            padding: "8px 12px", borderRadius: 8,
            border: "1px solid var(--border-strong)",
            color: "var(--fg-muted)", fontWeight: 700, fontSize: 13,
          }}>Edit</button>
        </div>

        {/* Your Plan section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <MonoEyebrow size={10}>Your plan</MonoEyebrow>
          <PlanRailMobile user={user}/>
          {user?.role && user.role !== "member" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: "var(--surface-1)", border: "1px solid var(--border)",
            }}>
              <RoleBadge role={user.role} size="sm"/>
              <div style={{ flex: 1, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.4 }}>
                Grants {r.grants}. Independent of your plan.
              </div>
            </div>
          )}
        </div>

        {/* Appearance preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <MonoEyebrow size={10}>Appearance</MonoEyebrow>
            <MonoEyebrow size={9} color="var(--fg-subtle)">Tap to switch</MonoEyebrow>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Electric","Jade","Light"].map((th, i) => (
              <div key={i} style={{
                flex: 1, padding: 8, borderRadius: 10,
                background: ["#070A1A", "#06201F", "#FAFCFF"][i],
                border: `1.5px solid ${i === 0 ? "var(--signal)" : "var(--border)"}`,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ height: 24, borderRadius: 5, background: ["#11162E","#0E3331","#F2F5FB"][i], display: "flex", alignItems: "center", gap: 4, padding: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: ["#7AE6FF","#1FFFC2","#0080A0"][i] }}/>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: ["#FF7BD4","#9B5CFF","#E0297A"][i] }}/>
                </div>
                <div style={{ height: 36, borderRadius: 5, background: ["#11162E","#0E3331","#F2F5FB"][i], padding: 5 }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: ["#E8F3FF","#E6FFF6","#070A1A"][i] }}>Habstrakt</div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: ["#7AE6FF","#1FFFC2","#0080A0"][i] }}>$35</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: ["#E8F3FF","#E6FFF6","#070A1A"][i] }}>{th}</span>
                  {i === 0 && <MonoEyebrow size={8} color="var(--signal)">ACTIVE</MonoEyebrow>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PlanCardDesktop, PlanRailMobile, UserDropdownDesktop,
  SettingsDesktopMock, SettingsMobileMock, RoleRail,
  getPlanCardContent,
});
