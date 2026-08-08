// nf-desktop.jsx — desktop parity. Mobile and desktop ship together (brief
// constraint), so every surface that gained a follow affordance has a desktop
// counterpart here. Chrome matched to the live settings shell in
// uploads/pasted-1785953338167-0.png and to browse-desktop.jsx.

const { NFArt, Mono, NFPrimary, NFGhost, NFFollow, FollowingTag, MetaChip, SpotifySlot,
  GlyphCheck, GlyphPlus, GlyphBell, GlyphEye, GlyphSearch, GlyphChevron, GlyphLock,
  CCMark, NFWordmark, NFToggle, SettingRow, FollowFilterChip, NF_ARTISTS, NF_EVENTS } = window;

// ── Desktop chrome ─────────────────────────────────────────────
function DeskShell({ children, trailing = "BACK TO BROWSE" }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 60, flexShrink: 0, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><CCMark size={26}/><NFWordmark/></div>
        <Mono size={10.5} color="var(--fg-muted)" ls="0.14em">← {trailing}</Mono>
      </div>
      {children}
    </div>
  );
}

function SettingsSidebar({ active = "Notifications" }) {
  const rows = ["Profile", "Plan", "Submitted prices", "Appearance", "Notifications", "Connections", "Account"];
  return (
    <div style={{ width: 250, flexShrink: 0, borderRight: "1px solid var(--border)", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 42, border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 800, fontSize: 17 }}>H</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>@hugh</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.06em", marginTop: 3 }}>DENVER · JOINED JUN 2026</div>
        </div>
      </div>
      {rows.map(r => (
        <div key={r} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10,
          background: r === active ? "var(--surface-2)" : "transparent",
          color: r === active ? "var(--fg)" : "var(--fg-subtle)", fontSize: 14.5, fontWeight: r === active ? 700 : 600, letterSpacing: "-0.01em" }}>
          {r === "Notifications" && <GlyphBell size={15}/>}{r !== "Notifications" && <div style={{ width: 15 }}/>}{r}
        </div>
      ))}
    </div>
  );
}

// ── Settings ▸ Notifications · desktop ─────────────────────────
function NotificationSettingsDesktop({ tier = "premium", source = "native", autoWatch = false }) {
  const locked = window.nfLocked(tier);
  return (
    <DeskShell>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <SettingsSidebar/>
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "30px 0" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 30px", display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>Notifications</h1>
            <SettingRow title="Push notifications" body="On for your account" on/>
            <div style={{ padding: 18, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ fontSize: 14, color: "var(--fg-muted)" }}>Notifications are on for your account, but not for this device yet.</div>
              <NFPrimary full={false} style={{ alignSelf: "flex-start" }}>Enable on this device</NFPrimary>
            </div>
            <div style={{ paddingTop: 12 }}><Mono size={10}>Artists you follow</Mono></div>
            <div style={{ borderRadius: 12, background: "var(--surface-1)", border: `1px solid ${locked ? "var(--border-strong)" : "var(--border)"}`, overflow: "hidden" }}>
              {locked ? (
                <div style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ color: "var(--signal)" }}><GlyphLock size={17}/></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>New show alerts</div>
                    <div style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 4 }}>Following artists is part of Premium. Upgrade and these switch on.</div>
                  </div>
                  <NFGhost full={false} dense>See Premium</NFGhost>
                </div>
              ) : (
                <>
                  <div style={{ padding: "17px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>New show alerts</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 4, color: "var(--signal)", border: "1px solid var(--signal)" }}>NEW</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 4 }}>An artist you follow books a Denver date. Sent when we find it, not on a schedule.</div>
                    </div>
                    <NFToggle on/>
                  </div>
                  <div style={{ padding: "15px 18px 15px 38px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>Add them to Watching for me</div>
                      <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 3 }}>Off means you get the ping and decide yourself.</div>
                    </div>
                    <NFToggle on={autoWatch}/>
                  </div>
                </>
              )}
            </div>
            <SettingRow title="Weekly digest" body="One email Friday morning with everything your artists have coming up." on isNew/>
            <div style={{ paddingTop: 12 }}><Mono size={10}>Shows you're watching</Mono></div>
            <SettingRow title="Watch updates" body="Price drops, sell-outs, date changes, cancellations. For shows you're watching." on/>
            <SettingRow title="Price drops" body="A separate ping the moment a watched show gets cheaper." on/>
            {source === "spotify" && (
              <div style={{ marginTop: 8, padding: "15px 16px", borderRadius: 10, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 11 }}>
                <SpotifySlot size={14}/>
                <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>These cover artists from Spotify too. One set of switches, whatever filled the list.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DeskShell>
  );
}

// ── Browse · desktop, with the shelf + filter ──────────────────
function BrowseDesktop({ mode = "zero", tier = "premium" }) {
  const filtered = mode === "filtered";
  const rows = filtered ? NF_EVENTS.filter(e => e.followed) : NF_EVENTS;
  const shelf = mode === "zero" ? NF_ARTISTS.slice(0, 6) : NF_ARTISTS.slice(1, 7);
  return (
    <DeskShell trailing="SEARCH">
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 30px 40px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <FollowFilterChip state={mode === "zero" ? "absent" : filtered ? "on" : (window.nfLocked(tier) ? "locked" : "off")} count={7}/>
            {["date", "venue", "price", "genre"].map(k => (
              <div key={k} style={{ minHeight: 34, display: "inline-flex", alignItems: "center", gap: 5, padding: "0 13px", borderRadius: 999,
                border: "1px solid var(--border)", color: "var(--fg-subtle)", fontSize: 12.5, fontWeight: 600 }}>{k}<GlyphChevron size={10} dir="down"/></div>
            ))}
          </div>
          <div style={{ padding: "18px 20px 20px", borderRadius: 14, background: "var(--surface-1)", border: "1px solid var(--border)", marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 15 }}>
              <div>
                <Mono size={10} color="var(--signal)">{mode === "zero" ? "Start here" : "Your artists · 7 followed"}</Mono>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", marginTop: 6 }}>
                  {mode === "zero" ? "Follow someone. Anyone." : "Coming to Denver"}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 5, maxWidth: 520, textWrap: "pretty" }}>
                  {mode === "zero"
                    ? "Follow an artist and we'll flag it the moment they announce a Denver date. These are already on the books."
                    : "Every artist you follow with a date on the calendar, soonest first."}
                </div>
              </div>
              <Mono size={9.5} color="var(--signal)" ls="0.12em">{mode === "zero" ? "BROWSE ALL ARTISTS →" : "MANAGE ARTISTS →"}</Mono>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {shelf.map(a => (
                <div key={a.name} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <div style={{ position: "relative", width: "100%", height: 118, borderRadius: 10, overflow: "hidden" }}>
                    <window.IdentityArt name={a.name} kind="artist" scale="tile" showInitials={false}/>
                    <window.ShelfFollowBadge state={mode === "zero" ? (window.nfLocked(tier) ? "locked" : "idle") : "following"}/>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: mode === "zero" ? "var(--fg-subtle)" : "var(--signal)", letterSpacing: "0.06em", marginTop: -4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.next || "no date yet"}</div>
                </div>
              ))}
            </div>
          </div>
          {filtered && (
            <div role="status" style={{ padding: "13px 16px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--signal)", marginBottom: 18, display: "flex", alignItems: "center", gap: 9 }}>
              <GlyphCheck size={13} c="var(--signal)" w={2.4}/>
              <span style={{ fontSize: 13.5, color: "var(--fg-muted)" }}><strong style={{ color: "var(--fg)", fontWeight: 700 }}>3 shows</strong> by artists you follow</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.025em" }}>Tonight</span>
            <Mono size={10}>Fri aug 21</Mono>
          </div>
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {rows.map((e, i) => (
              <div key={e.artist} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <NFArt name={e.artist} size={58} radius={8}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>{e.artist}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em", marginTop: 4 }}>{e.meta}</div>
                </div>
                {mode !== "zero" && e.followed && <FollowingTag/>}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "var(--fg-muted)", width: 54, textAlign: "right" }}>{e.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DeskShell>
  );
}

// ── My shows ▸ Artists · desktop ───────────────────────────────
function MyShowsArtistsDesktop({ source = "native", empty = false }) {
  const upcoming = NF_ARTISTS.filter(a => a.next);
  const quiet = NF_ARTISTS.filter(a => !a.next);
  return (
    <DeskShell>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "28px 30px 40px" }}>
          <h1 style={{ margin: "0 0 18px", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>My shows</h1>
          <div style={{ display: "flex", gap: 26, borderBottom: "1px solid var(--border)", marginBottom: 22 }}>
            {["Watching", "Artists", "History"].map((t, i) => (
              <div key={t} style={{ padding: "0 2px 12px", marginBottom: -1, borderBottom: `2px solid ${i === 1 ? "var(--signal)" : "transparent"}`,
                display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 15.5, fontWeight: i === 1 ? 800 : 600, color: i === 1 ? "var(--fg)" : "var(--fg-subtle)", letterSpacing: "-0.015em" }}>{t}</span>
                {i === 1 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--fg-subtle)" }}>{empty ? 0 : upcoming.length + quiet.length}</span>}
              </div>
            ))}
          </div>
          {empty ? (
            <div style={{ padding: "70px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 }}>
              <div style={{ width: 60, height: 60, borderRadius: 15, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-subtle)", marginBottom: 20 }}><GlyphPlus size={22} w={1.8}/></div>
              <Mono size={10.5} color="var(--accent)" ls="0.18em">No one yet</Mono>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", marginTop: 12 }}>Nobody on your list.</div>
              <div style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 10, maxWidth: 430, textWrap: "pretty" }}>
                Follow an artist and we'll tell you the moment they book a Denver date. Even the ones who only come through once a year.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <NFPrimary full={false}>Find artists to follow</NFPrimary>
                <NFGhost full={false}>Follow from a show you're watching</NFGhost>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Mono size={10}>{upcoming.length} playing denver</Mono>
                <div style={{ display: "flex", gap: 9 }}>
                  <NFGhost full={false} dense><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><GlyphBell size={13}/>Alerts</span></NFGhost>
                  <NFPrimary full={false} dense><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><GlyphSearch size={13}/>Find artists to follow</span></NFPrimary>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {upcoming.map(a => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                    <NFArt name={a.name} size={52} radius={8}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--signal)", letterSpacing: "0.06em", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.next}</div>
                      {source === "spotify" && a.name === "The Beths" && <div style={{ marginTop: 4 }}><window.SourceMark source="spotify"/></div>}
                    </div>
                    <NFFollow state="following" size="sm" iconOnly/>
                  </div>
                ))}
              </div>
              <div style={{ margin: "26px 0 12px" }}><Mono size={10}>Nothing on the books · {quiet.length}</Mono></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {quiet.map(a => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                    <NFArt name={a.name} size={52} radius={8}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                      <div style={{ marginTop: 4 }}><window.NoDatesLine/></div>
                    </div>
                    <NFFollow state="following" size="sm" iconOnly/>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DeskShell>
  );
}

// ── Onboarding follow step · desktop ───────────────────────────
function FollowStepDesktop({ selected = ["Amyl and The Sniffers", "Wednesday", "The Beths", "Mannequin Pussy"] }) {
  const { ArtistPick, NFDots } = window;  // 8-step flow: follow is steps 6–7
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", alignItems: "center", justifyContent: "center", padding: 30, overflow: "hidden" }}>
      <div style={{ width: 760, maxHeight: "100%", borderRadius: 18, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 26px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <NFDots total={6} index={4}/>
          <Mono size={10.5} color="var(--fg-subtle)" ls="0.12em">Skip</Mono>
        </div>
        <div style={{ padding: "20px 26px 14px" }}>
          <Mono size={10} color="var(--signal)">Step 5 of 6 · playing denver</Mono>
          <h1 style={{ margin: "9px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>Know any of these?</h1>
          <p style={{ margin: "9px 0 0", fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 560, textWrap: "pretty" }}>
            Punk, indie rock and shoegaze acts with Denver dates on the books. Tap to add. Pick as many as you like.
          </p>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 26px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
            {NF_ARTISTS.map(a => <ArtistPick key={a.name} artist={a} selected={selected.includes(a.name)}/>)}
          </div>
        </div>
        <div style={{ padding: "16px 26px 22px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-subtle)" }}>{selected.length} selected · unfollow any of them any time.</div>
          <NFPrimary full={false}>Follow {selected.length} artists →</NFPrimary>
        </div>
      </div>
    </div>
  );
}


// ── Artist search results · desktop ────────────────────────────
// Two-column detail layout, matching the shipped desktop detail pages: the
// result list is the wide column, the "what following does" rail is the
// narrow one. The rail is why this isn't just the mobile list stretched —
// at 1080px the mobile footnote would be a lonely sentence under a short
// list, and the explanation is what makes a zero-follow user act.
function ArtistSearchDesktop({ tier = "premium", query = "amyl" }) {
  const locked = window.nfLocked(tier);
  const rows = [
    { ...NF_ARTISTS[1], state: "idle" },
    { ...NF_ARTISTS[3], state: "following" },
    { ...NF_ARTISTS[9], state: "idle" },
  ];
  return (
    <DeskShell trailing="SEARCH">
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 30px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 16px", borderRadius: 12,
            background: "var(--surface-1)", border: "1px solid var(--border-strong)", marginBottom: 24, maxWidth: 560 }}>
            <span style={{ color: "var(--fg-subtle)" }}><GlyphSearch size={16}/></span>
            <span style={{ fontSize: 16, color: "var(--fg)", fontWeight: 600 }}>{query}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 30, alignItems: "start" }}>
            <div>
              <div style={{ marginBottom: 10 }}><Mono size={10}>Artists · 3</Mono></div>
              <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {rows.map((a, i) => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <NFArt name={a.name} size={58} radius={8}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>{a.name}</div>
                      <div style={{ marginTop: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
                        {a.next || <window.NoDatesLine/>}
                      </div>
                    </div>
                    <NFFollow state={locked && a.state === "idle" ? "locked" : a.state} size="md"/>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 26, marginBottom: 10 }}><Mono size={10}>Shows · 1</Mono></div>
              <div style={{ borderRadius: 12, border: "1px solid var(--border)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 16 }}>
                <NFArt name="Gothic Theatre" size={58} radius={8}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>Amyl and The Sniffers</div>
                  <div style={{ marginTop: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>Sat Aug 29 · Gothic Theatre</div>
                </div>
                <GlyphChevron size={16}/>
              </div>
            </div>
            <div style={{ borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <Mono size={9.5} color="var(--signal)">What following does</Mono>
              <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>
                Follow an artist and we'll tell you the day they book a Denver date. No tour-wide noise, no email you didn't ask for.
              </div>
              <div style={{ height: 1, background: "var(--border)" }}/>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>
                <strong style={{ color: "var(--fg)", fontWeight: 700 }}>The Beths</strong> have nothing on the books, and they're still worth following. That's the case the feature exists for. Artists who have never played Denver aren't in the index at all.
              </div>
            </div>
          </div>
        </div>
      </div>
    </DeskShell>
  );
}

// ── Event detail bill block · desktop ──────────────────────────
// The shipped desktop detail page is two columns: content wide, actions
// railed right. The bill block belongs in the RAIL, directly under the Watch
// button, for the same reason it sits under it on mobile — watch the show,
// then follow the acts on it. Putting it in the wide column would separate
// the two decisions by 700px of poster and price history.
function BillFollowDesktop({ tier = "premium", allFollowed = false }) {
  const locked = window.nfLocked(tier);
  const bill = [
    { name: "Electric Callboy", role: "Headliner", state: "following" },
    { name: "Bad Omens", role: "Support", state: allFollowed ? "following" : "idle" },
    { name: "Loveless", role: "Support", state: allFollowed ? "following" : "idle" },
  ];
  const remaining = bill.filter(b => b.state === "idle").length;
  return (
    <DeskShell>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 30px 40px",
          display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 30, alignItems: "start" }}>
          <div>
            <div style={{ width: "100%", height: 300, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
              <window.IdentityArt name="Electric Callboy" kind="artist" scale="hero" showInitials={false}/>
            </div>
            <Mono size={10}>Sat aug 29 · 9:00 pm · gothic theatre</Mono>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.035em", color: "var(--fg)", marginTop: 9, lineHeight: 1.05 }}>Electric Callboy</div>
            <div style={{ fontSize: 15, color: "var(--fg-muted)", marginTop: 12, lineHeight: 1.55, maxWidth: 560, textWrap: "pretty" }}>
              With Bad Omens and Loveless. Doors 8:00 pm, 16+.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <Mono size={9.5}>From</Mono>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--fg)" }}>$32</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 10, background: "var(--signal)", color: "var(--fg-on-accent)", fontWeight: 800, fontSize: 15 }}>Get tickets</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 10, border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
                <GlyphEye size={15}/>Watch this show
              </div>
            </div>
            <div style={{ borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 16px" }}>
                <Mono size={9.5}>On the bill · 3</Mono>
                {remaining > 0 && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 34, padding: "0 12px", borderRadius: 8,
                    border: "1px solid var(--border-strong)", color: "var(--fg)", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
                    {locked ? <GlyphLock size={11}/> : <GlyphPlus size={11} w={2.4}/>}Follow all {remaining}
                  </div>
                )}
              </div>
              {bill.map(b => (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
                  <NFArt name={b.name} size={42} circle/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{b.role}</div>
                  </div>
                  <NFFollow state={locked && b.state === "idle" ? "locked" : b.state} size="sm" iconOnly/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DeskShell>
  );
}

// ── First-watch nudge · desktop ────────────────────────────────
// NOT a port of the mobile card. On mobile the nudge is a card injected into
// the browse feed, because the user lands back on browse after watching. On
// desktop they never leave — the watch happens on the detail page and the
// page stays put, so injecting a card into a feed they aren't looking at
// would fire the one-shot nudge at an empty room.
//
// So on desktop the nudge REPLACES the rail's watch card in place, right
// where the click just happened, with the artist already on screen beside it.
// Same single-fire rule, same dismiss, same variant-A ask. It's an inline
// state change, not an interruption — and it means desktop never needs the
// modal that a ported card would have become.
function FirstWatchNudgeDesktop({ tier = "premium" }) {
  const locked = window.nfLocked(tier);
  return (
    <DeskShell>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 30px 40px",
          display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 30, alignItems: "start" }}>
          <div>
            <div style={{ width: "100%", height: 300, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
              <window.IdentityArt name="Amyl and The Sniffers" kind="artist" scale="hero" showInitials={false}/>
            </div>
            <Mono size={10}>Sat aug 29 · 9:00 pm · gothic theatre</Mono>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.035em", color: "var(--fg)", marginTop: 9, lineHeight: 1.05 }}>Amyl and The Sniffers</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderRadius: 12, border: "1px solid var(--signal)", background: "var(--surface-1)", padding: 17, display: "flex", flexDirection: "column", gap: 13, position: "relative" }}>
              <div style={{ position: "absolute", top: 13, right: 14, fontSize: 18, color: "var(--fg-subtle)", cursor: "pointer", lineHeight: 1 }} aria-label="Dismiss">×</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--accent)" }}>
                <GlyphEye size={16}/>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>Watching this show</span>
              </div>
              <div style={{ height: 1, background: "var(--border)" }}/>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NFArt name="Amyl and The Sniffers" size={46} radius={9}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Mono size={9} color="var(--signal)">Nice pick</Mono>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.025em", marginTop: 4, lineHeight: 1.15 }}>Follow them too?</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>
                You'll hear about the next Denver date without checking. Denver only, no tour-wide spam.
              </div>
              <NFFollow state={locked ? "locked" : "idle"} size="full" full/>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--fg-subtle)", cursor: "pointer" }}>Not right now</div>
            </div>
            <div style={{ borderRadius: 12, border: "1px solid var(--border)", padding: 15, fontSize: 12.5, color: "var(--fg-subtle)", lineHeight: 1.5, textWrap: "pretty" }}>
              The rail's watch card is replaced in place, not covered. Dismissing restores it; the nudge never fires twice.
            </div>
          </div>
        </div>
      </div>
    </DeskShell>
  );
}

Object.assign(window, {
  DeskShell, SettingsSidebar, NotificationSettingsDesktop, BrowseDesktop,
  MyShowsArtistsDesktop, FollowStepDesktop,
  ArtistSearchDesktop, BillFollowDesktop, FirstWatchNudgeDesktop,
});
