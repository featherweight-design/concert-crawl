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
