// admin-shell.jsx — Concert Crawl admin layout shell.
// Exports:
//   AdminShell({nav, page, children, sidebarMode, theme, onTheme})
//   Sidebar variants:
//     - "full"       240px, default
//     - "rail"       64px icons-only
//     - "auto"       collapses below 1280, expandable on hover (we render the expanded state visually)
//   AdminTopbar — page title + breadcrumb + global search + theme toggle + user
//   InboxPanel (notification surface — "Inbox", not literal bell)
//   InboxRow

const NAV = [
  { key: "dashboard",   label: "Dashboard",     icon: "dashboard", href: "/admin" },
  { key: "venues",      label: "Venues",        icon: "venues",    href: "/admin/venues" },
  { key: "crawl",       label: "Crawl",         icon: "crawl",     href: "/admin/crawl",  badge: { count: 2, kind: "danger" } },
  { key: "events",      label: "Event review",  icon: "events",    href: "/admin/events", badge: { count: 12, kind: "warning" } },
  { key: "prices",      label: "Prices",        icon: "prices",    href: "/admin/prices" },
  { key: "invites",     label: "Invite codes",  icon: "invites",   href: "/admin/invite-codes" },
  { key: "settings",    label: "Settings",      icon: "settings",  href: "/admin/settings" },
];

// ── NavItem ───────────────────────────────────────────────────────────
function NavItem({ item, active, collapsed, onClick }) {
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
        <span style={{
          position: "absolute", left: collapsed ? 6 : 0, top: 8, bottom: 8, width: 2,
          background: "var(--signal)", borderRadius: 2,
        }} />
      )}
      <AdminIcon name={c.icon} size={17} color={active ? "var(--signal)" : "currentColor"} />
      {!collapsed && (
        <>
          <span style={{
            fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: active ? 600 : 500,
            letterSpacing: "-0.005em", flex: 1,
          }}>{c.label}</span>
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

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ active = "dashboard", mode = "full", onNav, onInbox, inboxOpen, unread = 3, onCollapseToggle }) {
  const collapsed = mode === "rail";
  const width = collapsed ? 64 : 240;
  return (
    <aside style={{
      width, flexShrink: 0,
      background: "var(--surface-1)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width .2s ease",
    }}>
      {/* Brand lockup */}
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

      {/* Nav */}
      <nav style={{
        flex: 1, padding: collapsed ? "10px 8px" : "12px 10px",
        display: "flex", flexDirection: "column", gap: 2, overflowY: "auto",
      }}>
        {!collapsed && (
          <div style={{ padding: "6px 8px 8px" }}>
            <MonoLabel>Operations</MonoLabel>
          </div>
        )}
        {NAV.slice(0, 6).map(n => (
          <NavItem key={n.key} item={n} active={active === n.key}
            collapsed={collapsed} onClick={() => onNav && onNav(n.key)} />
        ))}
        {!collapsed && (
          <div style={{ padding: "16px 8px 8px" }}>
            <MonoLabel>Account</MonoLabel>
          </div>
        )}
        {NAV.slice(6).map(n => (
          <NavItem key={n.key} item={n} active={active === n.key}
            collapsed={collapsed} onClick={() => onNav && onNav(n.key)} />
        ))}
      </nav>

      {/* Inbox + user */}
      <div style={{
        borderTop: "1px solid var(--border)",
        padding: collapsed ? "10px 8px" : "10px",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        <button onClick={onInbox} title="Inbox" style={{
          all: "unset", boxSizing: "border-box", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          padding: collapsed ? "10px 0" : "8px 10px 8px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          width: "100%", borderRadius: 8, position: "relative",
          background: inboxOpen ? "var(--surface-2)" : "transparent",
          color: inboxOpen ? "var(--fg)" : "var(--fg-muted)",
          transition: "background .12s",
        }}>
          {inboxOpen && (
            <span style={{ position: "absolute", left: collapsed ? 6 : 0, top: 8, bottom: 8, width: 2, background: "var(--signal)", borderRadius: 2 }} />
          )}
          <div style={{ position: "relative", display: "flex" }}>
            <AdminIcon name="inbox" size={17} color={inboxOpen ? "var(--signal)" : "currentColor"} />
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -6,
                minWidth: 14, height: 14, padding: "0 4px", borderRadius: 7,
                fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--fg-on-accent)", background: "var(--danger)",
                boxShadow: "0 0 0 2px var(--surface-1)",
                fontVariantNumeric: "tabular-nums",
              }}>{unread > 9 ? "9+" : unread}</span>
            )}
          </div>
          {!collapsed && (
            <>
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: inboxOpen ? 600 : 500, flex: 1 }}>Inbox</span>
              {unread > 0 && (
                <MonoLabel color="var(--fg-subtle)" size={10}>{unread} new</MonoLabel>
              )}
            </>
          )}
        </button>

        {/* User */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: collapsed ? "8px 0" : "8px 10px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent), var(--signal))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: ADMIN_FONT, fontWeight: 700, fontSize: 12,
            color: "var(--fg-on-accent)", flexShrink: 0,
          }}>HV</div>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>Hugh Vincent</div>
              <div style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>owner</div>
            </div>
          )}
          {!collapsed && onCollapseToggle && (
            <button onClick={onCollapseToggle} title="Collapse sidebar" style={{
              all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
              color: "var(--fg-subtle)",
            }}><AdminIcon name="side" size={14} /></button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────
function AdminTopbar({ breadcrumb = ["Admin"], theme, onTheme, search = true, actions, onCollapseToggle }) {
  return (
    <header style={{
      height: 56, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", gap: 16,
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onCollapseToggle && (
          <button onClick={onCollapseToggle} title="Toggle sidebar" style={{
            all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
            color: "var(--fg-muted)", display: "flex",
          }}><AdminIcon name="side" size={16} /></button>
        )}
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
        {search && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 32, padding: "0 12px",
            borderRadius: 8, background: "var(--surface-1)",
            border: "1px solid var(--border)", width: 280,
            color: "var(--fg-subtle)",
          }}>
            <AdminIcon name="search" size={13} />
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, flex: 1 }}>
              Search venues, events, runs…
            </span>
            <Kbd>⌘K</Kbd>
          </div>
        )}
        {actions}
        {onTheme && <ThemePill value={theme} onChange={onTheme} />}
      </div>
    </header>
  );
}

// ── Theme pill (in-app, replaces floating switcher in admin) ──────────
function ThemePill({ value, onChange }) {
  const opts = [
    { key: "light", label: "Light", icon: "sun" },
    { key: "electric", label: "Elec", icon: "moon" },
    { key: "jade", label: "Jade", icon: "moon" },
  ];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      padding: 2, borderRadius: 8,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      gap: 0,
    }}>
      {opts.map(o => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)} title={o.label} style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "5px 9px", borderRadius: 6,
            fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
            color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
            background: active ? "var(--signal)" : "transparent",
            transition: "background .12s, color .12s",
          }}>
            <AdminIcon name={o.icon} size={11} />
            <span>{o.label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Inbox panel (notification surface) ────────────────────────────────
const SAMPLE_INBOX = [
  { id: 1, kind: "danger", icon: "alert",    title: "Crawl failed · Red Rocks Amphitheatre", body: "HTTP 403 — venue blocked. 3rd consecutive failure.", time: "2m ago", action: "View run", read: false, category: "crawl.failed" },
  { id: 2, kind: "warning", icon: "alertTri", title: "12 events need review",                 body: "Bluebird Theater · low confidence (0.42–0.61)",       time: "15m ago", action: "Open queue", read: false, category: "crawl.low_confidence" },
  { id: 3, kind: "danger", icon: "shield",   title: "robots.txt now disallowed at Larimer",   body: "Schedule paused. Reach out for permission?",          time: "1h ago", action: "Open venue", read: false, category: "crawl.blocked" },
  { id: 4, kind: "signal", icon: "key",      title: "Invite code redeemed",                   body: "marlene@kalimba.studio · code FRT-PNK-92",            time: "3h ago", action: null, read: true, category: "invite_code.used" },
  { id: 5, kind: "warning", icon: "flag",    title: "Duplicate event flagged",                body: "“Bright Eyes” at Red Rocks · 2 sources",              time: "5h ago", action: "Reconcile", read: true, category: "event.flagged" },
  { id: 6, kind: "signal", icon: "key",      title: "Invite code redeemed",                   body: "lou@elsewhere.fm · code OGD-BLU-44",                  time: "yesterday", action: null, read: true, category: "invite_code.used" },
];

function InboxRow({ n, onRead }) {
  const unread = !n.read;
  return (
    <div style={{
      display: "flex", gap: 12,
      padding: "12px 16px",
      background: unread ? "var(--surface-2)" : "transparent",
      borderBottom: "1px solid var(--border)",
      cursor: "pointer", position: "relative",
      transition: "background .12s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--overlay-hover)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = unread ? "var(--surface-2)" : "transparent"; }}
    >
      {unread && (
        <span style={{
          position: "absolute", left: 6, top: 18,
          width: 6, height: 6, borderRadius: 3, background: "var(--signal)",
        }} />
      )}
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `color-mix(in oklab, var(--${n.kind}) 16%, transparent)`,
        color: `var(--${n.kind})`,
      }}>
        <AdminIcon name={n.icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 13,
          fontWeight: unread ? 600 : 500,
          color: unread ? "var(--fg)" : "var(--fg-muted)",
          letterSpacing: "-0.005em", marginBottom: 2,
        }}>{n.title}</div>
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 12,
          color: "var(--fg-muted)", lineHeight: 1.4,
          marginBottom: 6,
        }}>{n.body}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RelTime value={n.time} />
          {n.action && (
            <span style={{
              fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 600,
              color: "var(--signal)", letterSpacing: "-0.005em",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>{n.action} <AdminIcon name="chevR" size={11} /></span>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxPanel({ items = SAMPLE_INBOX, anchor = "popover", onClose }) {
  // anchor: "popover" | "inline" | "page"
  const widths = { popover: 380, inline: 360, page: "100%" };
  return (
    <div style={{
      width: widths[anchor],
      maxHeight: anchor === "page" ? "100%" : 520,
      background: "var(--bg-elevated)",
      border: anchor === "page" ? "none" : "1px solid var(--border)",
      borderRadius: anchor === "page" ? 0 : 12,
      boxShadow: anchor === "popover" ? "0 18px 48px rgba(0,0,0,.32), 0 4px 12px rgba(0,0,0,.18)" : "none",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Inbox</span>
          <StatusBadge kind="danger" mono>{items.filter(i => !i.read).length} unread</StatusBadge>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <AdminButton variant="ghost" size="sm">Mark all read</AdminButton>
          {onClose && (
            <button onClick={onClose} style={{
              all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
              color: "var(--fg-subtle)", display: "flex",
            }}><AdminIcon name="x" size={14} /></button>
          )}
        </div>
      </div>
      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 6, padding: "10px 16px",
        borderBottom: "1px solid var(--border)", background: "var(--surface-1)",
      }}>
        {[
          { k: "all", label: "All", count: items.length, active: true },
          { k: "crawl", label: "Crawl", count: 3 },
          { k: "events", label: "Events", count: 1 },
          { k: "invites", label: "Invites", count: 2 },
        ].map(f => (
          <button key={f.k} style={{
            all: "unset", cursor: "pointer",
            padding: "4px 10px", borderRadius: 999,
            fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 600,
            color: f.active ? "var(--fg-on-accent)" : "var(--fg-muted)",
            background: f.active ? "var(--signal)" : "var(--surface-2)",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            {f.label}
            <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, opacity: 0.7 }}>{f.count}</span>
          </button>
        ))}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {items.map(n => <InboxRow key={n.id} n={n} />)}
      </div>
      {anchor === "popover" && (
        <div style={{
          padding: "10px 16px", borderTop: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <MonoLabel>SSE · live</MonoLabel>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--signal)", fontWeight: 600 }}>
            Open Inbox →
          </span>
        </div>
      )}
    </div>
  );
}

// ── AdminShell — convenience wrapper that frames a page in a desktop layout ──
function AdminShell({ active, breadcrumb, children, theme, onTheme, sidebarMode = "full", onNav, inboxOpen = false, onInbox, topbarActions, width = 1440, height = 900, frame = true }) {
  const inner = (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: ADMIN_FONT,
    }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar active={active} mode={sidebarMode} onNav={onNav}
          inboxOpen={inboxOpen} onInbox={onInbox} unread={3} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <AdminTopbar breadcrumb={breadcrumb} theme={theme} onTheme={onTheme} actions={topbarActions} />
          <main style={{
            flex: 1, overflow: "auto",
            padding: "24px 28px",
            background: "var(--bg)",
          }}>{children}</main>
        </div>
        {inboxOpen && (
          <div style={{
            width: 380, flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
            <InboxPanel anchor="inline" onClose={onInbox} />
          </div>
        )}
      </div>
    </div>
  );
  if (!frame) return inner;
  return (
    <ThemeProvider theme={theme || "light"}>
      <div style={{ width, height, overflow: "hidden", borderRadius: 12,
                    border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
        {inner}
      </div>
    </ThemeProvider>
  );
}

// ── Browser-window admin frame for canvas presentation ─────────────────
function AdminBrowserFrame({ url = "concertcrawl.app/admin", children, width = 1440, height = 900, theme = "light" }) {
  return (
    <ThemeProvider theme={theme}>
      <div style={{
        width, height, overflow: "hidden",
        borderRadius: 12, border: "1px solid #d6d6d3",
        background: "#ebe9e4",
        boxShadow: "0 14px 60px rgba(0,0,0,.18)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          height: 36, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 14px",
          borderBottom: "1px solid #d6d6d3",
          background: "#ebe9e4",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: 6, background: "#fc615d" }} />
            <span style={{ width: 11, height: 11, borderRadius: 6, background: "#fdbe40" }} />
            <span style={{ width: 11, height: 11, borderRadius: 6, background: "#34c948" }} />
          </div>
          <div style={{
            flex: 1, height: 22, borderRadius: 6,
            background: "#ffffff", border: "1px solid #d6d6d3",
            display: "flex", alignItems: "center", padding: "0 10px",
            fontFamily: ADMIN_MONO, fontSize: 11, color: "#76746f",
            letterSpacing: "0.02em",
          }}>
            <span style={{ marginRight: 6, opacity: 0.6 }}>🔒</span>{url}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>{children}</div>
      </div>
    </ThemeProvider>
  );
}

Object.assign(window, {
  NAV, NavItem, Sidebar, AdminTopbar, ThemePill,
  InboxPanel, InboxRow, SAMPLE_INBOX,
  AdminShell, AdminBrowserFrame,
});
