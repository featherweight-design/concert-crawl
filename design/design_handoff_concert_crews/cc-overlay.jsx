// cc-overlay.jsx — the shell underneath CCTip, extracted so it can carry more
// than tooltips.
//
// R2.1: the watcher roster ("the crawl on this show") needs exactly the same
// two shells CCTip already had — anchored popover on desktop, bottom sheet on
// mobile — but it is not a tooltip: it's interactive data with its own header
// and rows. Rather than write a second popover/sheet pair beside the first
// (the drift we just spent two passes removing from event rows), the chrome
// moves here and both features consume it.
//
//   <CCOverlay mode="popover|sheet" title placement align width onClose>
//
// Owns: positioning, arrow, header, close button, scrim, grabber, focus trap,
// Escape. Knows nothing about content.
//
// Exports: CCOverlay, CCOverlayHost, useOverlayTrigger, CC_OVERLAY_UI, CC_OVERLAY_MONO

const CC_OVERLAY_UI = "Inter, system-ui, sans-serif";
const CC_OVERLAY_MONO = "'JetBrains Mono', ui-monospace, monospace";

function CCOverlayX({ size = 12 }) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

// Focus trap + initial focus. Sheets are aria-modal, so this is required, not
// optional — R1 shipped the attribute without the behaviour.
function useFocusTrap(active) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const first = root.querySelector(sel);
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll(sel)).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [active]);
  return ref;
}

function CCOverlay({
  id, mode = "popover", title, placement = "top", align = "center",
  width = 300, showHeader = true, onClose, children,
}) {
  const trapRef = useFocusTrap(mode === "sheet");

  if (mode === "sheet") {
    return (
      <div ref={trapRef} style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <button type="button" aria-label="Close" onClick={onClose} style={{
          all: "unset", position: "absolute", inset: 0, cursor: "pointer",
          background: "var(--scrim)", backdropFilter: "blur(1.5px)",
        }}/>
        <div id={id} role="dialog" aria-modal="true" aria-label={title} style={{
          position: "relative", background: "var(--bg-elevated)",
          borderTop: "1px solid var(--border-strong)",
          borderRadius: "18px 18px 0 0",
          padding: "10px 18px 26px",
          maxHeight: "78%", overflowY: "auto",
          boxShadow: "0 -20px 50px -18px var(--shadow-strong)",
          textAlign: "left",
        }}>
          <div aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 12px" }}/>
          {showHeader && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <span style={{
                flex: 1, fontFamily: CC_OVERLAY_MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
              }}>{title}</span>
              <button type="button" onClick={onClose} aria-label="Close" style={{
                all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)", color: "var(--fg-muted)", flexShrink: 0,
              }}><CCOverlayX/></button>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  const vert = placement === "bottom" ? { top: "calc(100% + 11px)" } : { bottom: "calc(100% + 11px)" };
  const horiz = align === "start" ? { left: -10 } : align === "end" ? { right: -10 } : { left: "50%", transform: "translateX(-50%)" };
  const arrow = placement === "bottom" ? { top: -4.5 } : { bottom: -4.5 };
  const arrowH = align === "start" ? { left: 17 } : align === "end" ? { right: 17 } : { left: "50%", marginLeft: -4.5 };
  return (
    <div id={id} role="dialog" aria-label={title} style={{
      position: "absolute", zIndex: 40, width, ...vert, ...horiz,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 12,
      boxShadow: "0 18px 44px -14px var(--shadow-strong), 0 2px 6px -2px var(--shadow-soft)",
      padding: 14, textAlign: "left",
    }}>
      <div style={{
        position: "absolute", width: 9, height: 9, ...arrow, ...arrowH,
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-strong)",
        borderTop: "1px solid var(--border-strong)",
        transform: "rotate(45deg)",
      }}/>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
          <span style={{
            flex: 1, fontFamily: CC_OVERLAY_MONO, fontSize: 9.5, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)", paddingTop: 1,
          }}>{title}</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            all: "unset", cursor: "pointer", color: "var(--fg-subtle)", flexShrink: 0,
            width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4,
          }}><CCOverlayX size={11}/></button>
        </div>
      )}
      {children}
    </div>
  );
}

// Portals a sheet into the surface root so it spans the viewport rather than
// the trigger's inline box. Same contract CCTip's sheetHost already used.
function CCOverlayHost({ host, children }) {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    if (!host) return;
    const el = typeof host === "string" ? document.querySelector(host) : (host.current || host);
    setNode(el || null);
  }, [host]);
  if (!host) return children;
  if (!node) return null;
  return ReactDOM.createPortal(children, node);
}

// Open/close state shared by every overlay trigger: hover-intent + click-to-pin
// on desktop, tap on mobile, Escape returns focus.
function useOverlayTrigger({ isMobile, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [pinned, setPinned] = React.useState(defaultOpen);
  const btnRef = React.useRef(null);
  const timer = React.useRef(null);

  React.useEffect(() => { setOpen(defaultOpen); setPinned(defaultOpen); }, [defaultOpen]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false); setPinned(false);
      if (btnRef.current) btnRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return {
    open, pinned, btnRef,
    close: () => { setOpen(false); setPinned(false); },
    hoverIn: () => { if (isMobile) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 110); },
    hoverOut: () => {
      if (isMobile) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { if (!pinned) setOpen(false); }, 140);
    },
    onBlur: (e) => {
      if (isMobile || pinned) return;
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setOpen(false);
    },
    onFocus: () => { if (!isMobile) setOpen(true); },
    toggle: () => {
      if (isMobile) { setOpen((o) => !o); setPinned((o) => !o); return; }
      if (pinned) { setPinned(false); setOpen(false); }
      else { setPinned(true); setOpen(true); }
    },
  };
}

Object.assign(window, { CCOverlay, CCOverlayHost, useOverlayTrigger, useFocusTrap, CC_OVERLAY_UI, CC_OVERLAY_MONO });
