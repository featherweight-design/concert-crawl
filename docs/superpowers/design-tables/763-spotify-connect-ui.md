# Design Property Table — #763 PR 5 · Connect Flow + Connections Settings + States

Source handoff: `design/design_handoff_spotify_sync/` (connect-flow.jsx, connections-settings.jsx, spotify-states.jsx). Enumerated by design-review Agent 1 (three parallel passes), 2026-07-19. Breakpoint note: the mocks are mobile-frame; values apply to both breakpoints unless a column differs. Desktop parity is behavioral + token-faithful.

---

# Part 1 — Connect Flow (connect-flow.jsx)

## Component: CFScreen (Shell)

### Root Container

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| width          | 100%             | 100%             |
| height         | 100%             | 100%             |
| background     | var(--bg)        | var(--bg)        |
| color          | var(--fg)        | var(--fg)        |
| font-family    | Inter, system-ui | Inter, system-ui |
| padding        | 58px 18px 20px   | 58px 18px 20px   |
| display        | flex             | flex             |
| flex-direction | column           | column           |
| overflow-y     | auto             | auto             |

## Component: ConnectEntry

### Breadcrumb + Eyebrow

| Property      | Mobile | Desktop |
| ------------- | ------ | ------- |
| display       | flex   | flex    |
| align-items   | center | center  |
| gap           | 8px    | 8px     |
| margin-bottom | 4px    | 4px     |

### Breadcrumb Arrow SVG

| Property        | Mobile               | Desktop              |
| --------------- | -------------------- | -------------------- |
| width           | 9px                  | 9px                  |
| height          | 15px                 | 15px                 |
| viewBox         | 0 0 9 15             | 0 0 9 15             |
| margin-right    | 2px                  | 2px                  |
| stroke          | var(--fg-muted)      | var(--fg-muted)      |
| stroke-width    | 1.8px                | 1.8px                |
| fill            | none                 | none                 |
| stroke-linecap  | round                | round                |
| stroke-linejoin | round                | round                |
| d               | M7.5 1L1.5 7.5l6 6.5 | M7.5 1L1.5 7.5l6 6.5 |

### Heading "Connections"

| Property       | Mobile    | Desktop   |
| -------------- | --------- | --------- |
| font-size      | 30px      | 30px      |
| font-weight    | 900       | 900       |
| letter-spacing | -0.035em  | -0.035em  |
| margin         | 6px 0 4px | 6px 0 4px |

### Subheading Text

| Property      | Mobile          | Desktop         |
| ------------- | --------------- | --------------- |
| font-size     | 13.5px          | 13.5px          |
| color         | var(--fg-muted) | var(--fg-muted) |
| line-height   | 1.4             | 1.4             |
| margin-bottom | 18px            | 18px            |

### Spotify Connection Card

| Property       | Mobile                  | Desktop                 |
| -------------- | ----------------------- | ----------------------- |
| border-radius  | 16px                    | 16px                    |
| background     | var(--surface-1)        | var(--surface-1)        |
| border         | 1px solid var(--border) | 1px solid var(--border) |
| padding        | 16px                    | 16px                    |
| display        | flex                    | flex                    |
| flex-direction | column                  | column                  |
| gap            | 14px                    | 14px                    |

### Card Header (Logo + Status)

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 12px   | 12px    |

### Card Title "Spotify"

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-weight    | 800     | 800     |
| font-size      | 16px    | 16px    |
| letter-spacing | -0.01em | -0.01em |

### Card Status Label "Not connected"

| Property       | Mobile                    | Desktop                   |
| -------------- | ------------------------- | ------------------------- |
| font-family    | JetBrains Mono, monospace | JetBrains Mono, monospace |
| font-size      | 9.5px                     | 9.5px                     |
| color          | var(--fg-subtle)          | var(--fg-subtle)          |
| letter-spacing | 0.08em                    | 0.08em                    |
| text-transform | uppercase                 | uppercase                 |
| margin-top     | 2px                       | 2px                       |

### Status Dot

| Property      | Mobile           | Desktop          |
| ------------- | ---------------- | ---------------- |
| width         | 9px              | 9px              |
| height        | 9px              | 9px              |
| border-radius | 9px              | 9px              |
| background    | var(--fg-subtle) | var(--fg-subtle) |
| opacity       | 0.5              | 0.5              |

### Card Description

| Property    | Mobile          | Desktop         |
| ----------- | --------------- | --------------- |
| font-size   | 13px            | 13px            |
| color       | var(--fg-muted) | var(--fg-muted) |
| line-height | 1.45            | 1.45            |

### GreenButton (Connect Spotify)

| Property        | Mobile              | Desktop             |
| --------------- | ------------------- | ------------------- |
| background      | var(--signal)       | var(--signal)       |
| color           | var(--fg-on-accent) | var(--fg-on-accent) |
| padding         | 14px 18px           | 14px 18px           |
| font-size       | 15px                | 15px                |
| font-weight     | 800                 | 800                 |
| border-radius   | 12px                | 12px                |
| width           | 100%                | 100%                |
| display         | inline-flex         | inline-flex         |
| align-items     | center              | center              |
| justify-content | center              | center              |
| gap             | 9px                 | 9px                 |
| letter-spacing  | -0.01em             | -0.01em             |
| cursor          | pointer             | pointer             |

### Trust Disclaimer

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| margin-top     | 14px             | 14px             |
| text-align     | center           | center           |
| font-size      | 9px              | 9px              |
| color          | var(--fg-subtle) | var(--fg-subtle) |
| letter-spacing | 0.1em            | 0.1em            |

## Component: FirstWatchNudge

### Card Wrapper

| Property      | Mobile                                                                                             | Desktop  |
| ------------- | -------------------------------------------------------------------------------------------------- | -------- |
| border-radius | 16px                                                                                               | 16px     |
| overflow      | hidden                                                                                             | hidden   |
| background    | linear-gradient(180deg, color-mix(in oklch, var(--signal) 9%, var(--surface-1)), var(--surface-1)) | same     |
| border        | 1px solid color-mix(in oklch, var(--signal) 26%, var(--border))                                    | same     |
| padding       | 16px                                                                                               | 16px     |
| position      | relative                                                                                           | relative |

### Dismiss Button (✕)

| Property    | Mobile           | Desktop          |
| ----------- | ---------------- | ---------------- |
| position    | absolute         | absolute         |
| top         | 12px             | 12px             |
| right       | 12px             | 12px             |
| color       | var(--fg-subtle) | var(--fg-subtle) |
| font-size   | 16px             | 16px             |
| line-height | 1                | 1                |
| cursor      | pointer          | pointer          |
| background  | transparent      | transparent      |
| border      | none             | none             |
| padding     | 0                | 0                |

### Header with SpotifyLogo + Eyebrow

| Property      | Mobile | Desktop |
| ------------- | ------ | ------- |
| display       | flex   | flex    |
| align-items   | center | center  |
| gap           | 8px    | 8px     |
| margin-bottom | 10px   | 10px    |

### Eyebrow "NICE — FIRST ONE SAVED"

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| font-size      | 9px           | 9px           |
| color          | var(--signal) | var(--signal) |
| letter-spacing | 0.14em        | 0.14em        |

### Card Heading

| Property       | Mobile    | Desktop   |
| -------------- | --------- | --------- |
| font-size      | 17px      | 17px      |
| font-weight    | 800       | 800       |
| letter-spacing | -0.02em   | -0.02em   |
| line-height    | 1.2       | 1.2       |
| color          | var(--fg) | var(--fg) |

### Card Body Text

| Property      | Mobile          | Desktop         |
| ------------- | --------------- | --------------- |
| font-size     | 13px            | 13px            |
| color         | var(--fg-muted) | var(--fg-muted) |
| line-height   | 1.4             | 1.4             |
| margin-top    | 6px             | 6px             |
| margin-bottom | 14px            | 14px            |

### Action Buttons Row

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| display  | flex   | flex    |
| gap      | 8px    | 8px     |

### Connect Button (sm)

| Property      | Mobile              | Desktop             |
| ------------- | ------------------- | ------------------- |
| padding       | 9px 14px            | 9px 14px            |
| font-size     | 13px                | 13px                |
| background    | var(--signal)       | var(--signal)       |
| color         | var(--fg-on-accent) | var(--fg-on-accent) |
| border-radius | 12px                | 12px                |
| flex          | 1                   | 1                   |

### Not Now Button

| Property    | Mobile           | Desktop          |
| ----------- | ---------------- | ---------------- |
| padding     | 9px 14px         | 9px 14px         |
| font-family | Inter, system-ui | Inter, system-ui |
| font-weight | 700              | 700              |
| font-size   | 13px             | 13px             |
| color       | var(--fg-muted)  | var(--fg-muted)  |
| cursor      | pointer          | pointer          |
| background  | transparent      | transparent      |
| border      | none             | none             |

## Component: OAuthHandoff

### Connection Glyph Pair Container

| Property        | Mobile      | Desktop     |
| --------------- | ----------- | ----------- |
| display         | flex        | flex        |
| align-items     | center      | center      |
| justify-content | center      | center      |
| gap             | 14px        | 14px        |
| margin          | 18px 0 22px | 18px 0 22px |

### Connection Dot Sequence (3x)

| Property      | Mobile         | Desktop        |
| ------------- | -------------- | -------------- |
| width         | 5px            | 5px            |
| height        | 5px            | 5px            |
| border-radius | 5px            | 5px            |
| background    | var(--signal)  | var(--signal)  |
| opacity       | 0.4, 0.65, 0.9 | 0.4, 0.65, 0.9 |

### Eyebrow "HANDING OFF TO SPOTIFY"

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| font-size      | 10px          | 10px          |
| color          | var(--signal) | var(--signal) |
| letter-spacing | 0.16em        | 0.16em        |
| text-align     | center        | center        |
| margin-bottom  | 4px           | 4px           |

### Main Heading

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-size      | 25px    | 25px    |
| font-weight    | 900     | 900     |
| letter-spacing | -0.03em | -0.03em |
| text-align     | center  | center  |
| line-height    | 1.15    | 1.15    |
| margin         | 8px 0   | 8px 0   |

### Subheading

| Property      | Mobile          | Desktop         |
| ------------- | --------------- | --------------- |
| font-size     | 13.5px          | 13.5px          |
| color         | var(--fg-muted) | var(--fg-muted) |
| line-height   | 1.45            | 1.45            |
| text-align    | center          | center          |
| max-width     | 320px           | 320px           |
| align-self    | center          | center          |
| margin-bottom | 22px            | 22px            |

### Honesty Rail Card

| Property      | Mobile                  | Desktop                 |
| ------------- | ----------------------- | ----------------------- |
| border-radius | 16px                    | 16px                    |
| background    | var(--surface-1)        | var(--surface-1)        |
| border        | 1px solid var(--border) | 1px solid var(--border) |
| padding       | 16px                    | 16px                    |
| margin-bottom | 18px                    | 18px                    |

### Button Footer

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| margin-top     | auto   | auto    |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 10px   | 10px    |

### Continue Button

| Property      | Mobile              | Desktop             |
| ------------- | ------------------- | ------------------- |
| background    | var(--signal)       | var(--signal)       |
| color         | var(--fg-on-accent) | var(--fg-on-accent) |
| padding       | 14px 18px           | 14px 18px           |
| font-size     | 15px                | 15px                |
| font-weight   | 800                 | 800                 |
| border-radius | 12px                | 12px                |
| width         | 100%                | 100%                |

### Cancel Button

| Property    | Mobile          | Desktop         |
| ----------- | --------------- | --------------- |
| text-align  | center          | center          |
| padding     | 10px            | 10px            |
| font-weight | 700             | 700             |
| font-size   | 14px            | 14px            |
| color       | var(--fg-muted) | var(--fg-muted) |
| background  | transparent     | transparent     |
| border      | none            | none            |

## Component: ConnectSuccess

### Center Container

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| align-items    | center | center  |
| text-align     | center | center  |
| margin-top     | 8px    | 8px     |

### Success Badge

| Property        | Mobile                                                         | Desktop       |
| --------------- | -------------------------------------------------------------- | ------------- |
| width           | 68px                                                           | 68px          |
| height          | 68px                                                           | 68px          |
| border-radius   | 20px                                                           | 20px          |
| background      | var(--signal)                                                  | var(--signal) |
| display         | flex                                                           | flex          |
| align-items     | center                                                         | center        |
| justify-content | center                                                         | center        |
| box-shadow      | 0 8px 30px color-mix(in oklch, var(--signal) 40%, transparent) | same          |
| margin-bottom   | 16px                                                           | 16px          |

### Success Checkmark SVG

| Property        | Mobile                | Desktop               |
| --------------- | --------------------- | --------------------- |
| width           | 34px                  | 34px                  |
| height          | 34px                  | 34px                  |
| viewBox         | 0 0 34 34             | 0 0 34 34             |
| fill            | none                  | none                  |
| stroke          | #0A0A0A               | #0A0A0A               |
| stroke-width    | 3.4px                 | 3.4px                 |
| stroke-linecap  | round                 | round                 |
| stroke-linejoin | round                 | round                 |
| d               | M9 17.5l5.5 5.5L25 11 | M9 17.5l5.5 5.5L25 11 |

### Eyebrow "SPOTIFY · LINKED"

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| font-size      | 10px          | 10px          |
| color          | var(--signal) | var(--signal) |
| letter-spacing | 0.16em        | 0.16em        |
| text-align     | center        | center        |

### Main Heading

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-size      | 26px    | 26px    |
| font-weight    | 900     | 900     |
| letter-spacing | -0.03em | -0.03em |
| line-height    | 1.12    | 1.12    |
| margin         | 8px 0   | 8px 0   |

### Subheading with Emphasis

| Property    | Mobile          | Desktop         |
| ----------- | --------------- | --------------- |
| font-size   | 13.5px          | 13.5px          |
| color       | var(--fg-muted) | var(--fg-muted) |
| line-height | 1.45            | 1.45            |
| max-width   | 320px           | 320px           |

### Stat Strip

| Property        | Mobile                  | Desktop                 |
| --------------- | ----------------------- | ----------------------- |
| display         | flex                    | flex                    |
| justify-content | space-around            | space-around            |
| gap             | 8px                     | 8px                     |
| margin          | 20px 0 16px             | 20px 0 16px             |
| padding         | 14px 8px                | 14px 8px                |
| border-radius   | 14px                    | 14px                    |
| background      | var(--surface-1)        | var(--surface-1)        |
| border          | 1px solid var(--border) | 1px solid var(--border) |

### Stat Divider

| Property   | Mobile        | Desktop       |
| ---------- | ------------- | ------------- |
| width      | 1px           | 1px           |
| background | var(--border) | var(--border) |

### Artist Chip Row

| Property      | Mobile | Desktop |
| ------------- | ------ | ------- |
| display       | flex   | flex    |
| flex-wrap     | wrap   | wrap    |
| gap           | 8px    | 8px     |
| margin-bottom | 22px   | 22px    |

### More Artists Badge

| Property      | Mobile                          | Desktop          |
| ------------- | ------------------------------- | ---------------- |
| display       | inline-flex                     | inline-flex      |
| align-items   | center                          | center           |
| padding       | 6px 12px                        | 6px 12px         |
| border-radius | 999px                           | 999px            |
| background    | var(--surface-2)                | var(--surface-2) |
| border        | 1px dashed var(--border-strong) | same             |
| font-family   | JetBrains Mono, monospace       | same             |
| font-size     | 11px                            | 11px             |
| color         | var(--fg-muted)                 | var(--fg-muted)  |

## Component: AutoWatchSheet

### Sheet Chrome

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| height   | 72%    | 72%     |

### Inner Padding

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| padding        | 6px 20px 20px | 6px 20px 20px |
| display        | flex          | flex          |
| flex-direction | column        | column        |
| height         | 100%          | 100%          |
| overflow-y     | auto          | auto          |

### Header with Logo + Eyebrow

| Property      | Mobile | Desktop |
| ------------- | ------ | ------- |
| display       | flex   | flex    |
| align-items   | center | center  |
| gap           | 8px    | 8px     |
| margin-bottom | 14px   | 14px    |

### Eyebrow "9 ARTISTS PLAY DENVER"

| Property       | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| font-size      | 9px           | 9px           |
| color          | var(--signal) | var(--signal) |
| letter-spacing | 0.14em        | 0.14em        |

### Sheet Heading

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-size      | 22px    | 22px    |
| font-weight    | 900     | 900     |
| letter-spacing | -0.03em | -0.03em |
| line-height    | 1.15    | 1.15    |
| margin-bottom  | 6px     | 6px     |

### Sheet Description

| Property      | Mobile          | Desktop         |
| ------------- | --------------- | --------------- |
| font-size     | 13.5px          | 13.5px          |
| color         | var(--fg-muted) | var(--fg-muted) |
| line-height   | 1.45            | 1.45            |
| margin-bottom | 18px            | 18px            |

### Options Container

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 10px   | 10px    |

### Option Item (Opt)

| Property      | Mobile  | Desktop |
| ------------- | ------- | ------- |
| border-radius | 14px    | 14px    |
| padding       | 15px    | 15px    |
| cursor        | pointer | pointer |

### Option Item — Unselected

| Property   | Mobile                  | Desktop                 |
| ---------- | ----------------------- | ----------------------- |
| background | var(--surface-1)        | var(--surface-1)        |
| border     | 1px solid var(--border) | 1px solid var(--border) |

### Option Item — Selected

| Property   | Mobile                                                   | Desktop |
| ---------- | -------------------------------------------------------- | ------- |
| background | color-mix(in oklch, var(--signal) 10%, var(--surface-1)) | same    |
| border     | 1.5px solid var(--signal)                                | same    |

### Option Icon Container

| Property        | Mobile | Desktop |
| --------------- | ------ | ------- |
| width           | 38px   | 38px    |
| height          | 38px   | 38px    |
| border-radius   | 10px   | 10px    |
| flex-shrink     | 0      | 0       |
| display         | flex   | flex    |
| align-items     | center | center  |
| justify-content | center | center  |

### Icon Container — Unselected

| Property   | Mobile           | Desktop          |
| ---------- | ---------------- | ---------------- |
| background | var(--surface-3) | var(--surface-3) |
| color      | var(--fg-muted)  | var(--fg-muted)  |

### Icon Container — Selected

| Property   | Mobile              | Desktop             |
| ---------- | ------------------- | ------------------- |
| background | var(--signal)       | var(--signal)       |
| color      | var(--fg-on-accent) | var(--fg-on-accent) |

### Option Title

| Property       | Mobile    | Desktop   |
| -------------- | --------- | --------- |
| font-weight    | 800       | 800       |
| font-size      | 15px      | 15px      |
| letter-spacing | -0.01em   | -0.01em   |
| color          | var(--fg) | var(--fg) |

### Option Badge (DEFAULT)

| Property       | Mobile                         | Desktop          |
| -------------- | ------------------------------ | ---------------- |
| font-family    | JetBrains Mono, monospace      | same             |
| font-size      | 8px                            | 8px              |
| font-weight    | 700                            | 700              |
| letter-spacing | 0.1em                          | 0.1em            |
| color          | var(--fg-subtle)               | var(--fg-subtle) |
| border         | 1px solid var(--border-strong) | same             |
| border-radius  | 4px                            | 4px              |
| padding        | 2px 5px                        | 2px 5px          |

### Option Body

| Property    | Mobile          | Desktop         |
| ----------- | --------------- | --------------- |
| font-size   | 12.5px          | 12.5px          |
| color       | var(--fg-muted) | var(--fg-muted) |
| line-height | 1.4             | 1.4             |
| margin-top  | 4px             | 4px             |

### Option Radio (Unselected)

| Property      | Mobile                         | Desktop     |
| ------------- | ------------------------------ | ----------- |
| width         | 20px                           | 20px        |
| height        | 20px                           | 20px        |
| border-radius | 999px                          | 999px       |
| border        | 2px solid var(--border-strong) | same        |
| background    | transparent                    | transparent |
| box-sizing    | border-box                     | border-box  |

### Option Radio (Selected)

| Property      | Mobile                  | Desktop    |
| ------------- | ----------------------- | ---------- |
| width         | 20px                    | 20px       |
| height        | 20px                    | 20px       |
| border-radius | 999px                   | 999px      |
| border        | 6px solid var(--signal) | same       |
| background    | var(--bg)               | var(--bg)  |
| box-sizing    | border-box              | border-box |

### Footer Help Text

| Property       | Mobile           | Desktop          |
| -------------- | ---------------- | ---------------- |
| text-align     | center           | center           |
| margin-top     | 10px             | 10px             |
| font-size      | 9px              | 9px              |
| color          | var(--fg-subtle) | var(--fg-subtle) |
| letter-spacing | 0.08em           | 0.08em           |

## Connect-Flow Copy Constants

### ConnectEntry

- Breadcrumb: "SETTINGS" · Heading: "Connections"
- Subheading: "Link a service and we'll tune your browsing to what you already love. One thing so far."
- Status: "Not connected"
- Description: "Bring over the artists you already follow and play the most. We'll flag their Denver shows the moment they land."
- Button: "Connect Spotify"
- Disclaimer: "READ-ONLY · UNLINK ANYTIME · WE NEVER SEE YOUR PASSWORD"

### FirstWatchNudge

- Eyebrow: "NICE — FIRST ONE SAVED"
- Heading: "Want the rest picked for your taste?"
- Body: "Link Spotify and we'll surface shows from the artists you already play — no more scrolling past them."
- Buttons: "Connect Spotify" / "Not now"

### OAuthHandoff

- Eyebrow: "HANDING OFF TO SPOTIFY"
- Heading: "You'll log in on Spotify's page — not ours."
- Body: "We ask Spotify one question: which artists do you love? Here's exactly what that does and doesn't mean."
- Buttons: "Continue to Spotify" / "Cancel"

### ConnectSuccess

- Eyebrow: "SPOTIFY · LINKED"
- Heading: "Got it. We know your taste now."
- Body: "Here's what you told Spotify you love — **{N} artists**, and **{M}** of them play Denver."
- Stats: {N}/Artists, {M}/Play Denver, Now/Synced · Chip overflow: "+{K} more" · Recognized heading: "WE RECOGNIZED"
- Button: "See my Denver shows"

### AutoWatchSheet

- Eyebrow: "{M} ARTISTS PLAY DENVER"
- Heading: "Want us to watch these for you?"
- Body: "\"Watching\" a show means you get a heads-up on new dates and price drops. Your call how eager we are."
- Option auto: "Auto-watch matching shows" / "We'll add all {M} to your Watching list now, and any new match automatically. Undo any single one anytime."
- Option highlight (DEFAULT badge): "Just highlight them" / "We'll mark matching shows with a 'You follow' badge as you browse. You decide what to watch."
- Button (auto): "Auto-watch {M} shows" · Button (highlight): "Highlight as I browse"
- Footer: "CHANGE THIS ANYTIME IN SETTINGS ▸ CONNECTIONS"

---

# Part 2 — Connections Settings (connections-settings.jsx)

## Component: ConnHeader

### Heading

| Property       | Mobile     | Desktop    |
| -------------- | ---------- | ---------- |
| font-size      | 30px       | 30px       |
| font-weight    | 900        | 900        |
| letter-spacing | -0.035em   | -0.035em   |
| margin         | 6px 0 18px | 6px 0 18px |

### Eyebrow "SETTINGS"

| Property       | Mobile    | Desktop   |
| -------------- | --------- | --------- |
| font-size      | 10px      | 10px      |
| letter-spacing | 0.16em    | 0.16em    |
| text-transform | uppercase | uppercase |

## Component: CardRow

| Property        | Mobile                                               | Desktop       |
| --------------- | ---------------------------------------------------- | ------------- |
| display         | flex                                                 | flex          |
| align-items     | center                                               | center        |
| justify-content | space-between                                        | space-between |
| gap             | 12px                                                 | 12px          |
| padding         | 13px 0                                               | 13px 0        |
| border-top      | 1px solid var(--border) (top=false); none (top=true) | same          |

### Label

| Property    | Mobile          | Desktop         |
| ----------- | --------------- | --------------- |
| font-size   | 13.5px          | 13.5px          |
| color       | var(--fg-muted) | var(--fg-muted) |
| font-weight | 500             | 500             |

## Component: ConnectedCard

### Card Container

| Property      | Mobile                  | Desktop          |
| ------------- | ----------------------- | ---------------- |
| border-radius | 16px                    | 16px             |
| background    | var(--surface-1)        | var(--surface-1) |
| border        | 1px solid var(--border) | same             |
| overflow      | hidden                  | hidden           |

### Header

| Property      | Mobile                  | Desktop |
| ------------- | ----------------------- | ------- |
| padding       | 16px                    | 16px    |
| display       | flex                    | flex    |
| align-items   | center                  | center  |
| gap           | 12px                    | 12px    |
| border-bottom | 1px solid var(--border) | same    |

### Spotify Logo Slot

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| size     | 44px   | 44px    |

### "Spotify" Text

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-weight    | 800     | 800     |
| font-size      | 16px    | 16px    |
| letter-spacing | -0.01em | -0.01em |

### Linked Status Badge

| Property      | Mobile                                                        | Desktop     |
| ------------- | ------------------------------------------------------------- | ----------- |
| display       | inline-flex                                                   | inline-flex |
| align-items   | center                                                        | center      |
| gap           | 5px                                                           | 5px         |
| padding       | 2px 7px                                                       | 2px 7px     |
| border-radius | 999px                                                         | 999px       |
| background    | color-mix(in oklch, var(--signal) 15%, transparent)           | same        |
| border        | 1px solid color-mix(in oklch, var(--signal) 32%, transparent) | same        |

### Status Dot

| Property      | Mobile                | Desktop       |
| ------------- | --------------------- | ------------- |
| width         | 6px                   | 6px           |
| height        | 6px                   | 6px           |
| border-radius | 6px                   | 6px           |
| background    | var(--signal)         | var(--signal) |
| box-shadow    | 0 0 6px var(--signal) | same          |

### Linked Label "LINKED"

| Property       | Mobile                    | Desktop       |
| -------------- | ------------------------- | ------------- |
| font-family    | JetBrains Mono, monospace | same          |
| font-size      | 8.5px                     | 8.5px         |
| font-weight    | 700                       | 700           |
| letter-spacing | 0.1em                     | 0.1em         |
| color          | var(--signal)             | var(--signal) |
| text-transform | uppercase                 | uppercase     |

### Account Handle

| Property       | Mobile                    | Desktop          |
| -------------- | ------------------------- | ---------------- |
| font-family    | JetBrains Mono, monospace | same             |
| font-size      | 10px                      | 10px             |
| color          | var(--fg-subtle)          | var(--fg-subtle) |
| letter-spacing | 0.04em                    | 0.04em           |
| margin-top     | 3px                       | 3px              |
| white-space    | nowrap                    | nowrap           |
| overflow       | hidden                    | hidden           |
| text-overflow  | ellipsis                  | ellipsis         |

### Stats + Meta Section

| Property | Mobile       | Desktop      |
| -------- | ------------ | ------------ |
| padding  | 2px 16px 6px | 2px 16px 6px |

### "Artists we know" Value

| Property    | Mobile                | Desktop |
| ----------- | --------------------- | ------- |
| font-weight | 800                   | 800     |
| font-size   | 14px                  | 14px    |
| copy        | {N} · {M} play Denver | same    |

### Last Synced — Idle

| Property    | Mobile                    | Desktop         |
| ----------- | ------------------------- | --------------- |
| font-family | JetBrains Mono, monospace | same            |
| font-size   | 11px                      | 11px            |
| color       | var(--fg-muted)           | var(--fg-muted) |

### Last Synced — Syncing

| Property    | Mobile                    | Desktop       |
| ----------- | ------------------------- | ------------- |
| display     | inline-flex               | inline-flex   |
| align-items | center                    | center        |
| gap         | 7px                       | 7px           |
| font-family | JetBrains Mono, monospace | same          |
| font-size   | 11px                      | 11px          |
| color       | var(--signal)             | var(--signal) |
| copy        | Syncing…                  | Syncing…      |

### Syncing Spinner

| Property         | Mobile                                                        | Desktop       |
| ---------------- | ------------------------------------------------------------- | ------------- |
| width            | 11px                                                          | 11px          |
| height           | 11px                                                          | 11px          |
| border-radius    | 999px                                                         | 999px         |
| border           | 2px solid color-mix(in oklch, var(--signal) 30%, transparent) | same          |
| border-top-color | var(--signal)                                                 | var(--signal) |
| animation        | spin 0.8s linear infinite                                     | same          |

### Auto-watch Toggle Container

| Property         | Mobile                         | Desktop |
| ---------------- | ------------------------------ | ------- |
| width            | 40px                           | 40px    |
| height           | 24px                           | 24px    |
| border-radius    | 999px                          | 999px   |
| background (off) | var(--surface-3)               | same    |
| border           | 1px solid var(--border-strong) | same    |

### Auto-watch Toggle Thumb (off)

| Property      | Mobile           | Desktop          |
| ------------- | ---------------- | ---------------- |
| top           | 2px              | 2px              |
| left          | 2px              | 2px              |
| width         | 18px             | 18px             |
| height        | 18px             | 18px             |
| border-radius | 999px            | 999px            |
| background    | var(--fg-subtle) | var(--fg-subtle) |

### Actions Section

| Property   | Mobile                  | Desktop |
| ---------- | ----------------------- | ------- |
| padding    | 12px                    | 12px    |
| display    | flex                    | flex    |
| gap        | 8px                     | 8px     |
| border-top | 1px solid var(--border) | same    |

### Refresh Button (ghost tone)

| Property       | Mobile                                                            | Desktop       |
| -------------- | ----------------------------------------------------------------- | ------------- |
| flex           | 1                                                                 | 1             |
| padding        | 9px 14px                                                          | 9px 14px      |
| border-radius  | 12px                                                              | 12px          |
| background     | transparent                                                       | transparent   |
| border         | 1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border)) | same          |
| font-weight    | 800                                                               | 800           |
| font-size      | 13px                                                              | 13px          |
| letter-spacing | -0.01em                                                           | -0.01em       |
| color          | var(--signal)                                                     | var(--signal) |
| copy           | Refresh my taste / Syncing…                                       | same          |

### Refresh Icon SVG

| Property        | Mobile                                 | Desktop      |
| --------------- | -------------------------------------- | ------------ |
| width           | 15px                                   | 15px         |
| height          | 15px                                   | 15px         |
| viewBox         | 0 0 15 15                              | 0 0 15 15    |
| stroke          | currentColor                           | currentColor |
| stroke-width    | 1.5                                    | 1.5          |
| stroke-linecap  | round                                  | round        |
| stroke-linejoin | round                                  | round        |
| d               | M13 7.5a5.5 5.5 0 11-1.6-3.9M13 2v3h-3 | same         |

### Disconnect Button

| Property      | Mobile                         | Desktop         |
| ------------- | ------------------------------ | --------------- |
| padding       | 9px 14px                       | 9px 14px        |
| border-radius | 12px                           | 12px            |
| border        | 1px solid var(--border-strong) | same            |
| font-weight   | 700                            | 700             |
| font-size     | 13px                           | 13px            |
| color         | var(--fg-muted)                | var(--fg-muted) |
| copy          | Disconnect                     | Disconnect      |

### Info Text (below card)

| Property          | Mobile                                                                                                   | Desktop          |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ---------------- |
| margin-top        | 14px                                                                                                     | 14px             |
| padding           | 0 4px                                                                                                    | 0 4px            |
| font-size         | 12px                                                                                                     | 12px             |
| color             | var(--fg-subtle)                                                                                         | var(--fg-subtle) |
| line-height       | 1.5                                                                                                      | 1.5              |
| copy (idle)       | Refresh pulls your latest top & followed artists — we also refresh quietly on our own about once a week. | same             |
| copy (refreshing) | Checking Spotify for anything new since your last sync. Takes a few seconds.                             | same             |

## Component: DisconnectConfirm (sheet)

### Content Container

| Property       | Mobile         | Desktop        |
| -------------- | -------------- | -------------- |
| padding        | 10px 22px 22px | 10px 22px 22px |
| display        | flex           | flex           |
| flex-direction | column         | column         |

### Logo + Danger Indicator row

| Property      | Mobile | Desktop |
| ------------- | ------ | ------- |
| display       | flex   | flex    |
| align-items   | center | center  |
| gap           | 10px   | 10px    |
| margin-bottom | 16px   | 16px    |

### Spotify Logo

| Property | Mobile | Desktop |
| -------- | ------ | ------- |
| size     | 40px   | 40px    |

### Danger Badge

| Property      | Mobile                         | Desktop       |
| ------------- | ------------------------------ | ------------- |
| position      | absolute                       | absolute      |
| right         | -4px                           | -4px          |
| bottom        | -4px                           | -4px          |
| width         | 18px                           | 18px          |
| height        | 18px                           | 18px          |
| border-radius | 999px                          | 999px         |
| background    | var(--bg)                      | var(--bg)     |
| border        | 1px solid var(--border-strong) | same          |
| color         | var(--danger)                  | var(--danger) |
| font-size     | 12px                           | 12px          |
| font-weight   | 800                            | 800           |
| content       | ✕                              | ✕             |

### Heading "Unlink Spotify?"

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-size      | 22px    | 22px    |
| font-weight    | 900     | 900     |
| letter-spacing | -0.03em | -0.03em |
| line-height    | 1.15    | 1.15    |
| margin-bottom  | 8px     | 8px     |

### Subheading

| Property      | Mobile                                                               | Desktop         |
| ------------- | -------------------------------------------------------------------- | --------------- |
| font-size     | 13.5px                                                               | 13.5px          |
| color         | var(--fg-muted)                                                      | var(--fg-muted) |
| line-height   | 1.5                                                                  | 1.5             |
| margin-bottom | 16px                                                                 | 16px            |
| copy          | No hard feelings. Here's exactly what happens the second you tap it: | same            |

### Consequence List

| Property   | Mobile                                                                          | Desktop |
| ---------- | ------------------------------------------------------------------------------- | ------- |
| display    | flex column                                                                     | same    |
| gap        | 11px                                                                            | 11px    |
| item dot   | 5px round, var(--fg-subtle) (items 1–2), var(--signal) (item 3), margin-top 7px | same    |
| item title | 13.5px / 700 / var(--fg)                                                        | same    |
| item body  | 13px / var(--fg-muted)                                                          | same    |

### Consequence copy

1. "We drop the connection." / "Your Spotify token is deleted — we forget how to reach it."
2. "Taste highlights switch off." / "No more 'You follow' flags. Your browsing goes back to plain."
3. "Shows you're watching stay." / "Anything you already saved is yours — unlinking never touches it."

### Unlink Button

| Property      | Mobile                                                        | Desktop        |
| ------------- | ------------------------------------------------------------- | -------------- |
| width         | 100%                                                          | 100%           |
| text-align    | center                                                        | center         |
| padding       | 13px                                                          | 13px           |
| border-radius | 12px                                                          | 12px           |
| background    | color-mix(in oklch, var(--danger) 14%, transparent)           | same           |
| border        | 1px solid color-mix(in oklch, var(--danger) 42%, transparent) | same           |
| font-weight   | 800                                                           | 800            |
| font-size     | 15px                                                          | 15px           |
| color         | var(--danger)                                                 | var(--danger)  |
| copy          | Unlink Spotify                                                | Unlink Spotify |

### Keep Linked Button

| Property  | Mobile         | Desktop        |
| --------- | -------------- | -------------- |
| component | GhostButton    | GhostButton    |
| copy      | Keep it linked | Keep it linked |

---

# Part 3 — Spotify States (spotify-states.jsx)

## Component: StateBody (shared)

### Eyebrow Label

| Property       | Mobile                                                   | Desktop   |
| -------------- | -------------------------------------------------------- | --------- |
| font-family    | JetBrains Mono, monospace                                | same      |
| font-size      | 10px                                                     | 10px      |
| font-weight    | 700                                                      | 700       |
| letter-spacing | 0.16em                                                   | 0.16em    |
| text-transform | uppercase                                                | uppercase |
| color          | var(--danger) / var(--signal) / var(--fg-subtle) by tone | same      |
| margin-bottom  | 10px                                                     | 10px      |
| display        | flex; align-items center; gap 7px                        | same      |

### Eyebrow Dot

| Property      | Mobile               | Desktop |
| ------------- | -------------------- | ------- |
| width/height  | 5px                  | 5px     |
| border-radius | 5px                  | 5px     |
| background    | matches eyebrow tone | same    |

### Title

| Property       | Mobile  | Desktop |
| -------------- | ------- | ------- |
| font-size      | 25px    | 25px    |
| font-weight    | 900     | 900     |
| letter-spacing | -0.03em | -0.03em |
| line-height    | 1.14    | 1.14    |
| margin-bottom  | 10px    | 10px    |
| max-width      | 300px   | 300px   |

### Body Text

| Property      | Mobile          | Desktop         |
| ------------- | --------------- | --------------- |
| font-size     | 13.5px          | 13.5px          |
| color         | var(--fg-muted) | var(--fg-muted) |
| line-height   | 1.5             | 1.5             |
| max-width     | 300px           | 300px           |
| margin-bottom | 22px            | 22px            |

### Actions Container

| Property  | Mobile                | Desktop |
| --------- | --------------------- | ------- |
| width     | 100%                  | 100%    |
| max-width | 300px                 | 300px   |
| display   | flex column; gap 10px | same    |

### Wrapper

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| margin      | auto 0 | auto 0  |
| align-items | center | center  |
| text-align  | center | center  |

## Component: GreenDisc

| Property            | Mobile                                                        | Desktop |
| ------------------- | ------------------------------------------------------------- | ------- |
| width/height        | 72px                                                          | 72px    |
| border-radius       | 20px                                                          | 20px    |
| background (green)  | color-mix(in oklch, var(--signal) 14%, var(--surface-1))      | same    |
| background (danger) | color-mix(in oklch, var(--danger) 16%, var(--surface-1))      | same    |
| background (muted)  | var(--surface-2)                                              | same    |
| border (green)      | 1px solid color-mix(in oklch, var(--signal) 30%, transparent) | same    |
| border (danger)     | 1px solid color-mix(in oklch, var(--danger) 36%, transparent) | same    |
| border (muted)      | 1px solid var(--border-strong)                                | same    |

## Component: EmptyDenverMatch

- Eyebrow (green): "{N} artists · 0 in denver" · Title: "We got your taste. Denver didn't — yet."
- Body: "None of your {N} artists have a Denver date on the books right now. The second one does, it jumps to the top of your list."
- Primary: "Watch for my artists" (SignalButton 13px 18px pad, 12px radius, var(--signal) bg) · Secondary: "Browse everything instead" (11px pad, 700, 14px, var(--fg-muted))
- Glyph: GreenDisc(green) + SpotifyLogo 36px, radius 11px

## Component: FailConnectDown

- Eyebrow (muted): "spotify · no answer" · Title: "Spotify's not picking up."
- Body: "Nothing you did — their side just isn't answering right now. Nothing was linked, so there's nothing to undo."
- Primary: "Try again" · Secondary: "Maybe later"
- Glyph: GreenDisc(muted); NoAnswer SVG 34×34 viewBox 0 0 34 34; path1 stroke var(--fg-subtle) 2.2 round d="M6 10s5-4 11-4 11 4 11 4M9 16s3.5-3 8-3 8 3 8 3M12 22s2-1.5 5-1.5 5 1.5 5 1.5"; path2 stroke var(--fg-muted) 2.2 round d="M4 4l26 26"

## Component: FailTokenRefresh

- Eyebrow (danger): "sync · lost the thread" · Title: "We lost the Spotify thread."
- Body: "Your link expired and Spotify wants a fresh hello. Your saved shows are safe — we just can't spot new matches until you reconnect."
- Primary: "Reconnect Spotify" · Secondary: "Not now"
- Glyph: GreenDisc(danger); SVG 32×32; path1 var(--danger) 2.6 round d="M16 3v10M16 22v.5"; path2 var(--danger) 2.2 round opacity 0.5 d="M27 27a15 15 0 00-22 0"

## Component: FailExternalRevoke

- Eyebrow (muted): "link · cut on spotify's side" · Title: "You unlinked us over on Spotify."
- Body: "Totally fair — and it worked. We've cleared the connection here too. Want back in? It's one tap."
- Primary: "Reconnect Spotify" · Secondary: "Leave it unlinked"
- Glyph: GreenDisc(muted); SVG 32×32; path1 var(--fg-muted) 2 round d="M13 19l6-6m-4.5-3l1.5-1.5a5 5 0 017 7L21 17m-10 0l-1.5 1.5a5 5 0 007 7l1.5-1.5"; path2 var(--danger) 2.2 round d="M5 5l22 22"

## Component: RevokeBanner

### Outer Container

| Property      | Mobile                                                           | Desktop   |
| ------------- | ---------------------------------------------------------------- | --------- |
| display       | flex                                                             | flex      |
| align-items   | center                                                           | center    |
| gap           | 11px                                                             | 11px      |
| padding       | 12px 14px                                                        | 12px 14px |
| border-radius | 14px                                                             | 14px      |
| background    | color-mix(in oklch, var(--warning) 12%, var(--surface-1))        | same      |
| border        | 1px solid color-mix(in oklch, var(--warning) 36%, var(--border)) | same      |

### Logo

| Property         | Mobile | Desktop |
| ---------------- | ------ | ------- |
| SpotifyLogo size | 34px   | 34px    |
| border-radius    | 9px    | 9px     |

### Warning Badge

| Property      | Mobile                            | Desktop        |
| ------------- | --------------------------------- | -------------- |
| position      | absolute; right -3px; bottom -3px | same           |
| width/height  | 16px                              | 16px           |
| border-radius | 999px                             | 999px          |
| background    | var(--warning)                    | var(--warning) |
| color         | #0A0A0A                           | #0A0A0A        |
| font-size     | 11px                              | 11px           |
| font-weight   | 900                               | 900            |
| content       | !                                 | !              |

### Title / Description

| Property    | Mobile                                    | Desktop |
| ----------- | ----------------------------------------- | ------- |
| title       | 13px / 700 / var(--fg)                    | same    |
| description | 11.5px / var(--fg-muted) / margin-top 1px | same    |

### Reconnect Button

| Property      | Mobile        | Desktop       |
| ------------- | ------------- | ------------- |
| padding       | 7px 12px      | 7px 12px      |
| border-radius | 999px         | 999px         |
| background    | var(--signal) | var(--signal) |
| color         | #0A0A0A       | #0A0A0A       |
| font-weight   | 800           | 800           |
| font-size     | 12px          | 12px          |

### Copy Variants

| kind   | Title                        | Description                                |
| ------ | ---------------------------- | ------------------------------------------ |
| token  | Sync paused — link expired   | Reconnect to spot new matches again.       |
| revoke | Unlinked from Spotify's side | We cleared it here too. Reconnect anytime. |

---

# State Coverage — combined

| State                          | Triggering condition                                  | Component rendered                              | Key props required                                               |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Disconnected entry             | no connection row                                     | ConnectEntry (settings)                         | —                                                                |
| OAuth handoff interstitial     | user taps Connect                                     | OAuthHandoff sheet                              | —                                                                |
| Connect pending                | returned from OAuth, POST in flight                   | pending modal (impl addition)                   | —                                                                |
| Connect success                | POST /v1/spotify/connection ok, denverArtistCount > 0 | ConnectSuccess                                  | artistCount, denverArtistCount, matchedArtists                   |
| Empty Denver match             | POST ok, denverArtistCount = 0                        | EmptyDenverMatch                                | artistCount                                                      |
| Connect failure (Spotify down) | POST/sync fails                                       | FailConnectDown                                 | —                                                                |
| Auto-watch opt-in              | success continue, one-time                            | AutoWatchSheet                                  | denverArtistCount; choice auto/highlight; dismiss writes nothing |
| Connected idle                 | connection status='connected'                         | ConnectedCard                                   | account, counts, lastSyncedAt                                    |
| Connected syncing              | refresh in flight                                     | ConnectedCard refreshing=true                   | refreshing                                                       |
| Disconnect confirm             | user taps Disconnect                                  | DisconnectConfirm sheet                         | —                                                                |
| Token expired                  | connection status='error'                             | FailTokenRefresh / RevokeBanner kind="token"    | status                                                           |
| External revoke                | connection status='revoked'                           | FailExternalRevoke / RevokeBanner kind="revoke" | status                                                           |
| Revoke banner on Browse        | status error/revoked, global                          | RevokeBanner                                    | kind                                                             |
| First-watch nudge              | first watch, unconnected, never seen                  | FirstWatchNudge                                 | single-fire via spotifyNudgeSeenAt                               |
