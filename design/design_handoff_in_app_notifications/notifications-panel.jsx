// notifications-panel.jsx — #737 panel anatomy · R2
//
// One body, two shells:
//   <NotifDropdown/>  desktop — nested inside the user menu (see chrome)
//   <NotifSheet/>     mobile  — bottom sheet, drag handle, ~88% height
//
// R2 ROW LAYOUT — rebuilt for production title lengths.
// R1 sized the row against ~21-char invented titles and parked the timestamp
// on the title's baseline. Real titles run ~35–80 chars ("Tickets for Hurray
// for the Riff Raff at Gothic Theatre just went back on sale."), which at
// 320px wraps to four lines if the title keeps only ~70% of the width. So:
//   • the timestamp MOVES OFF the title row down to the metadata row, giving
//     the title the full column;
//   • title clamps at 2 lines, body clamps at 2;
//   • 64px stops being a target and becomes a floor — rows grow to ~92–116px.
// Knock-ons are real and recorded in the README: the day-divider rhythm
// loosens, and page-size 20 is ~1.6 screens of scroll per page at 390, not 2.5.
//
// Unread is signalled FOUR ways, never by color alone: 2px left rail,
// --surface-1 row fill, 700 title weight, and a trailing dot.
//
// Ink encodes valence, glyph encodes event — see CATEGORY_MAP. Row TEXT is
// never tinted (see the contrast rule on NMono).

if (typeof document !== "undefined" && !document.getElementById("notif-keyframes")) {
  const s = document.createElement("style");
  s.id = "notif-keyframes";
  s.textContent = `
    @keyframes notifSweep { 0%{background-position:-220% 0} 100%{background-position:320% 0} }
    @keyframes notifPip { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:.72} }
    .notif-row{transition:background .12s ease}
    .notif-row:hover{background:var(--overlay-hover)!important}
    .notif-row:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
    .notif-row:hover .notif-chev{opacity:1;transform:translateX(0)}
    .notif-scroll{overflow-y:auto;scrollbar-width:thin}
    @media (prefers-reduced-motion: reduce){
      .notif-shimmer{animation:none!important;background:var(--surface-2)!important}
      .notif-pip{animation:none!important}
    }
  `;
  document.head.appendChild(s);
}

// CONTRAST RULE (WCAG 1.4.3): no TEXT in this file renders in --fg-subtle or
// in a category ink. Both are 3:1-class tokens — fine for graphics, short of
// 4.5:1 for small text. Category color lives on the tile glyph, the left rail,
// and the unread dot (all non-text, 3:1 threshold); the words are --fg-muted.
// Color redundancy is unaffected: the category is still spelled out.
const NMono = ({ children, color = "var(--fg-muted)", size = 9.5, ls = "0.14em", style }) => (
  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size, fontWeight: 700,
    letterSpacing: ls, textTransform: "uppercase", color, ...style }}>{children}</span>
);

// ── Category tile ────────────────────────────────────────────────
function NotifTile({ category, read, size = 28 }) {
  const { ink, glyph } = window.catOf(category);
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      color: ink, opacity: read ? 0.55 : 1,
    }}>
      <window.NGlyph name={glyph} size={size * 0.57}/>
    </span>
  );
}

// ── Item row — whole row is the target (no nested interactives) ──
function NotifItem({ n, onOpen, compact = false }) {
  const cat = window.catOf(n.category);
  const unread = !n.read;
  return (
    <div
      className="notif-row"
      role="button"
      tabIndex={0}
      aria-label={window.itemLabel(n)}
      data-action-url={n.actionUrl}
      onClick={() => onOpen && onOpen(n)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen && onOpen(n); } }}
      style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: compact ? "11px 14px 11px 12px" : "13px 14px 13px 12px",
        minHeight: 64, cursor: "pointer",
        background: unread ? "var(--surface-1)" : "transparent",
        borderLeft: `2px solid ${unread ? cat.ink : "transparent"}`,
        borderBottom: "1px solid var(--border)",
      }}>
      <NotifTile category={n.category} read={n.read}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Title owns the full column width — timestamp lives on the meta row. */}
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.36,
          fontWeight: unread ? 700 : 600,
          color: unread ? "var(--fg)" : "var(--fg-muted)",
          letterSpacing: "-0.01em", textWrap: "pretty",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{n.title}</span>
        {n.body && <span style={{
          fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.42,
          color: "var(--fg-muted)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", textWrap: "pretty",
        }}>{n.body}</span>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
          <NMono>{cat.label}</NMono>
          {unread && <span aria-hidden="true" style={{
            width: 5, height: 5, borderRadius: 5, background: cat.ink, flexShrink: 0,
          }}/>}
          <span style={{ flex: 1 }}/>
          <NMono ls="0.1em" style={{ flexShrink: 0 }}>{window.relTime(n.at)}</NMono>
          <span className="notif-chev" aria-hidden="true" style={{
            opacity: 0, transform: "translateX(-3px)", transition: "all .14s ease",
            color: "var(--fg-muted)", display: "inline-flex",
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Day divider ──────────────────────────────────────────────────
function NotifDayDivider({ label }) {
  return (
    <div role="presentation" style={{
      position: "sticky", top: 0, zIndex: 2,
      padding: "7px 14px 6px",
      background: "var(--bg-elevated)",
      borderBottom: "1px solid var(--border)",
    }}>
      <NMono>{label}</NMono>
    </div>
  );
}

// ── Loading skeleton — box-identical to the R2 two-line row ──────
function NotifSkeletonRow() {
  const shimmer = {
    background: "linear-gradient(90deg,var(--surface-1) 0%,var(--surface-2) 45%,var(--surface-1) 90%)",
    backgroundSize: "220% 100%", animation: "notifSweep 1.5s linear infinite",
  };
  const bar = (w, h = 9) => (
    <span className="notif-shimmer" style={{ display: "block", width: w, height: h,
      borderRadius: 3, ...shimmer }}/>
  );
  return (
    <div aria-hidden="true" style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "13px 14px 13px 12px", minHeight: 64,
      borderLeft: "2px solid transparent", borderBottom: "1px solid var(--border)",
    }}>
      <span className="notif-shimmer" style={{ width: 28, height: 28, borderRadius: 8,
        flexShrink: 0, ...shimmer }}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        {bar("100%", 10)}{bar("64%", 10)}
        {bar("92%")}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {bar(46, 8)}<span style={{ flex: 1 }}/>{bar(20, 8)}
        </div>
      </div>
    </div>
  );
}
function NotifLoading({ rows = 3 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {window.NOTIF_COPY.loading}
      </span>
      {Array.from({ length: rows }).map((_, i) => <NotifSkeletonRow key={i}/>)}
    </div>
  );
}

// ── Empty state — Sour Patch ─────────────────────────────────────
function NotifEmpty({ onAction }) {
  const C = window.NOTIF_COPY;
  return (
    <div style={{
      padding: "42px 26px 38px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <span aria-hidden="true" style={{
        width: 46, height: 46, borderRadius: 14,
        background: "var(--surface-1)", border: "1px solid var(--border)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-subtle)", marginBottom: 2,
      }}><window.NGlyph name="bell" size={22}/></span>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 17, fontWeight: 800,
        color: "var(--fg)", letterSpacing: "-0.02em" }}>{C.emptyTitle}</div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, lineHeight: 1.5,
        color: "var(--fg-muted)", maxWidth: 268, textWrap: "pretty" }}>{C.emptyBody}</div>
      <button type="button" onClick={onAction} style={{
        all: "unset", cursor: "pointer", marginTop: 8,
        padding: "9px 18px", borderRadius: 8,
        background: "var(--surface-2)", border: "1px solid var(--border-strong)",
        fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
        color: "var(--signal)", letterSpacing: "-0.01em",
      }}>{C.emptyAction}</button>
    </div>
  );
}

// ── Slow / error footer ──────────────────────────────────────────
function NotifError({ onRetry }) {
  const C = window.NOTIF_COPY;
  return (
    <div role="alert" style={{ padding: "34px 26px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700,
        color: "var(--fg)" }}>{C.error}</div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, color: "var(--fg-muted)" }}>
        {C.errorBody}
      </div>
      <button type="button" onClick={onRetry} style={{
        all: "unset", cursor: "pointer", marginTop: 4, padding: "8px 16px", borderRadius: 8,
        background: "var(--surface-2)", border: "1px solid var(--border-strong)",
        fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700, color: "var(--signal)",
      }}>{C.errorAction}</button>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────
function NotifHeader({ count, onMarkAll, onClose, showClose }) {
  const C = window.NOTIF_COPY;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 12px 11px 14px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)", flexShrink: 0,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: "Inter, system-ui", fontSize: 14.5, fontWeight: 800,
          color: "var(--fg)", letterSpacing: "-0.02em" }}>{C.panelTitle}</span>
        <NMono color={count ? "var(--signal)" : "var(--fg-muted)"}>
          {count ? C.panelSub(count) : C.markedAll}
        </NMono>
      </div>
      {count > 0 && (
        <button type="button" onClick={onMarkAll} style={{
          all: "unset", cursor: "pointer", padding: "7px 10px", borderRadius: 7,
          fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 700,
          color: "var(--signal)", border: "1px solid var(--border)",
        }}>{C.markAll}</button>
      )}
      {showClose && (
        <button type="button" onClick={onClose} aria-label={C.closeLabel} style={{
          all: "unset", cursor: "pointer", width: 44, height: 44, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)", flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Body — grouping, states, load-more ───────────────────────────
function NotifBody({ items = [], state = "ready", grouped = true, hasMore = false,
  onOpen, onMarkAll, onClose, showClose, maxHeight }) {
  const C = window.NOTIF_COPY;
  const count = window.unreadCount(items);
  const groups = grouped ? window.groupByDay(items) : [{ key: null, items }];
  return (
    <>
      <NotifHeader count={state === "ready" ? count : 0} onMarkAll={onMarkAll}
        onClose={onClose} showClose={showClose}/>
      <div className="notif-scroll" style={{ flex: 1, minHeight: 0, maxHeight,
        background: "var(--bg-elevated)" }}>
        {state === "loading" && <NotifLoading/>}
        {state === "error" && <NotifError/>}
        {state === "ready" && items.length === 0 && <NotifEmpty/>}
        {state === "ready" && items.length > 0 && (
          <div role="list" aria-label={C.panelTitle}>
            {groups.map((g) => (
              <div key={g.key || "all"} role="presentation">
                {g.key && <NotifDayDivider label={g.key}/>}
                {g.items.map((n) => (
                  <div role="listitem" key={n.id}><NotifItem n={n} onOpen={onOpen}/></div>
                ))}
              </div>
            ))}
            <div style={{ padding: "12px 14px 16px", display: "flex", justifyContent: "center" }}>
              {hasMore ? (
                <button type="button" style={{
                  all: "unset", cursor: "pointer", width: "100%", textAlign: "center",
                  padding: "9px 0", borderRadius: 8,
                  background: "var(--surface-1)", border: "1px solid var(--border-strong)",
                  fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
                  color: "var(--signal)",
                }}>{C.loadMore}</button>
              ) : <NMono ls="0.1em">{C.endOfList}</NMono>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Shells ───────────────────────────────────────────────────────
function NotifDropdown({ width = 380, maxHeight = 520, ...rest }) {
  return (
    <div role="dialog" aria-label={window.NOTIF_COPY.panelTitle} style={{
      width, background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)", borderRadius: 14,
      boxShadow: "0 24px 64px var(--shadow, rgba(0,0,0,0.45)), 0 4px 12px var(--shadow-soft, rgba(0,0,0,0.2))",
      overflow: "hidden", display: "flex", flexDirection: "column",
      maxHeight, fontFamily: "Inter, system-ui",
    }}>
      <NotifBody {...rest} showClose/>
    </div>
  );
}

// aria-modal is intentionally NOT set. The attribute asserts a focus trap;
// this mock doesn't implement one and asserting a trap that doesn't exist is
// worse than omitting it. Eng owns the trap + Esc handling at build — see the
// eng-plan notes in the README.
function NotifSheet({ height = "88%", ...rest }) {
  return (
    <div role="dialog" aria-label={window.NOTIF_COPY.panelTitle} style={{
      width: "100%", height,
      background: "var(--bg-elevated)",
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      border: "1px solid var(--border)", borderBottom: "none",
      boxShadow: "0 -16px 48px var(--shadow, rgba(0,0,0,0.45))",
      overflow: "hidden", display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui",
    }}>
      <div style={{ height: 18, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, background: "var(--bg-elevated)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }}/>
      </div>
      <NotifBody {...rest} showClose/>
    </div>
  );
}

Object.assign(window, {
  NotifItem, NotifTile, NotifDayDivider, NotifSkeletonRow, NotifLoading,
  NotifEmpty, NotifError, NotifHeader, NotifBody, NotifDropdown, NotifSheet, NMono,
});
