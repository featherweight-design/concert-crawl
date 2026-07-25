// ============================================================
// VENDOR PICKER — "Where it's listed" · Submit a Price
// Concert Crawl · 2026-07
//
// Replaces the flat 6-chip vendor group with:
//   3 pinned chips  →  Venue box office · AXS · Ticketmaster
//   1 "More…" chip  →  opens a grouped listbox (sheet on mobile,
//                      popover on desktop) with the remaining 9.
//
// Closed set. No free text, no URLs. `Other` is text-free.
//
// Enum values are PascalCase, matching the shipped `submission_vendor`
// pgEnum and the `Vendor` union — see REVIEW.md §1. This file is the
// interaction/a11y spec; REVIEW.md is the data contract of record.
//
// Tokens only. Exports on window: VENDOR_TAXONOMY, VENDOR_ENUM,
// vp_vendorEnum, vp_isResale, SPVendorField.
// ============================================================

// ── Taxonomy ────────────────────────────────────────────────
// Ordering inside `primary` is frequency-first from prod link counts
// (Etix first by a wide margin, then Eventbrite, then DICE). Resale
// ordering is unverified — no prod frequency behind it.
//
// SeatGeek sits under Resale, not Primary: `kindFromVendor` and
// `resolveSourceKind` both return 'resale' for it, so the other
// placement would contradict the price-kind logic behind the picker.
const VENDOR_PINNED = ["Venue box office", "AXS", "Ticketmaster"];

const VENDOR_GROUPS = [
  {
    id: "primary",
    label: "Primary",
    caption: "sold at face value",
    items: ["Etix", "Eventbrite", "DICE"],
  },
  {
    id: "resale",
    label: "Resale",
    caption: "priced above face value",
    items: ["StubHub", "SeatGeek", "Vivid Seats", "viagogo", "TicketNetwork"],
  },
];

// The catch-all is the one entry whose display string and enum value differ,
// so it carries both — every list below is display strings.
const VENDOR_CATCHALL = "Somewhere else";

const VENDOR_TAXONOMY = {
  pinned: VENDOR_PINNED,
  groups: VENDOR_GROUPS,
  catchAll: VENDOR_CATCHALL,
  all: [...VENDOR_PINNED, ...VENDOR_GROUPS.flatMap(g => g.items), VENDOR_CATCHALL],
};

// Display string → stored enum value. The enum is the contract; the
// display string is copy and may be re-worded without a migration.
const VENDOR_ENUM = {
  "Venue box office": "VenueBoxOffice",
  "AXS": "AXS",
  "Ticketmaster": "Ticketmaster",
  "Etix": "Etix",
  "Eventbrite": "Eventbrite",
  "DICE": "DICE",
  "SeatGeek": "SeatGeek",
  "StubHub": "StubHub",
  "Vivid Seats": "VividSeats",
  "viagogo": "Viagogo",
  "TicketNetwork": "TicketNetwork",
  "Somewhere else": "Other",
};

const vp_vendorEnum = name => VENDOR_ENUM[name] || null;
const vp_isResale = name =>
  (VENDOR_GROUPS.find(group => group.id === "resale")?.items || []).includes(name);
const vp_inDropdown = name =>
  !!name && !VENDOR_PINNED.includes(name);

// ── Shared chip shell ───────────────────────────────────────
const vpChipBase = active => ({
  all: "unset",
  cursor: "pointer",
  boxSizing: "border-box",
  display: "inline-flex", alignItems: "center", gap: 6,
  minHeight: 38,
  padding: "8px 14px",
  borderRadius: 999,
  border: active ? "1.5px solid var(--signal)" : "1px solid var(--border-strong)",
  background: active ? "rgba(122,230,255,0.08)" : "var(--surface-1)",
  color: active ? "var(--signal)" : "var(--fg)",
  fontFamily: "Inter, system-ui",
  fontSize: 13.5, fontWeight: 600,
  letterSpacing: "-0.005em",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
});

function VPCaret({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" style={{
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 0.18s ease",
      flexShrink: 0,
    }}>
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function VPCheck({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function VPClear({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ── The listbox body — shared by sheet and popover ──────────
// role=listbox with role=group sections. Roving tabindex, typeahead,
// Home/End, Esc. Selection commits and closes.
function VendorListbox({ value, onChange, onClose, labelledBy, autoFocus = true }) {
  const flat = React.useMemo(
    () => [...VENDOR_GROUPS.flatMap(g => g.items), VENDOR_CATCHALL],
    []
  );
  const startIndex = Math.max(0, flat.indexOf(value));
  const [active, setActive] = React.useState(startIndex);
  const itemRefs = React.useRef([]);
  const typeahead = React.useRef({ buf: "", at: 0 });

  React.useEffect(() => {
    if (autoFocus) itemRefs.current[active]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusAt = i => {
    const n = (i + flat.length) % flat.length;
    setActive(n);
    itemRefs.current[n]?.focus();
  };

  const onKeyDown = e => {
    const k = e.key;
    if (k === "ArrowDown") { e.preventDefault(); focusAt(active + 1); }
    else if (k === "ArrowUp") { e.preventDefault(); focusAt(active - 1); }
    else if (k === "Home") { e.preventDefault(); focusAt(0); }
    else if (k === "End") { e.preventDefault(); focusAt(flat.length - 1); }
    else if (k === "Escape") { e.preventDefault(); onClose(); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); onChange(flat[active]); }
    else if (k.length === 1 && /\S/.test(k)) {
      const now = Date.now();
      const t = typeahead.current;
      t.buf = now - t.at > 700 ? k : t.buf + k;
      t.at = now;
      const hit = flat.findIndex(v => v.toLowerCase().startsWith(t.buf.toLowerCase()));
      if (hit >= 0) focusAt(hit);
    }
  };

  let idx = -1;
  return (
    <div
      role="listbox"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      style={{ display: "flex", flexDirection: "column", gap: 14, outline: "none" }}
    >
      {VENDOR_GROUPS.map(group => (
        <div key={group.id} role="group" aria-labelledby={`vp-grp-${group.id}`}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div id={`vp-grp-${group.id}`} style={{
            display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
            padding: "0 2px 2px",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: group.id === "resale" ? "var(--warning)" : "var(--fg-subtle)",
            }}>{group.label}</span>
            <span style={{
              fontFamily: "Inter, system-ui",
              fontSize: 11.5, fontWeight: 500,
              color: "var(--fg-subtle)", letterSpacing: "-0.005em",
            }}>{group.caption}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {group.items.map(item => {
              idx += 1;
              const i = idx;
              const selected = value === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  ref={el => (itemRefs.current[i] = el)}
                  tabIndex={active === i ? 0 : -1}
                  onFocus={() => setActive(i)}
                  onClick={() => onChange(item)}
                  style={{
                    all: "unset", cursor: "pointer", boxSizing: "border-box",
                    display: "flex", alignItems: "center", gap: 10,
                    minHeight: 44, padding: "0 12px",
                    borderRadius: 8,
                    background: selected ? "rgba(122,230,255,0.08)" : "transparent",
                    color: selected ? "var(--signal)" : "var(--fg)",
                    fontFamily: "Inter, system-ui",
                    fontSize: 14.5, fontWeight: selected ? 700 : 500,
                    letterSpacing: "-0.005em",
                  }}
                >
                  <span style={{
                    width: 14, display: "inline-flex", justifyContent: "center",
                    color: "var(--signal)", opacity: selected ? 1 : 0,
                  }}><VPCheck /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Catch-all — ungrouped, divided off. Text-free by policy. */}
      {(() => {
        idx += 1;
        const i = idx;
        const selected = value === VENDOR_CATCHALL;
        return (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              ref={el => (itemRefs.current[i] = el)}
              tabIndex={active === i ? 0 : -1}
              onFocus={() => setActive(i)}
              onClick={() => onChange(VENDOR_CATCHALL)}
              style={{
                all: "unset", cursor: "pointer", boxSizing: "border-box",
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                minHeight: 44, padding: "0 12px",
                borderRadius: 8,
                background: selected ? "rgba(122,230,255,0.08)" : "transparent",
                color: selected ? "var(--signal)" : "var(--fg-muted)",
                fontFamily: "Inter, system-ui",
                fontSize: 14.5, fontWeight: selected ? 700 : 500,
                letterSpacing: "-0.005em",
              }}
            >
              <span style={{
                width: 14, display: "inline-flex", justifyContent: "center",
                color: "var(--signal)", opacity: selected ? 1 : 0,
              }}><VPCheck /></span>
              <span style={{ flex: 1, minWidth: 0 }}>{VENDOR_CATCHALL}</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ── Sheet wrapper (mobile) ──────────────────────────────────
// Absolutely positioned inside the nearest positioned ancestor —
// the route root sets position:relative. Production uses a portal.
function VendorSheet({ value, onChange, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      display: "flex", flexDirection: "column",
    }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.55)" }} />
      <div role="dialog" aria-modal="true" aria-labelledby="vp-sheet-title" style={{
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: "1px solid var(--border-strong)",
        padding: "10px 16px 20px",
        maxHeight: "84%",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -24px 60px -10px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          width: 44, height: 4, borderRadius: 2,
          background: "var(--border-strong)",
          alignSelf: "center", marginBottom: 12,
        }} />
        <div id="vp-sheet-title" style={{
          fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 800,
          color: "var(--fg)", letterSpacing: "-0.01em",
          paddingBottom: 10, marginBottom: 10,
          borderBottom: "1px solid var(--border)",
        }}>Where it's listed</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
          <VendorListbox value={value} onChange={onChange} onClose={onClose} labelledBy="vp-sheet-title" />
        </div>
      </div>
    </div>
  );
}

// ── Popover wrapper (desktop) ───────────────────────────────
function VendorPopover({ value, onChange, onClose, placement = "bottom" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-labelledby="vp-pop-title" style={{
      position: "absolute", right: 0, zIndex: 20,
      ...(placement === "top"
        ? { bottom: "calc(100% + 8px)" }
        : { top: "calc(100% + 8px)" }),
      width: 268, maxHeight: 380, overflowY: "auto",
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 12,
      padding: "12px 10px",
      boxShadow: "0 24px 60px -18px rgba(0,0,0,0.65)",
    }}>
      <div id="vp-pop-title" style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--fg-subtle)",
        padding: "0 2px 10px",
      }}>More vendors</div>
      <VendorListbox value={value} onChange={onChange} onClose={onClose} labelledBy="vp-pop-title" />
    </div>
  );
}

// ── The field ───────────────────────────────────────────────
// surface: "sheet" | "popover"
// forceOpen / forceSelected are design-canvas affordances so a static
// artboard can render an open or filled state without interaction.
function SPVendorField({
  label = "Where it's listed",
  value,
  onChange,
  error,
  surface = "sheet",
  placement = "bottom",   // popover only; production flips on collision
  forceOpen = false,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(forceOpen);
  React.useEffect(() => setOpen(forceOpen), [forceOpen]);
  const triggerRef = React.useRef(null);
  const labelId = React.useRef("vp-label-" + Math.random().toString(36).slice(2, 8)).current;

  const fromDropdown = vp_inDropdown(value);
  const close = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  const pick = v => { onChange(v); setOpen(false); triggerRef.current?.focus(); };
  // A pinned chip and the dropdown are one selection, so choosing a chip has to
  // dismiss an open surface. Focus stays on the chip — it's still there.
  const pickPinned = v => { onChange(v); setOpen(false); };
  // Clearing removes this button from the DOM, so focus has to be handed back
  // deliberately or it falls to <body>.
  const clear = () => { onChange(null); setOpen(false); triggerRef.current?.focus(); };

  const triggerLabel = fromDropdown ? value : "More…";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div id={labelId} style={{
        fontFamily: "Inter, system-ui",
        fontSize: 13, fontWeight: 700,
        color: "var(--fg)", letterSpacing: "-0.005em",
      }}>{label}</div>

      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {/* Pinned three — a real radiogroup */}
        <div role="radiogroup" aria-labelledby={labelId} style={{
          display: "contents",
        }}>
          {VENDOR_PINNED.map(opt => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => pickPinned(opt)}
                style={{ ...vpChipBase(active), cursor: disabled ? "not-allowed" : "pointer" }}
              >{opt}</button>
            );
          })}
        </div>

        {/* Fourth control — More… / selected vendor. Positioning context for
            the popover so it anchors to this chip, not to the row. */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "stretch" }}>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={fromDropdown
              ? `Where it's listed: ${triggerLabel}. Change vendor`
              : "More vendors"}
            onClick={() => setOpen(o => !o)}
            style={{
              ...vpChipBase(fromDropdown),
              cursor: disabled ? "not-allowed" : "pointer",
              ...(fromDropdown ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: 10 } : {}),
            }}
          >
            <span>{triggerLabel}</span>
            {!fromDropdown && <VPCaret open={open} />}
          </button>
          {fromDropdown && (
            <button
              type="button"
              disabled={disabled}
              aria-label={`Clear ${triggerLabel}`}
              onClick={clear}
              style={{
                ...vpChipBase(true),
                cursor: disabled ? "not-allowed" : "pointer",
                borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                borderLeft: "1px solid rgba(122,230,255,0.35)",
                paddingLeft: 9, paddingRight: 11,
              }}
            ><VPClear /></button>
          )}

          {open && surface === "popover" && (
            <VendorPopover value={value} onChange={pick} onClose={close} placement={placement} />
          )}
        </div>
      </div>

      {error && (
        <div style={{
          fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 600,
          color: "var(--danger)", letterSpacing: "-0.005em",
        }}>{error}</div>
      )}

      {open && surface === "sheet" && (
        <VendorSheet value={value} onChange={pick} onClose={close} />
      )}
    </div>
  );
}

Object.assign(window, {
  VENDOR_TAXONOMY,
  VENDOR_ENUM,
  VENDOR_PINNED,
  VENDOR_GROUPS,
  vp_vendorEnum,
  vp_isResale,
  vp_inDropdown,
  SPVendorField,
  VendorListbox,
  VendorSheet,
  VendorPopover,
});
