// onboarding-screens.jsx — Concert Crawl post-code-redemption onboarding.
//
// FLOW POSITION
//   Landing → Code Entry → [ ONBOARDING ] → Clerk sign-up → Browse
//
//   Onboarding sits BETWEEN code acceptance and Clerk auth, per founder direction:
//   we don't want anyone registering with Clerk if they don't have access — and we
//   don't want to ask a stranger to create an account before we've told them what
//   they signed up for. Founder note + how-it-works + handoff.
//
// PRINCIPLES (from product)
//   1. Light but purposeful. 3 steps, nothing skippable, no preference capture.
//   2. Honest, open, vulnerable. Founder voice on welcome. App-voice on the rest.
//   3. Earn trust. Tell them what's verified, what isn't, what's coming.
//   4. Set expectations. Denver-only, things will change, they shape it.
//
// COMPONENTS EXPORTED
//   <OnboardingMobile />, <OnboardingDesktop />, <OnboardingShell /> (inner content),
//   <FounderNote />, <HowItWorks />, <YoureIn />, <FuturePref />,
//   plus a <ProgressDots /> chrome control.

const ccTokenVarsOB = window.ccTokenVars;
const CCClusterMarkOB = window.CCClusterMark;
const CCWordmarkOB = window.CCWordmark;
const BetaPillOB = window.BetaPill;

// ── Step library ────────────────────────────────────────────────
// Each step is keyed; the shell selects + orders them based on tweaks.
const OB_STEPS = {
  welcome:   { key: "welcome",   label: "From me to you",   short: "Welcome" },
  how:       { key: "how",       label: "How this works",   short: "How it works" },
  today:     { key: "today",     label: "What it does today", short: "Today" },
  notyet:    { key: "notyet",    label: "What it doesn't (yet)", short: "Not yet" },
  preview:   { key: "preview",   label: "Coming soon",      short: "Coming soon" },
  done:      { key: "done",      label: "You're in",        short: "You're in" },
};

// Default flows by step count tweak. Welcome + done are anchors.
const OB_FLOWS = {
  2: ["welcome", "done"],
  3: ["welcome", "how", "done"],          // RECOMMENDED
  4: ["welcome", "how", "today", "done"],
  5: ["welcome", "how", "today", "notyet", "done"],
};

// When the "how it works" tweak is OFF we strip it (and bump down).
function ob_resolveFlow(stepCount, includeHow, includePreview) {
  let flow = OB_FLOWS[stepCount] || OB_FLOWS[3];
  if (!includeHow) flow = flow.filter(k => k !== "how");
  if (includePreview && !flow.includes("preview")) {
    // insert preview before "done"
    const idx = flow.indexOf("done");
    flow = [...flow.slice(0, idx), "preview", ...flow.slice(idx)];
  }
  if (flow.length < 2) flow = ["welcome", "done"]; // safety
  return flow;
}

// ── Progress dots ───────────────────────────────────────────────
function ProgressDots({ total, index }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <span key={i} style={{
            width: active ? 28 : 8,
            height: 8,
            borderRadius: 999,
            background: active
              ? "var(--signal)"
              : done ? "var(--signal-muted)" : "var(--surface-3)",
            transition: "width 0.25s ease, background 0.2s ease",
          }} />
        );
      })}
    </div>
  );
}

// ── Eyebrow / kicker ────────────────────────────────────────────
function Eyebrow({ children, tone = "signal" }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: "0.14em",
      textTransform: "uppercase", fontWeight: 700,
      color: tone === "accent" ? "var(--accent)" : "var(--signal)",
    }}>{children}</div>
  );
}

function StepHeading({ children, dense = false }) {
  return (
    <h1 style={{
      margin: 0,
      fontFamily: "Inter, system-ui",
      fontWeight: 900,
      fontSize: dense ? 28 : 34,
      letterSpacing: "-0.03em",
      lineHeight: 1.05,
      textWrap: "balance",
      color: "var(--fg)",
    }}>{children}</h1>
  );
}

function Lede({ children }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: "Inter, system-ui",
      fontSize: 15,
      lineHeight: 1.55,
      color: "var(--fg-muted)",
      letterSpacing: "-0.005em",
      textWrap: "pretty",
    }}>{children}</p>
  );
}

// ── Primary CTA — copy of landing's, locally scoped ─────────────
function ObPrimaryCTA({ onClick, children, fullWidth = true, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      all: "unset", cursor: disabled ? "not-allowed" : "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
      background: disabled ? "var(--surface-2)" : "var(--signal)",
      color: disabled ? "var(--fg-subtle)" : "var(--fg-on-accent)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      boxShadow: disabled ? "none" : "0 12px 32px -12px var(--signal)",
      opacity: disabled ? 0.7 : 1,
    }}>{children}</button>
  );
}

// ── STEP 1 · Founder note ───────────────────────────────────────
// The voice here is intentionally OUTSIDE the snarky app voice.
// Hugh — the creator — speaks plainly. Could later anchor an "About" page.
function FounderNote({ dense = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 16 : 20 }}>
      <Eyebrow>A note from the maker</Eyebrow>

      <StepHeading dense={dense}>
        Hey — thanks for trying this thing.
      </StepHeading>

      <div style={{
        display: "flex", flexDirection: "column", gap: 14,
        fontFamily: "Inter, system-ui",
        fontSize: 15.5, lineHeight: 1.6,
        color: "var(--fg)", letterSpacing: "-0.005em",
        textWrap: "pretty",
      }}>
        <p style={{ margin: 0 }}>
          I'm Hugh. I go to a lot of shows. Concert Crawl is the tool I always
          wanted: an honest place to see what's playing, what it costs, and
          whether it's worth the trip.
        </p>
        <p style={{ margin: 0 }}>
          This is a private beta. Lots of edges are still rough. Some screens
          are empty because the data isn't there yet. Some prices are missing
          because we couldn't pull a real one — and we'd rather say that
          than make one up.
        </p>
        <p style={{ margin: 0, color: "var(--fg-muted)" }}>
          You're here early on purpose. Tell me what works, what's confusing,
          what's missing. I'll read all of it. The product will change because
          of it.
        </p>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        paddingTop: 4,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: "var(--accent)",
          color: "var(--fg-on-accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 13,
          letterSpacing: "-0.01em",
        }}>H</div>
        <div style={{
          fontFamily: "Caveat, 'Inter', system-ui",
          fontSize: 24, fontWeight: 600,
          color: "var(--fg)",
          lineHeight: 1,
        }}>— Hugh</div>
      </div>
    </div>
  );
}

// ── STEP 2 · How it works ───────────────────────────────────────
// Three short rows. Each row = a verb (find / price / verify) + body.
// Plain language. No marketing copy.
function HowItWorks({ dense = false }) {
  const rows = [
    {
      kicker: "01",
      title: "We crawl, we don't sell.",
      body: "Concert Crawl reads public listings from venues and ticketers. We don't sell tickets and we don't take a cut. Tap a price, you go to the source.",
    },
    {
      kicker: "02",
      title: "Prices come from somewhere — we'll tell you where.",
      body: "Every price has a tag. BOX OFFICE means a fan bought a ticket directly from the venue — that's the gold standard. COMMUNITY means a fan reported what they saw. RESALE means a marketplace listing. If we can't find a price, we'll say so instead of making one up.",
    },
    {
      kicker: "03",
      title: "Verifications expire.",
      body: "A community price is more trustworthy after another fan confirms it — but even verified prices go stale after a week. We'll show you when something is old.",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 18 : 22 }}>
      <Eyebrow>How this works</Eyebrow>

      <StepHeading dense={dense}>
        Honest by design.
      </StepHeading>

      <Lede>
        Two minutes on what to expect from the prices, the listings, and what
        we'll never do.
      </Lede>

      <div style={{
        display: "flex", flexDirection: "column",
        gap: 0,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}>
        {rows.map((r, i) => (
          <div key={r.kicker} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 14,
            padding: "16px 16px",
            borderTop: i === 0 ? "none" : "1px solid var(--border)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "var(--surface-3)",
              border: "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700,
              color: "var(--signal)",
              letterSpacing: "0.04em",
            }}>{r.kicker}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div style={{
                fontFamily: "Inter, system-ui",
                fontSize: 15, fontWeight: 700,
                color: "var(--fg)",
                letterSpacing: "-0.01em",
              }}>{r.title}</div>
              <div style={{
                fontFamily: "Inter, system-ui",
                fontSize: 13.5, lineHeight: 1.5,
                color: "var(--fg-muted)",
                letterSpacing: "-0.005em",
              }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── (Optional) STEP · What it does today ────────────────────────
function WhatItDoesToday({ dense = false }) {
  const items = [
    "Browse upcoming shows in the Denver area",
    "See real prices side-by-side, with their sources",
    "Watch shows you're curious about (saved locally for now)",
    "Submit a price you saw — or report what you paid at the box office",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 16 : 20 }}>
      <Eyebrow>Today</Eyebrow>
      <StepHeading dense={dense}>What you can do right now.</StepHeading>
      <Lede>
        We're starting small. Denver is the pilot. Here's what's actually in
        front of you on day one:
      </Lede>
      <ul style={{
        margin: 0, padding: 0, listStyle: "none",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {items.map((t, i) => (
          <li key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 14px",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}>
            <span style={{
              width: 18, height: 18, flexShrink: 0,
              borderRadius: 9,
              background: "var(--signal)",
              color: "var(--fg-on-accent)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              <svg width="10" height="10" viewBox="0 0 16 16">
                <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
            <span style={{
              fontFamily: "Inter, system-ui", fontSize: 14.5,
              color: "var(--fg)", lineHeight: 1.45,
              letterSpacing: "-0.005em",
            }}>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── (Optional) STEP · What it doesn't (yet) ─────────────────────
function WhatItDoesntYet({ dense = false }) {
  const items = [
    { t: "Notifications.",        b: "No push, no email alerts yet. We'll add them after we earn the right to interrupt you." },
    { t: "Cities outside Denver.", b: "The crawl is regional for now. Other metros come once the system is solid." },
    { t: "Accounts that follow you across devices.", b: "Watching is local-only this beta. Sign-in keeps your invite, not your list — yet." },
    { t: "Buying tickets.",        b: "We'll never sell. We point you at the source and stay out of the transaction." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 16 : 20 }}>
      <Eyebrow tone="accent">Not yet</Eyebrow>
      <StepHeading dense={dense}>What's missing — on purpose.</StepHeading>
      <Lede>
        Better to be straight with you than to ship something that pretends.
        Things on this list are coming, not abandoned.
      </Lede>
      <ul style={{
        margin: 0, padding: 0, listStyle: "none",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {items.map((it, i) => (
          <li key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 12,
            padding: "12px 14px",
            background: "var(--surface-1)",
            border: "1px dashed var(--border-strong)",
            borderRadius: 10,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700,
              color: "var(--accent)", letterSpacing: "0.10em",
              textTransform: "uppercase",
              padding: "3px 7px", borderRadius: 999,
              background: "rgba(255,123,212,0.10)",
              alignSelf: "start",
            }}>soon</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{
                fontFamily: "Inter, system-ui", fontSize: 14.5, fontWeight: 700,
                color: "var(--fg)", letterSpacing: "-0.005em",
              }}>{it.t}</div>
              <div style={{
                fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.5,
                color: "var(--fg-muted)", letterSpacing: "-0.005em",
              }}>{it.b}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── (Tweakable preview) STEP · Future preference capture ────────
// Not active. Shown so the user can preview a future onboarding state and
// the genre-UI tweak has somewhere to live. Toggle: chips / tiles / search.
function FuturePref({ dense = false, ui = "chips" }) {
  const genres = [
    "indie rock", "post-punk", "shoegaze", "americana",
    "electronic", "house", "techno", "ambient",
    "jazz", "soul", "funk", "hip-hop",
    "metal", "hardcore", "experimental", "folk",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 16 : 20 }}>
      <Eyebrow tone="accent">Preview · not active in beta</Eyebrow>
      <StepHeading dense={dense}>One day, we'll ask what you're into.</StepHeading>
      <Lede>
        We're not capturing taste preferences in this beta — Browse stays
        useful without them. Here's a sketch of where it might land later.
      </Lede>

      <div style={{
        position: "relative",
        padding: "14px 14px 18px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        opacity: 0.95,
      }}>
        {/* Faint disabled overlay */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>preview</div>

        {ui === "chips" && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            paddingTop: 6,
          }}>
            {genres.map((g, i) => (
              <span key={g} style={{
                fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 600,
                padding: "8px 12px", borderRadius: 999,
                background: i % 4 === 0 ? "var(--signal)" : "var(--surface-2)",
                color: i % 4 === 0 ? "var(--fg-on-accent)" : "var(--fg)",
                border: i % 4 === 0 ? "1px solid var(--signal)" : "1px solid var(--border-strong)",
                letterSpacing: "-0.005em",
                opacity: 0.9,
              }}>{g}</span>
            ))}
          </div>
        )}

        {ui === "tiles" && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8,
            paddingTop: 6,
          }}>
            {genres.slice(0, 8).map((g, i) => (
              <div key={g} style={{
                aspectRatio: "16/9",
                borderRadius: 10,
                background: `linear-gradient(135deg, var(--surface-2), var(--surface-3))`,
                border: i === 0 ? "1.5px solid var(--signal)" : "1px solid var(--border-strong)",
                position: "relative", overflow: "hidden",
                display: "flex", alignItems: "flex-end",
                padding: 10,
              }}>
                {/* riso-ish stripes */}
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.18,
                  backgroundImage: `repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 8px)`,
                }} />
                <span style={{
                  position: "relative",
                  fontFamily: "Inter, system-ui",
                  fontSize: 13, fontWeight: 800,
                  color: "var(--fg)",
                  letterSpacing: "-0.01em",
                }}>{g}</span>
              </div>
            ))}
          </div>
        )}

        {ui === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: 10,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" style={{ color: "var(--fg-muted)" }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{
                fontFamily: "Inter, system-ui", fontSize: 14,
                color: "var(--fg-muted)",
              }}>Search artists, venues, or genres…</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { kind: "genre",  label: "shoegaze" },
                { kind: "artist", label: "Geese" },
                { kind: "venue",  label: "Mission Ballroom" },
              ].map(s => (
                <div key={s.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: 700,
                    padding: "2px 6px", borderRadius: 4,
                    background: "var(--surface-3)",
                    color: "var(--fg-muted)",
                    letterSpacing: "0.10em", textTransform: "uppercase",
                  }}>{s.kind}</span>
                  <span style={{
                    fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 600,
                    color: "var(--fg)",
                  }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP · You're in (final) ────────────────────────────────────
function YoureIn({ dense = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 18 : 22 }}>
      <Eyebrow tone="accent">You're in</Eyebrow>

      <StepHeading dense={dense}>
        One last thing.<br/>
        <span style={{ color: "var(--accent)" }}>You'll be shaping the app.</span>
      </StepHeading>

      <Lede>
        You're not just here to use the thing — you're here to make it better.
        When something changes, we'll ask what you think. When something breaks,
        we want to know.
      </Lede>
      <Lede>
        The Give Feedback button lives in your menu — always there, never
        buried. Tap it and you'll see a quick category picker and a free-form
        message field. Thirty seconds. I read every one.
      </Lede>

      <div style={{
        padding: "14px 14px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--fg-muted)", letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3,
            background: "var(--signal)",
            boxShadow: "0 0 8px var(--signal)",
          }} />
          Beta channel · always open
        </div>
        <div style={{
          fontFamily: "Inter, system-ui", fontSize: 14, lineHeight: 1.5,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>
          Tap "Give Feedback" in your menu. You'll see a quick category picker
          and a free-form message field — thirty seconds, straight to me.
        </div>
      </div>

      {/* Personal ask · community pricing.
          Sits between the channel card and the CTA. Visually quieter than the
          channel card (no card chrome — just a hairline top rule) so the
          primary CTA still owns the bottom of the step. Voice matches step 1's
          Hugh-first-person — this is the founder closing the loop with one
          direct ask before sign-in. */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        paddingTop: dense ? 14 : 16,
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--accent)", letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}>
          One ask, from me
        </div>
        <p style={{
          margin: 0,
          fontFamily: "Inter, system-ui",
          fontSize: 14.5, lineHeight: 1.55,
          color: "var(--fg)",
          letterSpacing: "-0.005em",
          textWrap: "pretty",
        }}>
          Most shows won't have a price listed yet — that's the part you can
          fix. When you buy a ticket, take ten seconds to report what you paid.
          Two fans confirming a number is all it takes to make a price real
          for everyone else.
        </p>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingTop: 2,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            background: "var(--accent)",
            color: "var(--fg-on-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 10,
            letterSpacing: "-0.01em",
          }}>H</div>
          <div style={{
            fontFamily: "Caveat, 'Inter', system-ui",
            fontSize: 18, fontWeight: 600,
            color: "var(--fg-muted)",
            lineHeight: 1,
          }}>— Hugh</div>
        </div>
      </div>
    </div>
  );
}

// ── Step renderer ───────────────────────────────────────────────
function ObStep({ stepKey, dense, genreUi }) {
  if (stepKey === "welcome") return <FounderNote dense={dense} />;
  if (stepKey === "how")     return <HowItWorks dense={dense} />;
  if (stepKey === "today")   return <WhatItDoesToday dense={dense} />;
  if (stepKey === "notyet")  return <WhatItDoesntYet dense={dense} />;
  if (stepKey === "preview") return <FuturePref dense={dense} ui={genreUi} />;
  if (stepKey === "done")    return <YoureIn dense={dense} />;
  return null;
}

// ── Footer / nav row inside the body ────────────────────────────
function StepNav({ index, total, onBack, onNext, isLast, dense }) {
  const ctaCopy = isLast ? "Continue to sign-in →" : "Next →";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: dense ? 22 : 26 }}>
      <ObPrimaryCTA fullWidth onClick={onNext}>{ctaCopy}</ObPrimaryCTA>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 4,
      }}>
        <button onClick={onBack} disabled={index === 0} style={{
          all: "unset",
          cursor: index === 0 ? "default" : "pointer",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: "0.10em",
          textTransform: "uppercase", fontWeight: 700,
          color: index === 0 ? "var(--fg-subtle)" : "var(--fg-muted)",
          opacity: index === 0 ? 0.4 : 1,
        }}>← Back</button>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", fontWeight: 700,
          color: "var(--fg-subtle)",
        }}>Step {index + 1} of {total}</span>
      </div>
    </div>
  );
}

// ── Inner shell — exposes Header / Body / Nav slots ─────────────
// Splitting into slots lets wrapper layouts pin the CTA to the bottom
// and let the body scroll independently.
function useOnboardingShell({
  flow,
  index,
  setIndex,
  genreUi = "chips",
  onComplete = () => {},
  dense = false,
}) {
  const total = flow.length;
  const stepKey = flow[index];
  const isLast = index === total - 1;

  const next = () => {
    if (isLast) onComplete();
    else setIndex(Math.min(index + 1, total - 1));
  };
  const back = () => setIndex(Math.max(index - 1, 0));

  const Header = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10,
    }}>
      <ProgressDots total={total} index={index} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: "0.14em",
        textTransform: "uppercase", fontWeight: 700,
        color: "var(--fg-subtle)",
      }}>{OB_STEPS[stepKey]?.short}</span>
    </div>
  );

  const Body = <ObStep stepKey={stepKey} dense={dense} genreUi={genreUi} />;

  const Nav = (
    <StepNav
      index={index} total={total}
      onBack={back} onNext={next}
      isLast={isLast} dense={dense}
    />
  );

  return { Header, Body, Nav, stepKey };
}

// ============================================================
// MOBILE  (393×852)
// ============================================================
function OnboardingMobile({
  theme = "electric",
  initialStep = 0,
  flow = ["welcome", "how", "done"],
  genreUi = "chips",
  onComplete = () => {},
}) {
  const [index, setIndex] = React.useState(initialStep);
  React.useEffect(() => { setIndex(initialStep); }, [initialStep, flow.join("|")]);

  const { Header, Body, Nav, stepKey } = useOnboardingShell({
    flow, index, setIndex, genreUi, onComplete, dense: true,
  });

  return (
    <div data-screen-label={`Onboarding · mobile · ${OB_STEPS[stepKey]?.short || stepKey}`} style={{
      ...ccTokenVarsOB(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Top chrome — wordmark + Private Beta pill */}
      <div style={{
        flexShrink: 0,
        padding: "18px 20px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {CCClusterMarkOB && <CCClusterMarkOB size={22} color="var(--signal)" glow="var(--accent)" />}
          {CCWordmarkOB && <CCWordmarkOB size={16} />}
        </div>
        {BetaPillOB && <BetaPillOB />}
      </div>

      {/* Progress strip */}
      <div style={{ flexShrink: 0, padding: "4px 22px 8px" }}>{Header}</div>

      {/* Scrollable body — centers vertically when shorter than viewport */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: "auto",
        padding: "10px 22px 8px",
      }}>
        <div style={{
          minHeight: "100%",
          display: "flex", flexDirection: "column",
          justifyContent: "safe center",
        }}>
          {Body}
        </div>
      </div>

      {/* Bottom-pinned nav */}
      <div style={{
        flexShrink: 0,
        padding: "12px 22px 22px",
      }}>{Nav}</div>
    </div>
  );
}

// ============================================================
// DESKTOP  (≥1240px)
// Centered card on dim bg, mirrors code-entry desktop chrome.
// ============================================================
function OnboardingDesktop({
  theme = "electric",
  initialStep = 0,
  flow = ["welcome", "how", "done"],
  genreUi = "chips",
  onComplete = () => {},
}) {
  const [index, setIndex] = React.useState(initialStep);
  React.useEffect(() => { setIndex(initialStep); }, [initialStep, flow.join("|")]);

  const { Header, Body, Nav, stepKey } = useOnboardingShell({
    flow, index, setIndex, genreUi, onComplete, dense: true,
  });

  const wide = stepKey === "welcome" || stepKey === "today" || stepKey === "notyet" || stepKey === "preview";

  return (
    <div data-screen-label={`Onboarding · desktop · ${OB_STEPS[stepKey]?.short || stepKey}`} style={{
      ...ccTokenVarsOB(theme),
      width: "100%", minHeight: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -90, right: -90, width: 380, height: 380,
        opacity: 0.07, pointerEvents: "none",
        transform: "rotate(-12deg)",
      }}>
        {CCClusterMarkOB && <CCClusterMarkOB size={380} color="var(--accent)" glow="var(--signal)" />}
      </div>

      <header style={{
        flexShrink: 0, position: "relative", zIndex: 1,
        padding: "22px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: "0.14em",
          textTransform: "uppercase", fontWeight: 700,
          color: "var(--fg-subtle)",
        }}>Code accepted · welcome</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {CCClusterMarkOB && <CCClusterMarkOB size={28} color="var(--signal)" glow="var(--accent)" />}
          {CCWordmarkOB && <CCWordmarkOB size={20} />}
        </div>
        {BetaPillOB && <BetaPillOB />}
      </header>

      <main style={{
        flex: 1, minHeight: 0, position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "8px 32px 36px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: wide ? 620 : 520,
          height: 640,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ flexShrink: 0, padding: "22px 32px 10px" }}>{Header}</div>

          <div style={{
            flex: 1, minHeight: 0,
            overflowY: "auto",
            padding: "8px 32px 12px",
          }}>
            <div style={{
              minHeight: "100%",
              display: "flex", flexDirection: "column",
              justifyContent: "safe center",
            }}>
              {Body}
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            padding: "14px 32px 22px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>{Nav}</div>
        </div>
      </main>
    </div>
  );
}

// ── Exports ─────────────────────────────────────────────────────
Object.assign(window, {
  OnboardingMobile,
  OnboardingDesktop,
  useOnboardingShell,
  FounderNote,
  HowItWorks,
  WhatItDoesToday,
  WhatItDoesntYet,
  FuturePref,
  YoureIn,
  ProgressDots,
  OB_STEPS,
  OB_FLOWS,
  ob_resolveFlow,
});
