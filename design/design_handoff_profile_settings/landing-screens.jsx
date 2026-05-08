// landing-screens.jsx — Concert Crawl marketing landing page (mobile + desktop).
// v3 — feedback round: drop iPhone frame from canvas wrappers (handled at the
// canvas level), fix button overflow, larger desktop posters, vertically
// centered code-entry treatment.

const ccTokenVarsLS = window.ccTokenVars;

// ── Brand mark — small ClusterPath mark inline (no SVG file needed) ──
function CCClusterMark({ size = 32, color = "currentColor", glow = null }) {
  const useGlow = glow || color;
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 }, { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: "block" }}>
      <circle cx="72" cy="24" r="20" fill={useGlow} opacity="0.18" />
      <circle cx="72" cy="24" r="12" fill={useGlow} opacity="0.36" />
      <circle cx="72" cy="24" r="7"  fill={color} />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill={color} opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ── Wordmark ─────────────────────────────────────────────────────
function CCWordmark({ size = 28, color = "var(--fg)", accent = "var(--accent)" }) {
  return (
    <span style={{
      fontFamily: "Inter, system-ui",
      fontWeight: 900, fontSize: size, letterSpacing: "-0.025em",
      color, lineHeight: 1,
    }}>
      concert<span style={{ color: accent }}>crawl.</span>
    </span>
  );
}

// ── Beta pill ────────────────────────────────────────────────────
function BetaPill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 999,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: "var(--fg-muted)", letterSpacing: "0.14em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 3,
        background: "var(--signal)",
        boxShadow: "0 0 8px var(--signal)",
      }} />
      Private Beta
    </span>
  );
}

// ── Footer scrap ─────────────────────────────────────────────────
function LandingFooter({ align = "left" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4,
      alignItems: align === "center" ? "center" : "flex-start",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      color: "var(--fg-subtle)", letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}>
      <div>Denver pilot · more cities later</div>
      <div style={{ opacity: 0.7 }}>made by fans · v0.1 beta</div>
    </div>
  );
}

// ── CTA buttons — with overflow-safe sizing ─────────────────────
function PrimaryCTA({ onClick, children, fullWidth = false }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
      background: "var(--signal)",
      color: "var(--fg-on-accent)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      boxShadow: "0 12px 32px -12px var(--signal)",
      transition: "transform 0.12s ease",
    }}
    onMouseDown={e => e.currentTarget.style.transform = "translateY(1px)"}
    onMouseUp={e => e.currentTarget.style.transform = "none"}
    onMouseLeave={e => e.currentTarget.style.transform = "none"}
    >{children}</button>
  );
}

function SecondaryCTA({ onClick, children, fullWidth = false }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
      background: "transparent",
      color: "var(--fg)",
      border: "1px solid var(--border-strong)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 15,
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ── Three vibes (below the fold)  ───────────────────────────────
const VIBES = [
  { icon: "browse", title: "Browse",
    body: "Every show in Denver this week — list or calendar, your call." },
  { icon: "save",   title: "Save",
    body: "Heart the ones you might hit. They sync to your phone calendar." },
  { icon: "crawl",  title: "Crawl",
    body: "Stack a bunch in one night. We map the route." },
];

function VibeIcon({ name, color = "var(--fg)" }) {
  const stroke = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      {name === "browse" && (
        <g {...stroke}>
          <rect x="5" y="6" width="22" height="20" rx="2" />
          <line x1="9" y1="11" x2="23" y2="11" />
          <line x1="9" y1="16" x2="19" y2="16" />
          <line x1="9" y1="21" x2="21" y2="21" />
        </g>
      )}
      {name === "save" && (
        <g {...stroke}>
          <path d="M16 26C16 26 5 19.5 5 12.5C5 9.5 7.5 7 10.5 7C12.5 7 14.5 8.2 16 10C17.5 8.2 19.5 7 21.5 7C24.5 7 27 9.5 27 12.5C27 19.5 16 26 16 26Z" />
        </g>
      )}
      {name === "crawl" && (
        <g {...stroke}>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="22" cy="14" r="2.5" />
          <circle cx="11" cy="23" r="2.5" />
          <path d="M11 11l9 2M21 16l-9 5" strokeDasharray="2 2.5" />
        </g>
      )}
    </svg>
  );
}

function VibesGrid({ columns = 1 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: columns === 1 ? 14 : 18,
    }}>
      {VIBES.map(v => (
        <div key={v.title} style={{
          padding: "18px",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <VibeIcon name={v.icon} color="var(--signal)" />
          <h3 style={{
            margin: "4px 0 0",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18,
            color: "var(--fg)", letterSpacing: "-0.015em",
          }}>{v.title}</h3>
          <p style={{
            margin: 0,
            fontFamily: "Inter, system-ui", fontSize: 14,
            color: "var(--fg-muted)", lineHeight: 1.4,
            textWrap: "pretty",
          }}>{v.body}</p>
        </div>
      ))}
    </div>
  );
}

// ── Hero shows for poster stack ─────────────────────────────────
function getHeroShows() {
  const events = window.CC_EVENTS || [];
  // Curated set with optional openers for poster richness
  const openers = {
    "Big Thief": "Buck Meek",
    "Lewis Capaldi": "Maisie Peters",
    "Amyl and The Sniffers": "C.O.F.F.I.N.",
    "Wednesday": "Truth Club",
    "Geese": "Mary in the Junkyard",
    "Mannequin Pussy": "Soul Glo",
  };
  // Use a hand-picked sample of artists with varied name lengths so we can
  // see the line-break logic in action.
  const picks = ["Amyl and The Sniffers", "Wednesday", "Geese", "Mannequin Pussy"];
  const picked = picks
    .map(name => events.find(e => e.artist === name))
    .filter(Boolean);
  // Fallback: if not found, just take the first three.
  const source = picked.length >= 3 ? picked : events.slice(0, 4);
  return source.map(e => ({
    artist: e.artist,
    venue: e.venue,
    date: e.date,
    time: e.time,
    opener: openers[e.artist] || null,
  }));
}

// ============================================================
// WAITLIST MODAL — used by both mobile & desktop
// Fixed inside the artboard, centered via inset:0 + flex.
// ============================================================
function WaitlistModal({ open, onClose, submitted = false, onSubmit = () => {} }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open && !submitted && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [open, submitted]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(8px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "relative",
        width: "100%", maxWidth: 420,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "28px 24px 24px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          all: "unset", cursor: "pointer",
          position: "absolute", top: 14, right: 14,
          width: 28, height: 28, borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {!submitted ? (
          <>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--signal)", letterSpacing: "0.14em", textTransform: "uppercase",
              fontWeight: 700,
            }}>Waitlist</div>
            <h2 style={{
              margin: "8px 0 6px",
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 22,
              color: "var(--fg)", letterSpacing: "-0.02em",
            }}>Get on the list</h2>
            <p style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontSize: 14,
              color: "var(--fg-muted)", lineHeight: 1.45,
              textWrap: "pretty",
            }}>
              We're letting people in slowly. Drop your name and email — we'll
              ping you when there's room.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, email }); }} style={{
              display: "flex", flexDirection: "column", gap: 10,
              marginTop: 18,
            }}>
              <FormField label="Name" required>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jordan Reyes"
                  required
                  style={fieldInputStyle}
                />
              </FormField>
              <FormField label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  style={fieldInputStyle}
                />
              </FormField>
              <PrimaryCTA fullWidth>
                Add me to the list
              </PrimaryCTA>
            </form>

            <p style={{
              margin: "14px 0 0",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.08em",
              textTransform: "uppercase", textAlign: "center",
            }}>
              No spam. We'll only email when there's beta access.
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, margin: "0 auto",
              background: "var(--surface-2)",
              border: "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--success)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{
              margin: "16px 0 6px",
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 22,
              color: "var(--fg)", letterSpacing: "-0.02em",
            }}>You're on the list.</h2>
            <p style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontSize: 14,
              color: "var(--fg-muted)", lineHeight: 1.45,
              maxWidth: "32ch", marginInline: "auto",
              textWrap: "pretty",
            }}>
              We'll email you the moment a beta slot opens up. Thanks for
              caring about live music.
            </p>
            <button onClick={onClose} style={{
              all: "unset", cursor: "pointer",
              marginTop: 22, padding: "10px 20px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
              color: "var(--fg)", letterSpacing: "-0.005em",
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Small form helpers
const fieldInputStyle = {
  width: "100%", boxSizing: "border-box",
  height: 44, padding: "0 14px",
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontFamily: "Inter, system-ui", fontSize: 15,
  color: "var(--fg)", outline: "none",
  transition: "border-color 0.15s",
};

function FormField({ label, required, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.10em",
        textTransform: "uppercase", fontWeight: 700,
      }}>{label}{required && <span style={{ color: "var(--accent)" }}> *</span>}</span>
      {children}
      {hint && (
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 12,
          color: "var(--fg-subtle)",
        }}>{hint}</span>
      )}
    </label>
  );
}

// ============================================================
// LANDING — MOBILE  (393×852)  — no iPhone frame
// ============================================================
function LandingMobile({ theme = "electric", initialModal = "none", onSignIn = () => {} }) {
  const [modal, setModal] = React.useState(initialModal);
  React.useEffect(() => { setModal(initialModal); }, [initialModal]);

  const heroShows = getHeroShows();

  return (
    <div style={{
      ...ccTokenVarsLS(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Top chrome */}
      <div style={{
        flexShrink: 0,
        padding: "20px 22px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CCClusterMark size={26} color="var(--signal)" glow="var(--accent)" />
          <CCWordmark size={20} />
        </div>
        <BetaPill />
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "24px 22px 32px",
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* Hero text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={{
            margin: 0,
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 40,
            letterSpacing: "-0.035em", lineHeight: 0.95,
            textWrap: "balance",
          }}>
            See who's<br/>playing<br/>
            <span style={{ color: "var(--accent)" }}>tonight.</span>
          </h1>
          <p style={{
            margin: 0,
            fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 500,
            color: "var(--fg-muted)", lineHeight: 1.4,
            textWrap: "pretty",
          }}>
            Every show in Denver, in one place — sorted, savable, shareable.
            Built by fans, not algorithms.
          </p>
        </div>

        {/* Bigger poster stack — was 240×340, now 290×400 */}
        <div style={{
          display: "flex", justifyContent: "center",
          padding: "4px 0 12px",
        }}>
          <window.GigPosterStack
            shows={heroShows}
            width={290} height={400}
            intervalMs={5500}
          />
        </div>

        {/* CTAs — full-width, won't overflow */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PrimaryCTA fullWidth onClick={onSignIn}>
            I have a code →
          </PrimaryCTA>
          <SecondaryCTA fullWidth onClick={() => setModal("open")}>
            Join the waitlist
          </SecondaryCTA>
        </div>

        {/* Vibes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)", letterSpacing: "0.12em",
            textTransform: "uppercase", fontWeight: 700,
          }}>What you get</div>
          <VibesGrid columns={1} />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <LandingFooter />
        </div>
      </div>

      <WaitlistModal
        open={modal !== "none"}
        submitted={modal === "submitted"}
        onClose={() => setModal("none")}
        onSubmit={() => setModal("submitted")}
      />
    </div>
  );
}

// ============================================================
// LANDING — DESKTOP  (≥1280px)
// Bigger posters per wireframe — hero panel hung off the right edge.
// ============================================================
function LandingDesktop({ theme = "electric", initialModal = "none", onSignIn = () => {} }) {
  const [modal, setModal] = React.useState(initialModal);
  React.useEffect(() => { setModal(initialModal); }, [initialModal]);

  const heroShows = getHeroShows();

  return (
    <div style={{
      ...ccTokenVarsLS(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Top nav */}
      <header style={{
        flexShrink: 0,
        padding: "22px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CCClusterMark size={32} color="var(--signal)" glow="var(--accent)" />
          <CCWordmark size={22} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BetaPill />
          <button onClick={onSignIn} style={{
            all: "unset", cursor: "pointer",
            padding: "8px 14px", borderRadius: 8,
            border: "1px solid var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
            color: "var(--fg)", letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
          }}>I have a code →</button>
        </div>
      </header>

      {/* Hero — two columns; right column hosts a larger poster stack.
          The body scrolls inside the artboard so the WaitlistModal scrim
          (which is positioned absolute to this root) covers exactly the
          visible viewport — modal centers correctly. */}
      <main style={{
        flex: 1, overflowY: "auto", minHeight: 0,
        padding: "32px 48px 64px",
      }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 56, alignItems: "center",
          minHeight: 560,
        }}>
          {/* Left: pitch + CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontWeight: 900,
              fontSize: 84, letterSpacing: "-0.04em", lineHeight: 0.92,
              textWrap: "balance",
            }}>
              See who's<br/>playing in Denver<br/>
              <span style={{ color: "var(--accent)" }}>tonight.</span>
            </h1>
            <p style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontSize: 19, fontWeight: 500,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
              lineHeight: 1.45, maxWidth: "44ch",
              textWrap: "pretty",
            }}>
              Every show worth knowing about — sorted, savable, shareable.
              Built by fans, not algorithms. Currently in invite-only beta.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
              <PrimaryCTA onClick={onSignIn}>
                I have a code →
              </PrimaryCTA>
              <SecondaryCTA onClick={() => setModal("open")}>
                Join the waitlist
              </SecondaryCTA>
            </div>
          </div>

          {/* Right: bigger poster stack — 420×580 per wireframe sizing */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            minWidth: 0,
          }}>
            <window.GigPosterStack
              shows={heroShows}
              width={420} height={580}
              intervalMs={5500}
            />
          </div>
        </div>

        {/* Below the fold — vibes */}
        <div style={{
          marginTop: 80, paddingTop: 36,
          borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 28,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-muted)", letterSpacing: "0.14em",
              textTransform: "uppercase", fontWeight: 700,
            }}>What you get</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }}/>
          </div>
          <VibesGrid columns={3} />
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 56, paddingTop: 22,
          borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          gap: 24, flexWrap: "wrap",
        }}>
          <LandingFooter />
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)", letterSpacing: "0.10em",
            textTransform: "uppercase",
            display: "flex", gap: 18,
          }}>
            <span style={{ cursor: "pointer" }}>Contact</span>
            <span style={{ cursor: "pointer" }}>Privacy</span>
            <span style={{ cursor: "pointer" }}>Terms</span>
          </div>
        </div>
        </div>
      </main>

      <WaitlistModal
        open={modal !== "none"}
        submitted={modal === "submitted"}
        onClose={() => setModal("none")}
        onSubmit={() => setModal("submitted")}
      />
    </div>
  );
}

window.LandingMobile = LandingMobile;
window.LandingDesktop = LandingDesktop;
window.WaitlistModal = WaitlistModal;
window.CCClusterMark = CCClusterMark;
window.CCWordmark = CCWordmark;
window.BetaPill = BetaPill;
window.fieldInputStyle = fieldInputStyle;
window.LandingFormField = FormField;
