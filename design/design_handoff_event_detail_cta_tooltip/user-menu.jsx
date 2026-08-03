// user-menu.jsx — Concert Crawl user menu
//
// Anchored top-right popover/sheet for signed-in user actions. Shipping
// surfaces today are bare ("Settings / Sign out") — this is the upgrade.
//
// What it carries:
//   • Identity card        avatar + email + plan eyebrow
//   • Quick destinations   Watching · Submitted prices · Settings
//   • Beta-channel row     Send feedback (hot, accent dot) · BETA badge
//   • Sign out
//
// Variants:
//   <UserMenu variant="popover|sheet" theme={...} />
//   - popover  desktop / large-tablet anchored card (240–280 wide)
//   - sheet    mobile bottom-sheet adaptation w/ drag handle
//
// All color comes from theme tokens. Brand mark uses CCMark (local copy).

// ── Local Cluster Path mark — CCMark verbatim ───────────────────
function UMMark({ size = 22 }) {
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

// One-time keyframes
if (typeof document !== "undefined" && !document.getElementById("um-keyframes")) {
  const s = document.createElement("style");
  s.id = "um-keyframes";
  s.textContent = `
    @keyframes umPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  `;
  document.head.appendChild(s);
}

// ── Avatar (initial + accent halo) ──────────────────────────────
// Extended Aug 3, 2026 for the watcher crawl (design_handoff_event_detail_cta_
// tooltip/watcher-roster.jsx). Two OPTIONAL props; omit both and the render is
// byte-identical to what shipped:
//   tone   — recolours the halo, border tint and glyph. The crawl needs
//            per-handle colour so a stack of discs reads as distinct people;
//            the halo was already the disc's colour knob, so this is that knob
//            made a parameter instead of a second component.
//   muted  — no halo, mono type, --fg-muted. For the "+9" overflow disc, which
//            is a count rather than a person but must sit in the same stack.
function UMAvatar({ initial = "Y", size = 36, tone, muted = false, ring }) {
  const hue = tone || "var(--accent)";
  return (
    <div style={{
      position: "relative",
      width: size, height: size, borderRadius: size / 2,
      background: "var(--surface-2)",
      border: `1px solid ${tone ? `color-mix(in oklch, ${hue} 55%, var(--border-strong))` : "var(--border-strong)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: muted ? "var(--fg-muted)" : (tone ? hue : "var(--fg)"),
      fontFamily: muted ? "'JetBrains Mono', ui-monospace, monospace" : "Inter, system-ui",
      fontWeight: muted ? 700 : 800,
      fontSize: size * (muted ? 0.34 : 0.42),
      letterSpacing: "-0.01em",
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
    }}>
      {!muted && (
        <span style={{
          position: "absolute", inset: -2,
          borderRadius: (size + 4) / 2,
          background: `radial-gradient(circle at 30% 30%, ${hue} 0%, transparent 70%)`,
          opacity: 0.35, pointerEvents: "none",
        }}/>
      )}
      <span style={{ position: "relative" }}>{initial}</span>
    </div>
  );
}

// ── Eyebrow ─────────────────────────────────────────────────────
function UMEyebrow({ children, color }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: color || "var(--fg-subtle)",
      letterSpacing: "0.14em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

// ── Identity card ───────────────────────────────────────────────
function UMIdentity({ user = { initial: "H", email: "hugh@concertcrawl.app", plan: "Beta · founder" } }) {
  return (
    <div style={{
      padding: "14px 14px 12px",
      display: "flex", alignItems: "center", gap: 12,
      borderBottom: "1px solid var(--border)",
    }}>
      <UMAvatar initial={user.initial} size={42}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <UMEyebrow color="var(--accent)">{user.plan}</UMEyebrow>
        <div style={{
          fontFamily: "Inter, system-ui",
          fontSize: 14, fontWeight: 700,
          color: "var(--fg)",
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{user.email}</div>
      </div>
      <button type="button" aria-label="Account" style={{
        all: "unset", cursor: "pointer",
        width: 28, height: 28, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)",
        border: "1px solid var(--border)",
      }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Generic row ─────────────────────────────────────────────────
function UMRow({ label, meta, kbd, hot = false, danger = false, last = false, leading, trailing }) {
  const color = danger ? "var(--warning)" : "var(--fg)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 14px",
      borderBottom: last ? "none" : "1px solid var(--border)",
      background: hot ? "var(--overlay-hover)" : "transparent",
      cursor: "pointer",
    }}>
      {hot && (
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "var(--accent)",
          boxShadow: "0 0 6px var(--accent)",
          animation: "umPulse 1.6s ease-in-out infinite",
          flexShrink: 0,
        }}/>
      )}
      {leading}
      <span style={{
        flex: 1, minWidth: 0,
        fontFamily: "Inter, system-ui",
        fontSize: 13.5,
        fontWeight: hot ? 800 : 600,
        color,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{label}</span>
      {trailing}
      {meta != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: hot ? "var(--accent)" : "var(--fg-subtle)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}>{meta}</span>
      )}
      {kbd && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--fg-subtle)",
          padding: "2px 6px",
          borderRadius: 4,
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          letterSpacing: "0.08em",
        }}>{kbd}</span>
      )}
    </div>
  );
}

// ── Section divider with eyebrow ───────────────────────────────
function UMSection({ label, children }) {
  return (
    <>
      <div style={{
        padding: "10px 14px 4px",
        background: "var(--bg-elevated)",
      }}>
        <UMEyebrow>{label}</UMEyebrow>
      </div>
      {children}
    </>
  );
}

// ── Status rail (footer) ───────────────────────────────────────
function UMStatusFooter({ build = "v0.4.2-beta", commit = "5e9c1a3" }) {
  return (
    <div style={{
      padding: "10px 14px",
      borderTop: "1px solid var(--border)",
      background: "var(--surface-1)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 5,
        background: "var(--signal)",
        boxShadow: "0 0 5px var(--signal)",
        animation: "umPulse 2.2s ease-in-out infinite",
      }}/>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700,
        color: "var(--fg-muted)",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
      }}>{build}</span>
      <span style={{ flex: 1 }}/>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 600,
        color: "var(--fg-subtle)",
        letterSpacing: "0.08em",
      }}>{commit}</span>
    </div>
  );
}

// ── Menu body — shared between popover and sheet ───────────────
function UMBody({
  user,
  showFeedback = true,
  showThemeRow = true,
  unread = { submitted: 2 },
}) {
  const isAdmin = user?.role === "admin";
  return (
    <>
      <UMIdentity user={user}/>
      <UMSection label="You">
        <UMRow label="Submitted prices"  meta={unread.submitted ? `${unread.submitted} live` : null} kbd="P" last/>
      </UMSection>
      <UMSection label="App">
        {showThemeRow && (
          <UMRow
            label="Theme"
            trailing={
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {["electric", "jade", "light"].map((t, i) => (
                  <span key={t} style={{
                    width: 12, height: 12, borderRadius: 4,
                    background:
                      t === "electric" ? "linear-gradient(135deg, #070A1A 50%, #FF7BD4 50%)" :
                      t === "jade"     ? "linear-gradient(135deg, #06201F 50%, #1FFFC2 50%)" :
                                         "linear-gradient(135deg, #FAFCFF 50%, #FF7BD4 50%)",
                    border: "1px solid var(--border-strong)",
                    boxShadow: i === 0 ? "0 0 0 1.5px var(--signal)" : "none",
                  }}/>
                ))}
              </div>
            }
          />
        )}
        <UMRow label="Settings"        kbd="⌘,"/>
        <UMRow label="Notifications"   meta="On" last/>
      </UMSection>
      {isAdmin && (
        <UMSection label="Operations">
          <UMRow
            label="Admin"
            meta="⌘⇧A"
            last
            leading={
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: "var(--surface-2)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--signal)",
                flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-0.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
                        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M5.5 8.2l1.8 1.8L10.5 7" stroke="currentColor" strokeWidth="1.4"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            }
          />
        </UMSection>
      )}
      {showFeedback && (
        <UMSection label="Beta channel">
          <UMRow
            label="Send feedback"
            meta="BETA"
            hot={true}
            last
            leading={
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: "var(--surface-2)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12v7H6.5L4 13.5V11H2V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <circle cx="6"  cy="7.5" r="0.8" fill="currentColor"/>
                  <circle cx="8"  cy="7.5" r="0.8" fill="currentColor"/>
                  <circle cx="10" cy="7.5" r="0.8" fill="currentColor"/>
                </svg>
              </span>
            }
          />
        </UMSection>
      )}
      <div style={{ borderTop: "1px solid var(--border)" }}/>
      <UMRow label="Sign out" danger last/>
    </>
  );
}

// ── Popover (desktop) ──────────────────────────────────────────
function UserMenuPopover({ user, width = 280, ...rest }) {
  return (
    <div style={{
      width,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)",
      overflow: "hidden",
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
      display: "flex", flexDirection: "column",
    }}>
      <UMBody user={user} {...rest}/>
      <UMStatusFooter/>
    </div>
  );
}

// ── Bottom sheet (mobile) ──────────────────────────────────────
function UserMenuSheet({ user, ...rest }) {
  return (
    <div style={{
      width: "100%",
      background: "var(--bg-elevated)",
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      border: "1px solid var(--border)",
      borderBottom: "none",
      boxShadow: "0 -16px 48px rgba(0,0,0,0.45)",
      overflow: "hidden",
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        height: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "var(--border-strong)",
        }}/>
      </div>
      <UMBody user={user} {...rest}/>
      <UMStatusFooter/>
    </div>
  );
}

// ── Combined entry ─────────────────────────────────────────────
function UserMenu({ variant = "popover", ...rest }) {
  return variant === "sheet"
    ? <UserMenuSheet {...rest}/>
    : <UserMenuPopover {...rest}/>;
}

Object.assign(window, {
  UserMenu, UserMenuPopover, UserMenuSheet,
  UMMark, UMAvatar, UMRow, UMSection, UMIdentity, UMStatusFooter,
});
