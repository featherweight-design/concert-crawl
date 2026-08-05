// crew-invite.jsx — creation, the Premium gate, the invite link, and the
// signed-out landing (brief §3.6 / §3.7 / §3.9, deliverables 4 + 6).
//
// ── Calls the brief left open (§8) ────────────────────────────────────
// · Invite expiry = 7 DAYS, revocable at any time by any member.
//   Seven days is a group-chat's attention span: long enough that a link
//   dropped on a Friday still works next weekend, short enough that a
//   forwarded one dies before it reaches a stranger. The cap (12) is the real
//   backstop (§3.6); expiry just stops the link from having a long tail.
// · Both sides are told plainly. Creator side: a mono "Expires in 7 days" line
//   next to a "Retire this link" action and a spots-left count. Invitee side:
//   honest dead ends, never a generic error.
// · Roster management: ANY member can invite (the link is the mechanic and the
//   cap is the limit — gatekeeping invites inside an invite-only group of
//   twelve is ceremony). Any member can leave. Only the creator can remove
//   people, rename, or delete. A creator who wants out passes the crew on
//   first — voluntary, which is what §3.12 rejected an INVOLUNTARY version of.
//
// ── The privacy rule, drawn ───────────────────────────────────────────
// The signed-out landing shows crew IDENTITY and nothing else: patch, name,
// who invited you, headcount. No show, no date, no venue, no attendance. A
// forwarded link must not publish anyone's plans (§3.7).
//
// And one step further: an EXPIRED or REVOKED link shows no crew identity
// either — not the name, not the patch. A dead link has no standing to tell
// you anything, and a revoked one especially shouldn't confirm what it was
// pointing at. Those two states fall back to the Concert Crawl mark.
// (The at-cap state does keep identity: the link was live and legitimate,
// the crew is simply full.)
//
// Exports: CreateSheet, PremiumGate, InviteSheet, InviteLanding, DeadLink,
//          LeaveConfirm

const { CREW_COPY: CI } = window;

function SheetHead({ title, sub, eyebrow, tone = "signal" }) {
  return (
    <div style={{ padding: "6px 18px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
      {eyebrow && <RailHeader tone={tone} eyebrow={eyebrow}/>}
      <span style={{ fontFamily: CS_UI, fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.12, textWrap: "balance" }}>{title}</span>
      {sub && <span style={{ fontFamily: CS_UI, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{sub}</span>}
    </div>
  );
}

// ── Create ────────────────────────────────────────────────────────────
// The patch preview is LIVE and truthful: eng mints the crew id client-side
// before the insert, so what you see here is the patch you get. It does not
// react to the name — that's the point, and the helper line says so.
function CreateSheet({ variant = "mobile", crewId = "cr_c0de55", name = "Sunset Crew", typed = true, salt = 0 }) {
  const [s, setS] = React.useState(salt);
  const Body = (
    <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <MonoEyebrow size={9.5}>{CI.create.nameLabel}</MonoEyebrow>
        <div style={{
          minHeight: 48, borderRadius: 10, border: `1px solid ${typed ? "var(--border-focus)" : "var(--border-strong)"}`,
          background: "var(--surface-1)", display: "flex", alignItems: "center", padding: "0 14px",
          boxShadow: typed ? "0 0 0 3px color-mix(in oklch, var(--focus) 22%, transparent)" : "none",
        }}>
          <span style={{ fontFamily: CS_UI, fontWeight: 700, fontSize: 15.5, color: typed ? "var(--fg)" : "var(--fg-subtle)" }}>
            {typed ? name : CI.create.namePlace}
          </span>
          {typed && <span style={{ width: 1.5, height: 20, background: "var(--signal)", marginLeft: 2 }}/>}
        </div>
        <span style={{ fontFamily: CS_UI, fontSize: 11.5, color: "var(--fg-subtle)" }}>{CI.create.nameHelp}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <CrewPatch crewId={crewId} salt={s} size={64} scale="hero"/>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <MonoEyebrow size={9} color="var(--signal)">YOUR PATCH</MonoEyebrow>
          <span style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4, textWrap: "pretty" }}>{CI.create.rerollHelp}</span>
          <div><Btn tone="ghost" size="sm" onClick={() => setS(v => window.nextPatchSalt(crewId, v))}>
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M12 7a5 5 0 1 1-1.6-3.7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
              <path d="M12.4 1.6v3.2H9.2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {CI.create.reroll}
          </Btn></div>
        </div>
      </div>
      <Btn tone="primary" wide disabled={!typed}>{CI.create.submit}</Btn>
    </div>
  );
  if (variant === "desktop") {
    return <ModalChrome width={520} title="START A CREW"><div style={{ paddingTop: 8 }}><SheetHead title={CI.create.title} sub={CI.create.sub}/>{Body}</div></ModalChrome>;
  }
  return <SheetChrome title="START A CREW"><SheetHead title={CI.create.title} sub={CI.create.sub}/>{Body}</SheetChrome>;
}

// ── Premium gate — create only. Joining never hits this. ──────────────
function PremiumGate({ variant = "mobile", lapsed }) {
  const Body = (
    <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        {[["Join a crew", "Free, forever"], ["Start a crew", "Premium · $5/mo"]].map(([l, r], i) => (
          <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: i ? 9 : 0, borderTop: i ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontFamily: CS_UI, fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>{l}</span>
            <MonoEyebrow size={9.5} color={i ? "var(--signal)" : "var(--fg-muted)"}>{r}</MonoEyebrow>
          </div>
        ))}
      </div>
      {lapsed && (
        <div style={{ display: "flex", gap: 9, padding: "11px 13px", borderRadius: 10, background: "color-mix(in oklch, var(--warning) 9%, var(--surface-1))", border: "1px solid color-mix(in oklch, var(--warning) 28%, var(--border))" }}>
          <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--warning)", marginTop: 6, flexShrink: 0 }}/>
          <span style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{CI.gate.lapsed}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn tone="primary" wide>{CI.gate.cta}</Btn>
        <Btn tone="ghost">{CI.gate.later}</Btn>
      </div>
    </div>
  );
  const head = <SheetHead title={CI.gate.title} sub={CI.gate.body}/>;
  // No `eyebrow` here — SheetChrome/ModalChrome now supply the mono title row,
  // and R1's SheetHead eyebrow duplicated it. Same reason the other six drop it.
  if (variant === "desktop") return <ModalChrome width={520} title={CI.gate.eyebrow}><div style={{ paddingTop: 8 }}>{head}{Body}</div></ModalChrome>;
  return <SheetChrome title={CI.gate.eyebrow}>{head}{Body}</SheetChrome>;
}

// ── Invite link ───────────────────────────────────────────────────────
function LinkBox({ url, copied, dead }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 6px 0 13px",
      borderRadius: 10, background: "var(--surface-1)",
      border: `1px solid ${copied ? "var(--signal)" : "var(--border-strong)"}`,
      opacity: dead ? 0.5 : 1,
    }}>
      <span style={{
        flex: 1, minWidth: 0, fontFamily: CS_MONO, fontSize: 11.5, color: "var(--fg-muted)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        textDecoration: dead ? "line-through" : "none",
      }}>{url}</span>
      <Btn tone={copied ? "primary" : "ghost"} size="sm" disabled={dead}>{copied ? CI.invite.copied : CI.invite.copy}</Btn>
    </div>
  );
}
function InviteSheet({ variant = "mobile", crewId = "cr_7f3a91", copied, revoked, full }) {
  const crew = window.crewById(crewId);
  const left = CI.cap - crew.members.length;
  const Body = (
    <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <CrewPatch crewId={crew.id} size={48} scale="tile"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", color: "var(--fg)" }}>{crew.name}</span>
          <MonoEyebrow size={9.5} color={left <= 2 ? "var(--warning)" : "var(--fg-subtle)"}>
            {/* Always the count, never the sentence — the CrewEmpty below states
                "This crew's full." at title weight, and R1 said it twice, 84px
                apart. Same fix RosterList already carries. */}
            {full ? `${CI.cap} OF ${CI.cap} SPOTS` : `${left} OF ${CI.cap} SPOTS LEFT`}
          </MonoEyebrow>
        </div>
      </div>
      {full ? (
        // Not CrewEmpty — a roster at 12/12 is full, not empty, and the
        // EmptyState rail would have to invent a count about it.
        <window.CrewNotice eyebrow="ROSTER FULL" title={CI.empty.atCapTitle} body={CI.empty.atCapBody} cta={CI.list.create}/>
      ) : (
        <>
          <LinkBox url="concertcrawl.app/crew/join/8fq2-mkzt" copied={copied} dead={revoked}/>
          {revoked ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <MonoEyebrow size={9.5} color="var(--fg-subtle)">{CI.invite.revoked}</MonoEyebrow>
              <Btn tone="primary" size="sm">{CI.invite.newLink}</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <MonoEyebrow size={9.5} color="var(--fg-muted)">{CI.invite.expiry(7)}</MonoEyebrow>
                <span style={{ fontFamily: CS_UI, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.4, textWrap: "pretty" }}>{CI.invite.expiryHelp}</span>
              </div>
              <Btn tone="danger" size="sm">{CI.invite.revoke}</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
  const head = <SheetHead title={CI.invite.title} sub={CI.invite.sub(crew.name)}/>;
  if (variant === "desktop") return <ModalChrome width={540} title="INVITE PEOPLE"><div style={{ paddingTop: 8 }}>{head}{Body}</div></ModalChrome>;
  return <SheetChrome title="INVITE PEOPLE">{head}{Body}</SheetChrome>;
}

// ── New patch — creator-only, confirmed ────────────────────────────
// Confirmed, not instant, because it changes the crew's face for everyone — the
// same reason rename and delete are confirmed. Shows the current patch beside
// the candidate so the choice is a comparison, not a gamble.
function RerollSheet({ variant = "mobile", crewId = "cr_7f3a91", salt = 0 }) {
  const crew = window.crewById(crewId);
  // Same rule the board documents: the candidate shares at most one layer with
  // what the crew has now, so a pull always reads as a new patch.
  const [s, setS] = React.useState(() => window.nextPatchSalt(crewId, salt));
  const Body = (
    <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <CrewPatch crewId={crewId} salt={salt} size={76} scale="hero" style={{ opacity: 0.45 }}/>
          <MonoEyebrow size={9} color="var(--fg-subtle)">NOW</MonoEyebrow>
        </div>
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6h14m-4-4l4 4-4 4" stroke="var(--fg-subtle)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <CrewPatch crewId={crewId} salt={s} size={76} scale="hero"/>
          <MonoEyebrow size={9} color="var(--signal)">NEW</MonoEyebrow>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn tone="ghost" size="sm" onClick={() => setS(v => window.nextPatchSalt(crewId, v))} aria-label={CI.a11y.reroll}>
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M12 7a5 5 0 1 1-1.6-3.7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d="M12.4 1.6v3.2H9.2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Shuffle again
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn tone="primary" wide>{CI.roster.newPatchCta}</Btn>
        <Btn tone="ghost">{CI.roster.newPatchKeep}</Btn>
      </div>
    </div>
  );
  const head = <SheetHead title={CI.roster.newPatch} sub={CI.roster.newPatchBody}/>;
  if (variant === "desktop") return <ModalChrome width={480} title="NEW PATCH"><div style={{ paddingTop: 8 }}>{head}{Body}</div></ModalChrome>;
  return <SheetChrome title="NEW PATCH">{head}{Body}</SheetChrome>;
}

// ── Signed-out invite landing — identity only, never attendance ────────
// state: "ready" | "loading" | "error"
// This is the one surface a stranger hits cold, so its network states are not
// an edge case — a token gets validated before anything can render, and that
// call can be slow or fail. Two rules carry over from the ready state:
//   · loading NEVER shows a crew name or patch — both would be guesses, and the
//     patch flashing a wrong identity is worse than showing nothing;
//   · the error is OUR failure, stated as ours. It is not the expired/retired
//     dead end — those are DeadLink, and they're normal outcomes, not faults.
function InviteLanding({ crewId = "cr_7f3a91", inviter = "mvp_ross", wide, full, state = "ready", onRetry }) {
  const crew = window.crewById(crewId);
  const n = crew.members.length;
  const Shell = ({ children }) => (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: wide ? "40px 40px" : "70px 22px 40px", gap: wide ? 22 : 18, textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: wide ? 22 : 54, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <CMark size={22}/><Wordmark size={14}/>
      </div>
      {children}
    </div>
  );

  if (state === "loading") {
    return (
      <Shell>
        <window.ShimmerKeyframes/>
        <window.Shimmer w={wide ? 132 : 108} h={wide ? 132 : 108} r={30}/>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, alignItems: "center", width: "100%", maxWidth: wide ? 520 : 320 }}>
          <window.Shimmer w={110} h={10}/>
          <window.Shimmer w="88%" h={wide ? 30 : 24}/>
          <window.Shimmer w="62%" h={wide ? 30 : 24}/>
          <window.Shimmer w={150} h={26} r={99} style={{ marginTop: 4 }}/>
        </div>
        <window.Shimmer w={wide ? 340 : 280} h={46} r={10}/>
        <MonoEyebrow size={9.5} color="var(--fg-subtle)" aria-live="polite">{CI.net.loadingInvite}</MonoEyebrow>
      </Shell>
    );
  }
  if (state === "error") {
    return (
      <Shell>
        <div style={{ opacity: 0.5 }}><CMark size={76}/></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "center", maxWidth: 340 }}>
          <MonoEyebrow size={9.5} color="var(--warning)" letterSpacing="0.18em">CONNECTION</MonoEyebrow>
          <h1 style={{ margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 32 : 25, letterSpacing: "-0.035em", lineHeight: 1.1, textWrap: "balance" }}>{CI.net.errInviteTitle}</h1>
          <p style={{ margin: 0, fontFamily: CS_UI, fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{CI.net.errInviteBody}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn tone="primary" onClick={onRetry}>{CI.net.retry}</Btn>
          <Btn tone="ghost">{CI.linkDead.browse}</Btn>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <CrewPatch crewId={crew.id} size={wide ? 132 : 108} scale="hero"/>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", maxWidth: wide ? 520 : 320 }}>
        <MonoEyebrow size={9.5} color="var(--signal)" letterSpacing="0.18em">{CI.landing.eyebrow}</MonoEyebrow>
        <h1 style={{ margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 38 : 27, letterSpacing: "-0.035em", lineHeight: 1.08, textWrap: "balance" }}>
          {inviter ? CI.landing.title(inviter, crew.name) : CI.landing.titleNoName(crew.name)}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MemberCluster members={crew.members} size={wide ? 30 : 27} max={5} label={CI.list.memberCount(n)}/>
          <MonoEyebrow size={10} color="var(--fg-muted)">{CI.list.memberCount(n)}</MonoEyebrow>
        </div>
        <p style={{ margin: 0, fontFamily: CS_UI, fontSize: wide ? 15 : 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>
          {full ? CI.linkDead.fullBody : CI.landing.body(n)}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: wide ? 340 : "100%", maxWidth: 340 }}>
        {full
          ? <Btn tone="ghost" wide>{CI.linkDead.browse}</Btn>
          : <Btn tone="primary" wide>{CI.landing.cta(crew.name)}</Btn>}
        {!full && <span style={{ fontFamily: CS_UI, fontSize: 12.5, color: "var(--fg-subtle)" }}>{CI.landing.haveAccount}</span>}
      </div>
      {!full && (
        <div style={{
          display: "flex", gap: 9, alignItems: "flex-start", maxWidth: wide ? 430 : 330,
          padding: "11px 13px", borderRadius: 10, textAlign: "left",
          background: "var(--surface-1)", border: "1px solid var(--border)",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true">
            <rect x="2.5" y="6" width="9" height="6" rx="1.6" stroke="var(--fg-subtle)" strokeWidth="1.4" fill="none"/>
            <path d="M4.6 6V4.4a2.4 2.4 0 0 1 4.8 0V6" stroke="var(--fg-subtle)" strokeWidth="1.4" fill="none"/>
          </svg>
          <span style={{ fontFamily: CS_UI, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.45, textWrap: "pretty" }}>{CI.landing.privacy}</span>
        </div>
      )}
    </Shell>
  );
}

// ── Dead links — no crew identity at all ──────────────────────────────
function DeadLink({ kind = "expired", wide }) {
  const title = kind === "revoked" ? CI.linkDead.revokedTitle : CI.linkDead.expiredTitle;
  const body = kind === "revoked" ? CI.linkDead.revokedBody : CI.linkDead.expiredBody;
  return (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: CS_UI,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: wide ? 40 : "70px 22px 40px", gap: 18, textAlign: "center",
    }}>
      <div style={{ position: "relative", opacity: 0.5 }}>
        <CMark size={76}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "center", maxWidth: 340 }}>
        <MonoEyebrow size={9.5} color="var(--warning)" letterSpacing="0.18em">INVITE LINK</MonoEyebrow>
        <h1 style={{ margin: 0, fontFamily: CS_UI, fontWeight: 900, fontSize: wide ? 32 : 25, letterSpacing: "-0.035em", lineHeight: 1.1, textWrap: "balance" }}>{title}</h1>
        <p style={{ margin: 0, fontFamily: CS_UI, fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{body}</p>
      </div>
      <Btn tone="ghost">{CI.linkDead.browse}</Btn>
    </div>
  );
}

// ── Leave / remove / handoff — sober, no cheek ────────────────────────
function LeaveConfirm({ variant = "mobile", kind = "leave", crewId = "cr_7f3a91", handle = "deewhy" }) {
  const crew = window.crewById(crewId);
  const map = {
    leave:   { t: CI.confirm.leaveTitle(crew.name), b: CI.confirm.leaveBody,  c: CI.confirm.leaveCta },
    remove:  { t: CI.confirm.removeTitle(handle),   b: CI.confirm.removeBody, c: CI.confirm.removeCta },
    del:     { t: CI.confirm.deleteTitle(crew.name),b: CI.confirm.deleteBody, c: CI.confirm.deleteCta },
    handoff: { t: CI.confirm.handoffTitle,          b: CI.confirm.handoffBody,c: "Pick a keeper" },
    // Creator is the last member: a handoff sheet with an empty list would be a
    // dead end dressed as a choice, so this state doesn't offer one. It names
    // the only real outcome, and offers the way out of it (invite someone).
    last:    { t: CI.confirm.lastOneTitle(crew.name), b: CI.confirm.lastOneBody, c: CI.confirm.lastOneCta },
  }[kind];
  const others = crew.members.filter(m => !m.you);
  const Body = (
    <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {kind === "handoff" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {others.slice(0, 3).map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 52, borderTop: i ? "1px solid var(--border)" : "none" }}>
              <MemberDot member={m} size={30}/>
              <span style={{ flex: 1, fontFamily: CS_UI, fontWeight: 700, fontSize: 14, color: m.handle ? "var(--fg)" : "var(--fg-subtle)" }}>{m.handle || CI.roster.noHandle}</span>
              <span style={{ width: 19, height: 19, borderRadius: 19, border: "1.5px solid var(--border-strong)" }} aria-hidden="true"/>
            </div>
          ))}
        </div>
      )}
      {kind === "last" && (
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 13, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <CrewPatch crewId={crew.id} size={44} scale="tile"/>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 14, color: "var(--fg)", letterSpacing: "-0.02em" }}>{crew.name}</span>
            <MonoEyebrow size={9} color="var(--fg-subtle)">JUST YOU · {(window.CREW_NIGHTS[crew.id] || []).length} NIGHTS</MonoEyebrow>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn tone="danger" wide>{map.c}</Btn>
        <Btn tone={kind === "last" ? "primary" : "ghost"}>{kind === "last" ? CI.confirm.lastOneAlt : CI.confirm.never}</Btn>
      </div>
    </div>
  );
  const head = <SheetHead title={map.t} sub={map.b}/>;
  if (variant === "desktop") return <ModalChrome width={480} title={kind === "handoff" ? "PASS IT ON" : "HEADS UP"}><div style={{ paddingTop: 8 }}>{head}{Body}</div></ModalChrome>;
  return <SheetChrome title={kind === "handoff" ? "PASS IT ON" : "HEADS UP"}>{head}{Body}</SheetChrome>;
}

Object.assign(window, { SheetHead, CreateSheet, PremiumGate, InviteSheet, LinkBox, InviteLanding, DeadLink, LeaveConfirm, RerollSheet });
