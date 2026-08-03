# Claude Code handoff prompt — Event Detail CTA + CCTip (R2)

> Paste the code block below to Claude Code to kick off implementation.
> It points at this folder and locks the non-negotiable design constraints.

```
Context: Concert Crawl (private-beta concert-discovery app for Denver). We're
implementing the Event Detail commit block and the app-wide explainer tooltip.
Design is complete and lives as HTML/JSX prototypes in
design_handoff_event_detail_cta_tooltip/ — READ THAT FOLDER'S README.md FIRST,
then event-cta-v2.jsx, cc-overlay.jsx, cc-tip.jsx and watcher-roster.jsx.
These are design references (React-in-browser mocks), NOT production code —
reimplement them in our real app stack, matching layout, copy and behaviour.

Open "Event CTA + Tooltip v2.html". The R1 canvas in the same folder is
superseded for the CTA half; it's kept only for the tooltip variant gallery.

WHAT THIS REPLACES
- EventDetailCtaBlock + WatchZone merge into one CommitBlockV2. Today they're
  sibling blocks and the composition reads as three loose objects.
- InfoTooltip is RETIRED, not coexisted with. Port both live uses to CCTip
  (Event Detail becomes tip="going-vs-watch"; the other surface gets a new
  TIP_CONTENT key, not an inline string) and delete it in the same PR. Note
  role changes tooltip → dialog; that's intended, the content is interactive.
- The "see all N" inline expand is removed. The roster opens in an overlay.

THE COMPOSITION (Direction D — ship this one)
  Going              full-width, top
  Watch strip        one bordered object, two rows:
    row 1            the toggle — eye + hint. WHOLE ROW is the button.
    row 2            the crawl — avatars, names, roster trigger.
                     A SIBLING button. Never nest it inside the toggle.
Row 2 is absent unless two nameable people are in the crawl (see the ruling
below). Row 1's hint hides once you're
watching. Both facts are why the original screenshots looked like Going + a
stray eye — do not "simplify" by deleting either element.

Directions E and F are in the canvas for the record. Delete them; don't ship a
`direction` prop.

GOING — SEVEN STATES, and a delegation rule that matters
  default / going / past-yes / past-no  → DELEGATE to the shipped GoingButton,
    COPY INCLUDED. Do not re-author their labels. GOING_LABEL is read from
    going-cta.jsx precisely so `locked` can't drift from `default`.
  locked   Free / logged-out. Same size, position and label as unlocked;
           outlined not filled; lock mark; one honest line beneath with a
           `concert-history` tip. Tap opens the upgrade sheet.
           NEVER DISABLED — a disabled control can't sell anything.
  pending  Not a button. role="status" aria-live="polite". The watch strip
           stays live underneath.
  error    Names what survived: "We couldn't reach the server. Your watch is
           safe." Retry is the button itself, not a separate link.
Watching is FREE in every state, so the gate never touches the watch strip. A
Free user gets the whole free feature without meeting a wall first.

THE CRAWL (watcher-roster.jsx)
- The viewer is never seed data. WATCHERS is the OTHER people; wr_crowd()
  injects VIEWER only when watching, and wr_total() derives from that same
  list. One definition of membership — names, avatars and the count cannot
  disagree. Count reads 12 others / 13 once you watch; that difference is real.
- Row 2 hides unless the crawl has two nameable people, per wr_showCrawl(). That
  covers you being the only watcher ("All 1" beside your own avatar isn't social
  proof), a lone stranger, and an all-anonymous crowd.
- The name sentence is MEASURED, not guessed. Ladder, in order:
  3 names → 2 → 1 → drop the "in the crawl" suffix → 0 names → hide.
  Names outrank the suffix on purpose. The "All N" chip carries the count at
  every rung, so THE COUNT IS NEVER WHAT GETS CUT. Same ResizeObserver
  approach as EventRow's MetaRow in design_handoff_event_row_system/.
- At ≤360 the avatar stack is dropped and the trigger becomes a chevron.
  Measured: a 237px row minus stack (52) minus numeric chip (58) leaves 113px,
  less than one handle — no name could ever render. The roster shows every
  face; on the smallest screen the names win. Do not restore the stack at 320.
- Anonymous watchers are counted, never faked: the roster's last row reads
  "N more watching, no handle yet" with a dashed disc.

SHARED SHELL — do not fork it
cc-overlay.jsx owns positioning, arrow, header, close, scrim, grabber, focus
trap and Escape. CCTip = CCOverlay + TIP_CONTENT. WatcherRoster = CCOverlay +
a list. useOverlayTrigger holds the hover/pin/blur/Escape model once.
  desktop → anchored popover;  mobile → bottom sheet.
Open model (R1 claimed this and didn't do it — implement it properly):
  hover in → open unpinned; hover out → close ONLY if unpinned;
  click → toggles pin, a pinned panel survives mouse-out; focus → open;
  blur past the wrapper → close if unpinned;
  Escape → close, unpin, return focus to the trigger.
KNOWN CLEANUP: cc-tip.jsx still carries its own CCTipPopover/CCTipSheet, now
duplicates of CCOverlay. They're only there so the R1 canvas keeps rendering —
delete them and point CCTip at CCOverlay. The API is identical.

AVATARS — use the shipped primitive
The disc is UMAvatar from user-menu.jsx. This pass added two OPTIONAL props
there — `tone` (per-handle colour; the halo was already the disc's colour
knob) and `muted` (the "+9" overflow disc). Omit both and the render is
byte-identical to what ships. Do NOT author a new avatar component; NotifAvatar
Button in design_handoff_in_app_notifications/ documents the same reuse.

COPY — the paid split must stay honest
going-vs-watch is a two-row defs tip: "Watching — free" / "Going — part of
Concert History". R1 said Going "lands in your concert history" and never
mentioned it was paid — the last thing a Free user reads before finding out
otherwise. Say it once, without apology, and don't soften it.
`We'll add this to your history.` is DELETED and stays deleted — it restated
the button. The line under Going is WatchZone's status line, which is different
content (alerts + social proof) and was already shipping.

HARD constraints (house rules)
- Token-only theming, verified across electric / jade / light. No raw hex in
  screen code. This pass ADDED --shadow-soft / --shadow-strong to all three
  themes in theme-context.jsx — that's a shared-file change, land it first.
- Color semantics: --accent = Watching. --signal = CTAs / status. Following (an
  artist) stays the neutral Spotify-marked chip.
- Vocabulary: "Watching", never Saved / Favorites / Bookmarks.
- WCAG AA: 44×44 minimum targets (the ⨯, the ⓘ and the roster trigger all pad
  past smaller paint boxes). aria-modal on the sheet REQUIRES the focus trap —
  R1 shipped the attribute without the behaviour.
- Mobile 320 baseline → desktop. Behavioural asymmetry is not acceptable;
  visual difference is (see the ≤360 crawl rule above).

BOTH EARLIER OPEN QUESTIONS ARE NOW RULED ON (README §10) — implement as stated
1. COLOUR. There are three accent scopes, don't conflate them:
     --signal            system CTAs. Get Tickets. Constant app-wide.
     --accent            brand presence + Watching. Constant app-wide.
     h_accentFor(artist) PER-SHOW identity colour. The Going stub, and the
                         stamp it becomes in Concert History.
   Going uses the third. It is NOT "using --accent for a CTA", so CLAUDE.md's
   rule isn't in play. Leave it. Do not move Going to --signal — that would put
   two same-hue filled buttons ~16px apart, and would sever the stub from the
   identity art in the hero above it.
   THE RULE THAT DOES THE WORK IS WEIGHT, NOT HUE:
     Get Tickets is always filled --signal. Going is OUTLINED until you commit.
   Pre-commit there is exactly one filled button on screen. locked is outlined
   too, so the Free path never shows two fills either.
2. WATCHER FLOOR: the crawl renders when at least TWO NAMEABLE people are in it
   — wr_showCrawl(). Not a watcher count; a count of people the sentence can
   name, because names are this row's payload.
     0 others + you watching        → hidden
     1 other,  you not watching     → hidden (a lone stranger reads thin)
     1 other,  you watching         → shown  ("you & sc_x")
     2 others, you not watching     → shown
     0 named + N anonymous          → hidden (no handles, no crawl)
   Anonymous watchers still count toward the total once the row qualifies.

Start by reading design_handoff_event_detail_cta_tooltip/README.md, then ask me
anything ambiguous before writing code.
```
