# Design verification table — #764 Venue First-Timer Guide (CONSUMER surfaces)

Source of truth: `design/design_handoff_venue_first_timer_guide/` —
`guide-consumer.jsx` (prototype), `guide-data.jsx` (copy + chip pool), `README.md` (design calls).

**Scope:** consumer surfaces only. The **returner accordion** on the venue page (`GuideSection mode="returner"`,
`guide-consumer.jsx:186–223`) is **DEFERRED to a later PR** and is intentionally not enumerated here.

**Token rule:** the prototype is tokens-only (`var(--*)`) — no raw hex appears anywhere in `guide-consumer.jsx`
or `guide-data.jsx`. Any hex in the implementation is a defect. Fonts come through `G_FONT`
(`Inter, system-ui, -apple-system, sans-serif`) and `G_MONO`
(`'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`) — in-app these map to the existing
sans/mono families, not re-declared font stacks.

**Tap-target rule:** project floor is **44×44px**. Rows marked ⚠️ record the PROTOTYPE value, which is
below the floor; the builder MUST raise them (padding/pseudo-element, without changing the visual pill size).

---

## A. Copy strings (must live in `definitions/copy.ts`, verbatim)

All strings below come from `guide-data.jsx`. Quote-exact match required, including punctuation,
em dashes (`—`), and the `$` amounts. The venue-specific chip bodies (`ROXY_*`) are **fixture data**, not
copy constants — they are DB content; they are listed so the builder does not hard-code them.

| #   | Element                          | Spec (from the handoff)                                                                                                                   | Source                                    | Verified? |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- |
| A1  | Callout · populated · question   | `"First time at Roxy?"` — venue short-name interpolated in prod                                                                           | `guide-data.jsx:76`                       |           |
| A2  | Callout · populated · sub        | `"Two minutes of stuff worth knowing before you walk in."`                                                                                | `guide-data.jsx:76`                       |           |
| A3  | Callout · thin · question        | `"First time at Roxy?"` (identical to populated)                                                                                          | `guide-data.jsx:77`                       |           |
| A4  | Callout · thin · sub             | `"Here's what we've got so far."`                                                                                                         | `guide-data.jsx:77`                       |           |
| A5  | Callout · eyebrow                | `"New here"`                                                                                                                              | `guide-consumer.jsx:59`                   |           |
| A6  | Callout · jump button label      | `"GUIDE"` (literal uppercase in markup, not text-transform)                                                                               | `guide-consumer.jsx:73`                   |           |
| A7  | Callout · jump button aria-label | `"Jump to the first-timer guide"`                                                                                                         | `guide-consumer.jsx:65`                   |           |
| A8  | Guide section · heading          | `"Before you go"`                                                                                                                         | `guide-consumer.jsx:230`                  |           |
| A9  | Guide section · eyebrow          | `"First-timer guide"`                                                                                                                     | `guide-consumer.jsx:231`                  |           |
| A10 | Vibe line · eyebrow              | `"Insider tip"`                                                                                                                           | `guide-consumer.jsx:136`                  |           |
| A11 | Accessibility star badge         | `"★ ALWAYS HERE"` (literal, incl. the ★ glyph)                                                                                            | `guide-consumer.jsx:96`                   |           |
| A12 | Accessibility placeholder badge  | `"NOT DOCUMENTED"`                                                                                                                        | `guide-consumer.jsx:120`                  |           |
| A13 | Accessibility placeholder body   | `"Not documented yet. Best to call the venue and ask before you head out — details are on the main page."`                                | `guide-data.jsx:86`                       |           |
| A14 | Thin cluster · label             | `"Still gathering"` (`PLACEHOLDER_COPY.thinLabel`)                                                                                        | `guide-data.jsx:88`                       |           |
| A15 | Thin cluster · footer            | `"That's the lot for now — Roxy's new to us."` (`PLACEHOLDER_COPY.thinFooter`)                                                            | `guide-data.jsx:87`                       |           |
| A16 | Event chip label                 | `"First time at Roxy? Guide"` (`EVENT_CHIP_COPY`)                                                                                         | `guide-data.jsx:79`                       |           |
| A17 | Chip labels (all 8)              | `"Accessibility"`, `"Parking"`, `"Age policy"`, `"Bag check"`, `"Coat check"`, `"Will-call / entry"`, `"Food + drink"`, `"Getting there"` | `guide-data.jsx:18–35`                    |           |
| A18 | Chip bodies are DB content       | `ROXY_GUIDE_COPY` / `ROXY_THIN_COPY` / `ROXY_VIBE` are **fixtures** — must NOT ship as constants; render from venue data                  | `guide-data.jsx:55–72`, README §Copy maps |           |

---

## B. Chip pool + ordering

| #   | Element                         | Spec (from the handoff)                                                                                                                          | Source                                      | Verified? |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | --------- |
| B1  | `CHIP_ORDER`                    | Exactly `["accessibility","parking","age","bag","coat","entry","food","transit"]` — accessibility ALWAYS first                                   | `guide-data.jsx:16`                         |           |
| B2  | Render filter                   | Only chips with authored copy render: `CHIP_ORDER.filter((k) => copy[k])` — never render an empty chip row                                       | `guide-consumer.jsx:171`; README §chip pool |           |
| B3  | Accessibility is locked/starred | `CHIP_DEFS.accessibility` has `locked: true, star: true`; it is the only starred chip                                                            | `guide-data.jsx:19`                         |           |
| B4  | Icon per chip                   | `access`, `parking`, `age`, `bag`, `coat`, `ticket` (entry), `food`, `transit` — Lucide-style 24×24 stroke set, `strokeWidth` 1.6, `fill="none"` | `guide-data.jsx:38–52`                      |           |
| B5  | Icons decorative                | Every `GuideIcon` renders `aria-hidden="true"`; icon is never the sole signal (always adjacent text label)                                       | `guide-data.jsx:51`; README §A11y           |           |
| B6  | Venue basics never inside guide | Address / capacity / upcoming / type live in their own row — never a guide chip                                                                  | `guide-data.jsx:142`; README blockquote     |           |

---

## C. Venue detail · first-timer · POPULATED (mobile 320/390)

DOM order top→bottom.

| #   | Element                      | Spec (from the handoff)                                                                                                                                                                                                | Source                                      | Verified? |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------- |
| C1  | Page DOM order               | hero (+ back button) → type badge → `h1` venue name → directions row → **basics row** → **About** → **callout** → **guide (`#ft-guide`)** → **Upcoming**                                                               | `guide-consumer.jsx:335–365`; README gap §1 |           |
| C2  | About sits ABOVE the callout | Deliberate: basics + About + callout + guide read as one contiguous "before you go" block                                                                                                                              | `guide-consumer.jsx:350–353`                |           |
| C3  | No map                       | Map dropped; Directions link + "Getting there" chip cover it                                                                                                                                                           | README blockquote                           |           |
| C4  | Hero height                  | mobile 200, desktop 260; bottom fade `height: 90`, `linear-gradient(transparent, var(--bg))`                                                                                                                           | `guide-consumer.jsx:20–21, 338`             |           |
| C5  | Content offset               | mobile `marginTop: -18`, side padding 18px, bottom padding 28px                                                                                                                                                        | `guide-consumer.jsx:341–342`                |           |
| C6  | Venue `h1`                   | `fontWeight: 900`, mobile `fontSize: 27`, `letterSpacing: "-0.03em"`, `color: var(--fg)`                                                                                                                               | `guide-consumer.jsx:346–347`                |           |
| C7  | Type badge                   | `padding: "3px 8px"`, `borderRadius: 4`, `background: var(--surface-3)`, `color: var(--fg-muted)`, mono 9px, `letterSpacing: "0.06em"`, uppercase                                                                      | `guide-consumer.jsx:343–345`                |           |
| C8  | Basics row                   | 3 equal cells `Capacity / Upcoming / Type`; top+bottom `1px solid var(--border)`; dividers `borderLeft` on cells 2–3 with `paddingLeft: 16`; value 15px/700; **Upcoming value is `var(--signal)`**, others `var(--fg)` | `guide-consumer.jsx:271–289`                |           |
| C9  | About section                | eyebrow `"About"` + `<p>` 13.5px, `var(--fg-muted)`, `lineHeight: 1.6`, `textWrap: "pretty"`, `margin: "6px 0 0"`                                                                                                      | `guide-consumer.jsx:242–250`                |           |
| C10 | Callout wrapper spacing      | `marginTop: 22` above callout; guide block `marginTop: 16` when callout present, `22` when absent                                                                                                                      | `guide-consumer.jsx:355, 360`               |           |
| C11 | Guide anchor                 | Guide wrapper has `id="ft-guide"` and `scrollMarginTop: 12`                                                                                                                                                            | `guide-consumer.jsx:360`                    |           |
| C12 | Upcoming spacing             | `marginTop: 26` above the Upcoming list                                                                                                                                                                                | `guide-consumer.jsx:364`                    |           |

### C-i. First-timer callout (`FirstTimerCallout`)

| #   | Element                      | Spec (from the handoff)                                                                                                                                            | Source                                           | Verified? |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------- |
| C13 | Container                    | flex row, `alignItems: center`, `gap: 12`, `padding: "13px 14px"`, `borderRadius: 12`                                                                              | `guide-consumer.jsx:46`                          |           |
| C14 | Container fill               | `color-mix(in oklab, var(--accent) 12%, var(--bg))`                                                                                                                | `guide-consumer.jsx:47`                          |           |
| C15 | Container border             | `1px solid color-mix(in oklab, var(--accent) 32%, transparent)`                                                                                                    | `guide-consumer.jsx:48`                          |           |
| C16 | Icon tile                    | 34×34, `borderRadius: 9`, fill `color-mix(in oklab, var(--accent) 20%, transparent)`, centered                                                                     | `guide-consumer.jsx:49–51`                       |           |
| C17 | Callout icon glyph           | Three ascending dots, 20×20, `aria-hidden="true"`: r1.6 @ (5,14.5) `var(--accent)` op .55; r2.1 @ (10,10) `var(--accent)` op .8; r2.8 @ (15,5) **`var(--signal)`** | `guide-consumer.jsx:52–56`; README §Callout icon |           |
| C18 | Callout DOM order (text col) | eyebrow `"New here"` → question → sub                                                                                                                              | `guide-consumer.jsx:59–63`                       |           |
| C19 | Eyebrow style                | mono, `fontSize: 9` (override of default 9.5), `fontWeight: 700`, `letterSpacing: "0.14em"`, uppercase, `color: var(--accent)`                                     | `guide-consumer.jsx:37–39, 59`                   |           |
| C20 | Question style               | 15.5px, `fontWeight: 800`, `letterSpacing: "-0.02em"`, `color: var(--fg)`, `marginTop: 3`                                                                          | `guide-consumer.jsx:60–61`                       |           |
| C21 | Sub style                    | 12.5px, `var(--fg-muted)`, `marginTop: 2`, `lineHeight: 1.4`, `textWrap: "pretty"`                                                                                 | `guide-consumer.jsx:62–63`                       |           |
| C22 | Jump control semantics       | Real `<button>` (not a link), `aria-label` per A7, `color: var(--signal)`, `minWidth: 44` **and `minHeight: 44` — already meets the floor**                        | `guide-consumer.jsx:65–68`                       |           |
| C23 | Jump control content         | down-arrow svg 16×16 `stroke="currentColor"` strokeWidth 1.8, over mono 8px/700 `letterSpacing: "0.1em"` label `GUIDE`; column layout, `gap: 3`                    | `guide-consumer.jsx:69–73`                       |           |
| C24 | Jump behavior                | Scrolls to `#ft-guide` with `scrollIntoView({ behavior: "smooth", block: "start" })`                                                                               | `guide-consumer.jsx:357`                         |           |
| C25 | Callout gating               | Callout renders for `populated` and `thin` only (i.e. first-timer + anonymous); never for returner                                                                 | `guide-consumer.jsx:330`                         |           |

### C-ii. Guide section header + vibe line

| #   | Element                | Spec (from the handoff)                                                                                                                                                                                                           | Source                                                  | Verified? |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| C26 | Guide header DOM order | `"Before you go"` (15px/800, `letterSpacing: "-0.01em"`, `whiteSpace: nowrap`) → eyebrow `"First-timer guide"` in `var(--signal)` → flex-1 hairline rule `height: 1, background: var(--border)`; row `gap: 8`, `marginBottom: 12` | `guide-consumer.jsx:228–233`                            |           |
| C27 | **Insider tip LEADS**  | `VibeLine` renders **before** the chips, immediately after the header. This ordering is locked by the design                                                                                                                      | `guide-consumer.jsx:234–235`; README §Insider tip leads |           |
| C28 | Vibe container         | `padding: "13px 14px"`, `borderRadius: 10`, `background: var(--surface-1)`, `border: 1px solid var(--border)`, `marginBottom: 14` in lead position                                                                                | `guide-consumer.jsx:133–135`                            |           |
| C29 | Vibe DOM order         | eyebrow `"Insider tip"` (`var(--accent)`) → body text                                                                                                                                                                             | `guide-consumer.jsx:136–138`                            |           |
| C30 | Vibe body style        | 14.5px, `var(--fg)`, `lineHeight: 1.55`, `marginTop: 6`, `letterSpacing: "-0.01em"`, `textWrap: "pretty"`                                                                                                                         | `guide-consumer.jsx:137–138`                            |           |
| C31 | Vibe absent → nothing  | `if (!text) return null` — no empty card, no prompt                                                                                                                                                                               | `guide-consumer.jsx:131`                                |           |

### C-iii. Guide chip (`GuideChip`)

| #   | Element                   | Spec (from the handoff)                                                                                                           | Source                           | Verified? |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------- |
| C32 | Chip row                  | flex, `gap: 12`, `padding: "12px 0"`; `borderTop: 1px solid var(--border)` on every chip EXCEPT the first (`first` → none)        | `guide-consumer.jsx:84–85`       |           |
| C33 | Icon tile                 | 30×30, `borderRadius: 8`, centered, `flexShrink: 0`                                                                               | `guide-consumer.jsx:86–87`       |           |
| C34 | Icon tile — accessibility | `background: color-mix(in oklab, var(--signal) 14%, transparent)`, `color: var(--signal)`                                         | `guide-consumer.jsx:88–89`       |           |
| C35 | Icon tile — other chips   | `background: var(--surface-2)`, `color: var(--fg-muted)`                                                                          | `guide-consumer.jsx:88–89`       |           |
| C36 | Chip icon size            | `GuideIcon size={16}` inside the tile                                                                                             | `guide-consumer.jsx:90`          |           |
| C37 | Chip DOM order            | label row (eyebrow [+ star badge]) → value text                                                                                   | `guide-consumer.jsx:92–99`       |           |
| C38 | Chip eyebrow color        | `var(--signal)` for accessibility, `var(--fg-subtle)` otherwise; default size 9.5, mono 700, `letterSpacing: "0.14em"`, uppercase | `guide-consumer.jsx:94`, `37–39` |           |
| C39 | Star badge                | Only when `def.star`: mono 8px/700, `color: var(--signal)`, `letterSpacing: "0.08em"`, label row `gap: 6`                         | `guide-consumer.jsx:93–96`       |           |
| C40 | Chip value                | 13.5px, `var(--fg)`, `lineHeight: 1.5`, `marginTop: 3`, `letterSpacing: "-0.005em"`, `textWrap: "pretty"`                         | `guide-consumer.jsx:98–99`       |           |
| C41 | Chip is non-interactive   | No click/expand/tooltip on a guide chip — full text always visible, never truncated                                               | `guide-consumer.jsx:80–103`      |           |

---

## D. Venue detail · first-timer · POPULATED (desktop, 2-col chip grid)

| #   | Element                             | Spec (from the handoff)                                                                                                  | Source                                               | Verified? |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | --------- |
| D1  | Layout                              | **Single column**, no sidebar, no map; same DOM order as mobile                                                          | `guide-consumer.jsx:329–365`; README §Desktop layout |           |
| D2  | Content max width                   | `maxWidth: 760`, centered (`margin: "0 auto"`)                                                                           | `guide-consumer.jsx:333, 341`                        |           |
| D3  | Side / bottom padding               | 24px sides, 48px bottom                                                                                                  | `guide-consumer.jsx:334, 341`                        |           |
| D4  | Hero + offset                       | hero `height: 260`, content `marginTop: -34`                                                                             | `guide-consumer.jsx:338, 342`                        |           |
| D5  | Venue `h1`                          | `fontSize: 40`, weight 900, `letterSpacing: "-0.03em"`                                                                   | `guide-consumer.jsx:347`                             |           |
| D6  | Chip grid                           | `display: grid`, `gridTemplateColumns: "1fr 1fr"`, `columnGap: 28`; each cell `minWidth: 0`                              | `guide-consumer.jsx:175–177`                         |           |
| D7  | Grid separator behavior             | In 2-col mode **every** chip passes `first={true}` → **no `borderTop` on any chip** (avoids ragged rules across columns) | `guide-consumer.jsx:178`                             |           |
| D8  | Grid applies to first-timer only    | `columns={desktop && mode !== "returner" ? 2 : 1}` — returner stays 1-col                                                | `guide-consumer.jsx:361`                             |           |
| D9  | Header/callout/vibe stay full-width | Only the chips grid; the header rule, callout and vibe line span the column                                              | `guide-consumer.jsx:228–235`                         |           |

---

## E. Venue detail · first-timer · THIN guide

| #   | Element                   | Spec (from the handoff)                                                                                                                                                                        | Source                             | Verified? |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------- |
| E1  | Callout variant           | Thin callout renders (A3/A4), same structure/styling as populated                                                                                                                              | `guide-consumer.jsx:331, 356`      |           |
| E2  | No vibe line              | `ROXY_THIN_VIBE = null` → `VibeLine` returns null. Deliberate honesty; do NOT substitute a prompt                                                                                              | `guide-data.jsx:72`; README gap §2 |           |
| E3  | Authored chips            | Only `accessibility` renders (only key present in `ROXY_THIN_COPY`) — as a full authored `GuideChip`, starred                                                                                  | `guide-data.jsx:68–71`             |           |
| E4  | Thin section DOM order    | header → (no vibe) → authored chips → `StillGathering` cluster                                                                                                                                 | `guide-consumer.jsx:234–236`       |           |
| E5  | Still-gathering wrapper   | `marginTop: 14`                                                                                                                                                                                | `guide-consumer.jsx:147`           |           |
| E6  | Still-gathering DOM order | eyebrow `"Still gathering"` → wrapped ghost pills → italic footer line                                                                                                                         | `guide-consumer.jsx:148–160`       |           |
| E7  | Ghost pill set            | `CHIP_ORDER.filter(k => k !== "accessibility")` — i.e. always the 7 non-accessibility chips, in `CHIP_ORDER` sequence. ⚠️ Prototype does NOT subtract already-authored chips (see Ambiguities) | `guide-consumer.jsx:145`           |           |
| E8  | Pill container            | flex, `flexWrap: "wrap"`, `gap: 6`, `marginTop: 8`                                                                                                                                             | `guide-consumer.jsx:149`           |           |
| E9  | Pill style                | `padding: "4px 9px"`, `borderRadius: 999`, `background: transparent`, `border: 1px dashed var(--border-strong)`, `color: var(--fg-subtle)`, sans 11.5px/500, inner `gap: 5`                    | `guide-consumer.jsx:151–154`       |           |
| E10 | Pill content              | `GuideIcon size={12}` (decorative) + chip label text                                                                                                                                           | `guide-consumer.jsx:155`           |           |
| E11 | Pills are NOT interactive | Rendered as `<span>` — no button, no link, no tap target. Do not make them clickable                                                                                                           | `guide-consumer.jsx:151`           |           |
| E12 | Footer line               | 12px, `var(--fg-subtle)`, `marginTop: 10`, `fontStyle: "italic"`, `letterSpacing: "-0.005em"`                                                                                                  | `guide-consumer.jsx:159–160`       |           |
| E13 | No community-tips CTA     | Deliberate — belongs to #981 (v2). Do not add "suggest an edit"                                                                                                                                | README §Thin-guide missing chips   |           |
| E14 | Thin on desktop           | Handoff draws thin at 390 only; the `columns` logic still applies at desktop (see Ambiguities)                                                                                                 | README template inventory          |           |

---

## F. Accessibility chip — both states

| #   | Element                     | Spec (from the handoff)                                                                                                                                                                   | Source                                | Verified?                                                             |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| F1  | Always first                | Accessibility is pinned first in `CHIP_ORDER` and never hidden, in every state                                                                                                            | `guide-data.jsx:16`; README §A11y     |                                                                       |
| F2  | Authored state — badge      | `"★ ALWAYS HERE"`, mono 8px/700, `var(--signal)`, `letterSpacing: "0.08em"`                                                                                                               | `guide-consumer.jsx:95–96`            |                                                                       |
| F3  | Authored state — tile       | `color-mix(in oklab, var(--signal) 14%, transparent)` fill, `var(--signal)` icon, **no border**                                                                                           | `guide-consumer.jsx:88–89`            |                                                                       |
| F4  | Authored state — eyebrow    | `"Accessibility"` in `var(--signal)`                                                                                                                                                      | `guide-consumer.jsx:94`               |                                                                       |
| F5  | Authored state — body       | 13.5px `var(--fg)` (same as any authored chip)                                                                                                                                            | `guide-consumer.jsx:98`               |                                                                       |
| F6  | Placeholder state — badge   | `"NOT DOCUMENTED"`, mono 8px/700, **`var(--fg-subtle)`**, `letterSpacing: "0.08em"` — no star                                                                                             | `guide-consumer.jsx:119–120`          |                                                                       |
| F7  | Placeholder state — tile    | `background: var(--surface-2)`, `color: var(--fg-subtle)`, **`border: 1px dashed var(--border-strong)`**                                                                                  | `guide-consumer.jsx:110–113`          |                                                                       |
| F8  | Placeholder state — eyebrow | `"Accessibility"` in the **default** `var(--fg-subtle)` (no signal tint)                                                                                                                  | `guide-consumer.jsx:118`              |                                                                       |
| F9  | Placeholder state — body    | **13px** (not 13.5) and **`var(--fg-muted)`** (not `var(--fg)`) — deliberately de-emphasized vs authored                                                                                  | `guide-consumer.jsx:122`              |                                                                       |
| F10 | Placeholder body copy       | A13 verbatim                                                                                                                                                                              | `guide-data.jsx:86`                   |                                                                       |
| F11 | Placeholder row chrome      | Same `gap: 12`, `padding: "12px 0"`, `first`-conditional `borderTop` as `GuideChip`                                                                                                       | `guide-consumer.jsx:108–109`          |                                                                       |
| F12 | Three-state model           | `chipState(value,{placeholder}) → blank                                                                                                                                                   | authored                              | honest_placeholder`; `honest_placeholder` valid ONLY on accessibility | `guide-data.jsx:127–131`; README §chip pool |     |
| F13 | ⚠️ Wiring gap               | `AccessPlaceholderChip` is exported but **never rendered by `GuideSection`** in the prototype — the builder must wire it in as the accessibility chip when `state === honest_placeholder` | `guide-consumer.jsx:171–181` vs `106` |                                                                       |

---

## G. Venue detail · anonymous

| #   | Element                       | Spec (from the handoff)                                                                                                                                | Source                                           | Verified? |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------- |
| G1  | Identical rendering           | Anonymous uses the **same component and the same `populated`/`thin` mode** as first-timer — no separate variant, no sign-in prompt, no gating          | README template inventory ("same component")     |           |
| G2  | Callout copy is auth-agnostic | The question form `"First time at Roxy?"` was chosen specifically so it reads correctly signed-out                                                     | `guide-data.jsx:74–75`; README §Voice guardrails |           |
| G3  | No auth-conditional chrome    | No upsell, no tier gate, no "sign in to see more" anywhere in the guide                                                                                | `guide-consumer.jsx:329–368` (absence)           |           |
| G4  | Progressive enhancement       | Guide section ships independent of first-timer detection; without detection everyone sees the collapsed returner state and the callout lights up later | README §Sequencing                               |           |

---

## H. Event detail · first-timer chip on the venue row

| #   | Element                        | Spec (from the handoff)                                                                                                                                                                                                                                  | Source                                                            | Verified? |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| H1  | Event page DOM order           | hero (+back) → genre badges → `h1` artist → tour title → **Watching pill row** → bordered info block [Venue row, hairline, Date, Doors / Show, Ages] → Get Tickets CTA                                                                                   | `guide-consumer.jsx:433–470`                                      |           |
| H2  | Chip placement                 | Inside the **Venue row**, in the right-hand column, BELOW the venue link — never in the actions row under the title                                                                                                                                      | `guide-consumer.jsx:389–404`; README §Event chip placement        |           |
| H3  | Venue row layout               | `justifyContent: space-between`, `alignItems: flex-start`, `gap: 12`, `padding: "9px 0"`; left = eyebrow `"Venue"`; right column `alignItems: flex-end`, `gap: 9`                                                                                        | `guide-consumer.jsx:391–393`                                      |           |
| H4  | Right-edge alignment           | Chip is right-aligned with the page edge, matching every other value in the info block                                                                                                                                                                   | `guide-consumer.jsx:393`; README §Event chip placement            |           |
| H5  | Chip tint = SIGNAL not accent  | fill `color-mix(in oklab, var(--signal) 14%, transparent)`, border `1px solid color-mix(in oklab, var(--signal) 34%, transparent)`, `color: var(--signal)`. Deliberate — must not read as a commit action next to the accent Watching pill / Get Tickets | `guide-consumer.jsx:416–417`; README                              |           |
| H6  | Chip shape                     | `borderRadius: 999`, `padding: "0 11px"`, inline-flex, `alignItems: center`, `gap: 6`                                                                                                                                                                    | `guide-consumer.jsx:414–415`                                      |           |
| H7  | ⚠️ Chip tap target             | Prototype `minHeight: 32` — **BELOW the 44px floor.** Builder MUST raise the hit area to ≥44px while keeping the 32px visual pill                                                                                                                        | `guide-consumer.jsx:415`; README §A11y ("all tap targets ≥ 44px") |           |
| H8  | Chip icon                      | Same three ascending dots, 13×13 viewBox 0 0 20 20, all circles `fill="currentColor"` with opacity .55 / .8 / 1 — `aria-hidden="true"`, decorative                                                                                                       | `guide-consumer.jsx:418–422`                                      |           |
| H9  | Chip label                     | A16 verbatim; sans 12px/700, `letterSpacing: "-0.005em"`                                                                                                                                                                                                 | `guide-consumer.jsx:423–424`                                      |           |
| H10 | Chip trailing arrow            | Literal `"→"` glyph in a `<span>`, sans 13px/700 (not an svg)                                                                                                                                                                                            | `guide-consumer.jsx:425`                                          |           |
| H11 | Chip is a link                 | Semantically an `<a>`, not a button; prod href = `` `/venues/${venue.slug}#ft-guide` ``                                                                                                                                                                  | `guide-consumer.jsx:409, 413`                                     |           |
| H12 | Chip target lands on the guide | The `#ft-guide` fragment must match C11's anchor id, so cross-page navigation deep-links into the guide                                                                                                                                                  | `guide-consumer.jsx:360, 413`                                     |           |
| H13 | Venue link (unchanged)         | 14px/600 `var(--fg)`, `textDecoration: none`, trailing chevron svg 12×12 `stroke="var(--fg-subtle)"` strokeWidth 1.5, `gap: 5`                                                                                                                           | `guide-consumer.jsx:394–398`                                      |           |
| H14 | Watching pill untouched        | Accent-bordered pill above stays as-is; the guide chip adds no sibling in that row                                                                                                                                                                       | `guide-consumer.jsx:451–453`                                      |           |
| H15 | ⚠️ Watching pill tap target    | Prototype `minHeight: 34` — below the 44px floor. This is existing prod chrome; if it is re-rendered here, raise it                                                                                                                                      | `guide-consumer.jsx:376`                                          |           |

---

## I. Event detail · returner baseline (no chip)

| #   | Element                   | Spec (from the handoff)                                                                                                  | Source                       | Verified? |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | --------- |
| I1  | Chip absent               | `firstTimer === false` → `EventFirstTimerChip` not rendered at all (no placeholder, no reserved space)                   | `guide-consumer.jsx:402`     |           |
| I2  | Row collapses cleanly     | Venue row keeps `padding: "9px 0"`; the right column simply holds only the venue link — no layout shift or empty gap     | `guide-consumer.jsx:391–403` |           |
| I3  | Everything else identical | Hero, genre badges, title, Watching pill, Date / Doors / Ages rows, Get Tickets CTA all unchanged between the two states | `guide-consumer.jsx:430–471` |           |
| I4  | Detection source          | Returner = `attending_at IS NOT NULL` for any event at this venue (#55 Concert History)                                  | README §Sequencing           |           |

---

## J. Accessibility (WCAG AA) requirements

| #   | Element                           | Spec (from the handoff)                                                                                                                                                                                                                                                           | Source                                            | Verified? |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------- |
| J1  | All decorative svgs `aria-hidden` | Callout icon, every `GuideIcon`, event-chip dots — all `aria-hidden="true"`                                                                                                                                                                                                       | `guide-consumer.jsx:52, 418`; `guide-data.jsx:51` |           |
| J2  | ⚠️ Un-hidden svgs in prototype    | Back-button chevron (`:32`), jump-arrow (`:69`), Directions arrow (`:262`), venue-link chevron (`:397`), Watching check/plus (`:380–383`), Upcoming plus (`:318`) have **no `aria-hidden`** — builder should add it (they are all decorative with adjacent text or an aria-label) | `guide-consumer.jsx` as cited                     |           |
| J3  | Icon never the only signal        | Every icon has an adjacent text label                                                                                                                                                                                                                                             | README §A11y                                      |           |
| J4  | Jump control                      | Real `<button>` with `aria-label="Jump to the first-timer guide"`; ≥44px                                                                                                                                                                                                          | `guide-consumer.jsx:65–66`                        |           |
| J5  | No native `title=`                | No `title` attribute anywhere on the authored consumer surface                                                                                                                                                                                                                    | README §A11y                                      |           |
| J6  | Focus rings tokened               | Focus/validation rings read from `var(--*)`. ⚠️ The prototype uses `all: "unset"` on button/link (`:66, 315, 375, 413, 466`) which **removes the focus ring** — builder must restore a visible tokened `:focus-visible` ring                                                      | `guide-consumer.jsx`; README §A11y                |           |
| J7  | Theme parity                      | All 9 themes must render correctly — tokens only, no hex, no Tailwind `dark:` variants                                                                                                                                                                                            | README DNA statement                              |           |
| J8  | Star glyph is decorative          | `★` in "★ ALWAYS HERE" is presentational text; ensure it isn't announced as meaningful on its own                                                                                                                                                                                 | `guide-consumer.jsx:96`                           |           |
| J9  | Guide heading semantics           | The prototype uses a styled `<span>` for `"Before you go"` — builder should promote it to a real heading element for landmark navigation                                                                                                                                          | `guide-consumer.jsx:229`                          |           |

---

## K. Canvas-only scaffolding — DO NOT PORT

| #   | Element                                                                                                              | Spec (from the handoff)                                                                                                                                                            | Source                         | Verified? |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------- |
| K1  | Event chip `preventDefault`                                                                                          | `onClick={(e) => e.preventDefault()}` on the first-timer chip exists only to keep the canvas static. In prod this is a **real cross-page navigation** to `/venues/{slug}#ft-guide` | `guide-consumer.jsx:409–413`   |           |
| K2  | Directions link `preventDefault`                                                                                     | Same — must be a real maps/directions link in prod                                                                                                                                 | `guide-consumer.jsx:259`       |           |
| K3  | Venue link `preventDefault`                                                                                          | Same — real link to the venue page                                                                                                                                                 | `guide-consumer.jsx:394`       |           |
| K4  | Get Tickets `preventDefault`                                                                                         | Same — real external ticket link                                                                                                                                                   | `guide-consumer.jsx:466`       |           |
| K5  | Hard-coded slug                                                                                                      | `"/venues/roxy-music-hall#ft-guide"` is a fixture; must be interpolated from venue data                                                                                            | `guide-consumer.jsx:413`       |           |
| K6  | `window` globals / `Object.assign(window, …)`                                                                        | Prototype module wiring; ship as normal ES modules                                                                                                                                 | `guide-consumer.jsx:6–13, 476` |           |
| K7  | Inline `style={{}}` everywhere                                                                                       | Prototype convention; ship as Tailwind + CSS variables per project styling standard                                                                                                | throughout                     |           |
| K8  | `G_FONT` / `G_MONO` literal stacks                                                                                   | Canvas font declarations; use the app's existing font classes, do not re-declare `Inter, system-ui…`                                                                               | `guide-data.jsx:9–10`          |           |
| K9  | Fixture data (`ROXY_*`)                                                                                              | `ROXY_VENUE`, `ROXY_ABOUT`, `ROXY_UPCOMING`, `ROXY_EVENT`, `ROXY_GUIDE_COPY`, `ROXY_VIBE` are sample content — never ship as constants                                             | `guide-data.jsx:54–167`        |           |
| K10 | `Hero` / `BackButton` / `ArtTile` / `BasicsRow` / `UpcomingList` / `WatchingPill` / `AboutSection` / `DirectionsRow` | Context framing that mirrors current prod — **not a spec for the venue/event page itself**. Only the callout + guide + event chip are in-scope deliverables                        | README gap §1                  |           |
| K11 | ⚠️ `UpcomingList` "Watch this show" button                                                                           | `minHeight: 32` — below the 44px floor. Prototype scaffolding; if the real list is touched, it must meet 44px                                                                      | `guide-consumer.jsx:315–316`   |           |
| K12 | `ADMIN_COPY` / `V2_CHIPS`                                                                                            | Admin surface + #997 ghosts — out of scope for the consumer PR                                                                                                                     | `guide-data.jsx:92–123`        |           |

---

## L. Deferred (not verified in this pass)

| #   | Element                         | Spec (from the handoff)                                                                                                                                                                                                      | Source                                                   | Verified?    |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------ |
| L1  | Returner accordion (venue page) | Accent-tinted card, preview strip `Access · Parking · Age +N`, `aria-expanded`, `minHeight: 44` header button, chevron rotate 180deg / `transition: transform .15s`, Insider tip leads the open state, 1-col even on desktop | `guide-consumer.jsx:186–223`; README §Returner treatment | DEFERRED     |
| L2  | Admin guide block               | populated / empty / validation, chip picker, accessibility two-mode field, chip-state legend                                                                                                                                 | `guide-admin.jsx`; README                                | OUT OF SCOPE |

---

## Ambiguities — builder judgment calls

1. **Thin ghost-pill set is hard-coded to "all seven non-accessibility chips."** `StillGathering`
   (`guide-consumer.jsx:145`) does not subtract chips that ARE authored. In a partially-populated venue
   (say 3 of 8 authored) the prototype would list authored chips as "still gathering." The handoff never
   draws that middle state. Builder must derive the pill set from _unauthored_ chips.
2. **What counts as "thin" is undefined.** The prototype takes `mode` as a prop. There is no threshold
   (accessibility-only? fewer than N chips? no vibe line?) that decides populated vs thin at runtime.
3. **Thin state at desktop.** Only drawn at 390. `columns={desktop && mode !== "returner" ? 2 : 1}` would
   put a single authored chip into a 2-col grid, leaving an empty right cell, and the Still-gathering
   cluster's placement relative to the grid is undrawn.
4. **Accessibility placeholder is never wired.** `AccessPlaceholderChip` exists but `GuideSection` only
   renders `GuideChip`. The builder must decide how `honest_placeholder` reaches the render path and how
   it interacts with the `copy[k]` truthiness filter (a placeholder chip has no authored value).
5. **Venue name interpolation in copy.** `"First time at Roxy?"` and `"First time at Roxy? Guide"` both
   embed the venue _short_ name (`ROXY_VENUE.venueShort` exists on the event fixture but not the venue
   fixture). No rule is given for long names, overflow, or which field supplies the short name.
6. **Event chip truncation.** `EVENT_CHIP_COPY` is a single-line pill in a right-aligned column with
   `minWidth: 0` on the parent; no ellipsis/wrap behavior is specified for a long venue name at 320px.
7. **Focus/hover/active states are undrawn.** `all: "unset"` strips them; the handoff says "tokened focus
   rings" but shows none. Hover and pressed states for the jump button and the event chip are unspecified.
8. **Reduced-motion.** The smooth `scrollIntoView` has no `prefers-reduced-motion` fallback in the prototype.
9. **Anonymous vs first-timer detection at the edge.** No spec for the SSR/hydration window — whether the
   callout may flash before detection resolves, or should render callout-absent until known.
10. **320px specifics.** Inventory lists 320 for the populated venue page but the prototype has no
    320-specific overrides; the callout's icon tile + text + 44px jump button at `gap: 12` inside 18px
    side padding is the tightest row and is untested at that width.
11. **Vibe-line-only guide.** If a venue has an Insider tip but zero authored chips (including no
    accessibility), no state is drawn.
12. **The `#ft-guide` fragment on cross-page navigation.** Next.js App Router does not reliably scroll to a
    fragment on client-side navigation into a freshly-rendered page; the builder must handle the
    scroll-on-arrival explicitly. Not addressed by the handoff.
