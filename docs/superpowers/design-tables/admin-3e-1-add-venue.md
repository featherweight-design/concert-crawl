# Admin 3e-1 Add a venue: Start and Basics property table

Source: `design/design_handoff_admin_redesign/boards/05-add-a-venue/` (start-nobody-asked-yet, add-a-venue-start (shell, title, subtitle, section label, Start from scratch only), basics-desktop, step-1-basics-mobile). README.md and COPY.md "Add a venue" sections skimmed.

Conventions:
- The boards use inline styles with literal hex values. No CSS variable names exist in the source, so colors are recorded as the exact hex/rgba. Mapping hex to repo tokens is a later step and is not inferred here.
- Breakpoint 640px. Mobile column = the 390px board (step-1-basics-mobile). Desktop column = the 1280px boards. "not drawn" means the board set has no such element at that breakpoint. "—" means the board explicitly sets no value or sets it to none/absent.
- font-family: Inter, system-ui, sans-serif is set on the screen root and inherited unless a row says otherwise. Mono = 'JetBrains Mono', monospace.
- Copy rows record only which string shows.
- Root canvas background on every board: `radial-gradient(1100px 650px at 0% 0%, rgba(188,119,242,0.15), transparent 65%), radial-gradient(900px 650px at 100% 100%, rgba(122,230,255,0.09), transparent 60%), linear-gradient(180deg,#0e1121,#070A1A)`; root color #E8F3FF; body margin 0, body background #070A1A.
- Hover, focus and disabled states: none of the four boards draws any hover, focus or disabled state for any element. Every row for those is therefore omitted, and the section "Hover, focus, disabled" below states this once.

## Component: Screen root

| Property | Mobile | Desktop |
|---|---|---|
| Board size | 390 x 844 | Start: 1280 x 640. Basics: 1280 x 820. Nobody-asked card: 560 x 250 |
| position / overflow | relative / hidden | relative / hidden |
| font-family | Inter, system-ui, sans-serif | Inter, system-ui, sans-serif |
| color | #E8F3FF | #E8F3FF |
| background | canvas gradient (above) | canvas gradient (above) |

## Component: Admin shell (sidebar and topbar), desktop only

Drawn on add-a-venue-start and basics-desktop. Not drawn on mobile (the mobile board has no sidebar and no breadcrumb bar) and not drawn on the nobody-asked board (card only).

### Sidebar container

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn | drawn |
| position | — | absolute; left 0, top 0, bottom 0 |
| width | — | 232px |
| background | — | rgba(14,18,38,0.85) |
| border-right | — | 1px solid #1F2748 |

### Sidebar brand row

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | not drawn | flex / center / 9px |
| padding | — | 18px 14px 8px |
| logo wrapper border-radius / overflow / border | — | 7px / hidden / 1px solid #1F2748 |
| logo svg width / height / viewBox | — | 28 / 28 / 0 0 96 96 |
| logo svg display / flex | — | block / none |
| logo rect fill / rx | — | #070A1A / 16 |
| logo glow circles fill | — | #FF7BD4 (r20 opacity 0.22, r12 opacity 0.42), core #7AE6FF r7 at cx72 cy24 |
| logo trail circles fill | — | #7AE6FF, opacities 0.35 to 0.89 |
| text block line-height | — | 1.1 |
| wordmark "concert" font-size / weight / letter-spacing | — | 15px / 800 / -0.02em |
| wordmark color / white-space | — | #E8F3FF / nowrap |
| wordmark "crawl." color | — | #FF7BD4 |
| "ADMIN" tag font-family | — | Mono |
| "ADMIN" tag font-size / weight / letter-spacing | — | 9px / 600 / 0.18em |
| "ADMIN" tag color | — | #FF7BD4 |

### Sidebar nav list

| Property | Mobile | Desktop |
|---|---|---|
| wrapper padding | not drawn | 4px 10px |
| item display / align-items / gap | — | flex / center / 11px |
| item position | — | relative |
| item height | — | 38px |
| item padding | — | 0 12px |
| item border-radius | — | 9px |
| item font-size | — | 14px |
| item font-weight (inactive) | — | 500 |
| item color (inactive) | — | #9AA8C7 |
| item background (inactive) | — | — (none set) |
| item label flex | — | 1 |
| item icon svg width / height | — | 17 / 17 |
| item icon viewBox | — | 0 0 24 24 |
| item icon fill / stroke | — | none / #5A6788 (inactive) |
| item icon stroke-width / linecap / linejoin | — | 1.6 / round / round |
| item icon display / flex | — | block / none |
| items in order | — | Needs you, Health, [MANAGE], Venues, Events, Artists, Prices, People, Feature flags, [SYSTEM], Crawl runs, Operations |
| Needs you badge display / align / justify | — | inline-flex / center / center |
| Needs you badge min-width / height / padding | — | 20px / 20px / 0 6px |
| Needs you badge border-radius | — | 999px |
| Needs you badge font-size / weight / line-height | — | 11px / 700 / 1 |
| Needs you badge background / color | — | #FF7BD4 / #070A1A |
| Needs you badge text | — | "14" |

### Sidebar nav item, active (Venues)

| Property | Mobile | Desktop |
|---|---|---|
| font-weight | not drawn | 600 |
| color | — | #E8F3FF |
| background | — | #171D3A |
| icon stroke | — | #7AE6FF |
| active bar | — | absolute; left 0; top 9px; bottom 9px; width 2px; border-radius 2px; background #7AE6FF |

### Sidebar section labels (MANAGE, SYSTEM)

| Property | Mobile | Desktop |
|---|---|---|
| padding | not drawn | 18px 12px 8px |
| font-family | — | Mono |
| font-size / weight / letter-spacing | — | 10px / 600 / 0.16em |
| color | — | #5A6788 |

### Sidebar user card

| Property | Mobile | Desktop |
|---|---|---|
| position | not drawn | absolute; left 12px; right 12px; bottom 14px |
| display / align-items / gap | — | flex / center / 10px |
| padding | — | 10px |
| border-radius / border | — | 10px / 1px solid #1F2748 |
| background | — | #0E1226 |
| avatar size | — | 30px x 30px, border-radius 50%, flex none |
| avatar background / border | — | #452c53 / 1.5px solid #FF7BD4 |
| avatar letter | — | "H"; 13px; weight 800; color #FF7BD4; centered (flex, center, center) |
| text block | — | flex 1; line-height 1.2 |
| name "Hugh" | — | 13px / 700 |
| role "ADMIN" | — | Mono; 9.5px; weight 500; letter-spacing 0.14em; color #5A6788 |
| chevron svg | — | 14 x 14; viewBox 0 0 16 16; fill none; stroke #9AA8C7; stroke-width 1.6; round/round; path "M4 6l4 4 4-4" |

### Topbar (breadcrumb)

| Property | Mobile | Desktop |
|---|---|---|
| position | not drawn | absolute; left 232px; right 0; top 0 |
| height | — | 56px |
| display / align-items / gap | — | flex / center / 12px |
| padding | — | 0 28px |
| border-bottom | — | 1px solid #1F2748 |
| font-size | — | 13.5px |
| crumb 1 "Venues" | — | color #9AA8C7; weight 500 |
| separator "/" | — | color #5A6788; padding 0 8px |
| crumb 2 "Add a venue" | — | color #E8F3FF; weight 600 |
| trailing spacer | — | flex 1 (empty) |

## Component: Start screen (add-a-venue-start; request rows are out of scope)

### Content pane

| Property | Mobile | Desktop |
|---|---|---|
| presence | Start screen not drawn in the listed boards | drawn |
| position | — | absolute; left 232px; right 0; top 56px; bottom 0 |
| overflow | — | hidden |
| inner padding | — | 24px 28px |
| inner display / flex-direction / gap | — | flex / column / 18px |

### Header row

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | not drawn | flex / flex-end / 12px |
| title block | — | flex 1 |

### Page title

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Add a venue" |
| font-size / weight / letter-spacing | — | 28px / 800 / -0.02em |

### Page subtitle

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Start from a venue people asked for, or from scratch." |
| font-size / color | — | 13.5px / #9AA8C7 |
| margin-top | — | 4px |

### Start from scratch button (populated list variant, secondary)

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Start from scratch" |
| display / align-items / justify-content / gap | — | inline-flex / center / center / 6px |
| height / padding | — | 36px / 0 12px |
| border-radius | — | 9px |
| font-size / weight | — | 13px / 600 |
| white-space | — | nowrap |
| background | — | #171D3A |
| color | — | #E8F3FF |
| border | — | 1px solid #2C3661 |
| position | — | right end of the header row, bottom-aligned with the subtitle (align-items flex-end) |

### Section card (container only)

| Property | Mobile | Desktop |
|---|---|---|
| border-radius | not drawn | 14px |
| border | — | 1px solid #1F2748 |
| background | — | #11162E |
| overflow | — | hidden |

### Section header row

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | not drawn | flex / center / 10px |
| padding | — | 14px 18px |
| label text | — | "Venues people asked for" |
| label font-size / weight | — | 15px / 700 |
| helper text | — | "Not crawled yet. Most asked first." |
| helper font-size / color | — | 12.5px / #9AA8C7 |

(The helper line is a sibling of the label in the same row. It is listed because it sits in the section header; its use is not stated beyond the board.)

## Component: Start screen, nobody asked yet (start-nobody-asked-yet)

Drawn as a 560 x 250 card with no sidebar, topbar, page title or section card. The mobile phone-addendum boards for this state are outside the listed files and were not read for properties.

### Card

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn | drawn as a 560 x 250 card |
| position of content | — | absolute; inset 0 |
| padding | — | 22px 24px |
| display / flex-direction / gap | — | flex / column / 14px |

### Empty heading

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "No venues asked for right now" |
| wrapper display / align-items / gap | — | flex / center / 8px |
| font-size / weight / letter-spacing | — | 18px / 800 / -0.01em |

### Empty body

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "When fans use “Suggest a venue”, ..." |
| font-size / color | — | 13px / #9AA8C7 |
| margin-top | — | 4px |
| line-height | — | 1.45 |

### Start from scratch button (primary variant)

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Start from scratch" |
| display / align-items / justify-content / gap | — | inline-flex / center / center / 6px |
| height / padding | — | 36px / 0 12px |
| border-radius | — | 9px |
| font-size / weight | — | 13px / 700 |
| white-space | — | nowrap |
| background | — | linear-gradient(135deg,#7AE6FF,#de96df) |
| color | — | #070A1A |
| border | — | 1px solid transparent |
| position | — | below the text block (column flow, gap 14px) |

Note: the button is the secondary variant (#171D3A / 600) when the list is populated and the primary gradient variant (700) when empty.

## Component: Basics (step 1), mobile

### Top bar (Cancel and step counter)

| Property | Mobile | Desktop |
|---|---|---|
| presence | drawn | not drawn (desktop uses breadcrumb topbar and rail instead) |
| padding | 14px 16px 4px | — |
| display / align-items / gap | flex / center / 10px | — |
| font-size / color | 13px / #9AA8C7 | — |
| Cancel icon svg | width 15, height 15, viewBox 0 0 16 16, fill none, stroke #9AA8C7, stroke-width 1.8, linecap round, linejoin round, display block, flex none, path "M4 4l8 8M12 4l-8 8" | — |
| Cancel text | "Cancel" | — |
| spacer | flex 1 | — |
| step counter text | "Step 1 of 5" | — |

### Progress bar

| Property | Mobile | Desktop |
|---|---|---|
| presence | drawn | not drawn |
| track height | 3px | — |
| track margin | 6px 16px 0 | — |
| track border-radius | 2px | — |
| track background | #1F2748 | — |
| fill width | 20% (step 1 of 5) | — |
| fill height | 100% | — |
| fill border-radius | 2px | — |
| fill background | linear-gradient(90deg,#7AE6FF,#de96df) | — |

### Body container

| Property | Mobile | Desktop |
|---|---|---|
| padding | 18px 16px 0 | (see desktop form pane) |
| display / flex-direction / gap | flex / column / 14px | — |

### Page title

| Property | Mobile | Desktop |
|---|---|---|
| text | "The basics" | "The basics" |
| font-size | 22px | 24px |
| font-weight | 800 | 800 |
| letter-spacing | — | -0.02em |

### Subtitle

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Who and where. Everything here can change later except the link." |
| font-size / color | — | 13.5px / #9AA8C7 |
| margin-top | — | 4px |
| max-width | — | 70ch |

### Asked-for note (mobile only banner)

| Property | Mobile | Desktop |
|---|---|---|
| presence | drawn | not drawn (desktop shows the "Asked for by" card in the right column) |
| text | "Filled in from 3 fan suggestions. Check the address." | — |
| border-radius | 12px | — |
| padding | 10px 12px | — |
| background | rgba(122,230,255,0.08) | — |
| border | 1px solid rgba(122,230,255,0.3) | — |
| font-size / color / line-height | 12.5px / #9AA8C7 / 1.45 | — |

## Component: Basics, form fields (shared styling)

All text inputs, selects and the number field use one box style on both breakpoints. The board draws them as div boxes showing values (no placeholder, no input element); the filled state is the only state drawn.

### Field label (Name, Address, Link, Capacity, Capacity type, Website)

| Property | Mobile | Desktop |
|---|---|---|
| font-size / weight / color | 12.5px / 600 / #9AA8C7 | 12.5px / 600 / #9AA8C7 |
| margin-bottom | 6px | 6px |

### Field box

| Property | Mobile | Desktop |
|---|---|---|
| height | 38px | 38px |
| border-radius | 10px | 10px |
| border | 1px solid #2C3661 | 1px solid #2C3661 |
| background | #070A1A | #070A1A |
| padding | 0 12px | 0 12px |
| display / align-items | flex / center | flex / center |
| font-size | 13.5px | 13.5px |
| color | inherits #E8F3FF | inherits #E8F3FF |

### Helper text (under Link)

| Property | Mobile | Desktop |
|---|---|---|
| text | "Made from the name. Change it before going live, not after." | same |
| font-size / color | 12px / #5A6788 | 12px / #5A6788 |
| margin-top | 5px | 5px |

## Component: Basics, field list and layout

| Property | Mobile | Desktop |
|---|---|---|
| fields shown, in order | Name, Address, Link, Capacity (select + number), no Website | Name, Address, Link, Capacity type + Capacity (two columns), Website |
| Website field | not drawn | drawn, value "dazzledenver.com" |
| field group wrapper display / flex-direction / gap | flex / column / 14px (body container, shared with title and banner) | flex / column / 16px |
| Name value | "Dazzle" | "Dazzle" |
| Address value | "1512 Curtis St, Denver" | "1512 Curtis St, Denver" |
| Link value | "/v/dazzle" | "/v/dazzle" |
| Capacity type value | "Seated" (inside the capacity select) | "Seated" |
| Capacity value | "300" | "300" |
| two-column grid (Basics main area) | — (single column) | display grid; grid-template-columns 1.25fr 1fr; gap 18px; align-items start |
| left column | — | flex column; gap 16px |
| right column | — | flex column; gap 16px |

### Capacity row

| Property | Mobile | Desktop |
|---|---|---|
| label | one label "Capacity" above both controls | two labels: "Capacity type" and "Capacity", one per control |
| container display | flex | grid |
| grid-template-columns | — | 1fr 1fr |
| gap | 8px | 10px |
| type control flex | 1.2 | — |
| number control flex | 1 | — |
| type control display / justify-content | flex / space-between | flex (justify not set) |
| type control chevron icon | drawn: svg 13 x 13, viewBox 0 0 16 16, fill none, stroke #9AA8C7, stroke-width 1.8, linecap round, linejoin round, display block, flex none, path "M4 6l4 4 4-4" | not drawn |

## Component: Basics, desktop step rail

### Rail container

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn (replaced by "Step 1 of 5" and progress bar) | drawn |
| position | — | absolute; left 0; top 0; bottom 68px (above footer) |
| width | — | 250px |
| border-right | — | 1px solid #1F2748 |
| padding | — | 24px 16px |
| display / flex-direction / gap | — | flex / column / 4px |

### Rail header (venue name)

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn | drawn |
| display / align-items / gap | — | flex / center / 10px |
| padding | — | 0 12px 14px |
| name text | — | "Dazzle"; 15px; weight 800 |
| subtitle text | — | "New venue · draft"; 12px; color #9AA8C7 |

### Rail step row (all states)

| Property | Mobile | Desktop |
|---|---|---|
| display / align-items / gap | not drawn | flex / center / 12px |
| padding | — | 10px 12px |
| border-radius | — | 10px |
| marker size | — | 22px x 22px; border-radius 50%; flex none |
| marker display / align / justify | — | flex / center / center |
| marker number font-size / weight | — | 11px / 700 |
| label wrapper | — | flex 1 |
| steps in order | — | 1 Basics, 2 Source, 3 Icon (Optional), 4 First-timer guide (Optional), 5 Review |

### Rail step, current (Basics)

| Property | Mobile | Desktop |
|---|---|---|
| row background | not drawn | #171D3A |
| marker background | — | #7AE6FF |
| marker number color | — | #070A1A |
| label font-size / weight / color | — | 14px / 700 / #E8F3FF |

### Rail step, future (Source, Icon, First-timer guide, Review)

| Property | Mobile | Desktop |
|---|---|---|
| row background | not drawn | — (none set) |
| marker background | — | #1F2748 |
| marker number color | — | #9AA8C7 |
| label font-size / weight / color | — | 14px / 600 / #9AA8C7 |

### Rail step, done

| Property | Mobile | Desktop |
|---|---|---|
| appearance | not drawn | not drawn (no board in the listed files shows a done step) |

### Rail "Optional" sublabel (Icon, First-timer guide only)

| Property | Mobile | Desktop |
|---|---|---|
| text | not drawn | "Optional" |
| font-size / color | — | 11.5px / #5A6788 |
| placement | — | below the step label, inside the flex 1 wrapper |
| Source and Review | — | no sublabel |

## Component: Basics, right-column cards (desktop only)

Neither card appears on mobile (mobile replaces "Asked for by" with the banner; robots.txt is not drawn on mobile).

### Card shell (both cards)

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn | drawn |
| border-radius | — | 14px |
| border | — | 1px solid #1F2748 |
| background | — | #11162E |
| padding | — | 16px 18px |
| display / flex-direction / gap | — | flex / column / 12px |
| title row display / align-items / gap | — | flex / center / 8px |
| title font-size / weight | — | 15px / 700 |
| title trailing spacer | — | flex 1 (empty) |

### "Asked for by" card

| Property | Mobile | Desktop |
|---|---|---|
| title | not drawn | "Asked for by" |
| body text | — | "3 fans suggested it since Oct 20, and it's named in 2 feedback notes. We filled in..." |
| body font-size / color / line-height | — | 13px / #9AA8C7 / 1.5 |
| condition shown | — | venue came from a request (the board's Dazzle is from "Set it up"); the from-scratch case is not drawn |

### "robots.txt" card

| Property | Mobile | Desktop |
|---|---|---|
| title | not drawn | "robots.txt" |
| status row display / align-items / gap | — | flex / center / 8px |
| pill display / align-items / gap | — | inline-flex / center / 6px |
| pill height / padding | — | 22px / 0 9px |
| pill border-radius | — | 999px |
| pill font-size / weight / line-height | — | 11.5px / 600 / 1 |
| pill white-space | — | nowrap |
| pill text (state: allows) | — | "Allows us" |
| pill color (allows) | — | #7BFFB0 |
| pill background (allows) | — | rgba(123,255,176,0.14) |
| pill border (allows) | — | 1px solid rgba(123,255,176,0.32) |
| pill dot (allows) | — | 6px x 6px; border-radius 50%; background #7BFFB0; flex none |
| checked-at text | — | "Checked just now"; 12.5px; color #9AA8C7 |
| disallows / unknown / checking states | — | not drawn on Basics (the Source step has its own robots.txt boards, out of scope) |

## Component: Basics, footer

### Footer container

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; left 0; right 0; bottom 0 (of the 390 x 844 screen) | absolute; left 0; right 0; bottom 0 (of the content pane) |
| height | — (content-sized) | 68px |
| padding | 12px 16px 24px | 0 28px |
| border-top | 1px solid #1F2748 | 1px solid #1F2748 |
| background | #0E1226 | rgba(14,18,38,0.85) |
| display / gap | flex / 8px | flex / 10px |
| align-items | — | center |

### Back button (ghost)

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn (mobile has Cancel at top instead) | drawn, text "Back" |
| display / align / justify / gap | — | inline-flex / center / center / 6px |
| height / padding | — | 38px / 0 12px |
| border-radius | — | 9px |
| font-size / weight | — | 13.5px / 600 |
| white-space | — | nowrap |
| background | — | transparent |
| color | — | #9AA8C7 |
| border | — | 1px solid transparent |

### Saved as you go

| Property | Mobile | Desktop |
|---|---|---|
| presence | not drawn | drawn, text "Saved as you go" |
| font-size / color | — | 12.5px / #5A6788 |
| margin-right | — | 6px |
| position | — | right group, left of Continue (preceded by flex 1 spacer) |

### Continue button (primary)

| Property | Mobile | Desktop |
|---|---|---|
| text | "Continue" | "Continue" |
| display / align / justify / gap | inline-flex / center / center / 6px | inline-flex / center / center / 6px |
| height | 46px | 38px |
| padding | 0 12px | 0 18px |
| border-radius | 9px | 9px |
| font-size | 15px | 13.5px |
| font-weight | 700 | 700 |
| white-space | nowrap | nowrap |
| flex | 1 (full width) | — (auto width, right aligned) |
| background | linear-gradient(135deg,#7AE6FF,#de96df) | linear-gradient(135deg,#7AE6FF,#de96df) |
| color | #070A1A | #070A1A |
| border | 1px solid transparent | 1px solid transparent |

### Desktop form pane (Basics)

| Property | Mobile | Desktop |
|---|---|---|
| position | n/a (body container above) | absolute; left 250px; right 0; top 0; bottom 68px |
| padding | — | 28px 32px |
| display / flex-direction / gap | — | flex / column / 18px |
| overflow | — | hidden |
| content-area wrapper (right of sidebar) | — | absolute; left 232px; right 0; top 56px; bottom 0; overflow hidden |

## Hover, focus, disabled

None of the four boards draws a hover, focus or disabled state for any control (Start from scratch, Continue, Back, Cancel, fields, rail steps). No row is written for them. Do not infer.

## Conditional rendering summary

| Item | Mobile | Desktop |
|---|---|---|
| Cancel | top-left of header with x icon | not drawn |
| Back | not drawn | footer left |
| "Step 1 of 5" and progress bar (20%) | drawn | not drawn |
| Step rail with Optional sublabels | not drawn | drawn |
| Breadcrumb topbar and sidebar | not drawn | drawn |
| "Saved as you go" | not drawn | drawn, footer right |
| Asked-for note | single-line banner above the fields | "Asked for by" card, right column |
| robots.txt panel | not drawn | right column card |
| Website field | not drawn | drawn |
| Capacity | one label, select with chevron plus number | two labelled columns |
| Footer Continue | full width, 46px | auto width, 38px |

## State coverage

States the boards draw for Start and Basics:

1. Start, nobody asked yet (empty list). Trigger: zero requested venues pending (no fan "Suggest a venue" choices or feedback venue names outstanding). Shows heading, explanatory text and the primary "Start from scratch" button. Desktop card only; the phone version of this state is not in the listed boards.
2. Start, populated list. Trigger: at least one requested venue pending. Shows title "Add a venue", subtitle, secondary "Start from scratch" button, and the "Venues people asked for" card (rows out of scope for this PR).
3. Basics, filled from a request, robots allowed, desktop. Trigger: the user chose "Set it up" on a requested venue, so name, address, link and capacity are prefilled, "Asked for by" card shows request counts, robots.txt card shows "Allows us" and "Checked just now". Rail current = Basics.
4. Basics, filled from a request, phone. Trigger: same as 3. Shows the "Filled in from 3 fan suggestions" banner, "Step 1 of 5" and the 20% progress bar. No robots.txt state is shown on phone.

Not drawn in the listed boards: Basics empty (start from scratch), a robots disallowed or unknown or checking state on Basics, a field error or validation message, a saving or failed state, a loading state, a done rail step, hover/focus/disabled. Mobile Start (populated or empty) exists only in phone-addendum and was not enumerated.
