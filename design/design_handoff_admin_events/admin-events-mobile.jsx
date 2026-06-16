// admin-events-mobile.jsx — mobile (≤720px) views for the Event Management surface.
// Fully responsive per the brief: list (cards), filters sheet, row action sheet,
// single-delete sheet, select-mode + bulk bar, empty state.
//
// Self-contained <MobilePhone> chrome (admin topbar + bottom tab bar) so bottom
// sheets can overlay the whole device. Reuses admin primitives + ConfidenceBarV2.

// ── Phone chrome ──────────────────────────────────────────────────────
function MobilePhone({ title = "Review", tail = null, children, sheet, overlay, w = 390, h = 840 }) {
  const tabs = [
    { k: "dashboard", icon: "dashboard", label: "Dashboard" },
    { k: "venues", icon: "venues", label: "Venues" },
    { k: "crawl", icon: "crawl", label: "Crawl" },
    { k: "review", icon: "events", label: "Review", active: true },
    { k: "feedback", icon: "inbox", label: "Feedback" },
  ];
  return (
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden", background: "var(--bg)", color: "var(--fg)", fontFamily: ADMIN_FONT, display: "flex", flexDirection: "column" }}>
      {/* status bar */}
      <div style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>
        <span>9:41</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.85 }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700 }}>5G</span>
          <span style={{ width: 22, height: 11, borderRadius: 3, border: "1.4px solid var(--fg)", display: "inline-block", position: "relative" }}><span style={{ position: "absolute", inset: 1.5, background: "var(--fg)", borderRadius: 1 }} /></span>
        </span>
      </div>
      {/* top bar */}
      <header style={{ height: 50, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <button style={{ all: "unset", cursor: "pointer", padding: 8, color: "var(--fg-muted)", display: "flex" }}><AdminIcon name="side" size={18} /></button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
          <AdminIcon name="events" size={17} color="var(--fg)" />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 16, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>{title}</span>
          {tail && <span style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-subtle)" }}>· {tail}</span>}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", padding: 2, borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 6, fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700, color: "var(--fg-muted)" }}><AdminIcon name="external" size={12} color="currentColor" />User app</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 6, background: "var(--bg-elevated)", boxShadow: "0 0 0 1px var(--border)", fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700, color: "var(--fg)" }}><AdminIcon name="dashboard" size={12} color="var(--signal)" />Admin</span>
        </div>
      </header>
      {/* content */}
      <main style={{ flex: 1, overflow: "auto", padding: "14px 14px 88px", background: "var(--bg)" }}>{children}</main>
      {/* bottom tab bar */}
      <nav style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 66, padding: "6px 6px 12px", background: "var(--bg-elevated)", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, zIndex: 5 }}>
        {tabs.map(t => (
          <div key={t.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: t.active ? "var(--fg)" : "var(--fg-subtle)" }}>
            <AdminIcon name={t.icon} size={20} color={t.active ? "var(--signal)" : "currentColor"} />
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 10, fontWeight: t.active ? 700 : 600 }}>{t.label}</span>
          </div>
        ))}
      </nav>
      {overlay}
      {sheet && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "var(--scrim, rgba(0,0,0,0.5))", zIndex: 20 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 21, background: "var(--bg-elevated)", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: "1px solid var(--border)", boxShadow: "0 -12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}><span style={{ width: 38, height: 4, borderRadius: 2, background: "var(--border-strong)" }} /></div>
            {sheet}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mobile filter strip ───────────────────────────────────────────────
function MChip({ children, active, danger, badge, icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 999, flexShrink: 0,
      background: active ? "color-mix(in oklab, var(--signal) 14%, transparent)" : "var(--surface-1)",
      border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
      fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: 600,
      color: danger ? "var(--warning)" : active ? "var(--signal)" : "var(--fg)",
    }}>
      {icon && <AdminIcon name={icon} size={13} color="currentColor" />}
      {children}
      {badge != null && <span style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--signal)", color: "var(--fg-on-accent)", fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>}
    </span>
  );
}

function MobileFilterStrip({ search = "", activeCount = 2, shown = ALL_EVENTS.length, selectMode = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
      <SearchInput value={search} width={"100%"} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        <MChip active icon="filter" badge={activeCount}>Filters</MChip>
        <MChip active>Verified</MChip>
        <MChip danger>Missing data</MChip>
        <MChip icon="chevD">Date · 30d</MChip>
        <MChip icon="chevD">Sort · Date</MChip>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: "var(--fg)", fontWeight: 700 }}>{shown}</span> of {EM_TOTAL} events
        </span>
        <button style={{ all: "unset", cursor: "pointer", fontFamily: ADMIN_FONT, fontSize: 12.5, fontWeight: 700, color: selectMode ? "var(--signal)" : "var(--fg-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <AdminIcon name={selectMode ? "x" : "check"} size={13} />{selectMode ? "Done" : "Select"}
        </button>
      </div>
    </div>
  );
}

// ── Mobile event card ─────────────────────────────────────────────────
function EventMobileCard({ ev, selectMode, selected }) {
  const miss = emMissing(ev).filter(x => x !== "no genre");
  return (
    <div style={{
      display: "flex", gap: 12, padding: 14, borderRadius: 13,
      background: selected ? "color-mix(in oklab, var(--signal) 8%, var(--bg-elevated))" : "var(--bg-elevated)",
      border: `1px solid ${selected ? "var(--signal)" : "var(--border)"}`,
    }}>
      {selectMode && <div style={{ paddingTop: 1 }}><EmCheckbox checked={selected} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 14.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{ev.title}</div>
            {ev.artist && ev.artist !== ev.title && ev.artist !== "—" && (
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 1 }}>{ev.artist}</div>
            )}
          </div>
          {!selectMode && (
            <button style={{ all: "unset", cursor: "pointer", padding: 6, margin: -2, borderRadius: 7, color: "var(--fg-muted)", display: "flex" }}><AdminIcon name="more" size={18} /></button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)" }}>
          <span>{ev.venue}</span>
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: ev.time ? "var(--fg-subtle)" : "var(--warning)" }}>{ev.date}{ev.time ? ` · ${ev.time}` : " · no time"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
          <EventStatusBadge verified={ev.verified} />
          <GenreCell genres={ev.genres} />
          {miss.map(m => <StatusBadge key={m} kind="warning" variant="outline" mono>{m}</StatusBadge>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--border)" }}>
          <div style={{ flex: 1, maxWidth: 130 }}><ConfidenceBarV2 value={ev.confidence} /></div>
          <span style={{ flex: 1 }} />
          <RelTime value={ev.created} />
        </div>
      </div>
    </div>
  );
}

function EventsMobileList({ rows = ALL_EVENTS, selectMode = false, selectedIds = new Set() }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map(ev => <EventMobileCard key={ev.id} ev={ev} selectMode={selectMode} selected={selectedIds.has(ev.id)} />)}
    </div>
  );
}

// ── Sheets ────────────────────────────────────────────────────────────
function SheetHead({ title, sub }) {
  return (
    <div style={{ padding: "8px 18px 14px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontFamily: ADMIN_FONT, fontSize: 16, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function MobileActionSheet({ ev }) {
  const e = ev || ALL_EVENTS[1];
  const lc = e.lifecycle || "upcoming";
  const items = [
    { icon: "external", label: "View detail" },
    { icon: "edit", label: "Edit event" },
    { sep: true },
    e.verified ? { icon: "refresh", label: "Send back to review" } : { icon: "check", label: "Verify" },
    lc !== "postponed" && { icon: "pause", label: "Mark postponed" },
    lc !== "cancelled" && { icon: "x", label: "Mark cancelled" },
    lc !== "upcoming" && { icon: "play", label: "Mark upcoming" },
    e.soldOut ? { icon: "check", label: "Mark available" } : { icon: "alertTri", label: "Mark sold out" },
    { icon: "flag", label: "Mark non-concert" },
    { sep: true },
    { icon: "x", label: "Delete event", danger: true },
  ].filter(Boolean);
  return (
    <div style={{ paddingBottom: 14 }}>
      <SheetHead title={e.title} sub={`${e.venue} · ${e.date}${e.time ? " · " + e.time : ""}`} />
      <div style={{ padding: 8 }}>
        {items.map((it, i) => it.sep ? (
          <div key={i} style={{ height: 1, background: "var(--border)", margin: "6px 12px" }} />
        ) : (
          <button key={i} style={{
            all: "unset", boxSizing: "border-box", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "13px 12px", borderRadius: 10,
            color: it.danger ? "var(--danger)" : "var(--fg)", fontFamily: ADMIN_FONT, fontSize: 15, fontWeight: 600,
          }}>
            <AdminIcon name={it.icon} size={18} color={it.danger ? "var(--danger)" : "var(--fg-muted)"} />
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileFiltersSheet() {
  return (
    <div style={{ paddingBottom: 18, maxHeight: 620 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>Filters</div>
        <button style={{ all: "unset", cursor: "pointer", fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg-muted)" }}>Reset</button>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <MonoLabel>Verification</MonoLabel>
          <div style={{ marginTop: 8 }}><VerificationSegmented value="verified" /></div>
        </div>
        <div>
          <MonoLabel>Venue</MonoLabel>
          <div style={{ marginTop: 8 }}><FilterField label="Venue" value="All venues" /></div>
        </div>
        <div>
          <MonoLabel>Date range</MonoLabel>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MChip active>Next 30d</MChip><MChip>Next 7d</MChip><MChip>Past</MChip><MChip icon="chevD">Custom</MChip>
          </div>
        </div>
        <div>
          <MonoLabel>Missing data</MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ l: "No price", c: true }, { l: "No show time", c: false }, { l: "No genre", c: true }].map(o => (
              <div key={o.l} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${o.c ? "var(--signal)" : "var(--border-strong)"}`, background: o.c ? "var(--signal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{o.c && <AdminIcon name="check" size={12} color="var(--fg-on-accent)" />}</span>
                <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: o.c ? 600 : 500, color: "var(--fg)" }}>{o.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 18px", display: "flex", gap: 10 }}>
        <AdminButton variant="ghost" size="lg" fullWidth>Clear all</AdminButton>
        <AdminButton variant="primary" size="lg" fullWidth>Show 12 events</AdminButton>
      </div>
    </div>
  );
}

function MobileDeleteSheet({ ev }) {
  const e = ev || ALL_EVENTS[0];
  return (
    <div style={{ paddingBottom: 18, borderTop: "3px solid var(--danger)" }}>
      <div style={{ padding: "16px 18px 12px" }}>
        <MonoLabel color="var(--danger)">destructive action</MonoLabel>
        <div style={{ fontFamily: ADMIN_FONT, fontSize: 19, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 8 }}>Delete this event?</div>
        <div style={{ marginTop: 12, padding: "11px 13px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{e.title}</div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{e.venue} · {e.date}{e.time ? ` · ${e.time}` : ""}</div>
        </div>
        <div style={{ marginTop: 12, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
          Removed from the catalog and the consumer app right away. Recorded in the audit log.
        </div>
      </div>
      <div style={{ padding: "4px 18px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <AdminButton variant="danger" size="lg" icon="x" fullWidth>Delete event</AdminButton>
        <AdminButton variant="ghost" size="lg" fullWidth>Cancel</AdminButton>
      </div>
    </div>
  );
}

function MobileBulkBar({ count = 3 }) {
  return (
    <div style={{ position: "absolute", left: 12, right: 12, bottom: 78, zIndex: 6, display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 14px 36px rgba(0,0,0,0.32)" }}>
      <span style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 11, background: "var(--signal)", color: "var(--fg-on-accent)", fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{count}</span>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)", flex: 1 }}>selected</span>
      <button style={{ all: "unset", cursor: "pointer", padding: 9, borderRadius: 9, color: "var(--fg-muted)", display: "flex" }}><AdminIcon name="flag" size={17} /></button>
      <button style={{ all: "unset", cursor: "pointer", padding: 9, borderRadius: 9, color: "var(--fg-muted)", display: "flex" }}><AdminIcon name="refresh" size={17} /></button>
      <AdminButton variant="danger" size="sm" icon="x">Delete {count}</AdminButton>
    </div>
  );
}

function MobileEmpty() {
  return (
    <div style={{ padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--surface-1)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)", marginBottom: 14 }}><AdminIcon name="search" size={22} /></div>
      <MonoLabel>0 results</MonoLabel>
      <div style={{ fontFamily: ADMIN_FONT, fontSize: 21, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 5 }}>Crickets.</div>
      <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55, maxWidth: 280, marginTop: 5 }}>Nothing matches those filters. Clear them to see the whole catalog.</div>
      <div style={{ marginTop: 18, width: "100%", maxWidth: 240 }}><AdminButton variant="outline" size="lg" icon="x" fullWidth>Clear all filters</AdminButton></div>
    </div>
  );
}

// Review page header for mobile (matches live: big title + "N events · N prices waiting").
function ReviewHeaderMobile({ events = 0, prices = 11 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1.05 }}>Review</h1>
      <div style={{ marginTop: 5, fontFamily: ADMIN_FONT, fontSize: 13.5, color: "var(--fg-muted)" }}>{events} events · {prices} prices waiting.</div>
    </div>
  );
}

// Full mobile "All events" tab body: header + 3-tab pill + filter strip + cards.
// ReviewTabs comes from admin-events-mgmt.jsx (on window).
function MobileAllEventsBody({ rows = ALL_EVENTS, selectMode = false, selectedIds, shown }) {
  return (
    <>
      <ReviewHeaderMobile />
      <ReviewTabs active="all" fullWidth compact flagsCount={0} pricesCount={61} missingCount={4} />
      <div style={{ height: 16 }} />
      <MobileFilterStrip shown={shown != null ? shown : rows.length} selectMode={selectMode} />
      <EventsMobileList rows={rows} selectMode={selectMode} selectedIds={selectedIds || new Set()} />
    </>
  );
}

Object.assign(window, {
  MobilePhone, MChip, MobileFilterStrip, EventMobileCard, EventsMobileList,
  MobileActionSheet, MobileFiltersSheet, MobileDeleteSheet, MobileBulkBar, MobileEmpty, SheetHead,
  ReviewHeaderMobile, MobileAllEventsBody,
});
