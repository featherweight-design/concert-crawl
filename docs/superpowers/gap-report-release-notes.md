# Gap Report — Release Notes

## IMPLEMENTED (15)

- ReleasePage structure — eyebrow, h1, subtitle, timeline rail, release entries, "end of log" footer [ReleasePage.tsx:44]
- ReleaseEntry timeline node — glowing on latest, "Live" badge, version/date meta [ReleaseEntry.tsx:33]
- ReleaseEntry items — grouped by kind (added/fixed/changed/removed) with colored badges [ReleaseEntry.tsx:124]
- SpotlightStrip — "Feature drop · announcement" eyebrow, title, "See the announcement" CTA [ReleaseEntry.tsx:135]
- SpotlightModal structure — hero, close button, eyebrow + version, title, tagline [SpotlightModal.tsx:59]
- SpotlightModal carousel — step counter, numbered circles, back/next buttons, dot indicators [SpotlightModal.tsx:175]
- SpotlightModal founder note — "Behind the build" eyebrow, note text, signature [SpotlightModal.tsx:335]
- SpotlightModal footer CTA — "Maybe later" + primary CTA or "Got it" fallback [SpotlightModal.tsx:387]
- FeatureDropPill — radar dot animation, "Feature drop" eyebrow, title text, dismiss X button [FeatureDropPill.tsx:44]
- FeatureDropPillGate — hidden on /changelog and /admin, bottom-right desktop, bottom-[72px] mobile [FeatureDropPillGate.tsx:21]
- SpotlightHero map — grid lines, 7 pins with drop animation, radar ring, river/roads, parallax drift [SpotlightHero.tsx:26]
- SpotlightHero coordinate label — "39.7°N · 104.9°W · Denver" (non-compact only) [SpotlightHero.tsx:161]
- UserMenuVersionFooter — pulsing dot, build label, "What's new"/"Changelog" state, chevron, /changelog nav [UserMenuVersionFooter.tsx:16]
- Token usage — all colors via CSS custom properties throughout
- Read state — useReleaseReadState hook drives unread dot, pill dismissed, markSeen on /changelog mount

## GAPS (1, fixed)

- SpotlightHero background gradient — was `var(--surface-2)` flat; fixed to `radial-gradient(ellipse at 30% 40%, var(--surface-3), var(--surface-1) 70%)` per design [SpotlightHero.tsx:35]

## DEFERRED (0)

## NOTES

- Denver coordinate label hard-coded (intentional — Denver is the app's only focus city)
- SpotlightStrip uses a pulsing glow circle rather than SpotlightHero for the compact preview — intentional simplification
- Map pin positions use percentage coordinates close to but not pixel-identical to design reference (cosmetic, not functional)
- rnDrift animation uses 18s vs design's 6s — more subtle parallax, intentional
