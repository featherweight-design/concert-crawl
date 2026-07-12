# [1.108.0](https://github.com/HartiganHM/concert-crawl/compare/v1.107.0...v1.108.0) (2026-07-12)


### Bug Fixes

* address copilot review on founder-window control ([72caba4](https://github.com/HartiganHM/concert-crawl/commit/72caba4073c181b09a37b23a34a5aa8a8802a884))
* address copilot review round 2 on founder-window control ([09f2841](https://github.com/HartiganHM/concert-crawl/commit/09f2841053baa57d5f9c969cfa1cac6dad962a65))
* address copilot review round 3 on founder-window control ([2706350](https://github.com/HartiganHM/concert-crawl/commit/2706350b61153fc87c29711d5f8f22c3b7cfa1a8))
* address copilot review round 5 on founder-window control ([6996f35](https://github.com/HartiganHM/concert-crawl/commit/6996f35a5992109d14c2fb14bce9e2b85d96bc32))
* address copilot review round 7 on founder-window control ([b39187c](https://github.com/HartiganHM/concert-crawl/commit/b39187cbb94017a4a08fe34e9e4876d305f1f3a7))


### Features

* **web+api:** admin founder-window launch control (PR 6.1 of monetization epic) ([78d0696](https://github.com/HartiganHM/concert-crawl/commit/78d0696ee501ff9387697709d17e2a9e30239e8e))

# [1.107.0](https://github.com/HartiganHM/concert-crawl/compare/v1.106.0...v1.107.0) (2026-07-12)


### Bug Fixes

* **admin:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) PR [#915](https://github.com/HartiganHM/concert-crawl/issues/915) R2 — badge total, filter page-reset, out-of-range pager ([2a97626](https://github.com/HartiganHM/concert-crawl/commit/2a976266b4814f2e85832218708f43d174d26fd0))
* **admin:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) PR [#915](https://github.com/HartiganHM/concert-crawl/issues/915) R4 — SSR count as eventFlagsTotal fallback ([1db2bec](https://github.com/HartiganHM/concert-crawl/commit/1db2becb4d66dbbe879dcae38b5befd9cec029b9))
* **admin:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) PR [#915](https://github.com/HartiganHM/concert-crawl/issues/915) R5 — seed inspector only after new page rows arrive ([e802545](https://github.com/HartiganHM/concert-crawl/commit/e802545f2a395adb28d856895b9025351ab318e6))
* **web:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) keep inspector on a visible row when the active flag drifts pages (PR [#915](https://github.com/HartiganHM/concert-crawl/issues/915) R2) ([b15a116](https://github.com/HartiganHM/concert-crawl/commit/b15a1163f46e5623888703f3b8f5e07975b2d9ad))
* **web:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) keep inspector on visible row when approving last row of a page (PR [#915](https://github.com/HartiganHM/concert-crawl/issues/915) R1) ([b748cb0](https://github.com/HartiganHM/concert-crawl/commit/b748cb038847c3b325d6c0678492a63acdd62799))


### Features

* **web:** [#694](https://github.com/HartiganHM/concert-crawl/issues/694) paginate admin event-flags split-list ([f485798](https://github.com/HartiganHM/concert-crawl/commit/f485798af96b44e7a3c4f3bae8781f8a77340386))

# [1.106.0](https://github.com/HartiganHM/concert-crawl/compare/v1.105.0...v1.106.0) (2026-07-12)


### Bug Fixes

* **api:** bound gift-ending query; clarify gifter + test-coverage comments ([0ca3271](https://github.com/HartiganHM/concert-crawl/commit/0ca327176462e61748546f67f9fefac9bab639d1))
* **api:** make gift-revoke + lost-webhook reconcile writes atomic ([421e8c4](https://github.com/HartiganHM/concert-crawl/commit/421e8c410bd6862cc7541568dbdef883bf2d5a07))
* **api:** task-6 reconcile mirrors deleted-webhook tier + 90-day clock ([b31ee5e](https://github.com/HartiganHM/concert-crawl/commit/b31ee5e790057578343ecf5ba65a5805afc5dced))
* **billing:** atomic trial-end clock + purge; correct card-window comment ([2006464](https://github.com/HartiganHM/concert-crawl/commit/20064647ab1b25be0f231b53ba3d5cd109fddf1e))


### Features

* **api:** dunning/reminder/winback email templates + daily billing job ([43860e5](https://github.com/HartiganHM/concert-crawl/commit/43860e5080d42ad4e3a8cd429d2b10f8d971aeee)), closes [#783](https://github.com/HartiganHM/concert-crawl/issues/783)

# [1.105.0](https://github.com/HartiganHM/concert-crawl/compare/v1.104.0...v1.105.0) (2026-07-12)


### Bug Fixes

* **api:** r1 — shared premium unlocks, sanitize gifter name, variant coverage ([63d5299](https://github.com/HartiganHM/concert-crawl/commit/63d52996091a1da212098ed40fc28f9a5004454d))
* **api:** r2 — always render receipt row with fallback when stripe url is null ([2d3470f](https://github.com/HartiganHM/concert-crawl/commit/2d3470fe02d3c0433089abd489d2d01ce1eb99a0))
* **api:** r3 — purely informational retention copy in cancellation ack, tighten no-win-back test ([d5b5fef](https://github.com/HartiganHM/concert-crawl/commit/d5b5feff2d7e41b01218c269f1c36ce0fbc00601))


### Features

* **api:** welcome, receipt + cancellation email templates (pr 5.2) ([1331dcd](https://github.com/HartiganHM/concert-crawl/commit/1331dcd17a0af9179caa7ff9b7feafab38c29d57))

# [1.104.0](https://github.com/HartiganHM/concert-crawl/compare/v1.103.0...v1.104.0) (2026-07-12)


### Bug Fixes

* **api:** copilot r1 — escape preheader, clerk key guard, skip receipt on missing timestamp ([28e153c](https://github.com/HartiganHM/concert-crawl/commit/28e153c38145bff8be13e67bdd6c81092f0b4531))
* **api:** copilot r2 — env-derived email urls via allowed_origin, drop dead catch ([6fb5c34](https://github.com/HartiganHM/concert-crawl/commit/6fb5c34e18ff713756594543b95818fef11894cb))
* **api:** copilot r3 — kill-switch flips pre-existing failed claim to suppressed ([408c703](https://github.com/HartiganHM/concert-crawl/commit/408c703757a93aefa852a6834556b6819d9aef77))
* **api:** copilot r4 — disambiguate no-email-queued warn by billing-reason branch ([a5dcbc6](https://github.com/HartiganHM/concert-crawl/commit/a5dcbc6c3134da559ed03d4183e3d587968a2ce6))


### Features

* **api:** transactional email send pipeline + webhook trigger scaffolding ([12f8d5d](https://github.com/HartiganHM/concert-crawl/commit/12f8d5d3f66800e1cd699866b73454f0f5c7c14e))

# [1.103.0](https://github.com/HartiganHM/concert-crawl/compare/v1.102.0...v1.103.0) (2026-07-12)


### Bug Fixes

* **billing:** copilot r1 — align 400 error copy with founder-accepting schemas, fix periodEnd doc ([6021af3](https://github.com/HartiganHM/concert-crawl/commit/6021af3a5ec0d63d22c0220df42dc7baf888123b))
* **billing:** copilot r2 — best-effort audit inserts, clear stale resubscribe error on portal ([cd907f5](https://github.com/HartiganHM/concert-crawl/commit/cd907f5dab73f906eae0254a1c8e25f78ddb3f0b))
* **billing:** copilot r3 — drop direction from preview response, clearer malformed portal URL error ([53d0203](https://github.com/HartiganHM/concert-crawl/commit/53d02034af3b534723f5d25d61a3e2080ece92bb))
* **billing:** copilot r4 — restore focus outlines, gate confirm on preview, stricter preview parse ([5915b5b](https://github.com/HartiganHM/concert-crawl/commit/5915b5bff9af6b3710370222c1b5b6e1f3d86f56))


### Features

* **billing:** cancel/resubscribe/change-tier lifecycle + manage sheet flows ([#780](https://github.com/HartiganHM/concert-crawl/issues/780), PR 4.5) ([266f02d](https://github.com/HartiganHM/concert-crawl/commit/266f02d5dfdd594f7e41e64d6b587d2622fbdb9e))

# [1.102.0](https://github.com/HartiganHM/concert-crawl/compare/v1.101.0...v1.102.0) (2026-07-12)


### Bug Fixes

* **web:** copilot r1 — guard late confirm resolve, validation error returns to checkout ([a05cdb6](https://github.com/HartiganHM/concert-crawl/commit/a05cdb66608fa61bd25e8dff2106719203d090d3))
* **web:** copilot r2 — single modal root (shell role overrides), sanitized decline logging ([f5771be](https://github.com/HartiganHM/concert-crawl/commit/f5771bef5851524901024ff357b55d4674b106f3))
* **web:** copilot r3 — skip setSubmitting after unmount in confirm finally ([03a5a2b](https://github.com/HartiganHM/concert-crawl/commit/03a5a2ba04c94b97ed47889aec244fb099b5c683))
* **web:** design-review gaps — spacing, challenge header column, focus return on dismiss/cancel ([deb8994](https://github.com/HartiganHM/concert-crawl/commit/deb8994d819e484522032e7ab48cd1d1ad38a953))


### Features

* **web:** five payment failure surfaces + 3ds/sca challenge chrome + decline mapping ([5fc9a15](https://github.com/HartiganHM/concert-crawl/commit/5fc9a15e0971c9c273116e18ef126e48054e8735))

# [1.101.0](https://github.com/HartiganHM/concert-crawl/compare/v1.100.0...v1.101.0) (2026-07-11)


### Bug Fixes

* **web:** copilot round 1 — lazy matchmedia init avoids first-paint flash ([108b0c0](https://github.com/HartiganHM/concert-crawl/commit/108b0c0bf464e5d47e4696382e4b903614a0a811))
* **web:** plan-card past-due shell gaps vs design table (pr 4.3) ([b8a2be5](https://github.com/HartiganHM/concert-crawl/commit/b8a2be5fe6a826413a194e4536eaa82cfdb2d5e2))


### Features

* **web:** past-due pinned banner + payment-flow suppression (pr 4.3) ([c9cd0f3](https://github.com/HartiganHM/concert-crawl/commit/c9cd0f39636f04c0d1eb8127f1c6a90af29b0ae6))

# [1.100.0](https://github.com/HartiganHM/concert-crawl/compare/v1.99.0...v1.100.0) (2026-07-11)


### Bug Fixes

* **api:** suppress trial-ended takeover and day-13 banner for live subscriptions ([1433bfc](https://github.com/HartiganHM/concert-crawl/commit/1433bfc8b3ed114806a1c589aa3e4aca46b8082f))
* **web:** copilot round 3 — isSignedIn gate, dismissible rename, session marker comment ([401db0a](https://github.com/HartiganHM/concert-crawl/commit/401db0a368a9d915da9bb288c249718288f158ce))
* **web:** plan-open param — same-path re-fire + viewport-variant gate for dual settings trees ([9569ff9](https://github.com/HartiganHM/concert-crawl/commit/9569ff97815f7e87cd10525b8c7a86fcc13f0497))


### Features

* **web,api:** trial-end takeover, day-13 banner, founder claim takeover (PR 4.2) ([4752b28](https://github.com/HartiganHM/concert-crawl/commit/4752b2883ea92ad36d8c1a855d2cf44c9eca51df)), closes [780/#781](https://github.com/HartiganHM/concert-crawl/issues/781)

# [1.99.0](https://github.com/HartiganHM/concert-crawl/compare/v1.98.0...v1.99.0) (2026-07-11)


### Bug Fixes

* **web:** add noreferrer to checkout legal links (review r1) ([afa87b9](https://github.com/HartiganHM/concert-crawl/commit/afa87b971c21d5a8acf1c10dbfb36290269c5c2c))


### Features

* **web:** checkout legal block, SCA notice, trust rail + refund anchor ([#782](https://github.com/HartiganHM/concert-crawl/issues/782) §6, PR 4.1) ([a2177a5](https://github.com/HartiganHM/concert-crawl/commit/a2177a535a12ed6dc49ebb83510c1556d1b23514))

# [1.98.0](https://github.com/HartiganHM/concert-crawl/compare/v1.97.1...v1.98.0) (2026-07-11)


### Bug Fixes

* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R1 — guard merged platform state, trim venue ID, local probe short-circuit ([98fecea](https://github.com/HartiganHM/concert-crawl/commit/98feceaa189b56dc005e4443142d955aa7b38633))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R10 — probe candidate mirrors PATCH clear-on-null semantics ([a673228](https://github.com/HartiganHM/concert-crawl/commit/a6732284a557c863ab748a359dd2e7222532ec94))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R2 — normalize whitespace probe ID to null, tighten probe test assertion ([b6af144](https://github.com/HartiganHM/concert-crawl/commit/b6af144341fbcd7398c754631c5f78255e2af10d))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R3 — scope orphan guard to platform-touching PATCHes, normalize empty ID to null ([66f87e6](https://github.com/HartiganHM/concert-crawl/commit/66f87e604ef8264a5928bba6d80178b37217de2b))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R5 — reset probe result when the venue ID input changes ([06dd377](https://github.com/HartiganHM/concert-crawl/commit/06dd377172788ac68550d9ae5eefcd5221988cb5))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R6 — thread timeoutMs through platform fetcher, 15s probe abort ([184c3b4](https://github.com/HartiganHM/concert-crawl/commit/184c3b4c9eea4fac8335e992ae5c4d2fe629766b))
* **admin:** [#897](https://github.com/HartiganHM/concert-crawl/issues/897) R8 — broaden missing_config diagnosis to cover unregistered platforms ([9b84738](https://github.com/HartiganHM/concert-crawl/commit/9b84738ca470f26afb9ab911a21a8497e7610461))


### Features

* **admin:** [#721](https://github.com/HartiganHM/concert-crawl/issues/721) [#665](https://github.com/HartiganHM/concert-crawl/issues/665) venue platform routing — edit platform fields + probe endpoint ([17ab624](https://github.com/HartiganHM/concert-crawl/commit/17ab6248c30c777ef9322c180e4a8acf07c45710))

## [1.97.1](https://github.com/HartiganHM/concert-crawl/compare/v1.97.0...v1.97.1) (2026-07-11)


### Bug Fixes

* raise per-event submission limit to 3 acts/24h ([#876](https://github.com/HartiganHM/concert-crawl/issues/876)) ([#895](https://github.com/HartiganHM/concert-crawl/issues/895)) ([3b8ebea](https://github.com/HartiganHM/concert-crawl/commit/3b8ebea029eeee5e3314a8a62f971b265ecc3968))

# [1.97.0](https://github.com/HartiganHM/concert-crawl/compare/v1.96.0...v1.97.0) (2026-07-11)


### Bug Fixes

* **web:** address Copilot r1 on [#892](https://github.com/HartiganHM/concert-crawl/issues/892) — post-trial time gate, stale portal error, disabled cursor ([ea0285f](https://github.com/HartiganHM/concert-crawl/commit/ea0285f1618a58bc2edecdefce35e9071f289a44))
* **web:** r3 — validate portal URL is absolute https before window.location.assign ([0fb15eb](https://github.com/HartiganHM/concert-crawl/commit/0fb15eb893e50095d4b43389b29336941f0fae78))
* **web:** r4 — tier-neutral post-cancel copy, standardize @/lib/billing import ([819ab2d](https://github.com/HartiganHM/concert-crawl/commit/819ab2d56d66a39f08d8f6af887f556e7b06ba4c))


### Features

* **web:** settings plan page — lifecycle card, manage CTA, past-due variant (PR 3.4) ([b0c839c](https://github.com/HartiganHM/concert-crawl/commit/b0c839c4eb23ce01fed798032d56107d3c7e07bf))

# [1.96.0](https://github.com/HartiganHM/concert-crawl/compare/v1.95.0...v1.96.0) (2026-07-11)


### Bug Fixes

* **admin:** [#889](https://github.com/HartiganHM/concert-crawl/issues/889) R1 — restore ghost-button focus ring, wire pager loading to isFetching ([23a6d67](https://github.com/HartiganHM/concert-crawl/commit/23a6d67b4eaf8838593419839fc0514376ac7d7a))
* missing auth token rejects for retry; entitlement denials log at debug ([fb54c10](https://github.com/HartiganHM/concert-crawl/commit/fb54c106bea51dc64bd22d0dbaf2c729d2e75401))
* **web:** scope plan-state query key by userId; fail closed when plan resolves null ([d27f741](https://github.com/HartiganHM/concert-crawl/commit/d27f741295cc5b6eacad0fc5b5e38a7c235e8984))


### Features

* **admin:** [#757](https://github.com/HartiganHM/concert-crawl/issues/757) [#758](https://github.com/HartiganHM/concert-crawl/issues/758) [#759](https://github.com/HartiganHM/concert-crawl/issues/759) disputes queue polish — relative time, sort/scope toggles, pagination ([a549a48](https://github.com/HartiganHM/concert-crawl/commit/a549a4899beb4bc504958b4c9700000e962e5435))
* entitlement gating primitives across consumer surfaces (PR 3.3) ([1ae7cb1](https://github.com/HartiganHM/concert-crawl/commit/1ae7cb1b2dd650714577b55fd721c0a1f4846f9c))

# [1.95.0](https://github.com/HartiganHM/concert-crawl/compare/v1.94.0...v1.95.0) (2026-07-11)


### Bug Fixes

* **web:** r1 — a11y focus/live-region fixes + in-flight checkout dismiss race ([f0a42da](https://github.com/HartiganHM/concert-crawl/commit/f0a42dac75699bda0a863fa29fe3975277e345a2))
* **web:** r2 — confirmPayment return_url + founder-window 10s poll ([65d8bca](https://github.com/HartiganHM/concert-crawl/commit/65d8bca8f3cbfd12fbcd8045e16bc48a2fbfe845))
* **web:** r3 — clamp scarcity rail width; add PR number to progress row ([9cb263d](https://github.com/HartiganHM/concert-crawl/commit/9cb263da2a345fa48f7d96787f5aef8e0d6726a9))


### Features

* **web+api:** tier picker UI — six-state picker + embedded checkout (PR 3.2) ([00b1731](https://github.com/HartiganHM/concert-crawl/commit/00b1731f6155c1bf523dbf6707083b64f5f7ddaa))

# [1.94.0](https://github.com/HartiganHM/concert-crawl/compare/v1.93.0...v1.94.0) (2026-07-11)


### Bug Fixes

* **web:** r1 — past-due outranks celebratory card; free plan card; lockedSurface roleComped ([ea47f64](https://github.com/HartiganHM/concert-crawl/commit/ea47f6433d139dce0e9c15572afb33d06e89356e))
* **web:** r2 — centralize PlanCard copy; derive SubscriptionTier from Drizzle schema ([0de8c33](https://github.com/HartiganHM/concert-crawl/commit/0de8c335e2194340cf82c7e28a12e452cb59a7d8))
* **web:** r3 — guard trialDaysRemainingFrom against unparseable trialEndsAt ([3cd7259](https://github.com/HartiganHM/concert-crawl/commit/3cd7259ccc4ecc9ae4c7c05a63c2a5d33ca14fca))


### Features

* **api:** derivePlan rewrite to six-plan PlanState + entitlements package (PR 3.1) ([e2c8c41](https://github.com/HartiganHM/concert-crawl/commit/e2c8c419a863cbfaebf320a999838e3b8489dceb))

# [1.93.0](https://github.com/HartiganHM/concert-crawl/compare/v1.92.1...v1.93.0) (2026-07-11)


### Bug Fixes

* **admin:** [#881](https://github.com/HartiganHM/concert-crawl/issues/881) PR [#884](https://github.com/HartiganHM/concert-crawl/issues/884) R1 — visual-only tooltip, sub-$1 precision test ([9014c9c](https://github.com/HartiganHM/concert-crawl/commit/9014c9cb6f9fe6cf1d5fd804bb1e70e52ef07e5b))


### Features

* **admin:** [#881](https://github.com/HartiganHM/concert-crawl/issues/881) hover/tap tooltip on the LLM spend chart ([348ca89](https://github.com/HartiganHM/concert-crawl/commit/348ca8924634499fa50dd4d4f84d6ebe482de790))

## [1.92.1](https://github.com/HartiganHM/concert-crawl/compare/v1.92.0...v1.92.1) (2026-07-11)


### Bug Fixes

* **admin:** [#874](https://github.com/HartiganHM/concert-crawl/issues/874) align shared primitives with design mock, 4-decimal cost precision ([43be140](https://github.com/HartiganHM/concert-crawl/commit/43be140b4cc7054bbe28fb28248e6a2854356220))

# [1.92.0](https://github.com/HartiganHM/concert-crawl/compare/v1.91.0...v1.92.0) (2026-07-11)


### Bug Fixes

* **api:** r1 — tx-atomic webhook idempotency, abandon retry restore, pagination ([0d1b868](https://github.com/HartiganHM/concert-crawl/commit/0d1b868de2380b3d86e2e08e303a3e95c4153f71))
* **api:** r2 — supporter payments must not clear the premium-data purge clock ([aba4a5e](https://github.com/HartiganHM/concert-crawl/commit/aba4a5e21f8f04dc4c9bbfddee3225901e12dbaa))
* **api:** r3 — serialize founder seat restores with a window-row lock ([7a0258d](https://github.com/HartiganHM/concert-crawl/commit/7a0258dd43bfbd62e3bb339aade8a83b2aa15711))
* **api:** r4 — empty webhook secret is unconfigured; distinct missing-window log ([b0ed670](https://github.com/HartiganHM/concert-crawl/commit/b0ed6709279c902abedd4d464e842da72cfa8611))


### Features

* **api:** stripe webhooks, checkout-abandon + portal session, seat restore (PR 2.3) ([82f9480](https://github.com/HartiganHM/concert-crawl/commit/82f9480c070d2f94778a9d7cae04b60b641e0b8e))

# [1.91.0](https://github.com/HartiganHM/concert-crawl/compare/v1.90.0...v1.91.0) (2026-07-11)


### Bug Fixes

* **api:** r1 — closesAt boundary, singleton claim constraint, multi-price loud fail ([288fd2a](https://github.com/HartiganHM/concert-crawl/commit/288fd2a809f377e24d321c2586c3b2515529ab6d))
* **api:** r2 — per-user pending-claim 409, no restore post-create, multi-price guard at checkout ([f66f116](https://github.com/HartiganHM/concert-crawl/commit/f66f116a0e25a711ca949e1816193beb238f14f7))
* **api:** r3 — runtime string check on client_secret, maxNetworkRetries for safe Stripe retries ([6e35ba0](https://github.com/HartiganHM/concert-crawl/commit/6e35ba0b0ab1bc291c810c45a56129cdfb42acfe))
* **api:** r4 — merge duplicate drizzle-orm imports in billing integration test ([75a0c22](https://github.com/HartiganHM/concert-crawl/commit/75a0c223eb1ae2b021628bd56f75e6ae614e815f))


### Features

* **api:** add Stripe checkout-session + founder atomic claim (PR 2.2) ([cbdc993](https://github.com/HartiganHM/concert-crawl/commit/cbdc9934e617c76ba018b95e5c282a57021085dc))

# [1.90.0](https://github.com/HartiganHM/concert-crawl/compare/v1.89.0...v1.90.0) (2026-07-11)


### Bug Fixes

* **db:** r1 — re-run-safe CREATE TYPE via duplicate_object guard; docstring accuracy ([6cc10c4](https://github.com/HartiganHM/concert-crawl/commit/6cc10c4e7333b15afa78f2307fe9e0027c717a62))
* **scripts:** r2 — redact email local-part in backfill operator logs ([6abd1e9](https://github.com/HartiganHM/concert-crawl/commit/6abd1e9cc1cf4202be6c3488998d5af8dacc7126))
* **scripts:** r3 — committed flag reflects commit-mode invocation per sibling convention ([2759467](https://github.com/HartiganHM/concert-crawl/commit/2759467b158ec6c56be592e6e480f96d20624f58))
* **scripts:** r4 — let gifted_comps.created_at default to row insertion time ([8ec78a4](https://github.com/HartiganHM/concert-crawl/commit/8ec78a4367edf2a47069bfb394b81287ac24322f))


### Features

* **db:** monetization schema expand (execution plan PR 2.1) ([b911303](https://github.com/HartiganHM/concert-crawl/commit/b911303012d4fec73c0cb825e3f0974cd1ac9127))

# [1.89.0](https://github.com/HartiganHM/concert-crawl/compare/v1.88.0...v1.89.0) (2026-07-11)


### Bug Fixes

* **web:** r1 — stable uid keys for tier panels instead of array index ([aae7105](https://github.com/HartiganHM/concert-crawl/commit/aae710558f7c1e7b4095d19f2a73c76728403adb))
* **web:** restore panel tier label and use role-based test query ([1e3ffd9](https://github.com/HartiganHM/concert-crawl/commit/1e3ffd90aa5934eef1894c6f4024c08ebabb9e96))


### Features

* **api:** atomic batch price-submission endpoint for [#832](https://github.com/HartiganHM/concert-crawl/issues/832) — schema + happy path ([31cd801](https://github.com/HartiganHM/concert-crawl/commit/31cd801de4b96a6ee59e4f8cee1afeb785dff56c))
* **api:** batch endpoint per-tier conflict, moderation, and rate-limit guards ([7d97bc8](https://github.com/HartiganHM/concert-crawl/commit/7d97bc86f0acf2419d9c0c33c6af3d556bfef498))
* **web:** eventDetailClient consumes batch submit results array for [#832](https://github.com/HartiganHM/concert-crawl/issues/832) ([433f4f2](https://github.com/HartiganHM/concert-crawl/commit/433f4f22c319edf41ebefd3874af794703628447))
* **web:** multi-tier panel UI in SubmitPriceModal for [#832](https://github.com/HartiganHM/concert-crawl/issues/832) ([d88065b](https://github.com/HartiganHM/concert-crawl/commit/d88065b5d392c83f8a7d9c37a291b26b9a841870))
* **web:** per-option disabled flag on ChipGroup for multi-tier panels ([7904cc6](https://github.com/HartiganHM/concert-crawl/commit/7904cc6ec977f769366342a7477a521329263016))
* **web:** wire SubmitPriceModal to the atomic batch endpoint with per-panel 422 errors ([7e22bda](https://github.com/HartiganHM/concert-crawl/commit/7e22bda0c7755a5825a9cae6617b8c401c877732))

# [1.88.0](https://github.com/HartiganHM/concert-crawl/compare/v1.87.5...v1.88.0) (2026-07-11)


### Bug Fixes

* **admin:** [#875](https://github.com/HartiganHM/concert-crawl/issues/875) R1 — throw on cost fetch errors, rounded wow tone, tz constant ([ee55b7b](https://github.com/HartiganHM/concert-crawl/commit/ee55b7b8e4ee170907a4459b83af72ef30e207a5))
* **admin:** [#875](https://github.com/HartiganHM/concert-crawl/issues/875) R3 — bound cost windows to today, guard partial wow windows ([ad94ee8](https://github.com/HartiganHM/concert-crawl/commit/ad94ee8837578b852ddb18de1f58d11f98fb7495))
* **api:** [#875](https://github.com/HartiganHM/concert-crawl/issues/875) R2 — sum cost totals from unrounded aggregates, finite date guard ([d1a1634](https://github.com/HartiganHM/concert-crawl/commit/d1a1634df5d63c0041e274399431c86bf19fc30d))


### Features

* **admin:** dashboard LLM cost panel — 30-day chart + top spend by venue ([#112](https://github.com/HartiganHM/concert-crawl/issues/112)/[#114](https://github.com/HartiganHM/concert-crawl/issues/114)) ([d9e3826](https://github.com/HartiganHM/concert-crawl/commit/d9e382631ea73bebe21a3a886bd4f8405df87117)), closes [#874](https://github.com/HartiganHM/concert-crawl/issues/874)

## [1.87.5](https://github.com/HartiganHM/concert-crawl/compare/v1.87.4...v1.87.5) (2026-07-11)


### Bug Fixes

* **crawler-core:** [#863](https://github.com/HartiganHM/concert-crawl/issues/863) rawTitle cross-check saves legitimate trailing repeats ([de3d9e0](https://github.com/HartiganHM/concert-crawl/commit/de3d9e06728a1f3646b3100a3ca67beb47e0e732)), closes [#851](https://github.com/HartiganHM/concert-crawl/issues/851) [#853](https://github.com/HartiganHM/concert-crawl/issues/853)

## [1.87.4](https://github.com/HartiganHM/concert-crawl/compare/v1.87.3...v1.87.4) (2026-07-11)


### Bug Fixes

* **crawler-core:** [#850](https://github.com/HartiganHM/concert-crawl/issues/850) canonicalize strips markdown markers and normalizes apostrophes ([65ffc57](https://github.com/HartiganHM/concert-crawl/commit/65ffc572cbb5c8f3bc75f225d06fbb4a0cab4b71)), closes [#824](https://github.com/HartiganHM/concert-crawl/issues/824)
* **scripts:** [#850](https://github.com/HartiganHM/concert-crawl/issues/850) handle multi-loser user_events + chunk snapshot INSERT (PR [#855](https://github.com/HartiganHM/concert-crawl/issues/855) R1) ([c4d4c91](https://github.com/HartiganHM/concert-crawl/commit/c4d4c913882d9b882ae87a2c5d6c946fefecade8))
* **scripts:** [#850](https://github.com/HartiganHM/concert-crawl/issues/850) only collapse clusters where new normalizer changes canonical (PR [#855](https://github.com/HartiganHM/concert-crawl/issues/855) R3) ([5f10252](https://github.com/HartiganHM/concert-crawl/commit/5f1025203a12a2c7bcc8747c8b9e90a40b8994c3)), closes [#821](https://github.com/HartiganHM/concert-crawl/issues/821)
* **scripts:** [#850](https://github.com/HartiganHM/concert-crawl/issues/850) PR [#855](https://github.com/HartiganHM/concert-crawl/issues/855) R4 — deterministic losers, snapshot preserve, COALESCE merge ([709843e](https://github.com/HartiganHM/concert-crawl/commit/709843e3f5c940153ab94198a9503118e8f9a226))
* **scripts:** [#850](https://github.com/HartiganHM/concert-crawl/issues/850) prune snapshots before no-op early return (PR [#855](https://github.com/HartiganHM/concert-crawl/issues/855) R5) ([0836c1f](https://github.com/HartiganHM/concert-crawl/commit/0836c1fe9df4ed4ef0365c945a4452cd7c2db8e5))

## [1.87.3](https://github.com/HartiganHM/concert-crawl/compare/v1.87.2...v1.87.3) (2026-07-11)


### Bug Fixes

* **crawler-core:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) return '' for non-string input (PR [#853](https://github.com/HartiganHM/concert-crawl/issues/853) R3) ([4efc54d](https://github.com/HartiganHM/concert-crawl/commit/4efc54d28dde722458cca80e857d5468dd245fe2))
* **crawler-core:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) strip duplicated trailing word from LLM-extracted titles ([6ed1dd9](https://github.com/HartiganHM/concert-crawl/commit/6ed1dd976c2ce58c783c25f35f99070b71e78b2c)), closes [#826](https://github.com/HartiganHM/concert-crawl/issues/826)
* **crawler-core:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) use Unicode-aware regex in strip-duplicated-trailing-word (PR [#853](https://github.com/HartiganHM/concert-crawl/issues/853) R1) ([7ff1489](https://github.com/HartiganHM/concert-crawl/commit/7ff14890bed7130dade3f688d240da7587d3511c))
* **scripts:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) add PK + upsert to events_851_backup for deterministic rollback (PR [#853](https://github.com/HartiganHM/concert-crawl/issues/853) R8) ([c48fb9c](https://github.com/HartiganHM/concert-crawl/commit/c48fb9cd4c46ccf69f38b25abd0ebbb1431d7a66))
* **scripts:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) escape backslashes in Postgres regex prefilter (PR [#853](https://github.com/HartiganHM/concert-crawl/issues/853) R2) ([4157463](https://github.com/HartiganHM/concert-crawl/commit/4157463b238a8d6b2a0694c8667d12a9617d292e))
* **scripts:** [#851](https://github.com/HartiganHM/concert-crawl/issues/851) widen SQL prefilter to non-whitespace token (PR [#853](https://github.com/HartiganHM/concert-crawl/issues/853) R8) ([1255186](https://github.com/HartiganHM/concert-crawl/commit/12551868165456d8720898741238171573ac3721))

## [1.87.2](https://github.com/HartiganHM/concert-crawl/compare/v1.87.1...v1.87.2) (2026-07-11)


### Bug Fixes

* **crawler-core:** [#825](https://github.com/HartiganHM/concert-crawl/issues/825) drop artist from hashEvent to silence false changedVerified alerts ([f33afad](https://github.com/HartiganHM/concert-crawl/commit/f33afad36be71b2bd30bac5ac93b5967225ee79c)), closes [#824](https://github.com/HartiganHM/concert-crawl/issues/824)
* **scripts:** [#825](https://github.com/HartiganHM/concert-crawl/issues/825) use Denver-local date in backfill candidate filter (PR [#852](https://github.com/HartiganHM/concert-crawl/issues/852) R4) ([e01be96](https://github.com/HartiganHM/concert-crawl/commit/e01be96cbb92f65879d824ca650694aacb0d0856))

## [1.87.1](https://github.com/HartiganHM/concert-crawl/compare/v1.87.0...v1.87.1) (2026-06-27)


### Performance Improvements

* **web:** isr landing + browse with 5-min revalidate ([#842](https://github.com/HartiganHM/concert-crawl/issues/842)) ([db42881](https://github.com/HartiganHM/concert-crawl/commit/db42881fd088c3b29d5cc7fd1ecc61c9f1fcd80c))

# [1.87.0](https://github.com/HartiganHM/concert-crawl/compare/v1.86.0...v1.87.0) (2026-06-27)


### Bug Fixes

* **crawler-core:** strip HTML from event description at extraction ([#827](https://github.com/HartiganHM/concert-crawl/issues/827)) ([eae2034](https://github.com/HartiganHM/concert-crawl/commit/eae20341558a59b7bae52c66bd4d95c6a4e62e87))
* r1 — address Copilot review round 1 on PR [#844](https://github.com/HartiganHM/concert-crawl/issues/844) ([ff6de63](https://github.com/HartiganHM/concert-crawl/commit/ff6de63ef850bc274b7d37ce1512d73144630845))
* r2 — address Copilot review round 2 on PR [#844](https://github.com/HartiganHM/concert-crawl/issues/844) ([086c2af](https://github.com/HartiganHM/concert-crawl/commit/086c2afc5a881a2eeaf5b1d909b50649bec908f6)), closes [#x2014](https://github.com/HartiganHM/concert-crawl/issues/x2014) [#X2014](https://github.com/HartiganHM/concert-crawl/issues/X2014)
* r3 — address Copilot review round 3 on PR [#844](https://github.com/HartiganHM/concert-crawl/issues/844) ([761bfa2](https://github.com/HartiganHM/concert-crawl/commit/761bfa224a70793a589e290ba98436db53fca137))
* r4 — address Copilot review round 4 on PR [#844](https://github.com/HartiganHM/concert-crawl/issues/844) (final) ([4293614](https://github.com/HartiganHM/concert-crawl/commit/4293614743adbc0197328aa1fa069411a3e47315))


### Features

* **web:** move Clerk auth gate to Edge Middleware ([#841](https://github.com/HartiganHM/concert-crawl/issues/841)) ([3b0993c](https://github.com/HartiganHM/concert-crawl/commit/3b0993c465364465d38e30ad4771c7a679b13e92))

# [1.86.0](https://github.com/HartiganHM/concert-crawl/compare/v1.85.4...v1.86.0) (2026-06-27)


### Bug Fixes

* **crawler-core:** r1 — address Copilot review round 1 on PR [#824](https://github.com/HartiganHM/concert-crawl/issues/824) ([bb32ee2](https://github.com/HartiganHM/concert-crawl/commit/bb32ee2a85c8cfe07abb1c7ad140ba7976487d92)), closes [#649](https://github.com/HartiganHM/concert-crawl/issues/649)
* **crawler-core:** r2 — correct misleading comment on canonical_title set entry ([c0aacd1](https://github.com/HartiganHM/concert-crawl/commit/c0aacd13d94b04a9bc2409d7275a59f753718e44))
* **crawler-core:** r3 — drop empty-canonical filter in VALIDATE; guard empty title in crawler dedup ([ec0a857](https://github.com/HartiganHM/concert-crawl/commit/ec0a857b730d0faa194ce2a48e9209a5c49fbd84))
* **crawler-core:** r4 — DIAGNOSE counts clusters; include empty-canonical rows; tighten dedup test ([f7a6958](https://github.com/HartiganHM/concert-crawl/commit/f7a69589c75ca5ecef2f3dea37fbd8ff72fedd64)), closes [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#821](https://github.com/HartiganHM/concert-crawl/issues/821) [pre-#821](https://github.com/pre-/issues/821) [#821](https://github.com/HartiganHM/concert-crawl/issues/821)
* **crawler-core:** r5 — exercise canonical_title-preserving title drift in UPDATE-path tests ([60104ad](https://github.com/HartiganHM/concert-crawl/commit/60104ad457a5a3c9d390a9404b7d5997c1eab3c7)), closes [#825](https://github.com/HartiganHM/concert-crawl/issues/825) [#649](https://github.com/HartiganHM/concert-crawl/issues/649)


### Features

* **crawler-core:** swap dedup key to canonical_title ([#821](https://github.com/HartiganHM/concert-crawl/issues/821) contract) ([5771945](https://github.com/HartiganHM/concert-crawl/commit/57719458dc65eef8d45c85376610007dddd26f86)), closes [#822](https://github.com/HartiganHM/concert-crawl/issues/822) [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#822](https://github.com/HartiganHM/concert-crawl/issues/822)

## [1.85.4](https://github.com/HartiganHM/concert-crawl/compare/v1.85.3...v1.85.4) (2026-06-27)


### Bug Fixes

* **api:** r1 — clarify priceVendor scope + cover source-event edge cases (PR [#837](https://github.com/HartiganHM/concert-crawl/issues/837)) ([9e70dab](https://github.com/HartiganHM/concert-crawl/commit/9e70dab5837aa370cea0d0d246ab66004a9a8e8f)), closes [#833](https://github.com/HartiganHM/concert-crawl/issues/833)
* **api:** r2 — reword test comment to describe behavior, not PR (PR [#837](https://github.com/HartiganHM/concert-crawl/issues/837)) ([f3d9728](https://github.com/HartiganHM/concert-crawl/commit/f3d9728dc3cba2461daaaccb930ad148f75fcb73))


### Performance Improvements

* **api/web:** parallelize event detail fetchRelated via id-keyed endpoint ([#833](https://github.com/HartiganHM/concert-crawl/issues/833)) ([e138c79](https://github.com/HartiganHM/concert-crawl/commit/e138c79f4e15bc83c129f52b3c41399aa2cb8f5c))

## [1.85.3](https://github.com/HartiganHM/concert-crawl/compare/v1.85.2...v1.85.3) (2026-06-27)


### Bug Fixes

* **web:** r1 — fold localConfirms boost into CorroborationSheet (PR [#835](https://github.com/HartiganHM/concert-crawl/issues/835)) ([7fdbcc4](https://github.com/HartiganHM/concert-crawl/commit/7fdbcc446b05e6af7a4954215e893c014b63b2e8)), closes [#7](https://github.com/HartiganHM/concert-crawl/issues/7)
* **web:** r2 — address Copilot review round 2 on PR [#835](https://github.com/HartiganHM/concert-crawl/issues/835) ([2b9e8ea](https://github.com/HartiganHM/concert-crawl/commit/2b9e8ea3922dd8c8bd4cb2c2a5cdec651b8853ab)), closes [#3](https://github.com/HartiganHM/concert-crawl/issues/3) [#6](https://github.com/HartiganHM/concert-crawl/issues/6)
* **web:** r3 — derive corroboration `needed` from SP_POLICY (PR [#835](https://github.com/HartiganHM/concert-crawl/issues/835)) ([0e0527b](https://github.com/HartiganHM/concert-crawl/commit/0e0527bcbbf1166d20e320f3031da13579251586))
* **web:** r4 — pin corroboration date math to UTC midnight (PR [#835](https://github.com/HartiganHM/concert-crawl/issues/835)) ([8264e56](https://github.com/HartiganHM/concert-crawl/commit/8264e5624f3c30825261d86b83f6ff2f1ac29de4))
* **web:** r5 — collapse remaining isImminent sites onto shared helper (PR [#835](https://github.com/HartiganHM/concert-crawl/issues/835)) ([5b0e24e](https://github.com/HartiganHM/concert-crawl/commit/5b0e24ea5607fdc17d451a75a55b6110ee929f67))
* **web:** submitter counts as observation [#1](https://github.com/HartiganHM/concert-crawl/issues/1) in price confirms strip ([#831](https://github.com/HartiganHM/concert-crawl/issues/831)) ([f545c08](https://github.com/HartiganHM/concert-crawl/commit/f545c08555bb18cd721056df393d2ee19159c677))

## [1.85.2](https://github.com/HartiganHM/concert-crawl/compare/v1.85.1...v1.85.2) (2026-06-27)


### Bug Fixes

* **crawler-core:** preserve raw title for cross-venue filter ([#826](https://github.com/HartiganHM/concert-crawl/issues/826)) ([9e39afe](https://github.com/HartiganHM/concert-crawl/commit/9e39afed55e0251a09bb75d85664574418b29148)), closes [#605](https://github.com/HartiganHM/concert-crawl/issues/605)
* r3 — address Copilot review round 3 on PR [#836](https://github.com/HartiganHM/concert-crawl/issues/836) ([387a743](https://github.com/HartiganHM/concert-crawl/commit/387a743040d0cdece7950bfd02b5e3c89f5b254a)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* r4 — consolidate cross-venue comment + move deletedCount outside tx (PR [#836](https://github.com/HartiganHM/concert-crawl/issues/836)) ([ad4803b](https://github.com/HartiganHM/concert-crawl/commit/ad4803b9653ac8191a46a647c056f569c7310353))
* **scripts:** r1+r2 — cleanup script promoter-prefix pairing + user_events dedupe (PR [#836](https://github.com/HartiganHM/concert-crawl/issues/836)) ([626afb8](https://github.com/HartiganHM/concert-crawl/commit/626afb8dbc6ce71308c6fc38ff5379b2d5610410)), closes [#826](https://github.com/HartiganHM/concert-crawl/issues/826)
* **scripts:** r5 — committed=false on no-op early-return paths (PR [#836](https://github.com/HartiganHM/concert-crawl/issues/836)) ([a2b6ea1](https://github.com/HartiganHM/concert-crawl/commit/a2b6ea18037f9156361301a2d1ff44a21ef88052))

## [1.85.1](https://github.com/HartiganHM/concert-crawl/compare/v1.85.0...v1.85.1) (2026-06-26)


### Bug Fixes

* **web:** feedback modal — preserve notes, persist drafts, multi-submit ([9727d9e](https://github.com/HartiganHM/concert-crawl/commit/9727d9eceb0e38e70823942631247790a75d4cc8)), closes [#828](https://github.com/HartiganHM/concert-crawl/issues/828) [#829](https://github.com/HartiganHM/concert-crawl/issues/829) [#830](https://github.com/HartiganHM/concert-crawl/issues/830) [#829](https://github.com/HartiganHM/concert-crawl/issues/829) [#830](https://github.com/HartiganHM/concert-crawl/issues/830) [#828](https://github.com/HartiganHM/concert-crawl/issues/828)
* **web:** r1 — address Copilot review round 1 on PR [#834](https://github.com/HartiganHM/concert-crawl/issues/834) ([f1a3ce2](https://github.com/HartiganHM/concert-crawl/commit/f1a3ce2aba0cc7afaa655e2dc9347ff34e30dfb9))
* **web:** r2 — address Copilot review round 2 on PR [#834](https://github.com/HartiganHM/concert-crawl/issues/834) ([b2fc6a2](https://github.com/HartiganHM/concert-crawl/commit/b2fc6a25a39040d223daf5d348c004e59f124b78))
* **web:** r3 — address Copilot review round 3 on PR [#834](https://github.com/HartiganHM/concert-crawl/issues/834) ([80e88f1](https://github.com/HartiganHM/concert-crawl/commit/80e88f169489952bf1a1537aeb2a266621d65aa5)), closes [#830](https://github.com/HartiganHM/concert-crawl/issues/830)

# [1.85.0](https://github.com/HartiganHM/concert-crawl/compare/v1.84.1...v1.85.0) (2026-06-26)


### Bug Fixes

* **crawler-core:** r1 — extend SQL backfill to strip combining marks ([951fb18](https://github.com/HartiganHM/concert-crawl/commit/951fb18ca095aa3b80c72c3fe245545b7a3c0a1f))


### Features

* **crawler-core:** canonical_title infrastructure for [#821](https://github.com/HartiganHM/concert-crawl/issues/821) ([2c95657](https://github.com/HartiganHM/concert-crawl/commit/2c95657df4fb236ab007ea6955350ca7225b09b4)), closes [#608](https://github.com/HartiganHM/concert-crawl/issues/608)

## [1.84.1](https://github.com/HartiganHM/concert-crawl/compare/v1.84.0...v1.84.1) (2026-06-26)


### Bug Fixes

* **crawler:** switch LLM extractor to streaming — SDK requires it past 32K max_tokens ([2ac396c](https://github.com/HartiganHM/concert-crawl/commit/2ac396c12d37b3641595359cb2627897232ea096)), closes [#806](https://github.com/HartiganHM/concert-crawl/issues/806)

# [1.84.0](https://github.com/HartiganHM/concert-crawl/compare/v1.83.0...v1.84.0) (2026-06-25)


### Bug Fixes

* **crawler:** migrate llm.output_truncated to reportFailure post-[#806](https://github.com/HartiganHM/concert-crawl/issues/806) rebase ([a8d3556](https://github.com/HartiganHM/concert-crawl/commit/a8d3556c5b3e8c9ae410eb8eac7b3d4c11a2dadf))
* **logger:** copilot round 1 — severity-routed console + json-ld error detail ([79fcc0f](https://github.com/HartiganHM/concert-crawl/commit/79fcc0f9b70fc98abf69b334b84b151f15cea218))
* **logger:** copilot round 6 fixes for pr [#808](https://github.com/HartiganHM/concert-crawl/issues/808) ([45637d6](https://github.com/HartiganHM/concert-crawl/commit/45637d6c17c408ced947d5e606a176a163234f81))


### Features

* **logger:** centralized reportFailure helper; route 11 callsites to Sentry ([ad1b516](https://github.com/HartiganHM/concert-crawl/commit/ad1b516fb54aa49abf467fbe108044f0354e16b0))

# [1.83.0](https://github.com/HartiganHM/concert-crawl/compare/v1.82.0...v1.83.0) (2026-06-25)


### Bug Fixes

* **admin:** copilot round 11 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([40a584b](https://github.com/HartiganHM/concert-crawl/commit/40a584bc033fa353f99b406e1fff0b9d088dd68a))
* **admin:** copilot round 2 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([77ab4c8](https://github.com/HartiganHM/concert-crawl/commit/77ab4c883d457ee04feb7e0f5839071a91acd325))
* **admin:** copilot round 3 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([cb800ff](https://github.com/HartiganHM/concert-crawl/commit/cb800ffa31faa94a2ef3896ad79e8769fa5903b7))
* **admin:** copilot round 4 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) — wire badge into real surface ([07f785e](https://github.com/HartiganHM/concert-crawl/commit/07f785e093818ecaa1754eaa01f5a97ab5593e08))
* **admin:** copilot round 5 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([e4fe886](https://github.com/HartiganHM/concert-crawl/commit/e4fe886a65a307bf9bb28e820242185a77369555))
* **admin:** copilot round 6 fix for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) — plumb hasAlert to history hook ([55824f8](https://github.com/HartiganHM/concert-crawl/commit/55824f8c42226dbc4f2d0db8c6574e65cc5c7300))
* **admin:** copilot round 8 fix for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) — forward title/aria-label via StatusBadge ([2a00b20](https://github.com/HartiganHM/concert-crawl/commit/2a00b20018a27ad9583d1767435695ba8df7cc12))
* **admin:** copilot round 9 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([0eceef1](https://github.com/HartiganHM/concert-crawl/commit/0eceef10bf7bf594f2807cecec6f763752283ece))
* **crawler:** copilot round 1 — outputTokens via tokenUsage; try/finally on test spies ([b2262f5](https://github.com/HartiganHM/concert-crawl/commit/b2262f5596d634c2f9438112214ba1dd625bb3f7))
* **crawler:** raise LLM output cap + input window; log truncation distinctly ([1a612aa](https://github.com/HartiganHM/concert-crawl/commit/1a612aa9403e18c1c40b40b6d4d30c84f5bbd517))
* **seed:** copilot round 1 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([af1c669](https://github.com/HartiganHM/concert-crawl/commit/af1c66975091b5434101aff79471dd3ab9683217))
* **seed:** copilot round 10 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([2b53a6d](https://github.com/HartiganHM/concert-crawl/commit/2b53a6d31aa06e9a18ad027a5dd38c8fa9e73625)), closes [#18](https://github.com/HartiganHM/concert-crawl/issues/18)
* **seed:** copilot round 11 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([c62eff4](https://github.com/HartiganHM/concert-crawl/commit/c62eff4e38c7dda878785c5d82a7a9efa417f516)), closes [#18](https://github.com/HartiganHM/concert-crawl/issues/18)
* **seed:** copilot round 12 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([dc73d1b](https://github.com/HartiganHM/concert-crawl/commit/dc73d1b94bff727e8c3dc161796cf877f477aba4)), closes [#18](https://github.com/HartiganHM/concert-crawl/issues/18)
* **seed:** copilot round 13 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([97d8e57](https://github.com/HartiganHM/concert-crawl/commit/97d8e5783f43410745aa1b155a3312c48c620f3d))
* **seed:** copilot round 14 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([c6206fe](https://github.com/HartiganHM/concert-crawl/commit/c6206fe0355493d0bc26b51cf1181cd12a2aed81))
* **seed:** copilot round 15 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([e0d9295](https://github.com/HartiganHM/concert-crawl/commit/e0d929532d0f24473e0bdb31f4b308eec5fc1fc3))
* **seed:** copilot round 16 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([0815c2c](https://github.com/HartiganHM/concert-crawl/commit/0815c2c01c88210d5e1137d86d9d07b272fe2781))
* **seed:** copilot round 17 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([eb36684](https://github.com/HartiganHM/concert-crawl/commit/eb36684c5985e53a0f93b2d18a47ba4795d02d34)), closes [#18](https://github.com/HartiganHM/concert-crawl/issues/18)
* **seed:** copilot round 2 fix on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) — last 2 stubhub note refs ([c662abf](https://github.com/HartiganHM/concert-crawl/commit/c662abf16662bd36eb8c126b45631aa01434fe35))
* **seed:** copilot round 3 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([cbd2aca](https://github.com/HartiganHM/concert-crawl/commit/cbd2aca06ecc11c450fa47e033c270278375d705))
* **seed:** copilot round 4 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([06a4ede](https://github.com/HartiganHM/concert-crawl/commit/06a4edee8b2c5ed175c929c684ec6eb1cf1b0e46))
* **seed:** copilot round 5 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([564f74e](https://github.com/HartiganHM/concert-crawl/commit/564f74e71e0ebd46e5f9d9d046cdede90e609d14))
* **seed:** copilot round 6 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([bf0473c](https://github.com/HartiganHM/concert-crawl/commit/bf0473c5c97565b43a8173694980c1f82667f6a2))
* **seed:** copilot round 7 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([b7b1b43](https://github.com/HartiganHM/concert-crawl/commit/b7b1b435c7e0c86057fd1290a6b34c9951b09cbc))
* **seed:** copilot round 8 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([839e100](https://github.com/HartiganHM/concert-crawl/commit/839e100238a45a44285563c67448a58d931bbd61))
* **seed:** copilot round 9 fixes on pr [#803](https://github.com/HartiganHM/concert-crawl/issues/803) ([dbb557a](https://github.com/HartiganHM/concert-crawl/commit/dbb557a73e96c13f6f05af3d8c6e0b0fb16f3e32))
* **types:** copilot round 7 nit for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) — clarify crawl.failed scope ([e101b7f](https://github.com/HartiganHM/concert-crawl/commit/e101b7f568a3f9b1ca9ed2875e54404c8e7bff0a))


### Features

* **admin:** copilot round 1 fixes for pr [#812](https://github.com/HartiganHM/concert-crawl/issues/812) ([456a243](https://github.com/HartiganHM/concert-crawl/commit/456a243b73332f8301be0cc91f408d8e49194e27)), closes [#804](https://github.com/HartiganHM/concert-crawl/issues/804)
* **admin:** surface active-alert badge on crawl history rows ([0b6beca](https://github.com/HartiganHM/concert-crawl/commit/0b6beca5f2696c7396595b6a082b9d34c4df6167))

# [1.82.0](https://github.com/HartiganHM/concert-crawl/compare/v1.81.0...v1.82.0) (2026-06-25)


### Bug Fixes

* **admin:** r1 — address Copilot review round 1 on PR [#814](https://github.com/HartiganHM/concert-crawl/issues/814) ([07a8114](https://github.com/HartiganHM/concert-crawl/commit/07a811453cc08631d0bf6247b811abf5262d167c)), closes [#802](https://github.com/HartiganHM/concert-crawl/issues/802) [#696](https://github.com/HartiganHM/concert-crawl/issues/696)
* **api:** r2 — bulk/mark-as-concert filters to currently-hidden rows ([0c264af](https://github.com/HartiganHM/concert-crawl/commit/0c264af729a6cc9432e6eb32d1e4a05f950718fe)), closes [#815](https://github.com/HartiganHM/concert-crawl/issues/815)


### Features

* bulk Mark-as-concert action on All Events bulk dock ([#809](https://github.com/HartiganHM/concert-crawl/issues/809)) ([fc9231c](https://github.com/HartiganHM/concert-crawl/commit/fc9231cfda20834d0c4ae077d22854c6337e463d)), closes [799/#802](https://github.com/HartiganHM/concert-crawl/issues/802)

# [1.81.0](https://github.com/HartiganHM/concert-crawl/compare/v1.80.0...v1.81.0) (2026-06-25)


### Features

* **deploy-prod:** accept optional timeout arg + distinct timeout exit code ([bf144b6](https://github.com/HartiganHM/concert-crawl/commit/bf144b63fc68f4dc8e0c59e089911715419dbec9)), closes [#786](https://github.com/HartiganHM/concert-crawl/issues/786)
* **deploy-prod:** add push-triggered prod smoke + rollback workflow ([424af6c](https://github.com/HartiganHM/concert-crawl/commit/424af6c9d2e3381a14bed31c53823149d459712b)), closes [#786](https://github.com/HartiganHM/concert-crawl/issues/786)
* **deploy-prod:** address Copilot review round 1 on PR [#796](https://github.com/HartiganHM/concert-crawl/issues/796) ([589cc56](https://github.com/HartiganHM/concert-crawl/commit/589cc569b40d5daf42ac7b326aaca17b8bbbd77b)), closes [#786](https://github.com/HartiganHM/concert-crawl/issues/786)
* **deploy-prod:** address Copilot review round 2 on PR [#796](https://github.com/HartiganHM/concert-crawl/issues/796) ([d8be974](https://github.com/HartiganHM/concert-crawl/commit/d8be9740bb81be42d26a863006f58e10409f964e)), closes [#786](https://github.com/HartiganHM/concert-crawl/issues/786)
* **deploy-prod:** address Copilot review round 3 on PR [#796](https://github.com/HartiganHM/concert-crawl/issues/796) ([dbad9bb](https://github.com/HartiganHM/concert-crawl/commit/dbad9bbf61481e41507b9409798b048b70a579b5)), closes [#786](https://github.com/HartiganHM/concert-crawl/issues/786)
* **deploy-prod:** drop workflow_run trigger; keep manual escape hatch ([ed3854c](https://github.com/HartiganHM/concert-crawl/commit/ed3854c8c35b0768ee6bd40fb632d2539eff96e2)), closes [#779](https://github.com/HartiganHM/concert-crawl/issues/779) [#786](https://github.com/HartiganHM/concert-crawl/issues/786)

# [1.80.0](https://github.com/HartiganHM/concert-crawl/compare/v1.79.0...v1.80.0) (2026-06-25)


### Bug Fixes

* **consumer:** clear auto-fill vendor + reset form on modal open ([4cbb496](https://github.com/HartiganHM/concert-crawl/commit/4cbb4962b7dcc9389f206453f42a42c3c44b075c))
* **consumer:** copilot round 10 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([378bc37](https://github.com/HartiganHM/concert-crawl/commit/378bc37a31bb8e095d6c47974f4cf374fb8cb433))
* **consumer:** copilot round 11 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([2d4b7c6](https://github.com/HartiganHM/concert-crawl/commit/2d4b7c6d9f45ba027257f3ec86db6bdebcfb687a))
* **consumer:** copilot round 12 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([0f8fdf6](https://github.com/HartiganHM/concert-crawl/commit/0f8fdf6852d0522591ca110bccda89f7a631a7d5))
* **consumer:** copilot round 3 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([6136017](https://github.com/HartiganHM/concert-crawl/commit/61360179e24bd0b9b8afbfc06d2840b3cb9de777))
* **consumer:** copilot round 4 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([fd6f175](https://github.com/HartiganHM/concert-crawl/commit/fd6f17532d9236bfd5585a32e1db3454bb9ad44b))
* **consumer:** copilot round 5 fix for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) — mixed-tier detection ([89c9262](https://github.com/HartiganHM/concert-crawl/commit/89c926245e0cb0c15c6413e8132adfb89ff62c18))
* **consumer:** copilot round 6 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) — venue display label ([7a30d44](https://github.com/HartiganHM/concert-crawl/commit/7a30d440abf8dbd23865d703ded4fa0fad4bc885)), closes [#2](https://github.com/HartiganHM/concert-crawl/issues/2)
* **consumer:** copilot round 7 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([9f1c83d](https://github.com/HartiganHM/concert-crawl/commit/9f1c83daacb4aad5225a55b5159d5352af5e6a78))
* **consumer:** copilot round 8 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) ([8f26258](https://github.com/HartiganHM/concert-crawl/commit/8f262582ceabe88d584299d2d237f36d16fc596f))
* **consumer:** copilot round 9 fixes for pr [#788](https://github.com/HartiganHM/concert-crawl/issues/788) — derive legacy sourceCategory ([89265a8](https://github.com/HartiganHM/concert-crawl/commit/89265a80edd64849a60beee7f65a3a50d717c807))
* **consumer:** event card from-prefix + doc 6-vendor lock ([3a8bb35](https://github.com/HartiganHM/concert-crawl/commit/3a8bb3539e09e40f7f291d5e485cc4f4a5c0433b))
* **consumer:** vendor/source required asterisk + submit modal flex layout ([4e9a204](https://github.com/HartiganHM/concert-crawl/commit/4e9a20487037a95f3995e40e68d4f39d5a4a07c7))
* **consumer:** wire confirm/withdraw handlers in all-tiers-pending branch ([0507a2f](https://github.com/HartiganHM/concert-crawl/commit/0507a2f922a55b07e87af280c7879814c9aac398))


### Features

* **consumer:** add AltSourceRow — cross-source secondary price row ([5b745b2](https://github.com/HartiganHM/concert-crawl/commit/5b745b202a2c40f31beecc3a8c0aa398a08d8790))
* **consumer:** add FaceValueCard + ContributeFaceValueCard ([0ccf701](https://github.com/HartiganHM/concert-crawl/commit/0ccf701e44be5c3836fd94023b1391a7050f3863)), closes [#10](https://github.com/HartiganHM/concert-crawl/issues/10) [#12](https://github.com/HartiganHM/concert-crawl/issues/12) [#641](https://github.com/HartiganHM/concert-crawl/issues/641) [#11](https://github.com/HartiganHM/concert-crawl/issues/11)
* **consumer:** add MTAddTierSuccess — sequential add-another-tier success state ([ff593f9](https://github.com/HartiganHM/concert-crawl/commit/ff593f97fea652883ed5d4e4ba1f04f47f39cc46))
* **consumer:** add MTListChip + pickBrowseHeadline helper (Q2 locked resale variant) ([eae9429](https://github.com/HartiganHM/concert-crawl/commit/eae9429746a4a1cda8232e2883697465ff371824))
* **consumer:** add MultiSourceMultiTierCard — entry tier with cross-source resale fold ([912ae1b](https://github.com/HartiganHM/concert-crawl/commit/912ae1b8c2676c9f0084e7e9f19e700986eb971c)), closes [#5](https://github.com/HartiganHM/concert-crawl/issues/5)
* **consumer:** add price-region copy keys + TierMark primitive ([7ea3afe](https://github.com/HartiganHM/concert-crawl/commit/7ea3afeefbd71aab9697b47ee21e4f7635244fcf))
* **consumer:** add price-region decision-tree helper ([6065eab](https://github.com/HartiganHM/concert-crawl/commit/6065eabdcdbeb63407e3fa13bedf193d3d3dd908))
* **consumer:** add ProvenanceCTA — honest outbound ticket button ([8b4de92](https://github.com/HartiganHM/concert-crawl/commit/8b4de923aa53312fdeead3abaa31cc30bd995a2a))
* **consumer:** hoist MTAddTierSuccess to all modal-owning branches ([fd1198c](https://github.com/HartiganHM/concert-crawl/commit/fd1198ce0d0d49ae16786b516e6d9f89b6805a8e)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **consumer:** passive surfaces — counter pointer (Q3 lock) + admin defer pill ([5633499](https://github.com/HartiganHM/concert-crawl/commit/5633499cd74f7f55d5efe53f7ffd3059cd8054ee)), closes [#737](https://github.com/HartiganHM/concert-crawl/issues/737)
* **consumer:** provenance-first submit form + sourceCategory payload + 409 race toast ([18ded43](https://github.com/HartiganHM/concert-crawl/commit/18ded430974466b131010a0eabef836e8e52d613)), closes [#2](https://github.com/HartiganHM/concert-crawl/issues/2)
* **consumer:** route state [#6](https://github.com/HartiganHM/concert-crawl/issues/6) + [#7](https://github.com/HartiganHM/concert-crawl/issues/7) through MixedTierCard + TwoPendingStack ([0bebed3](https://github.com/HartiganHM/concert-crawl/commit/0bebed3d7f3d4fe960a0a4a411f24b3d71c52588))
* **consumer:** surface priceByTier on browse list endpoint + EventCard parity ([c56c8c9](https://github.com/HartiganHM/concert-crawl/commit/c56c8c93c61d850007610955082488f0c3bfaa55)), closes [#787](https://github.com/HartiganHM/concert-crawl/issues/787)
* **consumer:** use MTListChip on browse cards for source-selection parity ([d6b646d](https://github.com/HartiganHM/concert-crawl/commit/d6b646d21a08ecea160e714595fe9cf4fc58e9ef)), closes [#787](https://github.com/HartiganHM/concert-crawl/issues/787)
* **consumer:** wire price-region decision tree into event detail page ([8492506](https://github.com/HartiganHM/concert-crawl/commit/84925061c11cd922f13cf21921de370ee866c8f6)), closes [#1-19](https://github.com/HartiganHM/concert-crawl/issues/1-19) [#3](https://github.com/HartiganHM/concert-crawl/issues/3)
* **consumer:** wire reports caption + admin-defer pill on PendingCardB ([90f0724](https://github.com/HartiganHM/concert-crawl/commit/90f072455bb44320fb819094da10f09a6891b598)), closes [#19](https://github.com/HartiganHM/concert-crawl/issues/19) [#18](https://github.com/HartiganHM/concert-crawl/issues/18)

# [1.79.0](https://github.com/HartiganHM/concert-crawl/compare/v1.78.0...v1.79.0) (2026-06-25)


### Bug Fixes

* **web:** r2 — address Copilot review round 2 on PR [#802](https://github.com/HartiganHM/concert-crawl/issues/802) ([64bed50](https://github.com/HartiganHM/concert-crawl/commit/64bed503bcc6517272e1278b04c876b9c395dc9c))
* **web:** r3 — address Copilot review round 3 on PR [#802](https://github.com/HartiganHM/concert-crawl/issues/802) ([7cc58ae](https://github.com/HartiganHM/concert-crawl/commit/7cc58aebc526173d5a93cdf7fa98a17ef28ea8a8))


### Features

* **api:** view=hidden-flagged-for-review + isConcertReviewNeeded projection ([783be11](https://github.com/HartiganHM/concert-crawl/commit/783be110f967fc359385bd99a4e805dd23c0f249))
* **web:** admin copy for classification review queue ([9853d34](https://github.com/HartiganHM/concert-crawl/commit/9853d341a33414c5c965f1c7a4f2ae389f2b6585))
* **web:** all-events filters flagged round-trip + isConcertReviewNeeded ([d55aa2f](https://github.com/HartiganHM/concert-crawl/commit/d55aa2f3303a7bf8582ff339ce94e1c728e12c61))
* **web:** classification section becomes interactive ([26af4df](https://github.com/HartiganHM/concert-crawl/commit/26af4df9b2ba6f65e8eb88421ec4c487946222e6))
* **web:** danger zone section drops mark-non-concert ([f5d271e](https://github.com/HartiganHM/concert-crawl/commit/f5d271e747d37490c63ff412207702a5dc601681))
* **web:** event confirm modal handles mark-as-concert kind ([01c5473](https://github.com/HartiganHM/concert-crawl/commit/01c54737c7bc267d65d63f932554cad6335f2a1d))
* **web:** flagged-for-review filter chip + empty state ([c995a84](https://github.com/HartiganHM/concert-crawl/commit/c995a84c951c8769f5c50ba56258878dd8a1d5e1))
* **web:** wire classification + danger zone refactor ([ea15ac2](https://github.com/HartiganHM/concert-crawl/commit/ea15ac22829819ec4fbeda198bd2ca699ec09ef8))

# [1.78.0](https://github.com/HartiganHM/concert-crawl/compare/v1.77.0...v1.78.0) (2026-06-25)


### Bug Fixes

* **scripts:** r1 — address Copilot review round 1 on PR [#799](https://github.com/HartiganHM/concert-crawl/issues/799) ([20f184a](https://github.com/HartiganHM/concert-crawl/commit/20f184a25aad1807f114de8fcf3b36ed97d5c543))


### Features

* **scripts:** isconcert-review-needed backfill helpers ([d4d7aa8](https://github.com/HartiganHM/concert-crawl/commit/d4d7aa877a428a320718f0f655fe782d7e50b4b3))
* **scripts:** isconcert-review-needed backfill main + classifyBatch ([6810409](https://github.com/HartiganHM/concert-crawl/commit/6810409e4d4e1c381d29baa0263017bac9533795))

# [1.77.0](https://github.com/HartiganHM/concert-crawl/compare/v1.76.3...v1.77.0) (2026-06-25)


### Features

* **crawler-core:** add reviewNeeded to LLM tool schema + prompt ([fbb52ac](https://github.com/HartiganHM/concert-crawl/commit/fbb52acaf1df4047397ce738182d4fa04b8b163b))
* **crawler-core:** emit reviewNeeded from LLM extractor ([ec85816](https://github.com/HartiganHM/concert-crawl/commit/ec858160e370ee0a2709a63bba87a7f1e003d88a))
* **crawler-core:** write is_concert_review_needed on INSERT ([19b4ec3](https://github.com/HartiganHM/concert-crawl/commit/19b4ec3ff39a8f11c2b91cd40d6f3e4f4baa4547))
* **db:** add events.is_concert_review_needed column ([361bb63](https://github.com/HartiganHM/concert-crawl/commit/361bb6307d74dcab07b84ff0b9dc88b76fa3996f))

## [1.76.3](https://github.com/HartiganHM/concert-crawl/compare/v1.76.2...v1.76.3) (2026-06-24)


### Bug Fixes

* **deploy-prod:** resolve both sides of SHA-drift gate past [skip ci] ([28f743b](https://github.com/HartiganHM/concert-crawl/commit/28f743bd0153a97a1c4a03d202ec2838ae14db4e)), closes [#777](https://github.com/HartiganHM/concert-crawl/issues/777)

## [1.76.2](https://github.com/HartiganHM/concert-crawl/compare/v1.76.1...v1.76.2) (2026-06-24)


### Bug Fixes

* **crawler:** distinct event name for non-blocking misconfig + silence test noise ([dd58e21](https://github.com/HartiganHM/concert-crawl/commit/dd58e21ab31c09d7e94be01e87a68f5db279e644))
* **crawler:** normalize SENTRY_ENVIRONMENT + harden URL construction ([b6acab1](https://github.com/HartiganHM/concert-crawl/commit/b6acab1bbe81330e8b5fa26a6c6ef8f746742b29))
* **crawler:** qualify alert emails by env + deep-link to alerted venue ([d0572c6](https://github.com/HartiganHM/concert-crawl/commit/d0572c66177cfde512b2efe2f773d4dd83fae434))
* **crawler:** sanitize subject CR/LF at email-send choke point ([9c5ce55](https://github.com/HartiganHM/concert-crawl/commit/9c5ce55dc8e4de044f73eab64c6bb2bfdb0c7519))
* **crawler:** strip CR/LF from env label + safe-fallback on URL errors ([4b3405a](https://github.com/HartiganHM/concert-crawl/commit/4b3405aee6fe1a6f96eed4b264b75a955489f3aa))

## [1.76.1](https://github.com/HartiganHM/concert-crawl/compare/v1.76.0...v1.76.1) (2026-06-24)


### Bug Fixes

* **vercel:** remove ignoreCommand in favor of Branch Tracking toggle ([882b4f0](https://github.com/HartiganHM/concert-crawl/commit/882b4f073ffe2a947cc182262da649e334a361f9)), closes [#660](https://github.com/HartiganHM/concert-crawl/issues/660)

# [1.76.0](https://github.com/HartiganHM/concert-crawl/compare/v1.75.1...v1.76.0) (2026-06-24)


### Bug Fixes

* **admin-contest-review:** address Copilot R1 (counter filters, narrow types, refetch) ([81e10cd](https://github.com/HartiganHM/concert-crawl/commit/81e10cdd538ea47881e9461f371777e7af68d665))
* **admin-contest-review:** address design-review gaps G1-G9 ([d82ef21](https://github.com/HartiganHM/concert-crawl/commit/d82ef21477b3e6a1f1e745dfb9d85c2e1b86450b))
* **admin-contest-review:** align reason max to 2000 + extend PATCH lockout to contested parents (R2) ([9af214c](https://github.com/HartiganHM/concert-crawl/commit/9af214c0a69ab6ddac761069841698d22d445e84))
* **admin-contest-review:** r3 — discriminated ContestNotificationInput + doc/comment corrections ([fcdab8e](https://github.com/HartiganHM/concert-crawl/commit/fcdab8e1d949b768c7cc8959ff4f13cf90906c87))
* **api:** add self-dispute 403 guard to price-submissions counter path (R4) ([6a04a9e](https://github.com/HartiganHM/concert-crawl/commit/6a04a9e751c7246175d3da7c594ccaa04f7d1dcb)), closes [#754](https://github.com/HartiganHM/concert-crawl/issues/754)
* **api:** r11 — count endpoint excludes contest counters + clarify status=all comment ([b8d9374](https://github.com/HartiganHM/concert-crawl/commit/b8d937440b1029f7c4e1fc84ab4b446f494a59fe))
* **api:** r15 — allow null sourceCategory + EXISTS-style lockout ([4d3b100](https://github.com/HartiganHM/concert-crawl/commit/4d3b1005fef8a450f5d1dfa5a5cd03fd5adabc24)), closes [pre-PR-#651](https://github.com/pre-PR-/issues/651)
* **api:** r16 — pair lastAdminActionAt narrowing with kind (defensive contract enforcement) ([e648f62](https://github.com/HartiganHM/concert-crawl/commit/e648f627ab1ca8f2d7742474c67ecef7e999f0be))
* **api:** r19 — force null pair when timestamp is missing (defensive contract enforcement) ([0903fb9](https://github.com/HartiganHM/concert-crawl/commit/0903fb965df90356c647f9770223eb9c53908c8a))
* **api:** r5 — clear engagement signals on resolve orphan cleanup + bump updatedAt on defer ([b668655](https://github.com/HartiganHM/concert-crawl/commit/b668655a7cf124d4a86d950e34853c4c8a20c056))
* **api:** r8 — narrow PATCH lockout to active-contest rows only ([2b03eda](https://github.com/HartiganHM/concert-crawl/commit/2b03edaad33554ddc8d295e070904820374cf7e3))
* r6 — badge uses total (not items.length) + archivedReason comment clarifications ([c1fb8b5](https://github.com/HartiganHM/concert-crawl/commit/c1fb8b5547a74e028938c1ab18191065f92d8c84))
* r9 — trim reason before API send + migration cleanup tie-breaker + updated_at ([c7957be](https://github.com/HartiganHM/concert-crawl/commit/c7957be462171a8d4e415847fced0dd7a06dabe4))
* **web:** r13 — textarea aria-label matches visible label disclosure (a11y consistency) ([4811be2](https://github.com/HartiganHM/concert-crawl/commit/4811be204a3aeb13486042448707f575343b229c))


### Features

* **api:** /v1/admin/review/counts adds priceContests field ([5f6b44d](https://github.com/HartiganHM/concert-crawl/commit/5f6b44d8fcad8ecb33a2c118e19175ed2bad0026))
* **api:** admin contest defer endpoint — engagement signal without state change ([2ce4470](https://github.com/HartiganHM/concert-crawl/commit/2ce4470a24d3b52224db5bf455029ddeaa181990))
* **api:** admin contest detail endpoint — GET /v1/admin/contests/prices/:contestId ([ff47c30](https://github.com/HartiganHM/concert-crawl/commit/ff47c3035320df0f9973242d13ab47622c878a1c))
* **api:** admin contest resolve endpoint — atomic transaction with same-slot assertions ([7015d76](https://github.com/HartiganHM/concert-crawl/commit/7015d76602a8da183fd3739d19afd630118aa502))
* **api:** admin contests list endpoint — GET /v1/admin/contests/prices ([a159326](https://github.com/HartiganHM/concert-crawl/commit/a159326eaa7c9fbdfefa08457b988f73eee767fc)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **api:** admin PATCH lockout — reject updates on contest rows (parent disputed OR child counter) ([44b3c44](https://github.com/HartiganHM/concert-crawl/commit/44b3c449ffd1a87733238a3ead5f1cf62ddd5bcf))
* **api:** counter-creation via price-submissions — duplicate check + parent-flip ([5bfe5ea](https://github.com/HartiganHM/concert-crawl/commit/5bfe5ea9ccc0760a2f7a58026bb4522d15518800))
* **api:** dispute endpoint rejects duplicate pending counters with 409 ([f0b0861](https://github.com/HartiganHM/concert-crawl/commit/f0b0861dede6a92d37b55e8d5d26b8c710559bfc))
* **api:** event detail surfaces lastAdminActionAt/Kind on counterSubmission ([ee5a562](https://github.com/HartiganHM/concert-crawl/commit/ee5a562cff86aadc82dc9c832691003af447b345))
* **db:** drizzle schema sync — archived status + 3 new columns on price_submissions ([ae483e6](https://github.com/HartiganHM/concert-crawl/commit/ae483e6b4135e8526328e5d902e6c128e16da0ea)), closes [#697](https://github.com/HartiganHM/concert-crawl/issues/697)
* **db:** migration 0041 — admin contest review (archived status + indexes) ([5d34719](https://github.com/HartiganHM/concert-crawl/commit/5d34719d332105802ebcf2abf91858f68af33192))
* **types:** extend PriceSubmission shared type — 4 new fields + 'archived' status ([e85120e](https://github.com/HartiganHM/concert-crawl/commit/e85120e3c4135cacc1d97cd4b4dee6372c6d29b5)), closes [#697](https://github.com/HartiganHM/concert-crawl/issues/697)
* **web:** admin contests queue — ContestsTabContent + PriceDisputesQueue ([1224b4a](https://github.com/HartiganHM/concert-crawl/commit/1224b4a2bdba72d51ae5b1e2d6d82c7df9edacff))
* **web:** admin contests React Query hooks — queue, detail, resolve, defer ([a69796c](https://github.com/HartiganHM/concert-crawl/commit/a69796ce189741857ca30470d5a4dece1e582b64))
* **web:** admin dispute panel + dynamic route — 760px two-up adjudication surface ([477d24b](https://github.com/HartiganHM/concert-crawl/commit/477d24b982924f8dcfb8a29069366dccc6334467))
* **web:** admin entry shared sub-component for dispute panel ([cbec40b](https://github.com/HartiganHM/concert-crawl/commit/cbec40bc4cd26906668662e26af19b350c037ef4))
* **web:** wire contests tab in ReviewPageClient + sidebar badge sum ([61feab3](https://github.com/HartiganHM/concert-crawl/commit/61feab3c0178a717b9dff4d245b4c169f1f27523)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1) [#697](https://github.com/HartiganHM/concert-crawl/issues/697)


### Performance Improvements

* **db:** r18 — add partial index for pending-counter queue ORDER BY scan ([771ecdc](https://github.com/HartiganHM/concert-crawl/commit/771ecdc1140a652a49ce69897f63b305093a768e))

## [1.75.1](https://github.com/HartiganHM/concert-crawl/compare/v1.75.0...v1.75.1) (2026-06-24)


### Bug Fixes

* **crawler:** address Copilot review on PR [#746](https://github.com/HartiganHM/concert-crawl/issues/746) — concurrency ([42b0405](https://github.com/HartiganHM/concert-crawl/commit/42b0405c56823ca4808d63eb8087f1699d6d3142))
* **crawler:** address Copilot round-3 review on PR [#746](https://github.com/HartiganHM/concert-crawl/issues/746) ([dae68f6](https://github.com/HartiganHM/concert-crawl/commit/dae68f6a3eecdc86aaf84cba1454ab7ea55fb315))
* **crawler:** auto-pause venue at 3 consecutive failures ([32ae0bf](https://github.com/HartiganHM/concert-crawl/commit/32ae0bf3da6c517de0adcc62b3a8ae3bf28060b9)), closes [#743](https://github.com/HartiganHM/concert-crawl/issues/743)

# [1.75.0](https://github.com/HartiganHM/concert-crawl/compare/v1.74.13...v1.75.0) (2026-06-24)


### Bug Fixes

* **deploy-prod:** "rollback attempted" not "completed" in email + log ([bde6a76](https://github.com/HartiganHM/concert-crawl/commit/bde6a76a27d6c87bb2fa622937c9d38860c772db)), closes [#749](https://github.com/HartiganHM/concert-crawl/issues/749)
* **deploy-prod:** mask ADMIN_EMAIL + generic success log ([e4ea49a](https://github.com/HartiganHM/concert-crawl/commit/e4ea49ad4ab85cbcc299f85376166b443cabcb1c)), closes [#749](https://github.com/HartiganHM/concert-crawl/issues/749)
* **deploy-prod:** preflight jq + sanitize email-failure annotation ([a91e73b](https://github.com/HartiganHM/concert-crawl/commit/a91e73b0aaf78627c2920864aec87ff7ee26d647)), closes [#749](https://github.com/HartiganHM/concert-crawl/issues/749)


### Features

* **deploy-prod:** surface auto-rollback via annotation + admin email ([4b0033a](https://github.com/HartiganHM/concert-crawl/commit/4b0033a09cd65bfe042042189ce239471f0b5ef4))

## [1.74.13](https://github.com/HartiganHM/concert-crawl/compare/v1.74.12...v1.74.13) (2026-06-24)


### Bug Fixes

* **rollback:** skip cron services — Render API has no cron rollback path ([cf59b82](https://github.com/HartiganHM/concert-crawl/commit/cf59b8237ebddb4a668651b8812e6bdb4a2be2f5)), closes [#744](https://github.com/HartiganHM/concert-crawl/issues/744)
* **scripts:** use regex not glob for service-ID prefix check ([01221e3](https://github.com/HartiganHM/concert-crawl/commit/01221e3552f26dad4c7f0376fa78cbcf29feea8a)), closes [#747](https://github.com/HartiganHM/concert-crawl/issues/747)

## [1.74.12](https://github.com/HartiganHM/concert-crawl/compare/v1.74.11...v1.74.12) (2026-06-24)


### Bug Fixes

* **deploy-prod:** clean up stale comment fragments + artifact name ([bd512ce](https://github.com/HartiganHM/concert-crawl/commit/bd512cec5171fead3aeffafac466195f449f19e4)), closes [#745](https://github.com/HartiganHM/concert-crawl/issues/745)
* **deploy-prod:** loud-fail gate on wrong branch + don't rollback on smoke timeout ([420f057](https://github.com/HartiganHM/concert-crawl/commit/420f05719c18414adf47d39b1ff803ff1946db00)), closes [#745](https://github.com/HartiganHM/concert-crawl/issues/745)
* **deploy-prod:** sync comments + runbook with new rollback trigger ([6c47476](https://github.com/HartiganHM/concert-crawl/commit/6c474760b41fad3d81a187018d443158ac965720)), closes [#745](https://github.com/HartiganHM/concert-crawl/issues/745)
* **workflows:** fail loud on wrong-branch rollback; runbook stale text ([d7ddae1](https://github.com/HartiganHM/concert-crawl/commit/d7ddae1201a1203fe977836efd5d09769104e292)), closes [#745](https://github.com/HartiganHM/concert-crawl/issues/745)

## [1.74.11](https://github.com/HartiganHM/concert-crawl/compare/v1.74.10...v1.74.11) (2026-06-24)


### Bug Fixes

* **docs:** address all 10 Copilot review 2 comments on PR 739 ([2c23e82](https://github.com/HartiganHM/concert-crawl/commit/2c23e82c5d3a58f9271cc010152a17c6af71cda6)), closes [#705](https://github.com/HartiganHM/concert-crawl/issues/705)
* **docs:** address all 5 Copilot review 4 comments on PR 739 ([8895068](https://github.com/HartiganHM/concert-crawl/commit/8895068110a5067aff10efc8ad78bec4302350f2))
* **docs:** address all 5 Copilot review 5 comments on PR 739 ([6dd8fe0](https://github.com/HartiganHM/concert-crawl/commit/6dd8fe043054cac4a9ebf49b3d1313c8bb42a65e))
* **docs:** address all 7 Copilot review 1 comments on PR 739 ([14ae281](https://github.com/HartiganHM/concert-crawl/commit/14ae28165afebff0f49269b66970bc624378522d))
* **docs:** address all 8 Copilot review 3 comments on PR 739 ([6d63f75](https://github.com/HartiganHM/concert-crawl/commit/6d63f75e2c6b1beaf4483719f8812433a159d680)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)

## [1.74.10](https://github.com/HartiganHM/concert-crawl/compare/v1.74.9...v1.74.10) (2026-06-24)


### Bug Fixes

* **deploy:** flatten nested parens in pin_status log ([f736615](https://github.com/HartiganHM/concert-crawl/commit/f736615e0bd95c82ed0267ec3ade4545c793f818))
* **deploy:** normalize COMMIT_SHA to lowercase before validating ([35d475f](https://github.com/HartiganHM/concert-crawl/commit/35d475febae94cfaa21f93bc44b65e61201ad6c7)), closes [#744](https://github.com/HartiganHM/concert-crawl/issues/744)
* **deploy:** omit commitId for cron services (Render API limitation) ([6fc70c7](https://github.com/HartiganHM/concert-crawl/commit/6fc70c7b2475a78def335a71e5d4c1e98362e1e2)), closes [#742](https://github.com/HartiganHM/concert-crawl/issues/742) [#740](https://github.com/HartiganHM/concert-crawl/issues/740)
* **deploy:** use printf not echo for SHA normalization ([a0036ab](https://github.com/HartiganHM/concert-crawl/commit/a0036ab95a0d54f9229b5f155e62adea71335ced))
* **deploy:** validate COMMIT_SHA + build JSON via jq ([ef629c6](https://github.com/HartiganHM/concert-crawl/commit/ef629c6d61980b97654a0d733515bb9e80bae063)), closes [#744](https://github.com/HartiganHM/concert-crawl/issues/744)
* **deploy:** validate service ID prefix + clarify log fields ([a91a059](https://github.com/HartiganHM/concert-crawl/commit/a91a0592d5468299a373b19e6967a04e4c5a07f3)), closes [#744](https://github.com/HartiganHM/concert-crawl/issues/744)

## [1.74.9](https://github.com/HartiganHM/concert-crawl/compare/v1.74.8...v1.74.9) (2026-06-23)


### Bug Fixes

* **ci:** apply [skip ci] walk to render-wait too; correct gate comment ([d8c41db](https://github.com/HartiganHM/concert-crawl/commit/d8c41dbcfe128328c4682f980fcfde7a158a889b))
* **ci:** fetch main in deploy-prod gate before resolving deployable SHA ([cb22249](https://github.com/HartiganHM/concert-crawl/commit/cb2224999b087a7893f4a6cc7fbf8bb327b544d3))
* **ci:** resolve main_sha from fetched ref (atomic) — close race ([2dbb624](https://github.com/HartiganHM/concert-crawl/commit/2dbb6240bc3b1ec5c74004c40e24f7293d6b1a21)), closes [#API](https://github.com/HartiganHM/concert-crawl/issues/API)
* **ci:** walk from github.sha not origin/main on workflow_dispatch ([4871a3b](https://github.com/HartiganHM/concert-crawl/commit/4871a3b57928e5bd8fdd7d5ad703ce5034fbba4c)), closes [#742](https://github.com/HartiganHM/concert-crawl/issues/742)
* **ci:** walk past [skip ci] release commits in SHA-drift guards ([3844454](https://github.com/HartiganHM/concert-crawl/commit/384445462587089b7daafa41f65d35632ba847ad)), closes [#740](https://github.com/HartiganHM/concert-crawl/issues/740) [#740](https://github.com/HartiganHM/concert-crawl/issues/740)

## [1.74.8](https://github.com/HartiganHM/concert-crawl/compare/v1.74.7...v1.74.8) (2026-06-23)


### Bug Fixes

* **deploy:** clarify script scope + handle both Render response shapes ([71c625b](https://github.com/HartiganHM/concert-crawl/commit/71c625b039b03c529bd02bf4a3963a568f8de6ca))
* **deploy:** print Render API error body on failure + correct preflight path ([a742456](https://github.com/HartiganHM/concert-crawl/commit/a7424568dd857e600c08baf31537fb9c6e3f86d8)), closes [#740](https://github.com/HartiganHM/concert-crawl/issues/740)
* **deploy:** use Render API + commitId pinning instead of deploy hooks ([bd650bc](https://github.com/HartiganHM/concert-crawl/commit/bd650bcfe1cd5cac8a0e735f1e1723f24b8530ea))

## [1.74.7](https://github.com/HartiganHM/concert-crawl/compare/v1.74.6...v1.74.7) (2026-06-23)


### Bug Fixes

* **e2e:** target password input by name attr, not label ([4791ff5](https://github.com/HartiganHM/concert-crawl/commit/4791ff5998d24d008f0aec38cd7544895760fa8c))

## [1.74.6](https://github.com/HartiganHM/concert-crawl/compare/v1.74.5...v1.74.6) (2026-06-23)


### Bug Fixes

* **e2e:** disambiguate Clerk Continue button with exact match ([740c773](https://github.com/HartiganHM/concert-crawl/commit/740c773cede256e2da8491a62db94da308d4166b)), closes [#734](https://github.com/HartiganHM/concert-crawl/issues/734)

## [1.74.5](https://github.com/HartiganHM/concert-crawl/compare/v1.74.4...v1.74.5) (2026-06-23)


### Bug Fixes

* **smoke:** authenticate before exercising auth-gated routes ([fa96940](https://github.com/HartiganHM/concert-crawl/commit/fa9694058ede0c06e1b593ebc6da1b83c6420126)), closes [#716](https://github.com/HartiganHM/concert-crawl/issues/716)

## [1.74.4](https://github.com/HartiganHM/concert-crawl/compare/v1.74.3...v1.74.4) (2026-06-22)


### Bug Fixes

* **crawler:** address Copilot review on PR [#729](https://github.com/HartiganHM/concert-crawl/issues/729) ([c36e58e](https://github.com/HartiganHM/concert-crawl/commit/c36e58ead47516cc30aaa1688333124840ddbb00))
* **crawler:** aeg fetcher schema + TBD-date handling for Gothic and Ogden ([1dc7f72](https://github.com/HartiganHM/concert-crawl/commit/1dc7f728413e3e06e5b52c3036ac8eeb346c5506)), closes [#623](https://github.com/HartiganHM/concert-crawl/issues/623) [#720](https://github.com/HartiganHM/concert-crawl/issues/720)

## [1.74.3](https://github.com/HartiganHM/concert-crawl/compare/v1.74.2...v1.74.3) (2026-06-22)


### Bug Fixes

* **admin/prices:** /coverage matches /events filter set + add count=true regression ([b2dacc9](https://github.com/HartiganHM/concert-crawl/commit/b2dacc9bd97e16d7be38b24689f2f085ee417528))
* **admin/prices:** exclude hidden_from_consumer from missing-price list + coverage ([466e859](https://github.com/HartiganHM/concert-crawl/commit/466e8599e80100dd0abd18590d6f6cc7e04aa041)), closes [#732](https://github.com/HartiganHM/concert-crawl/issues/732) [#712](https://github.com/HartiganHM/concert-crawl/issues/712)

## [1.74.2](https://github.com/HartiganHM/concert-crawl/compare/v1.74.1...v1.74.2) (2026-06-22)


### Bug Fixes

* **crawler:** address Copilot round-1 review on PR [#730](https://github.com/HartiganHM/concert-crawl/issues/730) ([95dc093](https://github.com/HartiganHM/concert-crawl/commit/95dc093264ab51da7950a7311b83e3221907902f))
* **crawler:** teach isConcert to handle DJ-as-headliner billings ([2e44e7b](https://github.com/HartiganHM/concert-crawl/commit/2e44e7b974f2c6b6488c5ae8e54a27d40de1f563)), closes [#706](https://github.com/HartiganHM/concert-crawl/issues/706)

## [1.74.1](https://github.com/HartiganHM/concert-crawl/compare/v1.74.0...v1.74.1) (2026-06-22)


### Bug Fixes

* address Copilot review 1 on PR 731 ([96de3e2](https://github.com/HartiganHM/concert-crawl/commit/96de3e26eaa754503eb105df6e7680bc558cc165))
* **api,crawler:** post-merge audit fixes for price-source PR 722 + 723 ([d4d584c](https://github.com/HartiganHM/concert-crawl/commit/d4d584c98b156b7b627b0409ec1bd61437896a14))

# [1.74.0](https://github.com/HartiganHM/concert-crawl/compare/v1.73.0...v1.74.0) (2026-06-22)


### Features

* **admin:** include Missing in /admin/review pending header count ([9cc7547](https://github.com/HartiganHM/concert-crawl/commit/9cc75470f3d12375e7027fafb38838fec2f78ff2)), closes [#711](https://github.com/HartiganHM/concert-crawl/issues/711)

# [1.73.0](https://github.com/HartiganHM/concert-crawl/compare/v1.72.0...v1.73.0) (2026-06-22)


### Bug Fixes

* **api:** address Copilot round-2 review on PR 723 ([75c6517](https://github.com/HartiganHM/concert-crawl/commit/75c651713acea5774055aa87394b303e4e5ccc07))
* **api:** address Copilot round-3 review on PR 723 ([af99155](https://github.com/HartiganHM/concert-crawl/commit/af99155a53300b02c317fcae0905c71233552180))


### Features

* **api:** add aggregateByTier composer for per-tier price blocks ([c9dc461](https://github.com/HartiganHM/concert-crawl/commit/c9dc461449b8011b63a4ea196e5f1679276b454c))
* **api:** add pickTierHeadline helper for per-tier price aggregation ([739cd75](https://github.com/HartiganHM/concert-crawl/commit/739cd7540d4228a74f9cc12c0b63542f5ff594ad))
* **api:** always include pendingSubmissions on event detail ([698f3ab](https://github.com/HartiganHM/concert-crawl/commit/698f3abb4bf152618fa77141953700954cd1c2a3))
* **api:** dispute endpoint inherits vendor from parent (price-only contest scope) ([a498824](https://github.com/HartiganHM/concert-crawl/commit/a4988248ca7967d44cd38cbc637902b1f2271652))
* **api:** emit priceByTier per-tier price aggregation on event detail ([a6a042f](https://github.com/HartiganHM/concert-crawl/commit/a6a042ff1f45c9e67ee64ec4020602ac46a18a34))
* **types:** add TierPriceBlock + priceByTier to EventDetailResponse ([d1fa09a](https://github.com/HartiganHM/concert-crawl/commit/d1fa09aa85f88d4922bc8b87953b17ea65f726ac))

# [1.72.0](https://github.com/HartiganHM/concert-crawl/compare/v1.71.3...v1.72.0) (2026-06-22)


### Features

* **crawler-core:** add deriveTicketLinks composer ([c813547](https://github.com/HartiganHM/concert-crawl/commit/c81354732ba22ca9b8f455d479b26f8fd60c6192))
* **crawler-core:** add host-rules vendor + resale lookup tables ([5dfb7a5](https://github.com/HartiganHM/concert-crawl/commit/5dfb7a5dae7b1ea4663fc4338daba89cc5765b0b))
* **crawler-core:** add parseHost URL-to-hostname helper ([4f3368d](https://github.com/HartiganHM/concert-crawl/commit/4f3368db59f232a34379faa8f5ebf22f6ac97944)), closes [#641](https://github.com/HartiganHM/concert-crawl/issues/641)
* **crawler-core:** emit ticketLinks on every event upsert ([9f2d3da](https://github.com/HartiganHM/concert-crawl/commit/9f2d3daa0eecea338f1ee77b0995ff2825d06013))
* **crawler:** add backfill-ticket-links CLI script ([07c1167](https://github.com/HartiganHM/concert-crawl/commit/07c1167fb160fb5055fe8f13e078f77d3ff8c0f3))

## [1.71.3](https://github.com/HartiganHM/concert-crawl/compare/v1.71.2...v1.71.3) (2026-06-22)


### Bug Fixes

* **admin:** gate Missing empty state on server total, not page rows ([e8bac46](https://github.com/HartiganHM/concert-crawl/commit/e8bac461e35613a2b0eccee794772ae3d21a7c13))
* **admin:** gate Price coverage empty state on server total ([6e4a528](https://github.com/HartiganHM/concert-crawl/commit/6e4a52855fd1a28f8d5a613b725dab4bdebba789))
* **admin:** keep Pagination mounted when page is empty mid-clamp ([2979c4b](https://github.com/HartiganHM/concert-crawl/commit/2979c4b83c8c52dc0a165567788dd117458de6dc))
* **admin:** section header badges use server total, not page-row count ([41915b8](https://github.com/HartiganHM/concert-crawl/commit/41915b857573a020ac61eeee47a2404769ade165)), closes [#710](https://github.com/HartiganHM/concert-crawl/issues/710)
* **admin:** tighten Pagination test + simplify total prop pass-through ([d3be202](https://github.com/HartiganHM/concert-crawl/commit/d3be2020ea59085d69ca3b585464265dce6499c3))

## [1.71.2](https://github.com/HartiganHM/concert-crawl/compare/v1.71.1...v1.71.2) (2026-06-22)


### Bug Fixes

* **admin:** drop redundant scroll container from Price coverage table ([7a47add](https://github.com/HartiganHM/concert-crawl/commit/7a47add07deef6a56c9faa37f9fecf87bb63c7ef)), closes [#713](https://github.com/HartiganHM/concert-crawl/issues/713) [#693](https://github.com/HartiganHM/concert-crawl/issues/693)
* **admin:** use JSX-style comment in PriceCoverageTable ([1eaf0b7](https://github.com/HartiganHM/concert-crawl/commit/1eaf0b7ede50f63e206f3d748b717d6889b2ec3f))

## [1.71.1](https://github.com/HartiganHM/concert-crawl/compare/v1.71.0...v1.71.1) (2026-06-22)


### Bug Fixes

* **admin:** align review tab pills with list-endpoint filters ([6a45bb4](https://github.com/HartiganHM/concert-crawl/commit/6a45bb4be6b1c7da7c28a73052907c23c83c3c2d)), closes [#708](https://github.com/HartiganHM/concert-crawl/issues/708) [#709](https://github.com/HartiganHM/concert-crawl/issues/709) [#712](https://github.com/HartiganHM/concert-crawl/issues/712)
* **admin:** map 400 invalid-UUID to notFound, not error boundary ([bd028e7](https://github.com/HartiganHM/concert-crawl/commit/bd028e758caa2aa81003c697fc0053e843175279))
* **admin:** only map 404 to notFound; let other errors propagate ([8e7fa28](https://github.com/HartiganHM/concert-crawl/commit/8e7fa2875ffe3eec3d293e1a765d433a560823b4))
* **admin:** unwrap apiClient.get envelope in event editor page ([3dc3e73](https://github.com/HartiganHM/concert-crawl/commit/3dc3e73bda3c58b6dee7cd38ce7bdacf068e691a)), closes [#707](https://github.com/HartiganHM/concert-crawl/issues/707)

# [1.71.0](https://github.com/HartiganHM/concert-crawl/compare/v1.70.2...v1.71.0) (2026-06-20)


### Bug Fixes

* address Copilot round 10 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([b06eeb6](https://github.com/HartiganHM/concert-crawl/commit/b06eeb6a5c33477b4487ad9bcfb3a169cb632e9c))
* address Copilot round 11 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([c252f28](https://github.com/HartiganHM/concert-crawl/commit/c252f28f019788e25c8aacf0e5872a5580934cd9))
* address Copilot round 12 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([9a6ee6d](https://github.com/HartiganHM/concert-crawl/commit/9a6ee6d542f5bc8c147f82ba403dc420237ff2bd))
* address Copilot round 2 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([4ff64ab](https://github.com/HartiganHM/concert-crawl/commit/4ff64abaf4e0f6bfe3c96bc0e95ca5f0f506df7a))
* address Copilot round 3 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([e9d0ff1](https://github.com/HartiganHM/concert-crawl/commit/e9d0ff1c3efb81ebbd7cbfb4e9de0bda6e3804ed))
* address Copilot round 4 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([470efd7](https://github.com/HartiganHM/concert-crawl/commit/470efd75bb0a7dff55d33261cc9c93560af8fb6a))
* address Copilot round 5 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([609a383](https://github.com/HartiganHM/concert-crawl/commit/609a38370dc298881557067a620df0c5c5a390b0))
* address Copilot round 6 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([e3a6fd2](https://github.com/HartiganHM/concert-crawl/commit/e3a6fd2cf4346363576dfdd1306e1506511ca9c4))
* address Copilot round 7 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([841c441](https://github.com/HartiganHM/concert-crawl/commit/841c441488dca047da98f4153e16bc5c841b845f))
* address Copilot round 8 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([a83ad58](https://github.com/HartiganHM/concert-crawl/commit/a83ad580854e0bfc1d3e5eed7fae36c159829556))
* address Copilot round 9 review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([105b242](https://github.com/HartiganHM/concert-crawl/commit/105b242d50c7b346b3a463e41101e117a45b28e8))
* **api:** address Copilot review on PR [#705](https://github.com/HartiganHM/concert-crawl/issues/705) ([710c11e](https://github.com/HartiganHM/concert-crawl/commit/710c11ee8129aaa893f8f400488d2f8054726dc2))


### Features

* **api:** accept sourceCategory on submit; corroborationCount starts at 1 ([ddbe3cd](https://github.com/HartiganHM/concert-crawl/commit/ddbe3cd6247289b939cb9097d5aae288240c15fc)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **api:** bring price-submission-confirms promotion logic into alignment ([507765e](https://github.com/HartiganHM/concert-crawl/commit/507765e429cc91c1d198bd38fc388d91ff8ce648)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **db:** add source_category enum + ticket_links jsonb to schema ([1194f5f](https://github.com/HartiganHM/concert-crawl/commit/1194f5f59697aaf0454ae33232043f4711b6fca7)), closes [#641](https://github.com/HartiganHM/concert-crawl/issues/641) [#644](https://github.com/HartiganHM/concert-crawl/issues/644) [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **db:** migration 0040 — source_category + ticket_links + 1/2 corroboration ([0b239de](https://github.com/HartiganHM/concert-crawl/commit/0b239de849574bb74eac7b823bac98b8ebef7f89))
* **types:** add source_category + ticket_links exports; extend price submission / event types ([9d340a3](https://github.com/HartiganHM/concert-crawl/commit/9d340a3307646d2e92fe369fab7e8c1fa6bff317))

## [1.70.2](https://github.com/HartiganHM/concert-crawl/compare/v1.70.1...v1.70.2) (2026-06-20)


### Bug Fixes

* **ci:** guard .commit-null in render scripts (Copilot review) ([adef44b](https://github.com/HartiganHM/concert-crawl/commit/adef44b9e8216a673e1c8e663cc7b9c116c029dd))
* **ci:** read .commit.id, not .commit, from Render deploys API ([6f05534](https://github.com/HartiganHM/concert-crawl/commit/6f0553431087a057e5d208adc66ae7da64c75985))

## [1.70.1](https://github.com/HartiganHM/concert-crawl/compare/v1.70.0...v1.70.1) (2026-06-20)


### Bug Fixes

* **crawler:** expand isConcert prompt rules for false-negative patterns ([bfbcdb9](https://github.com/HartiganHM/concert-crawl/commit/bfbcdb9c40a27752a7ea26a1f819ba165aa9cf82))
* **scripts:** alias @concert-crawl/crawler-core in vitest scripts config ([b734507](https://github.com/HartiganHM/concert-crawl/commit/b73450705803eaa15f395c476c715489ed7405b2))
* **scripts:** import IS_CONCERT_RULES from crawler-core source ([a5376d1](https://github.com/HartiganHM/concert-crawl/commit/a5376d199c10d7ed83b16414a4138b3a8e2701ea))

# [1.70.0](https://github.com/HartiganHM/concert-crawl/compare/v1.69.0...v1.70.0) (2026-06-20)


### Bug Fixes

* **admin:** address Copilot fifth-pass review on PR [#702](https://github.com/HartiganHM/concert-crawl/issues/702) ([4136607](https://github.com/HartiganHM/concert-crawl/commit/4136607ee6c17f77efba674745cea4e7d8a7c3ff))
* **admin:** address Copilot fourth-pass review on PR [#702](https://github.com/HartiganHM/concert-crawl/issues/702) ([ba0d873](https://github.com/HartiganHM/concert-crawl/commit/ba0d873f89bc3493b56fc9b597896ba36a1555c8))
* **admin:** address Copilot review on PR [#702](https://github.com/HartiganHM/concert-crawl/issues/702) ([c504a22](https://github.com/HartiganHM/concert-crawl/commit/c504a225ecc5fadf2cecf6fce2c8e8ca15e6e1ac))
* **admin:** address Copilot second-pass review on PR [#702](https://github.com/HartiganHM/concert-crawl/issues/702) ([805f93f](https://github.com/HartiganHM/concert-crawl/commit/805f93fdbe0943c3d6fde5cf163596aa023a9e0d))
* **admin:** address Copilot third-pass review on PR [#702](https://github.com/HartiganHM/concert-crawl/issues/702) ([29c42ec](https://github.com/HartiganHM/concert-crawl/commit/29c42ec4ff26235c95784b34634b5fa4c9fb108f))
* **admin:** align pagination component with design tokens ([306c233](https://github.com/HartiganHM/concert-crawl/commit/306c233f700b57bb1ac029f498440dd6c0145e71))


### Features

* **admin:** page-replacement pagination across review tabs ([6a17d0f](https://github.com/HartiganHM/concert-crawl/commit/6a17d0f7e8b646d3f6a7d13d1167aa9baa8f8b46)), closes [#693](https://github.com/HartiganHM/concert-crawl/issues/693)

# [1.69.0](https://github.com/HartiganHM/concert-crawl/compare/v1.68.0...v1.69.0) (2026-06-20)


### Bug Fixes

* **scripts:** address all 5 Copilot review comments on PR [#704](https://github.com/HartiganHM/concert-crawl/issues/704) ([5a91e57](https://github.com/HartiganHM/concert-crawl/commit/5a91e5771c2c6cae778436714571e155b21cc072))
* **scripts:** rename vitest config so workspace packages don't inherit it ([fc71dc0](https://github.com/HartiganHM/concert-crawl/commit/fc71dc0060cce60cb92c4884bac23e9b24b50ce4)), closes [packages/types#test](https://github.com/packages/types/issues/test)


### Features

* **scripts:** non-concert auto-classification backfill — dry-run + --commit ([#696](https://github.com/HartiganHM/concert-crawl/issues/696)) ([0be2188](https://github.com/HartiganHM/concert-crawl/commit/0be21889406ee8ba92b4e970db1c9ea85d63b86f))

# [1.68.0](https://github.com/HartiganHM/concert-crawl/compare/v1.67.0...v1.68.0) (2026-06-19)


### Bug Fixes

* **crawler:** remove "concert" bias from LLM prompt lead + user message ([057de78](https://github.com/HartiganHM/concert-crawl/commit/057de7839f082ce9523e3a220104b79f429f3e0b)), closes [#701](https://github.com/HartiganHM/concert-crawl/issues/701)


### Features

* **crawler:** llm extractor emits isConcert per event ([#696](https://github.com/HartiganHM/concert-crawl/issues/696)) ([0997d76](https://github.com/HartiganHM/concert-crawl/commit/0997d76aabe1bb96df1cd96cf884740535e43602))
* **crawler:** set hidden_from_consumer on INSERT based on isConcert ([#696](https://github.com/HartiganHM/concert-crawl/issues/696)) ([ce55d07](https://github.com/HartiganHM/concert-crawl/commit/ce55d07585b6e73419f1f908dd5753e99075ded3))

# [1.67.0](https://github.com/HartiganHM/concert-crawl/compare/v1.66.0...v1.67.0) (2026-06-19)


### Bug Fixes

* **api:** address Copilot review on PR [#700](https://github.com/HartiganHM/concert-crawl/issues/700) ([22abb0c](https://github.com/HartiganHM/concert-crawl/commit/22abb0c9163626c793d0fb36b7d57d9880a4a4dd))


### Features

* **api:** opt-in count on admin list endpoints + review counts shape ([10c75a9](https://github.com/HartiganHM/concert-crawl/commit/10c75a9c1f00ba4f02cb067ad21f049a939af466))

# [1.66.0](https://github.com/HartiganHM/concert-crawl/compare/v1.65.1...v1.66.0) (2026-06-19)


### Bug Fixes

* **admin:** address Copilot review on PR [#691](https://github.com/HartiganHM/concert-crawl/issues/691) ([13fb0a1](https://github.com/HartiganHM/concert-crawl/commit/13fb0a1122d9a7a9dbcbb345a4c2449706718c2c))


### Features

* **admin:** tanstack query + smaller page sizes for review tabs ([af0af8f](https://github.com/HartiganHM/concert-crawl/commit/af0af8fd3a67c684c67729a978461d72fd8f1406))

## [1.65.1](https://github.com/HartiganHM/concert-crawl/compare/v1.65.0...v1.65.1) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#690](https://github.com/HartiganHM/concert-crawl/issues/690) ([a22414a](https://github.com/HartiganHM/concert-crawl/commit/a22414ad10653df60010b916d8a327f589420083))
* **admin:** debounced search input + Missing loading skeleton ([04e30fc](https://github.com/HartiganHM/concert-crawl/commit/04e30fc2939ce8b79ce1c838787252096bfa8af2)), closes [#686](https://github.com/HartiganHM/concert-crawl/issues/686) [#687](https://github.com/HartiganHM/concert-crawl/issues/687)

# [1.65.0](https://github.com/HartiganHM/concert-crawl/compare/v1.64.0...v1.65.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#683](https://github.com/HartiganHM/concert-crawl/issues/683) ([dccb2b3](https://github.com/HartiganHM/concert-crawl/commit/dccb2b3d2f212479ea3643da2bf869011fe0deab))


### Features

* **admin:** merge-events affordance (PR 11/11) ([9cc2171](https://github.com/HartiganHM/concert-crawl/commit/9cc217193eac03f622d4d3fa5c63bfca1a2f9051))

# [1.64.0](https://github.com/HartiganHM/concert-crawl/compare/v1.63.0...v1.64.0) (2026-06-18)


### Bug Fixes

* **ci:** add bounded timeouts + --silent --show-error to deploy hook curls ([47a38ea](https://github.com/HartiganHM/concert-crawl/commit/47a38ea6423d91e9631f81fe7ee36863d8eb0794))
* **ci:** address Copilot review on PR [#678](https://github.com/HartiganHM/concert-crawl/issues/678) ([f5e68ea](https://github.com/HartiganHM/concert-crawl/commit/f5e68ea59d1e2e4ce480d9d69bd17b2574ed297c))
* **ci:** address Copilot review on PR [#678](https://github.com/HartiganHM/concert-crawl/issues/678) ([89d6a72](https://github.com/HartiganHM/concert-crawl/commit/89d6a72aa7b75ad785f84c9f19d889257329ae77))
* **ci:** address Copilot review on PR [#678](https://github.com/HartiganHM/concert-crawl/issues/678) ([0d4587f](https://github.com/HartiganHM/concert-crawl/commit/0d4587f6cd6499978773dbf7b0ecca6e4941fdf9))
* **ci:** address Copilot review on PR [#678](https://github.com/HartiganHM/concert-crawl/issues/678) ([72c0e73](https://github.com/HartiganHM/concert-crawl/commit/72c0e735dc0878eb6f2884076adc5778b84623d4))
* **ci:** bound curl timeouts in render-rollback.sh ([e2c79dc](https://github.com/HartiganHM/concert-crawl/commit/e2c79dcb0af7f443d90e77c27c3ca0236063130c))
* **ci:** bound per-probe curl timeouts in health-poll loops ([149bc5e](https://github.com/HartiganHM/concert-crawl/commit/149bc5e790e5a45937fbfa58e24e4c7c55c71217))
* **ci:** drop timed_out rollback trigger; ungate manual rollback ([471ad06](https://github.com/HartiganHM/concert-crawl/commit/471ad067622577995fd96100226ffb8a58eaf5a4))
* **ci:** gate prod deploy on upstream SHA still matching main HEAD ([201b2e4](https://github.com/HartiganHM/concert-crawl/commit/201b2e46b29f4cf46f7ef1ad9e10ed22b8ca1cc6))
* **ci:** guard render-rollback against missing live deploy ([fd7ff15](https://github.com/HartiganHM/concert-crawl/commit/fd7ff1517db1e7c2da78b125c8ba21ad1a7983df))
* **ci:** guard render-wait-for-live against null live + missing service ID ([16a3683](https://github.com/HartiganHM/concert-crawl/commit/16a3683fc86f20fe810ea49394112276e405ae18))
* **ci:** guard rollback against rolling forward onto bad deploy ([bb1ac3f](https://github.com/HartiganHM/concert-crawl/commit/bb1ac3f4f4c08bc129e81c8cb92b5e984bf558a3))
* **ci:** move workflow_dispatch branch check to job-level if ([3c0b2a9](https://github.com/HartiganHM/concert-crawl/commit/3c0b2a9d1d908e05d5530345af0f05d6c0fa47e0))
* **ci:** pin actions/checkout to workflow_run.head_sha ([f17c284](https://github.com/HartiganHM/concert-crawl/commit/f17c284d05b24b1e95b530d7e35dbf91cc6fee3d))
* **ci:** preflight check for Render deploy hook secrets ([c353e9b](https://github.com/HartiganHM/concert-crawl/commit/c353e9bd208fff78f80c8c664fb85402eaf17a63))
* **ci:** preflight env-var checks; correct deploy-prod gate comment ([22eb5bc](https://github.com/HartiganHM/concert-crawl/commit/22eb5bcc9c60bd635f6b363c6323deaff5a2d6e8))
* **ci:** propagate workflow_run failures via fail-loud gate steps ([f92e750](https://github.com/HartiganHM/concert-crawl/commit/f92e750fcb5d04b540a36b82514e31c2cb31ea9d))
* **ci:** re-verify SHA in deploy job, not just the gate job ([67a73b9](https://github.com/HartiganHM/concert-crawl/commit/67a73b9e14f7f3199ef654f5cb3e67186c2ded5a))
* **ci:** refuse prod deploy when upstream staging-smoke was workflow_dispatch ([431da94](https://github.com/HartiganHM/concert-crawl/commit/431da94143de993c6174215b4e8583a0a70c3373))
* **ci:** require STAGING_SMOKE_ENABLED for auto-deploy-prod workflow_run ([1534d9b](https://github.com/HartiganHM/concert-crawl/commit/1534d9b7d5bb80a2498eca80e54060a4cedb97ac))
* **ci:** restrict workflow_dispatch on smoke workflows to main ([35a07aa](https://github.com/HartiganHM/concert-crawl/commit/35a07aa9b805ec8c4c6ecae37f3a187b2d0e1624))
* **ci:** scope GITHUB_TOKEN to contents:read; poll /v1/health instead of fixed sleep ([94eb6bc](https://github.com/HartiganHM/concert-crawl/commit/94eb6bc851cc52f3ee129b80624d561aa4134faf))
* **ci:** silent-skip post-deploy-smoke on upstream non-success ([0c40cc5](https://github.com/HartiganHM/concert-crawl/commit/0c40cc55d1c40d5edf53c216c836e88396f68749))
* **ci:** split deploy-prod + rollback into gate + deploy jobs ([327efe3](https://github.com/HartiganHM/concert-crawl/commit/327efe35438e623167ac12615c02e4e7f1792ec8))
* **ci:** tighten workflow_dispatch gate; widen rollback lookback ([e737322](https://github.com/HartiganHM/concert-crawl/commit/e7373226edc9fbda8221dabd9b6103d795c24b09))
* **ci:** treat smoke timeout as rollback signal; fail fast on missing URLs ([264d001](https://github.com/HartiganHM/concert-crawl/commit/264d001d06bcba59d9320fcb447cd71df5f25dc9))
* **ci:** unify prod-pipeline concurrency group ([d44ab75](https://github.com/HartiganHM/concert-crawl/commit/d44ab7524fc0dd64f4314b1a2f14c9e03b6b7181))
* **ci:** unify staging-pipeline concurrency + SHA-drift guard ([5ed11cc](https://github.com/HartiganHM/concert-crawl/commit/5ed11ccde187aa6e46e8c6bf140a572b6326ed51))
* **ci:** wait for new SHA to be live on Render before smoking ([f30f485](https://github.com/HartiganHM/concert-crawl/commit/f30f485221a38ea78255902c17352fea90dd35fd))
* **ci:** widen job timeouts to cover render-wait-for-live worst case ([6d36c5a](https://github.com/HartiganHM/concert-crawl/commit/6d36c5a852ec097c7c2d7cf43800bf480f41d399))
* **e2e:** reuse apiGet helper in smoke search test for consistent API URL fallback ([729842e](https://github.com/HartiganHM/concert-crawl/commit/729842ee2361238c224ef328238ed014ee45055e))
* **e2e:** strengthen smoke search assertion to require results or empty state ([d694c6d](https://github.com/HartiganHM/concert-crawl/commit/d694c6dad7d8321833c52ee9d4501e4c07cc79d8))
* **security:** scope undici override to @semantic-release/github ([d4c1673](https://github.com/HartiganHM/concert-crawl/commit/d4c1673344e339fd4a81fd84d7ec7cf9075dd4da))


### Features

* **ci:** auto-deploy prod gated by staging smoke, with rollback ([1de49c1](https://github.com/HartiganHM/concert-crawl/commit/1de49c1cca99a3a7540a74e7d213af89e0452f06)), closes [#613](https://github.com/HartiganHM/concert-crawl/issues/613) [#613](https://github.com/HartiganHM/concert-crawl/issues/613)

# [1.63.0](https://github.com/HartiganHM/concert-crawl/compare/v1.62.0...v1.63.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#681](https://github.com/HartiganHM/concert-crawl/issues/681) ([9af5279](https://github.com/HartiganHM/concert-crawl/commit/9af527970c64bfef81c0dcfc0199a37b8c956bcb))
* **admin:** address Copilot review on PR [#682](https://github.com/HartiganHM/concert-crawl/issues/682) ([c538d7c](https://github.com/HartiganHM/concert-crawl/commit/c538d7c5ef77b0b468a585776f529b14328b841d))


### Features

* **admin:** bulk select + bulk dock (PR 10/11) ([31a17c7](https://github.com/HartiganHM/concert-crawl/commit/31a17c780abf01b072182f3ef960b2f747e4ff80))

# [1.62.0](https://github.com/HartiganHM/concert-crawl/compare/v1.61.0...v1.62.0) (2026-06-18)


### Bug Fixes

* **api:** hide first_missing_at rows from public events endpoints ([57ba1ac](https://github.com/HartiganHM/concert-crawl/commit/57ba1ac1495c19bad6e60f945081e63c9d563920)), closes [#607](https://github.com/HartiganHM/concert-crawl/issues/607)
* **api:** hide first_missing_at rows from public venues endpoints ([6670fbe](https://github.com/HartiganHM/concert-crawl/commit/6670fbe2ee9b51a2cec2b4ace000a58999ea9735))
* **api:** hide first_missing_at rows from search/popular endpoint ([05f08e5](https://github.com/HartiganHM/concert-crawl/commit/05f08e53024ab36cd52c0a0b8f69a0874a03358b))
* **deps:** constrain undici override to ^7.28.0 to keep jsdom working ([7bc4ef8](https://github.com/HartiganHM/concert-crawl/commit/7bc4ef8011deac2ec9ba47f75ef7a4ece729cf77))


### Features

* **admin:** editor mark non-concert + danger zone (PR 9/11) ([f8a87bd](https://github.com/HartiganHM/concert-crawl/commit/f8a87bdd28bfe5353ee103c7df069ff8576e5b40))

# [1.61.0](https://github.com/HartiganHM/concert-crawl/compare/v1.60.0...v1.61.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#680](https://github.com/HartiganHM/concert-crawl/issues/680) ([4a01982](https://github.com/HartiganHM/concert-crawl/commit/4a019826b72c85faa55644d8755988977722f5b8))


### Features

* **admin:** editor sold-out availability control (PR 8/11) ([000304e](https://github.com/HartiganHM/concert-crawl/commit/000304edc0587b0d85aed9e158315e5f66eaadff))

# [1.60.0](https://github.com/HartiganHM/concert-crawl/compare/v1.59.0...v1.60.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#679](https://github.com/HartiganHM/concert-crawl/issues/679) ([5453353](https://github.com/HartiganHM/concert-crawl/commit/54533532940075747ba57c64e0909cc4bf7fd8d7))


### Features

* **admin:** editor status section + save bar (PR 7/11) ([d26b38d](https://github.com/HartiganHM/concert-crawl/commit/d26b38d69c4df01180e9bbd020029af45f155f28))

# [1.59.0](https://github.com/HartiganHM/concert-crawl/compare/v1.58.0...v1.59.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#677](https://github.com/HartiganHM/concert-crawl/issues/677) ([9745c27](https://github.com/HartiganHM/concert-crawl/commit/9745c27dfe386851b5be4c227f8d202860223083))


### Features

* **admin:** all-events row actions + non-concert + delete (PR 6/11) ([62fd404](https://github.com/HartiganHM/concert-crawl/commit/62fd40481f45b78209b6013acac2e52e3b6fb5e8))

# [1.58.0](https://github.com/HartiganHM/concert-crawl/compare/v1.57.0...v1.58.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#673](https://github.com/HartiganHM/concert-crawl/issues/673) ([ea4d465](https://github.com/HartiganHM/concert-crawl/commit/ea4d4654f2743f7018756c142b8917952d1b2def))


### Features

* **admin:** all-events filter bar + URL sync (PR 5 frontend) ([736b0b8](https://github.com/HartiganHM/concert-crawl/commit/736b0b86132c3543ba98f50ac35124eeabb6816f))
* **api:** all-events filters + search (PR 5 backend) ([000c6f4](https://github.com/HartiganHM/concert-crawl/commit/000c6f449c232504447de3881e047b5455aadad5))

# [1.57.0](https://github.com/HartiganHM/concert-crawl/compare/v1.56.1...v1.57.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#672](https://github.com/HartiganHM/concert-crawl/issues/672) ([ab00372](https://github.com/HartiganHM/concert-crawl/commit/ab00372217d4306fb73efecada06fc5ddc95e74f))


### Features

* **admin:** all-events tab read-only table (PR 4/11) ([0268426](https://github.com/HartiganHM/concert-crawl/commit/0268426f7058063983ee4e349b0222ae22a93c2c))

## [1.56.1](https://github.com/HartiganHM/concert-crawl/compare/v1.56.0...v1.56.1) (2026-06-18)


### Bug Fixes

* **web:** address Copilot review on PR [#671](https://github.com/HartiganHM/concert-crawl/issues/671) ([f51c52d](https://github.com/HartiganHM/concert-crawl/commit/f51c52da6269da53519960b2e2277bbe3f2df896))
* **web:** group events by date on venue detail page ([e3019a3](https://github.com/HartiganHM/concert-crawl/commit/e3019a3f95810c4044b6357f0f16ef269af7b121)), closes [#670](https://github.com/HartiganHM/concert-crawl/issues/670)

# [1.56.0](https://github.com/HartiganHM/concert-crawl/compare/v1.55.0...v1.56.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#669](https://github.com/HartiganHM/concert-crawl/issues/669) ([2fc04ce](https://github.com/HartiganHM/concert-crawl/commit/2fc04cee26f605681355cd5ef052d6b6de351b8d))
* **admin:** align editor with design (View detail, non-concert hint) ([64ebed3](https://github.com/HartiganHM/concert-crawl/commit/64ebed36beb6bf031583d9e2c690598b97074204))
* **admin:** await async params for editor page (Next.js 15) ([dc9b9fe](https://github.com/HartiganHM/concert-crawl/commit/dc9b9fee60ac6c1b90107537f80ae9ae58452308))


### Features

* **admin:** add editor copy block (sections, fields, status, art, classification) ([eb320dd](https://github.com/HartiganHM/concert-crawl/commit/eb320ddf8ed661fc634b3b94a0c44da507c928a9))
* **admin:** add editor primitives for read-only event editor ([e6a2084](https://github.com/HartiganHM/concert-crawl/commit/e6a2084804bc61593204408e61c436f1744bdcf7))
* **admin:** add read-only event editor page ([24862be](https://github.com/HartiganHM/concert-crawl/commit/24862be8c0cb455dbaf859c6041d3d61da492a2b))
* **api:** add GET /v1/admin/events/:id for editor surface ([ba79c6c](https://github.com/HartiganHM/concert-crawl/commit/ba79c6c4d627a496d982bac9ccb4435ebf118769))

# [1.55.0](https://github.com/HartiganHM/concert-crawl/compare/v1.54.0...v1.55.0) (2026-06-18)


### Bug Fixes

* **admin:** address Copilot review on PR [#664](https://github.com/HartiganHM/concert-crawl/issues/664) ([13aaf31](https://github.com/HartiganHM/concert-crawl/commit/13aaf31157523cc2333969a56dcca4b85e8fb174))
* **admin:** align Missing tab with design-review property table ([84cba76](https://github.com/HartiganHM/concert-crawl/commit/84cba76fe41b162e41b11ba9d02d239ffe785ece))


### Features

* **admin:** add Missing tab + missing-from-crawl copy strings ([a4007ac](https://github.com/HartiganHM/concert-crawl/commit/a4007acd4b11ea1176b44292d9192880fbd38230))
* **admin:** add missing-tab helpers (computeMissedSweeps, formatLastSeen) ([9cb1fc0](https://github.com/HartiganHM/concert-crawl/commit/9cb1fc0721291c75968919675f454ac7436f07f3))
* **admin:** add MissingChips primitive (missed-sweep + cadence chips) ([1cb950a](https://github.com/HartiganHM/concert-crawl/commit/1cb950aa0f2b0bcd158c95e2d50332f0df4273b0))
* **admin:** add MissingMobile card list for /admin/review mobile ([c73baea](https://github.com/HartiganHM/concert-crawl/commit/c73baea6f7edfea9a964c1d4b1c6147e1acabfb8))
* **admin:** add MissingRow desktop composition ([42b08b9](https://github.com/HartiganHM/concert-crawl/commit/42b08b9794b14da6ce65f74b98c7ea5b14dee367))
* **admin:** add MissingRowMenu (Postponed/Cancelled/Dismiss buttons) ([6df668a](https://github.com/HartiganHM/concert-crawl/commit/6df668aa6aac8f6f0cca5f32a3305d1df1acfce9))
* **admin:** add MissingTabContent orchestrator with pending-action state ([6863dae](https://github.com/HartiganHM/concert-crawl/commit/6863daed4de688ca295052c3155dfef5fd1afbab))
* **admin:** add MissingTable desktop list (banner + rows + empty) ([265c64f](https://github.com/HartiganHM/concert-crawl/commit/265c64f2826e094eb73698d577754c261ac2d5e0))
* **admin:** wire Missing tab into ReviewPageClient + AdminReviewMobile ([a08f7df](https://github.com/HartiganHM/concert-crawl/commit/a08f7df6ed29054c9ce77ee5e71ff489dcce8096))
* **api:** accept firstMissingAt:null on PATCH /v1/admin/events/:id ([87d7407](https://github.com/HartiganHM/concert-crawl/commit/87d7407e48ec3c88799d2f965319de3c89caa67d))

# [1.54.0](https://github.com/HartiganHM/concert-crawl/compare/v1.53.0...v1.54.0) (2026-06-18)


### Features

* **crawler:** aeg template12 platform fetcher dispatch ([#623](https://github.com/HartiganHM/concert-crawl/issues/623)) ([395ebaa](https://github.com/HartiganHM/concert-crawl/commit/395ebaa70ece245585d12bea129eec9b2186dc11)), closes [#659](https://github.com/HartiganHM/concert-crawl/issues/659) [#624](https://github.com/HartiganHM/concert-crawl/issues/624) [#651](https://github.com/HartiganHM/concert-crawl/issues/651) [616/#622](https://github.com/HartiganHM/concert-crawl/issues/622)

# [1.53.0](https://github.com/HartiganHM/concert-crawl/compare/v1.52.7...v1.53.0) (2026-06-18)


### Bug Fixes

* **admin:** align ReviewTabs with design handoff property table ([6884334](https://github.com/HartiganHM/concert-crawl/commit/6884334b477d2980e4fd70572848bbc500a41834))
* **admin:** move DOM focus on tab arrow nav + correct kind JSDoc ([8c82c35](https://github.com/HartiganHM/concert-crawl/commit/8c82c3524b50e464f24b72cebcc893e94773a891)), closes [#661](https://github.com/HartiganHM/concert-crawl/issues/661)


### Features

* **admin:** add AllEventsTabContent stub for tab shell ([5799404](https://github.com/HartiganHM/concert-crawl/commit/579940441ae7444c9c5305625b2c6089daaf9c09))
* **admin:** add EventFlagsTabContent wrapper for tab shell ([8227d07](https://github.com/HartiganHM/concert-crawl/commit/8227d072fc90b298bea8e9f789d890f809b67029))
* **admin:** add PricesTabContent wrapper for tab shell ([12b194f](https://github.com/HartiganHM/concert-crawl/commit/12b194f8380157d9ed04f3ba43333801ea3e9c6e))
* **admin:** add review tab labels and All-events placeholder copy ([c1d6d5e](https://github.com/HartiganHM/concert-crawl/commit/c1d6d5edc1428561ef25b82706efd018359bc80b))
* **admin:** add ReviewTabs primitive with keyboard nav ([2348932](https://github.com/HartiganHM/concert-crawl/commit/2348932893e535aebac00e14c3199aaeaa241c81))
* **admin:** wire desktop tab pill on /admin/review with URL state ([16fa032](https://github.com/HartiganHM/concert-crawl/commit/16fa0325fd794ac95040031315c36eef3ec595b2))

## [1.52.7](https://github.com/HartiganHM/concert-crawl/compare/v1.52.6...v1.52.7) (2026-06-18)


### Bug Fixes

* **vercel:** use ignoreCommand to disable preview deploys ([#656](https://github.com/HartiganHM/concert-crawl/issues/656) follow-up) ([cbec399](https://github.com/HartiganHM/concert-crawl/commit/cbec399bd3beb38c873e8052ff4b05d30f5c9bfe)), closes [#592](https://github.com/HartiganHM/concert-crawl/issues/592) [#592](https://github.com/HartiganHM/concert-crawl/issues/592)

## [1.52.6](https://github.com/HartiganHM/concert-crawl/compare/v1.52.5...v1.52.6) (2026-06-18)


### Bug Fixes

* **crawler:** exclude zero-event runs from event-count-drop baseline ([#645](https://github.com/HartiganHM/concert-crawl/issues/645)) ([f2c1628](https://github.com/HartiganHM/concert-crawl/commit/f2c1628d889b669178ddf18c44fba0defe1e46e9))

## [1.52.5](https://github.com/HartiganHM/concert-crawl/compare/v1.52.4...v1.52.5) (2026-06-18)


### Bug Fixes

* **web:** preserve previous-page state via history-aware back button ([73b78e9](https://github.com/HartiganHM/concert-crawl/commit/73b78e9dcd97f2944da309074d78d98d8f1574ba))

## [1.52.4](https://github.com/HartiganHM/concert-crawl/compare/v1.52.3...v1.52.4) (2026-06-18)


### Bug Fixes

* **web:** prefer first day with shows on calendar week-arrow nav ([1b36af3](https://github.com/HartiganHM/concert-crawl/commit/1b36af3792e7f6d2720a1dc74b7f2f06a0185f85))

## [1.52.3](https://github.com/HartiganHM/concert-crawl/compare/v1.52.2...v1.52.3) (2026-06-17)


### Bug Fixes

* **crawler:** await admin alert email sends so process.exit doesn't drop them ([#649](https://github.com/HartiganHM/concert-crawl/issues/649)) ([9b06e29](https://github.com/HartiganHM/concert-crawl/commit/9b06e294ee5c428febebed9b89f34683d5a39fed)), closes [#51](https://github.com/HartiganHM/concert-crawl/issues/51) [#635](https://github.com/HartiganHM/concert-crawl/issues/635) [#635](https://github.com/HartiganHM/concert-crawl/issues/635)

## [1.52.2](https://github.com/HartiganHM/concert-crawl/compare/v1.52.1...v1.52.2) (2026-06-17)


### Bug Fixes

* **web:** bump venue/time row from 9.5px to 11px on event cards ([51ff403](https://github.com/HartiganHM/concert-crawl/commit/51ff403d38f688236b6ea367ad2b3558a8d259b3))

## [1.52.1](https://github.com/HartiganHM/concert-crawl/compare/v1.52.0...v1.52.1) (2026-06-17)


### Bug Fixes

* **crawler:** canonicalize Ø/ø to O/o to match migration's translate() ([425f837](https://github.com/HartiganHM/concert-crawl/commit/425f8378ee5050a88cc2a435e9886807a9be6f73)), closes [#632](https://github.com/HartiganHM/concert-crawl/issues/632)

# [1.52.0](https://github.com/HartiganHM/concert-crawl/compare/v1.51.0...v1.52.0) (2026-06-17)


### Features

* **crawler:** alert on suspicious event-count drops ([#624](https://github.com/HartiganHM/concert-crawl/issues/624)) ([f717269](https://github.com/HartiganHM/concert-crawl/commit/f7172692039165edfacda0d3e2e10f13f7315d45))

# [1.51.0](https://github.com/HartiganHM/concert-crawl/compare/v1.50.0...v1.51.0) (2026-06-17)


### Features

* **api+web:** admin test-email endpoint + ops tools settings ([668196b](https://github.com/HartiganHM/concert-crawl/commit/668196b5cf52a62bac200b9fc5be40dd03682a4a))

# [1.50.0](https://github.com/HartiganHM/concert-crawl/compare/v1.49.0...v1.50.0) (2026-06-17)


### Bug Fixes

* **api:** seed canonical_artist in test helper to avoid index collisions ([582bb19](https://github.com/HartiganHM/concert-crawl/commit/582bb190ba6cfbbdbb837257214e7eda274f1e9e))
* **crawler+db:** address Copilot review on [#632](https://github.com/HartiganHM/concert-crawl/issues/632) ([70414fd](https://github.com/HartiganHM/concert-crawl/commit/70414fd65a6d95952dfec73947eefd77804ad30c))


### Features

* **crawler+db:** swap upsert key to canonical_artist ([#608](https://github.com/HartiganHM/concert-crawl/issues/608) Track A) ([99d70eb](https://github.com/HartiganHM/concert-crawl/commit/99d70eb4525800c35aaea03de53d306ba57d87fd)), closes [#630](https://github.com/HartiganHM/concert-crawl/issues/630) [#630](https://github.com/HartiganHM/concert-crawl/issues/630) [#630](https://github.com/HartiganHM/concert-crawl/issues/630)

# [1.49.0](https://github.com/HartiganHM/concert-crawl/compare/v1.48.0...v1.49.0) (2026-06-17)


### Features

* **crawler:** distinguish 'skipped' from 'success' in crawl_runs status ([6c6ced6](https://github.com/HartiganHM/concert-crawl/commit/6c6ced677decb2d8452368add2e499e4a88f5052)), closes [#629](https://github.com/HartiganHM/concert-crawl/issues/629) [#624](https://github.com/HartiganHM/concert-crawl/issues/624)

# [1.48.0](https://github.com/HartiganHM/concert-crawl/compare/v1.47.0...v1.48.0) (2026-06-17)


### Bug Fixes

* **crawler+db:** address Copilot review on [#627](https://github.com/HartiganHM/concert-crawl/issues/627) ([f7f41e8](https://github.com/HartiganHM/concert-crawl/commit/f7f41e8175d9cf02fe99128f61dd1be25da04f29))


### Features

* **crawler+db+api:** stale-event detection ([#607](https://github.com/HartiganHM/concert-crawl/issues/607)) ([a8f32cb](https://github.com/HartiganHM/concert-crawl/commit/a8f32cb79f4492454b3cbe579bea0d67d2db354a))

# [1.47.0](https://github.com/HartiganHM/concert-crawl/compare/v1.46.0...v1.47.0) (2026-06-17)


### Bug Fixes

* **api+db:** address Copilot review on [#628](https://github.com/HartiganHM/concert-crawl/issues/628) ([326598e](https://github.com/HartiganHM/concert-crawl/commit/326598e2b7d2fff0c690b11639c410ca6d005fae))


### Features

* **api:** admin Mark Sold Out / Mark Available endpoints ([#618](https://github.com/HartiganHM/concert-crawl/issues/618)) ([06be63e](https://github.com/HartiganHM/concert-crawl/commit/06be63e9c57670f3b94cfd129cb22b8edb1558e0))

# [1.46.0](https://github.com/HartiganHM/concert-crawl/compare/v1.45.3...v1.46.0) (2026-06-17)


### Features

* **crawler+db:** canonical_artist column + crawler population ([7f9cf39](https://github.com/HartiganHM/concert-crawl/commit/7f9cf39a333ddbefed193f24c25050a1d69d5f85)), closes [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#608](https://github.com/HartiganHM/concert-crawl/issues/608) [#606](https://github.com/HartiganHM/concert-crawl/issues/606)

## [1.45.3](https://github.com/HartiganHM/concert-crawl/compare/v1.45.2...v1.45.3) (2026-06-17)


### Bug Fixes

* **crawler:** address Copilot review on [#615](https://github.com/HartiganHM/concert-crawl/issues/615) ([5e17a3b](https://github.com/HartiganHM/concert-crawl/commit/5e17a3bff3ae8b70ade70289dc42a0072c0b3302)), closes [#605](https://github.com/HartiganHM/concert-crawl/issues/605)
* **crawler:** address Copilot review on [#615](https://github.com/HartiganHM/concert-crawl/issues/615) (round 2) ([380e954](https://github.com/HartiganHM/concert-crawl/commit/380e954dda7fe0f21929746a2f55e468aa6e8bc0)), closes [#605](https://github.com/HartiganHM/concert-crawl/issues/605)
* **crawler:** skip cross-venue presale listings ("AT [OTHER VENUE]") ([247642c](https://github.com/HartiganHM/concert-crawl/commit/247642c1fff1304e764085f113f223ef0609e428)), closes [#605](https://github.com/HartiganHM/concert-crawl/issues/605)

## [1.45.2](https://github.com/HartiganHM/concert-crawl/compare/v1.45.1...v1.45.2) (2026-06-17)


### Bug Fixes

* **feedback:** accept null screenshot + don't burn rate-limit on validation failure ([27adf5c](https://github.com/HartiganHM/concert-crawl/commit/27adf5cc4d27da577d506bd0064e16c0bb327229)), closes [#614](https://github.com/HartiganHM/concert-crawl/issues/614)

## [1.45.1](https://github.com/HartiganHM/concert-crawl/compare/v1.45.0...v1.45.1) (2026-06-16)


### Bug Fixes

* **crawler+web:** address Copilot review on [#600](https://github.com/HartiganHM/concert-crawl/issues/600) ([f2287b0](https://github.com/HartiganHM/concert-crawl/commit/f2287b01c315b11a9c21da72d799ba21bc40ecbf)), closes [#4](https://github.com/HartiganHM/concert-crawl/issues/4) [#3](https://github.com/HartiganHM/concert-crawl/issues/3) [#6](https://github.com/HartiganHM/concert-crawl/issues/6) [#7](https://github.com/HartiganHM/concert-crawl/issues/7) [#8](https://github.com/HartiganHM/concert-crawl/issues/8) [#1](https://github.com/HartiganHM/concert-crawl/issues/1) [#5](https://github.com/HartiganHM/concert-crawl/issues/5) [#2](https://github.com/HartiganHM/concert-crawl/issues/2) [#9](https://github.com/HartiganHM/concert-crawl/issues/9)
* **crawler+web:** convert venue event dates to local timezone ([#596](https://github.com/HartiganHM/concert-crawl/issues/596)) ([2ec0e0a](https://github.com/HartiganHM/concert-crawl/commit/2ec0e0ac498905f8bd47469564351d4790b33efc))

# [1.45.0](https://github.com/HartiganHM/concert-crawl/compare/v1.44.0...v1.45.0) (2026-06-15)


### Bug Fixes

* address Copilot review + integration test failures on Phase 8.5 consumer UI ([6bce7f4](https://github.com/HartiganHM/concert-crawl/commit/6bce7f422b58d16438b48bee01e7d2682325e88f))
* **api:** match counter-submission against any corroborated sub, not just headline ([32cfe75](https://github.com/HartiganHM/concert-crawl/commit/32cfe75b7221166452bbd9f702e26da6ce5b2eb2))
* **api:** remove off-by-one in submission confirm promotion threshold ([d286583](https://github.com/HartiganHM/concert-crawl/commit/d286583117f92103ce3da587d86adf821a7142aa))
* **api:** utc imminent-event math, raw soldOutReport count, test mock ([23c5e9f](https://github.com/HartiganHM/concert-crawl/commit/23c5e9fb701317ff9e7f7d81c655df7fec2fd08b))
* **api:** write event price fields when community submission is promoted ([c5d6ee8](https://github.com/HartiganHM/concert-crawl/commit/c5d6ee8eecf93374f166f674d593497be65dc02f))
* **consumer:** address pending report banner UI gaps from phase 8.5 feedback ([97fa9fd](https://github.com/HartiganHM/concert-crawl/commit/97fa9fd8050feaa4675f2772368f2d7a4d0c9906))
* **consumer:** apply Agent 3 design gap corrections ([07b8772](https://github.com/HartiganHM/concert-crawl/commit/07b87727d129516cd4afc29a70f5ed4e59e08d9c))
* **consumer:** clean up Box Office Confirmed display issues ([09087e5](https://github.com/HartiganHM/concert-crawl/commit/09087e56dee159c3f56c6908f65fce0fbb1d9692))
* **consumer:** correct reporting icon SVG paths — cancelled X-only, sold-out circle+slash ([d38e16e](https://github.com/HartiganHM/concert-crawl/commit/d38e16edb5be11c29eadb5aa07025ed93efc5940))
* **consumer:** fix pending state + withdraw CTA for no-price events ([b8dc222](https://github.com/HartiganHM/concert-crawl/commit/b8dc2224d2f1b1bf7a04f2db4cf4830061a322d4))
* **consumer:** remove redundant SoldOut CTA button on sold-out event pages ([fcb1c1a](https://github.com/HartiganHM/concert-crawl/commit/fcb1c1a8c84ce6d33771b88cd0f5e14202342a34))
* **consumer:** show all pending submission tiers, fix timestamp, corroboration copy and recap card ([6ead752](https://github.com/HartiganHM/concert-crawl/commit/6ead752a6a661feeab4ec3eeb19fa0fbe8e1953e))
* **consumer:** ui audit fixes for status cards, banners, and layout ([f8b078c](https://github.com/HartiganHM/concert-crawl/commit/f8b078ca9965f5019f115126dfde146edeb6a1a6))
* **consumer:** update pending submission state without page refresh ([9fecf11](https://github.com/HartiganHM/concert-crawl/commit/9fecf1190162008e664373703898f25fb05b97d1))
* **corroboration:** add check glyph to confirm CTA, remove honesty disclaimer ([85d55d7](https://github.com/HartiganHM/concert-crawl/commit/85d55d70bcec027171f6e9782315cddc2d94f375))
* **counter-submit-sheet:** match ModalShell tall height (85vh) ([8b640cf](https://github.com/HartiganHM/concert-crawl/commit/8b640cfb9ba1fdf487604c52c51d47cade503e75))
* **disputed-price-card:** add trend glyph to badge, move arrow to right of CTA ([fa1e544](https://github.com/HartiganHM/concert-crawl/commit/fa1e544ccca3214eca640f377b52c2202abf07ee))
* optimistic local state for submit/edit/withdraw on pending submissions ([daec063](https://github.com/HartiganHM/concert-crawl/commit/daec063631fccc2bb2d1abc7ef2f643d4bfbb906))
* **phase-8-5:** address Copilot review on [#571](https://github.com/HartiganHM/concert-crawl/issues/571) and supersede [#577](https://github.com/HartiganHM/concert-crawl/issues/577) ([623eedc](https://github.com/HartiganHM/concert-crawl/commit/623eedc28706c704d42feb254a16dfc6d43ebdf1))
* **phase-8-5:** apply design-review gap fixes, CI failures, and API contract corrections ([7420980](https://github.com/HartiganHM/concert-crawl/commit/7420980a592e77cac1fd09614a9b1a0b47c60944))
* **phase-8-5:** sold-out confirmation flow, evidence row, report sheet ([f3777b1](https://github.com/HartiganHM/concert-crawl/commit/f3777b15b75cd2129c274808fb5051d0c18df775))
* **price-submission:** edit/withdraw flow for Community Self state ([8937807](https://github.com/HartiganHM/concert-crawl/commit/89378071fcc6cf90307cea5534e26a0b65c918d7))
* replace router.refresh() anti-pattern with local state updates ([d400eca](https://github.com/HartiganHM/concert-crawl/commit/d400ecabca91318c7e827539ea61f6718133cc22))
* **report-sheet:** align to design — label, chip width, copy, footnote, arrow ([7d49379](https://github.com/HartiganHM/concert-crawl/commit/7d49379fdceb8f37d61045ec01b30627c149743a))
* **reporting:** counter-report modal shows correct options for pending cancellation/postponement ([8db0c97](https://github.com/HartiganHM/concert-crawl/commit/8db0c9718979836fd2ecc23a4ff84904a86a5c83))
* **reporting:** remove opacity reduction from pending chip text to match design weight ([bee69c7](https://github.com/HartiganHM/concert-crawl/commit/bee69c734db9c3b3849bb492e396ce63907807f9))
* **reporting:** status-aware footer copy and pending chips in ReportSheet modal ([45b470f](https://github.com/HartiganHM/concert-crawl/commit/45b470f3481fccb646accfd0593d3522f6b39c9d))
* restore imminent confirms rule via SP_POLICY ([741c826](https://github.com/HartiganHM/concert-crawl/commit/741c82691f5c4e84cba787d91bbfdadc93b4fd80))
* single source of truth for confirms + ReportSheet copy gaps ([d39eb2c](https://github.com/HartiganHM/concert-crawl/commit/d39eb2cd3ec2907f6cbe36d10ab9cd61fa24ca35))
* **web:** address design gaps in all reporting components ([82779bc](https://github.com/HartiganHM/concert-crawl/commit/82779bcec71173f9f0ac6317ba55e9b18ca0be61))
* **web:** address design gaps in CorroborationSheet and CounterSubmitSheet ([f32662f](https://github.com/HartiganHM/concert-crawl/commit/f32662f6845f29d5503e5ceb6741ed773a4d1210))
* **web:** address design gaps in price card components ([7ae299b](https://github.com/HartiganHM/concert-crawl/commit/7ae299b8177b78b6f0b007d3cab1d1eb124b6323))
* **web:** remove unused eslint-disable directive in ConfirmReportSheet ([ef7f5dc](https://github.com/HartiganHM/concert-crawl/commit/ef7f5dcbe617313799e6681f32e7530d5860bc31))


### Features

* **api:** surface pending price submissions and fix confirm threshold ([639f772](https://github.com/HartiganHM/concert-crawl/commit/639f772370be20320a5374c60f4066c355636350)), closes [#1](https://github.com/HartiganHM/concert-crawl/issues/1)
* **consumer:** fix confirms display, pending price cards, and migrate sheets to ModalShell ([25c13f4](https://github.com/HartiganHM/concert-crawl/commit/25c13f4aac427c434d700a456e9514fa04428da9))
* **db:** add notes to P8.5 submissions and seed K–P confirmation test events ([42155bb](https://github.com/HartiganHM/concert-crawl/commit/42155bb6240b4df603d7e2bade6282a0c74fc020))
* **db:** add Phase 8.5 seed data for all user flows ([9b614e3](https://github.com/HartiganHM/concert-crawl/commit/9b614e3e349502b8ab7ffe7b300d97eede66ec5d))
* **disputed-price-card:** add eyebrow, chip, attribution, and counter-submission API field ([1769495](https://github.com/HartiganHM/concert-crawl/commit/1769495930d0933775b2ac29f4d0389d75958c60))
* **seed:** backfill Phase 8.5 price data and event reports for all user flows ([de8caae](https://github.com/HartiganHM/concert-crawl/commit/de8caae8cabccf3f83a62d21e25f5db6054faeb5))
* **web:** add API client functions for price corroboration and event reporting ([ad3f913](https://github.com/HartiganHM/concert-crawl/commit/ad3f91364b5b5799fcfed0340c155ba754e3a3d3))
* **web:** add CorroborationSheet component ([59f1a7f](https://github.com/HartiganHM/concert-crawl/commit/59f1a7f7d2d16aab9eacc72ce6e7d215c3cbd0f9))
* **web:** add DisputedPriceCard component ([83cd8c8](https://github.com/HartiganHM/concert-crawl/commit/83cd8c8d38a1cbb68c3147f1a2ee5d245e4f3dbd))
* **web:** add multi-tier price display components ([1d7314c](https://github.com/HartiganHM/concert-crawl/commit/1d7314cbfa95409c8dcafa046727db1c250a6619))
* **web:** add PendingCardB component ([fd63413](https://github.com/HartiganHM/concert-crawl/commit/fd6341331af1879dfeb204a88008812cdab0350e))
* **web:** add PendingSoldOutCard and PendingReportBanner components ([b7a4cb1](https://github.com/HartiganHM/concert-crawl/commit/b7a4cb1e08e9a069b9e177e883b07b19e40dea05))
* **web:** add ReportFooterLink, ReportSheet, and EvidenceForm components ([8cc2460](https://github.com/HartiganHM/concert-crawl/commit/8cc24603c090f71599da7d05771e0bceaf47a794))
* **web:** add ReportTypeMark, ConfirmReportSheet, and LiveReportBanner ([e9e9fef](https://github.com/HartiganHM/concert-crawl/commit/e9e9fefb3985cf4402c185b1026535aa4d268a63))
* **web:** create shared glyphs and rewrite PendingCardB to match design spec ([810995f](https://github.com/HartiganHM/concert-crawl/commit/810995f2958715ce5f2fb63a3203ce614a9d45fd))
* **web:** integrate Phase 8.5 components into event detail page ([47def1e](https://github.com/HartiganHM/concert-crawl/commit/47def1e5be29f2a0ec865eef5d4b46051ca0af67))

# [1.44.0](https://github.com/HartiganHM/concert-crawl/compare/v1.43.1...v1.44.0) (2026-05-27)


### Bug Fixes

* address Copilot review on needs-price-pagination ([ebb3bb4](https://github.com/HartiganHM/concert-crawl/commit/ebb3bb497a54e8488cf3e8752798f6c7823cb7c7))
* **hooks:** probe concert_crawl_test DB, fail loudly on build error ([7820304](https://github.com/HartiganHM/concert-crawl/commit/7820304509d77bc2237ff48f1abf556181f81bd0))


### Features

* **api:** add missingOnly filter + limit/offset pagination to /admin/prices/events ([2725313](https://github.com/HartiganHM/concert-crawl/commit/2725313d08e11b5ec478c44ea082f1875b716449))
* **web:** server-driven filter + pagination for Needs Price table ([0b6a361](https://github.com/HartiganHM/concert-crawl/commit/0b6a361e8cc0e1b6d3a1844cce75f702b113ca01))

## [1.43.1](https://github.com/HartiganHM/concert-crawl/compare/v1.43.0...v1.43.1) (2026-05-27)


### Bug Fixes

* address Copilot review — prevent event fetch loop on all-duplicate batches ([8dc16ee](https://github.com/HartiganHM/concert-crawl/commit/8dc16ee0a408ee11bca475647e69dd6459eb1fa0))
* **admin:** absolutely position stat card icon; auto-fetch review queue ([d6ba565](https://github.com/HartiganHM/concert-crawl/commit/d6ba565d0b43860ec412d38316cdba92ab02942c))
* **admin:** clip stat card icon within card boundary on mobile ([c5899cb](https://github.com/HartiganHM/concert-crawl/commit/c5899cb14a8d887b6d5431b85de0e7e3b6ec9cca))
* **admin:** show event title in mobile community submissions fallback ([03c4d0c](https://github.com/HartiganHM/concert-crawl/commit/03c4d0c10a06d2b4c478ff11ce16cfe288c6471b))
* **web:** guard fetchMoreEvents against infinite retry on token/network failure ([b0ca62d](https://github.com/HartiganHM/concert-crawl/commit/b0ca62dd201fe16a4c7254ebba2fb3a4dc245833))

# [1.43.0](https://github.com/HartiganHM/concert-crawl/compare/v1.42.0...v1.43.0) (2026-05-27)


### Bug Fixes

* **api:** add auth header to userHasConfirmed GET test, far-future date ([1748041](https://github.com/HartiganHM/concert-crawl/commit/1748041bed141a89b085c7679cb2b8304c6ed459))
* **api:** address Copilot review — 12 issues on Phase 8.5 routes ([21525b5](https://github.com/HartiganHM/concert-crawl/commit/21525b5342f54fb7df26147a4f987b78041c4503))
* **api:** integration test auth headers, fileParallelism, userHasConfirmed ([ee8856c](https://github.com/HartiganHM/concert-crawl/commit/ee8856c0c082824a682b2bbf4eabaab06f17143e))
* **api:** replace correlated subqueries with batch queries in GET reports ([011d0fa](https://github.com/HartiganHM/concert-crawl/commit/011d0fa30ae6842ed537317390c2a7642b0fbc2e))
* **api:** use named Filter import from bad-words ESM; mark all tasks complete ([2c83845](https://github.com/HartiganHM/concert-crawl/commit/2c8384513f8547e89c57d695a1dfdd4571887d3a))
* **db:** register migration 0029 in Drizzle journal ([c5931b3](https://github.com/HartiganHM/concert-crawl/commit/c5931b3069a0c8fd242443b3f3ae533dd05381d2))
* **lint:** remove unused and import from price-submission-confirms ([f8743c6](https://github.com/HartiganHM/concert-crawl/commit/f8743c65cf3f5d0cf750d626b4ad34615edbe004))


### Features

* **api:** event reports endpoints — POST, GET, confirm, withdraw, admin resolve ([#565](https://github.com/HartiganHM/concert-crawl/issues/565)) ([7e6b4b8](https://github.com/HartiganHM/concert-crawl/commit/7e6b4b839028dd70c693fa9e09c2c574078a33fe))
* **api:** note field + content moderation on price submissions ([#564](https://github.com/HartiganHM/concert-crawl/issues/564)) ([0131c0c](https://github.com/HartiganHM/concert-crawl/commit/0131c0ce8fac155ecd1df64a5ea829f0d5cb913e))
* **api:** POST corroboration confirm endpoint ([#564](https://github.com/HartiganHM/concert-crawl/issues/564)) ([d11fb03](https://github.com/HartiganHM/concert-crawl/commit/d11fb034d2a9297a89f70151d3d9af59d08045be))
* **db:** Phase 8.5 migration — corroboration method, notes, event reports ([#563](https://github.com/HartiganHM/concert-crawl/issues/563)) ([11c6262](https://github.com/HartiganHM/concert-crawl/commit/11c626202c61e010bdfd16f9b29a7b2a4abddd28))
* **types:** add ER_POLICY constants ([#563](https://github.com/HartiganHM/concert-crawl/issues/563)) ([90bcf1f](https://github.com/HartiganHM/concert-crawl/commit/90bcf1f6468bf4d4b6ca3a4bdfb097a534b66556))

# [1.42.0](https://github.com/HartiganHM/concert-crawl/compare/v1.41.0...v1.42.0) (2026-05-26)


### Features

* **corroboration:** open Phase 8.5 — price corroboration, dispute flow, event status reporting ([8888b68](https://github.com/HartiganHM/concert-crawl/commit/8888b68cd883b6cf9b0c701af4ffec4a58b7d3ad))

# [1.41.0](https://github.com/HartiganHM/concert-crawl/compare/v1.40.1...v1.41.0) (2026-05-26)


### Bug Fixes

* **copy:** waitlist body, price caps, community gap, filter empty state, aria labels, anon warning ([85d8427](https://github.com/HartiganHM/concert-crawl/commit/85d8427e15ab447e238761ec1e8ed39401f8d3ef))
* **tests:** update copy assertions to match updated typography in copy.ts files ([b2f8e0e](https://github.com/HartiganHM/concert-crawl/commit/b2f8e0e64e61ee9624b4d00d7b905eb66d88ceaa))


### Features

* **release:** add pnpm release:draft script to generate changelog entries from merged PRs ([bf0c238](https://github.com/HartiganHM/concert-crawl/commit/bf0c2386b176c7a5bf5bf8e02ffe8b24b501bdfe))
* **spotlight-modal:** support up to three paragraphs in founderNote ([c6fbb3b](https://github.com/HartiganHM/concert-crawl/commit/c6fbb3b4f80f39497f9209432b5d9ddcd8e26f2b))

## [1.40.1](https://github.com/HartiganHM/concert-crawl/compare/v1.40.0...v1.40.1) (2026-05-26)


### Bug Fixes

* **admin:** show event name + ticket link in price submission queue ([0f72fd2](https://github.com/HartiganHM/concert-crawl/commit/0f72fd26a7448ac6ee2dcc2bfd9b1866f1067614))
* **api:** derive priceApprovalKind from submission_confirms instead of hardcoding ([e71ccff](https://github.com/HartiganHM/concert-crawl/commit/e71ccff5b5183a90410ccd9fa5a81cb996efd7e4))
* **api:** service key bypass for events router under REQUIRE_BETA_AUTH ([1df8888](https://github.com/HartiganHM/concert-crawl/commit/1df888869fab5f1dbcef16e3c06aa5088557ee89))
* **api:** trust-priority sort for browse vendor; priceVendor on venue profile ([11903f1](https://github.com/HartiganHM/concert-crawl/commit/11903f1de66391af18a9d83ff4459bb33ccaf733))
* **consumer:** move submitter to footer and add verification line on price card ([8e118b2](https://github.com/HartiganHM/concert-crawl/commit/8e118b2aa4aefb3cbf834610a6528c1ba299b4c8))
* correct watch button mobile detection and add venue button placement ([f4d63bb](https://github.com/HartiganHM/concert-crawl/commit/f4d63bb978ab21e7ba2c220d45943d9b24200f53))
* **events:** lowercase price submitter handle ([6a777ad](https://github.com/HartiganHM/concert-crawl/commit/6a777ad0b168bd6259a5e53161d1885d1bc63fa2))
* **events:** map SeatGeek community submission to resale trust tier ([41b8047](https://github.com/HartiganHM/concert-crawl/commit/41b80479a41595bd34d1338cd4b006c0327d9bb9))
* **events:** resolve price submitter handle from user_profiles table ([c2cdc8b](https://github.com/HartiganHM/concert-crawl/commit/c2cdc8b0c2856e460859c5c73fe67942bd0513f4))
* **events:** show correct trust tier and submitter on community-priced events ([8c68d1f](https://github.com/HartiganHM/concert-crawl/commit/8c68d1fb8f268063165e9872b01f7247bc29c4e6))
* **events:** show vendor name and observation time in resale price card footer ([01f92fb](https://github.com/HartiganHM/concert-crawl/commit/01f92fb03c56f5c5ec8d7264489368eadcc8a56b))
* **events:** use Clerk username (not firstName) as price submitter handle ([4475a4d](https://github.com/HartiganHM/concert-crawl/commit/4475a4d0ff01d9377acd9c1c271616a17694e4a3))
* **landing:** generate fallback poster dates dynamically from today ([6eda3a9](https://github.com/HartiganHM/concert-crawl/commit/6eda3a9e8316ace6360734af410cd489b37de5c3))
* **landing:** remove stale hardcoded fallback shows from poster carousel ([72493b2](https://github.com/HartiganHM/concert-crawl/commit/72493b2b20e87e73ee2c00fdbf7a6528afc1fb07))
* **lint:** rename single-char variable d → dateAt in fallback shows helper ([8e131b6](https://github.com/HartiganHM/concert-crawl/commit/8e131b677113ee03cc1d2581c4ba662c5f0d565c))
* **loading:** add page header and date groups to browse skeleton ([0360f46](https://github.com/HartiganHM/concert-crawl/commit/0360f46ad9dfa3ce0c72714ddef8dffe1eef3c08))
* **loading:** match skeleton layouts to actual rendered components ([61e8f12](https://github.com/HartiganHM/concert-crawl/commit/61e8f1276218000ec9f50aaf0d5bc3f07a9940cf))
* **price:** browse trust indicators, label copy, footer attribution, and alternates ([6ccffe7](https://github.com/HartiganHM/concert-crawl/commit/6ccffe720f9d3d6e1708d3646254321d1370da0d))
* **price:** sort corroborated submissions by trust priority before recency ([f29888a](https://github.com/HartiganHM/concert-crawl/commit/f29888a3005ac8a72efc7badbcccd4cb29d4e7a9))
* ui polish batch 2 — 13 pre-beta issues ([2134686](https://github.com/HartiganHM/concert-crawl/commit/213468643eebcdb2c9c625cfbc968499b92feebc))

# [1.40.0](https://github.com/HartiganHM/concert-crawl/compare/v1.39.0...v1.40.0) (2026-05-25)


### Features

* **pwa:** add 192x192 PWA icon route ([26b685e](https://github.com/HartiganHM/concert-crawl/commit/26b685ebacb3c893e184f9b6ae17f54bc0b73f36))
* **pwa:** add 512x512 PWA icon route ([d9145ba](https://github.com/HartiganHM/concert-crawl/commit/d9145ba52ffae4f5801db2a5eb619fb78ba5d698))
* **pwa:** add web app manifest ([e0c2bb1](https://github.com/HartiganHM/concert-crawl/commit/e0c2bb13f59626b026f3a14812e809e425bf6178))

# [1.39.0](https://github.com/HartiganHM/concert-crawl/compare/v1.38.2...v1.39.0) (2026-05-24)


### Bug Fixes

* **admin-dashboard:** stat card visual polish ([734faae](https://github.com/HartiganHM/concert-crawl/commit/734faaef69f2e42712455c5e24ab00531937bc0a))
* **admin-review:** final Review page polish batch ([adb45e8](https://github.com/HartiganHM/concert-crawl/commit/adb45e8473fea9d3b69354f3fe459f909016b544))
* **admin-review:** hydration error, fragment key, mobile price display ([805fbbb](https://github.com/HartiganHM/concert-crawl/commit/805fbbb0936bfd4846eaabf3ef1b9a49dd8ab46c))
* **admin-review:** show buy tickets link in mobile needs-price rows ([daf6289](https://github.com/HartiganHM/concert-crawl/commit/daf62895a8a93ef983d8d647f9b1df4053b31e0f))
* **admin/crawl:** add minWidth to AdminTable so history table scrolls on mobile ([354a53e](https://github.com/HartiganHM/concert-crawl/commit/354a53e435838e4dc98419b63a401a6674f11f73))
* **admin/crawl:** fix diagnostics tab, remove bottom history table, polish inspector ([d5c744e](https://github.com/HartiganHM/concert-crawl/commit/d5c744e01d98afbefdb6868ee5859076afef034c))
* **admin/crawl:** last sweep format, filter empty state, error col width, h-scroll ([bd00003](https://github.com/HartiganHM/concert-crawl/commit/bd0000394bffb5bdaf5ee630a10cdfdccf91e663))
* **admin/crawl:** mobile-responsive split view ([ac26ab5](https://github.com/HartiganHM/concert-crawl/commit/ac26ab521fa0640752d3bddeb9f16e0ab40e2449))
* **admin/crawl:** use minmax(0, 1fr) on mobile grid so history table h-scrolls ([86ecfeb](https://github.com/HartiganHM/concert-crawl/commit/86ecfeb853f5494b744c873c172f14d2c6a833a8))
* **admin/feedback:** add SectionHead with unread badge and action buttons ([ad0bf02](https://github.com/HartiganHM/concert-crawl/commit/ad0bf024c3add36793a903d0250621e686357d84))
* **admin/feedback:** filter-aware title, accent linked issue, copy btn ([abe88de](https://github.com/HartiganHM/concert-crawl/commit/abe88de07fd0ee06914298cb652731e3e5af850b))
* **admin/feedback:** mobile layout with horizontal chip filter ([89e3426](https://github.com/HartiganHM/concert-crawl/commit/89e3426dec536a6c32b802aecbb73632e3f25180))
* **admin/feedback:** redesign expanded row to match design ([5cf0a54](https://github.com/HartiganHM/concert-crawl/commit/5cf0a54c4e13c5dce0a54f9af1b784f67bfdcfbe))
* **admin/feedback:** redesign row to 2-line layout with relative time ([eb5c509](https://github.com/HartiganHM/concert-crawl/commit/eb5c509535ab149353c8767a047d68f27c0726d5))
* **admin/feedback:** update filter rail to match design ([b7eff32](https://github.com/HartiganHM/concert-crawl/commit/b7eff3233063bac322140beb655a61f2b470f6c7))
* **admin/feedback:** update stat cards to match design ([148bcf4](https://github.com/HartiganHM/concert-crawl/commit/148bcf494cd062e3fb1e41aed8ba42122084778d))
* **admin/review:** add section header with pending count badge ([da627f8](https://github.com/HartiganHM/concert-crawl/commit/da627f81d5bb2a10b71da8d74b6ac741c72a0e91))
* **admin/review:** align price editor row to flex-end for consistent baseline ([256b87e](https://github.com/HartiganHM/concert-crawl/commit/256b87eb428267aa7dad2afabfd97ee1bb3b1455))
* **admin/review:** cap submissions and coverage table height with scroll ([8e54066](https://github.com/HartiganHM/concert-crawl/commit/8e540666f99e3daec7c9a3bfd90f14f8fe42c4d3))
* **admin/review:** center BulkActionDock with fixed positioning ([16330f3](https://github.com/HartiganHM/concert-crawl/commit/16330f37461550c1354b397ecc5092ca69f1ff68))
* **admin/review:** event flags header, fixed height, default selection ([be7c8d6](https://github.com/HartiganHM/concert-crawl/commit/be7c8d634a7c13c04c836106dcb31471824f0a4b))
* **admin/review:** redesign community price submissions panel to match design ([45fab75](https://github.com/HartiganHM/concert-crawl/commit/45fab75daa0e7def8a95af89374b9c3106f6e80c))
* **admin/review:** redesign event flag inspector to match design ([6bc43a7](https://github.com/HartiganHM/concert-crawl/commit/6bc43a7ceaeac17e0990ff023dc11098b1efe07d))
* **admin/review:** redesign inline price editor to match design handoff ([1812040](https://github.com/HartiganHM/concert-crawl/commit/1812040fc217f164840bd3223142a6d3caf3e8be))
* **admin/review:** redesign PriceCoverageTable to match design handoff ([a2c07de](https://github.com/HartiganHM/concert-crawl/commit/a2c07dec09edc175bc5f5bcb21171efd8ae405b4))
* **admin/review:** stack price submissions and coverage panels vertically ([904c3a8](https://github.com/HartiganHM/concert-crawl/commit/904c3a8f634fb225c6c653e52a69fa667ec6b9da))
* **admin/review:** update BulkActionDock to match design ([7365d85](https://github.com/HartiganHM/concert-crawl/commit/7365d8513c36abdc846a7f31000894f1d0359a3d))
* **admin:** add cancel to generate loading state + mobile responsive layouts ([f5b0ae6](https://github.com/HartiganHM/concert-crawl/commit/f5b0ae66cd1bda9ab42d1cdd7b35e81269e38fe0))
* **admin:** address Copilot review comments on PR [#521](https://github.com/HartiganHM/concert-crawl/issues/521) ([e2c908e](https://github.com/HartiganHM/concert-crawl/commit/e2c908ef156622d16d77d13853c09589693cf259))
* **admin:** align event flags empty state with design ([3077ff6](https://github.com/HartiganHM/concert-crawl/commit/3077ff605e1266651258f919a34aa280d72e0f60))
* **admin:** center inputs vertically, enlarge buy tickets arrow ([4dd85a1](https://github.com/HartiganHM/concert-crawl/commit/4dd85a10541a89407f4ee99e6a3e6efc21a90b66))
* **admin:** compute greeting in browser to use local time ([f59941b](https://github.com/HartiganHM/concert-crawl/commit/f59941b6262abc38c32c3b0ffca3405d483a633c))
* **admin:** correct dashboard stat card layout and content ([6f39f29](https://github.com/HartiganHM/concert-crawl/commit/6f39f2913eb31a8e9eed03e30c87161081f1adef))
* **admin:** correct Review and Feedback sidebar icons ([afc820d](https://github.com/HartiganHM/concert-crawl/commit/afc820df6858fa226bab3bfb23835a050f50a9fa))
* **admin:** correct warning token to soft yellow for dark themes ([2957b2f](https://github.com/HartiganHM/concert-crawl/commit/2957b2f440948effff8b715d719b25742dbd17be))
* **admin:** dashboard + feedback page polish ([dd2b9ea](https://github.com/HartiganHM/concert-crawl/commit/dd2b9ea8c3cb250a1720af6be2644d01efc880d3))
* **admin:** define [@keyframes](https://github.com/keyframes) spin for Loader2 spinners ([0fe089e](https://github.com/HartiganHM/concert-crawl/commit/0fe089edaaaefc44ce6507a3c099ebb0fa3b94b8))
* **admin:** fix crawled badge mapping and optimistic price update ([712a6be](https://github.com/HartiganHM/concert-crawl/commit/712a6bef0d213fda8b2bb26095b3d34407db420b))
* **admin:** hug status toggle width to content ([8919b87](https://github.com/HartiganHM/concert-crawl/commit/8919b878b2884066cbd1e572ec2a0a676afb534e))
* **admin:** increase stat card unit font size, widen run history blocks ([b3ebc3b](https://github.com/HartiganHM/concert-crawl/commit/b3ebc3b949cd86828b665270cf9c4becbc4900cd))
* **admin:** move flagship toggle to venue header as immediate action ([2002d20](https://github.com/HartiganHM/concert-crawl/commit/2002d20cbc47cb20dae40473d6bb68cef3f20f41))
* **admin:** move llm cost budget text to hint, set budget to $20 ([f82bcb9](https://github.com/HartiganHM/concert-crawl/commit/f82bcb9575fe253fd7531ceabe9c2f8a025893e9))
* **admin:** move Low/High labels above inputs, enlarge buy tickets arrow ([f8c6c38](https://github.com/HartiganHM/concert-crawl/commit/f8c6c3821e887f6cac6799bb64fb7dadeaeb76cc))
* **admin:** polish price edit panel layout ([1cb55d8](https://github.com/HartiganHM/concert-crawl/commit/1cb55d89e99fdeac1543067c2ad793fe4ef4ec22))
* **admin:** redesign attention feed header, chip, and digest row ([f570368](https://github.com/HartiganHM/concert-crawl/commit/f5703680f8e1ee194ee90b1fede6148049815fe6))
* **admin:** redesign crawl page header and issues banner to match design ([0b0ed00](https://github.com/HartiganHM/concert-crawl/commit/0b0ed003b8e37b87afe4c55374cee4a9b6120b5a))
* **admin:** redesign delete venue modal to match design handoff ([74bde8a](https://github.com/HartiganHM/concert-crawl/commit/74bde8a365ff60ba15bf1f29f8e294b4b1c3935a))
* **admin:** redesign section 05 identity art to match design handoff ([fbe17c6](https://github.com/HartiganHM/concert-crawl/commit/fbe17c69e5771ef5c522a1c2d5cc156f12e92abe))
* **admin:** redesign section 06 danger zone and save bar to match design ([9b967f2](https://github.com/HartiganHM/concert-crawl/commit/9b967f2a9fe1b7bd3ac80306c77b6032fca87724))
* **admin:** redesign StatCard typography, sizing, and grid layout ([ccd0bd1](https://github.com/HartiganHM/concert-crawl/commit/ccd0bd1d1bb261ad0dc5e041cfefd801b1eb10d0))
* **admin:** redesign venue detail 01 identity section ([fcdc226](https://github.com/HartiganHM/concert-crawl/commit/fcdc226624ba5fc254f1f716a5e06527771913bc))
* **admin:** redesign venue detail 02 ticketing section ([83b8be3](https://github.com/HartiganHM/concert-crawl/commit/83b8be3ab31ea3dddab9933b79d0cc9fcc327edf))
* **admin:** redesign venue detail 03 crawl config section ([5bbea6a](https://github.com/HartiganHM/concert-crawl/commit/5bbea6a9aeced3e08b71a3991b7aff35c316c160)), closes [#530](https://github.com/HartiganHM/concert-crawl/issues/530)
* **admin:** redesign venue detail 04 editorial section ([8103238](https://github.com/HartiganHM/concert-crawl/commit/8103238231fde12d6929abd931be1b8d31a1ae1a))
* **admin:** redesign venue detail page header section ([2ae3e7c](https://github.com/HartiganHM/concert-crawl/commit/2ae3e7cadb11bd0cfc9f1f53948cf24c61da74c8))
* **admin:** remove health card and verification card from venue detail ([7ce76ef](https://github.com/HartiganHM/concert-crawl/commit/7ce76efc2e8d4e323643c02876e086cefdb68a6a)), closes [#525](https://github.com/HartiganHM/concert-crawl/issues/525)
* **admin:** remove miss badge from price coverage table ([f043961](https://github.com/HartiganHM/concert-crawl/commit/f043961b73c6216de66a7ffabc71996e8cac069b))
* **admin:** reorder stat cards to match mobile design, shorten active venues label ([f04d36c](https://github.com/HartiganHM/concert-crawl/commit/f04d36c61a5eb9b48961e1940d032a354c888788))
* **admin:** show crawl cost to 4 decimal places in health table ([e6b452a](https://github.com/HartiganHM/concert-crawl/commit/e6b452a04266b9ebffce39bbf9821742607c5fc5))
* **admin:** sidebar collapse button toggles full/rail only, drop auto state ([e76f9ce](https://github.com/HartiganHM/concert-crawl/commit/e76f9ce681eb5e081ab0a6e2f3ca05cc065303ee))
* **admin:** stat card spacing, icon size, warning chip colors, Open Review button ([851a23e](https://github.com/HartiganHM/concert-crawl/commit/851a23e715e97c3e8ff66e9944c9c34e257c9415))
* **admin:** use sans-serif font for active venues stat card value ([e8b7b4b](https://github.com/HartiganHM/concert-crawl/commit/e8b7b4b93c980b82bcdb08b758aad2f261e1005e))
* **admin:** venue table header bold sans-serif label, remove redundant status select ([094c8d8](https://github.com/HartiganHM/concert-crawl/commit/094c8d8e8444f377bd433f6093e739f08c89e974))
* **admin:** venues + venue detail + review page polish ([e054100](https://github.com/HartiganHM/concert-crawl/commit/e054100ceb8d31565085f805d6d26f88e31278eb))
* **admin:** venues mobile layout — card stack, dynamic subtitle, full-width add ([cd00f89](https://github.com/HartiganHM/concert-crawl/commit/cd00f8985b1984d387227de4abc611671c6b83e0))
* **admin:** venues page header, stat card icons, chip, and median copy ([c60e73b](https://github.com/HartiganHM/concert-crawl/commit/c60e73b8e47555b86a6592b41e8aa8bf5bd20ac0))
* **admin:** venues stat cards fill full width with 4-column grid ([dc83da4](https://github.com/HartiganHM/concert-crawl/commit/dc83da4e6f9c8a517e7a86b1cf38798abb14137e))
* **crawler:** persist robots.txt check result to venues table ([3fdb44b](https://github.com/HartiganHM/concert-crawl/commit/3fdb44b37ccf683e007f8677b03c63be99cddabe))
* **mobile:** add backdrop blur to sticky tab bar ([908b787](https://github.com/HartiganHM/concert-crawl/commit/908b7879c9463993ee0d49661a38f0c9543a5e10))
* **mobile:** event flags tab badge to neutral (not warning yellow) ([51f0bde](https://github.com/HartiganHM/concert-crawl/commit/51f0bde0dbf56522eee2f3ec72a6b78758c616c0))
* **mobile:** height-constrained layout so tab bar never has content scrolling behind it ([aa814ba](https://github.com/HartiganHM/concert-crawl/commit/aa814bad5d3f037f13f286dddbd9c87d32a5b1d9))
* **mobile:** implement queue-clear empty state to design ([267c8b5](https://github.com/HartiganHM/concert-crawl/commit/267c8b5f4726f16ce39c9d44035b0190ea13e4e2))
* **mobile:** make tab bar sticky, add scroll caps to event/submissions/needs-price lists ([c855f90](https://github.com/HartiganHM/concert-crawl/commit/c855f90482a9337a17749690e2be5d1594d3ec48))
* **mobile:** polish EventFlagCard — formatted date/time, accent toggle, wider approve, outline chips ([6623220](https://github.com/HartiganHM/concert-crawl/commit/6623220eda121ebc529b009170e57a9563df07c0))
* **mobile:** polish EventFlagCard, price form layout, badge colors, price formatting ([0fd9f12](https://github.com/HartiganHM/concert-crawl/commit/0fd9f12c57c84e15ae83cc28511b9be2b3507a2b))
* **mobile:** polish Prices tab and replace SectionHead with mobile heading ([41faed3](https://github.com/HartiganHM/concert-crawl/commit/41faed3bbcaa669bde6b057ca08d10199f847775))
* **mobile:** replace underline tabs with segmented control ([aaada84](https://github.com/HartiganHM/concert-crawl/commit/aaada84685274ba6c62bac14229026f30e043b03))
* **mobile:** separate tab bar and content into distinct cards with gap between ([1a64302](https://github.com/HartiganHM/concert-crawl/commit/1a64302b5c558dbc5f9fae207a7af027bd56aa06))
* **mobile:** tab badge uses signal when active, neutral-surface when inactive ([d98ced4](https://github.com/HartiganHM/concert-crawl/commit/d98ced4419049ddea2478af9c470dfa45bc44019))
* **venue-detail:** remove redundant generate buttons from capacity and neighborhood ([af3f9cd](https://github.com/HartiganHM/concert-crawl/commit/af3f9cddde15440c540fc7cc4da558ad7332f16a))


### Features

* **admin/review:** add 6s undo toast for bulk event approval ([7e02e84](https://github.com/HartiganHM/concert-crawl/commit/7e02e84e0b7d556aeab764b078fa2822e3e25f6b))
* **admin/review:** add bulk approve confirmation modal ([d4a2ea7](https://github.com/HartiganHM/concert-crawl/commit/d4a2ea782eadafa88de58d5e465de9bdbe929931))
* **admin:** add loading.tsx skeletons to all admin routes ([b9d856e](https://github.com/HartiganHM/concert-crawl/commit/b9d856e6cc2f3f5d54a1156e4c8268392377fc9c))
* **admin:** redesign venue table rows and quick-view panel ([9c7460f](https://github.com/HartiganHM/concert-crawl/commit/9c7460f62ec63db06594708bbfff57ff3a24a4f0))
* **admin:** replace price source note with vendor+howFound selects ([e4814c6](https://github.com/HartiganHM/concert-crawl/commit/e4814c687257cef803f9c9d8344946248a04cd11))

## [1.38.2](https://github.com/HartiganHM/concert-crawl/compare/v1.38.1...v1.38.2) (2026-05-24)


### Bug Fixes

* **web:** fix theme swatch truncation in user menu desktop popover ([9333cd4](https://github.com/HartiganHM/concert-crawl/commit/9333cd484d6b98d1f0b227a8db73c4b269cb69b0))
* **web:** remove redundant avatar from mobile top nav bar ([7135cc1](https://github.com/HartiganHM/concert-crawl/commit/7135cc155a7c605fda4ad7ad1dfc3b3ac1d4f9b9))

## [1.38.1](https://github.com/HartiganHM/concert-crawl/compare/v1.38.0...v1.38.1) (2026-05-24)


### Bug Fixes

* **release-notes:** decouple isMobile from ResizeObserver to break feedback loop ([182afef](https://github.com/HartiganHM/concert-crawl/commit/182afefae284fde68ad1e1e02e086597e5272883))
* **spotlight-modal:** guard side-effect hooks when spotlight is absent ([5893132](https://github.com/HartiganHM/concert-crawl/commit/5893132febf21221d8bfc7dba59384ef18331197))

# [1.38.0](https://github.com/HartiganHM/concert-crawl/compare/v1.37.0...v1.38.0) (2026-05-24)


### Bug Fixes

* **landing:** address Copilot review feedback ([011add2](https://github.com/HartiganHM/concert-crawl/commit/011add214daf7b991fa05796cd38baf18a541220))


### Features

* **web:** landing poster v2 — IdentityArt-backed animated hero poster ([3e6a295](https://github.com/HartiganHM/concert-crawl/commit/3e6a295a2cc027c275bcb15746fff847653b1082))

# [1.37.0](https://github.com/HartiganHM/concert-crawl/compare/v1.36.4...v1.37.0) (2026-05-24)


### Bug Fixes

* **release-notes:** address Copilot review — keyframe injection, hero scale, fallback ([a78be89](https://github.com/HartiganHM/concert-crawl/commit/a78be8961b7dce4bee5d79091eb8a631692ece8a))
* **release-notes:** rename StubDef.d to delay to satisfy id-length lint rule ([067e10e](https://github.com/HartiganHM/concert-crawl/commit/067e10ed91f4d4d3e54eee95828d1c27897263be))
* **release-notes:** rename TiersCompact→TierCompact, ShareCompact→ShareableCompact; add gap report ([e72243b](https://github.com/HartiganHM/concert-crawl/commit/e72243b5e0eefb814def0a4991050524b45058be))
* **release-notes:** resolve CI lint, type, and test failures in spotlight heroes ([0ed3821](https://github.com/HartiganHM/concert-crawl/commit/0ed382196baaf7570476183f82c023a29da2142b))


### Features

* **release-notes:** implement Showtime spotlight heroes (15 full + compact) ([a820f99](https://github.com/HartiganHM/concert-crawl/commit/a820f99acc1c4dca3252c9157a009fabad6ffa0a))

## [1.36.4](https://github.com/HartiganHM/concert-crawl/compare/v1.36.3...v1.36.4) (2026-05-22)


### Bug Fixes

* **admin:** cast confidenceScore to float to fix Review page crash ([6c345da](https://github.com/HartiganHM/concert-crawl/commit/6c345da8d80f4c64c783fa9665986cedb1fd9130)), closes [#531](https://github.com/HartiganHM/concert-crawl/issues/531)

## [1.36.3](https://github.com/HartiganHM/concert-crawl/compare/v1.36.2...v1.36.3) (2026-05-22)


### Bug Fixes

* **db:** address Copilot review comments on seed overhaul PR ([2a92799](https://github.com/HartiganHM/concert-crawl/commit/2a9279989cdc13535d15e8730e86eb91c36d5992))

## [1.36.2](https://github.com/HartiganHM/concert-crawl/compare/v1.36.1...v1.36.2) (2026-05-21)


### Bug Fixes

* **deps:** override js-cookie to >=3.0.7 to resolve GHSA-qjx8-664m-686j ([6418127](https://github.com/HartiganHM/concert-crawl/commit/64181279f9489da0f51941dc9b406bc868840484))

## [1.36.1](https://github.com/HartiganHM/concert-crawl/compare/v1.36.0...v1.36.1) (2026-05-21)


### Bug Fixes

* **admin:** address Copilot review comments on PR [#516](https://github.com/HartiganHM/concert-crawl/issues/516) ([57929c4](https://github.com/HartiganHM/concert-crawl/commit/57929c485e8bbb78bfefd690e4ab94df3d816143))
* **admin:** rename RETURNING key n → ok to satisfy id-length lint rule ([f1c47af](https://github.com/HartiganHM/concert-crawl/commit/f1c47afa08c4f3177a14e0182162760c415a4ef9))
* **admin:** resolve review page load timeout ([7c87515](https://github.com/HartiganHM/concert-crawl/commit/7c87515a5074aaa0e7ea88bb2d822ab7d5d91757)), closes [hi#confidence](https://github.com/hi/issues/confidence)

# [1.36.0](https://github.com/HartiganHM/concert-crawl/compare/v1.35.3...v1.36.0) (2026-05-21)


### Bug Fixes

* **admin-ui-v2:** apply design-review gap fixes across all components ([6e217d2](https://github.com/HartiganHM/concert-crawl/commit/6e217d2781872f73e5d7cc0c5b2b543fecddafe3))
* **admin:** address all Copilot review issues ([5c36c68](https://github.com/HartiganHM/concert-crawl/commit/5c36c68a07802e0b83f0306219b46e0f432bb4e8))
* **admin:** correct issueUrl nullable Zod schema to allow clearing the field ([b18fb88](https://github.com/HartiganHM/concert-crawl/commit/b18fb887827a2b5dbf505a7cfdf4dd4560705e57))


### Features

* **admin-crawl:** inspector tabs, diagnostics panel, staged apply confirm ([b41b135](https://github.com/HartiganHM/concert-crawl/commit/b41b1351c9cb31b1cf240e0f12e521ea3c5e04fd))
* **admin-dashboard:** attention feed, remove run-all/add-venue ctas ([731e9a0](https://github.com/HartiganHM/concert-crawl/commit/731e9a06761943da648411cf28dc4dab0746d84d))
* **admin-feedback:** feedback filter rail, row, expanded view, action shelf, page ([76f1029](https://github.com/HartiganHM/concert-crawl/commit/76f10294a46376432047a976d3db18b1f6209d59))
* **admin-review:** event flags, pending submissions, price coverage, bulk dock ([c375bd7](https://github.com/HartiganHM/concert-crawl/commit/c375bd7cd1772b8c228720dfaa643c10d26510c1))
* **admin-shell:** nav_v2, appswitcher, mobile shell (bottom bar + drawer) ([c146676](https://github.com/HartiganHM/concert-crawl/commit/c14667662b16c1b73376f12e16a8e8a71d4be0f5))
* **admin-venue-detail:** vdsection redesign, generatefield 5-state, deletevenueconfirm ([1ae8f82](https://github.com/HartiganHM/concert-crawl/commit/1ae8f825cf1797c30f0466a602e8b2b212d37dce))
* **admin-venues:** add venueQuickView accordion — chevron expansion, info grid, action shelf ([67995c6](https://github.com/HartiganHM/concert-crawl/commit/67995c630f6f6366c077d66c336809e5414dd6ea))
* **admin:** implement deferred design items from admin UI v2 gap review ([fa40086](https://github.com/HartiganHM/concert-crawl/commit/fa40086420e206def91c28715759f4ee7fb159af))
* **feedback-api:** add status/notes/issueUrl schema, migration, admin feedback CRUD ([43ee8ea](https://github.com/HartiganHM/concert-crawl/commit/43ee8ea6efb3e15a568de0762816770d4d61716d))

## [1.35.3](https://github.com/HartiganHM/concert-crawl/compare/v1.35.2...v1.35.3) (2026-05-21)


### Bug Fixes

* **nav-consistency:** address Copilot review comments ([04b37ac](https://github.com/HartiganHM/concert-crawl/commit/04b37ac2606b70991177ee357a1f611578dfbfef))
* standardize AppHeader + BottomNav across all consumer pages ([901a845](https://github.com/HartiganHM/concert-crawl/commit/901a845800516d7875c4c4166864f3098fd51fdb)), closes [#510](https://github.com/HartiganHM/concert-crawl/issues/510)
* update watching barrel export for renamed component ([3156adc](https://github.com/HartiganHM/concert-crawl/commit/3156adca93c0ac4df38c7e3e2aaa39ce8842f40a))

## [1.35.2](https://github.com/HartiganHM/concert-crawl/compare/v1.35.1...v1.35.2) (2026-05-21)


### Bug Fixes

* correct venue event counts and LLM year extraction ([1a06aa6](https://github.com/HartiganHM/concert-crawl/commit/1a06aa673d1c19c33f91f83545449b3f13b9762a)), closes [#507](https://github.com/HartiganHM/concert-crawl/issues/507)

## [1.35.1](https://github.com/HartiganHM/concert-crawl/compare/v1.35.0...v1.35.1) (2026-05-21)


### Bug Fixes

* **seed:** drop redundant crawlWaitUntil on Gothic Theatre ([1c3364d](https://github.com/HartiganHM/concert-crawl/commit/1c3364da99d96ee01232772f03087abc699f7d2d))
* **seed:** sync venue crawl configs with production DB state ([a290172](https://github.com/HartiganHM/concert-crawl/commit/a290172005344278be5ce618a9320b9d6ec483ec))

# [1.35.0](https://github.com/HartiganHM/concert-crawl/compare/v1.34.0...v1.35.0) (2026-05-20)


### Bug Fixes

* **admin:** address Copilot review — threshold constant, verified upsert, aria-label, email tests ([f80da7f](https://github.com/HartiganHM/concert-crawl/commit/f80da7f19c8cc3b5ceed76bc8db0f2570151fafa))
* **admin:** back-to-app link, responsive stat grids, theme fallback ([#495](https://github.com/HartiganHM/concert-crawl/issues/495) [#496](https://github.com/HartiganHM/concert-crawl/issues/496) [#497](https://github.com/HartiganHM/concert-crawl/issues/497)) ([7239f6d](https://github.com/HartiganHM/concert-crawl/commit/7239f6d7974fdfa08ab87cae3b9ae2cc71bd8507))


### Features

* **admin:** auto-approve events above 0.70 confidence threshold ([#494](https://github.com/HartiganHM/concert-crawl/issues/494)) ([3be9ed0](https://github.com/HartiganHM/concert-crawl/commit/3be9ed00bcff6f41b1e577475a349b322d53d378))
* **admin:** send invite code via Resend email on mint when recipient set ([#498](https://github.com/HartiganHM/concert-crawl/issues/498)) ([93b8f9e](https://github.com/HartiganHM/concert-crawl/commit/93b8f9e41c144c1f7998ad7c0e5a960f4bc2be86))

# [1.34.0](https://github.com/HartiganHM/concert-crawl/compare/v1.33.1...v1.34.0) (2026-05-20)


### Bug Fixes

* **release-notes:** address Copilot review feedback ([0eddf7f](https://github.com/HartiganHM/concert-crawl/commit/0eddf7f71aeed500876e62f537f34b25b4a36633))
* **release-notes:** radial gradient hero background; add design gap report ([7f489be](https://github.com/HartiganHM/concert-crawl/commit/7f489bebc0914f68ccdb86909f7bc753b1bfded7))


### Features

* **release-notes:** feature drop pill floating component ([f4b374c](https://github.com/HartiganHM/concert-crawl/commit/f4b374c3deeab08a66b68aae2469a49196fc0237))
* **release-notes:** feature drop pill gate and protected layout integration ([ed0c6e1](https://github.com/HartiganHM/concert-crawl/commit/ed0c6e1ab05e1ee689e598acbf6146735c30e0a9))
* **release-notes:** release page component and /changelog route ([ff0ca82](https://github.com/HartiganHM/concert-crawl/commit/ff0ca8269847ef0f343519d26d231e2324c761ad))
* **release-notes:** spotlight hero, modal, and release entry components ([5942ae7](https://github.com/HartiganHM/concert-crawl/commit/5942ae7cc4d3b6138dd91be9ec47c2fd50233201))
* **release-notes:** user menu version footer with changelog navigation ([365a3e6](https://github.com/HartiganHM/concert-crawl/commit/365a3e6b2ce60cc597031bab2b8e3fbccf025617))
* **release-notes:** useReleaseReadState localStorage hook ([5d6f27f](https://github.com/HartiganHM/concert-crawl/commit/5d6f27f11fd6d84c1353472e12af76e5a9367f33))

## [1.33.1](https://github.com/HartiganHM/concert-crawl/compare/v1.33.0...v1.33.1) (2026-05-20)


### Bug Fixes

* **mobile-nav:** add search to top bar, fix browse icon, enlarge avatar ([6f897ab](https://github.com/HartiganHM/concert-crawl/commit/6f897abc6214a822721f6df87cf79286eaf397c3))

# [1.33.0](https://github.com/HartiganHM/concert-crawl/compare/v1.32.4...v1.33.0) (2026-05-20)


### Bug Fixes

* address Copilot review comments on PR [#491](https://github.com/HartiganHM/concert-crawl/issues/491) ([da66850](https://github.com/HartiganHM/concert-crawl/commit/da668509c416fab56ec17dbc6f07e34467b2d37a))


### Features

* **api:** add neighborhood, featured, lat/lng, upcomingCount to public venues endpoint ([c0b879c](https://github.com/HartiganHM/concert-crawl/commit/c0b879ce535f6924fa7500929669ea972fda18ec))
* **api:** generate-about adds neighborhood + brand voice; PATCH adds featured ([#476](https://github.com/HartiganHM/concert-crawl/issues/476)) ([7f24fbe](https://github.com/HartiganHM/concert-crawl/commit/7f24fbe734becb2e95c08297268249f0c9473d82))
* **db:** add neighborhood, featured, lat/lng to venues; seed Denver coords ([7ebb0b2](https://github.com/HartiganHM/concert-crawl/commit/7ebb0b262961b8d030f66ea598fb2f92a96433a7))
* **venues:** client component with geolocation, filter state, featured/list logic ([785cc48](https://github.com/HartiganHM/concert-crawl/commit/785cc48b618bcb61117d49bec820006632a9f39e))
* **venues:** enriched desktop + mobile list row component ([bb4b1f8](https://github.com/HartiganHM/concert-crawl/commit/bb4b1f8a0735b9efe70195ea7979232ab5768aec))
* **venues:** filter pill bar with sort/capacity/distance chips, popover + sheet ([1ac50f9](https://github.com/HartiganHM/concert-crawl/commit/1ac50f95179bcb3d9c1e7b906e665a85ae678613))
* **venues:** flagship hero card with identity art and stats triad ([3bd0311](https://github.com/HartiganHM/concert-crawl/commit/3bd0311849bea3b73ae216e698f591eebb4a32f9))
* **venues:** identity art tile component with monogram chip ([bc6a706](https://github.com/HartiganHM/concert-crawl/commit/bc6a706d5aa4e824956f89c707ae7c6eb13a76e8))
* **venues:** redesign venues index page to match design handoff ([d60ede4](https://github.com/HartiganHM/concert-crawl/commit/d60ede4918178e03ad0f3a5bbba71f21009383a7)), closes [#476](https://github.com/HartiganHM/concert-crawl/issues/476)
* **venues:** venue filter definitions, haversine helper, apply/sort logic ([081677e](https://github.com/HartiganHM/concert-crawl/commit/081677ed0f10cb8482a0d93482330e24fb1b460f))
* **venues:** wire venues index client into page; widen max-w to 1120px ([5557fe2](https://github.com/HartiganHM/concert-crawl/commit/5557fe23dbfd5ec7dc239af77f0d82b7129c8285))
* **web:** add neighborhood + featured to admin venue form and actions ([50fd76a](https://github.com/HartiganHM/concert-crawl/commit/50fd76a84687c3aeb9dcebba8e19adfd8465574f))

## [1.32.4](https://github.com/HartiganHM/concert-crawl/compare/v1.32.3...v1.32.4) (2026-05-20)


### Bug Fixes

* **submit-price:** add id prop to SPNumberField usages in DisputeForm ([fcb3a12](https://github.com/HartiganHM/concert-crawl/commit/fcb3a12c8570b367de18bb2d84c0618b830b54d6))
* **submit-price:** correct 409 type, withdraw error copy, label a11y, aria-pressed, regression tests ([d38e90f](https://github.com/HartiganHM/concert-crawl/commit/d38e90fd406f1782443815092b216d67608cccee))
* **submit-price:** remove submit-another, fix error style, fix already-submitted flow ([a32aeb8](https://github.com/HartiganHM/concert-crawl/commit/a32aeb86d6710a9f36deec3ee38af674f50cd5ec)), closes [#475](https://github.com/HartiganHM/concert-crawl/issues/475)

## [1.32.3](https://github.com/HartiganHM/concert-crawl/compare/v1.32.2...v1.32.3) (2026-05-20)


### Bug Fixes

* **mobile-profile:** fix useEffect deps, sign-out reset, and stuck skeleton ([f8571a2](https://github.com/HartiganHM/concert-crawl/commit/f8571a2eeb995efade88fc829f3f266a1359d4d6))
* **nav:** add venues tab, remove search tab, fix avatar loading flash ([5468da0](https://github.com/HartiganHM/concert-crawl/commit/5468da0301d776aee335597900d9d6065c2322ae))
* **venue:** back button history, dark map theme ([129b50e](https://github.com/HartiganHM/concert-crawl/commit/129b50eb0a49c6789a8f4d28d3653a15ae33e182)), closes [#478](https://github.com/HartiganHM/concert-crawl/issues/478) [#477](https://github.com/HartiganHM/concert-crawl/issues/477)
* **venues:** address Copilot review feedback on PR [#483](https://github.com/HartiganHM/concert-crawl/issues/483) ([041ea8e](https://github.com/HartiganHM/concert-crawl/commit/041ea8e8686b75b3551769ffe9b0ccb6bbe2bb1b))
* **watching:** address Copilot review on PR [#484](https://github.com/HartiganHM/concert-crawl/issues/484) ([4a81a7f](https://github.com/HartiganHM/concert-crawl/commit/4a81a7f68a0195207ce6b1a9d65c89ba84e31665))
* **watching:** optimistic state update, remove double-confirm, eye icon on mobile ([f252995](https://github.com/HartiganHM/concert-crawl/commit/f25299571e8704c79d2f2e0240a5228b11b15b6a)), closes [#465](https://github.com/HartiganHM/concert-crawl/issues/465) [#466](https://github.com/HartiganHM/concert-crawl/issues/466)

## [1.32.2](https://github.com/HartiganHM/concert-crawl/compare/v1.32.1...v1.32.2) (2026-05-20)


### Bug Fixes

* **browse:** filter sheet heading, clear filters position, hide date in cal ([e4c2b81](https://github.com/HartiganHM/concert-crawl/commit/e4c2b816872d30ec62216cede229c7aa259770f8))
* **filter-bar:** clear filterWhen when switching to calendar view ([cf6b657](https://github.com/HartiganHM/concert-crawl/commit/cf6b657618c5b9790c6f95f358ad687cf0b3ed27))
* **ui:** align loading skeletons with rendered layout on browse, event detail, and venue detail ([7a20064](https://github.com/HartiganHM/concert-crawl/commit/7a2006456f4d337d88a29dd04486f0d567f44a2c)), closes [#459](https://github.com/HartiganHM/concert-crawl/issues/459)
* **ui:** remove skeleton elements that don't match conditional real-page renders ([8edf1c8](https://github.com/HartiganHM/concert-crawl/commit/8edf1c8e304edcba473622c1168deebbc6056655))

## [1.32.1](https://github.com/HartiganHM/concert-crawl/compare/v1.32.0...v1.32.1) (2026-05-20)


### Bug Fixes

* **browse:** cache calendar date queries to prevent redundant refetches ([9bfcf11](https://github.com/HartiganHM/concert-crawl/commit/9bfcf1171601aa1d1bafc81dd643915a05b001c7))
* **search:** brand accent highlight with pulse, venue ranking and dedup ([b31a868](https://github.com/HartiganHM/concert-crawl/commit/b31a868a164bbd70fa70b17feca0448b8ebaa343)), closes [#479](https://github.com/HartiganHM/concert-crawl/issues/479) [#480](https://github.com/HartiganHM/concert-crawl/issues/480)
* **ui:** remove excess top/bottom padding, fix shield icon, fix ceiling input ([74241b1](https://github.com/HartiganHM/concert-crawl/commit/74241b126854ec79fd30526dd259fe3fb70edf17)), closes [#458](https://github.com/HartiganHM/concert-crawl/issues/458) [#468](https://github.com/HartiganHM/concert-crawl/issues/468) [#471](https://github.com/HartiganHM/concert-crawl/issues/471) [#473](https://github.com/HartiganHM/concert-crawl/issues/473)

# [1.32.0](https://github.com/HartiganHM/concert-crawl/compare/v1.31.0...v1.32.0) (2026-05-19)


### Bug Fixes

* **venues:** address Copilot review comments on PR [#457](https://github.com/HartiganHM/concert-crawl/issues/457) ([c8bd9c5](https://github.com/HartiganHM/concert-crawl/commit/c8bd9c5f5cc1c71471b9bf39328c0c73e0d61632))


### Features

* **venues:** venue profiles, index page, admin form, generate-about ([ecab1d2](https://github.com/HartiganHM/concert-crawl/commit/ecab1d29b9c0129f21ae41c56a89a47ae6426944)), closes [#401](https://github.com/HartiganHM/concert-crawl/issues/401) [#404](https://github.com/HartiganHM/concert-crawl/issues/404)

# [1.31.0](https://github.com/HartiganHM/concert-crawl/compare/v1.30.0...v1.31.0) (2026-05-19)


### Bug Fixes

* **settings:** add connected accounts + footnote to desktop view; use copy constant ([6ad99f6](https://github.com/HartiganHM/concert-crawl/commit/6ad99f6f3081eb7fe0f1acb5e26dd539e880edef))


### Features

* **settings:** show connected OAuth providers with Clerk attribution ([#400](https://github.com/HartiganHM/concert-crawl/issues/400)) ([1d30c68](https://github.com/HartiganHM/concert-crawl/commit/1d30c68394b47881a8b1f665ec032e86de1065bc))

# [1.30.0](https://github.com/HartiganHM/concert-crawl/compare/v1.29.0...v1.30.0) (2026-05-19)


### Bug Fixes

* **submit-price:** address Copilot review feedback ([b50520a](https://github.com/HartiganHM/concert-crawl/commit/b50520a82d6edf0b7c442f224ee75125bf2e7b01))


### Features

* **modal-shell:** extract shared ModalShell primitive ([#448](https://github.com/HartiganHM/concert-crawl/issues/448)) ([d952ef0](https://github.com/HartiganHM/concert-crawl/commit/d952ef0f0795c26062983dedf87bd49f68b5b896))
* **submit-price:** add SubmitPriceModal with ShieldCheck icon ([#399](https://github.com/HartiganHM/concert-crawl/issues/399) [#403](https://github.com/HartiganHM/concert-crawl/issues/403)) ([d610229](https://github.com/HartiganHM/concert-crawl/commit/d6102291fb2edf1be51aa2ea6326e42e9149e783))
* **submit-price:** convert PriceDisplay submit link to modal trigger ([#403](https://github.com/HartiganHM/concert-crawl/issues/403)) ([69d5721](https://github.com/HartiganHM/concert-crawl/commit/69d57211915f80b8e4aef5c6f7d71fd498ab62f9))
* **submit-price:** convert SubmitPriceCardCta to modal trigger ([#403](https://github.com/HartiganHM/concert-crawl/issues/403)) ([8d78635](https://github.com/HartiganHM/concert-crawl/commit/8d78635aa05e6e0ed9ef371dac6ec53c243e1b1d))

# [1.29.0](https://github.com/HartiganHM/concert-crawl/compare/v1.28.0...v1.29.0) (2026-05-19)


### Bug Fixes

* **admin/events:** await invalidation after edit, surface save errors, fix types ([b142a91](https://github.com/HartiganHM/concert-crawl/commit/b142a919fe847f5b84d7d7a23b61a1a0504154c4))


### Features

* **admin/crawl:** make run history rows selectable ([#161](https://github.com/HartiganHM/concert-crawl/issues/161)) ([c5869a3](https://github.com/HartiganHM/concert-crawl/commit/c5869a3bc61285ce9317d2f7d7af8b4487383f0f))
* **admin/events:** background refresh and edit event fields ([#161](https://github.com/HartiganHM/concert-crawl/issues/161), [#415](https://github.com/HartiganHM/concert-crawl/issues/415), [#259](https://github.com/HartiganHM/concert-crawl/issues/259)) ([e7edc7b](https://github.com/HartiganHM/concert-crawl/commit/e7edc7bc8895fe7f5f854570f419edd5d7a32bc3))
* **api:** extend PATCH /admin/events/:id to accept content fields ([#259](https://github.com/HartiganHM/concert-crawl/issues/259)) ([9ef31f6](https://github.com/HartiganHM/concert-crawl/commit/9ef31f642ed18a8303fca6dfdff393316cde2e0a))

# [1.28.0](https://github.com/HartiganHM/concert-crawl/compare/v1.27.2...v1.28.0) (2026-05-19)


### Bug Fixes

* **rbac:** api envelope, sub_admin select, role tests ([1ae05b7](https://github.com/HartiganHM/concert-crawl/commit/1ae05b757baf8cf084e5ccc8368593238f5173dd))
* **rbac:** remove dead staff RoleBadge variant; fix profile badge gap ([46d6f86](https://github.com/HartiganHM/concert-crawl/commit/46d6f86cfed0d22450a05fde64e65663cd4b271c))
* **rbac:** remove unused AdminButton import (lint) ([51e6b30](https://github.com/HartiganHM/concert-crawl/commit/51e6b3053b271a345de56e41b08a2fc61f16e1e2))


### Features

* **rbac:** role system, admin users UI, and role badge ([e07db2a](https://github.com/HartiganHM/concert-crawl/commit/e07db2a36d83170ba9c7658c059a3acfc3f0f6d4)), closes [#413](https://github.com/HartiganHM/concert-crawl/issues/413)

## [1.27.2](https://github.com/HartiganHM/concert-crawl/compare/v1.27.1...v1.27.2) (2026-05-19)


### Bug Fixes

* **browse:** derive genre/vibe filter options from live event data ([986a136](https://github.com/HartiganHM/concert-crawl/commit/986a1369fe341f6010ad124993b24bd1cfd95217)), closes [#396](https://github.com/HartiganHM/concert-crawl/issues/396)
* **browse:** handle & separator in genre labels; add genres endpoint tests ([7379802](https://github.com/HartiganHM/concert-crawl/commit/73798026d144b7ec71d852ccd21af4e9bb261849))

## [1.27.1](https://github.com/HartiganHM/concert-crawl/compare/v1.27.0...v1.27.1) (2026-05-19)


### Bug Fixes

* **event-detail:** move venue chevron inline with venue name in InfoRow ([b4975ae](https://github.com/HartiganHM/concert-crawl/commit/b4975ae3413d3910c6593283d382c0d237bf846c))
* **event-detail:** remove desktop breadcrumb, show back button on all breakpoints ([fd76fe7](https://github.com/HartiganHM/concert-crawl/commit/fd76fe7ef141b4633d062842e8a4bc6ffb264ad4))
* **event-detail:** update back button comment, fix InfoRow venue name overflow ([def74c9](https://github.com/HartiganHM/concert-crawl/commit/def74c96beaf6660d02e75b979a367dfe8b68ea8))
* **venue:** remove desktop breadcrumb, extend back button, add max-width and responsive padding ([d16fc9a](https://github.com/HartiganHM/concert-crawl/commit/d16fc9a5def87a3f7c97962ec02c6cede4183817))

# [1.27.0](https://github.com/HartiganHM/concert-crawl/compare/v1.26.0...v1.27.0) (2026-05-19)


### Bug Fixes

* **admin:** normalize empty address string to null in API schema ([22d42e4](https://github.com/HartiganHM/concert-crawl/commit/22d42e46a307423a9fbff78c111253ce8d715cdd))


### Features

* **venue:** add address field, functional map embed, reposition above shows ([331c797](https://github.com/HartiganHM/concert-crawl/commit/331c79720490d7befe0f50aaeb05a45f20027650)), closes [#405](https://github.com/HartiganHM/concert-crawl/issues/405)

# [1.26.0](https://github.com/HartiganHM/concert-crawl/compare/v1.25.1...v1.26.0) (2026-05-19)


### Bug Fixes

* **test:** add matchingEventId to VenueResult fixtures in SearchPage tests ([457fe61](https://github.com/HartiganHM/concert-crawl/commit/457fe61fb04e9bf9ef8a532b7aca6c83f5236dcc))
* **venue:** move highlight keyframes to globals.css, honor prefers-reduced-motion ([8033114](https://github.com/HartiganHM/concert-crawl/commit/803311464db3fa14d812f52fef6fe482320f2330))


### Features

* **search:** venue deep-link from artist search with highlight scroll ([f5937cf](https://github.com/HartiganHM/concert-crawl/commit/f5937cf22f05d51e82dd16417007d337e819c577)), closes [#402](https://github.com/HartiganHM/concert-crawl/issues/402)

## [1.25.1](https://github.com/HartiganHM/concert-crawl/compare/v1.25.0...v1.25.1) (2026-05-19)


### Bug Fixes

* **app:** add loading/transition states throughout the application ([ea1a353](https://github.com/HartiganHM/concert-crawl/commit/ea1a353be5774f74e7bd10556827919e591eaa1e)), closes [#385](https://github.com/HartiganHM/concert-crawl/issues/385)
* guard SubmissionList confirm state against concurrent clicks and thrown errors ([0ca2e40](https://github.com/HartiganHM/concert-crawl/commit/0ca2e404ab51ef866314c3bf9fc1eede0d13d9f4))
* remove unused cn import from EventsList ([3760f94](https://github.com/HartiganHM/concert-crawl/commit/3760f94f2c0715fb1ac94e5758fa8bdd223b1f05))

# [1.25.0](https://github.com/HartiganHM/concert-crawl/compare/v1.24.2...v1.25.0) (2026-05-19)


### Features

* **nav:** replace inline ThemeToggle strip with MenuRow → inline swatch grid in UserMenu ([2420628](https://github.com/HartiganHM/concert-crawl/commit/24206288b8dd51c95dcfee7fe6daf6acc6ab4dd4)), closes [#380](https://github.com/HartiganHM/concert-crawl/issues/380)

## [1.24.2](https://github.com/HartiganHM/concert-crawl/compare/v1.24.1...v1.24.2) (2026-05-19)


### Bug Fixes

* **browse:** use limit=100 for calendar week fetch to prevent missing shows ([4111dbe](https://github.com/HartiganHM/concert-crawl/commit/4111dbef1183795ca92e5a27f495628a8115a60e)), closes [#397](https://github.com/HartiganHM/concert-crawl/issues/397)

## [1.24.1](https://github.com/HartiganHM/concert-crawl/compare/v1.24.0...v1.24.1) (2026-05-19)


### Bug Fixes

* **crawler:** auto-pause venue on repeated Playwright TimeoutErrors ([3c89386](https://github.com/HartiganHM/concert-crawl/commit/3c893861483a008aa98453650c6e759d5a8a0eab)), closes [#433](https://github.com/HartiganHM/concert-crawl/issues/433)
* **crawler:** clarify TimeoutError comment; fix blockedAt null assertion in tests ([6557fb3](https://github.com/HartiganHM/concert-crawl/commit/6557fb357b75bf8ec75985c4c7d2cc80ebc6dc3e))

# [1.24.0](https://github.com/HartiganHM/concert-crawl/compare/v1.23.3...v1.24.0) (2026-05-19)


### Bug Fixes

* **crawler:** avoid LLM double-call on auto-detect http fallback; fix makeVenue factories ([bae53bc](https://github.com/HartiganHM/concert-crawl/commit/bae53bc00c38afd9ee9b28c71f245a04cc7e2d25))
* **types:** add crawlMode to Venue interface, remove as casts in VenueDetailsClient ([ba8f6f4](https://github.com/HartiganHM/concert-crawl/commit/ba8f6f4b732f2a5f924f92ad94aefb36cdf346ab))


### Features

* **api:** add crawlMode to venue update schema ([cf0639e](https://github.com/HartiganHM/concert-crawl/commit/cf0639e27370cf55ef00cab87d2fc70b430fe065))
* **crawler-core:** add fetchPageHttp for plain HTTP crawling ([8eae6fd](https://github.com/HartiganHM/concert-crawl/commit/8eae6fd55b4cb91bd68ecf5e9c341011fd82f889))
* **crawler-core:** http-first crawl mode with auto-detect and browser fallback ([f2af45f](https://github.com/HartiganHM/concert-crawl/commit/f2af45f3a0eb1628b5055ef015d401e2d958da03))
* **db:** add crawl_mode column to venues ([4ccf426](https://github.com/HartiganHM/concert-crawl/commit/4ccf426770a1627018987aac348d38d786b64f53))
* **web:** add fetch mode selector to admin venue crawl settings ([2429780](https://github.com/HartiganHM/concert-crawl/commit/2429780cd445e004c846b1cdbc2807cd25b3659f))
* **web:** pass crawlMode through venue update server action ([d9c4a9c](https://github.com/HartiganHM/concert-crawl/commit/d9c4a9c923567ef4d636c7a627626ee66d6e7fb3))

## [1.23.3](https://github.com/HartiganHM/concert-crawl/compare/v1.23.2...v1.23.3) (2026-05-19)


### Bug Fixes

* **browse:** date filter 'this-week' and 'this-weekend' relative to today ([5f917a4](https://github.com/HartiganHM/concert-crawl/commit/5f917a4a19af0c8ac881d5f49e59ae030fb18a90)), closes [#395](https://github.com/HartiganHM/concert-crawl/issues/395)

## [1.23.2](https://github.com/HartiganHM/concert-crawl/compare/v1.23.1...v1.23.2) (2026-05-19)


### Bug Fixes

* **search:** add loading skeleton, suppress empty state until fetch resolves ([#384](https://github.com/HartiganHM/concert-crawl/issues/384)) ([7e3cd35](https://github.com/HartiganHM/concert-crawl/commit/7e3cd35cf857495a5d27043f87c6e0343368dd3a))

## [1.23.1](https://github.com/HartiganHM/concert-crawl/compare/v1.23.0...v1.23.1) (2026-05-19)


### Bug Fixes

* pre-beta polish — feedback header, city display, account copy, search palette ([17e4ced](https://github.com/HartiganHM/concert-crawl/commit/17e4cedddfb5a09a06fb3a7a15c5923d6fab1992)), closes [#386](https://github.com/HartiganHM/concert-crawl/issues/386) [#391](https://github.com/HartiganHM/concert-crawl/issues/391) [#392](https://github.com/HartiganHM/concert-crawl/issues/392) [#393](https://github.com/HartiganHM/concert-crawl/issues/393) [#394](https://github.com/HartiganHM/concert-crawl/issues/394)


### Reverts

* restore progress.md (updated on separate branch) ([3740225](https://github.com/HartiganHM/concert-crawl/commit/374022530ef9670c112f024b38ccbca031d87283))

# [1.23.0](https://github.com/HartiganHM/concert-crawl/compare/v1.22.1...v1.23.0) (2026-05-19)


### Bug Fixes

* **cache:** opt admin venue runs query into window focus refetch ([95754a6](https://github.com/HartiganHM/concert-crawl/commit/95754a61e05a1fcac0ed2aa276e1e9f718b150e4))


### Features

* **cache:** migrate admin UI to TanStack Query ([#409](https://github.com/HartiganHM/concert-crawl/issues/409)) ([3776f92](https://github.com/HartiganHM/concert-crawl/commit/3776f92b0eea9623672532ab2e71db7b3a728c81))

## [1.22.1](https://github.com/HartiganHM/concert-crawl/compare/v1.22.0...v1.22.1) (2026-05-19)


### Bug Fixes

* **docs:** add design/ prefix to handoff folder paths in design queue tables ([16f2839](https://github.com/HartiganHM/concert-crawl/commit/16f2839119e70054d20c3c330a2e0c8078b2ea01))

# [1.22.0](https://github.com/HartiganHM/concert-crawl/compare/v1.21.0...v1.22.0) (2026-05-18)


### Bug Fixes

* allow concurrent watch removes by guarding on pendingRemoveIds ([0498026](https://github.com/HartiganHM/concert-crawl/commit/04980264669199323aaa4cd0bb4c95ab0351868c))


### Features

* **cache:** migrate WatchingRoute + WatchingRouteDesktop to useWatchToggle ([8febbc5](https://github.com/HartiganHM/concert-crawl/commit/8febbc5401f0a0487cc9a6f582c9aade95b4e876)), closes [#408](https://github.com/HartiganHM/concert-crawl/issues/408)

# [1.21.0](https://github.com/HartiganHM/concert-crawl/compare/v1.20.10...v1.21.0) (2026-05-18)


### Bug Fixes

* **cache:** drop blank optimistic stub, fix watching cache sync from Watching page ([271da6d](https://github.com/HartiganHM/concert-crawl/commit/271da6d9e21535a9b2487bbf559c56243c4e97a0))
* correct initialData deps and remove cache mutation from onMutate ([d2cbe1a](https://github.com/HartiganHM/concert-crawl/commit/d2cbe1a8131c8fe1ef6cc3b32255be430257badd))


### Features

* **cache:** add TanStack Query, browse caching, and watching cache ([3129452](https://github.com/HartiganHM/concert-crawl/commit/312945220379f2e962105afdde447c440001330f)), closes [#407](https://github.com/HartiganHM/concert-crawl/issues/407)

## [1.20.10](https://github.com/HartiganHM/concert-crawl/compare/v1.20.9...v1.20.10) (2026-05-18)


### Bug Fixes

* auth gate sign out contrast, watching sort order, and presale label bug ([e0cb6f7](https://github.com/HartiganHM/concert-crawl/commit/e0cb6f77cc5be7286b05ddc8343043e0b7f5eef1)), closes [#381](https://github.com/HartiganHM/concert-crawl/issues/381) [#382](https://github.com/HartiganHM/concert-crawl/issues/382) [#383](https://github.com/HartiganHM/concert-crawl/issues/383)
* **watching:** tighten watchStatus type, remove dead presale branch, add tests ([e27c452](https://github.com/HartiganHM/concert-crawl/commit/e27c452b0c2a6eb9ed8dc535827f3c518a79cd18))

## [1.20.9](https://github.com/HartiganHM/concert-crawl/compare/v1.20.8...v1.20.9) (2026-05-17)


### Bug Fixes

* **feedback:** update category error + success body copy per issue [#364](https://github.com/HartiganHM/concert-crawl/issues/364) ([7343066](https://github.com/HartiganHM/concert-crawl/commit/73430661d3ef48134e5ac7ce5c1e3126d07ef959))

## [1.20.8](https://github.com/HartiganHM/concert-crawl/compare/v1.20.7...v1.20.8) (2026-05-17)


### Bug Fixes

* **nav:** restore theme picker to UserMenu, fix avatar, hover, alignment ([7eba67d](https://github.com/HartiganHM/concert-crawl/commit/7eba67d4218d081624ec2f9b12f6ccff64141128))
* **user-menu:** remove unused initials prop, drop invalid role=menu from panels ([d2e3990](https://github.com/HartiganHM/concert-crawl/commit/d2e399027f3074be09ce1d86025165a863e87182))
* **venue:** pass auth token to venue API call to fix 404 under beta gate ([9f40fe6](https://github.com/HartiganHM/concert-crawl/commit/9f40fe6b1d7834a0555a90a288649281a9327005))

## [1.20.7](https://github.com/HartiganHM/concert-crawl/compare/v1.20.6...v1.20.7) (2026-05-17)


### Bug Fixes

* **feedback:** make screenshot attachment functional via file input ([51195eb](https://github.com/HartiganHM/concert-crawl/commit/51195eb9be057698806441e67d6b310fd6425d79)), closes [#364](https://github.com/HartiganHM/concert-crawl/issues/364)
* **ui:** address Copilot review comments on PR [#376](https://github.com/HartiganHM/concert-crawl/issues/376) ([f701b6b](https://github.com/HartiganHM/concert-crawl/commit/f701b6b3f6fe695cd0ffb0525b540c511747109d))
* **ui:** get-tickets SVG icon, remove screenshot slot, hero WatchShowButton ([ad272a7](https://github.com/HartiganHM/concert-crawl/commit/ad272a757d02fbbc9111f8007dcce1cde17b8256))

## [1.20.6](https://github.com/HartiganHM/concert-crawl/compare/v1.20.5...v1.20.6) (2026-05-17)


### Bug Fixes

* **watching+browse:** grandpa empty state, EventImage, tba price ([603b3b1](https://github.com/HartiganHM/concert-crawl/commit/603b3b10e22625be008c7e334251e4547fb87c96)), closes [#348](https://github.com/HartiganHM/concert-crawl/issues/348) [#349](https://github.com/HartiganHM/concert-crawl/issues/349) [#368](https://github.com/HartiganHM/concert-crawl/issues/368) [#369](https://github.com/HartiganHM/concert-crawl/issues/369) [#370](https://github.com/HartiganHM/concert-crawl/issues/370) [#371](https://github.com/HartiganHM/concert-crawl/issues/371) [#373](https://github.com/HartiganHM/concert-crawl/issues/373) [#374](https://github.com/HartiganHM/concert-crawl/issues/374)

## [1.20.5](https://github.com/HartiganHM/concert-crawl/compare/v1.20.4...v1.20.5) (2026-05-17)


### Bug Fixes

* **nav:** remove Search tab, clean settings menu, fix admin role check ([568f42f](https://github.com/HartiganHM/concert-crawl/commit/568f42f8040ce081299c7335ce296fe33aeacdd9))
* **nav:** remove stale Search tab from WatchingRouteDesktop DESKTOP_TABS ([9ea1967](https://github.com/HartiganHM/concert-crawl/commit/9ea1967c318c1786b6cad9f4c3181f0c7f47756c))

## [1.20.4](https://github.com/HartiganHM/concert-crawl/compare/v1.20.3...v1.20.4) (2026-05-17)


### Bug Fixes

* **account:** use openUserProfile() modal; hide password row for OAuth users ([4982d94](https://github.com/HartiganHM/concert-crawl/commit/4982d94debb0bd9eb26f51a061e6fc57fa9a441f))
* **settings:** extract AccountManagementRow client island, restore SettingsRoute as RSC ([6133f58](https://github.com/HartiganHM/concert-crawl/commit/6133f580b12029c346c5c2fd081e37d26ec7459a))

## [1.20.3](https://github.com/HartiganHM/concert-crawl/compare/v1.20.2...v1.20.3) (2026-05-17)


### Bug Fixes

* **search:** keyboard nav highlight, empty state query interpolation ([c41bd11](https://github.com/HartiganHM/concert-crawl/commit/c41bd1170450ceb2ce9be8cc66e22b4c6bc9a6ea))
* **search:** update empty state copy to "No results for", add onCtaClick to close palette ([edaec87](https://github.com/HartiganHM/concert-crawl/commit/edaec87dfceb7f59bc71b9caef9c9d7bbb495054))

## [1.20.2](https://github.com/HartiganHM/concert-crawl/compare/v1.20.1...v1.20.2) (2026-05-17)


### Bug Fixes

* **browse:** calendar default date, past dates, week forward scroll, view-switch cleanup ([b05fc48](https://github.com/HartiganHM/concert-crawl/commit/b05fc48d4c49e3375978088ac5251bd1c28a650e)), closes [#359](https://github.com/HartiganHM/concert-crawl/issues/359)

## [1.20.1](https://github.com/HartiganHM/concert-crawl/compare/v1.20.0...v1.20.1) (2026-05-17)


### Bug Fixes

* **landing:** remove 'What you get' section and footer ([839248a](https://github.com/HartiganHM/concert-crawl/commit/839248afd0d41920e1cc00ab025452f75ae2e982))

# [1.20.0](https://github.com/HartiganHM/concert-crawl/compare/v1.19.2...v1.20.0) (2026-05-17)


### Bug Fixes

* re-sync WatchShowButton state when initialWatching prop changes ([91d3338](https://github.com/HartiganHM/concert-crawl/commit/91d3338a9ccf4015870f2d069e334d2c180fcffb))
* reset EventsList state on filter change, fix hasMore check, reset isConfirming on prop change ([6026823](https://github.com/HartiganHM/concert-crawl/commit/60268238d0e0e1eafc5cd5069a93313ab71d121a))
* use EventsList client component to append load-more events in list view ([d46b062](https://github.com/HartiganHM/concert-crawl/commit/d46b0620f8bd24fcba014c4beae196f4aead0f46))


### Features

* add EventsList client component for append-on-load-more ([347549a](https://github.com/HartiganHM/concert-crawl/commit/347549a22d0b73ad370bfefff7d5a7e8bd91c9be))

## [1.19.2](https://github.com/HartiganHM/concert-crawl/compare/v1.19.1...v1.19.2) (2026-05-17)


### Bug Fixes

* add auth token to useSearch popular and debounced fetches ([011ed3f](https://github.com/HartiganHM/concert-crawl/commit/011ed3ffd47cc9b6e95a4be90d865ef1da2dc233))
* pass auth token to server-side API fetches on protected pages ([89d7cd6](https://github.com/HartiganHM/concert-crawl/commit/89d7cd627bbe371a5a4eb33b1a08941758fc805e))
* route useSearch through useAuthToken abstraction, add test mock, sync section param on nav ([06b6a9b](https://github.com/HartiganHM/concert-crawl/commit/06b6a9b14ebf5aa67b8868fbcbceba6fde3f276a))
* **settings:** deep-link Submitted prices to /me?section=submissions ([737bd8a](https://github.com/HartiganHM/concert-crawl/commit/737bd8a3e4ffd8eb9d5136562f680583f2d575fd))
* **test:** stabilise useAuthToken mock to prevent infinite re-render loop ([dc140d9](https://github.com/HartiganHM/concert-crawl/commit/dc140d948a1655257801bef94f2524a833c8efc6))

## [1.19.1](https://github.com/HartiganHM/concert-crawl/compare/v1.19.0...v1.19.1) (2026-05-17)


### Bug Fixes

* **auth:** pass Clerk token to events/venues fetches; add protected error boundary ([2611353](https://github.com/HartiganHM/concert-crawl/commit/2611353081de5b865fbfec97cbe8edc8ff5142b4))

# [1.19.0](https://github.com/HartiganHM/concert-crawl/compare/v1.18.0...v1.19.0) (2026-05-16)


### Bug Fixes

* **api:** expand REQUIRE_BETA_AUTH gate to /:id + price-submissions; fix test fragility ([e594c6f](https://github.com/HartiganHM/concert-crawl/commit/e594c6f6e79e594e715265390d07fadb0342b5f7))
* **web:** redirect unauthenticated users to / instead of sign-in ([4100b38](https://github.com/HartiganHM/concert-crawl/commit/4100b38c70d5a8b267abe93d8c8c256aa782ca9c))


### Features

* **api:** gate GET /v1/events list behind REQUIRE_BETA_AUTH ([67c2e95](https://github.com/HartiganHM/concert-crawl/commit/67c2e95b221831095e4386301f9fce405b75a626))
* **api:** gate GET /v1/search/popular behind REQUIRE_BETA_AUTH ([4b91927](https://github.com/HartiganHM/concert-crawl/commit/4b91927b07b423d74144bd7f41ec0bd9f54973d0))
* **api:** gate GET /v1/venues behind REQUIRE_BETA_AUTH ([a044253](https://github.com/HartiganHM/concert-crawl/commit/a0442532bd2a8fa65cecbb049907f229b0e5ec64))
* **landing:** add Sign In path for existing users below CTA buttons ([7ff4703](https://github.com/HartiganHM/concert-crawl/commit/7ff47038dd49c9906a6fa4a58682f3180db54fbf))

# [1.18.0](https://github.com/HartiganHM/concert-crawl/compare/v1.17.1...v1.18.0) (2026-05-15)


### Bug Fixes

* **browse:** cap EventCard genre chips at 3, top-align row ([71cb6ea](https://github.com/HartiganHM/concert-crawl/commit/71cb6ea409d2890cd0bd9a2a53d6c8e4de16d362))
* **browse:** clamp maxChips >= 1, update stale docs ([694bb28](https://github.com/HartiganHM/concert-crawl/commit/694bb28f27ab7be4dc324d272fde9556a61757a0))
* **consumer:** genrechips - use cn(), rename genres prop, remove as cast ([1b64a93](https://github.com/HartiganHM/concert-crawl/commit/1b64a93a92a66f1da8230dd9cf75af882a6b81e8))


### Features

* **browse:** show genre chips on all EventCard rows ([3f37c93](https://github.com/HartiganHM/concert-crawl/commit/3f37c93dd65047cc45658eaebbbfb9220616016c))

## [1.17.1](https://github.com/HartiganHM/concert-crawl/compare/v1.17.0...v1.17.1) (2026-05-15)


### Bug Fixes

* **onboarding:** copilot review — copy fixes, centralization, isMobile flash, refactors ([df2502c](https://github.com/HartiganHM/concert-crawl/commit/df2502ca41241f9128431624163531858b816e16))
* **onboarding:** copy adjustments ([dadddf7](https://github.com/HartiganHM/concert-crawl/commit/dadddf72715e3bddef490242e325c561c9fc9fd6))
* **onboarding:** price chip alignment + mobile breakpoint ([b7ff422](https://github.com/HartiganHM/concert-crawl/commit/b7ff4227c5798a8cd3365a840967febe93858eb3))
* **onboarding:** scroll-to-top, price chips, copy centralization, width + theme fixes ([70e5c05](https://github.com/HartiganHM/concert-crawl/commit/70e5c05975fed9d7b5b409b4c52f9fb6459db4e3)), closes [#342](https://github.com/HartiganHM/concert-crawl/issues/342)
* **onboarding:** update copy.ts with user copy adjustments ([759cb8b](https://github.com/HartiganHM/concert-crawl/commit/759cb8b4b0f917d0b91751d44250056d8c521f3b))

# [1.17.0](https://github.com/HartiganHM/concert-crawl/compare/v1.16.0...v1.17.0) (2026-05-14)


### Bug Fixes

* **favicon:** opaque canvas fill for iOS, test default export, fix doc class names and test commands ([6a41382](https://github.com/HartiganHM/concert-crawl/commit/6a413823c813a72368de15649dd1862aeb36d1a8))
* **favicon:** set themeColor to Electric bg [#070](https://github.com/HartiganHM/concert-crawl/issues/070)A1A ([d07d6c7](https://github.com/HartiganHM/concert-crawl/commit/d07d6c711f5b5953a263b59dd33697b751edc04d)), closes [#070A1A](https://github.com/HartiganHM/concert-crawl/issues/070A1A)


### Features

* **favicon:** add apple-icon ImageResponse (180x180, Electric theme) ([c6d2dc6](https://github.com/HartiganHM/concert-crawl/commit/c6d2dc61250c54e35697d0bfc010f7a2b4c5662d))
* **favicon:** add SVG favicon with dark/light prefers-color-scheme ([0ab1117](https://github.com/HartiganHM/concert-crawl/commit/0ab1117699635747eeeda76cbb7b721cac4972f4))

# [1.16.0](https://github.com/HartiganHM/concert-crawl/compare/v1.15.0...v1.16.0) (2026-05-14)


### Bug Fixes

* **auth:** preserve pending theme flag on patchMe failure; skip ThemeSync during onboarding flush ([283c228](https://github.com/HartiganHM/concert-crawl/commit/283c228083d871d016cba8ce21e835998b8d58de))
* **onboarding:** remove border from CompactStrip — not in design ([cf458b1](https://github.com/HartiganHM/concert-crawl/commit/cf458b1ddfd09fa7e7366b8d52807c0a311299a5))
* **theme:** align ThemeSwatch dots, gig card, and label sizes to design spec ([6ce22fa](https://github.com/HartiganHM/concert-crawl/commit/6ce22fa97185ec698b426f7fe8f248ebcab9cb26))
* **theme:** align ThemeSwatch padding, MiniMark size, and role pill to design spec ([615e746](https://github.com/HartiganHM/concert-crawl/commit/615e746ed88699ee55713dc77d72cdee0c92bda4))


### Features

* **auth:** add OnboardingThemeFlush to persist pre-auth theme selection ([4346df8](https://github.com/HartiganHM/concert-crawl/commit/4346df84376743956952dfee005f1caedbe3f67a))
* **auth:** mount OnboardingThemeFlush in protected layout ([e5607cb](https://github.com/HartiganHM/concert-crawl/commit/e5607cbaa78beaabcc488fb9d85a8448179735dc)), closes [#331](https://github.com/HartiganHM/concert-crawl/issues/331)
* **onboarding:** write pending flag to localStorage on theme select ([303a2f9](https://github.com/HartiganHM/concert-crawl/commit/303a2f957919b3d668793609e1a6a4e4aaa918e7))

# [1.15.0](https://github.com/HartiganHM/concert-crawl/compare/v1.14.0...v1.15.0) (2026-05-14)


### Bug Fixes

* **feedback:** fifth-pass gaps — textarea focus/placeholder, secondary width, status code case ([cb7b723](https://github.com/HartiganHM/concert-crawl/commit/cb7b72340dd135a3bcbf83761aa9dc9330d161c4))
* **feedback:** fourth-pass typography polish ([29f4713](https://github.com/HartiganHM/concert-crawl/commit/29f4713846bf7523619331e8d5b132f726e027bf))
* **feedback:** loading label, chips group opacity, secondary border-radius ([f76d8ca](https://github.com/HartiganHM/concert-crawl/commit/f76d8caed9aa5865efafdcba46a976551d5a952d))
* **web:** feedback modal — screenshot slot, error copy, textarea transition, desktop footer width ([3889158](https://github.com/HartiganHM/concert-crawl/commit/388915888344ff2c3b237b2ea05b9959081e2f7b))


### Features

* **web:** replace FeedbackPill with FeedbackEdgeTab (Variant B — edge tab) ([b7c3ebd](https://github.com/HartiganHM/concert-crawl/commit/b7c3ebd2e7638b1a51a04f0d341900f10a35fae3))

# [1.14.0](https://github.com/HartiganHM/concert-crawl/compare/v1.13.0...v1.14.0) (2026-05-14)


### Bug Fixes

* **event-card:** replace hardcoded community color with CSS token ([c414355](https://github.com/HartiganHM/concert-crawl/commit/c4143550212a1065f5af5ecb149db3b3bf949e17))
* **event-card:** resale trust tell color to coral, community to azure ([f516bb3](https://github.com/HartiganHM/concert-crawl/commit/f516bb32b2b55cbcbc83f66056b3c1dfd43342a1))
* **event-detail:** correct hero height to 300px per design spec ([d350eb2](https://github.com/HartiganHM/concert-crawl/commit/d350eb28ada12f1c6349f300b676e9a9fb9cca4f))
* **event-detail:** derive isSoldOut from API priceStatus, fix desktop z-index ([e13fbd2](https://github.com/HartiganHM/concert-crawl/commit/e13fbd20983a7c53a406320855989c75262bba67))
* **event-detail:** desktop layout, CTA always renders, remove stale sections ([ceab101](https://github.com/HartiganHM/concert-crawl/commit/ceab10186981f83e0b994a8e65cbf21f0d792e5a))
* **event-detail:** fixes 7+8 — PrimaryCTA always renders, status banner above setlist ([16d83e4](https://github.com/HartiganHM/concert-crawl/commit/16d83e489ad1fb5fca9a8958e6f66287a1983722))
* **event-detail:** guard no-url CTA, loosen null check on ticketPriceMin ([8bdfaab](https://github.com/HartiganHM/concert-crawl/commit/8bdfaab760da9315df5cd20cd623bd493ff8b432))
* **price-display:** five design gaps — headline all-in, attribution verb styling, context icon ([bc4ffee](https://github.com/HartiganHM/concert-crawl/commit/bc4ffee73a32d28a187025f86dc68b349bea921e))
* **price:** correct type mismatches from quality gate ([7e70067](https://github.com/HartiganHM/concert-crawl/commit/7e7006724fab3f95ba6c4864edefd543bdcf8905))
* **theme:** correct --trust-community lightness in light theme (0.52 → 0.62) ([f13bec6](https://github.com/HartiganHM/concert-crawl/commit/f13bec6892848c96f417993b92c130b905f17631))


### Features

* **price-display:** implement fixes 1-5 for event detail v2 gap report ([05acbb5](https://github.com/HartiganHM/concert-crawl/commit/05acbb5913b723b3b3d3029603235cc382add723))
* **price-display:** implement PriceBlockB card with full trust tier system ([ddb32c4](https://github.com/HartiganHM/concert-crawl/commit/ddb32c44ae9401a99c4fd3f26f4b26609e4aa664))
* **price:** delta pill, box-office attribution, sold-out reporter, community [@handle](https://github.com/handle) ([e0dc878](https://github.com/HartiganHM/concert-crawl/commit/e0dc87849a32065ff0e72755f9fe7e44cfabc061))
* **types:** add ticketPriceOpenedAt and ticketFees to EventDetailResponse ([b8f65cb](https://github.com/HartiganHM/concert-crawl/commit/b8f65cb1afda537fd0a597427423a4527ed95c30))
* **ui:** event detail v2 — watch, setlist, price card, desktop layout ([4dad2a3](https://github.com/HartiganHM/concert-crawl/commit/4dad2a3f882e931c856796e44055a1f82089c7e2))

# [1.13.0](https://github.com/HartiganHM/concert-crawl/compare/v1.12.0...v1.13.0) (2026-05-14)


### Bug Fixes

* **onboarding:** align MakeItYours hero strip + compact strip to design spec ([7afe001](https://github.com/HartiganHM/concert-crawl/commit/7afe00146d794caec0f359134d9d2dfb71c3342c))


### Features

* **onboarding:** add Make It Yours theme picker step ([cae2f9a](https://github.com/HartiganHM/concert-crawl/commit/cae2f9a6a984531fb37dc0e2f01dc761882da6af)), closes [#202](https://github.com/HartiganHM/concert-crawl/issues/202)

# [1.12.0](https://github.com/HartiganHM/concert-crawl/compare/v1.11.0...v1.12.0) (2026-05-14)


### Features

* **onboarding:** add box-office tier copy + personal ask to YoureIn ([af98117](https://github.com/HartiganHM/concert-crawl/commit/af9811786264b25270b35790a6af002d106c052c))

# [1.11.0](https://github.com/HartiganHM/concert-crawl/compare/v1.10.1...v1.11.0) (2026-05-13)


### Bug Fixes

* **api:** cap detectTicketVendor body read at 256KB, run detection async on venue create ([31eeace](https://github.com/HartiganHM/concert-crawl/commit/31eeace0ea47b8cc5ff20b6fbddbf2fd40447d29))
* **crawler:** skip exhausted events, pass priceUrl to pipeline ([bd959e7](https://github.com/HartiganHM/concert-crawl/commit/bd959e7789e9bc1978fccd8c10e18fd63ddc9777))
* **web:** fall back to venue websiteUrl when ticketUrl is null (closes [#324](https://github.com/HartiganHM/concert-crawl/issues/324)) ([eba0d05](https://github.com/HartiganHM/concert-crawl/commit/eba0d05bd2bca4560bb379ffcc080445d204166d))


### Features

* **admin:** add ticketVendor dropdown to venue edit form ([581cc91](https://github.com/HartiganHM/concert-crawl/commit/581cc919568a73815404d9613b8d90d821dc5fbe))
* **api:** auto-detect ticketVendor on venue creation ([d3638a9](https://github.com/HartiganHM/concert-crawl/commit/d3638a95f2df5b1c29155299de4d9313f5ae9f50))
* **api:** one-time backfill script for ticketVendor on existing venues ([4ccecad](https://github.com/HartiganHM/concert-crawl/commit/4ccecad9b7c328d57e608bc6eef495fbd9632996))
* **db:** add pipeline_exhausted_at to events ([6f306f4](https://github.com/HartiganHM/concert-crawl/commit/6f306f4ba2d3560667b66e2bbfb4808eccea0b02))
* **db:** add ticket_vendor enum + column to venues ([e463f3d](https://github.com/HartiganHM/concert-crawl/commit/e463f3d0d4883b8c9d4f3e0a788c60b620a94e41))
* **price-pipeline:** strip dead tiers 2-5, set pipelineExhaustedAt on full miss ([5516a22](https://github.com/HartiganHM/concert-crawl/commit/5516a22d797555701bf96408a680a7d39a9bf193))
* **types:** add TicketVendor, ticketVendor to Venue, pipelineExhaustedAt to Event ([e6dd0d4](https://github.com/HartiganHM/concert-crawl/commit/e6dd0d47378680a830371f9a7b4583620aee50a4))

## [1.10.1](https://github.com/HartiganHM/concert-crawl/compare/v1.10.0...v1.10.1) (2026-05-13)


### Bug Fixes

* **crawler:** bump Playwright to 1.60.0 and flush Sentry before exit ([6176d5f](https://github.com/HartiganHM/concert-crawl/commit/6176d5fe20dbea76661ab4bdd3f9b9972218ac07)), closes [#319](https://github.com/HartiganHM/concert-crawl/issues/319)
* **crawler:** flush Sentry on success path; guard flush against rejection ([50ab52e](https://github.com/HartiganHM/concert-crawl/commit/50ab52edf4e52ed2d8649955d9da31f8314f1412))

# [1.10.0](https://github.com/HartiganHM/concert-crawl/compare/v1.9.2...v1.10.0) (2026-05-13)


### Bug Fixes

* **admin/prices:** address Copilot review items ([c82b508](https://github.com/HartiganHM/concert-crawl/commit/c82b508b51059dbecfae299c24d925117091daaf))
* **admin/prices:** replace source pills with Filter dropdown, left-align source+timestamp ([6aae969](https://github.com/HartiganHM/concert-crawl/commit/6aae96982e90cbcab42fb1e2f984b60c1c80efdf))
* **admin/prices:** sort activity by event date asc, then attempt time desc ([ac38522](https://github.com/HartiganHM/concert-crawl/commit/ac38522e066e482cf2dde70489086bbcd852049a))
* **admin/prices:** sort events ascending, timestamp as source subtext, filter pill style ([293147b](https://github.com/HartiganHM/concert-crawl/commit/293147b88e0fdf1807f5815c1c9e3b5fac8fc491))
* **admin/prices:** surface source+latency in activity feed; move panels above table; cap height ([6d48895](https://github.com/HartiganHM/concert-crawl/commit/6d48895475af3b7b3ca5d949e0cbb8a826eacc4d))


### Features

* **admin/prices:** activity feed, source health panel, pipeline trigger, responsive layout ([b91fa5a](https://github.com/HartiganHM/concert-crawl/commit/b91fa5afd88c0bbe7bcccc7afc5e2d88906139fc)), closes [#317](https://github.com/HartiganHM/concert-crawl/issues/317)
* **admin/prices:** source filter + full timestamp in activity feed ([b9d372b](https://github.com/HartiganHM/concert-crawl/commit/b9d372b53ef73020834214187ad72a07db4e0a5f))

## [1.9.2](https://github.com/HartiganHM/concert-crawl/compare/v1.9.1...v1.9.2) (2026-05-13)


### Bug Fixes

* **price-pipeline:** address Copilot review — URL constructor in lookupById, honest DST comment ([8055b17](https://github.com/HartiganHM/concert-crawl/commit/8055b172eef37216591935bd53ef8bbfbdd29354))
* **price-pipeline:** improve Ticketmaster tier — event ID lookup + MT-aware date window ([e702e97](https://github.com/HartiganHM/concert-crawl/commit/e702e9718a6ad369813ff76b64aa1debf390ff1c)), closes [#295](https://github.com/HartiganHM/concert-crawl/issues/295)

## [1.9.1](https://github.com/HartiganHM/concert-crawl/compare/v1.9.0...v1.9.1) (2026-05-12)


### Bug Fixes

* **ci:** address Copilot review — pull_request_target, stale doc fixes ([d3bad4e](https://github.com/HartiganHM/concert-crawl/commit/d3bad4ead1aedf74d36dc14bf214c5d45d1f3733)), closes [#276](https://github.com/HartiganHM/concert-crawl/issues/276)

# [1.9.0](https://github.com/HartiganHM/concert-crawl/compare/v1.8.0...v1.9.0) (2026-05-12)


### Bug Fixes

* **api:** load env before all other imports to ensure dotenv runs first ([4837a98](https://github.com/HartiganHM/concert-crawl/commit/4837a9811e4dbf68cc87240aee93d95359725479))
* **api:** use Tier type in SubmissionRow to satisfy UserSubmissionItem ([1bc336d](https://github.com/HartiganHM/concert-crawl/commit/1bc336da01b7f06cb611dae5f5efc350722017cf))
* **settings/edit-profile:** desktop — full-page layout → modal dialog ([c76d463](https://github.com/HartiganHM/concert-crawl/commit/c76d463487b1188247fdc8b766f06372ca9b5008))
* **settings:** address Copilot review feedback ([5ab4103](https://github.com/HartiganHM/concert-crawl/commit/5ab4103db99c727250bbe2186a6210c5c5f71ab4))
* **settings:** address feedback — 5 mobile/desktop issues ([aa615a3](https://github.com/HartiganHM/concert-crawl/commit/aa615a339636d7a948fb3b3103e13533bcf174ee))
* **settings:** design cross-compare fixes — 5 components ([66d4e2b](https://github.com/HartiganHM/concert-crawl/commit/66d4e2b5fb243fced7167cf8da187d7098457717))
* **settings:** edit profile as in-page modal on desktop ([3c98d41](https://github.com/HartiganHM/concert-crawl/commit/3c98d41b803c3cc1e6ba917e4bf8a491bb4585f3))


### Features

* **api/types:** extend UserSubmissionItem with tier, confirms, timestamp ([9394d57](https://github.com/HartiganHM/concert-crawl/commit/9394d57ed43e6f7df69ed72f0a97c07dc8247d35))
* **settings:** align settings UI with v2 design handoff ([3b529f1](https://github.com/HartiganHM/concert-crawl/commit/3b529f1784e378e7749fb03d70f2aa462284e04b))

# [1.8.0](https://github.com/HartiganHM/concert-crawl/compare/v1.7.3...v1.8.0) (2026-05-12)


### Bug Fixes

* **admin/events:** address Copilot review items ([d74afb0](https://github.com/HartiganHM/concert-crawl/commit/d74afb089f885824c0338ae2baeb4b3cb5cb71e6))
* **admin/events:** close design gaps — filter rail, tabs, inspector layout, field styles ([31aacf6](https://github.com/HartiganHM/concert-crawl/commit/31aacf6fa3dd997846cea2dc92d440c5ecc667a9)), closes [#259](https://github.com/HartiganHM/concert-crawl/issues/259)


### Features

* **admin/events:** unified split-panel UI, accurate badge count, 500-event cap ([09852b8](https://github.com/HartiganHM/concert-crawl/commit/09852b834eb441e3007544563cc841e555d1355f)), closes [#256](https://github.com/HartiganHM/concert-crawl/issues/256) [#257](https://github.com/HartiganHM/concert-crawl/issues/257) [#258](https://github.com/HartiganHM/concert-crawl/issues/258) [#259](https://github.com/HartiganHM/concert-crawl/issues/259) [#260](https://github.com/HartiganHM/concert-crawl/issues/260)

## [1.7.3](https://github.com/HartiganHM/concert-crawl/compare/v1.7.2...v1.7.3) (2026-05-12)


### Bug Fixes

* **admin/crawl:** correct badge count logic + restore grid height ([186d7c2](https://github.com/HartiganHM/concert-crawl/commit/186d7c27e3fac778245f419a320a99c11cc802e1))
* **admin/crawl:** seamless split-view layout + sidebar dot always-on bug ([e58eb2b](https://github.com/HartiganHM/concert-crawl/commit/e58eb2b8a5b044252459ceb2f3011b52bb8ff720))
* **admin/sidebar:** improve badge contrast + fix always-on indicator ([08da897](https://github.com/HartiganHM/concert-crawl/commit/08da897e6ac3cd03952c03339ba4fe0c4fcc19cc)), closes [#ff7a8a](https://github.com/HartiganHM/concert-crawl/issues/ff7a8a)

## [1.7.2](https://github.com/HartiganHM/concert-crawl/compare/v1.7.1...v1.7.2) (2026-05-11)


### Bug Fixes

* **admin/crawl:** address Copilot review feedback ([a249e7b](https://github.com/HartiganHM/concert-crawl/commit/a249e7b7e398e62cdd46c1f6c4a3c39e424e0eda))
* auto-migrate on dev start; fetch per-venue crawl run history ([8f754d7](https://github.com/HartiganHM/concert-crawl/commit/8f754d7d4b4a4ff8d040ace04ca286430ee8f6e3)), closes [#253](https://github.com/HartiganHM/concert-crawl/issues/253)

## [1.7.1](https://github.com/HartiganHM/concert-crawl/compare/v1.7.0...v1.7.1) (2026-05-11)


### Bug Fixes

* **scripts/clean-worktrees:** address Copilot review feedback ([55d8798](https://github.com/HartiganHM/concert-crawl/commit/55d8798e9237f376ef887de00c1fa4bd37df5b9c))

# [1.7.0](https://github.com/HartiganHM/concert-crawl/compare/v1.6.3...v1.7.0) (2026-05-11)


### Bug Fixes

* **admin/venues:** active field bug, composite focus rings, verified tests ([e8b7bff](https://github.com/HartiganHM/concert-crawl/commit/e8b7bff1a3912d44c1ecd642b781c20c0d1c63a6))
* **admin/venues:** align all minor values to design spec ([09897c0](https://github.com/HartiganHM/concert-crawl/commit/09897c0a3704dbbaceacb5f629c68ae5406fc7f5))
* **admin/venues:** make venue name a link and remove Edit button ([0aedbe2](https://github.com/HartiganHM/concert-crawl/commit/0aedbe2d8d89c4087080d868f49f46bf709be64f))
* **admin/venues:** paddingBottom and title flexWrap from design review ([f25cdd5](https://github.com/HartiganHM/concert-crawl/commit/f25cdd5f1575c4e5fd277aa285bbd5dcf9686594))
* **admin/venues:** remove duplicate active toggle, fix View all link ([30da577](https://github.com/HartiganHM/concert-crawl/commit/30da57720589f4bd04586dad528beb69bcda09ce))
* **admin:** address user-reported venue details issues ([389e070](https://github.com/HartiganHM/concert-crawl/commit/389e07049c2595c29c0c87993d6738bfb41f317f))
* **admin:** resolve lint errors from merge — remove unused imports, suppress favicon img warning ([bdcf54f](https://github.com/HartiganHM/concert-crawl/commit/bdcf54f87460e04dcf834d2baf96891a70c31c23))


### Features

* **admin/venues:** redesign venue details page to match design spec ([18e0edc](https://github.com/HartiganHM/concert-crawl/commit/18e0edcc612fbf2b3f6728ceb8323f6e06aff47b)), closes [#245](https://github.com/HartiganHM/concert-crawl/issues/245) [#246](https://github.com/HartiganHM/concert-crawl/issues/246) [#247](https://github.com/HartiganHM/concert-crawl/issues/247) [#248](https://github.com/HartiganHM/concert-crawl/issues/248) [#249](https://github.com/HartiganHM/concert-crawl/issues/249) [#250](https://github.com/HartiganHM/concert-crawl/issues/250)
* **admin/venues:** track verifiedBy + verifiedAt on venue verification ([4888f31](https://github.com/HartiganHM/concert-crawl/commit/4888f3165c3ca15e4fa0cedb199848835a5198a4)), closes [#251](https://github.com/HartiganHM/concert-crawl/issues/251)

## [1.6.3](https://github.com/HartiganHM/concert-crawl/compare/v1.6.2...v1.6.3) (2026-05-11)


### Bug Fixes

* **admin:** add venue design alignment + admin-created venues verified by default ([87b45ee](https://github.com/HartiganHM/concert-crawl/commit/87b45ee0ca2d61ce8a87a4097b02d732dea4fd20)), closes [#243](https://github.com/HartiganHM/concert-crawl/issues/243)
* **admin:** address Copilot review — a11y and Kbd dedup ([3766551](https://github.com/HartiganHM/concert-crawl/commit/3766551d37f50a1ead8bc9580660d695f17c54f9))
* **admin:** align add venue modal precisely to design spec ([72d4709](https://github.com/HartiganHM/concert-crawl/commit/72d4709694175578fb33996f52d6f516c858eb14))

## [1.6.2](https://github.com/HartiganHM/concert-crawl/compare/v1.6.1...v1.6.2) (2026-05-11)


### Bug Fixes

* **crawler:** process venues sequentially and extend navigation timeout ([8571ae0](https://github.com/HartiganHM/concert-crawl/commit/8571ae0e290552915ad3da60a6a744db4d726257)), closes [#241](https://github.com/HartiganHM/concert-crawl/issues/241)

## [1.6.1](https://github.com/HartiganHM/concert-crawl/compare/v1.6.0...v1.6.1) (2026-05-11)


### Bug Fixes

* **admin/crawler:** address Copilot review — venue name prop, fileURLToPath ([6376f52](https://github.com/HartiganHM/concert-crawl/commit/6376f528f2641174aad2c290b56eace053f08c7f))
* **admin:** add empty state and min height to run history table ([33b55d5](https://github.com/HartiganHM/concert-crawl/commit/33b55d512c37effac0a038311e2407a34ad8968a))
* **admin:** add minimum heights to crawl split view and run history ([d180af0](https://github.com/HartiganHM/concert-crawl/commit/d180af0254c86f600eaa218dcdcbf69e00f87283)), closes [#234](https://github.com/HartiganHM/concert-crawl/issues/234)
* **admin:** crawl UI polish — icons, filter panel, run history by venue ([219bd44](https://github.com/HartiganHM/concert-crawl/commit/219bd445ef7c45d2ea3078f6f0a54760138f0212))
* **admin:** don't treat venue as blocked if last run succeeded ([17833de](https://github.com/HartiganHM/concert-crawl/commit/17833de47690479b89d03c7721ae7666b84ce3f7))
* **admin:** fix Re-crawl button text contrast against signal background ([0745c76](https://github.com/HartiganHM/concert-crawl/commit/0745c76b6ae87feb1a3666127ea0a947915bb825))
* **admin:** improve run details empty state — centered with icon ([ec352f0](https://github.com/HartiganHM/concert-crawl/commit/ec352f0489e448273d21c452eab7b32db4b263c5))
* **admin:** increase run history empty state height and add icon ([b5c9e87](https://github.com/HartiganHM/concert-crawl/commit/b5c9e874e74d2ac91fccde502e9b869fcd971ac0))
* **admin:** make crawl page scrollable — remove fixed height, use explicit split view height ([4c379e1](https://github.com/HartiganHM/concert-crawl/commit/4c379e1f7c4d8ef021e5691d2b1dd9d194ed2505))
* **admin:** replace unicode icon in run history empty state with Lucide RefreshCw ([1bfd0a3](https://github.com/HartiganHM/concert-crawl/commit/1bfd0a3670127f3c47d0493771b65e14c67c6a06))
* **admin:** restore Re-crawl Queued state by removing router.replace ([0cd47f2](https://github.com/HartiganHM/concert-crawl/commit/0cd47f2ddf658ec6cb8864744f3d200d1c6fbf24))
* **crawler-core:** clear blockedAt on successful crawl ([d443a29](https://github.com/HartiganHM/concert-crawl/commit/d443a29fce0402c936a82f8523a2c8c3577f6a89))
* **crawler:** correct .env.local path in instrument.ts ([53d0bff](https://github.com/HartiganHM/concert-crawl/commit/53d0bffc4980a219c24e7844bb31780eefa269e1))
* **crawler:** load .env.local before Sentry init in instrument.ts ([53bc726](https://github.com/HartiganHM/concert-crawl/commit/53bc72669824d55a73abf3058a442d6039929f81))

# [1.6.0](https://github.com/HartiganHM/concert-crawl/compare/v1.5.0...v1.6.0) (2026-05-11)


### Bug Fixes

* **crawler:** check HTTP status before waitForSelector; normalize empty selector to null ([6622a85](https://github.com/HartiganHM/concert-crawl/commit/6622a856ad6736c7e85c4fd381b5ccd0d785bcf1))
* **tests:** correct mock chaining and add crawlWaitForSelector to fixtures ([c8dd47f](https://github.com/HartiganHM/concert-crawl/commit/c8dd47f13ea00fb008be191a9ab287f2193368b0))


### Features

* **api:** add crawlWaitForSelector to venue update schema ([7226027](https://github.com/HartiganHM/concert-crawl/commit/7226027d22a324d12a22ad5fad793075435c5d59))
* **crawler-core:** add waitForSelector support to fetchPage ([bc4590d](https://github.com/HartiganHM/concert-crawl/commit/bc4590d7e1ac48b1326e0e25742b9ebb9fa69ee8))
* **crawler-core:** forward crawlWaitForSelector from venue to fetchPage ([0d411a0](https://github.com/HartiganHM/concert-crawl/commit/0d411a08f3733b37ba50d871f941f64edf36eac8))
* **db:** add crawl_wait_for_selector column to venues ([3c90e95](https://github.com/HartiganHM/concert-crawl/commit/3c90e955df867bc12b087202ba1f1f832b6a2393))
* **types:** add crawlWaitForSelector to Venue interface ([abb6dff](https://github.com/HartiganHM/concert-crawl/commit/abb6dff316cc2e5a7b3f9ea5f449f21c6c12e175))
* **web:** add crawlWaitForSelector field to venue admin settings ([66a871c](https://github.com/HartiganHM/concert-crawl/commit/66a871c847193f0a06852311eb1e3e5964cbe621))
* **web:** forward crawlWaitForSelector in updateVenue action ([d804967](https://github.com/HartiganHM/concert-crawl/commit/d804967674d9c487886c6b4726144141b5f6baa5))

# [1.5.0](https://github.com/HartiganHM/concert-crawl/compare/v1.4.2...v1.5.0) (2026-05-11)


### Bug Fixes

* **db:** add savedPrice to user_events and 2nd low-confidence notification per spec ([321ac88](https://github.com/HartiganHM/concert-crawl/commit/321ac88f549790fa1f8ad0cbafbe20dce9bfead9))
* **db:** address Copilot review — handle/role conflict safety, orderBy, submission guards ([9f77d45](https://github.com/HartiganHM/concert-crawl/commit/9f77d45f230034355ce0ba365fe9e7762e03c016))


### Features

* **db:** add db:sync-local script and README seeding docs ([7cb323c](https://github.com/HartiganHM/concert-crawl/commit/7cb323c0c0ebf39882b0750263f23c645094c72c))
* **db:** add staging snapshot SQL for local dev ([a693786](https://github.com/HartiganHM/concert-crawl/commit/a693786f2231d306068e2bbe46eeb462a9a14ad8))
* **db:** comprehensive UI state coverage in seed data ([fd7a6fb](https://github.com/HartiganHM/concert-crawl/commit/fd7a6fb35c697256a655be2b3bbabdeb565a1b4d))
* **db:** expand seed with synthetic users, roles, and event-linked data ([2ff0ab4](https://github.com/HartiganHM/concert-crawl/commit/2ff0ab4faae1084ba71ea8d6d7a0974e468963fe))

## [1.4.2](https://github.com/HartiganHM/concert-crawl/compare/v1.4.1...v1.4.2) (2026-05-11)


### Bug Fixes

* **crawler:** deduplicate LLM-extracted events before batch upsert ([3f8af7d](https://github.com/HartiganHM/concert-crawl/commit/3f8af7da809a2be397e57f2720d84f55d3cd9d6c)), closes [#232](https://github.com/HartiganHM/concert-crawl/issues/232)
* **crawler:** move event dedup up-front to also cover changedVerified ([a7c9ea0](https://github.com/HartiganHM/concert-crawl/commit/a7c9ea072d513c655354ffe7c45c3ef996da4e6b))

## [1.4.1](https://github.com/HartiganHM/concert-crawl/compare/v1.4.0...v1.4.1) (2026-05-11)


### Bug Fixes

* **settings:** address Copilot review feedback on settings-v2-polish ([e5d9ebe](https://github.com/HartiganHM/concert-crawl/commit/e5d9ebe30d74cf7fb4ca2a517a0963948081e53c))
* **settings:** align avatar tint, submission layout, and see-all link with spec ([b52583d](https://github.com/HartiganHM/concert-crawl/commit/b52583d8fa91e3bd0b498e5057716ee9b67b6e52))
* **settings:** align mobile layout and desktop nav order with spec ([403883f](https://github.com/HartiganHM/concert-crawl/commit/403883f864a2ad9f3610f46f5c1a0db5f3316eba))
* **settings:** danger zone icons and bordered delete card ([af1cd1f](https://github.com/HartiganHM/concert-crawl/commit/af1cd1f6ecdb8891ea7f15ccdebca59d2fa4a3a9))
* **settings:** delete account modal on desktop ([a3bfe71](https://github.com/HartiganHM/concert-crawl/commit/a3bfe7106a7e0cf87a9d0b8cc82dac7300b85216))
* **settings:** desktop topbar, sidebar icons, panel titles and content ([40f4f5d](https://github.com/HartiganHM/concert-crawl/commit/40f4f5d3dd5c84f633dec04c2d5ab8b28614169a))
* **settings:** mobile bottom nav ME tab shows user avatar ([81b1f3f](https://github.com/HartiganHM/concert-crawl/commit/81b1f3f804287909abebb0c5e4c5e62a7678c6ee))
* **settings:** mobile settings header and section layout fixes ([405775d](https://github.com/HartiganHM/concert-crawl/commit/405775da8bac813a08ca6d6ddf59d7197a37b095))
* **settings:** resolve exactOptionalPropertyTypes error in DangerZone ([3e9c892](https://github.com/HartiganHM/concert-crawl/commit/3e9c892b93466b179cd0ae8c97301d5066a4dae1))
* **settings:** update plan card copy to match spec ([2034dc5](https://github.com/HartiganHM/concert-crawl/commit/2034dc5d3c08200c43b973fa22ef096b14941851))

# [1.4.0](https://github.com/HartiganHM/concert-crawl/compare/v1.3.1...v1.4.0) (2026-05-11)


### Features

* **observability:** wire up Sentry Structured Logs across all three apps ([c56d987](https://github.com/HartiganHM/concert-crawl/commit/c56d9873973ac05d8e61001072925ca80db63b11)), closes [#225](https://github.com/HartiganHM/concert-crawl/issues/225)

## [1.3.1](https://github.com/HartiganHM/concert-crawl/compare/v1.3.0...v1.3.1) (2026-05-11)


### Bug Fixes

* **crawler:** address Copilot review — counter accuracy + tag resilience ([8e98884](https://github.com/HartiganHM/concert-crawl/commit/8e988847d84d48ef79d5c4344121dfa8dcfa1da1))
* **crawler:** capture crawl failures in Sentry via explicit captureException ([e6d3ea2](https://github.com/HartiganHM/concert-crawl/commit/e6d3ea2db38e4bb92c18a8e0765d570bbb2b1b98)), closes [#212](https://github.com/HartiganHM/concert-crawl/issues/212)

# [1.3.0](https://github.com/HartiganHM/concert-crawl/compare/v1.2.0...v1.3.0) (2026-05-11)


### Features

* **admin:** expose crawlWaitUntil and crawlDelayMs in venue details form ([c3819ca](https://github.com/HartiganHM/concert-crawl/commit/c3819cadde012f219914305d93f552cae1b7cc32)), closes [#210](https://github.com/HartiganHM/concert-crawl/issues/210)

# [1.2.0](https://github.com/HartiganHM/concert-crawl/compare/v1.1.2...v1.2.0) (2026-05-11)


### Bug Fixes

* address Copilot review feedback on profile-v2 ([740a3c9](https://github.com/HartiganHM/concert-crawl/commit/740a3c9002e663a7c6ea7898adadc6aa5dd3f695))
* **api:** restore UUID validation on GET /v1/events/:id lost during rebase ([ced1fbe](https://github.com/HartiganHM/concert-crawl/commit/ced1fbe4dafc15827ef57d9c8e02da0984789d05))
* **ci:** resolve migration conflict + add trust-community to genre themes ([70a2954](https://github.com/HartiganHM/concert-crawl/commit/70a2954d49563c7316d2109ea2d0e38ec5c7b59a))
* **test:** retry clearTables on deadlock to prevent flaky CI ([2ea02b9](https://github.com/HartiganHM/concert-crawl/commit/2ea02b9bb2f897ffc26604c8dd3edaa1072654ae))
* **test:** serialize clearTables with pg_advisory_xact_lock ([7470ce0](https://github.com/HartiganHM/concert-crawl/commit/7470ce022eea61188f25bda5529c0c5f86d1fdc3))
* **web:** add explicit types to SetlistPreview map callbacks ([51a4552](https://github.com/HartiganHM/concert-crawl/commit/51a4552f370a460bf6a842c074f6431e4e390a56))
* **web:** add setlist card wrapper and reorder layout to match design spec ([4db418b](https://github.com/HartiganHM/concert-crawl/commit/4db418b96489a0245a172045213d3f8b58ce3d3b))
* **web:** align ProfileHero, SubmissionItem, and MySubmissionsList with design spec ([789d5f9](https://github.com/HartiganHM/concert-crawl/commit/789d5f9fdbeaaeee71175578049c7b3bfd7307c4))
* **web:** use generative Avatar in desktop UserMenu trigger ([6f1b870](https://github.com/HartiganHM/concert-crawl/commit/6f1b87071b00204e5b02a6b2f58057345957bc73))


### Features

* **api:** atomically increment cred on submission confirmation ([0b13aa5](https://github.com/HartiganHM/concert-crawl/commit/0b13aa58dfa4805d6d55b22bdc9cb5f9ebc9c483))
* event detail v2 — WatchShowButton, SetlistPreview, SoldOutCta, trust chrome ([e5fa7ce](https://github.com/HartiganHM/concert-crawl/commit/e5fa7ce26003f3605b00f07c644ac60fe453e650)), closes [#195](https://github.com/HartiganHM/concert-crawl/issues/195) [#74](https://github.com/HartiganHM/concert-crawl/issues/74)

## [1.1.2](https://github.com/HartiganHM/concert-crawl/compare/v1.1.1...v1.1.2) (2026-05-11)


### Bug Fixes

* **admin:** add genre theme CSS vars + drop dead dark selector ([fa5fea8](https://github.com/HartiganHM/concert-crawl/commit/fa5fea891de5b4b6f9d24280ddd7669383050706))
* **admin:** wire all 9 themes into admin theme picker ([1eb2a65](https://github.com/HartiganHM/concert-crawl/commit/1eb2a650dcc3462bd99a4e5ea59057a8eaa3e870)), closes [#207](https://github.com/HartiganHM/concert-crawl/issues/207)

## [1.1.1](https://github.com/HartiganHM/concert-crawl/compare/v1.1.0...v1.1.1) (2026-05-11)


### Bug Fixes

* **release:** disable successComment + failComment in semantic-release ([5edcea0](https://github.com/HartiganHM/concert-crawl/commit/5edcea054ad39d2c0378d201f24ad0801774a979))

# [1.1.0](https://github.com/HartiganHM/concert-crawl/compare/v1.0.0...v1.1.0) (2026-05-11)


### Bug Fixes

* **themes:** address Copilot review + add design handoff assets ([4cad1f5](https://github.com/HartiganHM/concert-crawl/commit/4cad1f56e476ee7d90b425419cc00ad66d890827))


### Features

* **themes:** add 6 genre themes + redesign picker for 9-theme system ([6c16846](https://github.com/HartiganHM/concert-crawl/commit/6c16846c92b302911c9220c2a3e3a1b9f3fb66a7)), closes [#FF2EC8](https://github.com/HartiganHM/concert-crawl/issues/FF2EC8)

# 1.0.0 (2026-05-11)


### Bug Fixes

* add ^build dependency to lint task in turbo.json ([9ffbc81](https://github.com/HartiganHM/concert-crawl/commit/9ffbc811c749b603f337463785fc32a0c9265e54))
* add audit context and missing 403/401 tests to notifications API ([e7802e0](https://github.com/HartiganHM/concert-crawl/commit/e7802e0e65aedd146d66ad32326db006a75656b0))
* add document check to apply-theme, flesh out tests ([b484c3a](https://github.com/HartiganHM/concert-crawl/commit/b484c3ae41473f70ad97ab5966b278932e816a66))
* add document check to ThemeProvider ([92a1c0d](https://github.com/HartiganHM/concert-crawl/commit/92a1c0da156cd8d29350343556780aed440f3b24))
* add ESLint configs and resolve all lint errors ([f699271](https://github.com/HartiganHM/concert-crawl/commit/f6992716a36d316ae6912ed22c6e4941627b50fd))
* add hono import to establish module scope for augmentation ([3315d9e](https://github.com/HartiganHM/concert-crawl/commit/3315d9e59535ee67c5e3b89b0656c7de4d3da423))
* add import for PriceSource and commit missing drizzle migration metadata ([126e122](https://github.com/HartiganHM/concert-crawl/commit/126e1228e4ba8e07e013321505970e9a3c1448a1))
* add schema validation for role middleware ([7557df4](https://github.com/HartiganHM/concert-crawl/commit/7557df4fbaa6ffca242c6aeed0103716dc2686ec))
* add trial plan case and address typecheck in users route ([2c0d329](https://github.com/HartiganHM/concert-crawl/commit/2c0d32953c128de0132c38160cfbaaadce387ceb))
* add try/catch to fire-and-forget crawl and fix llm test mock ([6ce1da1](https://github.com/HartiganHM/concert-crawl/commit/6ce1da1df8f226bab321bb8d27f7cdf1ab68b0a0))
* add use client to badge/button/input components ([38eca88](https://github.com/HartiganHM/concert-crawl/commit/38eca88069b8f904264dbaa4eeca39dbf8d8517a))
* add venue re-activation and fix admin username dark mode ([fa73410](https://github.com/HartiganHM/concert-crawl/commit/fa73410ba166c4b31a62cb790c7a07216b81581f))
* add Zod validation to invite code POST, fix test mock, fix code format comment ([cc60d19](https://github.com/HartiganHM/concert-crawl/commit/cc60d196101540cf80b44e28759f6585af673749))
* address code review — remove as-cast, handle signOut promise, log catch in MobileProfileEntry ([5d80ac3](https://github.com/HartiganHM/concert-crawl/commit/5d80ac319a6d60808de58348830b79359c119f7a))
* address code review feedback on crawl orchestrator and API routes ([f51770f](https://github.com/HartiganHM/concert-crawl/commit/f51770fe74bf230fc7dc17a87dff7cae6fbc6364))
* address Copilot medium issues and align crawl-runs test expectations ([435d660](https://github.com/HartiganHM/concert-crawl/commit/435d6606992a09c340f30b0ed7478f49d2966133))
* address Copilot PR feedback for phase 5 consumer UI ([e7b511b](https://github.com/HartiganHM/concert-crawl/commit/e7b511b226157804a6de483d23e5221e579e1f34))
* address Copilot PR feedback for phase 5b-1 ([b37f78b](https://github.com/HartiganHM/concert-crawl/commit/b37f78bfe593a7b43a031fe4df131ba96596c304))
* address Copilot PR feedback for phase 5b-2 ([bf3dfe1](https://github.com/HartiganHM/concert-crawl/commit/bf3dfe15b68d7ec1f530190cb74d95d43519aac8))
* address Copilot review — 7 medium issues from PR [#49](https://github.com/HartiganHM/concert-crawl/issues/49) ([bc66f24](https://github.com/HartiganHM/concert-crawl/commit/bc66f24d94845a930ab725c7157830140229f553))
* address Copilot review — aria-label on IdentityArt, bg-subtle token, venue hero positioning ([4d116bd](https://github.com/HartiganHM/concert-crawl/commit/4d116bd9a528b26d53a535d3938e65dc94071e58))
* address Copilot review — crawl status transform, sparkline, selection, prices, mint code ([f3cbec3](https://github.com/HartiganHM/concert-crawl/commit/f3cbec32ac4faeefe4f3c2b64f704161b3ed4ba3))
* address Copilot review — cross-field validation, atomic confirm, null guards, byYou semantics ([cba2a3f](https://github.com/HartiganHM/concert-crawl/commit/cba2a3fa169b65102c1fc306b0a5f1f024784882))
* address Copilot review — noindex stubs, accurate Sentry/cookie/deletion/email copy ([ebd8c04](https://github.com/HartiganHM/concert-crawl/commit/ebd8c049d57039d2fa32f93be51fc66cbb395339))
* address Copilot review — param fix, a11y, ordinal suffix, sparkline order, stat card logic ([90410ab](https://github.com/HartiganHM/concert-crawl/commit/90410ab578d32aba11e67cd68ba2e4a3fb2b6620))
* address Copilot review — sign-out, active nav, a11y, type safety ([305140e](https://github.com/HartiganHM/concert-crawl/commit/305140e3f4295424f78a5a48c0429a8d7278d567))
* address Copilot review — StatCard RSC boundary, today stats, statusFilter, admin auth ([2949d8b](https://github.com/HartiganHM/concert-crawl/commit/2949d8b3857d44847dd632581f9d18f57e0cd435))
* address Copilot review feedback on crawl orchestrator ([c25c048](https://github.com/HartiganHM/concert-crawl/commit/c25c04849483d278136cd3f1a4d05aa6dbf4e7fd))
* address Copilot review feedback on PR [#19](https://github.com/HartiganHM/concert-crawl/issues/19) ([41287bc](https://github.com/HartiganHM/concert-crawl/commit/41287bcfcf948c27b77f107c70f38f3e37d9d0ba))
* address Copilot review findings on PR [#16](https://github.com/HartiganHM/concert-crawl/issues/16) ([cb702c8](https://github.com/HartiganHM/concert-crawl/commit/cb702c8efdc6b9fa1c0fa9563cb96f7b828064fa))
* address Copilot review on Phase 7 plan — auth pattern, UUIDs, email copy, GHA scripts ([c289b89](https://github.com/HartiganHM/concert-crawl/commit/c289b89944868ccafd24fd11a626d0016e22249c))
* address Copilot review on Phase 8a — security, correctness, UI, and docs ([9b77836](https://github.com/HartiganHM/concert-crawl/commit/9b77836347b9324e3a5d0ce62b584d3e243cf950))
* address Copilot review on PR [#105](https://github.com/HartiganHM/concert-crawl/issues/105) ([3e0b576](https://github.com/HartiganHM/concert-crawl/commit/3e0b57605e8e5f5263924cdb9e5d995b6f6299d6))
* address Copilot review on PR [#117](https://github.com/HartiganHM/concert-crawl/issues/117) ([acd0616](https://github.com/HartiganHM/concert-crawl/commit/acd0616614e98759e03a66b55ffffcfa0a2019fa))
* address Copilot review on PR [#29](https://github.com/HartiganHM/concert-crawl/issues/29) — 6 bugs ([096205f](https://github.com/HartiganHM/concert-crawl/commit/096205f8c5c0b44211d3b16d5ccd1e63f65add0d))
* address Copilot review on PR [#32](https://github.com/HartiganHM/concert-crawl/issues/32) — 9 bugs ([4d9acdf](https://github.com/HartiganHM/concert-crawl/commit/4d9acdf70a7c1a50643c784715086a87568db646))
* address Copilot review on PR [#34](https://github.com/HartiganHM/concert-crawl/issues/34) — 7 bugs ([0ac0cbc](https://github.com/HartiganHM/concert-crawl/commit/0ac0cbc5d004d1f5d5dcc32f8748d02ec87319dd))
* address Copilot review on PR [#48](https://github.com/HartiganHM/concert-crawl/issues/48) — CLAUDE.md header, past-due key, delete-account copy ([042efcb](https://github.com/HartiganHM/concert-crawl/commit/042efcb58b7541afb22ebb8ca7ecd03c54304d43))
* address Copilot review on PR [#50](https://github.com/HartiganHM/concert-crawl/issues/50) — remove html theme leak, export VALID_THEMES, lowercase hex ([a1037c8](https://github.com/HartiganHM/concert-crawl/commit/a1037c84afc0ae051d23597ec36890937885537c))
* address Copilot review on PR [#51](https://github.com/HartiganHM/concert-crawl/issues/51) ([63d399d](https://github.com/HartiganHM/concert-crawl/commit/63d399de72bdf8c11a2bde1f61e5e7d57136d2c2))
* address Copilot review on PR [#88](https://github.com/HartiganHM/concert-crawl/issues/88) ([d3a97d8](https://github.com/HartiganHM/concert-crawl/commit/d3a97d8c1118dc7028969032feeb5ff6a3efa008))
* address Copilot review on PR [#94](https://github.com/HartiganHM/concert-crawl/issues/94) ([82cdb08](https://github.com/HartiganHM/concert-crawl/commit/82cdb081ec2780f42ad00e80f73755698ccf8e11))
* address Copilot review on Price Transparency PR ([5ec6dbb](https://github.com/HartiganHM/concert-crawl/commit/5ec6dbb12c1a0bb054f796b81eb18a604866dd71))
* address Copilot second-round review comments ([38eb459](https://github.com/HartiganHM/concert-crawl/commit/38eb4599a5d5d08a8ec69c03f4ba2c75b76242ce))
* address crawler PR feedback for null hash and regressions ([624d88b](https://github.com/HartiganHM/concert-crawl/commit/624d88bda49b6b0570af2eb232cc7c9ce3b42e1f))
* address linting errors ([3af0aeb](https://github.com/HartiganHM/concert-crawl/commit/3af0aebc6c50c93e08941b29ca763a7b8e4a3c93))
* admin API — optional venueId on crawl runs, prices activity endpoint, CrawlRun type enrichment ([7ae5c7b](https://github.com/HartiganHM/concert-crawl/commit/7ae5c7be19624bcfc36eb2037f0ef43dcefc5731))
* admin venues page — verify action, redesigned table, stats + bulk ops ([f408f5d](https://github.com/HartiganHM/concert-crawl/commit/f408f5d12b8d5926c8636ed0cb30c208486421f8))
* admin venues table — verification badge, context-aware bulk actions, breadcrumbs, crawl deep-link ([2a3a714](https://github.com/HartiganHM/concert-crawl/commit/2a3a7147063224b93977fd91d99091f865174474))
* **admin/crawl:** address Copilot review on PR [#170](https://github.com/HartiganHM/concert-crawl/issues/170) ([793d309](https://github.com/HartiganHM/concert-crawl/commit/793d3093d8bf5d12a0a67049966122e2d7f3770a))
* **admin/crawl:** address Copilot review on PR [#189](https://github.com/HartiganHM/concert-crawl/issues/189) ([3f13640](https://github.com/HartiganHM/concert-crawl/commit/3f1364097fd4f4caf652884983e24882584aa979))
* **admin/crawl:** align inspector and run history with design spec ([d39a80e](https://github.com/HartiganHM/concert-crawl/commit/d39a80e209a9a674fa04302c923cd699f7934d43))
* **admin/crawl:** flush panels, large title, fmtDateTimeMT, ErrorBlock, dot badges ([ffbf62c](https://github.com/HartiganHM/concert-crawl/commit/ffbf62c9b1fb3c44aeb46f244293bcf6a7293fe7))
* **admin/crawl:** jump to issues navigates to blocked venue via URL param ([0ba3811](https://github.com/HartiganHM/concert-crawl/commit/0ba38117506820a6dce40e22bd20135401061f85))
* **admin/crawl:** move Run all to page header; add run-all Next.js API route ([406ad47](https://github.com/HartiganHM/concert-crawl/commit/406ad476eb4077708470dfa58908ac516a82a3ca))
* **admin/crawl:** remove unused formatCostValue and formatEventsBreakdown imports ([7682716](https://github.com/HartiganHM/concert-crawl/commit/7682716f8bc4f5ff1e6718ce9bdc3c2ae4a38c28))
* **admin/crawl:** sticky run history table header ([2cd08c9](https://github.com/HartiganHM/concert-crawl/commit/2cd08c9545952d1176a4b469feb59c1a4484dd11))
* **admin/crawl:** venue badge shows last-run status with dot; sticky header; CalendarCheck2 icon ([8315e8f](https://github.com/HartiganHM/concert-crawl/commit/8315e8f3fc160e8b0e09fb219016fa27cb9ddd67)), closes [#174](https://github.com/HartiganHM/concert-crawl/issues/174) [#175](https://github.com/HartiganHM/concert-crawl/issues/175) [#177](https://github.com/HartiganHM/concert-crawl/issues/177) [#179](https://github.com/HartiganHM/concert-crawl/issues/179) [#158](https://github.com/HartiganHM/concert-crawl/issues/158)
* **admin:** address all Copilot review feedback on venue forms ([f939a9f](https://github.com/HartiganHM/concert-crawl/commit/f939a9f0a8035159b4a26b10176cfa67e6900516))
* **admin:** darken --warning token in Electric and Jade for badge contrast ([0db7342](https://github.com/HartiganHM/concert-crawl/commit/0db7342914a334f454782495cc98b3d8305084b3))
* **admin:** swap Invite Codes icon Ticket → Key; add nav config tests ([3f59e58](https://github.com/HartiganHM/concert-crawl/commit/3f59e58f383876598d9e4d871477635a9cc4ac18))
* adminTable 'use client' + electric/jade theme support ([fe519a6](https://github.com/HartiganHM/concert-crawl/commit/fe519a6ec8f6519c01f2f98db3906330ec2a19ca))
* **admin:** use CCMark/CCWordmark in sidebar header; add OPERATIONS section label ([07f92a9](https://github.com/HartiganHM/concert-crawl/commit/07f92a9df56d93caa8c185ad61903d0ec14e7c8c))
* align sentry version and fix gitignore in apps/e2e ([f5fc36b](https://github.com/HartiganHM/concert-crawl/commit/f5fc36b76a96c9803876b4204dd8af201580f6fb))
* **api:** add try/catch around feedback insert + string bounds on pageUrl and message ([2b2d7f3](https://github.com/HartiganHM/concert-crawl/commit/2b2d7f3d79148cf59c0cde3642e883f7be7617e2))
* **api:** add websiteUrl, httpStatusCode, durationMs to crawl status endpoint ([54b62dc](https://github.com/HartiganHM/concert-crawl/commit/54b62dc31c7f610fb60cea67300bb380c411612e))
* **api:** feedback category type, validation error shape, remove redundant truncate ([62679be](https://github.com/HartiganHM/concert-crawl/commit/62679beac7f848d9bd234f1d3adcc4cbc5abe1ef))
* **api:** type body as unknown to satisfy no-unsafe-assignment lint rule ([f892410](https://github.com/HartiganHM/concert-crawl/commit/f892410df4a3e2f3e803d26d29e2bfa866995d5e))
* **api:** validate eventId as UUID in PUT /v1/watching/:eventId ([4dae752](https://github.com/HartiganHM/concert-crawl/commit/4dae752aa4cedd68aa773a9895ec46e8ef87b6fd))
* auth.protect call in auth middleware ([8051cc4](https://github.com/HartiganHM/concert-crawl/commit/8051cc431d665ec5450c5bced3b503322017487c))
* await params, update ts type; fix error boundary tests ([a0cd405](https://github.com/HartiganHM/concert-crawl/commit/a0cd405768a77f2859053dfeff402dd1f793b033))
* **brand:** rename CCClusterMark trail radius field to satisfy id-length lint ([937b6fe](https://github.com/HartiganHM/concert-crawl/commit/937b6fe1790ed8c3cc7e2d999e2413ba10b2f858))
* **brand:** update CCMark import in FeedbackModal ([19c55ac](https://github.com/HartiganHM/concert-crawl/commit/19c55ac77a190b3c2ab9498a16c496098c317105))
* build from monorepo root using turbo filters, add staging services to render.yaml ([9a299e5](https://github.com/HartiganHM/concert-crawl/commit/9a299e5197c4eff9b9b7bf0e99bdbc8f8c1fd7bf))
* build internal packages before running crawler in CI ([08f641a](https://github.com/HartiganHM/concert-crawl/commit/08f641a360d2bb980de890c874be7f339b365590))
* build internal packages before running staging crawler in CI ([d541c77](https://github.com/HartiganHM/concert-crawl/commit/d541c77e58d7e4fa9fc47ea856603a1167c78377))
* **ci:** checkout ref: main in release workflow to avoid non-fast-forward race ([1126594](https://github.com/HartiganHM/concert-crawl/commit/1126594c2dd652d7090411bb00cee927db0adfef))
* **ci:** set HUSKY=0 in release workflow to unblock semantic-release commit ([872b8fb](https://github.com/HartiganHM/concert-crawl/commit/872b8fb51fc78862bae23bd30dc04f95964ae592))
* **ci:** trigger Deploy to Staging on CI success, not Release ([5cd3f41](https://github.com/HartiganHM/concert-crawl/commit/5cd3f417ad2b2998f46f89dfcb5c4d25cfd72d92))
* **claude:** wire session-budget-warn hook in settings.json ([6813491](https://github.com/HartiganHM/concert-crawl/commit/68134916245854a6d928ec2b2b4daee76b7cb664))
* code quality fixes on IdentityArt — key, isDark consistency, missing tests ([d9831d8](https://github.com/HartiganHM/concert-crawl/commit/d9831d8001597fda8f086114a295deadc7c1faae))
* conditional bulk actions + breadcrumb parent crumb on admin venues ([26d0741](https://github.com/HartiganHM/concert-crawl/commit/26d0741033bfaad5d3fa8e86134f2f44be0b61f5)), closes [#102](https://github.com/HartiganHM/concert-crawl/issues/102) [#103](https://github.com/HartiganHM/concert-crawl/issues/103)
* correct 0011_drop_event_images migration timestamp ([02f45b6](https://github.com/HartiganHM/concert-crawl/commit/02f45b61d008eff11537379f5d4545521d1ccbcd))
* correct Bruno assertion paths for auth + venue + handle endpoints ([bce24e6](https://github.com/HartiganHM/concert-crawl/commit/bce24e652246eef976cc62caaf67043969a6ea1d))
* correct out-of-order migration 0008 timestamp + staging repair script ([a18774b](https://github.com/HartiganHM/concert-crawl/commit/a18774bea7d961d7e500e783504f6b1c77d9aabb))
* correct Playwright Docker image tag to v1.59.1-jammy ([75222b3](https://github.com/HartiganHM/concert-crawl/commit/75222b363daf95d3f658a5e5a358ea3574e8a55e))
* **crawler-core:** address Copilot review on PR [#130](https://github.com/HartiganHM/concert-crawl/issues/130) ([e558762](https://github.com/HartiganHM/concert-crawl/commit/e558762ecd2bab71ab4ac5483b140082ebbe727e))
* **crawler-core:** address Copilot review on PR [#147](https://github.com/HartiganHM/concert-crawl/issues/147) ([170a07d](https://github.com/HartiganHM/concert-crawl/commit/170a07d3fe18a87b0649c5defc33361a342abdc2))
* **crawler-core:** make genre tagger resilient to unknown genres and large batches ([8319624](https://github.com/HartiganHM/concert-crawl/commit/8319624b638310ffb603f3e93fb66bd1271d745c)), closes [#141](https://github.com/HartiganHM/concert-crawl/issues/141) [#142](https://github.com/HartiganHM/concert-crawl/issues/142)
* **crawler:** add per-venue crawlWaitUntil override; set Bluebird to 'load' ([9fb6ef5](https://github.com/HartiganHM/concert-crawl/commit/9fb6ef51d372fcae47170a1eb620260b971a2924)), closes [#143](https://github.com/HartiganHM/concert-crawl/issues/143)
* **crawler:** add playwright as direct dependency ([bb7162f](https://github.com/HartiganHM/concert-crawl/commit/bb7162f17acaf7c64798614af5a142b9decf8fa5))
* **crawler:** address Copilot review on PR [#144](https://github.com/HartiganHM/concert-crawl/issues/144) ([5c723de](https://github.com/HartiganHM/concert-crawl/commit/5c723de9b32f93419fe921445b0947dbf41bf6b5))
* **crawler:** build price-pipeline dist in Dockerfile ([aea575d](https://github.com/HartiganHM/concert-crawl/commit/aea575d772649597519c842cbe868481f77621ca)), closes [#184](https://github.com/HartiganHM/concert-crawl/issues/184)
* **crawler:** gate price pipeline on crawl status; add resolved-but-failed tests ([7d5f6b9](https://github.com/HartiganHM/concert-crawl/commit/7d5f6b9c51eacaac04ec2c6052fd18a66b524409))
* **crawler:** narrow venueId type after nullable FK migration ([2dcf851](https://github.com/HartiganHM/concert-crawl/commit/2dcf8517394a033fd3f726e5accf2ca736f1c288))
* **crawler:** share single Playwright browser instance across venue crawls ([da84a78](https://github.com/HartiganHM/concert-crawl/commit/da84a7851c9c42dd18f8cb30e28edd473ae1f83d)), closes [#133](https://github.com/HartiganHM/concert-crawl/issues/133)
* **crawler:** update run.test.ts mock for tagEventsWithGenres and crawl run return value ([80b2b1e](https://github.com/HartiganHM/concert-crawl/commit/80b2b1ea581a260bcfb5a63a5dee2818c5a26ab7))
* **crawler:** wire price pipeline into crawl execution flow ([e92df53](https://github.com/HartiganHM/concert-crawl/commit/e92df53fd4e9dedb52856696359ebf6613382931)), closes [#51](https://github.com/HartiganHM/concert-crawl/issues/51) [#126](https://github.com/HartiganHM/concert-crawl/issues/126)
* create clerk type definitions for metadata ([1e91e0e](https://github.com/HartiganHM/concert-crawl/commit/1e91e0e4297e2e3d4d4a8fecf6622aaec86437ad))
* ctx ref in docs ([fa551b7](https://github.com/HartiganHM/concert-crawl/commit/fa551b715c8c33d16b9ad9c13ae7fb51d87505e7))
* dark mode styling ([8a21f00](https://github.com/HartiganHM/concert-crawl/commit/8a21f00601ae7b5194a340e542bac7dee1a6545e))
* dateGroupLabel uses weekday short (Thu not Thursday) ([d59d651](https://github.com/HartiganHM/concert-crawl/commit/d59d651679fa768620840d522dedc10b532ef411))
* deduplicate AdminVariables, use getAuthUser, skip audit on GET ([4ff7ada](https://github.com/HartiganHM/concert-crawl/commit/4ff7ada499bb78dc643a419fe86f760507531e52))
* default admin theme to Electric instead of system preference ([fddad81](https://github.com/HartiganHM/concert-crawl/commit/fddad81e69067591759caba6f2dba04521ea0853))
* drop --passWithNoTests; add test:integration turbo task with build deps ([b061faa](https://github.com/HartiganHM/concert-crawl/commit/b061faa6abc2bc6b9d39a8e44113e59dad42e51f))
* **empty-state:** make CTAs link-only, remove onClick support ([08126a3](https://github.com/HartiganHM/concert-crawl/commit/08126a3c1de86734a646ca2b1c2716230ce3e264))
* error propagation to client app ([c3c2667](https://github.com/HartiganHM/concert-crawl/commit/c3c26672742d32a700b64c5de1af68b7b47217d3))
* exclude integration tests from unit test runner; fix turbo build filter in CI ([cb70cc5](https://github.com/HartiganHM/concert-crawl/commit/cb70cc584d45f1590e2eeadffb05ee5964063a25))
* explicit null guard for pageHash skip comparison ([496827c](https://github.com/HartiganHM/concert-crawl/commit/496827c861bdcd98ffa72dd312ce5ff71351dcad))
* explicit token null guard and hitCount coercion in admin prices page ([f17e2dc](https://github.com/HartiganHM/concert-crawl/commit/f17e2dcfb00166f3f2816ae21f2d0796b2df204e))
* extract isLocalConnectionString helper, add tests, fix migrate.ts SSL ([3e25dee](https://github.com/HartiganHM/concert-crawl/commit/3e25dee4552639a04d73c793f710dc217c391272))
* **feedback:** add ContextDisclosure and Save-and-come-back to error state ([ced673b](https://github.com/HartiganHM/concert-crawl/commit/ced673bdc73deb49b36cdf94f6c007bf544ce09b))
* **feedback:** bearer auth, clear field errors on input, fix error copy ([02f09cb](https://github.com/HartiganHM/concert-crawl/commit/02f09cb6de3785fc318adba62d10ecfd6a531253))
* filterBar scrollbar-none CSS, shrink-0 on chip buttons ([ac109ab](https://github.com/HartiganHM/concert-crawl/commit/ac109ab9260153488376f43326701536c5c38ea4))
* guard seed execution so it only runs when invoked directly ([d1013b4](https://github.com/HartiganHM/concert-crawl/commit/d1013b4a6381ba224c53e93fb4b8fb9e7fdcde99))
* identityFor rotate is a scalar not a tuple ([bf8ac99](https://github.com/HartiganHM/concert-crawl/commit/bf8ac99666a3455e8ff9c83fe3d60e70a8661246))
* implement more strict check for existing event hash; parseFloat event.confidence ([b4de6fb](https://github.com/HartiganHM/concert-crawl/commit/b4de6fb4f10bc5f3817c493b8b1cf79620a7693e))
* improve e2e test guards for empty DB and swallowed assertions ([5637019](https://github.com/HartiganHM/concert-crawl/commit/563701922c35c6118b04490d19acbd8266433527))
* include in-progress runs in crawl list; add GET /admin/crawl/status endpoint ([165b1c3](https://github.com/HartiganHM/concert-crawl/commit/165b1c3a55cbccd3c520d06d70fc50346b62af81))
* keep verified out of onConflictDoUpdate set ([20552ca](https://github.com/HartiganHM/concert-crawl/commit/20552ca5f7513bec4cf20d686c58e4400a513a40))
* landing page CTA priority, animation gap, dots, dynamic shows ([893f361](https://github.com/HartiganHM/concert-crawl/commit/893f3611ffa002f9ef025cefc7edfc31128067b0))
* linting errors for var length constraint ([1f82941](https://github.com/HartiganHM/concert-crawl/commit/1f82941f1ab1a7391b7d4551f9fc42915260c101))
* linting variable length error ([e000e4a](https://github.com/HartiganHM/concert-crawl/commit/e000e4ab52008645c2b24cc081a367a7f5588697))
* load .env.local in API env validation (tsx does not auto-load env files) ([e6ca71c](https://github.com/HartiganHM/concert-crawl/commit/e6ca71cccc8aba2657cf6d007020b2d2dc15ccdd))
* loadMoreButton explicit token-based styling ([6ac67d5](https://github.com/HartiganHM/concert-crawl/commit/6ac67d5f8b4500aee3bc1413458c76fb6c3f7124))
* **middleware:** redirect returning users with invite cookie to /onboarding ([#80](https://github.com/HartiganHM/concert-crawl/issues/80)) ([b51c31e](https://github.com/HartiganHM/concert-crawl/commit/b51c31eae283d5c2788b0d81bb3eecf21618b3fa))
* move middleware.ts into src/ directory for Next.js src-layout projects ([6c2572f](https://github.com/HartiganHM/concert-crawl/commit/6c2572f64cda700c20ca3448b6df6598f69a5a11))
* null-guard userId before awarding cred — price_submissions.userId is now nullable ([ef55e0b](https://github.com/HartiganHM/concert-crawl/commit/ef55e0bb066a6adaaa19933152d1ef099f84423e))
* **onboarding:** address Copilot review — button type, focus rings, test stub, cookie check ([84b6347](https://github.com/HartiganHM/concert-crawl/commit/84b63470ad940f4c3262748a3bb97c76f27f13ec))
* **onboarding:** layout overhaul — chrome, desktop card, back button ([#134](https://github.com/HartiganHM/concert-crawl/issues/134) [#135](https://github.com/HartiganHM/concert-crawl/issues/135)) ([ed6bde7](https://github.com/HartiganHM/concert-crawl/commit/ed6bde713294feb7e491bad2ecd6962e16235ea2))
* **onboarding:** load Caveat font for founder sign-off script style ([42184c3](https://github.com/HartiganHM/concert-crawl/commit/42184c393934243c3dbae82458b2ea202802bb9f))
* **onboarding:** make step body scrollable on tall content steps ([45b9e42](https://github.com/HartiganHM/concert-crawl/commit/45b9e4275b65b52fb4e95bb785bdaf082c901ea4)), closes [#136](https://github.com/HartiganHM/concert-crawl/issues/136) [#137](https://github.com/HartiganHM/concert-crawl/issues/137)
* **onboarding:** spec alignment — heading size, text-wrap, scroll pattern, mobile step label ([c4e907f](https://github.com/HartiganHM/concert-crawl/commit/c4e907fbf8ea8f7af727444fad9350218a719429))
* **onboarding:** update step 5 copy — feedback nudge, remove email ([#138](https://github.com/HartiganHM/concert-crawl/issues/138)) ([31656eb](https://github.com/HartiganHM/concert-crawl/commit/31656eb4bf9422883203f228e850a2509eb9de05))
* orchestrator tier 3/4 latency timing and test assertions ([7b6964e](https://github.com/HartiganHM/concert-crawl/commit/7b6964e9c154de9d80ffe7c437878ccf49ed410c))
* pin pnpm via Corepack and add .dockerignore for smaller build context ([2bbe8de](https://github.com/HartiganHM/concert-crawl/commit/2bbe8dedac1bf10fb9c1da0da175dd662d38dcbe))
* prices activity endpoint — use outcome field instead of non-existent priceMin ([e9be875](https://github.com/HartiganHM/concert-crawl/commit/e9be875f37f4ca49202787dded2f8401d9046c79))
* redirect instead of throw on missing INVITE_COOKIE_SECRET in layouts ([779c769](https://github.com/HartiganHM/concert-crawl/commit/779c769f0b63f51283af8510a195e99e6bf2cca5))
* **release:** remove persist-credentials: false so git auth works ([ab063b5](https://github.com/HartiganHM/concert-crawl/commit/ab063b5839071dd007b8cf4d2426ec95a4f5769a)), closes [#190](https://github.com/HartiganHM/concert-crawl/issues/190)
* **release:** use GH_TOKEN in checkout so semantic-release can push to main ([2f2904a](https://github.com/HartiganHM/concert-crawl/commit/2f2904a8e5b2d77d49503aa9a06bde1f491a31e0))
* remove error.name/message checks in admin error boundary ([1fa4c64](https://github.com/HartiganHM/concert-crawl/commit/1fa4c64db192ee27bd2a0a979dc21840b53aeb5e))
* remove non-null assertion from artistHue, use nullish coalescing ([2325342](https://github.com/HartiganHM/concert-crawl/commit/232534204c996543cddc721619c19caa2b896958))
* remove redundant type cast in healthCheck ([24879d9](https://github.com/HartiganHM/concert-crawl/commit/24879d9e7f9c09b49a2924643022dca3622f72ba))
* remove unused @sentry/node dep from apps/api; clarify logger test comment ([7f85a02](https://github.com/HartiganHM/concert-crawl/commit/7f85a0275eb0d31d80577bd720349f58647c7428))
* remove unused and import; add leftJoin to crawl runs test mock ([5387cc8](https://github.com/HartiganHM/concert-crawl/commit/5387cc8413741099447db953956fa21fc6f6b5cb))
* remove unused CrawlStatusRow import from admin page ([9581507](https://github.com/HartiganHM/concert-crawl/commit/958150766530effeb7ff6819be58fd7f7fc27071))
* remove unused formatPrice import from event detail page ([b235c74](https://github.com/HartiganHM/concert-crawl/commit/b235c7419acda9d23643e502048a4fae1625d05d))
* remove unused token prop, clean up casts in crawl trigger ([d9876c2](https://github.com/HartiganHM/concert-crawl/commit/d9876c2fde66f121bfd10e78cde58175e14d6359))
* rename single-char variables to satisfy id-length lint rule ([0c74fe7](https://github.com/HartiganHM/concert-crawl/commit/0c74fe72a2aa8a87c48cdf9a1bf5b0bd26966659))
* **render:** correct AFTER_SIGN_UP_URL to /auth/complete; fix step reference ([b68bc98](https://github.com/HartiganHM/concert-crawl/commit/b68bc98e6623526ba4d7eb54e1640d67cab66b26))
* replace as Node cast with instanceof type guard in NotificationBell ([508576a](https://github.com/HartiganHM/concert-crawl/commit/508576a2b9380d8e11f89f92ec768b25d61d0349))
* replace plain text sidebar lockup with logo mark and ADMIN badge ([6aa5fc5](https://github.com/HartiganHM/concert-crawl/commit/6aa5fc5891673488237597d28d0228ada5f94c26))
* require SSL for non-local Postgres connections ([ab53cd8](https://github.com/HartiganHM/concert-crawl/commit/ab53cd8b7f10650fdfbe124e4aa5382d5b528ebe))
* resolve exactOptionalPropertyTypes errors in admin StatCard usages ([ee1d9f2](https://github.com/HartiganHM/concert-crawl/commit/ee1d9f2b90161ecffba6d3ac34b8ee740d1398df))
* resolve id-length and unused-var lint errors in phase 5 consumer UI ([9f46222](https://github.com/HartiganHM/concert-crawl/commit/9f462220bcaf3779987b47cc08317efbaadc62fa))
* resolve lint errors in packages/logger and apps/api ([9e2f03a](https://github.com/HartiganHM/concert-crawl/commit/9e2f03a3011a4b4a5f50c2d9431b212141ccd0bc))
* resolve lint/build errors in PriceSubmissionForm ([ff430fd](https://github.com/HartiganHM/concert-crawl/commit/ff430fd9d12c10c4097ded5976aa78e2a1fcd7fe))
* resolve type/lint errors in apps/e2e ([e6c2ffc](https://github.com/HartiganHM/concert-crawl/commit/e6c2ffc65fed344a992b905e3377f7441f95d246))
* resolve typecheck failures across all packages ([92ca0ec](https://github.com/HartiganHM/concert-crawl/commit/92ca0ec6f2844fc630d95e29c7b185644af2619d))
* responsive nav, mobile toggle, chip scroll affordance ([8441cf7](https://github.com/HartiganHM/concert-crawl/commit/8441cf7944e914e75fecc6835681b74602d62d96))
* restore hover state on inactive AppHeader nav links ([30653e5](https://github.com/HartiganHM/concert-crawl/commit/30653e559ce1fef3f97fa5ca30516371224722f7))
* revert use client usage ([a04bc2f](https://github.com/HartiganHM/concert-crawl/commit/a04bc2f45a70328a9402f3635efe9db0f993ccdc))
* **search:** address Copilot review on PR [#171](https://github.com/HartiganHM/concert-crawl/issues/171) ([cb0eb90](https://github.com/HartiganHM/concert-crawl/commit/cb0eb90f67c644999741c4c47909853b19671e9e))
* **search:** align implementation with design handoff ([e6729bc](https://github.com/HartiganHM/concert-crawl/commit/e6729bcd6246e529a68386dcb113e7cde77f355b))
* set null values for event data on crawl when value is empty string ([7b22b47](https://github.com/HartiganHM/concert-crawl/commit/7b22b4717f4741cdaa711787e415abf2a724aff5))
* surface admin page crash and apply root-cause fix ([ef06884](https://github.com/HartiganHM/concert-crawl/commit/ef068841cb3e483a0b971d1e98f059bc3cad6236))
* tier 3 Dice location filter, tier 4 remove dead network requests, tier 5 null guard ([a9d7d5d](https://github.com/HartiganHM/concert-crawl/commit/a9d7d5d84f1eb9623df92b2a030799eeb6ed77ac))
* type price_retrieval_log.source as price_source enum ([a4f373b](https://github.com/HartiganHM/concert-crawl/commit/a4f373bc02ca6890a48c599c699dc38f8b831c38))
* typecheck and lint cleanup for phase 5b-3 ([93c95c6](https://github.com/HartiganHM/concert-crawl/commit/93c95c697b4ab3776d4f65eeaeedfc691c8aebed))
* update @clerk/nextjs to latest to fix headers issue ([e80bc76](https://github.com/HartiganHM/concert-crawl/commit/e80bc766b8abfd915c692156aa92d569915cd5e2))
* update API .env with CLERK_PUBLISHABLE_KEY ([b7c7175](https://github.com/HartiganHM/concert-crawl/commit/b7c7175c06abaa44f36a600c804808da4f74bae3))
* update API env schema with CLERK_PUBLISHABLE_KEY ([714ec04](https://github.com/HartiganHM/concert-crawl/commit/714ec0432ed9c580d435085b5d46b5df52115fa7))
* update apps/api/src/routes/admin/index.ts ([41b3fa3](https://github.com/HartiganHM/concert-crawl/commit/41b3fa393730223fbb53fdfe7a9c254caf2f5b2e))
* update apps/api/src/routes/admin/venues.ts ([73df684](https://github.com/HartiganHM/concert-crawl/commit/73df684cdc6de4d2989c72e6f469dd6092fced26))
* update apps/web/src/app/(protected)/admin/venues/[id]/page.tsx ([820954f](https://github.com/HartiganHM/concert-crawl/commit/820954ff897ce4d4e5dfe26be8753884db106f61))
* update checks to strict inequality ([7bb4ec5](https://github.com/HartiganHM/concert-crawl/commit/7bb4ec56878ee781c24a9120b4d9a9c0b3f5b11c))
* update dev dependsOn to build pacakges before running local env ([29e7362](https://github.com/HartiganHM/concert-crawl/commit/29e73624f976e502cdc105500b718637b927820b))
* update extractors to use extractor tool and zod schema for structured events ([4e47922](https://github.com/HartiganHM/concert-crawl/commit/4e479222ed9eb52eb9b8a204a423df0f004f847e))
* update generate-invite-form to send ISO date ([cc02216](https://github.com/HartiganHM/concert-crawl/commit/cc0221671fb74de0c99d31acb48a0dc52959adb3))
* update Playwright to pull data on networkIdle ([f1f3a13](https://github.com/HartiganHM/concert-crawl/commit/f1f3a130f11946514f6d492bcd91e7239f4075cd))
* update tests to use metadata from sessionClaims ([200f0ec](https://github.com/HartiganHM/concert-crawl/commit/200f0ec8a20148d1c2790c39be42f02f2f5ed87a))
* update vite dependencies to correct version ([82d0d2e](https://github.com/HartiganHM/concert-crawl/commit/82d0d2e7ff20947ec1aaa10d0f542a18d1079513))
* use auth abstraction and null guard pattern in /me pages ([3d8f0e3](https://github.com/HartiganHM/concert-crawl/commit/3d8f0e3f7bdd62f98ed9a4bda9ae4d6535abe04f))
* use auth lib alias and throw on missing token in invite-codes actions ([b197d4f](https://github.com/HartiganHM/concert-crawl/commit/b197d4f8a90a3e2afab332682c303c97254d2281))
* use auth lib alias, add error handling to event queue actions ([01bb277](https://github.com/HartiganHM/concert-crawl/commit/01bb2773ae4fcc65ba11ed28aa2c23d4c70efe74))
* use conditional spread for optional initialSelectedId prop ([39cb13e](https://github.com/HartiganHM/concert-crawl/commit/39cb13e3094d8439bc726d6175fea4b05361e6f0))
* use Docker base image for crawler cron jobs to avoid Playwright extraction hang ([9b16533](https://github.com/HartiganHM/concert-crawl/commit/9b16533973e552f666b5744334c4a8087b51cf16))
* use ExtractionStrategy type ref, add robotsTxtCheckedAt to Venue ([5018788](https://github.com/HartiganHM/concert-crawl/commit/501878813d1b299792abbdabb3e0e4db8cdf0eca))
* use shared EventsListResponse type and fix silent catch in fetchHeroShows ([c68e099](https://github.com/HartiganHM/concert-crawl/commit/c68e0992d2b6c63c25ebf407df6c624a71620f3d))
* use string for serialized date fields in Venue and InviteCode types ([406f593](https://github.com/HartiganHM/concert-crawl/commit/406f593c842dc8810505bc174dd8d091ea8b31c0))
* use type-only import for SQL in public API routes ([333bdff](https://github.com/HartiganHM/concert-crawl/commit/333bdff29c9a43568cfc23b4facbe1217be2108a))
* use typed Hono context variables for audit fields ([c7636de](https://github.com/HartiganHM/concert-crawl/commit/c7636dedbc3d26e19082bfc238cee4d395fc151b))
* use Zod validation on PATCH /admin/prices/submissions/:id ([31f7786](https://github.com/HartiganHM/concert-crawl/commit/31f7786bff5eda41f7570dc6ebcddb8a98f82a68))
* **user-menu:** add chevron button to identity card and live submission count ([563da96](https://github.com/HartiganHM/concert-crawl/commit/563da96d9619163a2292995b433fc0e9f4557694))
* **user-menu:** bearer auth, fix nested buttons, dead interactives, light swatch, hide pill on admin ([8dcd9dd](https://github.com/HartiganHM/concert-crawl/commit/8dcd9ddc7d963815e75e2c2de0c08966475fd4a8))
* **watching:** address Copilot review on PR [#140](https://github.com/HartiganHM/concert-crawl/issues/140) ([775ecfb](https://github.com/HartiganHM/concert-crawl/commit/775ecfb31bdfcecca6fd1d27375f9cd9cba8cdba))
* **watching:** render IdentityArt in WatchingItem; rehydrate watch state on Browse ([2194def](https://github.com/HartiganHM/concert-crawl/commit/2194defd2f0aa1be260506e3a334a62f599b786e)), closes [#124](https://github.com/HartiganHM/concert-crawl/issues/124) [#125](https://github.com/HartiganHM/concert-crawl/issues/125)
* **web:** address Copilot review on PR [#166](https://github.com/HartiganHM/concert-crawl/issues/166) ([3a0bf31](https://github.com/HartiganHM/concert-crawl/commit/3a0bf3113cb305733e33b749cbc9b6771a6c2d99))
* **web:** address Copilot review on PR [#166](https://github.com/HartiganHM/concert-crawl/issues/166) ([113a2b3](https://github.com/HartiganHM/concert-crawl/commit/113a2b3bde56e5eef9ef5f21e4af9b18c63e1bd5))
* **web:** correct 4 spec gaps in Watching surface components ([3a79f28](https://github.com/HartiganHM/concert-crawl/commit/3a79f288606127ea411dfcf6939fb01c0e9d6dc5))
* **web:** feedbackModal — SSR-safe isMobile, error logging, Esc key, a11y attrs ([2147e6b](https://github.com/HartiganHM/concert-crawl/commit/2147e6bc62cb0be9b74d24661d8352586cc474ad))
* **web:** remove duplicate MT_TIMEZONE; import formatCostValue in CrawlSplitView ([9239818](https://github.com/HartiganHM/concert-crawl/commit/923981813921b19d3c2fc3f4c2ae0f0de54cbde3))
* **web:** remove phase eyebrow, extend CrawlStatusRow, add sweep/run-breakdown hints ([0b4d278](https://github.com/HartiganHM/concert-crawl/commit/0b4d278599e93a4fbb17ef939022cb53614e5750))
* **web:** rename sort params to satisfy id-length lint rule ([53d57fe](https://github.com/HartiganHM/concert-crawl/commit/53d57fe5f2be027efc86dd50008cb6d78391e51f))
* **web:** resolve noUncheckedIndexedAccess and exactOptionalPropertyTypes errors ([7d3ddc5](https://github.com/HartiganHM/concert-crawl/commit/7d3ddc5a1580b0ca8b8c39c9a3e13032e087fae8))
* **web:** resolve noUncheckedIndexedAccess and exactOptionalPropertyTypes errors ([bd59f12](https://github.com/HartiganHM/concert-crawl/commit/bd59f12059129aa6667b9e092cd024f96fb265aa))
* **web:** statCard label uppercase, issuesBanner breakdown+jump, crawlSplitView rewrite ([09bcf68](https://github.com/HartiganHM/concert-crawl/commit/09bcf6857626df8f6a54949ff2ea46841d2fe115))
* **web:** statCard label uppercase, issuesBanner breakdown+jump, crawlSplitView rewrite ([8ad7571](https://github.com/HartiganHM/concert-crawl/commit/8ad7571e45021aa38b95bcefdcc2e900202ea128))
* **web:** userMenu — esc key, gated click-outside listener, menu ARIA pattern ([3809e78](https://github.com/HartiganHM/concert-crawl/commit/3809e78dfaeef69076dd2410c9fb5853a8beafe9))
* wire admin settings theme picker to admin theme system ([83dc168](https://github.com/HartiganHM/concert-crawl/commit/83dc1681c6246d9e34b5807c149d17e0e6e1898d))
* wrap admin page API requests in try/catch to debug deployed bug ([2980e71](https://github.com/HartiganHM/concert-crawl/commit/2980e714823f4d34b097c67c852dea10407ac1f9))


### Features

* /me and /me/edit routes — server-fetched profile + edit form ([1861097](https://github.com/HartiganHM/concert-crawl/commit/1861097045def42e92499f3edd731b6595a00577))
* add /v1/submissions router — confirm, dispute, PATCH, DELETE ([d9a823a](https://github.com/HartiganHM/concert-crawl/commit/d9a823a065ee0f4217edb861349e6c58df48c3f1))
* add /v1/users/* API routes (me, submissions, handle-availability, delete) ([e97ff72](https://github.com/HartiganHM/concert-crawl/commit/e97ff7258ab8831266e99683662afb3f37d76fbe))
* add activity feed filter tabs and cost trend to dashboard ([9528042](https://github.com/HartiganHM/concert-crawl/commit/9528042c67ab4ea9535a6f7a77eac1f9bd62f957))
* add admin events API (list unverified, verify, delete) ([ceee87e](https://github.com/HartiganHM/concert-crawl/commit/ceee87e2ed3777305edf34d43fb21b1fff015185))
* add admin layout with sidebar nav and dashboard page ([ff39ea1](https://github.com/HartiganHM/concert-crawl/commit/ff39ea1c0c08268b5e5b722ddf9d46043eb6f9f2))
* add admin notifications API (list, mark-as-read, read-all) ([9bdb544](https://github.com/HartiganHM/concert-crawl/commit/9bdb544ef4d7b398a1af4779e3c7545da53ec65c))
* add admin primitives — StatusBadge, AdminButton, CostText, RelTime, ProgressBar, Kbd ([df848da](https://github.com/HartiganHM/concert-crawl/commit/df848da8a500ed87277e9d46c2d2886a6dc3ce36))
* add admin settings page with theme picker (Phase 4) ([4b82356](https://github.com/HartiganHM/concert-crawl/commit/4b82356e3b287e4dfeeff71d94f08041154b89d1))
* add Admin UI error boundary ([d1a6f3e](https://github.com/HartiganHM/concert-crawl/commit/d1a6f3e242a146a1c1a494a7275b72c0bac7ed0e))
* add admin venue CRUD routes with role guard and audit logging ([e3fef76](https://github.com/HartiganHM/concert-crawl/commit/e3fef76e1cd58f95e07a7233791db8144a405fed))
* add applyTheme function and DOM tests ([92d646c](https://github.com/HartiganHM/concert-crawl/commit/92d646cf6581fb1fb3cfbd53b82b7fd07d453835))
* add auth globalSetup and API helper for e2e tests ([a50bbc6](https://github.com/HartiganHM/concert-crawl/commit/a50bbc698342f24a65a4d44941ab019d6be2a59e))
* add CCWordmark, BetaPill, GigPoster, GigPosterStack, and WaitlistModal ([fa65865](https://github.com/HartiganHM/concert-crawl/commit/fa65865a8dbd048e62cc2e0e74d5700ce99593a2))
* add Clerk auth and role middleware to Hono API ([bdaa55b](https://github.com/HartiganHM/concert-crawl/commit/bdaa55b99180aef3eebfbb620f4722859e89c1a1))
* add Clerk route protection and auth utilities to Next.js app ([aec07c2](https://github.com/HartiganHM/concert-crawl/commit/aec07c270744b661774ade33d4eacdcda994bd4e))
* add crawl stats row and issues banner to crawl page ([14f676d](https://github.com/HartiganHM/concert-crawl/commit/14f676d00c36606f0071d24ac184ea27d6eff313))
* add Crawl Status and Event Review to admin nav ([e39f0e7](https://github.com/HartiganHM/concert-crawl/commit/e39f0e713567f5cad7bfe980b8dbc2632ef3dc3c))
* add crawl status dashboard page ([4f02c51](https://github.com/HartiganHM/concert-crawl/commit/4f02c5136b61e2ce008fa4f42dfde6293276a3be))
* add cred score system — CredChip, +1 cred label, API exposure ([5bca727](https://github.com/HartiganHM/concert-crawl/commit/5bca72763d940f45dd9f509b1a8c6c3e479aba74))
* add DangerZone + DeleteAccountSheet with DELETE-typed gate ([1bab995](https://github.com/HartiganHM/concert-crawl/commit/1bab9956a72d36592c6fbe2aaf161a52c6c07939))
* add data-testid attributes to event-card and venue components ([c915941](https://github.com/HartiganHM/concert-crawl/commit/c915941db7edea51143138e81ed12bce879363bf))
* add database package with full Drizzle schema ([fdd16aa](https://github.com/HartiganHM/concert-crawl/commit/fdd16aa54a03555c28c91895af28c50362fbc3fd))
* add database seed script with 5 Denver venues ([0e6fe58](https://github.com/HartiganHM/concert-crawl/commit/0e6fe58bf80be1dd7e0db4181745055f1a30fa76))
* add Docker Compose for local Postgres and run initial migration ([3915c10](https://github.com/HartiganHM/concert-crawl/commit/3915c1006e060f7bbf1e226d8d4dbce394010f8b))
* add edit profile form with handle/city/avatar and debounced availability check ([6f10f06](https://github.com/HartiganHM/concert-crawl/commit/6f10f069da29d09934f1a4c1d235d2d9f08bb0c3))
* add event filter rail, confidence flags, and bulk actions to event review ([ec465a6](https://github.com/HartiganHM/concert-crawl/commit/ec465a6fcd2d59fae7251ae74fbc57c0bdaf5e32))
* add event review page for admin data refinement ([a18cbb4](https://github.com/HartiganHM/concert-crawl/commit/a18cbb4dbc008f4f494d9b3419375d7f43618f00))
* add getAuthOptional middleware helper ([a90a974](https://github.com/HartiganHM/concert-crawl/commit/a90a97404d3e47fc3c484e541b118d4c153a7a32))
* add GitHub Actions cron workflows for daily crawler (prod + staging) ([8c8db13](https://github.com/HartiganHM/concert-crawl/commit/8c8db134c8f6a76877a82725edd82d9fbb4abb58))
* add hashPage and hashEvent utilities ([f3d8d74](https://github.com/HartiganHM/concert-crawl/commit/f3d8d74ea6fc571e6764472bf59bf5954d074498))
* add Hono API with health endpoint and Zod env validation ([59b06a6](https://github.com/HartiganHM/concert-crawl/commit/59b06a66bc08e70010bc59edaaf00b8a4b4cd953))
* add IdentityArt generative identity engine ([a411c28](https://github.com/HartiganHM/concert-crawl/commit/a411c28205a6333cd9c7f7eeda57302418f985ea))
* add in-memory rate limiter ([8207111](https://github.com/HartiganHM/concert-crawl/commit/8207111d45967d70d07fae8ebe25767de4e4786f))
* add inline invite creator panel and StatCards to invite codes page ([a78cba6](https://github.com/HartiganHM/concert-crawl/commit/a78cba6b9c446f78a3832775d0c01820564b45d6))
* add invite code generation and revocation routes ([e0401f3](https://github.com/HartiganHM/concert-crawl/commit/e0401f3a6f9ccf5a388c1da06aa0a7a40481f864))
* add invite code management UI with generate and revoke ([b4e07e9](https://github.com/HartiganHM/concert-crawl/commit/b4e07e9c7e0560ca49da927d53363fffc09d6d63))
* add invite cookie utilities and update middleware with invite-code gate ([1629c00](https://github.com/HartiganHM/concert-crawl/commit/1629c002f99f787af49cdfb04232060492057e2a))
* add legal pages — beta agreement, T&C stub, Privacy Policy stub ([d35031f](https://github.com/HartiganHM/concert-crawl/commit/d35031f3418e0565e7f0955b6f322a0c1f909134)), closes [#64](https://github.com/HartiganHM/concert-crawl/issues/64)
* add nav badge counts and section labels to admin sidebar ([325d06c](https://github.com/HartiganHM/concert-crawl/commit/325d06c7ee8ea7f3207df59d091c4395cdb5dc25))
* add notification bell to admin sidebar ([c3fdb28](https://github.com/HartiganHM/concert-crawl/commit/c3fdb28ee99a73161c12f234ef79c2efb598bf62))
* add onboarding page with cookie gate + auth/complete route ([2638514](https://github.com/HartiganHM/concert-crawl/commit/26385142b751de6dfae7a47fe498d966a705a557))
* add onboarding step components and shell ([52828f9](https://github.com/HartiganHM/concert-crawl/commit/52828f90c8fbbc63fa4c31207c4e8ae749fee45d))
* add pageHash to crawl_runs, drop rawHtml from events ([eab7d6e](https://github.com/HartiganHM/concert-crawl/commit/eab7d6e8b0f1109d3ca19e76aaad170e6177a225))
* add per-venue crawl trigger button to crawl inspector ([2e33df0](https://github.com/HartiganHM/concert-crawl/commit/2e33df07cf36d31bfdd1e8d051945e082998ff1a))
* add PlanCard component (founder/paid/trial/past-due) ([c4c3de0](https://github.com/HartiganHM/concert-crawl/commit/c4c3de0e3d5790be626d22c8c991ab926837a0a5))
* add playwright configs for e2e and smoke suites ([2337314](https://github.com/HartiganHM/concert-crawl/commit/23373145b343465850976aeaff2d7892c381131c))
* add POST /v1/auth/validate-code, redeem-code and auth router ([d378048](https://github.com/HartiganHM/concert-crawl/commit/d37804843b247c7ecde48850214551f24169975a))
* add POST /v1/waitlist endpoint ([ef7cf1e](https://github.com/HartiganHM/concert-crawl/commit/ef7cf1e446999fa562118193e0c8d29be457f8d2))
* add POST/GET /v1/events/:id/price-submissions with corroboration and cred logic ([1f9ccaf](https://github.com/HartiganHM/concert-crawl/commit/1f9ccafdb4e960d2bed7e186655cd7fe39796d88))
* add price pipeline types and env var stubs ([6965a57](https://github.com/HartiganHM/concert-crawl/commit/6965a575e5bc167163334dad034021e7059dec63))
* add price_retrieval_log and price_submissions schema ([3d02713](https://github.com/HartiganHM/concert-crawl/commit/3d02713989357db559c05eb06cb9b451069effbd))
* add PriceDisplay component with source attribution and AXS no-price messaging ([be50ce5](https://github.com/HartiganHM/concert-crawl/commit/be50ce5815613050d854deed149e15c5b2913bde))
* add Prices link to admin navigation ([f7c4cbb](https://github.com/HartiganHM/concert-crawl/commit/f7c4cbb0e5b11682805922b47c20aedf2d2712f6))
* add priceSource to events, priceUrl to venues, priceCredScore to user_roles ([1624e9a](https://github.com/HartiganHM/concert-crawl/commit/1624e9ab826f915fb4862c9bdb8052ac646caf2d))
* add PriceSource type and priceSource to Event, add PriceSubmission type ([5b603ae](https://github.com/HartiganHM/concert-crawl/commit/5b603ae1418c628fa8d2c5ee26628baeaa850c95))
* add PriceSubmissionForm component with AXS-directed prompt and auth gate ([1c0069c](https://github.com/HartiganHM/concert-crawl/commit/1c0069cba1659119fa81178a5f9974bc982b6d9d))
* add ProfileHero component ([624c6dc](https://github.com/HartiganHM/concert-crawl/commit/624c6dce6070321868c5df4cdf576af2828b2750))
* add public landing page + invite code entry flow ([cac148c](https://github.com/HartiganHM/concert-crawl/commit/cac148cbb893535e1c5afcb16cc766bd1f333069))
* add requestLogger hono middleware to packages/logger ([a902bd3](https://github.com/HartiganHM/concert-crawl/commit/a902bd3fb8c6e2d8b98d1bcaec004c087dc2abc1))
* add sentry + pino to apps/crawler ([e4b9e72](https://github.com/HartiganHM/concert-crawl/commit/e4b9e723c850e032f87083c378ef09703069e5b6))
* add sentry error tracking to apps/web ([72943f5](https://github.com/HartiganHM/concert-crawl/commit/72943f55874a6da1e1a4a1e23e12c7994d9cd655))
* add sentry instrumentation to apps/api ([6b148c0](https://github.com/HartiganHM/concert-crawl/commit/6b148c022a55962923d752c99cbbf63b44ffa390))
* add Settings link to UserAvatar dropdown, mobile ProfileEntryAvatar in top bar ([50f174e](https://github.com/HartiganHM/concert-crawl/commit/50f174e3795c8e8abb123941eeb6dc99f00e1d47))
* add shared types package (Role, ApiResponse, domain enums) ([06c5f77](https://github.com/HartiganHM/concert-crawl/commit/06c5f77704edaa013dc53409763cc45e5853aa63))
* add smoke globalSetup with Sentry failure reporting ([4a56766](https://github.com/HartiganHM/concert-crawl/commit/4a567662236d6439e2554593981ca3393070592f))
* add SP_POLICY client validation, SPNumberField, ChipGroup components ([148c5ec](https://github.com/HartiganHM/concert-crawl/commit/148c5ec042ead603de1003446ca3585d8de57b96))
* add StatCards, robots.txt, strategy, and health columns to venues page ([ceef742](https://github.com/HartiganHM/concert-crawl/commit/ceef7429f19dab1349d9bb6798294a906d853053))
* add StatusPill, SubmissionItem, MySubmissionsList components ([6d35b88](https://github.com/HartiganHM/concert-crawl/commit/6d35b888dbb85aadefe1701e0efde6751609e188))
* add submit-price and dispute pages + E2E spec ([9d3d33b](https://github.com/HartiganHM/concert-crawl/commit/9d3d33b0acb6a08a3a6a5002fc65124576a93771))
* add theme token source of truth (THEMES + ThemeName) ([cd198e7](https://github.com/HartiganHM/concert-crawl/commit/cd198e713b9bfd8f70304903dac0da6d4b5afc5d))
* add ThemePickerInline — three-swatch row with server theme persistence ([e240656](https://github.com/HartiganHM/concert-crawl/commit/e240656fb7ee97d479a5a36e0e45c0bd2ccbc84c))
* add ThemePill to topbar and user card to sidebar ([e0a60d8](https://github.com/HartiganHM/concert-crawl/commit/e0a60d844a9f8bde9c626d87f30b050903df294c))
* add ThemeProvider context and index re-exports ([8c1ab93](https://github.com/HartiganHM/concert-crawl/commit/8c1ab938ab65392c643ff7ee82eb47b648357b6d))
* add ThemeSync component — sync server-side theme to client on /me load ([91b425a](https://github.com/HartiganHM/concert-crawl/commit/91b425a6a1d3464737371c5ef45794ac42c51173))
* add Tier, Vendor, HowFound, SP_POLICY, SubmissionListResponse to shared types ([8dc1e1e](https://github.com/HartiganHM/concert-crawl/commit/8dc1e1e6e2c22d831289335fdff4667d44a08c64))
* add typed API client for Next.js web app ([45593d6](https://github.com/HartiganHM/concert-crawl/commit/45593d6bb3d7f03119af0cd232178f8a92758d26))
* add user_profiles schema and make price_submissions.user_id nullable ([84da81e](https://github.com/HartiganHM/concert-crawl/commit/84da81e64c816d51f94753d5b54cc63a30e0a2f9))
* add UserButton for logout in admin nav ([d9f704f](https://github.com/HartiganHM/concert-crawl/commit/d9f704fa029ca9c9169d90aa82081e772f4a87ec))
* add UserProfile, UserPlan, SubmissionDisplay shared types ([5d37402](https://github.com/HartiganHM/concert-crawl/commit/5d37402237d18d7364cbc1c2643d0954a1931b50))
* add v2 price submission schema — tier/vendor/howFound enums, submission_confirms table ([4e01d58](https://github.com/HartiganHM/concert-crawl/commit/4e01d5895d78b01d8921e203c848a5faf8515d7d))
* add Venue and InviteCode types to shared package ([06edee7](https://github.com/HartiganHM/concert-crawl/commit/06edee71b19a5ed36d2dc7e0460e1fe1794d105a))
* add venue management UI with list, create, and edit pages ([a35c83d](https://github.com/HartiganHM/concert-crawl/commit/a35c83d51a0a6b66e50c2887df33d6cfb89f15ee))
* add waitlist_entries table ([88c53ed](https://github.com/HartiganHM/concert-crawl/commit/88c53ed4aac0bdd9b8f52575e9e0e1d77b66db9f))
* add web API client for /v1/users/* endpoints ([d9ad495](https://github.com/HartiganHM/concert-crawl/commit/d9ad495202358b3e478f4417e71888a41abc6e6e))
* add web UI components for price transparency v2 ([f0ad14e](https://github.com/HartiganHM/concert-crawl/commit/f0ad14eee0e7e630e459f374a9a05d0d2096b396))
* admin crawl status page — split view, inspector, run history ([dd323c7](https://github.com/HartiganHM/concert-crawl/commit/dd323c74c480ad4c036b294c20c98a64c1884e44))
* admin CSS token system — light/dark themes, isolated from consumer ([5021612](https://github.com/HartiganHM/concert-crawl/commit/5021612b1fbb326a16c840ba69cc5e7f3340afad))
* admin dashboard — greeting, stat row, health table, activity feed ([ad9c7b7](https://github.com/HartiganHM/concert-crawl/commit/ad9c7b7a9dea5e0c4a2870c99611a79602c07543))
* admin data tables — venues, prices, invite codes ([e267e3f](https://github.com/HartiganHM/concert-crawl/commit/e267e3f3e4e19fec7fb276f3d08ee8e18aff80f7))
* admin event review — filter rail, split view, keyboard nav (J/K/A/R), bulk action bar ([116fa50](https://github.com/HartiganHM/concert-crawl/commit/116fa503dc0e88950e2d82f867e8304d2a9f9c02))
* admin price routes — health, log, coverage, submissions queue, on-demand pipeline ([3726fca](https://github.com/HartiganHM/concert-crawl/commit/3726fcaceb850a9f71493952232201b8cfea9fd7))
* admin prices dashboard — health, log, coverage, submissions tabs ([6c2e57d](https://github.com/HartiganHM/concert-crawl/commit/6c2e57dd783689d201f968a492a713a285b6c215))
* admin primitives — StatCard, Panel, AdminTable, Sparkline, ConfidenceBar, SectionHead ([0e6172b](https://github.com/HartiganHM/concert-crawl/commit/0e6172b6d396aa0d8d8354f1c9c40011107c8ef5))
* admin shell — ThemeProvider, Sidebar (full/rail), AdminTopbar ([e08e47f](https://github.com/HartiganHM/concert-crawl/commit/e08e47fd5433c97eb72c22f7eeef96c4b24cca37))
* adminTable clickable rows + StatCard footer separator ([3ccbecd](https://github.com/HartiganHM/concert-crawl/commit/3ccbecd937903b741359cb071c35c567fa49b9ed))
* **api:** add eventsUpdated/llmCostUsd to crawl runs, bulk trigger endpoint ([b34cbf3](https://github.com/HartiganHM/concert-crawl/commit/b34cbf32c7952ad2d743b15c031a045176a06a47))
* **api:** add filterPrice and filterVibe to GET /v1/events ([4e999b5](https://github.com/HartiganHM/concert-crawl/commit/4e999b58dc5187b02159a12221290b891abcbdf5))
* **api:** add GET /v1/search/popular endpoint ordered by watcher count ([db5919d](https://github.com/HartiganHM/concert-crawl/commit/db5919d0816f5d024faee35e991ea7a41e911db7))
* **api:** add GET and PUT /v1/watching endpoints ([c7abadd](https://github.com/HartiganHM/concert-crawl/commit/c7abadd7da9cf586ef1949a223a020b3ea36d4da))
* **api:** add POST /v1/feedback route with auth + rate limiting ([c6807e6](https://github.com/HartiganHM/concert-crawl/commit/c6807e6e23a75f64e1eda2e82c6fe7e0f481cd2b))
* **api:** extend events search to match venue name ([57467f8](https://github.com/HartiganHM/concert-crawl/commit/57467f88c56ceb73f71646de35af9c76c9464920))
* **api:** hard delete venues, slug uniqueness, crawl health, robots-check endpoint ([97e0928](https://github.com/HartiganHM/concert-crawl/commit/97e0928490ec642f1b434aea996a623df85832c1))
* appheader active link styling, useravatar component, nav responsiveness ([fd7eed0](https://github.com/HartiganHM/concert-crawl/commit/fd7eed06c50c5194826ffb20bf0315802dbc4344))
* atomic cutover to CSS variable token system (Phase 4) ([6ba9a1a](https://github.com/HartiganHM/concert-crawl/commit/6ba9a1a27dbf76af252b776cbad82a8832ae3ec1))
* avatar (monogram disc) and ProfileEntryAvatar components ([f8b3889](https://github.com/HartiganHM/concert-crawl/commit/f8b3889f1248138165cb12469109ed206b011949))
* **brand:** add CCClusterMark SVG component ([1cab39c](https://github.com/HartiganHM/concert-crawl/commit/1cab39c6a52716493df4271ce8eb6a1206077798))
* crawl health table component + activity feed tabs ([e3d8767](https://github.com/HartiganHM/concert-crawl/commit/e3d8767728b2592c69f9708341b6eca723ba250a))
* crawl history table and shared badge types for admin venue page ([d7e33e8](https://github.com/HartiganHM/concert-crawl/commit/d7e33e8275456738b1434227d622853e6a905d7f))
* crawl trigger button component with polling and definitions pattern ([307c387](https://github.com/HartiganHM/concert-crawl/commit/307c387727223d1b4e68c7327729065175d30afd))
* **crawl:** add orchestrator, async API trigger, and crawl-run polling ([91b60e4](https://github.com/HartiganHM/concert-crawl/commit/91b60e471771feb38e785f707b53b0f00597587f))
* **crawler-core:** add genre-tagger module with classifyGenres + tagEventsWithGenres ([35f2c12](https://github.com/HartiganHM/concert-crawl/commit/35f2c12d691b1ef8180a3cbc75f9bbf956ff3609))
* **crawler-core:** add new package with extraction engine ([1d464e6](https://github.com/HartiganHM/concert-crawl/commit/1d464e617094604a5a0dc8e83531dff54308eb26))
* **crawler-core:** write llm_cost_usd and events_updated to crawl_runs ([f1630dc](https://github.com/HartiganHM/concert-crawl/commit/f1630dc9596d4177b71dcadaa0c07d7bacc47cea))
* **crawler:** wire tagEventsWithGenres after each venue crawl ([b3a0157](https://github.com/HartiganHM/concert-crawl/commit/b3a01576c13b2a8a95cb472637331643c93afc20))
* dashboard utility module + Vitest tests ([9858b45](https://github.com/HartiganHM/concert-crawl/commit/9858b454130230eb97c61f9290022c6ad2078822))
* **db:** add llm_cost_usd and events_updated columns to crawl_runs ([b2c8aba](https://github.com/HartiganHM/concert-crawl/commit/b2c8abaf4c42e624e35e9ebb0dacd1f19123b5fa))
* **db:** add unique index on events(venue_id, date, artist) for deduplication ([2ddad83](https://github.com/HartiganHM/concert-crawl/commit/2ddad8322077a2593e87429675ee7ff6c4066323))
* **db:** update feedback_category enum (idea/other) + add metadata column ([4ace2ec](https://github.com/HartiganHM/concert-crawl/commit/4ace2ece808ccfaa5f3147d5c2f630cdb56afd1e))
* **empty-state:** add View this week CTA to browse no-data state ([e2e3725](https://github.com/HartiganHM/concert-crawl/commit/e2e37257d1e84efbf2c6c1f7b81544e6a5e3b181))
* **empty-state:** implement hybrid design and add unit tests ([5a6f92f](https://github.com/HartiganHM/concert-crawl/commit/5a6f92ff5afbfe56adbe2cadc8ba158ef8c81043))
* **empty-state:** rewrite WatchingEmpty using shared EmptyState ([ed99e11](https://github.com/HartiganHM/concert-crawl/commit/ed99e11a63c582eb489830b216bdb3e8d2518027))
* **empty-state:** update copy.ts with structured empty state copy ([5b1fd88](https://github.com/HartiganHM/concert-crawl/commit/5b1fd8875a4a4d63d4923e8203d8921eba666038))
* **empty-state:** wire browse list and calendar empty states ([313d080](https://github.com/HartiganHM/concert-crawl/commit/313d080c832c0d001fe3788157c1047a7612fd46))
* **empty-state:** wire venue page empty state ([1456b30](https://github.com/HartiganHM/concert-crawl/commit/1456b303c4fe8c3e4f44e401401d378fc930239a))
* event-level sourceHash, upsert set fix, verified-event alert ([cdc3240](https://github.com/HartiganHM/concert-crawl/commit/cdc3240b49bc16cd64e2ef0c7e7bc8401536f564))
* eventimage hue-shifted gradient fallback ([2b47a99](https://github.com/HartiganHM/concert-crawl/commit/2b47a99c9f739272fce5e5027415ad7917b596c8))
* expand seed to include sample events and price retrieval log data ([2e84913](https://github.com/HartiganHM/concert-crawl/commit/2e84913a2f8fc677cb6a381efce69c77937cb648))
* expose priceSource in public event responses ([63dc309](https://github.com/HartiganHM/concert-crawl/commit/63dc30921cfd4e062781ac8f4734ebc289647cf9))
* filterbar cursor-pointer, hide toggle on mobile, horizontal chip scroll ([5141f3f](https://github.com/HartiganHM/concert-crawl/commit/5141f3fe7b2cecea0e6ff68fdf68d3423b6f2973))
* gate crawler workflows on CRAWL_ENABLED environment variable ([f24d98a](https://github.com/HartiganHM/concert-crawl/commit/f24d98a228ca21952f4dcf8c0811b36baa824b8b))
* getArtistGradientStyle helper with tests ([4cdce1f](https://github.com/HartiganHM/concert-crawl/commit/4cdce1fafa776ea05b2863d8d1b3a84435ab47b4))
* implement crawler daily runner — batch all active venues, max 3 concurrent ([80b3f26](https://github.com/HartiganHM/concert-crawl/commit/80b3f26b637450d261533b5dc4c7a9c4c9ddded0))
* landing page two-column desktop layout, CTA reorder, move GigPosterStack ([dec0bcd](https://github.com/HartiganHM/concert-crawl/commit/dec0bcd483d7505363d4ccb37064e7617d903050))
* migration — add page_hash to crawl_runs, drop raw_html from events ([b21ca36](https://github.com/HartiganHM/concert-crawl/commit/b21ca36b1bc9b7e60d161e7d4c907ea345e1ce3f))
* move PriceDisplay out of info block to match design spec ([53b2501](https://github.com/HartiganHM/concert-crawl/commit/53b25011ffe4588af1deb7cf86d5f94e1ab3bac8))
* phase 5 consumer calendar UI — browse, event detail, venue profile ([6088dd7](https://github.com/HartiganHM/concert-crawl/commit/6088dd7c31fa0401a7d80e24e520f069ec64b6c8))
* phase 5b-1 consumer UI design polish ([454c0da](https://github.com/HartiganHM/concert-crawl/commit/454c0dafeb5729a632743e851ee23e22ec754b35))
* phase 5b-2 filter redesign — chips, sheet, popover, week strip ([9743425](https://github.com/HartiganHM/concert-crawl/commit/9743425d6bb05e0ccaa279168704bb543515cd8f))
* price pipeline orchestrator — runPricePipeline with 6 tiers and retrieval logging ([0e9b9a4](https://github.com/HartiganHM/concert-crawl/commit/0e9b9a4d84f92a5ed394dfea375d86047e74d938))
* price pipeline tier 1 — venue structured data (JSON-LD) ([b8113df](https://github.com/HartiganHM/concert-crawl/commit/b8113dff397f32b2e8f8f6c910fd87772b34a663))
* price pipeline tier 2 — Ticketmaster Discovery API ([4f77115](https://github.com/HartiganHM/concert-crawl/commit/4f771156baeb6936068ca1170fa77c61c3a6da89))
* price pipeline tier 3 — Eventbrite + Dice.fm (parallel) ([3ad7550](https://github.com/HartiganHM/concert-crawl/commit/3ad7550cb40fa8c20c37f44065b18f900fc50264))
* price pipeline tier 4 — Songkick + Bandsintown (parallel) ([7501330](https://github.com/HartiganHM/concert-crawl/commit/7501330cdbc8f8354ffb495e7109a6f4ea968cb2))
* price pipeline tier 5 — SeatGeek (resale) ([aedc2d3](https://github.com/HartiganHM/concert-crawl/commit/aedc2d359df0804acebb3a744b08837e897aade3))
* price pipeline tier 6 — community corroborated median ([15986fb](https://github.com/HartiganHM/concert-crawl/commit/15986fb725ede2a5494fbfe06d976f5519437fd0))
* redesign prices page with event price table and coverage stats ([aa7d06e](https://github.com/HartiganHM/concert-crawl/commit/aa7d06ecde8571cb7d788e8874e99d1087369701))
* register waitlist and auth routes ([1014db0](https://github.com/HartiganHM/concert-crawl/commit/1014db0f5d38596df240de0746b984919067e208))
* replace gradient fallback in EventImage with IdentityArt ([5422a6d](https://github.com/HartiganHM/concert-crawl/commit/5422a6dcfb5880b701fc4324e7879d9d7208c314))
* replace hono/logger with pino requestLogger in apps/api ([2c6b0ac](https://github.com/HartiganHM/concert-crawl/commit/2c6b0ac6c46ce284c9198e4ab40c3ab3ed382daf))
* replace venue detail gradient placeholder with IdentityArt ([9f9dfd5](https://github.com/HartiganHM/concert-crawl/commit/9f9dfd5ca9f31a98923e5d9ab6b0dbcb0a3ea837))
* scaffold apps/e2e package with Playwright and Sentry deps ([1147126](https://github.com/HartiganHM/concert-crawl/commit/11471267fe80e60ff11ffaed27c68c2f8da0ee80))
* scaffold Next.js web app with Clerk and Tailwind ([3aa3a99](https://github.com/HartiganHM/concert-crawl/commit/3aa3a99b3c71414a4c08dfb58904fd26081b65a2))
* scaffold packages/logger with createLogger ([352b9be](https://github.com/HartiganHM/concert-crawl/commit/352b9be70258d816ff0128623198b120bf57e5fd))
* scaffold packages/logger workspace package ([439c7fa](https://github.com/HartiganHM/concert-crawl/commit/439c7fa489f2297ad701ef77417ce00d824c39d2))
* send Resend email alert when venue hits 3 consecutive crawl failures ([23c98eb](https://github.com/HartiganHM/concert-crawl/commit/23c98ebbb73e1f5308d6c0f3d6b65245ccf5f89e))
* settings constants and copy ([8348d65](https://github.com/HartiganHM/concert-crawl/commit/8348d65dcdab3f16121f0f36d12d0f38f77cd1ea))
* settings route mobile hub composing all settings sections ([30ba518](https://github.com/HartiganHM/concert-crawl/commit/30ba518c9f2ba7c0696ba691215f2c57ab87e1e7))
* simplify AdminTopbar — breadcrumb only, remove theme selector and Clerk UserButton ([c26048c](https://github.com/HartiganHM/concert-crawl/commit/c26048c043eb60b4936ee2a010ab5e8436cd04ee))
* skip crawl when page hash unchanged ([0bab487](https://github.com/HartiganHM/concert-crawl/commit/0bab4873241c9348e045d5636784a8f6397d6227))
* **types:** add WatchingShow + WatchToggleResponse ([c8b9869](https://github.com/HartiganHM/concert-crawl/commit/c8b98693bf224cb4a26c31655c50ac76795a037b))
* update EventImage call sites — identityScale, drop fallbackInitial ([5683459](https://github.com/HartiganHM/concert-crawl/commit/56834591dfec4ff9734cb978291a9803c3b43108))
* update price transparency UI to match design handoff ([34f3299](https://github.com/HartiganHM/concert-crawl/commit/34f3299bf21528e8a60290dd915d9e3f2f38067c))
* update price-submissions route — enum body, 409/429 guards, enriched GET response ([ea48bc5](https://github.com/HartiganHM/concert-crawl/commit/ea48bc51b1e75f8aa1ff7426ee0c5165146e19f5))
* user avatar component with clerk initials ([41d47e3](https://github.com/HartiganHM/concert-crawl/commit/41d47e3bbe7a86c8e4995f338e36348774b0fe2c))
* user card → sign-out popover in AdminSidebar ([9db541c](https://github.com/HartiganHM/concert-crawl/commit/9db541c117025993236be0484b6cbd27634c20f8))
* **web:** add /api/admin/robots-check route handler ([ea339f9](https://github.com/HartiganHM/concert-crawl/commit/ea339f91cb8c857130e25f8b020193bf1a284f88))
* **web:** add /watching page route ([2f25059](https://github.com/HartiganHM/concert-crawl/commit/2f25059969370903bd443bc945887e762c1618bf))
* **web:** add FeedbackModal — all states, mobile sheet + desktop card ([bcd17ec](https://github.com/HartiganHM/concert-crawl/commit/bcd17ec68a64f10199c19d9004ccd3f21c1b64cc))
* **web:** add search empty state copy keys ([a6bcab9](https://github.com/HartiganHM/concert-crawl/commit/a6bcab926580187034c40b639c1768bfefd65b07))
* **web:** add useSearch hook with debounce, localStorage, and navigation ([1db2d4a](https://github.com/HartiganHM/concert-crawl/commit/1db2d4a2c4303ad3355010098a7a9f17d2dc530d))
* **web:** add venue modal + venue details redesign ([f4ce447](https://github.com/HartiganHM/concert-crawl/commit/f4ce44782aba2981cda95ec46ce47cc342ac0e10))
* **web:** add WatchButton component + wire into EventCard ([de1b030](https://github.com/HartiganHM/concert-crawl/commit/de1b03004bb2d293a367e923ab020a33d73e0372))
* **web:** add Watching surface components (item, empty, route mobile+desktop) ([422e9e9](https://github.com/HartiganHM/concert-crawl/commit/422e9e9f68c2a1e2f255bc457e374bda87922f3e))
* **web:** build mobile search page components ([c1a790f](https://github.com/HartiganHM/concert-crawl/commit/c1a790f8d021a767fe69c93244dc9177864aa6a2))
* **web:** build SearchPalette desktop command palette ([44866e1](https://github.com/HartiganHM/concert-crawl/commit/44866e1cdd191719aaf28d25187508df8da97fbd))
* **web:** crawl UI polish + run-all button + cost/events breakdown ([76abbff](https://github.com/HartiganHM/concert-crawl/commit/76abbff661c1cebc739489305ff0240a6325d64f))
* **web:** forward filterPrice and filterVibe params to events API ([ed6dc2b](https://github.com/HartiganHM/concert-crawl/commit/ed6dc2b16ab856ce4d23c880f3479153d1bb9f4b))
* **web:** implement FeedbackPill floating entry point ([0fbfdd4](https://github.com/HartiganHM/concert-crawl/commit/0fbfdd4bae35838225f780895891fb3b466f07a5))
* **web:** inject version from root package.json instead of hardcoded string ([bbd2b74](https://github.com/HartiganHM/concert-crawl/commit/bbd2b745d7ab0d29c41545de6e7c616e684078f0))
* **web:** render FeedbackPill in consumer layout ([b1b3b6c](https://github.com/HartiganHM/concert-crawl/commit/b1b3b6c43df3f7dacdea705fc5d14ae91212ad00))
* **web:** replace UserAvatar dropdown with full UserMenu ([0e69fd3](https://github.com/HartiganHM/concert-crawl/commit/0e69fd364551e841eea98216ff67fa433e0de7a2))
* **web:** user menu component — identity card, theme switcher, admin section, beta channel ([99b6040](https://github.com/HartiganHM/concert-crawl/commit/99b6040b9ab25af67a346bc1132c620249c3a826))
* **web:** wire /search page ([b3d8519](https://github.com/HartiganHM/concert-crawl/commit/b3d85192c71a63af4b63b5c1a6f52444288b510a))
* **web:** wire SearchPalette into AppHeader with ⌘K shortcut ([73667ff](https://github.com/HartiganHM/concert-crawl/commit/73667ff8a9be790883f6b4c7c0ed2068e86815bb))
* **web:** wire Watching tab in BottomNav + AppHeader ([37c2c77](https://github.com/HartiganHM/concert-crawl/commit/37c2c77574fc3884fcb1dc655d785b69e2c77059))
* wire dashboard — events fetch, stat card hints, Server Action for run-all ([29ba8a1](https://github.com/HartiganHM/concert-crawl/commit/29ba8a117375caebef6e118715392b0c085c5796))
* wire PriceDisplay + PriceSubmissionForm into event detail; price source badge on EventCard ([a63b2c9](https://github.com/HartiganHM/concert-crawl/commit/a63b2c9c5bd130f9de20cf4cd9aecf2b89aef7c4))
* wire PriceSection + submit CTA into event detail page ([1787d08](https://github.com/HartiganHM/concert-crawl/commit/1787d08554aa1b07e15f55a442dae0e7e4897dab))
