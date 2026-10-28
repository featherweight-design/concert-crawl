# Concert Crawl extension for design-review

## Mobile breakpoint

Mobile vs desktop splits at **640px — Tailwind `sm:`**. Use this in Agent 1's
"Responsive variants" line.

## State coverage example (ticket pricing)

| State              | Triggering condition                            | Component rendered       | Key props required                          |
| ------------------ | ----------------------------------------------- | ------------------------ | ------------------------------------------- |
| Live price         | priceStatus=null, corroborated price exists     | MultiTierLiveCard        | floor, vendor, confirms                     |
| Pending sold-out   | pendingSoldOutReport != null                    | PendingSoldOutCard       | confirms, needed, reporter                  |
| Confirmed sold-out | priceStatus='soldout' AND soldOutReport != null | (inline card)            | soldOutReport.reporterHandle, confirmsCount |
| No price           | ticketPriceMin=null, no submissions             | (community handoff card) | —                                           |

## Property table example

The original worked example was the Venues Index `VenueFeatureCard` (left art
panel background `identity.palette.bg`, monogram chip, meta column, chevron
circle). The props-passing failure example was `priceSource={null}` where
`priceSource="community"` was required.
