// admin-shell-v2.jsx — Updated admin shell.
// What changed vs v1 (design_handoff_admin_ui/admin-shell.jsx):
//   1. NAV_V2 — Events + Prices collapsed into a single "Review" item.
//      New "Feedback" item slotted in Operations between Crawl and Review.
//      Badge math: Review badge = pending event flags + pending price submissions.
//      Feedback badge = unread feedback items.
//   2. AdminTopbar gets <AppSwitcher /> — bidirectional jump between
//      Admin and the consumer app. Lives next to the breadcrumb so it's
//      glanceable, not hidden in a settings menu.
//   3. New layout mode: "mobile" (≤ 720px). Sidebar collapses behind a
//      sheet drawer; a bottom tab bar surfaces the 5 most-used items.
//      Topbar shrinks: hamburger, breadcrumb tail only, app switcher.

const NAV_V2 = [
  { key: "dashboard", label: "Dashboard",    icon: "dashboard", href: "/admin",              section: "ops" },
  { key: "venues",    label: "Venues",       icon: "venues",    href: "/admin/venues",       section: "ops" },
  { key: "crawl",     label: "Crawl",        icon: "crawl",     href: "/admin/crawl",        section: "ops", badge: { count: 2, kind: "danger" } },
  { key: "review",    label: "Review",       icon: "events",    href: "/admin/review",       section: "ops", badge: { count: 14, kind: "warning" } },
  { key: "feedback",  label: "Feedback",     icon: "inbox",     href: "/admin/feedback",     section: "ops", badge: { count: 3, kind: "signal" } },
  { key: "invites",   label: "Invite codes", icon: "invites",   href: "/admin/invite-codes", section: "account" },
  { key: "settings",  label: "Settings",     icon: "settings",  href: "/admin/settings",     section: "account" },
];

// ── App switcher — Admin ↔ User app ──────────────────────────────────
// Lives in the topbar (and in the mobile sheet drawer). Two-state segmented
// pill that's visually obvious; clicking "User app" jumps to "/" (consumer).
function AppSwitcher({ value = "admin", size = "md", onChange }) {
  const sizes = {
    sm: { h: 26, fs: 10, px: 8,  gap: 4 },
    md: { h: 30, fs: 11, px: 10, gap: 5 },
  }[size];
  const opts = [
    { key: "user",  label: "User app", icon: "external", title: "Open the consumer app in this tab" },
    { key: "admin", label: "Admin",    icon: "dashboard", title: "You are here" },
  ];
  return (
    <div role="tablist" aria-label="App context" style={{
      display: "inline-flex", alignItems: "center",
      padding: 2, borderRadius: 8,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      height: sizes.h + 4,
    }}>
      {opts.map(o => {
        const active = value === o.key;
        return (
          <button key={o.key} role="tab" aria-selected={active} title={o.title}
            onClick={() => onChange && onChange(o.key)} style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: sizes.gap,
            height: sizes.h, padding: `0 ${sizes.px}px`, borderRadius: 6,
            fontFamily: ADMIN_FONT, fontSize: sizes.fs, fontWeight: 700,
            letterSpacing: "-0.005em",
            color: active ? "var(--fg)" : "var(--fg-muted)",
            background: active ? "var(--bg-elevated)" : "transparent",
            boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border)" : "none",
            transition: "background .12s, color .12s",
          }}>
            <AdminIcon name={o.icon} size={sizes.fs + 2} color={active ? "var(--signal)" : "currentColor"} />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── NavItem (reused, slightly refined for v2) ──────────────────────────
function NavItemV2({ item, active, collapsed, onClick }) {
  const c = item;
  return (
    <button onClick={onClick} title={collapsed ? c.label : ""} style={{
      all: "unset", boxSizing: "border-box",
      display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", position: "relative",
      width: "100%", padding: collapsed ? "10px 0" : "8px 10px 8px 14px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 8,
      color: active ? "var(--fg)" : "var(--fg-muted)",
      background: active ? "var(--surface-2)" : "transparent",
      transition: "background .12s, color .12s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--overlay-hover)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {active && (
        <span style={{ position: "absolute", left: collapsed ? 6 : 0, top: 8, bottom: 8, width: 2, background: "var(--signal)", borderRadius: 2 }} />
      )}
      <AdminIcon name={c.icon} size={17} color={active ? "var(--signal)" : "currentColor"} />
      {!collapsed && (
        <>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: "-0.005em", flex: 1 }}>{c.label}</span>
          {c.badge && c.badge.count > 0 && (
            <span style={{
              minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
              fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: c.badge.kind === "warning" ? "var(--bg)" : "var(--fg-on-accent)",
              background: `var(--${c.badge.kind})`,
              fontVariantNumeric: "tabular-nums",
            }}>{c.badge.count > 99 ? "99+" : c.badge.count}</span>
          )}
        </>
      )}
      {collapsed && c.badge && c.badge.count > 0 && (
        <span style={{
          position: "absolute", top: 6, right: 12,
          width: 8, height: 8, borderRadius: 4,
          background: `var(--${c.badge.kind})`,
          boxShadow: "0 0 0 2px var(--surface-1)",
        }} />
      )}
    </button>
  );
}

// ── Sidebar v2 (full/rail) ────────────────────────────────────────────
function SidebarV2({ active = "dashboard", mode = "full", onNav, onInbox, unread = 3 }) {
  const collapsed = mode === "rail";
  const width = collapsed ? 64 : 240;
  const ops = NAV_V2.filter(n => n.section === "ops");
  const acct = NAV_V2.filter(n => n.section === "account");
  return (
    <aside style={{
      width, flexShrink: 0,
      background: "var(--surface-1)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width .2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "16px 0" : "16px 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderBottom: "1px solid var(--border)",
        height: 64, boxSizing: "border-box",
      }}>
        <CCMarkAdmin size={collapsed ? 28 : 30} />
        {!collapsed && <CCWordmarkAdmin size={15} declaration="ADMIN" />}
      </div>
      <nav style={{ flex: 1, padding: collapsed ? "10px 8px" : "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {!collapsed && <div style={{ padding: "6px 8px 8px" }}><MonoLabel>Operations</MonoLabel></div>}
        {ops.map(n => <NavItemV2 key={n.key} item={n} active={active === n.key} collapsed={collapsed} onClick={() => onNav && onNav(n.key)} />)}
        {!collapsed && <div style={{ padding: "16px 8px 8px" }}><MonoLabel>Account</MonoLabel></div>}
        {acct.map(n => <NavItemV2 key={n.key} item={n} active={active === n.key} collapsed={collapsed} onClick={() => onNav && onNav(n.key)} />)}
      </nav>
      {/* Bottom: inbox + user (kept from v1, simplified) */}
      <div style={{ borderTop: "1px solid var(--border)", padding: collapsed ? "10px 8px" : "10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "8px 0" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg, var(--accent), var(--signal))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ADMIN_FONT, fontWeight: 700, fontSize: 12, color: "var(--fg-on-accent)", flexShrink: 0 }}>HV</div>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>Hugh Vincent</div>
              <div style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>owner</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Topbar v2 (with AppSwitcher) ──────────────────────────────────────
function AdminTopbarV2({ breadcrumb = ["Admin"], appContext = "admin", onAppContext, theme, onTheme, search = true, actions, compact = false }) {
  return (
    <header style={{
      height: 56, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", gap: 16,
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <AppSwitcher value={appContext} onChange={onAppContext} />
        <span style={{ width: 1, height: 18, background: "var(--border)" }} />
        <nav style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <AdminIcon name="chevR" size={12} color="var(--fg-subtle)" />}
              <span style={{
                fontFamily: ADMIN_FONT, fontSize: 13,
                fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                color: i === breadcrumb.length - 1 ? "var(--fg)" : "var(--fg-muted)",
                letterSpacing: "-0.005em", whiteSpace: "nowrap",
              }}>{typeof b === "string" ? b : b.label}</span>
            </React.Fragment>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {search && !compact && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 32, padding: "0 12px",
            borderRadius: 8, background: "var(--surface-1)",
            border: "1px solid var(--border)", width: 260,
            color: "var(--fg-subtle)",
          }}>
            <AdminIcon name="search" size={13} />
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, flex: 1 }}>Search venues, events, runs…</span>
            <Kbd>⌘K</Kbd>
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}

// ── Mobile shell ─────────────────────────────────────────────────────
// Topbar: hamburger + tail breadcrumb + AppSwitcher (small)
// Body: content
// Bottom tab bar: top 5 nav items (Dashboard, Venues, Crawl, Review, Feedback)
//
// Drawer (sheet) opens from left when hamburger is tapped — shows full nav,
// account row, "Open user app" button. Drawer state is local; the canvas
// renders open/closed variants side-by-side.
function MobileShell({ active = "dashboard", title = "Dashboard", breadcrumbTail, appContext = "admin", drawerOpen = false, children }) {
  const tabItems = NAV_V2.filter(n => n.section === "ops").slice(0, 5);
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: ADMIN_FONT, position: "relative", overflow: "hidden",
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}>
        <button style={{ all: "unset", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--fg-muted)", display: "flex" }}>
          <AdminIcon name="side" size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 15, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>{title}</span>
          {breadcrumbTail && (
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-subtle)" }}>· {breadcrumbTail}</span>
          )}
        </div>
        <AppSwitcher value={appContext} size="sm" />
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto", padding: "16px 14px 84px", background: "var(--bg)" }}>
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: 64, padding: "6px 6px 10px",
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border)",
        display: "grid", gridTemplateColumns: `repeat(${tabItems.length}, 1fr)`,
        gap: 4,
      }}>
        {tabItems.map(n => {
          const a = active === n.key;
          return (
            <button key={n.key} style={{
              all: "unset", cursor: "pointer", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, padding: "4px 0", borderRadius: 8,
              color: a ? "var(--fg)" : "var(--fg-subtle)",
              position: "relative",
            }}>
              <div style={{ position: "relative", display: "flex" }}>
                <AdminIcon name={n.icon} size={20} color={a ? "var(--signal)" : "currentColor"} />
                {n.badge && n.badge.count > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -8,
                    minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
                    fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: n.badge.kind === "warning" ? "var(--bg)" : "var(--fg-on-accent)",
                    background: `var(--${n.badge.kind})`,
                    boxShadow: "0 0 0 2px var(--bg-elevated)",
                    fontVariantNumeric: "tabular-nums",
                  }}>{n.badge.count > 9 ? "9+" : n.badge.count}</span>
                )}
              </div>
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 10, fontWeight: a ? 700 : 600, letterSpacing: "-0.005em" }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Drawer (mobile sheet from left) */}
      {drawerOpen && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10 }} />
          <aside style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "78%", maxWidth: 320,
            background: "var(--bg-elevated)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column", zIndex: 11,
            boxShadow: "8px 0 32px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid var(--border)", height: 64, boxSizing: "border-box" }}>
              <CCMarkAdmin size={30} />
              <CCWordmarkAdmin size={15} declaration="ADMIN" />
              <button style={{ all: "unset", cursor: "pointer", padding: 6, color: "var(--fg-subtle)", marginLeft: "auto" }}>
                <AdminIcon name="x" size={16} />
              </button>
            </div>
            <div style={{ padding: 12 }}>
              <AppSwitcher value={appContext} />
            </div>
            <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
              <div style={{ padding: "6px 8px 8px" }}><MonoLabel>Operations</MonoLabel></div>
              {NAV_V2.filter(n => n.section === "ops").map(n => (
                <NavItemV2 key={n.key} item={n} active={active === n.key} collapsed={false} />
              ))}
              <div style={{ padding: "16px 8px 8px" }}><MonoLabel>Account</MonoLabel></div>
              {NAV_V2.filter(n => n.section === "account").map(n => (
                <NavItemV2 key={n.key} item={n} active={active === n.key} collapsed={false} />
              ))}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}

// ── AdminShell v2 — desktop wrapper ──────────────────────────────────
function AdminShellV2({ active, breadcrumb, children, theme, appContext = "admin", onAppContext, sidebarMode = "full", topbarActions, width = 1440, height = 900, frame = true }) {
  const inner = (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: ADMIN_FONT,
    }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarV2 active={active} mode={sidebarMode} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <AdminTopbarV2 breadcrumb={breadcrumb} appContext={appContext} onAppContext={onAppContext} actions={topbarActions} />
          <main style={{ flex: 1, overflow: "auto", padding: "24px 28px", background: "var(--bg)", position: "relative" }}>{children}</main>
        </div>
      </div>
    </div>
  );
  if (!frame) return inner;
  return (
    <ThemeProvider theme={theme || "light"}>
      <div style={{ width, height, overflow: "hidden", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
        {inner}
      </div>
    </ThemeProvider>
  );
}

Object.assign(window, {
  NAV_V2, AppSwitcher, NavItemV2, SidebarV2, AdminTopbarV2, AdminShellV2, MobileShell,
});
