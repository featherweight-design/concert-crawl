// detail-desktop.jsx — Desktop Event & Venue dedicated pages
// Wraps the existing mobile EventDetail / VenueProfile in a desktop shell:
// • TopNav (web app shell) reused from browse-desktop
// • Breadcrumb back link replaces the round BackButton
// • Centered article column (~720px) — same vertical content, never two-column
// • Sticky right rail removed; CTA stays inline (consistent with mobile)

const ccTokenVarsDD = window.ccTokenVars;
const CCMarkDD = window.CCMark;

// ── Icons ────────────────────────────────────────────────────────
function IconDD({ name, size = 16 }) {
  const inner = {
    arrowLeft: <path d="M11 4L5 8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    search: <><circle cx="6.75" cy="6.75" r="4.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M10.25 10.25L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    heart: <path d="M8 13.5C8 13.5 2 10 2 5.75C2 4 3.4 2.5 5.25 2.5C6.4 2.5 7.4 3.1 8 4C8.6 3.1 9.6 2.5 10.75 2.5C12.6 2.5 14 4 14 5.75C14 10 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
    share: <><circle cx="4" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12.5" r="1.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M5.5 7.2l5-2.4M5.5 8.8l5 2.4" stroke="currentColor" strokeWidth="1.5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">{inner[name]}</svg>;
}

// ── Top nav (matches browse-desktop) ─────────────────────────────
function TopNavDD({ active = "browse" }) {
  const tabs = [
    { key: "browse", label: "Browse" },
    { key: "search", label: "Search" },
    { key: "saved",  label: "Saved" },
  ];
  return (
    <header style={{
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
            <CCMarkDD size={32} />
          </div>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            letterSpacing: "-0.02em",
          }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <button key={t.key} style={{
              all: "unset", cursor: "pointer",
              padding: "8px 14px", borderRadius: 8,
              fontFamily: "Inter, system-ui",
              fontWeight: t.key === active ? 700 : 500, fontSize: 13,
              color: t.key === active ? "var(--fg)" : "var(--fg-muted)",
              background: t.key === active ? "var(--surface-2)" : "transparent",
              letterSpacing: "-0.01em",
            }}>{t.label}</button>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 12px",
          borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)", width: 280, boxSizing: "border-box",
          color: "var(--fg-subtle)",
        }}>
          <IconDD name="search" size={14} />
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>Search artists or venues…</span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)",
            padding: "2px 5px", borderRadius: 3,
            border: "1px solid var(--border-strong)",
          }}>⌘K</span>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg-muted)",
        }}>JR</div>
      </div>
    </header>
  );
}

// ── Breadcrumb / page header strip ───────────────────────────────
function BreadcrumbDD({ trail = [], actions = null }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      padding: "20px 0 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {trail.map((seg, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span style={{
                color: "var(--fg-subtle)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              }}>/</span>
            )}
            <button style={{
              all: "unset", cursor: seg.href ? "pointer" : "default",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13,
              color: i === trail.length - 1 ? "var(--fg)" : "var(--fg-muted)",
              letterSpacing: "-0.005em",
            }}>
              {i === 0 && <IconDD name="arrowLeft" size={13} />}
              {seg.label}
            </button>
          </React.Fragment>
        ))}
      </div>
      {actions}
    </div>
  );
}

// ── Page actions row (heart, share) ──────────────────────────────
function PageActionsDD() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 32, padding: "0 12px",
        borderRadius: 999, background: "var(--surface-1)",
        border: "1px solid var(--border)",
        fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
        color: "var(--fg)", letterSpacing: "-0.005em",
      }}>
        <IconDD name="heart" size={13} /> Save
      </button>
      <button style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 32, padding: "0 12px",
        borderRadius: 999, background: "var(--surface-1)",
        border: "1px solid var(--border)",
        fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
        color: "var(--fg)", letterSpacing: "-0.005em",
      }}>
        <IconDD name="share" size={13} /> Share
      </button>
    </div>
  );
}

// ── Article column wrapper ───────────────────────────────────────
function ArticleColumnDD({ children }) {
  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", width: "100%",
      // The mobile EventDetail/VenueProfile components are designed for a
      // ~393px viewport. We give them ~720px and let them breathe; the
      // hero stretches, info row stays single column, content reads top-down.
    }}>{children}</div>
  );
}

// ── Event Detail desktop page ───────────────────────────────────
function EventDetailPageDD({ theme = "electric", event }) {
  const themeTokens = (window.CC_THEMES && window.CC_THEMES[theme])
    ? window.CC_THEMES[theme].tokens : null;

  return (
    <div style={{
      ...ccTokenVarsDD(theme),
      minHeight: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
    }}>
      <TopNavDD active="browse" />
      <main style={{ flex: 1, padding: "0 32px 64px", overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <BreadcrumbDD
            trail={[
              { label: "Browse", href: "#" },
              { label: event ? event.artist : "Event" },
            ]}
            actions={<PageActionsDD />}
          />
          <div style={{
            borderRadius: 16, overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
            <window.EventDetail
              event={event}
              themeTokens={themeTokens}
              chrome="desktop"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Venue Profile desktop page ──────────────────────────────────
function VenueProfilePageDD({ theme = "electric" }) {
  const themeTokens = (window.CC_THEMES && window.CC_THEMES[theme])
    ? window.CC_THEMES[theme].tokens : null;

  return (
    <div style={{
      ...ccTokenVarsDD(theme),
      minHeight: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
    }}>
      <TopNavDD active="browse" />
      <main style={{ flex: 1, padding: "0 32px 64px", overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <BreadcrumbDD
            trail={[
              { label: "Browse", href: "#" },
              { label: "Red Rocks Amphitheatre" },
            ]}
            actions={<PageActionsDD />}
          />
          <div style={{
            borderRadius: 16, overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
            <window.VenueProfile
              themeTokens={themeTokens}
              chrome="desktop"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

window.EventDetailPageDD = EventDetailPageDD;
window.VenueProfilePageDD = VenueProfilePageDD;
