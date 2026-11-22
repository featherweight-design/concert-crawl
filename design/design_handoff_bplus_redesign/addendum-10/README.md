# Addendum 10 (2026-11-22): the public event page names who sells the price

One gap, answered. On the public event page (`/e/:id`, `PublicEventDetail.tsx`), the headline price can be a resale price, but the page never says so or names the seller. The signed-in page does, through the trust pills (`addendum-6` item 38) and Where it's sold (item 40). B+ README "From outside" lists this page but never drew the case.

Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-10/a10.py` (`python3 a10.py <dest>`, then `node render.js <dest>`). **All wording on these boards is placeholder** and goes through `copy-review`. Example data.

| # | Case | Ruling | Boards |
|---|---|---|---|
| A | The cheapest price is resale | Resale pill, and "Sold by {seller} · resale" under the price | `01/public-resale-cheapest-m`, `-d` |
| B | Box office headline, resale also listed | ★ Box office pill, "Sold by the venue box office · face value", the resale price as an Also row with its pill | `01/public-boxoffice-resale-m`, `-d` |
| C | Resale only | As A, with a dashed note that only resale is listed | `01/public-resale-only-m`, `-d` |
| D | Sold out, resale listed | Sold out still leads; "Resale from {price} on {seller}" under it | `01/public-spec` only |
| — | Where it's sold on the public page? | **No. After sign-in only.** | `01/public-spec` |

Phone boards are drawn at 360 and desktop at 1280. `01/public-spec` shows all four card states side by side, two of them on Light, and the Where it's sold ruling.

## Decisions only Hugh can make

None are blocking. Two rulings go a step past the question, and Hugh can overrule either:
- **Where it's sold stays signed-in only** (reasons below). The alternative is the full card under Get Tickets, with no › on its rows.
- **Case D** (sold out with resale listed) wasn't asked for. The live rule makes Sold out beat any price, so a sold-out show with a resale listing currently shows nothing about the resale. D adds one line and keeps Sold out on top.

## The card

This is the same read-only price card as today (`data-testid="public-event-price"`: `surface-1`, a 1px `border`, radius 14), with three additions taken from the signed-in card:

1. **The trust pill**, top right on the TICKETS line. It's the one pill component (Community, ★ Box office, Resale), keyed off the headline's `sourceCategory` and drawn in the `--trust-*` tones from item 38. On Light it takes the darkened tones, which pass 4.5:1.
2. **The Sold by line** under the price, at 13px in `fg-muted`, with the seller in `fg` at weight 700:
   - Resale: "Sold by {vendor} · resale", with "resale" in `--trust-resale` (item 40b's language).
   - Box office: "Sold by the venue box office · face value".
   - Community (a primary seller such as Ticketmaster): "Sold by {vendor}". No pill word is added.
   - The qualifier after the price follows the signed-in card: "{tier} · ALL-IN" for resale and primary sellers, "{tier} · NO FEES" for box office.
3. **Also**: one row for every other listed price, as on the signed-in card (40c). Each row has the seller, the tier in mono, a Resale pill on resale rows only, and the price.
   - Rows are cheapest first. Show up to 3, then a plain "+N more" line with no link.
   - The rows are the ones `buildWhereItsSoldRows` returns, minus the headline, so the two pages never disagree about who sells what.

**Resale only (C):** there's no Also. A dashed top rule and a `--trust-resale` dot introduce one note: "Only resale is listed so far. Resale is usually above face value." The signed-in page's "Add the box-office price" invitation isn't carried over, because the mirror never asks a visitor without an account to submit.

**Sold out with resale (D):** "Sold out" stays the headline, as it is live. Under it goes "Resale from {price} on {vendor} · above face value", with the Resale pill on the TICKETS line. A sold-out show is never shown as available at face value.

**No price:** unchanged. There's no card.

## Where it's sold: after sign-in only

The public page doesn't get the Where it's sold card:

- The card above already names the seller of every price it shows: the Sold by line for the headline, and a row for each other price under Also. Nothing a visitor needs in order to choose is hidden.
- Each Where it's sold row has a › that jumps to its tier's own price card (item 34). The mirror has only the one card, so the › would go nowhere.
- The mirror's order stays as it is: what it costs, how to buy it, then the account card. At 360 that keeps the account card about one scroll below the hero.
- The full list, with tiers, fees and the › jumps, is on the signed-in page. The account card already offers that ("track prices").

## Engineering notes

- **The data is already there.** `EventDetailResponse.priceByTier[].headline` carries `vendor` and `sourceCategory`, and the alternates carry the same. No API change is needed. `pickApprovedHeadline` already picks the headline the page shows, so read the vendor and category from the same object, never from the flat `priceVendor`.
- **Get Tickets doesn't change.** It still opens the show's own ticket link, which can belong to a different seller from the headline price. The Sold by line is what tells a visitor whose price the headline is. Pointing the button at the seller would need a per-submission URL, which doesn't exist. That's out of scope here.
- **Reuse, don't fork:** the live trust pill component and the `where-its-sold/rows.ts` row builder. Vendor display names come from the same map Where it's sold uses (`VenueBoxOffice` is shown as "the venue box office" in the Sold by line).
- **Build-vs-design check:** screenshot `/e/:id` at 320, 360 and 1280 for A to D and list the diffs in the PR body. At 320 the qualifier after the price may wrap under it. That's allowed, but the pill must not wrap.
