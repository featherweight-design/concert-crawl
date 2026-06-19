// admin-pagination.jsx — reusable pager for Concert Crawl admin tables.
//
// Lives inside the SAME <Panel> as a table (render it as the last child, after
// the table, with Panel padding={0}). Backed by server-side limit/offset.
//
// Exports:
//   usePagination(total, opts)  — state hook; gives you { offset, limit } to
//                                 feed straight into /v1/admin/* requests.
//   pageWindow(current, totalPages) — the [1, '…', 4, 5, 6, '…', 49] sequence.
//   <Pagination …>              — the UI. Responsive: collapses to a compact
//                                 prev/next + "Page X / Y" row under ~560px
//                                 (auto via ResizeObserver, or force with
//                                 forceCompact). Works down to 360px.
//
// Tokens only (var(--*)). Theme-agnostic — inherits whatever ThemeProvider wraps it.

// ── State hook ─────────────────────────────────────────────────────────
// Single source of truth for page + pageSize. Clamps page when total shrinks
// (e.g. after a filter). Exposes offset/limit for the request layer.
function usePagination(total, { initialPage = 1, initialPageSize = 25 } = {}) {
  const [page, setPage] = React.useState(initialPage);
  const [pageSize, setPageSizeRaw] = React.useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const cur = Math.min(Math.max(1, page), totalPages);

  React.useEffect(() => { if (page !== cur) setPage(cur); }, [cur]); // re-clamp on total/size change

  const setPageSize = React.useCallback((s) => { setPageSizeRaw(s); setPage(1); }, []);
  const start = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const end = Math.min(cur * pageSize, total || 0);

  return {
    page: cur, pageSize, totalPages, start, end, total: total || 0,
    offset: (cur - 1) * pageSize, limit: pageSize,
    setPage, setPageSize,
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    first: () => setPage(1),
    last: () => setPage(totalPages),
  };
}

// ── Page-number window with ellipses ──────────────────────────────────
// Always shows first + last; current ±1 in the middle; '…' where collapsed.
function pageWindow(current, totalPages, delta = 1) {
  if (totalPages <= 1) return [1];
  const left = Math.max(2, current - delta);
  const right = Math.min(totalPages - 1, current + delta);
  const out = [1];
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

// ── Compact-width detector ────────────────────────────────────────────
function usePagerCompact(ref, threshold, force) {
  const [compact, setCompact] = React.useState(force !== undefined ? force : false);
  React.useEffect(() => {
    if (force !== undefined) { setCompact(force); return; }
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCompact(e.contentRect.width < threshold);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [force, threshold]);
  return compact;
}

// ── Square page / arrow button ────────────────────────────────────────
function PagerBtn({ children, onClick, disabled, active, label, size = 32, mono = true, grow = false }) {
  const base = {
    all: "unset", boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: size, height: size, padding: "0 9px",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 8,
    fontFamily: mono ? ADMIN_MONO : ADMIN_FONT, fontSize: mono ? 12 : 13,
    fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
    flex: grow ? 1 : "0 0 auto",
    color: active ? "var(--fg-on-accent)" : disabled ? "var(--fg-subtle)" : "var(--fg)",
    background: active ? "var(--signal)" : "transparent",
    border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
    opacity: disabled && !active ? 0.45 : 1,
    transition: "background .12s, border-color .12s, color .12s",
  };
  return (
    <button
      type="button" aria-label={label} aria-current={active ? "page" : undefined}
      onClick={disabled ? undefined : onClick} disabled={disabled} style={base}
      onMouseEnter={(e) => { if (!disabled && !active) { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--fg-subtle)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-strong)"; } }}
    >{children}</button>
  );
}

// ── Rows-per-page dropdown (drops UP, since it sits at the panel bottom) ──
function SizeSelect({ value, options, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <MonoLabel>rows</MonoLabel>
      <button
        type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        style={{
          all: "unset", boxSizing: "border-box", cursor: disabled ? "not-allowed" : "pointer",
          height: 30, padding: "0 8px 0 10px", borderRadius: 7,
          display: "inline-flex", alignItems: "center", gap: 6,
          border: "1px solid var(--border-strong)", background: "var(--bg-elevated)",
          fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700, color: "var(--fg)",
          fontVariantNumeric: "tabular-nums", opacity: disabled ? 0.5 : 1,
        }}
      >
        {value}
        <AdminIcon name="chevD" size={13} color="var(--fg-subtle)" />
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 38,
          minWidth: 88, padding: 4, zIndex: 30,
          background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 14px 32px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12)",
        }}>
          {options.map((opt) => {
            const sel = opt === value;
            return (
              <button
                key={opt} type="button"
                onClick={() => { onChange && onChange(opt); setOpen(false); }}
                style={{
                  all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "7px 10px", borderRadius: 6,
                  fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700,
                  color: sel ? "var(--signal)" : "var(--fg)", fontVariantNumeric: "tabular-nums",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {opt}{sel && <AdminIcon name="check" size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Range readout ─────────────────────────────────────────────────────
function RangeReadout({ start, end, total, loading, itemLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {loading && <Spinner size={12} color="var(--signal)" />}
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 12, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
        {total === 0 ? (
          <span style={{ color: "var(--fg-subtle)" }}>No {itemLabel}</span>
        ) : (
          <>
            <span style={{ fontWeight: 700, color: "var(--fg)" }}>{start.toLocaleString()}–{end.toLocaleString()}</span>
            <span style={{ color: "var(--fg-muted)" }}> of </span>
            <span style={{ fontWeight: 700, color: "var(--fg)" }}>{total.toLocaleString()}</span>
          </>
        )}
      </span>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────
function Pagination({
  page = 1, pageSize = 50, total = 0,
  pageSizeOptions = [25, 50, 100],
  onPageChange, onPageSizeChange,
  loading = false, forceCompact, threshold = 560,
  showSizeSelector = true,
  itemLabel = "results", style,
}) {
  const wrapRef = React.useRef(null);
  const compact = usePagerCompact(wrapRef, threshold, forceCompact);

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const cur = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const end = Math.min(cur * pageSize, total || 0);
  const atFirst = cur <= 1, atLast = cur >= totalPages;
  const single = totalPages <= 1 || total === 0;

  const go = (p) => onPageChange && onPageChange(Math.min(totalPages, Math.max(1, p)));

  const footer = {
    display: "flex", alignItems: "center", width: "100%", boxSizing: "border-box",
    gap: compact ? 10 : 16, flexDirection: compact ? "column" : "row",
    flexWrap: compact ? "nowrap" : "wrap",
    justifyContent: "space-between",
    padding: compact ? "10px 14px" : "11px 18px",
    borderTop: "1px solid var(--border)", background: "var(--surface-1)",
    borderRadius: "0 0 12px 12px",
    opacity: loading ? 0.72 : 1, pointerEvents: loading ? "none" : "auto",
    transition: "opacity .15s",
    ...style,
  };

  // ── Compact (mobile / narrow) ──
  if (compact) {
    return (
      <div ref={wrapRef} style={footer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
          <RangeReadout start={start} end={end} total={total} loading={loading} itemLabel={itemLabel} />
          {showSizeSelector && (
            <SizeSelect value={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} disabled={loading} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 8, width: "100%" }}>
          <PagerBtn onClick={() => go(cur - 1)} disabled={atFirst} size={44} mono={false} grow label="Previous page">
            <AdminIcon name="chevL" size={16} /> Prev
          </PagerBtn>
          <div
            style={{
              flex: "1.2 1 0", height: 44,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-elevated)",
              fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700, color: "var(--fg-muted)",
              fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
            }}
          >
            <span><span style={{ color: "var(--fg)" }}>Page {cur}</span> / {totalPages}</span>
          </div>
          <PagerBtn onClick={() => go(cur + 1)} disabled={atLast} size={44} mono={false} grow label="Next page">
            Next <AdminIcon name="chevR" size={16} />
          </PagerBtn>
        </div>
      </div>
    );
  }

  // ── Full (desktop) ──
  const win = pageWindow(cur, totalPages);
  return (
    <div ref={wrapRef} style={footer}>
      {/* left: range + page size */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flexWrap: "wrap" }}>
        <RangeReadout start={start} end={end} total={total} loading={loading} itemLabel={itemLabel} />
        {showSizeSelector && (
          <>
            <span style={{ width: 1, height: 18, background: "var(--border)" }} />
            <SizeSelect value={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} disabled={loading} />
          </>
        )}
      </div>

      {/* right: pager */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <PagerBtn onClick={() => go(1)} disabled={atFirst} label="First page"><AdminIcon name="chevsL" size={14} /></PagerBtn>
          <PagerBtn onClick={() => go(cur - 1)} disabled={atFirst} label="Previous page"><AdminIcon name="chevL" size={14} /></PagerBtn>
          {win.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} style={{ minWidth: 22, textAlign: "center", color: "var(--fg-subtle)", fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700 }}>…</span>
            ) : (
              <PagerBtn key={p} onClick={() => go(p)} active={p === cur} label={`Page ${p}`}>{p}</PagerBtn>
            )
          )}
          <PagerBtn onClick={() => go(cur + 1)} disabled={atLast} label="Next page"><AdminIcon name="chevR" size={14} /></PagerBtn>
          <PagerBtn onClick={() => go(totalPages)} disabled={atLast} label="Last page"><AdminIcon name="chevsR" size={14} /></PagerBtn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { usePagination, pageWindow, Pagination });
