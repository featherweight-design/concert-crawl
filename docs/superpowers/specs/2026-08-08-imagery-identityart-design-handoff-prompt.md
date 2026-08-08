# Design Handoff Prompt — Event & Artist Imagery

**Track:** 2 (needs design)
**Brief:** `docs/superpowers/specs/2026-08-08-artist-imagery-standardization-design.md`
**Date:** 2026-08-08

Everything below the line is the prompt. Hand it to Claude Design as-is.

---

## Problem (objective)

Concert Crawl shows a picture next to every event and every artist. Roughly 62% of upcoming events currently show a procedurally-generated placeholder instead of a photograph, because the only real image an event surface can reach is artwork scraped from the venue's listing page, and only 38% of events have one.

We hold a second source of real imagery that these surfaces cannot currently reach: press portraits from Spotify, matched to the artist. Connecting them takes the placeholder from 62% of events down to 30%. That connection is engineering work and is already specified — it is not what we need from you.

Two visual problems fall out of it, and both are yours.

**First.** A Spotify press portrait is a square photograph, and it is almost always a person's face at close range. It has to work in image slots that were built for venue artwork: a 16:9 card 180px tall, and a full-bleed banner 300px tall on the event detail page. A centre-crop of a face filling a 300px concert banner reads as an artist profile that has wandered onto the wrong page — it does not read as a show you could buy a ticket to. About 32% of upcoming events will land in this state, and the detail-page banner is the most-viewed image slot in the product. The same portrait also has to work in a 44–56px square tile and a 40px avatar, where it is already fine.

**Second.** After the connection is made, roughly 30% of event surfaces and 55% of artist pages will still show the generated placeholder, and that is permanent — it is a floor for a large minority of artists, not a state we can engineer our way out of. It was designed as a stopgap and still carries itself like one: eight saturated palettes, five templates, gradient overlays, a grain filter and a monogram chip, all competing for attention on a card whose actual job is to tell you who is playing and when. It should feel like a deliberate part of the product rather than the absence of a photograph.

A scenario for both at once: a user scrolls the browse list. Row one has a gig poster. Row two has a musician's face cropped into a banner. Row three has a generated pattern. Today those three rows do not look like they belong to the same product.

## App context (reminders for Design)

**Where this lives.** Six image slots across the consumer app:

| Slot | Shape | Sources it will draw from |
|---|---|---|
| `EventRow` tile — browse list | Square, 44–56px responsive | venue artwork → artist portrait → placeholder |
| `SmallEventRow` tile | Square, 40px | same |
| `HeroEventCard` | 16:9, 180px tall | same |
| Event detail hero | Full-bleed, 300px tall | same |
| Artist page hero (`ArtistPlate`) | Full-bleed hero | artist portrait → placeholder |
| Artist search result avatar | Circular, 40px | artist portrait → placeholder |

**Related shipped features.** The artist page (#1115) and the Event Row System — the row's meta budget and drop ladder already govern what text survives at 320px, and imagery must not disturb that. The browse list, event detail page, and search results are all live surfaces with existing layouts; this is a treatment change inside existing slots, not a re-layout.

**Constraints from the existing system.** Consumer surfaces use `var(--*)` design tokens across three themes (Electric, Jade, Light) via `data-theme`, never Tailwind `dark:` variants. Mobile-first from a 320px baseline. shadcn/Radix primitives.

**Who it affects.** Every user on every surface — signed-in, anonymous, free and paid alike. There is no tier or role variation here.

**Voice.** Sour Patch Kids: slight cheek, honesty rail, warmth. Relevant mainly to the second problem — a placeholder should not pretend to be a photograph of anyone.

## Technical requirements

**Data we have today.** `events.imageUrl` (venue-scraped, arbitrary aspect ratio, hotlinked). `artists.photoUrl` (Spotify, square, hotlinked, occasionally expires). A generated SVG placeholder component deriving a palette, template and monogram deterministically from a hash of the artist's name — the same name always produces the same art.

**Data we do not have, and will not build for this.** Any artist imagery beyond the single Spotify portrait: no banner crops, no alternate aspect ratios, no artist-supplied assets, no editorial art. Whatever you design must work from one square photograph. There is also no image proxy or CDN — remote URLs render directly — so a treatment cannot depend on server-side image processing. Client-side CSS, filters, and layered composition are all available.

**Performance.** These slots appear many times per screen in a scrolling list. A treatment that is expensive per instance, or that requires loading an image twice, is a problem worth flagging even if it looks better.

**Failure modes to design for.** A remote image URL can fail to load at any time, including after it has begun rendering. Portrait subject placement varies — some are centred, some are not, and we cannot detect which.

## What's out of scope

- **The source priority.** Locked: event surfaces prefer the event's own artwork, then the headliner's portrait, then the placeholder. Artist surfaces prefer the artist's portrait, then the placeholder. Neither borrows imagery across that boundary. Do not propose reordering it.
- **All copy.** Every string is a copy-writer call and is handled separately. Do not write, rewrite, or flag wording.
- **Layout of the surrounding surfaces.** Slot dimensions and page structure stay as they are. This is a treatment inside existing slots.
- **Deleting or replacing the placeholder concept.** It is permanent. Retune it; do not design it away or design a different fallback.
- **Any artist-identity or branding system built on the generated art** — a per-artist mark, promoted monogram, or recognizable sigil. This was considered and ruled out: under the locked priority the same artist shows different imagery on different surfaces, so a mark could never be seen consistently enough to function as one.

## Deliverables we expect

- Hi-fi mockups of every slot in the table above, in each source state it can reach — venue artwork, artist portrait, and placeholder. The portrait state in the 16:9 card and the 300px full-bleed hero is the centre of this handoff and should carry the most exploration.
- A browse-list mockup showing rows in all three source states adjacent to each other, since the mixed-list appearance is the actual problem.
- The load-failure state.
- Mobile and desktop both, for every surface.
- The retuned placeholder shown across enough name inputs to demonstrate its variance range.
- Decisions log in the handoff README.
- Component handoff with token references.
