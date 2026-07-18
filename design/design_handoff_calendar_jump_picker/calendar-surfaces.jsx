// calendar-surfaces.jsx — #642 · the Browse · Cal surface the picker lives in
//
// Renders realistic mobile + desktop context (app chrome → week-strip header →
// day list) with the JumpPicker anchored in the header. Interactive: tap the
// month/year cue to open, page months, pick a day. Behaviour is identical
// across mobile + desktop (parity constraint); only the layout differs —
// mobile drops the sheet full-width under the header, desktop floats a popover
// anchored to the cue.

const { MMark, MonoEyebrow } = window;
const {
  WeekStripHeader, JumpPicker, ArtRect, CJP_TODAY_ISO, CJP_TODAY, CJP_MIN, CJP_MAX,
  MONTHS, MON3, isoOf, ymd, cjpEventsFor, cjpFmtDate,
} = window;

// spoken form of today, for the control's aria-label
function b2tTodaySpoken() {
  const dt = new Date(CJP_TODAY.y, CJP_TODAY.m, CJP_TODAY.d);
  const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${DOW[dt.getDay()]}, ${MONTHS[CJP_TODAY.m]} ${CJP_TODAY.d}`;
}

function cjpWeekOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const sun = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + i);
    return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), iso: isoOf(dt.getFullYear(), dt.getMonth(), dt.getDate()) };
  });
}
function cjpMonthLabelFor(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
function cjpShift(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return isoOf(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

// ── day list (events for the selected date) ──────────────────
function DayList({ iso, dense = false }) {
  const events = cjpEventsFor(iso);
  if (events.length === 0) {
    const isToday = iso === CJP_TODAY_ISO;
    const [, , d] = iso.split("-").map(Number);
    const wd = cjpFmtDate(iso).split(",")[0];
    return (
      <div style={{ padding: "34px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, color: "var(--fg)", letterSpacing: "-0.02em" }}>
          {isToday ? "No shows tonight, grandpa." : `Nothing on ${wd}. Rest up.`}
        </div>
        <MonoEyebrow size={9.5} color="var(--fg-subtle)" letterSpacing="0.08em" style={{ marginTop: 7 }}>
          jump to a busier day ↑
        </MonoEyebrow>
      </div>
    );
  }
  return (
    <div style={{ padding: dense ? "0 14px" : "0 16px" }}>
      <MonoEyebrow size={9.5} color="var(--fg-muted)" letterSpacing="0.08em" style={{ padding: "2px 0 8px" }}>
        {cjpFmtDate(iso)} · {events.length} show{events.length !== 1 ? "s" : ""}
      </MonoEyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: 8, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", alignItems: "center" }}>
            <ArtRect label={e.artist} size={50} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14, color: "var(--fg)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.artist}</div>
              <MonoEyebrow size={9} color="var(--fg-muted)" letterSpacing="0.06em">{e.venue.toUpperCase()} · {e.time}</MonoEyebrow>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: "var(--signal)" }}>{e.tier}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── mobile app chrome bits ───────────────────────────────────
function MobileTop() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MMark size={26} />
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 17, border: "1.5px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5" /><path d="M11 11L14.5 14.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "10px 16px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24, color: "var(--fg)", letterSpacing: "-0.03em" }}>What's on?</span>
          <MonoEyebrow size={10} color="var(--fg-muted)" letterSpacing="0.06em">Denver, CO</MonoEyebrow>
        </div>
        <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
          {["list", "cal"].map((v) => (
            <div key={v} style={{
              padding: "0 12px", display: "flex", alignItems: "center",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
              background: v === "cal" ? "var(--signal)" : "transparent",
              color: v === "cal" ? "var(--fg-on-accent)" : "var(--fg-muted)",
            }}>{v}</div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CalSurfaceMobile — full mobile Browse · Cal, picker in header
// ─────────────────────────────────────────────────────────────
function CalSurfaceMobile({
  initialSelected = CJP_TODAY_ISO, initialOpen = false, pickerView,
  cueStyle = "chip", indicators = "dots", closing = "both", weekendEmphasis = true, anim = "scale",
  backToToday = false, btLabelStyle = "iconText", btWording = "today", btPlacement = "inline", showTodayChip = true,
}) {
  const [selected, setSelected] = React.useState(initialSelected);
  const [open, setOpen] = React.useState(initialOpen);
  React.useEffect(() => { setOpen(initialOpen); }, [initialOpen]);
  React.useEffect(() => { setSelected(initialSelected); }, [initialSelected]);

  const week = cjpWeekOf(selected);
  const vY = pickerView ? pickerView.y : Number(selected.split("-")[0]);
  const vM = pickerView ? pickerView.m : Number(selected.split("-")[1]) - 1;
  const canClosePane = closing === "both" || closing === "scrim";

  const pick = (iso) => { setSelected(iso); setOpen(false); };
  const goToday = () => { setSelected(CJP_TODAY_ISO); setOpen(false); };
  const B2T = window.BackToTodayControl;
  const showB2T = backToToday && !window.b2tWeekHasToday(week, CJP_TODAY_ISO);
  const b2tInline = showB2T && btPlacement === "inline" && B2T
    ? <B2T labelStyle={btLabelStyle} wording={btWording} placement="inline" todaySpoken={b2tTodaySpoken()} onClick={goToday} />
    : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", overflow: "hidden" }}>
      <div style={{ paddingTop: 54 }}>
        <MobileTop />
        <WeekStripHeader
          week={week} selectedISO={selected} monthLabel={cjpMonthLabelFor(selected)}
          cueStyle={cueStyle} open={open} onToggle={() => setOpen((o) => !o)}
          onPrevWeek={() => setSelected((s) => cjpShift(s, -7))}
          onNextWeek={() => setSelected((s) => cjpShift(s, 7))}
          onSelectDay={setSelected}
          beforeChevrons={b2tInline}
        />
        <div style={{ height: 1, background: "var(--border)", margin: "2px 16px 12px" }} />
        <DayList iso={selected} />
      </div>

      {/* floating variant — sits over the day list, thumb-reach */}
      {showB2T && btPlacement === "floating" && B2T && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, display: "flex", justifyContent: "center", zIndex: 3, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <B2T labelStyle={btLabelStyle} wording={btWording} placement="floating" todaySpoken={b2tTodaySpoken()} onClick={goToday} />
          </div>
        </div>
      )}

      {/* picker overlay */}
      {open && (
        <>
          <div onClick={canClosePane ? () => setOpen(false) : undefined}
            style={{ position: "absolute", inset: 0, background: "var(--scrim)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 4, cursor: canClosePane ? "pointer" : "default" }} />
          <div style={{ position: "absolute", top: 150, left: 12, right: 12, zIndex: 5, display: "flex", justifyContent: "center" }}>
            <JumpPicker
              initialY={vY} initialM={vM} selectedISO={selected} onSelect={pick} onClose={() => setOpen(false)}
              indicators={indicators} closing={closing} weekendEmphasis={weekendEmphasis} anim={anim}
              width={"100%"} showTodayChip={showTodayChip}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── desktop browser chrome ───────────────────────────────────
function DesktopChrome({ url = "concertcrawl.app/browse", children }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 38, background: "var(--surface-1)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, zIndex: 5 }}>
        {["#FF7A8A", "#FFD27A", "#7BFFB0"].map((c, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 6, background: c, opacity: 0.7 }} />)}
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>{url}</div>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ position: "absolute", inset: "38px 0 0 0" }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CalSurfaceDesktop — desktop Browse · Cal, picker as popover
// ─────────────────────────────────────────────────────────────
function CalSurfaceDesktop({
  initialSelected = CJP_TODAY_ISO, initialOpen = false, pickerView,
  cueStyle = "chip", indicators = "dots", closing = "both", weekendEmphasis = true, anim = "scale",
  backToToday = false, btLabelStyle = "iconText", btWording = "today", btPlacement = "inline", showTodayChip = true,
}) {
  const [selected, setSelected] = React.useState(initialSelected);
  const [open, setOpen] = React.useState(initialOpen);
  React.useEffect(() => { setOpen(initialOpen); }, [initialOpen]);
  React.useEffect(() => { setSelected(initialSelected); }, [initialSelected]);

  const week = cjpWeekOf(selected);
  const vY = pickerView ? pickerView.y : Number(selected.split("-")[0]);
  const vM = pickerView ? pickerView.m : Number(selected.split("-")[1]) - 1;
  const canClosePane = closing === "both" || closing === "scrim";
  const pick = (iso) => { setSelected(iso); setOpen(false); };
  const goToday = () => { setSelected(CJP_TODAY_ISO); setOpen(false); };
  const B2T = window.BackToTodayControl;
  const showB2T = backToToday && !window.b2tWeekHasToday(week, CJP_TODAY_ISO);
  const b2tInline = showB2T && btPlacement === "inline" && B2T
    ? <B2T labelStyle={btLabelStyle} wording={btWording} placement="inline" todaySpoken={b2tTodaySpoken()} onClick={goToday} />
    : null;

  return (
    <DesktopChrome>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", overflow: "hidden" }}>
        {/* app bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <MMark size={26} />
            <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {["Browse", "Search", "Saved"].map((l, i) => (
              <span key={i} style={{ fontFamily: "Inter, system-ui", fontWeight: i === 0 ? 700 : 500, fontSize: 14, color: i === 0 ? "var(--fg)" : "var(--fg-muted)" }}>{l}</span>
            ))}
            <div style={{ width: 32, height: 32, borderRadius: 32, background: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 13 }}>H</div>
          </div>
        </div>

        {/* centered column */}
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 24px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 30, color: "var(--fg)", letterSpacing: "-0.035em" }}>What's on?</span>
              <MonoEyebrow size={10} color="var(--fg-muted)" letterSpacing="0.06em">Denver, CO</MonoEyebrow>
            </div>
            <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
              {["list", "cal"].map((v) => (
                <div key={v} style={{ padding: "0 14px", display: "flex", alignItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", background: v === "cal" ? "var(--signal)" : "transparent", color: v === "cal" ? "var(--fg-on-accent)" : "var(--fg-muted)" }}>{v}</div>
              ))}
            </div>
          </div>

          {/* header (cue anchor) */}
          <div style={{ position: "relative" }}>
            <WeekStripHeader
              week={week} selectedISO={selected} monthLabel={cjpMonthLabelFor(selected)}
              cueStyle={cueStyle} open={open} onToggle={() => setOpen((o) => !o)}
              onPrevWeek={() => setSelected((s) => cjpShift(s, -7))}
              onNextWeek={() => setSelected((s) => cjpShift(s, 7))}
              onSelectDay={setSelected}
              beforeChevrons={b2tInline}
            />
            {/* popover */}
            {open && (
              <>
                {canClosePane && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 8 }} />}
                <div style={{ position: "absolute", top: 46, left: 12, zIndex: 9 }}>
                  <JumpPicker
                    initialY={vY} initialM={vM} selectedISO={selected} onSelect={pick} onClose={() => setOpen(false)}
                    indicators={indicators} closing={closing} weekendEmphasis={weekendEmphasis} anim={anim}
                    width={324} showTodayChip={showTodayChip}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "4px 12px 16px" }} />
          <DayList iso={selected} dense />

          {/* floating variant — over the day list */}
          {showB2T && btPlacement === "floating" && B2T && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, display: "flex", justifyContent: "center", zIndex: 3, pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto" }}>
                <B2T labelStyle={btLabelStyle} wording={btWording} placement="floating" todaySpoken={b2tTodaySpoken()} onClick={goToday} />
              </div>
            </div>
          )}
        </div>
      </div>
    </DesktopChrome>
  );
}

Object.assign(window, {
  CalSurfaceMobile, CalSurfaceDesktop, DesktopChrome, DayList,
  cjpWeekOf, cjpMonthLabelFor, cjpShift,
});
