# [1.274.0](https://github.com/HartiganHM/concert-crawl/compare/v1.273.0...v1.274.0) (2026-08-29)


### Features

* **admin:** default the artist queue to acts with a show still to come ([#1637](https://github.com/HartiganHM/concert-crawl/issues/1637)) ([f3826bf](https://github.com/HartiganHM/concert-crawl/commit/f3826bf00ad8b72754f9f788562eb847864f4506)), closes [#1203](https://github.com/HartiganHM/concert-crawl/issues/1203)

# [1.273.0](https://github.com/HartiganHM/concert-crawl/compare/v1.272.0...v1.273.0) (2026-08-29)


### Features

* **db:** repair artist display names the event billing contradicts ([#1636](https://github.com/HartiganHM/concert-crawl/issues/1636)) ([476b376](https://github.com/HartiganHM/concert-crawl/commit/476b3763d149779b81544ca8c309ffe74611bd65))

# [1.272.0](https://github.com/HartiganHM/concert-crawl/compare/v1.271.0...v1.272.0) (2026-08-29)


### Features

* **artists:** bounded re-check for ambiguous match rows ([#1634](https://github.com/HartiganHM/concert-crawl/issues/1634)) ([520a739](https://github.com/HartiganHM/concert-crawl/commit/520a73904ab7f1176a322819f7436f49af5e1475))
* **web:** a stale price stamp has a way out ([#1635](https://github.com/HartiganHM/concert-crawl/issues/1635)) ([daa77d8](https://github.com/HartiganHM/concert-crawl/commit/daa77d865126ab3ab94b005ca0fe058ddc2d7a9b))

# [1.271.0](https://github.com/HartiganHM/concert-crawl/compare/v1.270.0...v1.271.0) (2026-08-29)


### Features

* **api:** report a price still on sale ([#1633](https://github.com/HartiganHM/concert-crawl/issues/1633)) ([16f5d56](https://github.com/HartiganHM/concert-crawl/commit/16f5d567feedfd3b3cde86106d7e96f69f8288cc))

# [1.270.0](https://github.com/HartiganHM/concert-crawl/compare/v1.269.1...v1.270.0) (2026-08-29)


### Features

* **artists:** terminal exhausted state for the match queue ([#1632](https://github.com/HartiganHM/concert-crawl/issues/1632)) ([509452c](https://github.com/HartiganHM/concert-crawl/commit/509452c57e9a3c62fe7ee535209d482d170700b3))

## [1.269.1](https://github.com/HartiganHM/concert-crawl/compare/v1.269.0...v1.269.1) (2026-08-24)


### Bug Fixes

* **web:** blank sign-in page and service-worker beta-gate bypass ([#1629](https://github.com/HartiganHM/concert-crawl/issues/1629)) ([5e55f06](https://github.com/HartiganHM/concert-crawl/commit/5e55f06fd845fa02d65917022db2f3eff632b378))

# [1.269.0](https://github.com/HartiganHM/concert-crawl/compare/v1.268.0...v1.269.0) (2026-08-22)


### Features

* **price:** show pending prices on event rows, marked unconfirmed ([#1627](https://github.com/HartiganHM/concert-crawl/issues/1627)) ([d2effdb](https://github.com/HartiganHM/concert-crawl/commit/d2effdba3f3d65a40a96db4eac787fb7177f0cc1))

# [1.268.0](https://github.com/HartiganHM/concert-crawl/compare/v1.267.2...v1.268.0) (2026-08-22)


### Features

* **admin:** surface non-concert classification in the events list ([#1626](https://github.com/HartiganHM/concert-crawl/issues/1626)) ([0030579](https://github.com/HartiganHM/concert-crawl/commit/00305794ed2ddf8a8f4064a20ed6abd682db8930))

## [1.267.2](https://github.com/HartiganHM/concert-crawl/compare/v1.267.1...v1.267.2) (2026-08-22)


### Bug Fixes

* **settings:** link Terms and Privacy from Settings ▸ Account ([#1624](https://github.com/HartiganHM/concert-crawl/issues/1624)) ([2254efd](https://github.com/HartiganHM/concert-crawl/commit/2254efd046e2c40ecfa7394014504d7472e9e8c1)), closes [#1618](https://github.com/HartiganHM/concert-crawl/issues/1618) [#1618](https://github.com/HartiganHM/concert-crawl/issues/1618)

## [1.267.1](https://github.com/HartiganHM/concert-crawl/compare/v1.267.0...v1.267.1) (2026-08-22)


### Bug Fixes

* **artists:** quote the cheapest tier on the artist page, not the price scalar ([#1625](https://github.com/HartiganHM/concert-crawl/issues/1625)) ([5b23a5a](https://github.com/HartiganHM/concert-crawl/commit/5b23a5a1cc457d418ec37b01bd5d8e7bc6ffe706))

# [1.267.0](https://github.com/HartiganHM/concert-crawl/compare/v1.266.0...v1.267.0) (2026-08-20)


### Features

* **billing:** seed the card-less 14-day Premium trial ([#1614](https://github.com/HartiganHM/concert-crawl/issues/1614)) ([22b2cf6](https://github.com/HartiganHM/concert-crawl/commit/22b2cf6cb4401406b41d6ab8681dd8a7d34ce611))

# [1.266.0](https://github.com/HartiganHM/concert-crawl/compare/v1.265.5...v1.266.0) (2026-08-20)


### Bug Fixes

* **crawler:** salvage complete events ahead of a corrupt LLM payload tail ([#1616](https://github.com/HartiganHM/concert-crawl/issues/1616)) ([fba409c](https://github.com/HartiganHM/concert-crawl/commit/fba409c8daddfc9f431d73dce363e4315dc71a94))


### Features

* **admin:** split Review prices tab into Price coverage and Submissions ([#1612](https://github.com/HartiganHM/concert-crawl/issues/1612)) ([43325ae](https://github.com/HartiganHM/concert-crawl/commit/43325aea52ff64b5c44588f38a6798cc828589fe))

## [1.265.5](https://github.com/HartiganHM/concert-crawl/compare/v1.265.4...v1.265.5) (2026-08-20)


### Bug Fixes

* **email:** stop non-production environments sending to real users ([#1613](https://github.com/HartiganHM/concert-crawl/issues/1613)) ([335c437](https://github.com/HartiganHM/concert-crawl/commit/335c4376e0d599ef31c10fdb66d11cae6598d489))
* **scripts:** dry runs report the number the apply decision turns on ([#1608](https://github.com/HartiganHM/concert-crawl/issues/1608)) ([ee91dcd](https://github.com/HartiganHM/concert-crawl/commit/ee91dcdbefb6391a13d268e7a371c6e6782132d0))

## [1.265.4](https://github.com/HartiganHM/concert-crawl/compare/v1.265.3...v1.265.4) (2026-08-20)


### Bug Fixes

* **web:** stop the passport theme test flaking and align price-filter copy ([58cf405](https://github.com/HartiganHM/concert-crawl/commit/58cf4055da782ece9f69d1462835dd1904ae9f33))

## [1.265.3](https://github.com/HartiganHM/concert-crawl/compare/v1.265.2...v1.265.3) (2026-08-20)


### Bug Fixes

* **api:** expose Retry-After so the export countdown reads the real wait ([#1606](https://github.com/HartiganHM/concert-crawl/issues/1606)) ([706feea](https://github.com/HartiganHM/concert-crawl/commit/706feea027eb7a62c0fc7c19774d7fd5f1b13704))

## [1.265.2](https://github.com/HartiganHM/concert-crawl/compare/v1.265.1...v1.265.2) (2026-08-20)


### Bug Fixes

* **pwa:** stop the install-slot quiet-window test expiring ([#1609](https://github.com/HartiganHM/concert-crawl/issues/1609)) ([c0ee8f9](https://github.com/HartiganHM/concert-crawl/commit/c0ee8f947ea81ae8c55418ddc8c21da069602ad7))

## [1.265.1](https://github.com/HartiganHM/concert-crawl/compare/v1.265.0...v1.265.1) (2026-08-16)


### Bug Fixes

* **following:** link browse shelf cards to the show, not the artist page ([#1604](https://github.com/HartiganHM/concert-crawl/issues/1604)) ([3f7385e](https://github.com/HartiganHM/concert-crawl/commit/3f7385e9f0777f62c2c199bc73583ed75450a305))

# [1.265.0](https://github.com/HartiganHM/concert-crawl/compare/v1.264.0...v1.265.0) (2026-08-15)


### Features

* **artists:** not_an_artist tombstone + one searchable admin table ([#1603](https://github.com/HartiganHM/concert-crawl/issues/1603)) ([31a5e82](https://github.com/HartiganHM/concert-crawl/commit/31a5e82835ffb0cf69494cf2d48b55a790789bf1))

# [1.264.0](https://github.com/HartiganHM/concert-crawl/compare/v1.263.0...v1.264.0) (2026-08-15)


### Bug Fixes

* **web:** the artist page says one word for an absent price ([da86c41](https://github.com/HartiganHM/concert-crawl/commit/da86c4108cb3daa0382116262454af0ed98e0af4))


### Features

* **web:** the row reserves its own height, and the artist page joins it ([f4946ec](https://github.com/HartiganHM/concert-crawl/commit/f4946ecec53cef5d688c36eb24fbd2c14eec1fdf)), closes [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418)

# [1.263.0](https://github.com/HartiganHM/concert-crawl/compare/v1.262.0...v1.263.0) (2026-08-15)


### Features

* **artists:** one-off event artist re-derivation pass ([#1601](https://github.com/HartiganHM/concert-crawl/issues/1601)) ([109a78b](https://github.com/HartiganHM/concert-crawl/commit/109a78bde563c335fdc050fe9e7137a09f174280))

# [1.262.0](https://github.com/HartiganHM/concert-crawl/compare/v1.261.0...v1.262.0) (2026-08-15)


### Bug Fixes

* **artists:** keep the raw spelling of a solo derived headliner ([c0816e9](https://github.com/HartiganHM/concert-crawl/commit/c0816e91c2c53761cf3184186452c6739061cf2e))
* **crawler:** compare derived bills element-wise, not by joined string ([282b30d](https://github.com/HartiganHM/concert-crawl/commit/282b30d6d8fae98972679abe72f04a0d3f7912b8))
* **crawler:** dedupe adjudicated names so a display chip cannot double ([94b74e3](https://github.com/HartiganHM/concert-crawl/commit/94b74e3d4f65ad7581f01379f1d1a0b86b4586f9))
* **crawler:** drop blank names from the adjudicator's verdict ([7d50b13](https://github.com/HartiganHM/concert-crawl/commit/7d50b13dfe22c4ce70225bb3341921fffcd39d63))
* **crawler:** genre-tag the derived bill, not the event display string ([ab58ff2](https://github.com/HartiganHM/concert-crawl/commit/ab58ff294796a1a8d1088529d6a6fe457d034db4))
* **crawler:** keep an empty headliner set empty across a re-crawl ([a39eed1](https://github.com/HartiganHM/concert-crawl/commit/a39eed14fab2d937e7af5d3cdb1a1ab01786dff5))
* **crawler:** keep observed openers the adjudicator never got to read ([bb747bc](https://github.com/HartiganHM/concert-crawl/commit/bb747bc1efc4293ec2205b38c3f5d8ecd4c64998))
* **crawler:** let a newly observed performer retire a stored LLM verdict ([af58ee0](https://github.com/HartiganHM/concert-crawl/commit/af58ee0e22cb58558fda308b26b1ae03783db148))
* **crawler:** re-merge observed openers when reusing a stored verdict ([773011d](https://github.com/HartiganHM/concert-crawl/commit/773011de17b7ac0d5a26a881742baa8e2c2fa0e1))
* **crawler:** stop an adjudicator outage erasing a stored bill, and cap its cost ([373728d](https://github.com/HartiganHM/concert-crawl/commit/373728d65cf00d0a8436d687a4343873ac39b346))
* **crawler:** stop an empty headliners array blanking the genre artist ([003e8a1](https://github.com/HartiganHM/concert-crawl/commit/003e8a1c54a2bc10bfe229494b5ea785f7b74e94))
* **crawler:** stop the upsert collapsing a derived bill back to the display title ([befc5af](https://github.com/HartiganHM/concert-crawl/commit/befc5af905ab173ead8cd6c180e8f2bfc59fd0d7))
* **crawler:** translate the shared artist rules for the adjudicator's schema ([093fe79](https://github.com/HartiganHM/concert-crawl/commit/093fe791021c7e5d498765ef9c3ed6b54c56d2aa))
* **spotify:** match derived headliners in the weekly digest ([e634058](https://github.com/HartiganHM/concert-crawl/commit/e634058fef4f23f64f088599f6bb9f8dd24ac4f2))


### Features

* **artists:** seed the projection from the derived headliner set ([0202066](https://github.com/HartiganHM/concert-crawl/commit/0202066035a1e795f4c984c164239de0630444fc))
* **crawler:** add the artist derivation precedence ladder ([925da20](https://github.com/HartiganHM/concert-crawl/commit/925da208699625785bd05936d12beef4edc62b8e))

# [1.261.0](https://github.com/HartiganHM/concert-crawl/compare/v1.260.0...v1.261.0) (2026-08-15)


### Features

* **event-row:** the genre pair, ordered by the active Vibe filter ([73c91c1](https://github.com/HartiganHM/concert-crawl/commit/73c91c1b49e2b492d80a8d49e41e88cb93659617))

# [1.260.0](https://github.com/HartiganHM/concert-crawl/compare/v1.259.0...v1.260.0) (2026-08-15)


### Features

* **event-row:** resolve lifecycle and price state as one precedence ([a47fa43](https://github.com/HartiganHM/concert-crawl/commit/a47fa43f0308cf24ec393092d4c164058760946f))
* **event-row:** the row gets its own title line ([7de83f5](https://github.com/HartiganHM/concert-crawl/commit/7de83f5e563b6c7f780644e0840c556796bd8b37))

# [1.259.0](https://github.com/HartiganHM/concert-crawl/compare/v1.258.0...v1.259.0) (2026-08-15)


### Features

* **settings:** download your data ([#1573](https://github.com/HartiganHM/concert-crawl/issues/1573)) ([#1597](https://github.com/HartiganHM/concert-crawl/issues/1597)) ([9eabf38](https://github.com/HartiganHM/concert-crawl/commit/9eabf38ddd0b67f356305560ab45b1d628c9ccaf))

# [1.258.0](https://github.com/HartiganHM/concert-crawl/compare/v1.257.0...v1.258.0) (2026-08-15)


### Features

* **settings:** in-app switch for product email ([#1572](https://github.com/HartiganHM/concert-crawl/issues/1572)) ([#1596](https://github.com/HartiganHM/concert-crawl/issues/1596)) ([2dd6a42](https://github.com/HartiganHM/concert-crawl/commit/2dd6a42989fb870e7897b77ba27f07d98179cc1c))

# [1.257.0](https://github.com/HartiganHM/concert-crawl/compare/v1.256.0...v1.257.0) (2026-08-15)


### Features

* **imagery:** the follow shelf at 3:4, the taste pick as a fill region ([#1593](https://github.com/HartiganHM/concert-crawl/issues/1593)) ([28ed9f7](https://github.com/HartiganHM/concert-crawl/commit/28ed9f76af0eeb03a38a7f55c1b08f4331743cf1)), closes [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525) [#763](https://github.com/HartiganHM/concert-crawl/issues/763)

# [1.256.0](https://github.com/HartiganHM/concert-crawl/compare/v1.255.0...v1.256.0) (2026-08-15)


### Features

* **imagery:** the artist page hero becomes a band ([#1591](https://github.com/HartiganHM/concert-crawl/issues/1591)) ([0b6972f](https://github.com/HartiganHM/concert-crawl/commit/0b6972f9a8abfe5a68bf69cee847f2d989194a89))

# [1.255.0](https://github.com/HartiganHM/concert-crawl/compare/v1.254.0...v1.255.0) (2026-08-15)


### Features

* **imagery:** the event detail hero becomes a band ([#1590](https://github.com/HartiganHM/concert-crawl/issues/1590)) ([29f93b3](https://github.com/HartiganHM/concert-crawl/commit/29f93b3f9b106fcfc6c5c3890b47c5249eb4b48b)), closes [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)

# [1.254.0](https://github.com/HartiganHM/concert-crawl/compare/v1.253.1...v1.254.0) (2026-08-15)


### Features

* **imagery:** the browse hero card becomes a band ([#1589](https://github.com/HartiganHM/concert-crawl/issues/1589)) ([2166b5b](https://github.com/HartiganHM/concert-crawl/commit/2166b5b6361d5ef811095c57369302e1f5a1dde9)), closes [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)

## [1.253.1](https://github.com/HartiganHM/concert-crawl/compare/v1.253.0...v1.253.1) (2026-08-15)


### Bug Fixes

* **design:** move the SpotifyLogo note out of the return's JSX position ([880d26f](https://github.com/HartiganHM/concert-crawl/commit/880d26f2acdf0173fb3f8b9084ee86054903d40a))

# [1.253.0](https://github.com/HartiganHM/concert-crawl/compare/v1.252.1...v1.253.0) (2026-08-15)


### Features

* **imagery:** one image slot for every small artwork ([#1588](https://github.com/HartiganHM/concert-crawl/issues/1588)) ([2fa3150](https://github.com/HartiganHM/concert-crawl/commit/2fa3150bd864ec6e6f9a51cb6400be67c81c4321)), closes [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)

## [1.252.1](https://github.com/HartiganHM/concert-crawl/compare/v1.252.0...v1.252.1) (2026-08-15)


### Bug Fixes

* **admin:** one crawl status component across every admin surface ([#1586](https://github.com/HartiganHM/concert-crawl/issues/1586)) ([4cb7cd9](https://github.com/HartiganHM/concert-crawl/commit/4cb7cd905c8b5516a066bed05230ad0a5f3ddf8d))

# [1.252.0](https://github.com/HartiganHM/concert-crawl/compare/v1.251.1...v1.252.0) (2026-08-15)


### Features

* **imagery:** retire the monogram chip and drop mesh at hero ([#1585](https://github.com/HartiganHM/concert-crawl/issues/1585)) ([f129ee5](https://github.com/HartiganHM/concert-crawl/commit/f129ee5f34b2a6ccee0c9bc473a4acf063e646ce))

## [1.251.1](https://github.com/HartiganHM/concert-crawl/compare/v1.251.0...v1.251.1) (2026-08-15)


### Bug Fixes

* **crawler:** let change detection see script-embedded event payloads ([#1580](https://github.com/HartiganHM/concert-crawl/issues/1580)) ([e0f1274](https://github.com/HartiganHM/concert-crawl/commit/e0f12742a9255542028aab27665668ea1b24c372))

# [1.251.0](https://github.com/HartiganHM/concert-crawl/compare/v1.250.1...v1.251.0) (2026-08-15)


### Features

* **imagery:** feed the headliner portrait to every event surface ([#1581](https://github.com/HartiganHM/concert-crawl/issues/1581)) ([92657df](https://github.com/HartiganHM/concert-crawl/commit/92657df81ca6003dca04bc201b702cc1c3af80c9)), closes [#1536](https://github.com/HartiganHM/concert-crawl/issues/1536) [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)

## [1.250.1](https://github.com/HartiganHM/concert-crawl/compare/v1.250.0...v1.250.1) (2026-08-15)


### Bug Fixes

* **admin:** shorten the venue expected chip and move detail into a tip ([#1578](https://github.com/HartiganHM/concert-crawl/issues/1578)) ([4032028](https://github.com/HartiganHM/concert-crawl/commit/40320286b08429e1943154afe9ef11df7a0958ed))

# [1.250.0](https://github.com/HartiganHM/concert-crawl/compare/v1.249.0...v1.250.0) (2026-08-14)


### Features

* **admin:** show an acknowledged fault on the venue detail page ([#1575](https://github.com/HartiganHM/concert-crawl/issues/1575)) ([5084e0b](https://github.com/HartiganHM/concert-crawl/commit/5084e0b73089c2ff55aa32bc33a7d36e43eedab9))

# [1.249.0](https://github.com/HartiganHM/concert-crawl/compare/v1.248.0...v1.249.0) (2026-08-14)


### Features

* **artists:** break ambiguous artist ties with MusicBrainz ([#1564](https://github.com/HartiganHM/concert-crawl/issues/1564)) ([25f1d1f](https://github.com/HartiganHM/concert-crawl/commit/25f1d1fb64df4f3d9695d7028c365f3a2ca04189))

# [1.248.0](https://github.com/HartiganHM/concert-crawl/compare/v1.247.0...v1.248.0) (2026-08-14)


### Features

* **admin:** show acknowledged faults as an expected strip in triage ([#1571](https://github.com/HartiganHM/concert-crawl/issues/1571)) ([b49e012](https://github.com/HartiganHM/concert-crawl/commit/b49e012be0bb5cac9817b4cafc7488565ee74ed7))

# [1.247.0](https://github.com/HartiganHM/concert-crawl/compare/v1.246.0...v1.247.0) (2026-08-14)


### Features

* **admin:** acknowledge a fault from the crawl inspector ([#1567](https://github.com/HartiganHM/concert-crawl/issues/1567)) ([37b4bd4](https://github.com/HartiganHM/concert-crawl/commit/37b4bd43996e8b4395e0552ec0b1c002aae9a21d))

# [1.246.0](https://github.com/HartiganHM/concert-crawl/compare/v1.245.0...v1.246.0) (2026-08-14)


### Features

* **api:** one-click unsubscribe for product emails ([#967](https://github.com/HartiganHM/concert-crawl/issues/967)) ([#1568](https://github.com/HartiganHM/concert-crawl/issues/1568)) ([5c2cef7](https://github.com/HartiganHM/concert-crawl/commit/5c2cef7b2b87f1770157a1de06626b35ca8b34c5))

# [1.245.0](https://github.com/HartiganHM/concert-crawl/compare/v1.244.0...v1.245.0) (2026-08-14)


### Bug Fixes

* **api:** export the event id and guard an empty user id ([e1c3f06](https://github.com/HartiganHM/concert-crawl/commit/e1c3f06f2f0b7a2718c32f41ae4ecdfef983e3ac))
* **api:** give the export a deterministic row order ([7b3518c](https://github.com/HartiganHM/concert-crawl/commit/7b3518c87d643e80dcb5a983accb027d64a27f8d))
* **api:** mount Clerk auth, no-store the export, and join watched shows ([c642ef4](https://github.com/HartiganHM/concert-crawl/commit/c642ef4cf73defffa1b6c9988dd55b5efe6d20ac)), closes [#527](https://github.com/HartiganHM/concert-crawl/issues/527)
* **api:** tie-break both export joins and widen the watching assertion ([2982590](https://github.com/HartiganHM/concert-crawl/commit/298259068d204fb77139e90cfebe65d6766dee81))


### Features

* **api:** add GDPR user data export endpoint ([c565856](https://github.com/HartiganHM/concert-crawl/commit/c5658563e49cc38b564141cdf36315e8ffc31e72)), closes [#527](https://github.com/HartiganHM/concert-crawl/issues/527)

# [1.244.0](https://github.com/HartiganHM/concert-crawl/compare/v1.243.1...v1.244.0) (2026-08-14)


### Features

* **triage:** acknowledge a fault against the evidence that raised it ([#1565](https://github.com/HartiganHM/concert-crawl/issues/1565)) ([0da8247](https://github.com/HartiganHM/concert-crawl/commit/0da8247dd50eb0729399baff147ccb8f1cbeaf4f))

## [1.243.1](https://github.com/HartiganHM/concert-crawl/compare/v1.243.0...v1.243.1) (2026-08-14)


### Bug Fixes

* **api:** delete every user-owned table on account deletion ([#1561](https://github.com/HartiganHM/concert-crawl/issues/1561)) ([548d7c6](https://github.com/HartiganHM/concert-crawl/commit/548d7c6deff1590efa4ab75d810aacc3fbbf2e1b)), closes [#907](https://github.com/HartiganHM/concert-crawl/issues/907)

# [1.243.0](https://github.com/HartiganHM/concert-crawl/compare/v1.242.2...v1.243.0) (2026-08-14)


### Features

* **triage:** fault acknowledgements table and the ack matcher ([#1563](https://github.com/HartiganHM/concert-crawl/issues/1563)) ([8ba1972](https://github.com/HartiganHM/concert-crawl/commit/8ba19721c82812dcdbc49a5f8052d9d6e52f2054))

## [1.242.2](https://github.com/HartiganHM/concert-crawl/compare/v1.242.1...v1.242.2) (2026-08-14)


### Bug Fixes

* **artists:** never reap an act billed in a live show's title ([#1562](https://github.com/HartiganHM/concert-crawl/issues/1562)) ([277c264](https://github.com/HartiganHM/concert-crawl/commit/277c26432f0a2bb12e41fe9774749d5cf210a0ce))

## [1.242.1](https://github.com/HartiganHM/concert-crawl/compare/v1.242.0...v1.242.1) (2026-08-14)


### Bug Fixes

* **events:** carry watch state on the related panel ([#1560](https://github.com/HartiganHM/concert-crawl/issues/1560)) ([85b447f](https://github.com/HartiganHM/concert-crawl/commit/85b447fd6d290e0d8fef42f64b4b0918a2c77589))

# [1.242.0](https://github.com/HartiganHM/concert-crawl/compare/v1.241.9...v1.242.0) (2026-08-14)


### Features

* **db:** user-data registry + coverage test (Gate A tasks 1-2) ([#1558](https://github.com/HartiganHM/concert-crawl/issues/1558)) ([ec760d0](https://github.com/HartiganHM/concert-crawl/commit/ec760d01be03433b124f4cf8ceb38b00e6182d33)), closes [#907](https://github.com/HartiganHM/concert-crawl/issues/907) [#527](https://github.com/HartiganHM/concert-crawl/issues/527)

## [1.241.9](https://github.com/HartiganHM/concert-crawl/compare/v1.241.8...v1.241.9) (2026-08-14)


### Bug Fixes

* **artists:** stop projecting non-concerts, and reap the ones already stored ([#1557](https://github.com/HartiganHM/concert-crawl/issues/1557)) ([350aa3d](https://github.com/HartiganHM/concert-crawl/commit/350aa3dfb40624ce143f2df82e0cee6f1fb90bc9)), closes [#1343](https://github.com/HartiganHM/concert-crawl/issues/1343)

## [1.241.8](https://github.com/HartiganHM/concert-crawl/compare/v1.241.7...v1.241.8) (2026-08-14)


### Bug Fixes

* **event-row:** restore the watching tick and close the row's design-fidelity gaps ([#1556](https://github.com/HartiganHM/concert-crawl/issues/1556)) ([8769d3e](https://github.com/HartiganHM/concert-crawl/commit/8769d3eb4b23ee23fbde9490f279de2cc0532e3e))

## [1.241.7](https://github.com/HartiganHM/concert-crawl/compare/v1.241.6...v1.241.7) (2026-08-13)


### Bug Fixes

* **crawler:** recover events from unparseable JSON-LD blocks; silence local Sentry ([#1553](https://github.com/HartiganHM/concert-crawl/issues/1553)) ([2fe485e](https://github.com/HartiganHM/concert-crawl/commit/2fe485e72192e87240c3b851fbc1b16bf7eb0027))

## [1.241.6](https://github.com/HartiganHM/concert-crawl/compare/v1.241.5...v1.241.6) (2026-08-13)


### Bug Fixes

* **admin:** remove the suggested-pick feature Spotify made unreachable ([#1552](https://github.com/HartiganHM/concert-crawl/issues/1552)) ([8837704](https://github.com/HartiganHM/concert-crawl/commit/8837704918afceee5d967456a3a44fd20f7c2cff))

## [1.241.5](https://github.com/HartiganHM/concert-crawl/compare/v1.241.4...v1.241.5) (2026-08-13)


### Bug Fixes

* **copy:** say Concerts, not Concert History ([#1549](https://github.com/HartiganHM/concert-crawl/issues/1549)) ([52d2f40](https://github.com/HartiganHM/concert-crawl/commit/52d2f40ebd843fe0b203d0ea9f5f6dd729588142))

## [1.241.4](https://github.com/HartiganHM/concert-crawl/compare/v1.241.3...v1.241.4) (2026-08-13)


### Bug Fixes

* **admin:** hydrate candidate popularity via the single-artist endpoint ([#1550](https://github.com/HartiganHM/concert-crawl/issues/1550)) ([30151de](https://github.com/HartiganHM/concert-crawl/commit/30151de8fe2d6ffc8c2e34fb048a04666cf944e6))

## [1.241.3](https://github.com/HartiganHM/concert-crawl/compare/v1.241.2...v1.241.3) (2026-08-10)


### Bug Fixes

* **browse:** give both shelf cards one declared box ([6e82724](https://github.com/HartiganHM/concert-crawl/commit/6e827243aae65b0dcf44f71859916365b97fe49c)), closes [#763](https://github.com/HartiganHM/concert-crawl/issues/763)

## [1.241.2](https://github.com/HartiganHM/concert-crawl/compare/v1.241.1...v1.241.2) (2026-08-10)


### Bug Fixes

* **following:** post-ship feedback on the native follow shelf ([ded5e5c](https://github.com/HartiganHM/concert-crawl/commit/ded5e5cbd0d3cced369d36a176d664337bd588ba))

## [1.241.1](https://github.com/HartiganHM/concert-crawl/compare/v1.241.0...v1.241.1) (2026-08-09)


### Bug Fixes

* **following:** pin min-w-0 on the ellipsised flex items, not just overflow ([e01e3a7](https://github.com/HartiganHM/concert-crawl/commit/e01e3a706b58dfb10cdd9a2add7dbca0e8c25131))
* **following:** stop truncating the date, and make desktop wider than mobile ([3d7905e](https://github.com/HartiganHM/concert-crawl/commit/3d7905e0f5d90d919bfb4c8ad716df1a18ca104d))

# [1.241.0](https://github.com/HartiganHM/concert-crawl/compare/v1.240.0...v1.241.0) (2026-08-09)


### Bug Fixes

* **nudge:** restore the secondary control's focus ring ([31157fe](https://github.com/HartiganHM/concert-crawl/commit/31157fe9df0a3e83b7df9ce37cf7cfa0d26b1718))


### Features

* **following:** first-watch follow nudge and Premium tier copy reversal ([57fb0d5](https://github.com/HartiganHM/concert-crawl/commit/57fb0d57bffd4c1831dc6f708e798e4f1061012a))

# [1.240.0](https://github.com/HartiganHM/concert-crawl/compare/v1.239.0...v1.240.0) (2026-08-09)


### Features

* **alerts:** batch fan-out pushes and generalize the weekly digest ([f0c19fb](https://github.com/HartiganHM/concert-crawl/commit/f0c19fbf38ab232ff77d62be3e10c449c47c8a03)), closes [#649](https://github.com/HartiganHM/concert-crawl/issues/649) [#1515](https://github.com/HartiganHM/concert-crawl/issues/1515)

# [1.239.0](https://github.com/HartiganHM/concert-crawl/compare/v1.238.0...v1.239.0) (2026-08-09)


### Bug Fixes

* **onboarding:** ask for suggestions as the signed-in reader ([b9a2cf6](https://github.com/HartiganHM/concert-crawl/commit/b9a2cf642cd6fa24e49a14f0c2271585d30066c8))
* **onboarding:** cap genre length, wait for the real plan, lock Back mid-write ([0c51aa4](https://github.com/HartiganHM/concert-crawl/commit/0c51aa4ad1a2c7683f748cc441fb711e4c696a2b))
* **onboarding:** clear the genre picks when the artists step ends ([cc41e5e](https://github.com/HartiganHM/concert-crawl/commit/cc41e5eed2ffa0970e53e5afa6bae9992feb14e5))
* **onboarding:** drop both pick mirrors when the tour is left on purpose ([2c752b5](https://github.com/HartiganHM/concert-crawl/commit/2c752b5c30b9f78e8fa30602c7d3b53d794797c7))
* **onboarding:** fail the suggestions read when Clerk hands back no token ([2dbdb7f](https://github.com/HartiganHM/concert-crawl/commit/2dbdb7fdd4e44a2cf6551bcd6fc33a5552313e45))
* **onboarding:** only prune picks against a successful fetch, normalize the mirror ([9d57088](https://github.com/HartiganHM/concert-crawl/commit/9d57088c2dd0b2ebe935e4fc36a37514b8d5accd))
* **onboarding:** prune picks the refetched grid no longer offers ([7c8c45d](https://github.com/HartiganHM/concert-crawl/commit/7c8c45de54a973771900e4ac1f1a8f70fe7fddbb))
* **onboarding:** resolve the PR 7 collisions and retire OB-13 ([d8d6f83](https://github.com/HartiganHM/concert-crawl/commit/d8d6f83a2b06362af44917a13a21bdccd097435e))
* **onboarding:** restore the picks mirror in an effect, not during render ([14cbaff](https://github.com/HartiganHM/concert-crawl/commit/14cbaff61987b3d0ed6a31ec2425ad406adbb96b))
* **onboarding:** say a failed suggestions read failed, not that Denver is empty ([5a56452](https://github.com/HartiganHM/concert-crawl/commit/5a564526abda7c968273d8325b7c5d68a0e987bc))


### Features

* **onboarding:** pick genres, then follow artists, before the send-off ([a97394c](https://github.com/HartiganHM/concert-crawl/commit/a97394ce94ef28c1adcb705c18e44f179695dde5))

# [1.238.0](https://github.com/HartiganHM/concert-crawl/compare/v1.237.1...v1.238.0) (2026-08-09)


### Bug Fixes

* **following:** keep the locked action for a viewer who follows the bill ([bdd18fc](https://github.com/HartiganHM/concert-crawl/commit/bdd18fc7d9b856f36b2067215ee9b40cffd59078))
* **following:** make the bulk button's aria-disabled bind its own handler ([6b6c1d1](https://github.com/HartiganHM/concert-crawl/commit/6b6c1d1c94db1d9b729efa5b1e2751b55781f312))
* **following:** scope a failed bulk's rollback to its own acts ([5feb9e2](https://github.com/HartiganHM/concert-crawl/commit/5feb9e21fe7c3ca08ae72f2c1497f2794c945d0c))
* **following:** withhold the bulk action when one act is left to take ([1dfc722](https://github.com/HartiganHM/concert-crawl/commit/1dfc7220704c20d8d1984f0582de182454b7e422))


### Features

* **event-detail:** follow the whole bill from the show that made you care ([a4cd9d3](https://github.com/HartiganHM/concert-crawl/commit/a4cd9d3208373d6f86d4942f1ba138c72ca229c4))

## [1.237.1](https://github.com/HartiganHM/concert-crawl/compare/v1.237.0...v1.237.1) (2026-08-09)


### Bug Fixes

* **following:** cross-surface cold-eyes findings ([fc8c91a](https://github.com/HartiganHM/concert-crawl/commit/fc8c91a654f4f8cd13567e37c877f00ee93bcbd2))
* **spotify:** say 'paid feature' in the locked chip's aria, as every sibling does ([22b19ae](https://github.com/HartiganHM/concert-crawl/commit/22b19ae71fde0133980f846c6d575090b7f630d0))

# [1.237.0](https://github.com/HartiganHM/concert-crawl/compare/v1.236.1...v1.237.0) (2026-08-09)


### Bug Fixes

* **following:** cold-eyes triage on My shows ▸ Artists ([0f1f4a0](https://github.com/HartiganHM/concert-crawl/commit/0f1f4a0b0c3be57b2d534b5d8c8685a07b5ed5d4))
* **following:** copy-review pass on My shows ▸ Artists ([2e69271](https://github.com/HartiganHM/concert-crawl/commit/2e69271f0e73c21d1409805ab4aac974b0cdc0b4))
* **following:** give the mobile artist row a 44px follow target ([2762338](https://github.com/HartiganHM/concert-crawl/commit/2762338fd61ce0ebc7f6f3d439f8ad8ee6c20b21))
* **following:** keep Artists actions reachable in an all-undated list ([92dcc91](https://github.com/HartiganHM/concert-crawl/commit/92dcc913edf5889c69c20922200c1ba4a5243f47))
* **following:** one <main> landmark on My shows > Artists ([fd2ac3d](https://github.com/HartiganHM/concert-crawl/commit/fd2ac3dc11ca98af05c513a39b4579206994c5a2))


### Features

* **web:** my shows ▸ Artists sub-tab (native following, PR 6) ([79af0bc](https://github.com/HartiganHM/concert-crawl/commit/79af0bc108439108e59d8a95ee36d1d12d810f97))

## [1.236.1](https://github.com/HartiganHM/concert-crawl/compare/v1.236.0...v1.236.1) (2026-08-09)


### Bug Fixes

* **web:** load the tier picker on demand everywhere it is offered ([32782a6](https://github.com/HartiganHM/concert-crawl/commit/32782a6c9bdcb5b60393912f38738dfca5763206))

# [1.236.0](https://github.com/HartiganHM/concert-crawl/compare/v1.235.0...v1.236.0) (2026-08-09)


### Bug Fixes

* **search:** drop the EventImage import the row extraction orphaned ([d789826](https://github.com/HartiganHM/concert-crawl/commit/d789826b264021c5ea22a3439092ae8d10b12cb9))
* **search:** read the media query during render so desktop doesn't paint narrow first ([1927119](https://github.com/HartiganHM/concert-crawl/commit/19271199a5993e229bd5bdb4458024f8ac75f458))


### Features

* **search:** put the follow control on artist search results ([cce50fc](https://github.com/HartiganHM/concert-crawl/commit/cce50fc4b84066511835a06092ecc9b7e1a3c6fa))

# [1.235.0](https://github.com/HartiganHM/concert-crawl/compare/v1.234.0...v1.235.0) (2026-08-09)


### Features

* **admin:** suggest the dominant Spotify candidate in the picker ([#1538](https://github.com/HartiganHM/concert-crawl/issues/1538)) ([7c361b2](https://github.com/HartiganHM/concert-crawl/commit/7c361b22d6b5f8b2fa8c226bcb683b7b1e2041da)), closes [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)

# [1.234.0](https://github.com/HartiganHM/concert-crawl/compare/v1.233.0...v1.234.0) (2026-08-09)


### Features

* **events:** fall back to the headliner's photo when a show has no art ([#1536](https://github.com/HartiganHM/concert-crawl/issues/1536)) ([b712995](https://github.com/HartiganHM/concert-crawl/commit/b712995138ff00aab63bdca8ce8049c1ceefb4fa))

# [1.233.0](https://github.com/HartiganHM/concert-crawl/compare/v1.232.0...v1.233.0) (2026-08-09)


### Features

* **artists:** cache Spotify candidates so the picker opens for free ([#1531](https://github.com/HartiganHM/concert-crawl/issues/1531)) ([fa4cb76](https://github.com/HartiganHM/concert-crawl/commit/fa4cb76d448e9354d1136ae2ff9c419dac26255f))

# [1.232.0](https://github.com/HartiganHM/concert-crawl/compare/v1.231.0...v1.232.0) (2026-08-09)


### Features

* **web:** carry a chosen tier through sign-up ([#1284](https://github.com/HartiganHM/concert-crawl/issues/1284)) ([#1535](https://github.com/HartiganHM/concert-crawl/issues/1535)) ([45cf019](https://github.com/HartiganHM/concert-crawl/commit/45cf01968bc1a9fec6f90f5d05742abf2c4ba982)), closes [#1533](https://github.com/HartiganHM/concert-crawl/issues/1533)

# [1.231.0](https://github.com/HartiganHM/concert-crawl/compare/v1.230.0...v1.231.0) (2026-08-09)


### Bug Fixes

* **seed-staging:** day-anchor crew timestamps and guard the full crowd slice ([59dfa56](https://github.com/HartiganHM/concert-crawl/commit/59dfa5657e243d8f57960d406d47a8036eaeae0d))
* **seed-staging:** seed an attending-only member on the crew past boundary ([c515c64](https://github.com/HartiganHM/concert-crawl/commit/c515c648e27b756525e3e88508db547ecf78cfc3))
* **seed-staging:** stamp crew joins in roster order, not reversed ([0916817](https://github.com/HartiganHM/concert-crawl/commit/0916817f957abf606a0d15e49a3b785a14f58e29))


### Features

* **seed-staging:** seed Concert Crews fixtures for staging walks ([e98cb2e](https://github.com/HartiganHM/concert-crawl/commit/e98cb2e835490260052cb92ffeed6fa391db73cf))

# [1.230.0](https://github.com/HartiganHM/concert-crawl/compare/v1.229.3...v1.230.0) (2026-08-09)


### Bug Fixes

* **auth:** carry redirect_url through the launched sign-up funnel ([#1533](https://github.com/HartiganHM/concert-crawl/issues/1533)) ([cd4c14e](https://github.com/HartiganHM/concert-crawl/commit/cd4c14e3e38c85fa097995ce857e14b7f59f3552))
* **following:** let the shelf own its own card cap ([ff4e15b](https://github.com/HartiganHM/concert-crawl/commit/ff4e15bf13caa052d8fa02913b6dbef9985c157b))
* **following:** log the expected 401 rather than swallowing it ([47de129](https://github.com/HartiganHM/concert-crawl/commit/47de1294eed38e188a63e625381cf744c6b63909))
* **following:** unlock unfollow for downgraded viewers, drop the phantom zero ([4dfa180](https://github.com/HartiganHM/concert-crawl/commit/4dfa1804bd69752e4d6aa2e13a9452f7245c964b))
* **web:** drop a refused token on the scope-fallback retry ([f91311a](https://github.com/HartiganHM/concert-crawl/commit/f91311a61e38acf1c2d7181cba4aa853eb0873b8))
* **web:** fail the starter shelf closed while auth and plan resolve ([44472de](https://github.com/HartiganHM/concert-crawl/commit/44472de25d3a96b9ab76ce5add18af13b0ef850e))
* **web:** split the shelf's gated tap from its 403 handler ([7c52c91](https://github.com/HartiganHM/concert-crawl/commit/7c52c915d4bcea2cd4817eddd0ea227d57b51263))


### Features

* **web:** browse scope chip + follow shelf (native following, PR 4) ([4f437ae](https://github.com/HartiganHM/concert-crawl/commit/4f437aedcacbad8aaabc9351be00329e40791bdd))

## [1.229.3](https://github.com/HartiganHM/concert-crawl/compare/v1.229.2...v1.229.3) (2026-08-09)


### Bug Fixes

* **reporting:** send signed-out status reports to the tier picker ([#1532](https://github.com/HartiganHM/concert-crawl/issues/1532)) ([b2ce699](https://github.com/HartiganHM/concert-crawl/commit/b2ce69991390cea726f364c2467537b6825ef32b)), closes [#1247](https://github.com/HartiganHM/concert-crawl/issues/1247)

## [1.229.2](https://github.com/HartiganHM/concert-crawl/compare/v1.229.1...v1.229.2) (2026-08-09)


### Bug Fixes

* **consumer:** cut the empty-state eyebrow on Watching and Concerts ([#1529](https://github.com/HartiganHM/concert-crawl/issues/1529)) ([ce6f579](https://github.com/HartiganHM/concert-crawl/commit/ce6f57989e0022fcd70ba1c46c155e8e20625c22))

## [1.229.1](https://github.com/HartiganHM/concert-crawl/compare/v1.229.0...v1.229.1) (2026-08-09)


### Bug Fixes

* **price:** stop dressing a crawled price as a fan submission ([#1526](https://github.com/HartiganHM/concert-crawl/issues/1526)) ([d865423](https://github.com/HartiganHM/concert-crawl/commit/d865423b18d771a2c49321decd8389c1ff9344f9))

# [1.229.0](https://github.com/HartiganHM/concert-crawl/compare/v1.228.0...v1.229.0) (2026-08-08)


### Bug Fixes

* **settings:** drop a redundant undefined union and cover the new defaults ([2d808f2](https://github.com/HartiganHM/concert-crawl/commit/2d808f2e2f53ab7d2677ae83d975812f5a5540eb))
* **web:** make notification section ids per-instance ([9dce916](https://github.com/HartiganHM/concert-crawl/commit/9dce916e753dec718b54f2211aae6f5d68b765ea))


### Features

* **settings:** add the Artists you follow notification group ([aa3c5c3](https://github.com/HartiganHM/concert-crawl/commit/aa3c5c368c09347ec74d2a1ea0545e8824c8a8b1))

# [1.228.0](https://github.com/HartiganHM/concert-crawl/compare/v1.227.0...v1.228.0) (2026-08-08)


### Bug Fixes

* **api:** collapse a double-sourced follow to one list entry ([9f9174d](https://github.com/HartiganHM/concert-crawl/commit/9f9174d22b2fb5cb8469e9352a58399afb8a6348))
* **api:** sort the collapsed follow list by the followedAt it returns ([59443e6](https://github.com/HartiganHM/concert-crawl/commit/59443e679123abbff059251e731723dea3f4f1f5))


### Features

* **api:** native following data layer — scope filter, /me collection, bulk ([c2aa386](https://github.com/HartiganHM/concert-crawl/commit/c2aa386dc9bed1ea3a9446dd561f649422ca7f64))

# [1.227.0](https://github.com/HartiganHM/concert-crawl/compare/v1.226.1...v1.227.0) (2026-08-08)


### Bug Fixes

* **api:** reject unknown keys on the notification-preferences PATCH ([5ecb424](https://github.com/HartiganHM/concert-crawl/commit/5ecb4245236031720d7adc1687fc4f2e65206d2c))
* **nf:** keep follow optimism in one place, the hook ([90846cb](https://github.com/HartiganHM/concert-crawl/commit/90846cb163501fec0100de5e36d287cb15567609))
* **nf:** keep the follow control live on an existing follow after a downgrade ([bf4f55b](https://github.com/HartiganHM/concert-crawl/commit/bf4f55bd06d6e58010b6648522488ef1aeca499a))
* **nf:** let a sync parent own follow optimism ([6420315](https://github.com/HartiganHM/concert-crawl/commit/6420315a2870a731b97b1c98fe2d59f293e46c0d))
* **nf:** let the follow size table set the button's minimum height ([4a8229c](https://github.com/HartiganHM/concert-crawl/commit/4a8229c78ae58050cf93d0427a4d1424da75e940))
* **nf:** require onLockedTap so a locked follow button cannot be inert ([71cfcf3](https://github.com/HartiganHM/concert-crawl/commit/71cfcf3d4f797b241286256cb24135297d342b57))


### Features

* **following:** preference foundation and the locked follow state ([f20777f](https://github.com/HartiganHM/concert-crawl/commit/f20777f9c108d7f2f4a846872a991bc12b3882ad))

## [1.226.1](https://github.com/HartiganHM/concert-crawl/compare/v1.226.0...v1.226.1) (2026-08-08)


### Bug Fixes

* **crews:** baseline the rename submit on the name as opened ([f90e54d](https://github.com/HartiganHM/concert-crawl/commit/f90e54d9e93b8a900b195b1d27c24557ada24bdb))
* **crews:** close the Gate 5 journey findings ([3e0fde6](https://github.com/HartiganHM/concert-crawl/commit/3e0fde676c7cd931a3028ecd0f5921dd6f33e2ea))
* **crews:** let a change from another device beat a stale override ([7045f76](https://github.com/HartiganHM/concert-crawl/commit/7045f764230f60bcc51c175cda1829922a8e067b))
* **crews:** stop a background rename from clearing the rename field ([52255cc](https://github.com/HartiganHM/concert-crawl/commit/52255ccb9c84591f9c80c4646f90171314c1c3c4))

# [1.226.0](https://github.com/HartiganHM/concert-crawl/compare/v1.225.2...v1.226.0) (2026-08-08)


### Features

* **concerts:** give a show you're going to a home before its date ([#1519](https://github.com/HartiganHM/concert-crawl/issues/1519)) ([1c3f98c](https://github.com/HartiganHM/concert-crawl/commit/1c3f98c364cd5741114a360955e1e254af0767f2))

## [1.225.2](https://github.com/HartiganHM/concert-crawl/compare/v1.225.1...v1.225.2) (2026-08-08)


### Bug Fixes

* **consumer:** point the public event mirror's CTA at sign-up ([#1516](https://github.com/HartiganHM/concert-crawl/issues/1516)) ([88ee628](https://github.com/HartiganHM/concert-crawl/commit/88ee62858e54098beb728e27c341dd029924d436)), closes [#1359](https://github.com/HartiganHM/concert-crawl/issues/1359)

## [1.225.1](https://github.com/HartiganHM/concert-crawl/compare/v1.225.0...v1.225.1) (2026-08-08)


### Bug Fixes

* **consumer:** gate signed-out price CTAs behind the tier picker ([#1513](https://github.com/HartiganHM/concert-crawl/issues/1513)) ([87d18aa](https://github.com/HartiganHM/concert-crawl/commit/87d18aa11400852539e90cc51cfab951fabcbc82)), closes [#1247](https://github.com/HartiganHM/concert-crawl/issues/1247) [#1247](https://github.com/HartiganHM/concert-crawl/issues/1247) [#1247](https://github.com/HartiganHM/concert-crawl/issues/1247)

# [1.225.0](https://github.com/HartiganHM/concert-crawl/compare/v1.224.1...v1.225.0) (2026-08-08)


### Bug Fixes

* address Copilot round 1 ([b497af6](https://github.com/HartiganHM/concert-crawl/commit/b497af65b05a4dfcdce9a474b4c4565f8c0bceda))
* **ci:** invoke the web test script for shards and name the workspaces job accurately ([3a85af7](https://github.com/HartiganHM/concert-crawl/commit/3a85af730f27cf44622de2c37ce9efb4c58b9b82))
* **web:** explain the closed Spotify door instead of blanking the panel ([e8df22f](https://github.com/HartiganHM/concert-crawl/commit/e8df22f2df3b16f4ab08778eca322efa73d4d18b))
* **web:** turn a Premium follow 403 into the upgrade sheet ([1f1a411](https://github.com/HartiganHM/concert-crawl/commit/1f1a411d0500bf13a58fb943ad31f67db92d24cc))


### Features

* **api:** gate artist follow on the following entitlement ([1854129](https://github.com/HartiganHM/concert-crawl/commit/18541293ea577016ade60349dfb0a74d29891dd1))
* **crawler:** fan out new-show alerts for every follow source ([8527015](https://github.com/HartiganHM/concert-crawl/commit/8527015ebcd3409ccf29ef3c4be67781bfeb14b4))
* **notifications:** rename spotify.new_show to artist.new_show ([a5ae5e2](https://github.com/HartiganHM/concert-crawl/commit/a5ae5e2d7bb9178c0c4e78693553e56b28e009bb))
* **web:** gate the Spotify connect entry point behind an env flag ([da81e0b](https://github.com/HartiganHM/concert-crawl/commit/da81e0b9ec21303a428522992aa4092d171eca62))


### Performance Improvements

* **ci:** experiment A - cache-busted baseline Test measurement ([00d1435](https://github.com/HartiganHM/concert-crawl/commit/00d1435672e22f6b405a841e27f5398e94547326))
* **ci:** experiment B - size the web vitest fork pool to the full core count ([8d89297](https://github.com/HartiganHM/concert-crawl/commit/8d892972bb0ee5930090217e4e25c3228c65de4e))
* **ci:** shard the web test suite across four runners ([e15c669](https://github.com/HartiganHM/concert-crawl/commit/e15c6695062783fc246c14e99f13576e75cb084d))

## [1.224.1](https://github.com/HartiganHM/concert-crawl/compare/v1.224.0...v1.224.1) (2026-08-08)


### Bug Fixes

* **copy:** stop the app claiming features it does not have ([#1511](https://github.com/HartiganHM/concert-crawl/issues/1511)) ([e3e0cdc](https://github.com/HartiganHM/concert-crawl/commit/e3e0cdc3a43e45a7cb90cc785c88c7320eff5ada)), closes [#1393](https://github.com/HartiganHM/concert-crawl/issues/1393) [#1450](https://github.com/HartiganHM/concert-crawl/issues/1450) [#1391](https://github.com/HartiganHM/concert-crawl/issues/1391) [#1388](https://github.com/HartiganHM/concert-crawl/issues/1388) [#1107](https://github.com/HartiganHM/concert-crawl/issues/1107) [#1393](https://github.com/HartiganHM/concert-crawl/issues/1393) [#1450](https://github.com/HartiganHM/concert-crawl/issues/1450) [#1391](https://github.com/HartiganHM/concert-crawl/issues/1391) [#1388](https://github.com/HartiganHM/concert-crawl/issues/1388)

# [1.224.0](https://github.com/HartiganHM/concert-crawl/compare/v1.223.1...v1.224.0) (2026-08-08)


### Bug Fixes

* **attending:** never 500 on a read-back after the write committed ([55ef174](https://github.com/HartiganHM/concert-crawl/commit/55ef1741913e0ce7a27f33251f2bc6eac5c21387))
* **attending:** report the persisted timestamp when a concurrent tap wins ([30f3ccf](https://github.com/HartiganHM/concert-crawl/commit/30f3ccfe0010b1670602c20efc07baff82601961))
* **crews:** claim the going transition atomically so fan-out fires once ([48f1b33](https://github.com/HartiganHM/concert-crawl/commit/48f1b33f1434f31fd7386d08a8e138a32de393bf))
* **crews:** narrow the settings crew guard to the fields it actually checks ([6dec65b](https://github.com/HartiganHM/concert-crawl/commit/6dec65bf97120b5471222d87ae566d61f6d060a9))
* **crews:** reject a non-integer patchSalt at the settings boundary ([69d100c](https://github.com/HartiganHM/concert-crawl/commit/69d100c87e0d1f474b7162f02eee114a62a6decd))


### Features

* **crews:** notification fan-out, bell rendering, and per-crew mute ([f656fcd](https://github.com/HartiganHM/concert-crawl/commit/f656fcdc6441c11642aaccc60b924f7490d0b203)), closes [#1226](https://github.com/HartiganHM/concert-crawl/issues/1226)

## [1.223.1](https://github.com/HartiganHM/concert-crawl/compare/v1.223.0...v1.223.1) (2026-08-08)


### Bug Fixes

* **billing:** bump pinned Stripe API version to 2026-07-29.dahlia ([c918966](https://github.com/HartiganHM/concert-crawl/commit/c918966ac0ef40c49ce103c31c7cb168cc09235f))
* **deps:** align @typescript-eslint/parser with the bumped plugin ([1c143f5](https://github.com/HartiganHM/concert-crawl/commit/1c143f51954f39558c7cbc3e8c54cf793db6fdfe))

# [1.223.0](https://github.com/HartiganHM/concert-crawl/compare/v1.222.1...v1.223.0) (2026-08-08)


### Bug Fixes

* **crews:** distinguish a failed lens load from a crew going to nothing ([ead3afa](https://github.com/HartiganHM/concert-crawl/commit/ead3afac1014162a01469df0500e718cb7f9d9fc))
* **crews:** give the lens picker radio semantics and clearer SR wording ([f19dc19](https://github.com/HartiganHM/concert-crawl/commit/f19dc198df4801aad2b75793e4a39b7323380286))
* **crews:** make the lens picker keyboard-navigable as one radiogroup ([96a1157](https://github.com/HartiganHM/concert-crawl/commit/96a11570c89695a89dfb9a23b1f564ad1d4b713b))


### Features

* **crews:** browse crew lens and crew presence on rows and detail ([129c78c](https://github.com/HartiganHM/concert-crawl/commit/129c78c18c5d812b1178a79925073078d98815d6)), closes [#1226](https://github.com/HartiganHM/concert-crawl/issues/1226)

## [1.222.1](https://github.com/HartiganHM/concert-crawl/compare/v1.222.0...v1.222.1) (2026-08-07)


### Bug Fixes

* **api:** give every Spotify fetch a hard deadline ([#1500](https://github.com/HartiganHM/concert-crawl/issues/1500)) ([6cc5c21](https://github.com/HartiganHM/concert-crawl/commit/6cc5c21ecdef8475b26326fee7d012a2506d9b40))
* **crews:** drop the roster's duplicate spots line and Invite button ([9a57588](https://github.com/HartiganHM/concert-crawl/commit/9a575883d2fe3f27c237e8a7a176e09328a8f06f))
* **crews:** give the crew name room on desktop and stop the tab strip clipping ([105c487](https://github.com/HartiganHM/concert-crawl/commit/105c4879a9b03f89fa5c230d6ca3cd6ee1a568d6))

# [1.222.0](https://github.com/HartiganHM/concert-crawl/compare/v1.221.0...v1.222.0) (2026-08-06)


### Bug Fixes

* **crews:** keep invite tokens out of telemetry and encode them in paths ([1da86a0](https://github.com/HartiganHM/concert-crawl/commit/1da86a01c13a1016a1464dc83312b6c6136f47ee))


### Features

* **crews:** add the public invite landing at /crew/join/[token] ([2d237fd](https://github.com/HartiganHM/concert-crawl/commit/2d237fd5e2864b8d3c8ff0765bd97dc491261b01)), closes [#1226](https://github.com/HartiganHM/concert-crawl/issues/1226)

# [1.221.0](https://github.com/HartiganHM/concert-crawl/compare/v1.220.0...v1.221.0) (2026-08-06)


### Bug Fixes

* **crews:** clear the invite failure notice at every action entry point ([9c862b8](https://github.com/HartiganHM/concert-crawl/commit/9c862b87f7e5c5c46b38a9839166ec567a6143a3))
* **crews:** close the Gate 4 gaps on the crew home ([0543d6c](https://github.com/HartiganHM/concert-crawl/commit/0543d6cf9d2a787afd04badcf9b489f7f73d243a))
* **crews:** correct the going cluster's announcement and share one stub date ([c48f285](https://github.com/HartiganHM/concert-crawl/commit/c48f285e6de52a8eb582885d02041d77bac4419c))
* **crews:** disable the invite copy button while a revoke is in flight ([ce00af3](https://github.com/HartiganHM/concert-crawl/commit/ce00af372e3932e568f506b09cfab1f6c15cc0a5))
* **crews:** don't claim a copy that landed after the sheet closed ([8e9d458](https://github.com/HartiganHM/concert-crawl/commit/8e9d4582617d06aeb0ed337bf6fd3e017ae8f618))
* **crews:** give crew rows their own surface and prune stale removals ([74fd788](https://github.com/HartiganHM/concert-crawl/commit/74fd788d7a67236c184124ab9883cb1d1f10d4e5))
* **crews:** reset busy on close and guard the clipboard in InviteSheet ([062e6e0](https://github.com/HartiganHM/concert-crawl/commit/062e6e0c95a9b8ab870b0a613863d295caddf464))


### Features

* **crews:** crew home page with tabs, roster, invite and leave flows ([c09f0f1](https://github.com/HartiganHM/concert-crawl/commit/c09f0f1fe31675efcef4604dee57a0bef825d5c7))

# [1.220.0](https://github.com/HartiganHM/concert-crawl/compare/v1.219.0...v1.220.0) (2026-08-06)


### Bug Fixes

* **crews:** close the gaps the pre-PR verification pass found ([ff1345d](https://github.com/HartiganHM/concert-crawl/commit/ff1345d19b95ccac88a4f022b9d38e066a48251d))
* **crews:** close the six defects Gate 2 found by driving the browser ([2e1ab0c](https://github.com/HartiganHM/concert-crawl/commit/2e1ab0ce0ee748430ba9bd30ab6a7b6f5624b504))
* **crews:** key the lapsed gate line on a prior subscription, not a free plan ([a3f5f23](https://github.com/HartiganHM/concert-crawl/commit/a3f5f2358385d303749a10f5c7bd38db17a27e9c))
* **crews:** log the create failure instead of swallowing it ([be8ef78](https://github.com/HartiganHM/concert-crawl/commit/be8ef788a685c4a3ef8f24e07e1361de573d8db7))
* **crews:** match the loading eyebrow to its uppercase siblings ([e43206b](https://github.com/HartiganHM/concert-crawl/commit/e43206bd6d77533100f64e240a4084c494ac27ee))


### Features

* **crews:** ship the /crews destination, patch art and gated create sheet ([4a9ed53](https://github.com/HartiganHM/concert-crawl/commit/4a9ed5395e2ca07bdf05d448e161bfa930c982d4))

# [1.219.0](https://github.com/HartiganHM/concert-crawl/compare/v1.218.0...v1.219.0) (2026-08-06)


### Bug Fixes

* **auth:** bound a return path to what its cookie can carry ([2004dbb](https://github.com/HartiganHM/concert-crawl/commit/2004dbbc678998e219f6619f3be15ccb0480b020))
* **auth:** clear the return-path cookie on presence, not on a truthy value ([5a4327a](https://github.com/HartiganHM/concert-crawl/commit/5a4327abc1f8c269ccc216b81ade7c8b762f8d6b))
* **auth:** decide where a return path points from its path alone ([e8684a1](https://github.com/HartiganHM/concert-crawl/commit/e8684a15cb65e93b9394e0375666901e73fac0b6))
* **auth:** hold the re-attached query to the control-character rule ([cf1bdb4](https://github.com/HartiganHM/concert-crawl/commit/cf1bdb4c04f721301ac88db2a158ae82b506bd30))
* **auth:** keep return-path warnings off the browser console ([96d4509](https://github.com/HartiganHM/concert-crawl/commit/96d450910fb4c0e077459549b5ffdeb387846938))
* **auth:** log why a return path was rejected ([e3e5ac0](https://github.com/HartiganHM/concert-crawl/commit/e3e5ac0a60e2f27399d75513c0a6772fa23b09bc))
* **auth:** read encoded newlines in a query the loop never decodes ([1cfbf3f](https://github.com/HartiganHM/concert-crawl/commit/1cfbf3f4b141c407f853a14ef981f01e6b52522d))
* **auth:** reject control characters in return paths ([3b4339c](https://github.com/HartiganHM/concert-crawl/commit/3b4339c152fb4fa164bba2fd2267d8970cef3c6a))
* **crews:** build the expiry predicate on call, not at import ([cddf24f](https://github.com/HartiganHM/concert-crawl/commit/cddf24fff08dc5c976fb6160c9abc775171fd07e))
* **crews:** carry Retry-After on the invite 429; drop test-only casts ([9d6d988](https://github.com/HartiganHM/concert-crawl/commit/9d6d988501bf80b56d4a94f9a5a5e513b9b49444))
* **crews:** honest join flag, Zod at the token boundary, no stale return path ([c840fc4](https://github.com/HartiganHM/concert-crawl/commit/c840fc4ab8d0ac760c0571392a46309c21b262fe))
* **crews:** let the DB clock decide invite expiry; rate limit the join ([a5d1d57](https://github.com/HartiganHM/concert-crawl/commit/a5d1d5750164d3210f4f09a235f10993f34cf340))
* **crews:** one open-redirect validator, DB-clock TTL, idempotent revoke ([95614cb](https://github.com/HartiganHM/concert-crawl/commit/95614cb3ac4e02d290d78e4864d2b912dd2b74d9))
* **crews:** revoke an invite under the same crew row lock as mint and join ([3335374](https://github.com/HartiganHM/concert-crawl/commit/3335374fa2631eedf991b9134b27bbc270c4e56c))


### Features

* **crews:** mint, resolve, and join crew invite links ([01a8ffd](https://github.com/HartiganHM/concert-crawl/commit/01a8ffd554ff767f66a2ebca50a2534719c2310d)), closes [#1226](https://github.com/HartiganHM/concert-crawl/issues/1226)
* **web:** carry a crew link across the beta funnel ([9d562c4](https://github.com/HartiganHM/concert-crawl/commit/9d562c4eaa103f573ddbb95c9c478534fc1c1ace))

# [1.218.0](https://github.com/HartiganHM/concert-crawl/compare/v1.217.0...v1.218.0) (2026-08-06)


### Bug Fixes

* **crews:** break roster and list ordering ties deterministically ([06877da](https://github.com/HartiganHM/concert-crawl/commit/06877daf0d2378f2b51d08d7ad0706a8be897ceb))
* **crews:** close the keeper TOCTOU on every gated write ([c8e0900](https://github.com/HartiganHM/concert-crawl/commit/c8e09000b7c26ffd02ccb41e58ae7c8b55f0c4ae))
* **crews:** guard every returning() destructure and correct membership doc ([9f8420f](https://github.com/HartiganHM/concert-crawl/commit/9f8420ff75eabba4ad658c63f774ee9af78d5218))
* **crews:** hydrate the creator's member preview on create ([8d923e5](https://github.com/HartiganHM/concert-crawl/commit/8d923e5b8c26c173ed6a9a721b109305afb23d63))
* **crews:** run handoff under the crew row lock ([24ed674](https://github.com/HartiganHM/concert-crawl/commit/24ed67484c50cae6ea261b4cdad89efc6c055c23))
* **crews:** stabilise the going list on a crew show ([c0fc692](https://github.com/HartiganHM/concert-crawl/commit/c0fc69222e26a34f7d7c622860ad3df1bc4015d6))


### Features

* **crews:** add the /v1/crews router ([80a7942](https://github.com/HartiganHM/concert-crawl/commit/80a794268b4f18be0181c2e68ecb210809d63a7e)), closes [#1226](https://github.com/HartiganHM/concert-crawl/issues/1226)

# [1.217.0](https://github.com/HartiganHM/concert-crawl/compare/v1.216.7...v1.217.0) (2026-08-06)


### Features

* **crews:** add crews data model, entitlement key, and notification categories ([b81106c](https://github.com/HartiganHM/concert-crawl/commit/b81106c827f60ac5769eb2fa7c72a192bba443d2))

## [1.216.7](https://github.com/HartiganHM/concert-crawl/compare/v1.216.6...v1.216.7) (2026-08-06)


### Bug Fixes

* **deps:** remove duplicated lockfile blocks that broke every install ([#1489](https://github.com/HartiganHM/concert-crawl/issues/1489)) ([5489ab0](https://github.com/HartiganHM/concert-crawl/commit/5489ab08706c92088a08016f86d126fe9e481862)), closes [#1409](https://github.com/HartiganHM/concert-crawl/issues/1409) [#1409](https://github.com/HartiganHM/concert-crawl/issues/1409) [#1190](https://github.com/HartiganHM/concert-crawl/issues/1190) [#1189](https://github.com/HartiganHM/concert-crawl/issues/1189) [#1488](https://github.com/HartiganHM/concert-crawl/issues/1488)

## [1.216.6](https://github.com/HartiganHM/concert-crawl/compare/v1.216.5...v1.216.6) (2026-08-05)


### Bug Fixes

* **crawler:** project artists for every advertised event, not just upserted ones ([#1485](https://github.com/HartiganHM/concert-crawl/issues/1485)) ([10575f0](https://github.com/HartiganHM/concert-crawl/commit/10575f0605159c25ec19fd14224253fbf0ae5000))

## [1.216.5](https://github.com/HartiganHM/concert-crawl/compare/v1.216.4...v1.216.5) (2026-08-05)


### Bug Fixes

* **web:** host overlays inside the admin theme scope ([#1480](https://github.com/HartiganHM/concert-crawl/issues/1480)) ([b13e409](https://github.com/HartiganHM/concert-crawl/commit/b13e409e5fd4785fe75f5e04cee91cc9221d0448))

## [1.216.4](https://github.com/HartiganHM/concert-crawl/compare/v1.216.3...v1.216.4) (2026-08-04)


### Bug Fixes

* **web:** animate the Going CTA placeholder while the plan resolves ([#1469](https://github.com/HartiganHM/concert-crawl/issues/1469)) ([4b6cb78](https://github.com/HartiganHM/concert-crawl/commit/4b6cb7889ef4a1e0ae65975e30e8b70544c04802))

## [1.216.3](https://github.com/HartiganHM/concert-crawl/compare/v1.216.2...v1.216.3) (2026-08-04)


### Bug Fixes

* **ci:** fail closed when a live deploy timestamp is missing or unparseable ([c93b90d](https://github.com/HartiganHM/concert-crawl/commit/c93b90db2d257ce6e9d0d4b394b27ac1eb03ca22))
* **ci:** fail closed when a wait-for-live timeout cannot be classified ([a7e9e31](https://github.com/HartiganHM/concert-crawl/commit/a7e9e3158d59fc8fe821501cc99b293ba29cbb91))
* **ci:** run the testid guard in CI and fail closed on an unknown autoDeploy ([9fd55ab](https://github.com/HartiganHM/concert-crawl/commit/9fd55abc9c5013daea8636e040d5aecaa7388aba))
* **e2e:** address Copilot round 1 on the testid contract and wait script ([bcfd0b8](https://github.com/HartiganHM/concert-crawl/commit/bcfd0b8b065199c87985d2e2f21a21851f50a0b8))
* **e2e:** guard back-navigation on event rows existing ([b0e6411](https://github.com/HartiganHM/concert-crawl/commit/b0e6411c1ef4d4f7aef372e4202f00a3da3ca238))
* **e2e:** point specs at event-row and stop the deploy gate self-retiring ([586dd17](https://github.com/HartiganHM/concert-crawl/commit/586dd170720a23f31d85d79f2ded6912bc8f73b5)), closes [#1436](https://github.com/HartiganHM/concert-crawl/issues/1436)

## [1.216.2](https://github.com/HartiganHM/concert-crawl/compare/v1.216.1...v1.216.2) (2026-08-04)


### Bug Fixes

* **web:** stop the Event Detail commit block popping in after load ([#1467](https://github.com/HartiganHM/concert-crawl/issues/1467)) ([1e5a5ef](https://github.com/HartiganHM/concert-crawl/commit/1e5a5ef9cb5b7be9ddbd36608d06b608cd054f56))

## [1.216.1](https://github.com/HartiganHM/concert-crawl/compare/v1.216.0...v1.216.1) (2026-08-04)


### Bug Fixes

* **api:** keep deactivated venues out of Spotify fan-out and picks ([1cb15ca](https://github.com/HartiganHM/concert-crawl/commit/1cb15cabac34d7644c0f2e4d7ce6e2f09084175a)), closes [#1406](https://github.com/HartiganHM/concert-crawl/issues/1406)
* **web:** let the crawler's revalidate POST past Clerk middleware ([059d34d](https://github.com/HartiganHM/concert-crawl/commit/059d34d1e3273905a74f9804e46c518bb032c926)), closes [#1442](https://github.com/HartiganHM/concert-crawl/issues/1442)

# [1.216.0](https://github.com/HartiganHM/concert-crawl/compare/v1.215.4...v1.216.0) (2026-08-04)


### Bug Fixes

* **api:** match Spotify follows against co-headliners ([633d05c](https://github.com/HartiganHM/concert-crawl/commit/633d05c6a026e166ae259e8a4dfbb36274298f4d)), closes [#1416](https://github.com/HartiganHM/concert-crawl/issues/1416) [#1419](https://github.com/HartiganHM/concert-crawl/issues/1419)


### Features

* **admin:** allow selecting the detail-page platform ([497f4e6](https://github.com/HartiganHM/concert-crawl/commit/497f4e6cd37d99626b9cf07b462ccd65b41b3d23)), closes [#1295](https://github.com/HartiganHM/concert-crawl/issues/1295) [#1435](https://github.com/HartiganHM/concert-crawl/issues/1435)

## [1.215.4](https://github.com/HartiganHM/concert-crawl/compare/v1.215.3...v1.215.4) (2026-08-04)


### Bug Fixes

* **web:** restore the designed commit block on Event Detail ([#1458](https://github.com/HartiganHM/concert-crawl/issues/1458)) ([abcf42a](https://github.com/HartiganHM/concert-crawl/commit/abcf42ac1b1aacb1382d4aa23886c13591bd04c9))

## [1.215.3](https://github.com/HartiganHM/concert-crawl/compare/v1.215.2...v1.215.3) (2026-08-04)


### Bug Fixes

* **web:** log the profile save failure before surfacing it ([980fc7a](https://github.com/HartiganHM/concert-crawl/commit/980fc7aa0a072f2b81060c127568531b556b38bd))

## [1.215.2](https://github.com/HartiganHM/concert-crawl/compare/v1.215.1...v1.215.2) (2026-08-03)


### Bug Fixes

* **crawler:** carry the series-brand exception into the tool schema ([370d571](https://github.com/HartiganHM/concert-crawl/commit/370d571e3fbfafe5e56efcca79638b1c105daad3))
* **crawler:** state which rule wins for branded bingo and screening nights ([05b3af8](https://github.com/HartiganHM/concert-crawl/commit/05b3af8f15f296b748aa4143e83b98c058804d95))

## [1.215.1](https://github.com/HartiganHM/concert-crawl/compare/v1.215.0...v1.215.1) (2026-08-03)


### Bug Fixes

* **passport:** catch a share sheet that throws instead of rejecting ([da3fea9](https://github.com/HartiganHM/concert-crawl/commit/da3fea9cc0cf23718d8eb49b5cd2192dc3967e04))
* **passport:** guard ResizeObserver and restore stubbed URL globals ([4e28cf7](https://github.com/HartiganHM/concert-crawl/commit/4e28cf7d36a63be6dce53b1558903b55a2cafcdd))
* **passport:** key the artboard off the print mode, not the share mode ([d5e63e0](https://github.com/HartiganHM/concert-crawl/commit/d5e63e04de9a594a909208e742fa591e9a3ec97d))
* **passport:** make the card share fast, sharp, and in the reader's theme ([08a8efb](https://github.com/HartiganHM/concert-crawl/commit/08a8efbe6e9f1be5a4885fbce4131059d77c32df)), closes [#85](https://github.com/HartiganHM/concert-crawl/issues/85)
* **passport:** prefetch the card once, after the live theme resolves ([63ecab8](https://github.com/HartiganHM/concert-crawl/commit/63ecab82d58d22de43e53410d4d72b8fc2514eb0))
* **passport:** set the shareable file before creating the object URL ([423141b](https://github.com/HartiganHM/concert-crawl/commit/423141b58253d8b1b240b0f6fc70442afe5cbba0))

# [1.215.0](https://github.com/HartiganHM/concert-crawl/compare/v1.214.0...v1.215.0) (2026-08-03)


### Bug Fixes

* **admin:** trim both sides of the tour-name comparison ([80f4539](https://github.com/HartiganHM/concert-crawl/commit/80f4539494dc4b92e50de6821fa68c7c33b13b5a))


### Features

* **admin:** editable tour name on the event editor ([6459d78](https://github.com/HartiganHM/concert-crawl/commit/6459d78cf9faaf1c280f418d3140291926bab280)), closes [#992](https://github.com/HartiganHM/concert-crawl/issues/992)

# [1.214.0](https://github.com/HartiganHM/concert-crawl/compare/v1.213.1...v1.214.0) (2026-08-03)


### Bug Fixes

* **web:** give the Going explainer a header row to sit in ([#1447](https://github.com/HartiganHM/concert-crawl/issues/1447)) ([d17bd14](https://github.com/HartiganHM/concert-crawl/commit/d17bd14b7ca9e35fefc083c8aaef20365d6c3a19))


### Features

* **web:** migrate Watching onto the shared Event Row ([#1445](https://github.com/HartiganHM/concert-crawl/issues/1445)) ([52db41c](https://github.com/HartiganHM/concert-crawl/commit/52db41c5be80f984a005b0b725535751d57b51ef))

## [1.213.1](https://github.com/HartiganHM/concert-crawl/compare/v1.213.0...v1.213.1) (2026-08-03)


### Bug Fixes

* **crawler:** start the AEG deadline before the robots gate ([1b4ab40](https://github.com/HartiganHM/concert-crawl/commit/1b4ab40c90dfdb6c37e8d9eab5dd90f003c859e4))

# [1.213.0](https://github.com/HartiganHM/concert-crawl/compare/v1.212.1...v1.213.0) (2026-08-03)


### Bug Fixes

* **scripts:** scope classification absorb to the events each request sent ([da4d18a](https://github.com/HartiganHM/concert-crawl/commit/da4d18a9785925e20d2cf467ee399861b74648a3))


### Features

* **web:** proactive ISR revalidation after a crawl inserts events ([9406b84](https://github.com/HartiganHM/concert-crawl/commit/9406b8499c798603aa1f1bf2efecc5446eea02ad)), closes [#847](https://github.com/HartiganHM/concert-crawl/issues/847)

## [1.212.1](https://github.com/HartiganHM/concert-crawl/compare/v1.212.0...v1.212.1) (2026-08-03)


### Bug Fixes

* **crawler:** give the debug capture three distinct length fields ([5ec6e23](https://github.com/HartiganHM/concert-crawl/commit/5ec6e233fdd269f46d40c7e4d781121f1a60c493))

# [1.212.0](https://github.com/HartiganHM/concert-crawl/compare/v1.211.0...v1.212.0) (2026-08-03)


### Features

* **web:** replace EventCard with the measured EventRow ([#1436](https://github.com/HartiganHM/concert-crawl/issues/1436)) ([2d887e4](https://github.com/HartiganHM/concert-crawl/commit/2d887e4b7f1d73fe43fdf5417d0d830fb289e3bb)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794)

# [1.211.0](https://github.com/HartiganHM/concert-crawl/compare/v1.210.0...v1.211.0) (2026-08-03)


### Bug Fixes

* **crawler:** abort a detail-page run on 403/429 ([de1cc18](https://github.com/HartiganHM/concert-crawl/commit/de1cc1862b27f17918efd9ac6fdf6c11f177048e))
* **crawler:** bound robots pre-flight to the detail-page cap ([70d892b](https://github.com/HartiganHM/concert-crawl/commit/70d892b21fe0f967f0901e4584fac2dc47f6fd19))
* **crawler:** gate detail-page redirects and log deadline breaches ([5ea7ed5](https://github.com/HartiganHM/concert-crawl/commit/5ea7ed50e884013558fcbcf6a98064265bc00c0f))
* **crawler:** log unparseable detail-page hrefs before skipping ([c3ef680](https://github.com/HartiganHM/concert-crawl/commit/c3ef680b3b9c1101612336ea63207495f5a7dd47))


### Features

* **crawler:** detail-page-following platform fetcher ([6e8dd42](https://github.com/HartiganHM/concert-crawl/commit/6e8dd4221ff0edd0c991513f433521b5f9b8ffab)), closes [#1295](https://github.com/HartiganHM/concert-crawl/issues/1295)

# [1.210.0](https://github.com/HartiganHM/concert-crawl/compare/v1.209.0...v1.210.0) (2026-08-03)


### Bug Fixes

* **scripts:** bind co-headliner lock array as one param ([a62829f](https://github.com/HartiganHM/concert-crawl/commit/a62829f7464c4387a90b18ce917e3e73db52bb5b))
* **watching:** source the provenance chip from the price it describes ([#1430](https://github.com/HartiganHM/concert-crawl/issues/1430)) ([719c339](https://github.com/HartiganHM/concert-crawl/commit/719c339b7382358e700a594b7b8ddb6c36405ed9)), closes [1365/#1366](https://github.com/HartiganHM/concert-crawl/issues/1366)


### Features

* **web:** model locked and error as Going CTA button treatments ([#1432](https://github.com/HartiganHM/concert-crawl/issues/1432)) ([40247a8](https://github.com/HartiganHM/concert-crawl/commit/40247a8111e48c55caa1bf81a2c278cb996cf037))

# [1.209.0](https://github.com/HartiganHM/concert-crawl/compare/v1.208.0...v1.209.0) (2026-08-03)


### Bug Fixes

* **copy:** state each promise once and enforce the Watching vocabulary ([#1428](https://github.com/HartiganHM/concert-crawl/issues/1428)) ([78c9860](https://github.com/HartiganHM/concert-crawl/commit/78c98607fe9e1385de7b1a812c752d4657ae1225)), closes [#1389](https://github.com/HartiganHM/concert-crawl/issues/1389)
* **scripts:** bump updated_at when the co-headliner backfill rewrites a row ([13accbd](https://github.com/HartiganHM/concert-crawl/commit/13accbd78b327127c66d1903d7c082b5ef6dea64))
* **scripts:** denver-local date bound and provenance guard on backfill ([04a3b85](https://github.com/HartiganHM/concert-crawl/commit/04a3b8579646be9ebab252b94278a8e7ab3da578))
* **scripts:** import canonicalizeSupporting from types source ([6a09a93](https://github.com/HartiganHM/concert-crawl/commit/6a09a930d8a209854b8811702bc0bd112028f3b8))
* **scripts:** import db from source and log proposed supporting in CSV ([7b3d506](https://github.com/HartiganHM/concert-crawl/commit/7b3d50620f39b3b5a48591319b2a6a3f16c4940a))
* **scripts:** write the decision CSV in commit mode too ([cd06ad9](https://github.com/HartiganHM/concert-crawl/commit/cd06ad935405afac7523f51d1652a3b450825503))


### Features

* **scripts:** one-shot co-headliner backfill for historical flattened bills ([#1203](https://github.com/HartiganHM/concert-crawl/issues/1203)) ([12e4b70](https://github.com/HartiganHM/concert-crawl/commit/12e4b7088d78ace91b0670319bd5f9d8f50d880d))
* **web:** open the watchers roster in an overlay ([#1431](https://github.com/HartiganHM/concert-crawl/issues/1431)) ([046a064](https://github.com/HartiganHM/concert-crawl/commit/046a064cfbcea92576aedd024553c84edef8f19a))

# [1.208.0](https://github.com/HartiganHM/concert-crawl/compare/v1.207.1...v1.208.0) (2026-08-03)


### Features

* **web:** rebuild the event-detail watch strip as two rows ([#1429](https://github.com/HartiganHM/concert-crawl/issues/1429)) ([4a703ef](https://github.com/HartiganHM/concert-crawl/commit/4a703eff70dfc4bdf1f249362ca52d6a06c3a2b6))

## [1.207.1](https://github.com/HartiganHM/concert-crawl/compare/v1.207.0...v1.207.1) (2026-08-03)


### Bug Fixes

* **copy:** disclose the artist-page crawl window once, not twice ([#1425](https://github.com/HartiganHM/concert-crawl/issues/1425)) ([3f8ef78](https://github.com/HartiganHM/concert-crawl/commit/3f8ef783c13e5b531aa7eec7c442c85ce46a67ec))
* **copy:** editorial cuts and tightens (queue groups C and D) ([#1427](https://github.com/HartiganHM/concert-crawl/issues/1427)) ([deb19db](https://github.com/HartiganHM/concert-crawl/commit/deb19dbffab05a2d4217cc5206d49ba9a00127de))

# [1.207.0](https://github.com/HartiganHM/concert-crawl/compare/v1.206.0...v1.207.0) (2026-08-03)


### Features

* **web:** CCOverlay shell + CCTip, retiring InfoTooltip ([#1420](https://github.com/HartiganHM/concert-crawl/issues/1420)) ([3cce3f6](https://github.com/HartiganHM/concert-crawl/commit/3cce3f6ed98d1219c3775edc56ddab2a4ff3e48d))

# [1.206.0](https://github.com/HartiganHM/concert-crawl/compare/v1.205.0...v1.206.0) (2026-08-03)


### Bug Fixes

* **crawler:** keep headliners and supporting acts disjoint ([b66ab35](https://github.com/HartiganHM/concert-crawl/commit/b66ab351c4ba00bce2080de69626ee86bc2a20f5))
* **crawler:** preserve headliners[0] on upsert; index-friendly array arms ([bf94889](https://github.com/HartiganHM/concert-crawl/commit/bf948890683a709c0401fe837427b3489cd9f583))


### Features

* **events:** model co-headliners as a first-class set ([9f28017](https://github.com/HartiganHM/concert-crawl/commit/9f28017019ea80bfba596c81e716ec3b694c5e34)), closes [#1203](https://github.com/HartiganHM/concert-crawl/issues/1203)

# [1.205.0](https://github.com/HartiganHM/concert-crawl/compare/v1.204.2...v1.205.0) (2026-08-03)


### Bug Fixes

* **crawler:** bump updatedAt on auto-cancel and mock the sweep in run.test ([7ca98ed](https://github.com/HartiganHM/concert-crawl/commit/7ca98edca73bc04afca83adf13e2127fd7a7dedd))
* **crawler:** make the stale sweep atomic and log at zero ([a683cae](https://github.com/HartiganHM/concert-crawl/commit/a683cae4724238ef1f66a9a1d5ea163b310ded9e))


### Features

* **crawler:** cancel events unseen for two weeks ([69f8419](https://github.com/HartiganHM/concert-crawl/commit/69f841931c72dd855a4ed86f372825c761bdd1d0)), closes [#675](https://github.com/HartiganHM/concert-crawl/issues/675)

## [1.204.2](https://github.com/HartiganHM/concert-crawl/compare/v1.204.1...v1.204.2) (2026-08-03)


### Bug Fixes

* **copy:** mechanical em-dash pass on notifications, reporting, onboarding, and PWA ([#1413](https://github.com/HartiganHM/concert-crawl/issues/1413)) ([2daac9a](https://github.com/HartiganHM/concert-crawl/commit/2daac9a978300b601d16155afdafcdc026102814))
* **copy:** mechanical em-dash pass on push, Spotify fan-out, and history copy ([#1414](https://github.com/HartiganHM/concert-crawl/issues/1414)) ([7fdbc2e](https://github.com/HartiganHM/concert-crawl/commit/7fdbc2e25f5cf9bd9e4acc559fb720ebec6bddee))
* **copy:** mechanical em-dash pass on settings and lifecycle plan copy ([#1412](https://github.com/HartiganHM/concert-crawl/issues/1412)) ([9668657](https://github.com/HartiganHM/concert-crawl/commit/96686578ffc4a0831a3cc9dd1b13b2d200e65ba4))

## [1.204.1](https://github.com/HartiganHM/concert-crawl/compare/v1.204.0...v1.204.1) (2026-08-03)


### Bug Fixes

* **api:** hide deactivated venues' events from forward-looking surfaces ([346ee23](https://github.com/HartiganHM/concert-crawl/commit/346ee2334c661de4853d5a9ce56529b4cf72ec26)), closes [#1299](https://github.com/HartiganHM/concert-crawl/issues/1299)

# [1.204.0](https://github.com/HartiganHM/concert-crawl/compare/v1.203.6...v1.204.0) (2026-08-03)


### Bug Fixes

* **crawler-core:** alias db subpath in the integration vitest config ([eacdb23](https://github.com/HartiganHM/concert-crawl/commit/eacdb239e240320461b56e829118161e32897c28))
* **db:** make an empty statuses list unrepresentable in upcomingEventConditions ([3f0740b](https://github.com/HartiganHM/concert-crawl/commit/3f0740b2c3406270f2e0834abd1338729dc5fa8d))


### Features

* **db:** shared upcoming-events condition helper + partial index ([ac447b5](https://github.com/HartiganHM/concert-crawl/commit/ac447b57f70d8669a716aec2a7cb6ee46809f09f)), closes [#1201](https://github.com/HartiganHM/concert-crawl/issues/1201) [#1212](https://github.com/HartiganHM/concert-crawl/issues/1212)

## [1.203.6](https://github.com/HartiganHM/concert-crawl/compare/v1.203.5...v1.203.6) (2026-08-03)


### Bug Fixes

* **copy:** mechanical em-dash pass on tier picker, Spotify, artist page ([#1402](https://github.com/HartiganHM/concert-crawl/issues/1402)) ([9b6598e](https://github.com/HartiganHM/concert-crawl/commit/9b6598e4b538d8d076273667f56def8b527432ac))

## [1.203.5](https://github.com/HartiganHM/concert-crawl/compare/v1.203.4...v1.203.5) (2026-08-03)


### Bug Fixes

* **copy:** mechanical em-dash pass on consumer core ([#1400](https://github.com/HartiganHM/concert-crawl/issues/1400)) ([402a839](https://github.com/HartiganHM/concert-crawl/commit/402a8397a642abc341832c8da7874d70c6c10cd7))
* **copy:** mechanical em-dash pass on the transactional emails ([#1401](https://github.com/HartiganHM/concert-crawl/issues/1401)) ([a02a34a](https://github.com/HartiganHM/concert-crawl/commit/a02a34a9602e03111209bdb55be9b677f17a0728))

## [1.203.4](https://github.com/HartiganHM/concert-crawl/compare/v1.203.3...v1.203.4) (2026-08-03)


### Bug Fixes

* **crawler:** do not cache a failed browser launch ([e99d52c](https://github.com/HartiganHM/concert-crawl/commit/e99d52c171e0c8349fe33a51f6acc3386fcc5c81))
* **crawler:** log a failed Chromium launch and clarify two test names ([69c964c](https://github.com/HartiganHM/concert-crawl/commit/69c964c7ebffcc87f745e7737fdde88eb2fe0c00))
* **crawler:** memoize the browser thunk inside crawlVenue ([7c903e9](https://github.com/HartiganHM/concert-crawl/commit/7c903e91382495c56a9a2513da719504a04bc036))
* **crawler:** survive and report a killed crawl run ([6682f76](https://github.com/HartiganHM/concert-crawl/commit/6682f761ac2968e68bd0d2aa9b07b97c906ace29)), closes [#1352](https://github.com/HartiganHM/concert-crawl/issues/1352) [#1353](https://github.com/HartiganHM/concert-crawl/issues/1353)
* **web:** guard crawler-derived URLs on admin surfaces ([122fffc](https://github.com/HartiganHM/concert-crawl/commit/122fffcad04777a4fc04467d68271368666a15bc)), closes [#1264](https://github.com/HartiganHM/concert-crawl/issues/1264)
* **web:** name icon-only guarded links with visually hidden text ([1532366](https://github.com/HartiganHM/concert-crawl/commit/1532366db9a0918d683cb98843fcfb0bc8e36db3))
* **web:** space the pending stack off the headline card ([#1383](https://github.com/HartiganHM/concert-crawl/issues/1383)) ([3e6dd0f](https://github.com/HartiganHM/concert-crawl/commit/3e6dd0f14f52a2e59987bcb4f8e17dccc312fe7f))

## [1.203.3](https://github.com/HartiganHM/concert-crawl/compare/v1.203.2...v1.203.3) (2026-08-03)


### Bug Fixes

* **scripts:** make venue sync create-only, add --only scope ([c7b1330](https://github.com/HartiganHM/concert-crawl/commit/c7b1330dbd26b9f94e304e7bc97aee3a1a8ba8d9)), closes [#1337](https://github.com/HartiganHM/concert-crawl/issues/1337)

## [1.203.2](https://github.com/HartiganHM/concert-crawl/compare/v1.203.1...v1.203.2) (2026-08-03)


### Bug Fixes

* **web:** surface pending prices on tiers that already have a headline ([#1379](https://github.com/HartiganHM/concert-crawl/issues/1379)) ([f78b425](https://github.com/HartiganHM/concert-crawl/commit/f78b4258fa42c93b6c860eace8f8a6660278169a)), closes [#1377](https://github.com/HartiganHM/concert-crawl/issues/1377) [#1378](https://github.com/HartiganHM/concert-crawl/issues/1378)

## [1.203.1](https://github.com/HartiganHM/concert-crawl/compare/v1.203.0...v1.203.1) (2026-08-03)


### Bug Fixes

* **share:** stop the poster claiming attendance it never checked ([07dc6fc](https://github.com/HartiganHM/concert-crawl/commit/07dc6fceb974fee07e3ce3cae8f1a4601b6e543e))

# [1.203.0](https://github.com/HartiganHM/concert-crawl/compare/v1.202.0...v1.203.0) (2026-08-03)


### Bug Fixes

* **web:** gate the Passport share button on file support, not on the sheet existing ([41d098d](https://github.com/HartiganHM/concert-crawl/commit/41d098d2d0e0c7655b7c1127150c9f4077feb3b0))
* **web:** never record a Passport share the platform did not perform ([3ab0176](https://github.com/HartiganHM/concert-crawl/commit/3ab017688b687996db0fac1764e555ecc1a6e736))


### Features

* **web:** the Concert Passport page ([#85](https://github.com/HartiganHM/concert-crawl/issues/85), PR-5) ([eec7997](https://github.com/HartiganHM/concert-crawl/commit/eec79974cf7a73bc619c46c45a98693b4921d506))

# [1.202.0](https://github.com/HartiganHM/concert-crawl/compare/v1.201.3...v1.202.0) (2026-08-03)


### Bug Fixes

* **web:** derive passport date extremes in one pass and vary the card on cookie ([a7e1660](https://github.com/HartiganHM/concert-crawl/commit/a7e1660c751e1f34f3a9fc6f2328a92560cce60c))
* **web:** keep the passport stamp on weights the PNG can actually render ([942634e](https://github.com/HartiganHM/concert-crawl/commit/942634e9bace31559c7ccb251035893275c35a7e))
* **web:** pin the passport route runtime and stop sharing the empty stats object ([32dabfe](https://github.com/HartiganHM/concert-crawl/commit/32dabfe88770072b2794616710b54fcf33622b87))
* **web:** stamp the passport with Denver's year, not the server's ([6db4ec5](https://github.com/HartiganHM/concert-crawl/commit/6db4ec5e7256431365798e0c355898a7bcd8cb13)), closes [#596](https://github.com/HartiganHM/concert-crawl/issues/596)


### Features

* **web:** add the Concert Passport card and its PNG route ([1f94e1b](https://github.com/HartiganHM/concert-crawl/commit/1f94e1b1b003cb2f20cc934059d6b28e92222a14)), closes [#596](https://github.com/HartiganHM/concert-crawl/issues/596)

## [1.201.3](https://github.com/HartiganHM/concert-crawl/compare/v1.201.2...v1.201.3) (2026-08-03)


### Bug Fixes

* **web:** mark price staleness the same way on every surface ([#1372](https://github.com/HartiganHM/concert-crawl/issues/1372)) ([41c9f1b](https://github.com/HartiganHM/concert-crawl/commit/41c9f1b7543fe03e7a34bf38b44a435ebb3e77c3)), closes [#1366](https://github.com/HartiganHM/concert-crawl/issues/1366)
* **web:** offer a submit-price CTA once an event already has a price ([#1369](https://github.com/HartiganHM/concert-crawl/issues/1369)) ([ef88373](https://github.com/HartiganHM/concert-crawl/commit/ef8837375532a5b98ef7df7f18111d040f5d9819)), closes [#1364](https://github.com/HartiganHM/concert-crawl/issues/1364)

## [1.201.2](https://github.com/HartiganHM/concert-crawl/compare/v1.201.1...v1.201.2) (2026-08-03)


### Bug Fixes

* **api:** quote the cheapest tier on every price surface ([#1367](https://github.com/HartiganHM/concert-crawl/issues/1367)) ([c1dc572](https://github.com/HartiganHM/concert-crawl/commit/c1dc572b31f9836e1f563956b02abc033e49a7d1)), closes [#1365](https://github.com/HartiganHM/concert-crawl/issues/1365)

## [1.201.1](https://github.com/HartiganHM/concert-crawl/compare/v1.201.0...v1.201.1) (2026-08-03)


### Bug Fixes

* **crawler:** distinguish the two ticketure.ambiguous_start causes ([e89e84f](https://github.com/HartiganHM/concert-crawl/commit/e89e84f559f1477cb5edc2be7420c0dfcbb9a366))
* **crawler:** make the shared date helper reject impossible instants ([20323ca](https://github.com/HartiganHM/concert-crawl/commit/20323ca81d8863e07d163056b8dcbc6905c6bb91))
* **crawler:** match __NEXT_DATA__ regardless of attribute order, log bad slugs ([bb0f421](https://github.com/HartiganHM/concert-crawl/commit/bb0f421d148986ff159d94fd71b888bb60b59430))
* **crawler:** read Ticketure __NEXT_DATA__ so Meow Wolf yields events ([fb0ed9c](https://github.com/HartiganHM/concert-crawl/commit/fb0ed9c666392ad91d9e62929977f8f6472c3ee0)), closes [#1340](https://github.com/HartiganHM/concert-crawl/issues/1340)
* **crawler:** reject non-web schemes in Ticketure ticket links ([86cc396](https://github.com/HartiganHM/concert-crawl/commit/86cc39675f9e74a30734f33160b331f43e9d0c86))
* **crawler:** skip Ticketure rows whose start time is not a real instant ([69228f4](https://github.com/HartiganHM/concert-crawl/commit/69228f4291a8c2b01f6c894beaf585d3c877575c))

# [1.201.0](https://github.com/HartiganHM/concert-crawl/compare/v1.200.1...v1.201.0) (2026-08-03)


### Bug Fixes

* **admin:** hydrate candidate genres, calm the picker's save path ([9807156](https://github.com/HartiganHM/concert-crawl/commit/9807156938aba3f842ba8ff8ca96c2384c0fe5cc)), closes [#1345](https://github.com/HartiganHM/concert-crawl/issues/1345)
* **admin:** keep the corrected row on the matched tab, chunk genre hydration ([ce906f9](https://github.com/HartiganHM/concert-crawl/commit/ce906f991a00178e1b05b8fc7ad88169d77c004d))
* **share:** drop a hostless referrer and cover the funnel head ([cd12d98](https://github.com/HartiganHM/concert-crawl/commit/cd12d988e2d9419ca5dbb0bee9920d2756c8529d))
* **share:** normalise every site-origin source to a bare origin ([fdb0b11](https://github.com/HartiganHM/concert-crawl/commit/fdb0b119aa0279c0e0ca914ee7532b25c03eca53))
* **web:** key the public-view beacon by event, not by a once-only flag ([111c934](https://github.com/HartiganHM/concert-crawl/commit/111c93437bc4a2e4f42bbe21da9ff1ecae5df0c3))
* **web:** read the deployment host Vercel actually sets ([c48f777](https://github.com/HartiganHM/concert-crawl/commit/c48f7770b29b863519ecd418cb6e2fcc6dbcd13e))


### Features

* **web:** unfurl shared poster links and measure the share funnel ([b6c90ac](https://github.com/HartiganHM/concert-crawl/commit/b6c90ac7929737d6382e40b01f5bde308f478d11)), closes [#72](https://github.com/HartiganHM/concert-crawl/issues/72)

## [1.200.1](https://github.com/HartiganHM/concert-crawl/compare/v1.200.0...v1.200.1) (2026-08-03)


### Bug Fixes

* **e2e:** drop the /e/:id sweep entry that could never reach the mirror ([88b33b9](https://github.com/HartiganHM/concert-crawl/commit/88b33b9fbe300036891c2906f21a2814b906b2f6)), closes [#1359](https://github.com/HartiganHM/concert-crawl/issues/1359)
* **share:** give the poster preview a loading and error state ([ebed56b](https://github.com/HartiganHM/concert-crawl/commit/ebed56b7387f665b0dfa8eefb98243c6a5cb36d0)), closes [#72](https://github.com/HartiganHM/concert-crawl/issues/72)
* **share:** restart the share sheet on reopen instead of resuming ([45349dc](https://github.com/HartiganHM/concert-crawl/commit/45349dc14deea5824b867818ae22031c05db7c8c))
* **share:** size the preview frame to the selected shape ([8f6286c](https://github.com/HartiganHM/concert-crawl/commit/8f6286cfc3b073a678d9f1215add290776180674))
* **web:** don't re-adopt the poster url while the share sheet is closed ([a27954c](https://github.com/HartiganHM/concert-crawl/commit/a27954c0898c29add5b4d32a9d75baee72d24ed2))
* **web:** redraw the poster preview instead of replaying a stale outcome ([d60cb8d](https://github.com/HartiganHM/concert-crawl/commit/d60cb8d3a36717f2f8a885b435f7be432a20d9e5))

# [1.200.0](https://github.com/HartiganHM/concert-crawl/compare/v1.199.1...v1.200.0) (2026-08-03)


### Bug Fixes

* **share:** keep failed poster renders out of every cache ([a82c65b](https://github.com/HartiganHM/concert-crawl/commit/a82c65b035a96cf0d2d93bef63f415647830b708))
* **share:** keep the event link on the payload when the poster image is shared ([15b204e](https://github.com/HartiganHM/concert-crawl/commit/15b204edd5c7b10b4b64a4ed8d2e960d41af5c8b))
* **share:** key the poster ETag on every drawn field, drop unused previewAlt ([d6e83b4](https://github.com/HartiganHM/concert-crawl/commit/d6e83b456eee95c9c6b0534d55d05f43535a3e5a))
* **share:** make the poster fingerprint unambiguous and parse If-None-Match properly ([7419b97](https://github.com/HartiganHM/concert-crawl/commit/7419b97630f06ea9450380a20827af996acb87ff))
* **share:** split 404 from 502 on the poster route and honour the active theme ([abd03d2](https://github.com/HartiganHM/concert-crawl/commit/abd03d2a98f7768caa6d8dd9c8aed716b56921b1))


### Features

* **web:** shareable poster cards — PNG route, poster renderer, share sheet ([#72](https://github.com/HartiganHM/concert-crawl/issues/72)) ([78f1e06](https://github.com/HartiganHM/concert-crawl/commit/78f1e06685199b63cf6e1c1d7e6af35ad7271467))

## [1.199.1](https://github.com/HartiganHM/concert-crawl/compare/v1.199.0...v1.199.1) (2026-08-03)


### Bug Fixes

* **artists:** ask events, not the rendered lists, whether an artist is real ([aacc859](https://github.com/HartiganHM/concert-crawl/commit/aacc859a209bc535844441d50b963a202ad80aee))
* **artists:** stop projecting artist pages for admin-hidden events ([25f3004](https://github.com/HartiganHM/concert-crawl/commit/25f3004073a5b0cc2028d924ee8abb852c8d2297)), closes [#1343](https://github.com/HartiganHM/concert-crawl/issues/1343)

# [1.199.0](https://github.com/HartiganHM/concert-crawl/compare/v1.198.0...v1.199.0) (2026-08-03)


### Bug Fixes

* **admin:** clear stale candidates on a new search and stop empty submits ([4563496](https://github.com/HartiganHM/concert-crawl/commit/4563496e171b165de8da9cbb06b5376878e6ab3f))
* **admin:** close the candidate picker when the status tab changes ([223f18d](https://github.com/HartiganHM/concert-crawl/commit/223f18df6fdeea2b9ba5b69a9d7f71238850423b))
* **admin:** log Spotify candidate failures, drop empty img src, correct param name in docstring ([1839e5a](https://github.com/HartiganHM/concert-crawl/commit/1839e5a18cd7e8d8a0de94865feda78047f75add))
* **admin:** tell an admin when Spotify rejected our credentials ([94cd856](https://github.com/HartiganHM/concert-crawl/commit/94cd856d616bd77b8fb30cbe0c5f6249ae2640a4))
* **api:** guard Spotify candidate URLs with the http(s) scheme check ([b8e7f47](https://github.com/HartiganHM/concert-crawl/commit/b8e7f471208ccc2da5b62c9fef02a4c17a3f44c2))


### Features

* **admin:** show Spotify candidates so ambiguous artists can be resolved without pasting ids ([e73d877](https://github.com/HartiganHM/concert-crawl/commit/e73d87767b39dff9b82ab2f964a47917799443ce)), closes [#1345](https://github.com/HartiganHM/concert-crawl/issues/1345)

# [1.198.0](https://github.com/HartiganHM/concert-crawl/compare/v1.197.0...v1.198.0) (2026-08-02)


### Bug Fixes

* **venues:** add release note for The Junkyard, clarify seed comment ([92932d5](https://github.com/HartiganHM/concert-crawl/commit/92932d5b29b5225a255ee3830c792022f68e2c92))


### Features

* **venues:** onboard The Junkyard ([4dc1702](https://github.com/HartiganHM/concert-crawl/commit/4dc1702b8fc527796a0d4b6a6dce37d1b1b208d1))

# [1.197.0](https://github.com/HartiganHM/concert-crawl/compare/v1.196.0...v1.197.0) (2026-08-02)


### Bug Fixes

* **web:** log public-event fetch failures and validate the id first ([8351ab4](https://github.com/HartiganHM/concert-crawl/commit/8351ab4668be3f7b7e932d4331d3d3eb31cccf17))
* **web:** match the API's UUID contract in the /e/:id guard ([875c30f](https://github.com/HartiganHM/concert-crawl/commit/875c30f84c6052501686cee288664d48dada6945))
* **web:** render a read-only price row on the public mirror ([ce4432c](https://github.com/HartiganHM/concert-crawl/commit/ce4432ce09abd8225d09d471782980d2546a420c))


### Features

* **web:** add public /e/:id event mirror for shared links ([36234fb](https://github.com/HartiganHM/concert-crawl/commit/36234fbb75650512eac381e43148f8acbd2667f5)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794)

# [1.196.0](https://github.com/HartiganHM/concert-crawl/compare/v1.195.0...v1.196.0) (2026-08-02)


### Bug Fixes

* **crawler:** capture rendered HTML when waitForSelector times out ([a455522](https://github.com/HartiganHM/concert-crawl/commit/a4555229ff1c0366b13bac03b6d3cc799554e25f)), closes [#1340](https://github.com/HartiganHM/concert-crawl/issues/1340) [#1340](https://github.com/HartiganHM/concert-crawl/issues/1340)
* **crawler:** carry selector and URL in the timeout error message ([751e207](https://github.com/HartiganHM/concert-crawl/commit/751e207a9f4c95771b1653c9bac30a32e2a17217))
* **crawler:** guard debug capture on null, not falsiness ([7e09354](https://github.com/HartiganHM/concert-crawl/commit/7e0935496279ed5f0f2f69588f052d2f7903b456))
* **crawler:** log non-timeout selector errors, skip empty debug capture ([78645f9](https://github.com/HartiganHM/concert-crawl/commit/78645f9a4097930f713b8ee22e211b24a46897b2))
* **crawler:** log why HTML capture failed after a selector timeout ([9011472](https://github.com/HartiganHM/concert-crawl/commit/9011472083d9d8e176fdb35bba7b0d921d417484))
* **crawler:** only wrap genuine selector timeouts ([b5bcdb4](https://github.com/HartiganHM/concert-crawl/commit/b5bcdb4cadcabd17a32443116665b88a4c7f0057))


### Features

* **web:** add the [#72](https://github.com/HartiganHM/concert-crawl/issues/72) share print render kit ([3fee10c](https://github.com/HartiganHM/concert-crawl/commit/3fee10c74a04fb5c856e141bcf07db23d795c428))

# [1.195.0](https://github.com/HartiganHM/concert-crawl/compare/v1.194.1...v1.195.0) (2026-08-02)


### Features

* **admin:** hide non-artist rows from the public artist pages ([2bf1b71](https://github.com/HartiganHM/concert-crawl/commit/2bf1b711809f33e584136d437d5f5ddf98eee6c5)), closes [#1342](https://github.com/HartiganHM/concert-crawl/issues/1342)

## [1.194.1](https://github.com/HartiganHM/concert-crawl/compare/v1.194.0...v1.194.1) (2026-08-02)


### Bug Fixes

* **crawler:** decode HTML entities in event titles ([5fd20ca](https://github.com/HartiganHM/concert-crawl/commit/5fd20ca3d743e170c2adcbb922a8b9d5e000fdf6)), closes [#8217](https://github.com/HartiganHM/concert-crawl/issues/8217) [#8211](https://github.com/HartiganHM/concert-crawl/issues/8211) [#8217](https://github.com/HartiganHM/concert-crawl/issues/8217) [#827](https://github.com/HartiganHM/concert-crawl/issues/827) [#8217](https://github.com/HartiganHM/concert-crawl/issues/8217) [#1338](https://github.com/HartiganHM/concert-crawl/issues/1338)
* **crawler:** fall back to title when rawTitle is absent ([756b0f0](https://github.com/HartiganHM/concert-crawl/commit/756b0f0b1657bffa2e0a38c465f37984b14abeab))
* **scripts:** correct no-op headline and rawTitle comment ([b8ca646](https://github.com/HartiganHM/concert-crawl/commit/b8ca646684a7e5b2540a4be56c179f015136c25e))

# [1.194.0](https://github.com/HartiganHM/concert-crawl/compare/v1.193.1...v1.194.0) (2026-08-02)


### Bug Fixes

* **scripts:** distinguish SQL NULL from empty string in the venue diff ([ac7b367](https://github.com/HartiganHM/concert-crawl/commit/ac7b367e4ff8792323588528bbabf8be4f2042c2))
* **scripts:** make active/featured/verified create-only in the venue sync ([9159643](https://github.com/HartiganHM/concert-crawl/commit/9159643945d59cea8709fd6ffb59224642dc92ee))
* **scripts:** model the address COALESCE in the venue sync diff ([d24ac43](https://github.com/HartiganHM/concert-crawl/commit/d24ac43cde9ae50a4727acdf811a1b914e4308e1))


### Features

* **scripts:** add venue-only prod sync from SEED_VENUES ([db1ec59](https://github.com/HartiganHM/concert-crawl/commit/db1ec599a0d126ff5684ec1d506b8d510e029116))

## [1.193.1](https://github.com/HartiganHM/concert-crawl/compare/v1.193.0...v1.193.1) (2026-08-02)


### Bug Fixes

* **web:** stop promising that following an artist fills your Watching ([fac318b](https://github.com/HartiganHM/concert-crawl/commit/fac318bc4c7d926acbc3c56f85d6fc1a2a25acce)), closes [#1306](https://github.com/HartiganHM/concert-crawl/issues/1306)

# [1.193.0](https://github.com/HartiganHM/concert-crawl/compare/v1.192.0...v1.193.0) (2026-08-02)


### Bug Fixes

* **search:** count cancelled/postponed as upcoming, clear stale results ([9790d9e](https://github.com/HartiganHM/concert-crawl/commit/9790d9ec69f7a206cebb63243403a68e3b417134)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)


### Features

* **web:** artist page entry points — event detail + search ([#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)) ([8f61956](https://github.com/HartiganHM/concert-crawl/commit/8f619568bfa1607dad59d05b35a6079fa458cb13))

# [1.192.0](https://github.com/HartiganHM/concert-crawl/compare/v1.191.1...v1.192.0) (2026-08-02)


### Bug Fixes

* **artist-page:** drop the "shows are below" pointer when nothing follows ([4970b78](https://github.com/HartiganHM/concert-crawl/commit/4970b7810f5809b35c60b06f8763d41d97d9345d))
* **artist-page:** drop the right-side bleed on the run-group link ([1e6ede4](https://github.com/HartiganHM/concert-crawl/commit/1e6ede4014a5fc0b0b563e4b075163df321f6292))
* **artist-page:** lazy-load the tier picker and correct the viewport-hook comment ([affcda1](https://github.com/HartiganHM/concert-crawl/commit/affcda161e2d03ed5d42e93c83345573d0ae8642))
* **artist-page:** restore the Follow control's focus ring after all:unset ([3de1356](https://github.com/HartiganHM/concert-crawl/commit/3de1356925076901fe070df596cafe2f97277495))
* **artist-page:** roll back unreadable follow responses and make the skip link move focus ([c4dd3f1](https://github.com/HartiganHM/concert-crawl/commit/c4dd3f10242df90a4b61787664fa825da5d759c3))
* **artist-page:** stop the show row link bleeding under the Watch control ([288b196](https://github.com/HartiganHM/concert-crawl/commit/288b19684c41e624ffc2fe7dead468cdf19947a2))


### Features

* **artist-page:** follow, watch rows, sticky bar and the empty state ([4090a18](https://github.com/HartiganHM/concert-crawl/commit/4090a1854b39e23099478819a53d3ea616cbb9be)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)


### Performance Improvements

* **artist-page:** write scroll state only on threshold crossings ([7f4c95a](https://github.com/HartiganHM/concert-crawl/commit/7f4c95aad42b37db62de0e9098268f1e619b2fed))

## [1.191.1](https://github.com/HartiganHM/concert-crawl/compare/v1.191.0...v1.191.1) (2026-08-02)


### Bug Fixes

* **notifications:** size the sheet and give it a way out ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([9d28d8f](https://github.com/HartiganHM/concert-crawl/commit/9d28d8ffbe0c4b4f547135594585cf8ab0eee3f0))

# [1.191.0](https://github.com/HartiganHM/concert-crawl/compare/v1.190.1...v1.191.0) (2026-08-02)


### Bug Fixes

* **notifications:** announce unread after the pip clears ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([6d034ed](https://github.com/HartiganHM/concert-crawl/commit/6d034ede1c497e93a04a5571f0783cd6a6fb24ec))
* **notifications:** close four defects found by the runtime gates ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([c3ef65e](https://github.com/HartiganHM/concert-crawl/commit/c3ef65e9e7108cb7cde407733727e51404313522))
* **notifications:** close the three Gate 4 design-review gaps ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([d1b1354](https://github.com/HartiganHM/concert-crawl/commit/d1b1354f554f86c7bd377560d087d25035b5663c))


### Features

* **notifications:** mount the panel in the account menu chrome ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([4acec60](https://github.com/HartiganHM/concert-crawl/commit/4acec6091668d7d431fa34cf67cc5345c1e12d4f))

## [1.190.1](https://github.com/HartiganHM/concert-crawl/compare/v1.190.0...v1.190.1) (2026-08-02)


### Bug Fixes

* **db:** add CLI runner so deployed environments can backfill artists ([c330d74](https://github.com/HartiganHM/concert-crawl/commit/c330d74a19203d05f48fbbcecd4807f8e5c1eada)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)
* **db:** run the artists backfill only as the process entrypoint ([52da297](https://github.com/HartiganHM/concert-crawl/commit/52da2974e185884f840a76d7c9cc9512c02640ea)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)

# [1.190.0](https://github.com/HartiganHM/concert-crawl/compare/v1.189.1...v1.190.0) (2026-08-02)


### Bug Fixes

* **artist-page:** address Copilot round 1 on the artist route ([bb0dba9](https://github.com/HartiganHM/concert-crawl/commit/bb0dba999639d5dc80ba16f17b2f9831dae5f382))
* **artist-page:** align the route skeleton with the page it stands in for ([8362e9b](https://github.com/HartiganHM/concert-crawl/commit/8362e9bd76c4d7d14dc2e72e7d550062b2313b5c))
* **artist-page:** close 12 design-table gaps on the artist route ([73f14cb](https://github.com/HartiganHM/concert-crawl/commit/73f14cbd809a60298a7873b6c9c26f02369e7126))
* **artist-page:** cluster residencies by venue slug, not venue name ([d9e90a7](https://github.com/HartiganHM/concert-crawl/commit/d9e90a761494fbe16f7d1f82d4ec3013a9a9a50e))
* **artist-page:** derive test dir from import.meta.url, narrow map comment ([c716b0d](https://github.com/HartiganHM/concert-crawl/commit/c716b0ddad53bbb1ab37dac1fece84ea5982cfe3))
* **artist-page:** route date and price display through shared formatters ([a066c57](https://github.com/HartiganHM/concert-crawl/commit/a066c573a30bdcb6ca28f2d15030d4d706b98360))
* **artists:** make show grouping safe under noUncheckedIndexedAccess ([119b330](https://github.com/HartiganHM/concert-crawl/commit/119b33023a5b3c3be1264aab2b26ee1c5e8b6da5))
* **seed:** anchor the canonical-artist guard instead of slicing to .returning ([f7f2e2e](https://github.com/HartiganHM/concert-crawl/commit/f7f2e2e3676f7583296c634b74bf1f158d2cac8a))
* **seed:** populate canonical_artist so the artists projection is non-empty ([efa822e](https://github.com/HartiganHM/concert-crawl/commit/efa822eb19bdae641d4e41e280a9cd840e9e3f0c))
* **web:** close the reduced-motion media block in globals.css ([ae04fa6](https://github.com/HartiganHM/concert-crawl/commit/ae04fa67b53a42dc7926bbebdcb0df8248519eb0))
* **web:** make the error boundary "Try again" button actually retry ([3fe812f](https://github.com/HartiganHM/concert-crawl/commit/3fe812f9110083dde1bbce9a65ea9b6b36c1994d))


### Features

* **artist-page:** add ArtistPlate with a render-time photo fallback ([d93aadd](https://github.com/HartiganHM/concert-crawl/commit/d93aaddd2b1a81987b3ed1b299a64f3f62a48a6a))
* **artist-page:** add section head, skeletons and the previously list ([9051854](https://github.com/HartiganHM/concert-crawl/commit/9051854d943a77c7e186973e0251d94c471a4fde))
* **artist-page:** add the upcoming shows list with residency grouping ([a8cbd66](https://github.com/HartiganHM/concert-crawl/commit/a8cbd66c0a7c1b8d1547e30cd024a9b02fc75853))
* **artist-page:** definitions — copy, constants and show item types ([56c3b6c](https://github.com/HartiganHM/concert-crawl/commit/56c3b6c98c974cce803a1467f6ed8617a1f10c95))
* **artists:** add the artist page route, shell and styles ([5d016a6](https://github.com/HartiganHM/concert-crawl/commit/5d016a6b8da7e67b2a0ff584e45bd19b9ead852d)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794)
* **artists:** keep cancelled and postponed upcoming shows, scope the follow read ([c369c7e](https://github.com/HartiganHM/concert-crawl/commit/c369c7e654720294c437dc2bea43fc831a1d1dcb))
* **artists:** open /artists once public browse launches ([802b0f0](https://github.com/HartiganHM/concert-crawl/commit/802b0f00facbab7cd63ebcfe2cf3cebd453217a0)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794)
* **web:** add a not-found boundary inside the app shell ([28a4272](https://github.com/HartiganHM/concert-crawl/commit/28a4272ead4432aac3cbab67e43deee298242ddf))

## [1.189.1](https://github.com/HartiganHM/concert-crawl/compare/v1.189.0...v1.189.1) (2026-08-02)


### Bug Fixes

* **venue-guide:** polish the returner guide from a cold-eyes pass ([bad101a](https://github.com/HartiganHM/concert-crawl/commit/bad101a62809ee9d99e70ffe7c9526850afb5b8a)), closes [#764](https://github.com/HartiganHM/concert-crawl/issues/764) [#764](https://github.com/HartiganHM/concert-crawl/issues/764)
* **venue-guide:** return focus to the toggle when the footer collapse unmounts ([6da2f86](https://github.com/HartiganHM/concert-crawl/commit/6da2f869248a8399e94ac7e5a68835ec27b3da53))

# [1.189.0](https://github.com/HartiganHM/concert-crawl/compare/v1.188.0...v1.189.0) (2026-08-02)


### Bug Fixes

* **737:** drop button semantics from an unwired row, tighten unreadCount ([9ec3fb1](https://github.com/HartiganHM/concert-crawl/commit/9ec3fb1fe1c45de62981a0a20304de1dde039be7))
* **737:** drop notif-row styling from an unwired row ([57faa42](https://github.com/HartiganHM/concert-crawl/commit/57faa42ee0dccd27e7a2169578575be4954be04b))
* **737:** never render a control whose handler is unwired ([9104172](https://github.com/HartiganHM/concert-crawl/commit/91041724d38eec825a4181ff5d9fbe1701a0962d))
* **737:** reject unparseable timestamps, guard key auto-repeat ([17a5284](https://github.com/HartiganHM/concert-crawl/commit/17a528436c4ba65b25b8be69f94297e13d12ccc6))
* **notifications:** constrain actionUrl, fix window-wide unread decrement ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([463e70c](https://github.com/HartiganHM/concert-crawl/commit/463e70cea11b0953eaea6fd475ee74b3c5c44708))
* **notifications:** skip a malformed row instead of blanking the panel ([691d026](https://github.com/HartiganHM/concert-crawl/commit/691d02650da4628e99ddf2f231be69dbb40990f5))
* **notifications:** stop an unpaginatable hasMore looping the load-more ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([d7c3393](https://github.com/HartiganHM/concert-crawl/commit/d7c3393f3d8bcba29070b59e16395394db256f84))
* **notifications:** treat an empty-string cursor as no cursor everywhere ([3cdc492](https://github.com/HartiganHM/concert-crawl/commit/3cdc492befac73f10f646a59d9b5b059de1d6a5c))
* **notifications:** validate counts and watermarks at every write boundary ([efb4b51](https://github.com/HartiganHM/concert-crawl/commit/efb4b519a3e332a94c56a1f1739a342b88297673))
* **notifications:** zero the header count optimistically on mark-all-read ([15e9b33](https://github.com/HartiganHM/concert-crawl/commit/15e9b3336a9f398d193ab4c409d60972f3633c44))


### Features

* **notifications:** panel components, category map and query hook ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([192b4b0](https://github.com/HartiganHM/concert-crawl/commit/192b4b0640a96d7d41676c907d30d0ac884a358b))

# [1.188.0](https://github.com/HartiganHM/concert-crawl/compare/v1.187.0...v1.188.0) (2026-08-02)


### Bug Fixes

* **venues:** a returner has been, not is going ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([6d5f780](https://github.com/HartiganHM/concert-crawl/commit/6d5f780ed1dc821e50526e2e32f7179e89e850e5))
* **venues:** describe the returner toggle with its preview text ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([1b35d3b](https://github.com/HartiganHM/concert-crawl/commit/1b35d3b738baa70d2b5e0270a31efaa4b772083a))


### Features

* **api:** resolve viewerHasAttended for first-timer detection ([#764](https://github.com/HartiganHM/concert-crawl/issues/764), depends on [#70](https://github.com/HartiganHM/concert-crawl/issues/70)) ([3c112d1](https://github.com/HartiganHM/concert-crawl/commit/3c112d1b48afb2b9871df9d42ec5025b93fbd03e))
* **venues:** collapse the first-timer guide for returners ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([0e7c5de](https://github.com/HartiganHM/concert-crawl/commit/0e7c5dea0343651b5630638da08c4aa3f4e24c41))

# [1.187.0](https://github.com/HartiganHM/concert-crawl/compare/v1.186.0...v1.187.0) (2026-08-02)


### Bug Fixes

* **web:** act on the cold-eyes review of the first-timer guide ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([6896409](https://github.com/HartiganHM/concert-crawl/commit/6896409ea962bc539a83447ceda937b7f504eb5c))
* **web:** close the Gate 4 design-table gaps on the first-timer guide ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([6578eff](https://github.com/HartiganHM/concert-crawl/commit/6578eff123997f7ac38e30bce6c9af2c9336595a))
* **web:** keep the thin-guide footer off a populated guide ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([cfda04e](https://github.com/HartiganHM/concert-crawl/commit/cfda04eb9beb9e149fd5a04e1708857287c0874f))
* **web:** scroll to the guide on a client-side jump from the event chip ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([6840b8a](https://github.com/HartiganHM/concert-crawl/commit/6840b8ae29d1d548a839ab0d6958d053486ceeb3))


### Features

* **api:** serve published venue guide on the public venue endpoint ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([86c0cc6](https://github.com/HartiganHM/concert-crawl/commit/86c0cc606d6d8a127c4daf6a05f77378e77c88ce))
* **web:** event-detail first-timer chip anchoring to the venue guide ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([2b19130](https://github.com/HartiganHM/concert-crawl/commit/2b1913022bca1644c170ade9948ce10199013eb7))
* **web:** mount first-timer guide on the venue profile, drop the map placeholder ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([cccf1b0](https://github.com/HartiganHM/concert-crawl/commit/cccf1b0509115780fc3ac7355c692b43de575ac3))
* **web:** venue first-timer guide consumer components ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([6a30399](https://github.com/HartiganHM/concert-crawl/commit/6a30399aeec605b0bf84c6139bbed88eec59c169))

# [1.186.0](https://github.com/HartiganHM/concert-crawl/compare/v1.185.0...v1.186.0) (2026-08-02)


### Features

* **notifications:** consumer read path for in-app notifications ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) ([d9a07c9](https://github.com/HartiganHM/concert-crawl/commit/d9a07c98f4171792d3388de17bdef30a4b7febdb))

# [1.185.0](https://github.com/HartiganHM/concert-crawl/compare/v1.184.0...v1.185.0) (2026-08-02)


### Bug Fixes

* **artists:** bound slug generation at the length the routes accept ([957a472](https://github.com/HartiganHM/concert-crawl/commit/957a4722f114a242050e6724ce67588009b31a35))
* **artists:** drop the stale beta gate and type the cancelled-show filter ([3e213ab](https://github.com/HartiganHM/concert-crawl/commit/3e213ab5d10807834fc190f6c1b1c424fabafa8c))
* **artists:** make the manual follow insert idempotent under concurrency ([eb0c4b7](https://github.com/HartiganHM/concert-crawl/commit/eb0c4b79aea175881c5cc15f933b5a013c91dc52))
* **follows:** guarantee manual-follow uniqueness with a partial index ([5e0e935](https://github.com/HartiganHM/concert-crawl/commit/5e0e9353c1046295484220e55a4b178939dc079d))
* **follows:** report the effective follow state after unfollow ([4dc31e4](https://github.com/HartiganHM/concert-crawl/commit/4dc31e4b1439af038fc9d538a4ce481a0994665d))


### Features

* **api:** artist detail endpoint + follow writes ([#1115](https://github.com/HartiganHM/concert-crawl/issues/1115) PR-D) ([c29746f](https://github.com/HartiganHM/concert-crawl/commit/c29746f08ce95b737652b3eadfe1113e20ac4482))

# [1.184.0](https://github.com/HartiganHM/concert-crawl/compare/v1.183.0...v1.184.0) (2026-08-02)


### Bug Fixes

* **admin:** keep the whole guide surface inert when the draft failed to load ([3a37b30](https://github.com/HartiganHM/concert-crawl/commit/3a37b3040b4849ec43cbc4ec49c7ec18fd9be88a))
* **admin:** make insiderTip required and guard every guide action on pending ([71541a1](https://github.com/HartiganHM/concert-crawl/commit/71541a1d694510c396975362993abc35c8d535c8))
* **admin:** make the placeholder switch genuinely inert and move quotes into copy ([574723e](https://github.com/HartiganHM/concert-crawl/commit/574723e4f9e7737d09d9ea341d9f433c10d970e6))
* **admin:** withhold non-ApiError messages from the guide action results ([9100160](https://github.com/HartiganHM/concert-crawl/commit/9100160741084ede66a62e955f83c32cdf0e93d7))
* **api:** validate the guide venue id and scope the chip delete ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([e359fb3](https://github.com/HartiganHM/concert-crawl/commit/e359fb3d64d0121c046683fdcaa721b18da015a4))
* **artists:** address Copilot review round 1 on the match pipeline ([2def1b7](https://github.com/HartiganHM/concert-crawl/commit/2def1b7add6849e8fac2c63efb058ec25b558695))
* **artists:** address Copilot round 2 on the admin match queue ([5a732b0](https://github.com/HartiganHM/concert-crawl/commit/5a732b01d86e37a3a1a43e1c2952f98767ade8d4))
* **artists:** drop the cached photo when an identity is repointed ([9648334](https://github.com/HartiganHM/concert-crawl/commit/9648334ae8dbce8f2d680f7415f746f40a394c90))
* **spotify:** never treat Retry-After: 0 as an immediate retry ([7bb3480](https://github.com/HartiganHM/concert-crawl/commit/7bb34808897810823fd77fafdbff1ccd57a04e18))
* **web:** guard guide authoring behind a successful load; wire ⌘↵ and field caps ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([1ccddc9](https://github.com/HartiganHM/concert-crawl/commit/1ccddc9704484fc3e08c1fbf12aac025328e512f))
* **web:** keep guide auth failures inside the action; flag failed saves ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([dbd216b](https://github.com/HartiganHM/concert-crawl/commit/dbd216b75ce072265321494fdb274af78ae6a47c))


### Features

* **api:** admin venue guide save + publish endpoints with audit logging ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([76a9b81](https://github.com/HartiganHM/concert-crawl/commit/76a9b81d678bd3afa7c7fc592b146c3a2180e45c))
* **api:** schedule the artist match job on Render ([9e5e592](https://github.com/HartiganHM/concert-crawl/commit/9e5e592aa6a2cd52d6411ae2c784afc2f82a6461))
* **artists:** spotify identity match via client-credentials app token ([599a65e](https://github.com/HartiganHM/concert-crawl/commit/599a65e91a47f1daf72ca249d302f98a0c74b54a)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)
* **web:** admin first-timer guide authoring block ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([56ae064](https://github.com/HartiganHM/concert-crawl/commit/56ae06432dd7f75a9b0ea598b3329dfa17b05c1a))
* **web:** venue guide server actions + admin copy ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([923cd65](https://github.com/HartiganHM/concert-crawl/commit/923cd65f8aaafe396241c0335b7cdb883a0327ba))

# [1.183.0](https://github.com/HartiganHM/concert-crawl/compare/v1.182.1...v1.183.0) (2026-08-02)


### Features

* **db:** add artists projection table, slug derivation, backfill and crawler write-through ([fb08721](https://github.com/HartiganHM/concert-crawl/commit/fb087211790b8defd4f765db49d4f70b259849ce)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)


### Performance Improvements

* **crawler:** narrow artist projection lookup to candidate names and colliding slugs ([9e120e2](https://github.com/HartiganHM/concert-crawl/commit/9e120e21b0a7776678246dcc4ff209e6e146afae))

## [1.182.1](https://github.com/HartiganHM/concert-crawl/compare/v1.182.0...v1.182.1) (2026-08-02)


### Bug Fixes

* **a11y:** extract shared BackChip with a 44px hit area ([491d459](https://github.com/HartiganHM/concert-crawl/commit/491d45964cd02cd444d4fb2e3fe14c4c7e48285a)), closes [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)
* **venues:** move copy alias below imports on venue profile page ([26a1f99](https://github.com/HartiganHM/concert-crawl/commit/26a1f99b88b828919032984b13c3e7b303f5d212))

# [1.182.0](https://github.com/HartiganHM/concert-crawl/compare/v1.181.0...v1.182.0) (2026-08-02)


### Bug Fixes

* **db:** clarify seed publish scope + rename chip index handle ([7020516](https://github.com/HartiganHM/concert-crawl/commit/7020516e490a88eabdd38d9c2c11cd0f57d647a6))
* **db:** wrap guide seed replace in a transaction; align guide-null docs and fixture venue name ([bacce4c](https://github.com/HartiganHM/concert-crawl/commit/bacce4ca5ac9d9a99713c04631dfcdc79fd45df6))


### Features

* **db:** seed venue guide fixtures for populated/thin/placeholder states ([3291839](https://github.com/HartiganHM/concert-crawl/commit/3291839e7a484ad9cdfd6566bfd477fb150fc7b9))
* **db:** venue_guide_chips table + insider_tip / guide_published_at on venues ([#764](https://github.com/HartiganHM/concert-crawl/issues/764)) ([8ae913d](https://github.com/HartiganHM/concert-crawl/commit/8ae913d9708b891a658553cf319446226397d237))
* **types:** venue first-timer guide chip pool, chip-state + publish-state derivation ([2afe8c2](https://github.com/HartiganHM/concert-crawl/commit/2afe8c2e538723347381c3e9126035d7c3711243))

# [1.181.0](https://github.com/HartiganHM/concert-crawl/compare/v1.180.0...v1.181.0) (2026-08-02)


### Features

* **db:** onboard Meow Wolf Denver ([e102a7a](https://github.com/HartiganHM/concert-crawl/commit/e102a7a008a1ed481cf52950fed56efa20940fea)), closes [#1289](https://github.com/HartiganHM/concert-crawl/issues/1289)

# [1.180.0](https://github.com/HartiganHM/concert-crawl/compare/v1.179.1...v1.180.0) (2026-08-02)


### Bug Fixes

* **db:** set crawlWaitUntil explicitly on the two new venues ([8f53d0b](https://github.com/HartiganHM/concert-crawl/commit/8f53d0b37fc6c797bee4912db7eb8feeee11c043))


### Features

* **crawler:** onboard Globe Hall and Lost Lake Lounge ([a19bb73](https://github.com/HartiganHM/concert-crawl/commit/a19bb73e6c892a20535b4fd7d5dc010a80c21819)), closes [#1288](https://github.com/HartiganHM/concert-crawl/issues/1288)

## [1.179.1](https://github.com/HartiganHM/concert-crawl/compare/v1.179.0...v1.179.1) (2026-08-02)


### Bug Fixes

* **api:** 404 inactive venues from the public detail route ([1b1d22f](https://github.com/HartiganHM/concert-crawl/commit/1b1d22f68f7c9685c6c870ecaf41a756e3fb90fd)), closes [#1292](https://github.com/HartiganHM/concert-crawl/issues/1292)
* **api:** validate the venue slug param with Zod ([a3e02df](https://github.com/HartiganHM/concert-crawl/commit/a3e02dfb9f9052bcbb55c897293d44beed64f2ee))

# [1.179.0](https://github.com/HartiganHM/concert-crawl/compare/v1.178.7...v1.179.0) (2026-08-01)


### Features

* **crawler:** onboard The Oriental Theater ([e0a8ebc](https://github.com/HartiganHM/concert-crawl/commit/e0a8ebca53a2b1c87d6bbaa1245a6eb8b4f5b8a2))

## [1.178.7](https://github.com/HartiganHM/concert-crawl/compare/v1.178.6...v1.178.7) (2026-08-01)


### Bug Fixes

* **crawler:** catch cross-venue shows at venues we don't crawl ([401bcc2](https://github.com/HartiganHM/concert-crawl/commit/401bcc2da8ab7c64af4f1a92aecfe0e84bf28d75)), closes [#1286](https://github.com/HartiganHM/concert-crawl/issues/1286)
* **crawler:** keep the first segment of scheme-less ticket hrefs ([024f4f3](https://github.com/HartiganHM/concert-crawl/commit/024f4f3154a8d08ce1b0db7bbf363b2c1022535a))
* **crawler:** strip the host from protocol-relative ticket URLs ([4bc1420](https://github.com/HartiganHM/concert-crawl/commit/4bc1420ef2a860811babee64e60875a70753a394))

## [1.178.6](https://github.com/HartiganHM/concert-crawl/compare/v1.178.5...v1.178.6) (2026-08-01)


### Bug Fixes

* **web:** drop the duplicate account-menu trigger from the mobile header ([#1293](https://github.com/HartiganHM/concert-crawl/issues/1293)) ([52803b9](https://github.com/HartiganHM/concert-crawl/commit/52803b961bc86c142c7fe37f186745d8b640a19e))

## [1.178.5](https://github.com/HartiganHM/concert-crawl/compare/v1.178.4...v1.178.5) (2026-08-01)


### Bug Fixes

* **history:** polish Concert History from the staging walk ([#1290](https://github.com/HartiganHM/concert-crawl/issues/1290)) ([0728796](https://github.com/HartiganHM/concert-crawl/commit/0728796d43c8f2d4f638b8fb34ffa0b5ef0d66e7))

## [1.178.4](https://github.com/HartiganHM/concert-crawl/compare/v1.178.3...v1.178.4) (2026-08-01)


### Bug Fixes

* **consumer:** account menu from bottom nav, centered sheet on desktop ([#1291](https://github.com/HartiganHM/concert-crawl/issues/1291)) ([bd4ecfc](https://github.com/HartiganHM/concert-crawl/commit/bd4ecfcc4f9559381a866d8ad199bf957548f537))

## [1.178.3](https://github.com/HartiganHM/concert-crawl/compare/v1.178.2...v1.178.3) (2026-08-01)


### Bug Fixes

* **web:** open the changelog and gate price submission before the form ([#1283](https://github.com/HartiganHM/concert-crawl/issues/1283)) ([7919c24](https://github.com/HartiganHM/concert-crawl/commit/7919c24f25d16bbe787ac6031cce00261c576095))

## [1.178.2](https://github.com/HartiganHM/concert-crawl/compare/v1.178.1...v1.178.2) (2026-08-01)


### Bug Fixes

* **web:** cut copy the UI already says, explain the disabled Continue ([#1280](https://github.com/HartiganHM/concert-crawl/issues/1280)) ([97fcb4b](https://github.com/HartiganHM/concert-crawl/commit/97fcb4b44dfd74087478bd59b89af2e64aa33107)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794)
* **web:** one eye affordance everywhere, portal the gate, and name the reach ([#1282](https://github.com/HartiganHM/concert-crawl/issues/1282)) ([3676b71](https://github.com/HartiganHM/concert-crawl/commit/3676b711e1d5c57a51ef4349e1dd243fe43dddcc))
* **web:** stop landing pager dots growing and make the hover arrow advance ([#1281](https://github.com/HartiganHM/concert-crawl/issues/1281)) ([de3bd6f](https://github.com/HartiganHM/concert-crawl/commit/de3bd6f45ad279a9ba85f2487ea93d91796c04b8))

## [1.178.1](https://github.com/HartiganHM/concert-crawl/compare/v1.178.0...v1.178.1) (2026-08-01)


### Bug Fixes

* **admin:** restore the Add venue button on desktop ([b281c64](https://github.com/HartiganHM/concert-crawl/commit/b281c641e2b62ac8a1b843b8347bb6d8e0d8a97d))

# [1.178.0](https://github.com/HartiganHM/concert-crawl/compare/v1.177.0...v1.178.0) (2026-07-31)


### Features

* **seed:** Concert History + watcher rosters in local and staging seeds ([#1274](https://github.com/HartiganHM/concert-crawl/issues/1274)) ([8776cea](https://github.com/HartiganHM/concert-crawl/commit/8776cea30b948d5b1d6396bc5bca4f3c63f61b82)), closes [#70](https://github.com/HartiganHM/concert-crawl/issues/70) [#762](https://github.com/HartiganHM/concert-crawl/issues/762)

# [1.177.0](https://github.com/HartiganHM/concert-crawl/compare/v1.176.1...v1.177.0) (2026-07-31)


### Bug Fixes

* **admin:** drop the count from the last-fully-covered clause ([2dbe025](https://github.com/HartiganHM/concert-crawl/commit/2dbe025a353343ac6224d57b088c8104dc0822b6))
* **crawler:** make the coverage completeness stamp monotonic ([b828a6c](https://github.com/HartiganHM/concert-crawl/commit/b828a6c9dd1e339787db2df2c1043dce76f0822f))


### Features

* **admin:** record when URL coverage was last complete ([510b711](https://github.com/HartiganHM/concert-crawl/commit/510b711258bd5102fee957e07c5af7511afe0ceb)), closes [#1266](https://github.com/HartiganHM/concert-crawl/issues/1266)

## [1.176.1](https://github.com/HartiganHM/concert-crawl/compare/v1.176.0...v1.176.1) (2026-07-31)


### Bug Fixes

* **crawler-core:** clamp reported elapsed and tighten deadline assertions ([7767c2b](https://github.com/HartiganHM/concert-crawl/commit/7767c2b904ed7a20c39c90dc3d479026e1bb01a4))
* **crawler-core:** decide abort relabelling structurally, not by re-reading the clock ([6a697c4](https://github.com/HartiganHM/concert-crawl/commit/6a697c4bceecf336a3ec633f12682b07d88ca87f))
* **crawler:** log non-deadline errors before rethrowing ([95ad2d4](https://github.com/HartiganHM/concert-crawl/commit/95ad2d4af90ee161b77f64b2b54b98d6f982149c))
* **web:** keep a deep-linked crawl inspector tab across router.refresh ([5888107](https://github.com/HartiganHM/concert-crawl/commit/588810741fbeedcfdd1ecec1660caf49e35b996a)), closes [#1267](https://github.com/HartiganHM/concert-crawl/issues/1267)

# [1.176.0](https://github.com/HartiganHM/concert-crawl/compare/v1.175.0...v1.176.0) (2026-07-31)


### Bug Fixes

* **web:** announce refresh over degraded, and stop overclaiming last success ([b38e21f](https://github.com/HartiganHM/concert-crawl/commit/b38e21f85a4ad9e5cabd7b1f630935d34ba23bff))
* **web:** log dashboard fetch failures instead of swallowing them ([791d9fa](https://github.com/HartiganHM/concert-crawl/commit/791d9fa9a2be5e4d7a349dbb90abf84b1428087c))
* **web:** make the triage panel's deep links actually land on their evidence ([1dfe99b](https://github.com/HartiganHM/concert-crawl/commit/1dfe99bfab1f27b8355141a169e534aa31a9464d))


### Features

* **web:** admin triage panel replaces the capped attention feed ([#1215](https://github.com/HartiganHM/concert-crawl/issues/1215)) ([f83132a](https://github.com/HartiganHM/concert-crawl/commit/f83132a7df6168c68127d7e32998905adc03471e))

# [1.175.0](https://github.com/HartiganHM/concert-crawl/compare/v1.174.3...v1.175.0) (2026-07-31)


### Bug Fixes

* **api:** close the coverage evidence contract gap and tighten the run query ([6c0a06a](https://github.com/HartiganHM/concert-crawl/commit/6c0a06a095c3c5d15a9035c897fb2be1e4e1bf69))
* **api:** correct DST-unsafe sweep time and name-collided queue breakdown ([871d99a](https://github.com/HartiganHM/concert-crawl/commit/871d99aedf0e07184ca6cad3d92bec59c06f865d))
* **api:** count the flag-queue breakdown tail in venues, not events ([64efce2](https://github.com/HartiganHM/concert-crawl/commit/64efce260afd177de6940570380cc030a82f53ae))
* **api:** select only the run columns triage reads; state wasWhen honestly ([111889a](https://github.com/HartiganHM/concert-crawl/commit/111889a76e178efa24e7fba135cfa017bb4b9abd))


### Features

* **api:** derived live triage endpoint for the admin needs-attention panel ([7508497](https://github.com/HartiganHM/concert-crawl/commit/750849724e1253132cec2c13cf7091e17b7ceb5a)), closes [#624](https://github.com/HartiganHM/concert-crawl/issues/624) [#1215](https://github.com/HartiganHM/concert-crawl/issues/1215)

## [1.174.3](https://github.com/HartiganHM/concert-crawl/compare/v1.174.2...v1.174.3) (2026-07-31)


### Bug Fixes

* **security:** guard venue priceUrl and websiteUrl against non-http schemes ([c97a1ff](https://github.com/HartiganHM/concert-crawl/commit/c97a1ff6b2dbed49192cf4295b18971dc1ebb099))
* **security:** reject non-http(s) URLs on write and guard them at render ([4958746](https://github.com/HartiganHM/concert-crawl/commit/4958746120f1fa9d3037b0443416a5ed306244f0))

## [1.174.2](https://github.com/HartiganHM/concert-crawl/compare/v1.174.1...v1.174.2) (2026-07-31)


### Bug Fixes

* **api:** attribute Sentry events to Clerk users and scrub PII from bodies ([861abea](https://github.com/HartiganHM/concert-crawl/commit/861abea7c127f46c144f4f352d2e119998c2ed1f))

## [1.174.1](https://github.com/HartiganHM/concert-crawl/compare/v1.174.0...v1.174.1) (2026-07-31)


### Bug Fixes

* **web:** gate the public-browse vertical behind a launch flag ([#1254](https://github.com/HartiganHM/concert-crawl/issues/1254)) ([5723075](https://github.com/HartiganHM/concert-crawl/commit/57230755bf2dfe159affefa9f265de4d35a60947)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794)

# [1.174.0](https://github.com/HartiganHM/concert-crawl/compare/v1.173.0...v1.174.0) (2026-07-31)


### Features

* **web:** rename nav tab 3 to "My shows" and light it on /history ([#1253](https://github.com/HartiganHM/concert-crawl/issues/1253)) ([3d10ba7](https://github.com/HartiganHM/concert-crawl/commit/3d10ba7cd7f2fc29a27fa1f6b8dc6b20100ac98a))

# [1.173.0](https://github.com/HartiganHM/concert-crawl/compare/v1.172.0...v1.173.0) (2026-07-30)


### Features

* **web:** open browse, venues, search, and watching to signed-out visitors ([#1251](https://github.com/HartiganHM/concert-crawl/issues/1251)) ([9a63ddf](https://github.com/HartiganHM/concert-crawl/commit/9a63ddfba892af7f16594b724128081b9fa0e8db)), closes [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#794](https://github.com/HartiganHM/concert-crawl/issues/794)

# [1.172.0](https://github.com/HartiganHM/concert-crawl/compare/v1.171.0...v1.172.0) (2026-07-30)


### Features

* **db:** retire status = 'going' now that attendance lives on attending_at ([#1250](https://github.com/HartiganHM/concert-crawl/issues/1250)) ([8a5457e](https://github.com/HartiganHM/concert-crawl/commit/8a5457e95325eebdd552615f1a8a047b2ac86595)), closes [#70](https://github.com/HartiganHM/concert-crawl/issues/70) [#70](https://github.com/HartiganHM/concert-crawl/issues/70)
* **onboarding:** tour becomes a post-signup welcome that hands the show back ([#794](https://github.com/HartiganHM/concert-crawl/issues/794)) ([#1249](https://github.com/HartiganHM/concert-crawl/issues/1249)) ([353ef89](https://github.com/HartiganHM/concert-crawl/commit/353ef895db6fd66b0ba9790b0917cae13c0276ba))

# [1.171.0](https://github.com/HartiganHM/concert-crawl/compare/v1.170.0...v1.171.0) (2026-07-30)


### Features

* **web:** /history route, My shows tabs, and Passport teaser ([#70](https://github.com/HartiganHM/concert-crawl/issues/70)) ([#1246](https://github.com/HartiganHM/concert-crawl/issues/1246)) ([17e4700](https://github.com/HartiganHM/concert-crawl/commit/17e470089370bafb30df2e9192ad7683a16ded59)), closes [#1241](https://github.com/HartiganHM/concert-crawl/issues/1241) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#1225](https://github.com/HartiganHM/concert-crawl/issues/1225) [#1225](https://github.com/HartiganHM/concert-crawl/issues/1225)

# [1.170.0](https://github.com/HartiganHM/concert-crawl/compare/v1.169.1...v1.170.0) (2026-07-30)


### Features

* **web:** /watching signed-out teaching state + Watch-eye gating beat ([#794](https://github.com/HartiganHM/concert-crawl/issues/794) PR-F) ([#1245](https://github.com/HartiganHM/concert-crawl/issues/1245)) ([6e14b70](https://github.com/HartiganHM/concert-crawl/commit/6e14b7006f264a1c32be4d3cc4e43654e752cec5))

## [1.169.1](https://github.com/HartiganHM/concert-crawl/compare/v1.169.0...v1.169.1) (2026-07-30)


### Bug Fixes

* **api:** stop treating client 4xx as server faults ([acc0523](https://github.com/HartiganHM/concert-crawl/commit/acc0523b82da13e8726c94f14ea82707fe329463))

# [1.169.0](https://github.com/HartiganHM/concert-crawl/compare/v1.168.0...v1.169.0) (2026-07-30)


### Features

* **web:** "Still going?" nudge on Watching rows ([#1244](https://github.com/HartiganHM/concert-crawl/issues/1244)) ([b1764e1](https://github.com/HartiganHM/concert-crawl/commit/b1764e12d72188a02e06751a7ea39ddca6c6f6c3))
* **web:** signed-out app shell — CTA pair, anonymous disc, get-in card ([#1241](https://github.com/HartiganHM/concert-crawl/issues/1241)) ([25ab855](https://github.com/HartiganHM/concert-crawl/commit/25ab8553cfe6f119c90e7340c37054892dead577))

# [1.168.0](https://github.com/HartiganHM/concert-crawl/compare/v1.167.1...v1.168.0) (2026-07-30)


### Features

* **api:** retire REQUIRE_BETA_AUTH — public reads, self-guarded writes ([#794](https://github.com/HartiganHM/concert-crawl/issues/794) PR-D) ([#1240](https://github.com/HartiganHM/concert-crawl/issues/1240)) ([fbb70d5](https://github.com/HartiganHM/concert-crawl/commit/fbb70d54724d6b711b66a10fb7099ddca1fd609a))
* **web:** "I'm going!" commitment CTA on Event Detail ([#1242](https://github.com/HartiganHM/concert-crawl/issues/1242)) ([582ccf6](https://github.com/HartiganHM/concert-crawl/commit/582ccf673331be54a21563c041ee1f4868a7aba9)), closes [#1238](https://github.com/HartiganHM/concert-crawl/issues/1238) [#1243](https://github.com/HartiganHM/concert-crawl/issues/1243)

## [1.167.1](https://github.com/HartiganHM/concert-crawl/compare/v1.167.0...v1.167.1) (2026-07-30)


### Bug Fixes

* **web:** restore main typecheck — WatchZone fixture missing attendingAt ([#1243](https://github.com/HartiganHM/concert-crawl/issues/1243)) ([db09e0a](https://github.com/HartiganHM/concert-crawl/commit/db09e0a3a2972f59f51c4c95c195466efa478bb5)), closes [#1238](https://github.com/HartiganHM/concert-crawl/issues/1238) [#1239](https://github.com/HartiganHM/concert-crawl/issues/1239)

# [1.167.0](https://github.com/HartiganHM/concert-crawl/compare/v1.166.0...v1.167.0) (2026-07-30)


### Features

* **api:** attending toggle, concert history read, and .ics export ([#1239](https://github.com/HartiganHM/concert-crawl/issues/1239)) ([91c133f](https://github.com/HartiganHM/concert-crawl/commit/91c133ff1f6acc0dea63701c13e90f8b597716cb))
* **web:** who else is watching — social proof under the Watch button ([#762](https://github.com/HartiganHM/concert-crawl/issues/762)) ([#1238](https://github.com/HartiganHM/concert-crawl/issues/1238)) ([4d1687f](https://github.com/HartiganHM/concert-crawl/commit/4d1687fabfb48ddeaeff7d4b184bb05e019d2935))

# [1.166.0](https://github.com/HartiganHM/concert-crawl/compare/v1.165.0...v1.166.0) (2026-07-30)


### Features

* **auth:** gate protected-layout mounts on isSignedIn ([#794](https://github.com/HartiganHM/concert-crawl/issues/794) PR-C) ([#1237](https://github.com/HartiganHM/concert-crawl/issues/1237)) ([191ff07](https://github.com/HartiganHM/concert-crawl/commit/191ff0733f91b40200fc52d97d4654360d4b91ff))
* **web:** landing page points at browsing, not at a beta code ([#794](https://github.com/HartiganHM/concert-crawl/issues/794) PR-B) ([#1235](https://github.com/HartiganHM/concert-crawl/issues/1235)) ([1e433c1](https://github.com/HartiganHM/concert-crawl/commit/1e433c1190d31ff650b1fae96fae5abdebf20d94))

# [1.165.0](https://github.com/HartiganHM/concert-crawl/compare/v1.164.6...v1.165.0) (2026-07-30)


### Features

* **api:** GET /v1/events/:id/watchers read endpoint ([#1233](https://github.com/HartiganHM/concert-crawl/issues/1233)) ([bcb5977](https://github.com/HartiganHM/concert-crawl/commit/bcb5977ecf662f70fa4b1f8c299d258ead416953)), closes [#762](https://github.com/HartiganHM/concert-crawl/issues/762) [#833](https://github.com/HartiganHM/concert-crawl/issues/833)
* **db:** attending_at on user_events — Concert History data model ([#1236](https://github.com/HartiganHM/concert-crawl/issues/1236)) ([509e166](https://github.com/HartiganHM/concert-crawl/commit/509e1664e8a778e9ba0a0c38a6dc957463b8dc48)), closes [#70](https://github.com/HartiganHM/concert-crawl/issues/70)

## [1.164.6](https://github.com/HartiganHM/concert-crawl/compare/v1.164.5...v1.164.6) (2026-07-30)


### Bug Fixes

* **web:** correct locked-vocabulary violations in tier picker + settings copy ([#1231](https://github.com/HartiganHM/concert-crawl/issues/1231)) ([5208fbd](https://github.com/HartiganHM/concert-crawl/commit/5208fbd863cec08e35ce8729ae7323eadcd75ba6))

## [1.164.5](https://github.com/HartiganHM/concert-crawl/compare/v1.164.4...v1.164.5) (2026-07-30)


### Bug Fixes

* **entitlements:** supporter unlocks concert history + calendar export ([#1225](https://github.com/HartiganHM/concert-crawl/issues/1225)) ([978aa86](https://github.com/HartiganHM/concert-crawl/commit/978aa8611280c3def8f2b9bac9b278e1b3b4f605))

## [1.164.4](https://github.com/HartiganHM/concert-crawl/compare/v1.164.3...v1.164.4) (2026-07-28)


### Bug Fixes

* **crawler:** report went-dark crawls to Sentry ([#1214](https://github.com/HartiganHM/concert-crawl/issues/1214)) ([223ac48](https://github.com/HartiganHM/concert-crawl/commit/223ac48cc5dd55197e9f74969f3a161e2678d8ab))

## [1.164.3](https://github.com/HartiganHM/concert-crawl/compare/v1.164.2...v1.164.3) (2026-07-28)


### Bug Fixes

* **consumer:** drop banned dispute/contest/challenge wording from price copy ([#1213](https://github.com/HartiganHM/concert-crawl/issues/1213)) ([8a2f1f5](https://github.com/HartiganHM/concert-crawl/commit/8a2f1f5b45c18de50347156ba09aedced629031e))

## [1.164.2](https://github.com/HartiganHM/concert-crawl/compare/v1.164.1...v1.164.2) (2026-07-28)


### Bug Fixes

* **crawler:** give production crawls a platform fetch budget ([#1210](https://github.com/HartiganHM/concert-crawl/issues/1210)) ([8cad8c2](https://github.com/HartiganHM/concert-crawl/commit/8cad8c25abe58c7f62a974f774b6cc20f7295ca7)), closes [#1199](https://github.com/HartiganHM/concert-crawl/issues/1199)

## [1.164.1](https://github.com/HartiganHM/concert-crawl/compare/v1.164.0...v1.164.1) (2026-07-28)


### Bug Fixes

* **consumer:** use the shared vendor picker when updating or disputing a price ([#1209](https://github.com/HartiganHM/concert-crawl/issues/1209)) ([15314f7](https://github.com/HartiganHM/concert-crawl/commit/15314f786ca48cf0e5613c9c2e09cba5f2e89755)), closes [#1208](https://github.com/HartiganHM/concert-crawl/issues/1208)

# [1.164.0](https://github.com/HartiganHM/concert-crawl/compare/v1.163.1...v1.164.0) (2026-07-25)


### Features

* **web:** vendor picker — twelve vendors grouped by face value vs resale ([#1207](https://github.com/HartiganHM/concert-crawl/issues/1207)) ([7543043](https://github.com/HartiganHM/concert-crawl/commit/75430439597d8950b460c47a363dfe581888fd60)), closes [#1193](https://github.com/HartiganHM/concert-crawl/issues/1193) [#1193](https://github.com/HartiganHM/concert-crawl/issues/1193) [#1200](https://github.com/HartiganHM/concert-crawl/issues/1200)

## [1.163.1](https://github.com/HartiganHM/concert-crawl/compare/v1.163.0...v1.163.1) (2026-07-25)


### Bug Fixes

* **web:** derive price trust mark from sourceCategory, not vendor ([#1200](https://github.com/HartiganHM/concert-crawl/issues/1200)) ([8c87929](https://github.com/HartiganHM/concert-crawl/commit/8c87929f413aa6bcc82f2f1d99428a301a09d68a))

# [1.163.0](https://github.com/HartiganHM/concert-crawl/compare/v1.162.0...v1.163.0) (2026-07-25)


### Bug Fixes

* **crawler:** give platform fetches a real wall-clock deadline ([#1197](https://github.com/HartiganHM/concert-crawl/issues/1197)) ([4fa76f6](https://github.com/HartiganHM/concert-crawl/commit/4fa76f6c7a3ed8950107cb8e2329cbacf6339910)), closes [#1184](https://github.com/HartiganHM/concert-crawl/issues/1184)
* **crawler:** rename truncation-report fields Sentry was scrubbing ([#1202](https://github.com/HartiganHM/concert-crawl/issues/1202)) ([52fa646](https://github.com/HartiganHM/concert-crawl/commit/52fa646d8af95ffb3fde8ace87d190ad036537f9)), closes [#1191](https://github.com/HartiganHM/concert-crawl/issues/1191)


### Features

* **crawler:** alert when a venue's events lose their ticket links ([#1201](https://github.com/HartiganHM/concert-crawl/issues/1201)) ([0f478d3](https://github.com/HartiganHM/concert-crawl/commit/0f478d3e7dc15ff585563ed11dca36f25a8ae817))

# [1.162.0](https://github.com/HartiganHM/concert-crawl/compare/v1.161.0...v1.162.0) (2026-07-25)


### Features

* **admin:** add click-through links to the Missing tab ([#1195](https://github.com/HartiganHM/concert-crawl/issues/1195)) ([a107f06](https://github.com/HartiganHM/concert-crawl/commit/a107f060313eb718b2d87c9b717d1bd90b7795c4))

# [1.161.0](https://github.com/HartiganHM/concert-crawl/compare/v1.160.3...v1.161.0) (2026-07-25)


### Features

* **crawler:** detect capped event catalogues ([#1194](https://github.com/HartiganHM/concert-crawl/issues/1194)) ([35f2ee6](https://github.com/HartiganHM/concert-crawl/commit/35f2ee6b74448c66dd15bc536221cf7283d25f99)), closes [#1185](https://github.com/HartiganHM/concert-crawl/issues/1185)

## [1.160.3](https://github.com/HartiganHM/concert-crawl/compare/v1.160.2...v1.160.3) (2026-07-25)


### Bug Fixes

* **crawler:** accept save_events payload when Haiku stringifies the events array ([#1192](https://github.com/HartiganHM/concert-crawl/issues/1192)) ([1d96086](https://github.com/HartiganHM/concert-crawl/commit/1d960860c6d993526a96a5a50660fdcf64425d4c))

## [1.160.2](https://github.com/HartiganHM/concert-crawl/compare/v1.160.1...v1.160.2) (2026-07-25)


### Bug Fixes

* **crawler:** drop a calendar-index URL handed back as a ticketUrl ([#1187](https://github.com/HartiganHM/concert-crawl/issues/1187)) ([426ac4c](https://github.com/HartiganHM/concert-crawl/commit/426ac4c9c988ab6d0048f7fd5d50fb4fed738a72)), closes [#1152](https://github.com/HartiganHM/concert-crawl/issues/1152) [#1152](https://github.com/HartiganHM/concert-crawl/issues/1152)

## [1.160.1](https://github.com/HartiganHM/concert-crawl/compare/v1.160.0...v1.160.1) (2026-07-25)


### Bug Fixes

* **crawler:** keep anchor hrefs so the LLM can name each event's page ([#1182](https://github.com/HartiganHM/concert-crawl/issues/1182)) ([5b3584d](https://github.com/HartiganHM/concert-crawl/commit/5b3584d46d0de928f0a6f935f286fcdb79880db0)), closes [#1152](https://github.com/HartiganHM/concert-crawl/issues/1152) [#58](https://github.com/HartiganHM/concert-crawl/issues/58)

# [1.160.0](https://github.com/HartiganHM/concert-crawl/compare/v1.159.0...v1.160.0) (2026-07-25)


### Bug Fixes

* **crawler:** re-upsert existing rows once an eventUrl becomes available ([#1186](https://github.com/HartiganHM/concert-crawl/issues/1186)) ([6bd2466](https://github.com/HartiganHM/concert-crawl/commit/6bd24666d22ae1d2db6ff012b1d2043fe09cd094))


### Features

* **crawler:** map AEG's per-event AXS page to eventUrl ([#1183](https://github.com/HartiganHM/concert-crawl/issues/1183)) ([e34e9b9](https://github.com/HartiganHM/concert-crawl/commit/e34e9b912410077c0e0da554da3801565d6a07c8))

# [1.159.0](https://github.com/HartiganHM/concert-crawl/compare/v1.158.9...v1.159.0) (2026-07-25)


### Features

* **crawler:** platform:livenation fetcher recovers shows past the 36-item ceiling ([#1180](https://github.com/HartiganHM/concert-crawl/issues/1180)) ([98c861c](https://github.com/HartiganHM/concert-crawl/commit/98c861ce436837684eb6d3e6ec7b7c891869d994)), closes [#1127](https://github.com/HartiganHM/concert-crawl/issues/1127)

## [1.158.9](https://github.com/HartiganHM/concert-crawl/compare/v1.158.8...v1.158.9) (2026-07-25)


### Bug Fixes

* **crawler:** key went-dark detection off post-guard usable event count ([#1179](https://github.com/HartiganHM/concert-crawl/issues/1179)) ([a1c34db](https://github.com/HartiganHM/concert-crawl/commit/a1c34dbe88c6cb065425d9f8358560b12fa9d25d)), closes [#624](https://github.com/HartiganHM/concert-crawl/issues/624) [#1167](https://github.com/HartiganHM/concert-crawl/issues/1167) [#1165](https://github.com/HartiganHM/concert-crawl/issues/1165)

## [1.158.8](https://github.com/HartiganHM/concert-crawl/compare/v1.158.7...v1.158.8) (2026-07-25)


### Bug Fixes

* **crawler:** clear went-dark cooldown on a healthy run so recurrences re-alert ([#1178](https://github.com/HartiganHM/concert-crawl/issues/1178)) ([9a66fe3](https://github.com/HartiganHM/concert-crawl/commit/9a66fe3edd2dd166c5b92cb2258e141743b0cbaf)), closes [#1174](https://github.com/HartiganHM/concert-crawl/issues/1174)

## [1.158.7](https://github.com/HartiganHM/concert-crawl/compare/v1.158.6...v1.158.7) (2026-07-25)


### Bug Fixes

* **spotify:** reserve discovery shelf footprint in the browse loading state ([#1169](https://github.com/HartiganHM/concert-crawl/issues/1169)) ([f6b3f90](https://github.com/HartiganHM/concert-crawl/commit/f6b3f90c460d53b1af7ff8d9dadf11375aa660a4)), closes [#1146](https://github.com/HartiganHM/concert-crawl/issues/1146) [#33](https://github.com/HartiganHM/concert-crawl/issues/33)

## [1.158.6](https://github.com/HartiganHM/concert-crawl/compare/v1.158.5...v1.158.6) (2026-07-25)


### Bug Fixes

* **api:** surface Clerk OAuth verification failures to Sentry ([#1168](https://github.com/HartiganHM/concert-crawl/issues/1168)) ([1d12c0c](https://github.com/HartiganHM/concert-crawl/commit/1d12c0cb467f89cd4074da39ba6792b4c07e450a)), closes [#1159](https://github.com/HartiganHM/concert-crawl/issues/1159) [#1163](https://github.com/HartiganHM/concert-crawl/issues/1163) [#1165](https://github.com/HartiganHM/concert-crawl/issues/1165)

## [1.158.5](https://github.com/HartiganHM/concert-crawl/compare/v1.158.4...v1.158.5) (2026-07-25)


### Bug Fixes

* **crawler:** record zero-event crawls as partial, not success ([#1165](https://github.com/HartiganHM/concert-crawl/issues/1165)) ([8519887](https://github.com/HartiganHM/concert-crawl/commit/8519887cfa63c0a27ede7e9a2979c80dc8fe12ed)), closes [#1162](https://github.com/HartiganHM/concert-crawl/issues/1162) [#624](https://github.com/HartiganHM/concert-crawl/issues/624)

## [1.158.4](https://github.com/HartiganHM/concert-crawl/compare/v1.158.3...v1.158.4) (2026-07-25)


### Bug Fixes

* **crawler:** keep valid events when one LLM row fails validation ([#1163](https://github.com/HartiganHM/concert-crawl/issues/1163)) ([062f66c](https://github.com/HartiganHM/concert-crawl/commit/062f66cb5ea89b3461e9b6e33ed8a5609e4dd435)), closes [#1162](https://github.com/HartiganHM/concert-crawl/issues/1162) [#1162](https://github.com/HartiganHM/concert-crawl/issues/1162)

## [1.158.3](https://github.com/HartiganHM/concert-crawl/compare/v1.158.2...v1.158.3) (2026-07-21)


### Bug Fixes

* db seed and overflow issue ([3230e0a](https://github.com/HartiganHM/concert-crawl/commit/3230e0a7460cd957bf8bcdc3f5916587c223d5ae))
* **seed:** allow local Postgres as prod→sync target by gating ssl on host ([c2c8c81](https://github.com/HartiganHM/concert-crawl/commit/c2c8c8149a97bb15fd77acf8b98a709bf0eddbba))
* **spotify:** contain DiscoveryShelf carousel at the ul boundary ([#33](https://github.com/HartiganHM/concert-crawl/issues/33)) ([b9355f5](https://github.com/HartiganHM/concert-crawl/commit/b9355f5761285d1b55e71674a5e19aea13a62e6a)), closes [#1149](https://github.com/HartiganHM/concert-crawl/issues/1149) [#1156](https://github.com/HartiganHM/concert-crawl/issues/1156) [#1157](https://github.com/HartiganHM/concert-crawl/issues/1157)

## [1.158.2](https://github.com/HartiganHM/concert-crawl/compare/v1.158.1...v1.158.2) (2026-07-21)


### Bug Fixes

* contain Browse carousel overflow at the layout block, not <html> ([5beef50](https://github.com/HartiganHM/concert-crawl/commit/5beef503c06bfcd87ee21583349160ed08c3fcfd))

## [1.158.1](https://github.com/HartiganHM/concert-crawl/compare/v1.158.0...v1.158.1) (2026-07-21)


### Bug Fixes

* clip horizontal overflow at the viewport to stop browse page side-scroll ([#1156](https://github.com/HartiganHM/concert-crawl/issues/1156)) ([26a35a6](https://github.com/HartiganHM/concert-crawl/commit/26a35a68c31af9861dac2a71ea043e581ec57dd6)), closes [#1149](https://github.com/HartiganHM/concert-crawl/issues/1149)

# [1.158.0](https://github.com/HartiganHM/concert-crawl/compare/v1.157.0...v1.158.0) (2026-07-21)


### Features

* **crawler:** capture per-event detail URL as Get-tickets fallback ([#1154](https://github.com/HartiganHM/concert-crawl/issues/1154)) ([4fdf92c](https://github.com/HartiganHM/concert-crawl/commit/4fdf92c80d6d4eccd36df545134a4e9587c9686a)), closes [#31](https://github.com/HartiganHM/concert-crawl/issues/31) [1152/#1153](https://github.com/HartiganHM/concert-crawl/issues/1153) [#31](https://github.com/HartiganHM/concert-crawl/issues/31) [#1152](https://github.com/HartiganHM/concert-crawl/issues/1152)

# [1.157.0](https://github.com/HartiganHM/concert-crawl/compare/v1.156.1...v1.157.0) (2026-07-21)


### Bug Fixes

* **a11y:** hide loading shelf header from SR to prevent re-announce (Copilot R5) ([e1d8562](https://github.com/HartiganHM/concert-crawl/commit/e1d8562f18ba33f9c40d02f8176b5efb691de52a))
* **spotify:** gate connection override on entitlement + make unmount test meaningful (Copilot R6) ([9989593](https://github.com/HartiganHM/concert-crawl/commit/9989593bb3ea3ce54eeb654bac2edc9524a9a0f8))
* **spotify:** hide shelf when connection ≠ connected, even if picks cached (Copilot R3) ([bd269c0](https://github.com/HartiganHM/concert-crawl/commit/bd269c0a846a293ac53f9d3920adde17239d8ea1))
* **spotify:** re-arm loading timeout on Retry (Copilot R1) ([6930bc5](https://github.com/HartiganHM/concert-crawl/commit/6930bc510206e246257f840f16e4976a7f23630e))
* **spotify:** rename handleRetry → retry + add releases.ts entry (Copilot R2) ([5755f0c](https://github.com/HartiganHM/concert-crawl/commit/5755f0c0f8f9a76115df8b6d9a552630ec3e87ff))
* **spotify:** route connection error/revoked to failure shelf, not hidden (Copilot R4) ([7ad820b](https://github.com/HartiganHM/concert-crawl/commit/7ad820b8656900757cf0b3d5af02bd54e24f65f1))


### Features

* **spotify:** add loading state to discovery shelf ([2ffa565](https://github.com/HartiganHM/concert-crawl/commit/2ffa565ce1aa65e1918f695061c42ec14af5ff40))

## [1.156.1](https://github.com/HartiganHM/concert-crawl/compare/v1.156.0...v1.156.1) (2026-07-21)


### Bug Fixes

* contain DiscoveryShelf full-bleed carousel to stop browse page overflow ([#1149](https://github.com/HartiganHM/concert-crawl/issues/1149)) ([c58c32f](https://github.com/HartiganHM/concert-crawl/commit/c58c32f1655e59fcefd7065a8b40ce0e08d35882)), closes [#763](https://github.com/HartiganHM/concert-crawl/issues/763)

# [1.156.0](https://github.com/HartiganHM/concert-crawl/compare/v1.155.0...v1.156.0) (2026-07-21)


### Features

* **crawler:** runtime drift-duplicate self-heal after stale-detection pass ([#1122](https://github.com/HartiganHM/concert-crawl/issues/1122)) ([#1143](https://github.com/HartiganHM/concert-crawl/issues/1143)) ([525b6f5](https://github.com/HartiganHM/concert-crawl/commit/525b6f580cb4d97114704638be37b12c0a25347f))

# [1.155.0](https://github.com/HartiganHM/concert-crawl/compare/v1.154.6...v1.155.0) (2026-07-20)


### Features

* **admin:** make Missing-from-crawl list triageable ([#1122](https://github.com/HartiganHM/concert-crawl/issues/1122)) ([#1141](https://github.com/HartiganHM/concert-crawl/issues/1141)) ([5bad18d](https://github.com/HartiganHM/concert-crawl/commit/5bad18dea954a3bb42fff2ba33106d1fc1b5cd73))

## [1.154.6](https://github.com/HartiganHM/concert-crawl/compare/v1.154.5...v1.154.6) (2026-07-20)


### Bug Fixes

* **push:** rename VAPID_CONTACT_EMAIL → VAPID_SUBJECT (spec name) ([#1130](https://github.com/HartiganHM/concert-crawl/issues/1130)) ([#1136](https://github.com/HartiganHM/concert-crawl/issues/1136)) ([3c09003](https://github.com/HartiganHM/concert-crawl/commit/3c09003849415c5b383deea44a8e3853d38955fd))

## [1.154.5](https://github.com/HartiganHM/concert-crawl/compare/v1.154.4...v1.154.5) (2026-07-20)


### Bug Fixes

* **auth:** route Clerk signup through /auth/complete so invite gets marked used ([#1133](https://github.com/HartiganHM/concert-crawl/issues/1133)) ([5314238](https://github.com/HartiganHM/concert-crawl/commit/531423824d0f4847720983497983d27999c78300)), closes [#1113](https://github.com/HartiganHM/concert-crawl/issues/1113)
* **spotify:** gate taste-picks seed on resolved userId + log unexpected SSR prefetch failures ([84de700](https://github.com/HartiganHM/concert-crawl/commit/84de700f43e30088f07853c87686f702cb663aa8))
* **spotify:** taste-pick card image absorbs extra height + SSR-seed shelf to kill pop-in ([924ea46](https://github.com/HartiganHM/concert-crawl/commit/924ea46c0c96d702b416b469c2365cb0477da095))
* **web:** [#1137](https://github.com/HartiganHM/concert-crawl/issues/1137) R5 — disable taste-picks query until userId resolves ([ecaf90d](https://github.com/HartiganHM/concert-crawl/commit/ecaf90da8fd0fbbac8cbb254190296fe3785543d))

## [1.154.4](https://github.com/HartiganHM/concert-crawl/compare/v1.154.3...v1.154.4) (2026-07-20)


### Bug Fixes

* **crawler-core:** strip <p/> and </br> tag variants ([#1132](https://github.com/HartiganHM/concert-crawl/issues/1132)) ([#1135](https://github.com/HartiganHM/concert-crawl/issues/1135)) ([117c85b](https://github.com/HartiganHM/concert-crawl/commit/117c85b26209c968fb49dc91bbea45d7f7eb9fa2)), closes [Post-#827](https://github.com/Post-/issues/827)
* **crawler:** stop verified_event_changed churn + one-shot missing-event cleanup ([#1124](https://github.com/HartiganHM/concert-crawl/issues/1124), [#1122](https://github.com/HartiganHM/concert-crawl/issues/1122)) ([#1126](https://github.com/HartiganHM/concert-crawl/issues/1126)) ([2d248b4](https://github.com/HartiganHM/concert-crawl/commit/2d248b4381ffe8f57097cb97fb2c32906773534e)), closes [#1053](https://github.com/HartiganHM/concert-crawl/issues/1053) [#1053](https://github.com/HartiganHM/concert-crawl/issues/1053)

## [1.154.3](https://github.com/HartiganHM/concert-crawl/compare/v1.154.2...v1.154.3) (2026-07-20)


### Bug Fixes

* **pwa:** post-watch sheet PATCHes master + settings toggle surfaces errors ([#1130](https://github.com/HartiganHM/concert-crawl/issues/1130)) ([#1134](https://github.com/HartiganHM/concert-crawl/issues/1134)) ([a72e9f9](https://github.com/HartiganHM/concert-crawl/commit/a72e9f93703fa4ca5fd04afc2f21c0d160dd927d))

## [1.154.2](https://github.com/HartiganHM/concert-crawl/compare/v1.154.1...v1.154.2) (2026-07-20)


### Bug Fixes

* **spotify:** round-3 staging feedback — modal gaps, stat centering, chip expand, card heights ([829855e](https://github.com/HartiganHM/concert-crawl/commit/829855efcc0a7b5c2bbc24fcf4a4394af6bd592f))

## [1.154.1](https://github.com/HartiganHM/concert-crawl/compare/v1.154.0...v1.154.1) (2026-07-19)


### Bug Fixes

* **admin:** show platform strategy tokens + align topbar height with sidebar ([#1116](https://github.com/HartiganHM/concert-crawl/issues/1116)) ([8f02328](https://github.com/HartiganHM/concert-crawl/commit/8f023289fe776d017cd9a449bee3bd3f25e1f8ea)), closes [#1075](https://github.com/HartiganHM/concert-crawl/issues/1075)

# [1.154.0](https://github.com/HartiganHM/concert-crawl/compare/v1.153.0...v1.154.0) (2026-07-19)


### Features

* **pwa:** post-watch permission sheet + watch-show-button integration ([#1062](https://github.com/HartiganHM/concert-crawl/issues/1062)) ([#1123](https://github.com/HartiganHM/concert-crawl/issues/1123)) ([120f493](https://github.com/HartiganHM/concert-crawl/commit/120f493d2818e53adab9b9eccff7038f60cc18a6)), closes [#1092](https://github.com/HartiganHM/concert-crawl/issues/1092)

# [1.153.0](https://github.com/HartiganHM/concert-crawl/compare/v1.152.3...v1.153.0) (2026-07-19)


### Bug Fixes

* **crawler:** [#1053](https://github.com/HartiganHM/concert-crawl/issues/1053) re-key dedup to (venue, date, canonical_artist, show_time) ([#1121](https://github.com/HartiganHM/concert-crawl/issues/1121)) ([e7b6b3e](https://github.com/HartiganHM/concert-crawl/commit/e7b6b3ee54ffba1ef5716ec4e99b839190f56826)), closes [#821](https://github.com/HartiganHM/concert-crawl/issues/821) [#763](https://github.com/HartiganHM/concert-crawl/issues/763) [#825](https://github.com/HartiganHM/concert-crawl/issues/825)


### Features

* **design:** [#762](https://github.com/HartiganHM/concert-crawl/issues/762) who else is watching — Green handoff + tracker refresh ([#1117](https://github.com/HartiganHM/concert-crawl/issues/1117)) ([6d6409d](https://github.com/HartiganHM/concert-crawl/commit/6d6409d78ffe019658ff37be1fb6081ce5d91d37)), closes [#1096](https://github.com/HartiganHM/concert-crawl/issues/1096) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#22](https://github.com/HartiganHM/concert-crawl/issues/22) [#1114](https://github.com/HartiganHM/concert-crawl/issues/1114) [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115) [#737](https://github.com/HartiganHM/concert-crawl/issues/737) [#1114](https://github.com/HartiganHM/concert-crawl/issues/1114) [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115) [#794](https://github.com/HartiganHM/concert-crawl/issues/794) [#22](https://github.com/HartiganHM/concert-crawl/issues/22) [#21](https://github.com/HartiganHM/concert-crawl/issues/21)

## [1.152.3](https://github.com/HartiganHM/concert-crawl/compare/v1.152.2...v1.152.3) (2026-07-19)


### Bug Fixes

* **husky:** skip pre-push tests on delete-only pushes ([#1111](https://github.com/HartiganHM/concert-crawl/issues/1111)) ([8c83161](https://github.com/HartiganHM/concert-crawl/commit/8c8316187dc3931f0ab71a659731e31fab1eed63)), closes [#1103](https://github.com/HartiganHM/concert-crawl/issues/1103)

## [1.152.2](https://github.com/HartiganHM/concert-crawl/compare/v1.152.1...v1.152.2) (2026-07-19)


### Bug Fixes

* **theme:** keep theme picker working when localStorage writes throw ([c6424af](https://github.com/HartiganHM/concert-crawl/commit/c6424af6e54c8bfa86f018facda4f3b5ebc56ef6))
* **theme:** log storage-unavailable fallback and correct applyTheme comment ([730a951](https://github.com/HartiganHM/concert-crawl/commit/730a9515c950d4ef5c38dd8096dc069a1fd51484))
* **theme:** move applyTheme out of the state updater to keep it pure ([ee19350](https://github.com/HartiganHM/concert-crawl/commit/ee1935098f12183b54d9d37198cfd6aafa041cc7))
* **theme:** re-assert persisted theme after React hydration recovery wipes html attrs ([80224f3](https://github.com/HartiganHM/concert-crawl/commit/80224f333159c733ce91b5a20596081a120ed3d5))

## [1.152.1](https://github.com/HartiganHM/concert-crawl/compare/v1.152.0...v1.152.1) (2026-07-19)


### Bug Fixes

* **spotify:** clear resume mark on dismiss and guard resume check to once per mount ([7a9dc7a](https://github.com/HartiganHM/concert-crawl/commit/7a9dc7aff90412dcffc0da35fe79c170f0a176dc))
* **spotify:** reject future-dated resume marks and log storage failures ([9f96493](https://github.com/HartiganHM/concert-crawl/commit/9f964933be87c1f88e7e485c2341ac0c44309f21))
* **spotify:** resume interrupted connect after Clerk reverification reload ([1fe4448](https://github.com/HartiganHM/concert-crawl/commit/1fe44480d5a894468080ead6c3956a5362a7637c)), closes [#763](https://github.com/HartiganHM/concert-crawl/issues/763)

# [1.152.0](https://github.com/HartiganHM/concert-crawl/compare/v1.151.0...v1.152.0) (2026-07-19)


### Features

* **pwa:** watch.pricedrop fan-out on community-price corroborate ([#1107](https://github.com/HartiganHM/concert-crawl/issues/1107)) ([#1120](https://github.com/HartiganHM/concert-crawl/issues/1120)) ([013be03](https://github.com/HartiganHM/concert-crawl/commit/013be03807a736e96472ffbb23cc7a7f7738f5b5)), closes [#1102](https://github.com/HartiganHM/concert-crawl/issues/1102)

# [1.151.0](https://github.com/HartiganHM/concert-crawl/compare/v1.150.1...v1.151.0) (2026-07-19)


### Features

* **pwa:** admin PATCH watch-update fan-out ([#1107](https://github.com/HartiganHM/concert-crawl/issues/1107)) ([#1109](https://github.com/HartiganHM/concert-crawl/issues/1109)) ([2b715bc](https://github.com/HartiganHM/concert-crawl/commit/2b715bc886393120d4dd9e199285246f6971aa26))

## [1.150.1](https://github.com/HartiganHM/concert-crawl/compare/v1.150.0...v1.150.1) (2026-07-19)


### Bug Fixes

* **api:** surface /v1/events/genres safeParse drops in Sentry ([#1108](https://github.com/HartiganHM/concert-crawl/issues/1108)) ([#1110](https://github.com/HartiganHM/concert-crawl/issues/1110)) ([bca86d6](https://github.com/HartiganHM/concert-crawl/commit/bca86d685cf38351f30813684651af47ec1621c0))

# [1.150.0](https://github.com/HartiganHM/concert-crawl/compare/v1.149.0...v1.150.0) (2026-07-19)


### Features

* **pwa:** watch-update fan-out on report state transitions ([#1064](https://github.com/HartiganHM/concert-crawl/issues/1064)) ([#1102](https://github.com/HartiganHM/concert-crawl/issues/1102)) ([8822eba](https://github.com/HartiganHM/concert-crawl/commit/8822ebae8c551a6ce9437a1f6d35e934467cc419))

# [1.149.0](https://github.com/HartiganHM/concert-crawl/compare/v1.148.0...v1.149.0) (2026-07-19)


### Bug Fixes

* **admin/dashboard:** populate strategy + cost on crawl health table ([#1095](https://github.com/HartiganHM/concert-crawl/issues/1095)) ([1633473](https://github.com/HartiganHM/concert-crawl/commit/16334730cd1b5eab6a2685f67ce8125310576b84)), closes [#1074](https://github.com/HartiganHM/concert-crawl/issues/1074) [#1075](https://github.com/HartiganHM/concert-crawl/issues/1075) [#1074](https://github.com/HartiganHM/concert-crawl/issues/1074) [#1075](https://github.com/HartiganHM/concert-crawl/issues/1075)
* **admin/review:** use server total for mobile 'Needs price' badge ([#1106](https://github.com/HartiganHM/concert-crawl/issues/1106)) ([21f24e0](https://github.com/HartiganHM/concert-crawl/commit/21f24e033b43f43baba098c13bc7c3e2563e15ac)), closes [#710](https://github.com/HartiganHM/concert-crawl/issues/710) [#1079](https://github.com/HartiganHM/concert-crawl/issues/1079)
* **admin/settings:** update Appearance selector to match consumer UI ([#1100](https://github.com/HartiganHM/concert-crawl/issues/1100)) ([9138107](https://github.com/HartiganHM/concert-crawl/commit/91381072f16952d3c814fce08deceb7a4e481b8e)), closes [#1086](https://github.com/HartiganHM/concert-crawl/issues/1086) [#1086](https://github.com/HartiganHM/concert-crawl/issues/1086)
* **admin:** wrap SectionHead H1 so long [@handles](https://github.com/handles) don't clip at 320px ([#1105](https://github.com/HartiganHM/concert-crawl/issues/1105)) ([d3058f6](https://github.com/HartiganHM/concert-crawl/commit/d3058f656f28bc899da33634ebf9053bb4c651fa))


### Features

* **pwa:** [#1063](https://github.com/HartiganHM/concert-crawl/issues/1063) notifications section in Settings ([#1098](https://github.com/HartiganHM/concert-crawl/issues/1098)) ([67fa203](https://github.com/HartiganHM/concert-crawl/commit/67fa203b5763160e2740fa6fc0b5b212041b03c8)), closes [#763](https://github.com/HartiganHM/concert-crawl/issues/763) [#971](https://github.com/HartiganHM/concert-crawl/issues/971)

# [1.148.0](https://github.com/HartiganHM/concert-crawl/compare/v1.147.4...v1.148.0) (2026-07-19)


### Features

* **browse:** collapse Vibe filter into bucket genres ([#1101](https://github.com/HartiganHM/concert-crawl/issues/1101)) ([#1104](https://github.com/HartiganHM/concert-crawl/issues/1104)) ([217f63d](https://github.com/HartiganHM/concert-crawl/commit/217f63d5575a1b3298b15927d3fb073ed672c20c))

## [1.147.4](https://github.com/HartiganHM/concert-crawl/compare/v1.147.3...v1.147.4) (2026-07-19)


### Bug Fixes

* **scripts:** scope test-DB prune to the branches passed in ([#1103](https://github.com/HartiganHM/concert-crawl/issues/1103)) ([84efcd9](https://github.com/HartiganHM/concert-crawl/commit/84efcd99a5fbaa0f924b7f08697e6349d6d09e94)), closes [#1097](https://github.com/HartiganHM/concert-crawl/issues/1097)

## [1.147.3](https://github.com/HartiganHM/concert-crawl/compare/v1.147.2...v1.147.3) (2026-07-19)


### Bug Fixes

* **admin/invite-codes:** Redeemed column data + default expiry never ([#1099](https://github.com/HartiganHM/concert-crawl/issues/1099)) ([f022817](https://github.com/HartiganHM/concert-crawl/commit/f022817c900d9757aa0b2584347636f77536c69e)), closes [#1084](https://github.com/HartiganHM/concert-crawl/issues/1084) [#1085](https://github.com/HartiganHM/concert-crawl/issues/1085) [#1084](https://github.com/HartiganHM/concert-crawl/issues/1084) [#1085](https://github.com/HartiganHM/concert-crawl/issues/1085)

## [1.147.2](https://github.com/HartiganHM/concert-crawl/compare/v1.147.1...v1.147.2) (2026-07-19)


### Bug Fixes

* **admin/crawl:** remove no-op alerts CTA + shrink LLM cost chip ([#1091](https://github.com/HartiganHM/concert-crawl/issues/1091)) ([2a772e7](https://github.com/HartiganHM/concert-crawl/commit/2a772e7b5b563dcfe119f5b0a23a4b34aa60d445)), closes [#1077](https://github.com/HartiganHM/concert-crawl/issues/1077) [#1078](https://github.com/HartiganHM/concert-crawl/issues/1078) [#1077](https://github.com/HartiganHM/concert-crawl/issues/1077) [#1078](https://github.com/HartiganHM/concert-crawl/issues/1078)

## [1.147.1](https://github.com/HartiganHM/concert-crawl/compare/v1.147.0...v1.147.1) (2026-07-19)


### Bug Fixes

* **api:** require crawlWaitForSelector for browser-mode venues ([#1072](https://github.com/HartiganHM/concert-crawl/issues/1072)) ([5f3b206](https://github.com/HartiganHM/concert-crawl/commit/5f3b206271f355ed632212d7599c1a5279853f6c))
* gate browser selector guard on platform/api field changes ([de38ddf](https://github.com/HartiganHM/concert-crawl/commit/de38ddf58c6429503871807e01b5acca5dff9fca))
* tighten browser-mode selector guard to require both platform id fields ([2b4ccd2](https://github.com/HartiganHM/concert-crawl/commit/2b4ccd275e27fedcce147fb020f80c8297fbad45))

# [1.147.0](https://github.com/HartiganHM/concert-crawl/compare/v1.146.2...v1.147.0) (2026-07-19)


### Bug Fixes

* **admin:** mobile 2×2 stat-card skeleton + Crawl Config input overflow ([#1093](https://github.com/HartiganHM/concert-crawl/issues/1093)) ([5ba2a0c](https://github.com/HartiganHM/concert-crawl/commit/5ba2a0c681743cd72e6ba2cc787231915216b92d)), closes [#1073](https://github.com/HartiganHM/concert-crawl/issues/1073) [#1076](https://github.com/HartiganHM/concert-crawl/issues/1076) [#1073](https://github.com/HartiganHM/concert-crawl/issues/1073) [#1076](https://github.com/HartiganHM/concert-crawl/issues/1076)
* **spotify:** reverification-aware connect + staging-feedback UI fixes ([#763](https://github.com/HartiganHM/concert-crawl/issues/763)) ([41c5808](https://github.com/HartiganHM/concert-crawl/commit/41c5808f1a1ca5cdb06dce709d5e8020104e7218))


### Features

* **pwa:** [#1061](https://github.com/HartiganHM/concert-crawl/issues/1061) post-watch dismissal store ([#1092](https://github.com/HartiganHM/concert-crawl/issues/1092)) ([5dfc770](https://github.com/HartiganHM/concert-crawl/commit/5dfc770650403473a3919e0e7e3920d757b874bc)), closes [#1062](https://github.com/HartiganHM/concert-crawl/issues/1062) [#763](https://github.com/HartiganHM/concert-crawl/issues/763)

## [1.146.2](https://github.com/HartiganHM/concert-crawl/compare/v1.146.1...v1.146.2) (2026-07-19)


### Bug Fixes

* **admin/review:** sweep — dropdown counts, mobile overlap, editor padding, back nav ([#1089](https://github.com/HartiganHM/concert-crawl/issues/1089)) ([6ee7b12](https://github.com/HartiganHM/concert-crawl/commit/6ee7b125b62b4fb400d3db1460b078b0a8902380)), closes [#1079](https://github.com/HartiganHM/concert-crawl/issues/1079) [#1081](https://github.com/HartiganHM/concert-crawl/issues/1081) [#1082](https://github.com/HartiganHM/concert-crawl/issues/1082) [#1083](https://github.com/HartiganHM/concert-crawl/issues/1083) [#1079](https://github.com/HartiganHM/concert-crawl/issues/1079) [#1081](https://github.com/HartiganHM/concert-crawl/issues/1081) [#1082](https://github.com/HartiganHM/concert-crawl/issues/1082)

## [1.146.1](https://github.com/HartiganHM/concert-crawl/compare/v1.146.0...v1.146.1) (2026-07-19)


### Bug Fixes

* **pwa:** restore apple-touch-icon so iOS Add-to-Home-Screen uses our art ([#1090](https://github.com/HartiganHM/concert-crawl/issues/1090)) ([2914d48](https://github.com/HartiganHM/concert-crawl/commit/2914d482b983db979de6e39a5d91db87aa65411e))

# [1.146.0](https://github.com/HartiganHM/concert-crawl/compare/v1.145.0...v1.146.0) (2026-07-19)


### Features

* **crawler:** spotify new-show fan-out — auto-watch + premium push with exactly-once claims ([0a3b8c0](https://github.com/HartiganHM/concert-crawl/commit/0a3b8c001a453c9aaab84bf7bccd6a867a95c5eb)), closes [#737](https://github.com/HartiganHM/concert-crawl/issues/737)
* **crawler:** thread inserted-event ids out of crawlVenue for spotify fan-out ([55e1e46](https://github.com/HartiganHM/concert-crawl/commit/55e1e468995d26884cc54bd6e5bb2d2ed757e2eb)), closes [#763](https://github.com/HartiganHM/concert-crawl/issues/763)
* **crawler:** wire spotify fan-out into both crawler entry paths ([ec0230d](https://github.com/HartiganHM/concert-crawl/commit/ec0230dfb28dad841913c0b04d3c23275dd19baa)), closes [#649](https://github.com/HartiganHM/concert-crawl/issues/649)
* **web:** v0.11.0-beta release notes for new-show push alerts + crawler env docs ([0707fe7](https://github.com/HartiganHM/concert-crawl/commit/0707fe78c8eea2ed36c5403bd74439497ed47403))

# [1.145.0](https://github.com/HartiganHM/concert-crawl/compare/v1.144.0...v1.145.0) (2026-07-19)


### Bug Fixes

* dismissed permission prompt gets retry copy, not the blocked wording ([37449e8](https://github.com/HartiganHM/concert-crawl/commit/37449e876bb74f945944542ee92b305cf65e5fc6))
* push toggle never rejects; opt-out PATCH first; dismissed prompt shows denied note ([486cc50](https://github.com/HartiganHM/concert-crawl/commit/486cc50ac4c1310a216cf89482030a42e0b6925d))
* refetch push device state on window focus so settings changes surface ([0492f2a](https://github.com/HartiganHM/concert-crawl/commit/0492f2a4622cb698253cde7186373d74c95216a8))
* roll back push subscription when the enable PATCH fails ([d80fde0](https://github.com/HartiganHM/concert-crawl/commit/d80fde085bfbfafc2ec88bd061b75662319a9e1f))


### Features

* **web:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) push alerts toggle in Settings ▸ Connections ([c3a786f](https://github.com/HartiganHM/concert-crawl/commit/c3a786f468988aee1bbcdce68feb139d09b1c3b0))
* **web:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) web push client helper + toggle hook ([21bbeb0](https://github.com/HartiganHM/concert-crawl/commit/21bbeb02864d92662f0ab239292df56c6c162697))

# [1.144.0](https://github.com/HartiganHM/concert-crawl/compare/v1.143.0...v1.144.0) (2026-07-19)


### Bug Fixes

* derive FollowName.source from Drizzle schema + centralize venue/date separator (Copilot r1) ([fdbf9eb](https://github.com/HartiganHM/concert-crawl/commit/fdbf9ebec2a796bc705d41fbe3fa8da6e9d88e5b))
* make matchedUpcomingCondition total — FALSE predicate for empty canonical set (Copilot r3) ([a549530](https://github.com/HartiganHM/concert-crawl/commit/a549530aa089a9daacde6a8c5f76d35754cec664))


### Features

* **api:** taste-picks discovery endpoint with deterministic ranking ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 8) ([f910662](https://github.com/HartiganHM/concert-crawl/commit/f91066281b3334b2c7dbbf92f7dc8426dc3a4436))
* **web:** "Based on your taste" discovery shelf on Browse ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 8) ([d62c18d](https://github.com/HartiganHM/concert-crawl/commit/d62c18dece29d6fd9e1c54ebf91a04d2dea3f7e9))

# [1.143.0](https://github.com/HartiganHM/concert-crawl/compare/v1.142.0...v1.143.0) (2026-07-19)


### Bug Fixes

* address Copilot round 2 on taste filter ([a5a29df](https://github.com/HartiganHM/concert-crawl/commit/a5a29dfdd24e47dd9e8cb84269d90192d87dfb68))
* **web:** base filtered empty-state on server-confirmed tasteApplied, not raw query param ([4965720](https://github.com/HartiganHM/concert-crawl/commit/496572022b7aa5743de02569ed4ad635546cc0db))
* **web:** release stale filterTaste param when entitlement resolves locked ([fd216da](https://github.com/HartiganHM/concert-crawl/commit/fd216dad0d2e5a00e312029d385dd3935dce9e24))


### Features

* **api:** taste=1 events-list filter gated by spotify-sync entitlement ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 7) ([1dc45df](https://github.com/HartiganHM/concert-crawl/commit/1dc45df0cb5513f4fb68085ed5b1d3f47a06931b))
* **web:** following taste-filter chip + upsell on the browse filter bar ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 7) ([9b64545](https://github.com/HartiganHM/concert-crawl/commit/9b64545a919a3a0679d36376736a3580bab07f35))

# [1.142.0](https://github.com/HartiganHM/concert-crawl/compare/v1.141.0...v1.142.0) (2026-07-19)


### Bug Fixes

* drop as-casts in follow tests + correct matcher query-cost comments (Copilot r1) ([b856122](https://github.com/HartiganHM/concert-crawl/commit/b8561226dd82d72cdbe93994994cd6b87849875d))
* **web:** constrain DetailFollowStrip text for long artist lists (design review) ([429418b](https://github.com/HartiganHM/concert-crawl/commit/429418babdc872469c0cf171fcad60ac8c4ae081))
* **web:** keep anonymous events fetch when a connection has zero taste rows (Copilot r2) ([0e15609](https://github.com/HartiganHM/concert-crawl/commit/0e156091b09b65ca08be12adb02e99a30dc888a1))
* **web:** scope personalized events cache by viewer and fail closed on token gaps ([d268559](https://github.com/HartiganHM/concert-crawl/commit/d2685596ec40d638a12c0cc175be3daf5d97ab1f))


### Features

* **api:** followedArtists overlay on events list + detail ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 6) ([c1be0e9](https://github.com/HartiganHM/concert-crawl/commit/c1be0e9685a4a9a572c5889a07389b7e77ed7601))
* **web:** following highlighting on browse cards, hero, and event detail ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 6) ([d0424bc](https://github.com/HartiganHM/concert-crawl/commit/d0424bc6300527c77a4c8490d2754035e419df00))

# [1.141.0](https://github.com/HartiganHM/concert-crawl/compare/v1.140.0...v1.141.0) (2026-07-19)


### Features

* **pwa:** [#971](https://github.com/HartiganHM/concert-crawl/issues/971) web push infra layer (schema + API + send pipeline + SW handlers) ([#1060](https://github.com/HartiganHM/concert-crawl/issues/1060)) ([70275b1](https://github.com/HartiganHM/concert-crawl/commit/70275b17dbb7a96cedaaf5c0df59e8a8097e7bd9))

# [1.140.0](https://github.com/HartiganHM/concert-crawl/compare/v1.139.0...v1.140.0) (2026-07-19)


### Bug Fixes

* never wipe a venue's catalog on a zero-event crawl ([#1058](https://github.com/HartiganHM/concert-crawl/issues/1058)) ([1e51c96](https://github.com/HartiganHM/concert-crawl/commit/1e51c96790a408d7fcd4359e339ffff1260fb29a)), closes [#624](https://github.com/HartiganHM/concert-crawl/issues/624)


### Features

* **pwa:** [#970](https://github.com/HartiganHM/concert-crawl/issues/970) offline pill + real fallback page with cached shortcuts ([#1057](https://github.com/HartiganHM/concert-crawl/issues/1057)) ([aa24628](https://github.com/HartiganHM/concert-crawl/commit/aa24628ad3f8bad036dd5b6421e4dc9fb28de461))

# [1.139.0](https://github.com/HartiganHM/concert-crawl/compare/v1.138.0...v1.139.0) (2026-07-19)


### Bug Fixes

* **api:** deterministic display-name pick for duplicated spotify canonicals ([be088e6](https://github.com/HartiganHM/concert-crawl/commit/be088e62367438cbfe60897a4c63ab1eab81b387))
* copilot r1 — denver-scoped more-chip count, idempotent nudge upsert ([3645541](https://github.com/HartiganHM/concert-crawl/commit/3645541c01cd020477380699aebb2888edcfc404))
* copilot r3 — deterministic matched-artist ordering, cancel-safe handoff ([e6932e6](https://github.com/HartiganHM/concert-crawl/commit/e6932e6c887436b26bc6e37b5e90ae5adfc51f4d))
* copilot r5 — skip match queries in broken states, centralize card fallbacks ([6f10cbc](https://github.com/HartiganHM/concert-crawl/commit/6f10cbc5216485c3ad6e2a3272941eaf118e3f34))
* **web:** copilot r4 — token-retry nudge trigger, navigate on patch success, copy extraction ([4bc1f0b](https://github.com/HartiganHM/concert-crawl/commit/4bc1f0b0a387da3a4abc9f6f782c1bcf31c59b96))
* **web:** design-review gaps — secondary CTAs, button sizes, mobile sub ([62b28cb](https://github.com/HartiganHM/concert-crawl/commit/62b28cba396654bee7fb791b776852aa128c7421))
* **web:** drop as-cast in handoff test mock, use copy definition for nav label ([0476caa](https://github.com/HartiganHM/concert-crawl/commit/0476caa410e0e0ce25d235589b874874091e700b))
* **web:** gate first-watch nudge listener off admin routes (copilot r2) ([f7c8841](https://github.com/HartiganHM/concert-crawl/commit/f7c8841290580105383f67202e42559977f6be58))
* **web:** release nudge trigger on pre-display eligibility failure ([49bd2f3](https://github.com/HartiganHM/concert-crawl/commit/49bd2f3a315f241c27c151a566e4d4372e739668))
* **web:** scope spotify connection query key by userId, throw on token gap ([08e36e2](https://github.com/HartiganHM/concert-crawl/commit/08e36e2b517dcf889bc45b73cd6c0a099efaf224))


### Features

* **api:** denver match summary, nudge routes + auto-watch backfill for spotify connect ui ([7347d5a](https://github.com/HartiganHM/concert-crawl/commit/7347d5a6da2386f0e614986673fda63ed46b4528))
* **web:** browse revoke banner + single-fire first-watch spotify nudge ([dae1698](https://github.com/HartiganHM/concert-crawl/commit/dae1698e1157ccfa7bacd1c6e5a1d0eb2b199ff4))
* **web:** post-oauth return flow — success, auto-watch opt-in + empty/fail states ([4805c2b](https://github.com/HartiganHM/concert-crawl/commit/4805c2b993758c88b6761021cd99f64a43c10ff6))
* **web:** settings connections section + spotify oauth handoff sheet ([56a9521](https://github.com/HartiganHM/concert-crawl/commit/56a9521f49f96f714c7dfadc957efaf7c59bf26f))
* **web:** spotify api client, connection hooks + relative-time helper ([c3f6a5d](https://github.com/HartiganHM/concert-crawl/commit/c3f6a5d7a926c154b08400b30985bbb23e86c83f))
* **web:** spotify brand token, official logo component + copy scope ([e7534f2](https://github.com/HartiganHM/concert-crawl/commit/e7534f28001823cd4e9bd4653344300c0db81e1e))

# [1.138.0](https://github.com/HartiganHM/concert-crawl/compare/v1.137.1...v1.138.0) (2026-07-19)


### Features

* **pwa:** [#969](https://github.com/HartiganHM/concert-crawl/issues/969) install slot polish (top-right chrome + iOS how-to sheet) ([#1056](https://github.com/HartiganHM/concert-crawl/issues/1056)) ([1dc652b](https://github.com/HartiganHM/concert-crawl/commit/1dc652ba7900ab36e55517c8f104dd3a9111906a)), closes [#970](https://github.com/HartiganHM/concert-crawl/issues/970)

## [1.137.1](https://github.com/HartiganHM/concert-crawl/compare/v1.137.0...v1.137.1) (2026-07-19)


### Bug Fixes

* split run-on artist billings into headliner + openers ([#1027](https://github.com/HartiganHM/concert-crawl/issues/1027)) ([#1054](https://github.com/HartiganHM/concert-crawl/issues/1054)) ([7ece319](https://github.com/HartiganHM/concert-crawl/commit/7ece319b624134484debf93dd5f0855ee00cccaf)), closes [#1053](https://github.com/HartiganHM/concert-crawl/issues/1053)

# [1.137.0](https://github.com/HartiganHM/concert-crawl/compare/v1.136.1...v1.137.0) (2026-07-19)


### Bug Fixes

* **admin:** make Contests tab reachable on mobile Review page ([#1051](https://github.com/HartiganHM/concert-crawl/issues/1051)) ([ef68c59](https://github.com/HartiganHM/concert-crawl/commit/ef68c5936510afcd3cd1f7930250194def19cfde)), closes [#1028](https://github.com/HartiganHM/concert-crawl/issues/1028) [#1028](https://github.com/HartiganHM/concert-crawl/issues/1028)
* **api:** count digestSent only on real sends ([ddd9461](https://github.com/HartiganHM/concert-crawl/commit/ddd9461f9497ef986f83ffc64c62de5436ba7c9e))
* **api:** normalize API_PUBLIC_URL + fail-fast digest on missing Clerk key ([ff0f845](https://github.com/HartiganHM/concert-crawl/commit/ff0f845bea558ed9ae8e6a0540b5e4375d7d78e3))
* **api:** render html error shell on unsubscribe db failure ([f0fedf8](https://github.com/HartiganHM/concert-crawl/commit/f0fedf85cde8b4a5b4c63dda176a5ef10d1902fb))
* **api:** render HTML page for malformed unsubscribe links ([56e2d36](https://github.com/HartiganHM/concert-crawl/commit/56e2d36f59f4f4525042154349d62d54f3661810))
* **api:** scope digest matching to spotify follows, count send failures ([a33acdf](https://github.com/HartiganHM/concert-crawl/commit/a33acdf0553964f1fccb3e77bfd29c57e6a1afc7))
* **api:** treat empty EMAIL_UNSUBSCRIBE_SECRET as unconfigured (503) ([a68c4fa](https://github.com/HartiganHM/concert-crawl/commit/a68c4fae8a607a17d16075e6f584391c6b2a755d))


### Features

* **api:** signed one-click email unsubscribe route ([#763](https://github.com/HartiganHM/concert-crawl/issues/763)) ([cebf472](https://github.com/HartiganHM/concert-crawl/commit/cebf47259642a525d7a1c35df89fd5e09a940ec0))
* **api:** spotify_digest email template + digest family footer ([#763](https://github.com/HartiganHM/concert-crawl/issues/763)) ([5ec5795](https://github.com/HartiganHM/concert-crawl/commit/5ec57959deee170a208b268e92cd153e6939f567))
* **api:** weekly Spotify sync + digest cron job ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) §8.1) ([4e8979e](https://github.com/HartiganHM/concert-crawl/commit/4e8979e48d4dad73a291c524a8b2f8a8cc421615))
* **db:** add spotify_digest email template key + config seed ([#763](https://github.com/HartiganHM/concert-crawl/issues/763)) ([56fc142](https://github.com/HartiganHM/concert-crawl/commit/56fc14239fd9b094f305b3f48ba4403bc1e9baad))


### Performance Improvements

* **api:** fetch zero-week taste picks once per run ([d0f1b7b](https://github.com/HartiganHM/concert-crawl/commit/d0f1b7b90351614747e39d007b12c4b7545299b7))

## [1.136.1](https://github.com/HartiganHM/concert-crawl/compare/v1.136.0...v1.136.1) (2026-07-19)


### Bug Fixes

* **web:** stop event detail page scrolling horizontally at 320px ([#1049](https://github.com/HartiganHM/concert-crawl/issues/1049)) ([f59f5bb](https://github.com/HartiganHM/concert-crawl/commit/f59f5bbff19c98395aea4b221f2dda3a13520920)), closes [#973](https://github.com/HartiganHM/concert-crawl/issues/973)

# [1.136.0](https://github.com/HartiganHM/concert-crawl/compare/v1.135.1...v1.136.0) (2026-07-19)


### Bug Fixes

* **api:** consume an attempt token on failed syncs so outage retries stay rate limited ([4c8c806](https://github.com/HartiganHM/concert-crawl/commit/4c8c806760e19553903a02fa9fcf331d142665bc))
* **spotify:** handle HTTP-date Retry-After, transient Clerk failures ([248d33b](https://github.com/HartiganHM/concert-crawl/commit/248d33bcad89ad52d58d2344a58497f8ec2b1d92))
* **spotify:** harden sync failure paths ([9f89943](https://github.com/HartiganHM/concert-crawl/commit/9f8994336fc41b9a53642a5b7f4fb4ab4fd5290a))
* **spotify:** log unparseable PATCH bodies ([9ce399d](https://github.com/HartiganHM/concert-crawl/commit/9ce399d85af90720b4ce8393063c9e8014451e78))


### Features

* **api:** spotify client + sync engine + connection API ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 3) ([076f312](https://github.com/HartiganHM/concert-crawl/commit/076f312f281dff9b620e2b628047cfc272d339f9))

## [1.135.1](https://github.com/HartiganHM/concert-crawl/compare/v1.135.0...v1.135.1) (2026-07-18)


### Bug Fixes

* **web:** persist theme from browse-page picker + stop avatar flash ([#1040](https://github.com/HartiganHM/concert-crawl/issues/1040)) ([74cabfb](https://github.com/HartiganHM/concert-crawl/commit/74cabfb495b39a292fe0ee0dcfee0f3ef34b65c7))

# [1.135.0](https://github.com/HartiganHM/concert-crawl/compare/v1.134.0...v1.135.0) (2026-07-18)


### Bug Fixes

* **web:** stack admin dashboard + venues stat tiles at mobile width ([#1043](https://github.com/HartiganHM/concert-crawl/issues/1043)) ([8392bbf](https://github.com/HartiganHM/concert-crawl/commit/8392bbf38afa47b0ebb09cc86e4184a9bbff6f90))


### Features

* **bruno:** add force-recrawl requests + prod environment ([#1046](https://github.com/HartiganHM/concert-crawl/issues/1046)) ([2ccb610](https://github.com/HartiganHM/concert-crawl/commit/2ccb61025136fc0e3057fbbc9e7d2e2d5bd26916)), closes [#1033](https://github.com/HartiganHM/concert-crawl/issues/1033)
* **entitlements:** spotify-sync visible-locked for free/supporter/logged-out ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 2) ([a9b1278](https://github.com/HartiganHM/concert-crawl/commit/a9b1278cf1caa051ac91d1d5dc9f4c0fc5dc2b79))

# [1.134.0](https://github.com/HartiganHM/concert-crawl/compare/v1.133.0...v1.134.0) (2026-07-18)


### Bug Fixes

* **api:** return non-optional SQL from purgeFollowsWhere (Copilot round 4) ([cb232f0](https://github.com/HartiganHM/concert-crawl/commit/cb232f0a9432d349c5df4d3912aa7b197e7ffa5c))
* **billing:** scope 90-day follow purge to source='manual' ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) E9) ([4bbbb36](https://github.com/HartiganHM/concert-crawl/commit/4bbbb369e4ff2a294ab270d0463f7a4c787683b6))
* **crawler:** sort canonicalizeSupporting output for deterministic storage (Copilot round 2) ([fd73cbc](https://github.com/HartiganHM/concert-crawl/commit/fd73cbcb9d12e386f22549f4fc1359f2b420992d))
* import canonical helpers via relative source path in backfill helpers (Copilot round 6) ([d5d7048](https://github.com/HartiganHM/concert-crawl/commit/d5d7048371a8076cab08578a787ecf6b7211f772))
* **scripts:** address Copilot round 1 — drop dead undefined guard, scan all follow rows in backfill ([954ee4e](https://github.com/HartiganHM/concert-crawl/commit/954ee4e699c6a234eedf908ecd2717880176de8d))
* **scripts:** guard events backfill update with IS NULL re-check (Copilot round 3) ([3d5199e](https://github.com/HartiganHM/concert-crawl/commit/3d5199e828674c02ef2be59ab5f96fcde8e64b17))
* **web:** stack settings profile hero vertically at mobile width ([#1042](https://github.com/HartiganHM/concert-crawl/issues/1042)) ([cbf5bbf](https://github.com/HartiganHM/concert-crawl/commit/cbf5bbf6d60999f1978db94366e829ac9af9ffca)), closes [#1023](https://github.com/HartiganHM/concert-crawl/issues/1023)


### Features

* **crawler:** write events.canonical_supporting on every supporting_artists write ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([ab4d0ff](https://github.com/HartiganHM/concert-crawl/commit/ab4d0ff8b4aa9a8a07df01be9b9cd58647b48492))
* **db:** add events.canonical_supporting with GIN index ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([ab81c73](https://github.com/HartiganHM/concert-crawl/commit/ab81c73650f433be3daf41c5f21c41f428e1f829))
* **db:** add user_profiles.spotify_nudge_seen_at ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([0b4b5d0](https://github.com/HartiganHM/concert-crawl/commit/0b4b5d0edf84f4a52335e0bd132c2af403a4ea52))
* **db:** add user_spotify_connections, push_subscriptions, spotify_alert_log tables ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([336ff7f](https://github.com/HartiganHM/concert-crawl/commit/336ff7f3206923548dd47295fd154a10fbef9cbd))
* **db:** extend user_artist_follows with source/canonical_name/rank/last_synced_at ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([6f6d1a0](https://github.com/HartiganHM/concert-crawl/commit/6f6d1a0fbd163ffdb55850d344f7cf971c766377))
* **db:** migration 0051 — spotify sync schema expansion ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([b4b9ec4](https://github.com/HartiganHM/concert-crawl/commit/b4b9ec4fbefa6cdb3c14d68c85417826c43dbba8))
* **scripts:** canonical_name + canonical_supporting backfills ([#763](https://github.com/HartiganHM/concert-crawl/issues/763) PR 1) ([4c7b92e](https://github.com/HartiganHM/concert-crawl/commit/4c7b92e95d50812e5255b07b2892c0fe6d0c529d))

# [1.133.0](https://github.com/HartiganHM/concert-crawl/compare/v1.132.1...v1.133.0) (2026-07-18)


### Features

* **crawler:** force-recrawl flag to reprocess legacy events ([#1033](https://github.com/HartiganHM/concert-crawl/issues/1033)) ([5ad0dfa](https://github.com/HartiganHM/concert-crawl/commit/5ad0dfa6de253d2e9547515f6f147164a101595f))

## [1.132.1](https://github.com/HartiganHM/concert-crawl/compare/v1.132.0...v1.132.1) (2026-07-18)


### Bug Fixes

* **api+db:** relocate price cred to per-user user_cred table ([#1012](https://github.com/HartiganHM/concert-crawl/issues/1012)) ([#1031](https://github.com/HartiganHM/concert-crawl/issues/1031)) ([53c1833](https://github.com/HartiganHM/concert-crawl/commit/53c18337033de357de5a7f931a2b359d9742990d))

# [1.132.0](https://github.com/HartiganHM/concert-crawl/compare/v1.131.6...v1.132.0) (2026-07-18)


### Bug Fixes

* **pwa:** match app icons to locked ClusterPath mark ([#1035](https://github.com/HartiganHM/concert-crawl/issues/1035)) ([1714b93](https://github.com/HartiganHM/concert-crawl/commit/1714b93adada4df9e05ac8d939cccadadb8d418c))


### Features

* **cal:** "Back to Today" surface button ([#1006](https://github.com/HartiganHM/concert-crawl/issues/1006)) ([#1034](https://github.com/HartiganHM/concert-crawl/issues/1034)) ([c900997](https://github.com/HartiganHM/concert-crawl/commit/c900997cb468c614908f876d7f7196f50f11bbb1))

## [1.131.6](https://github.com/HartiganHM/concert-crawl/compare/v1.131.5...v1.131.6) (2026-07-18)


### Bug Fixes

* **admin:** surface street address field on venue detail form ([30f8b1e](https://github.com/HartiganHM/concert-crawl/commit/30f8b1eaa10d69d93c1d46ef8d0c696364458bd9))
* **pwa:** render "any" icons, unblock icon fetches, in-flow offline banner ([#1029](https://github.com/HartiganHM/concert-crawl/issues/1029)) ([66dde64](https://github.com/HartiganHM/concert-crawl/commit/66dde64c1f65f92e6bbbe0a89e55e058b4c131b7))

## [1.131.5](https://github.com/HartiganHM/concert-crawl/compare/v1.131.4...v1.131.5) (2026-07-18)


### Bug Fixes

* **admin:** contain dispute panel overflow at 1200/744/320px ([#1023](https://github.com/HartiganHM/concert-crawl/issues/1023)) ([9842bae](https://github.com/HartiganHM/concert-crawl/commit/9842baef2f71d61a5d2ed6f526b79b03c4b81489)), closes [#1013](https://github.com/HartiganHM/concert-crawl/issues/1013) [#1014](https://github.com/HartiganHM/concert-crawl/issues/1014) [#961](https://github.com/HartiganHM/concert-crawl/issues/961)

## [1.131.4](https://github.com/HartiganHM/concert-crawl/compare/v1.131.3...v1.131.4) (2026-07-18)


### Bug Fixes

* **admin:** reflow dashboard, venue, and review surfaces at 320px ([#1028](https://github.com/HartiganHM/concert-crawl/issues/1028)) ([7dce0c0](https://github.com/HartiganHM/concert-crawl/commit/7dce0c05e545457ede2ac47fb6416abbbf963338)), closes [#1014](https://github.com/HartiganHM/concert-crawl/issues/1014)
* wire JumpPicker footer Today reset to actually select today ([#1026](https://github.com/HartiganHM/concert-crawl/issues/1026)) ([82574c9](https://github.com/HartiganHM/concert-crawl/commit/82574c9f1b420c05723de9df64d7c9875fad7370))

## [1.131.3](https://github.com/HartiganHM/concert-crawl/compare/v1.131.2...v1.131.3) (2026-07-18)


### Bug Fixes

* **crawler:** address Copilot R1 — clarify exemption rationale + robust test URL check ([0f9d8ee](https://github.com/HartiganHM/concert-crawl/commit/0f9d8eef0ef2f981a0d06e5d2f267bc716126d89))
* **crawler:** exempt VenuePilot API from robots.txt gate ([983e6f4](https://github.com/HartiganHM/concert-crawl/commit/983e6f41cad1faebb5fab8dca3c384200accaa76)), closes [#1016](https://github.com/HartiganHM/concert-crawl/issues/1016)
* dedupe headliner from openers in JSON-LD extractor ([#643](https://github.com/HartiganHM/concert-crawl/issues/643)) ([#1025](https://github.com/HartiganHM/concert-crawl/issues/1025)) ([38e76c2](https://github.com/HartiganHM/concert-crawl/commit/38e76c2383ad12c8bdebad8eea244b28c3264b31)), closes [#1004](https://github.com/HartiganHM/concert-crawl/issues/1004)

## [1.131.2](https://github.com/HartiganHM/concert-crawl/compare/v1.131.1...v1.131.2) (2026-07-18)


### Bug Fixes

* **web:** restore SVG favicon dropped by explicit metadata.icons ([#1020](https://github.com/HartiganHM/concert-crawl/issues/1020)) ([20ae19a](https://github.com/HartiganHM/concert-crawl/commit/20ae19ade59dead812eba83389b5def3e13977e8)), closes [#1015](https://github.com/HartiganHM/concert-crawl/issues/1015)

## [1.131.1](https://github.com/HartiganHM/concert-crawl/compare/v1.131.0...v1.131.1) (2026-07-18)


### Bug Fixes

* **ci:** build web workspace deps before lighthouse run ([9c0f8f9](https://github.com/HartiganHM/concert-crawl/commit/9c0f8f964e72f65e1a17e7534121c1c31ee8cb89))

# [1.131.0](https://github.com/HartiganHM/concert-crawl/compare/v1.130.2...v1.131.0) (2026-07-18)


### Bug Fixes

* **pwa:** detect iPadOS 13+ Safari for the install hint ([3034d37](https://github.com/HartiganHM/concert-crawl/commit/3034d378bcc6805ec7f233d4ff9a62d9e3ba0587))
* **pwa:** fall back to authenticated reads when beta auth gating is on ([1943bdb](https://github.com/HartiganHM/concert-crawl/commit/1943bdbd41ab86f64be3f968ae1a8f8ab148732a))
* **pwa:** fetch public event/availability reads without auth so the offline cache populates ([ea1b29e](https://github.com/HartiganHM/concert-crawl/commit/ea1b29ed5ab9f638cec9081d5ea134848bece6af))
* **pwa:** harden SW origin parse, auth SSR availability prefetch, log auth-retry failures ([4f56517](https://github.com/HartiganHM/concert-crawl/commit/4f56517e33cff126c5fcc0a9ed37a35dfcdef6a8))
* **pwa:** log failed public reads before rethrowing ([7e6db45](https://github.com/HartiganHM/concert-crawl/commit/7e6db456c3aac319903cbd254f92e2d2a212cbba))
* **pwa:** match event id as UUID in public-cache allowlist ([3da8c84](https://github.com/HartiganHM/concert-crawl/commit/3da8c84c70786b9bac318d2640341db16c772cb4))
* **pwa:** tighten public-cache allowlist to explicit read routes ([5154420](https://github.com/HartiganHM/concert-crawl/commit/51544201d0ed43963501143b40551dc68c21f379))


### Features

* **web:** add install prompt (Android/desktop + iOS hint) ([641260b](https://github.com/HartiganHM/concert-crawl/commit/641260b2d3017fed1bf7d0506d7f1f7183ad4b09))
* **web:** add offline banner ([923b3f9](https://github.com/HartiganHM/concert-crawl/commit/923b3f9b2601af180a2c010a4cd92981d8b7e836))
* **web:** add public-API cache allowlist helper ([af76153](https://github.com/HartiganHM/concert-crawl/commit/af76153938d203fd19dcf436506175c95a6f9ce9))
* **web:** add useOnlineStatus hook ([b131ec6](https://github.com/HartiganHM/concert-crawl/commit/b131ec66e9899e3289755a6cc602e9673bf601a4))
* **web:** cache public event/venue reads offline (stale-while-revalidate) ([032092d](https://github.com/HartiganHM/concert-crawl/commit/032092de84fcd6956c201150301470147f72c87a))

## [1.130.2](https://github.com/HartiganHM/concert-crawl/compare/v1.130.1...v1.130.2) (2026-07-18)


### Bug Fixes

* **admin:** guard crawl-trigger poll against post-unmount state updates ([52d025b](https://github.com/HartiganHM/concert-crawl/commit/52d025b2d05c25f417b3a01a3c27b7819188849c))
* **admin:** guard remaining post-await state updates; use POLL_INTERVAL_MS in tests ([aeb5a31](https://github.com/HartiganHM/concert-crawl/commit/aeb5a3124475ee2ed768875734e9abd8134ac968))
* **admin:** poll crawl trigger before fetching run in Run crawl now ([9d103c9](https://github.com/HartiganHM/concert-crawl/commit/9d103c98411b68682b44cbb381ab6458c1ebebc8)), closes [#1002](https://github.com/HartiganHM/concert-crawl/issues/1002)
* **admin:** self-scheduling poll + deterministic timer tests ([95d3e43](https://github.com/HartiganHM/concert-crawl/commit/95d3e43c96be22770dcff9853b8088c836fbc677))

## [1.130.1](https://github.com/HartiganHM/concert-crawl/compare/v1.130.0...v1.130.1) (2026-07-17)


### Bug Fixes

* **crawler:** drop LLM openers that repeat the headliner ([#1004](https://github.com/HartiganHM/concert-crawl/issues/1004)) ([b86a201](https://github.com/HartiganHM/concert-crawl/commit/b86a2012e70b6af7928ee78e7dba13b3feda63fd))
* **web:** sync calendar selection when a cross-week jump re-renders ([b19bf9d](https://github.com/HartiganHM/concert-crawl/commit/b19bf9dfbfb82b25913e8650f154501654ab621e))

# [1.130.0](https://github.com/HartiganHM/concert-crawl/compare/v1.129.0...v1.130.0) (2026-07-17)


### Bug Fixes

* **web:** unregister stale SW in dev; soften offline copy ([6e0e11a](https://github.com/HartiganHM/concert-crawl/commit/6e0e11a12db4645d02e4e826de9af9f9f74cf66f))


### Features

* **web:** add offline fallback page ([cc31334](https://github.com/HartiganHM/concert-crawl/commit/cc313347b8bc9da1b4655dcce4b9b31eecfb58e2))
* **web:** add Serwist service worker with app-shell precache ([f44eaff](https://github.com/HartiganHM/concert-crawl/commit/f44eaff2612d65cd96d89972d5df94a4c27ae7fa))
* **web:** register service worker client-side ([34187a3](https://github.com/HartiganHM/concert-crawl/commit/34187a30e067116a3394799a24133bd3f582fae4))

# [1.129.0](https://github.com/HartiganHM/concert-crawl/compare/v1.128.0...v1.129.0) (2026-07-17)


### Bug Fixes

* **web:** cache apple-icon; drop out-of-scope historical doc edits ([f767d11](https://github.com/HartiganHM/concert-crawl/commit/f767d119dc7888023b0284bcb705eed356f8905e)), closes [#526](https://github.com/HartiganHM/concert-crawl/issues/526)
* **web:** consolidate apple-touch-icon onto apple-icon convention ([19c4959](https://github.com/HartiganHM/concert-crawl/commit/19c49593f7f85b31fe00999d5d4fc9807636803e))
* **web:** maskable icon background full-bleed (move outside transformed group) ([5775943](https://github.com/HartiganHM/concert-crawl/commit/57759435103c36466c94511d796c92119d41ccb8))


### Features

* **web:** add iOS PWA meta tags, apple-touch icon, manifest screenshots ([f58871b](https://github.com/HartiganHM/concert-crawl/commit/f58871b11b43958ed48c9e6afdc9d5102b45d24b))
* **web:** add maskable + apple-touch PWA icon routes ([8ccbeb6](https://github.com/HartiganHM/concert-crawl/commit/8ccbeb61ec4757bbe8f9855121f54dbb8468c874))
* **web:** add maskable variant to PWA icon generator ([d9afb9e](https://github.com/HartiganHM/concert-crawl/commit/d9afb9eb5c18396ce803d9b6980d27f0b0bbb26d))
* **web:** complete PWA manifest (maskable icons, shortcuts, categories) ([21e3dd6](https://github.com/HartiganHM/concert-crawl/commit/21e3dd673db936a7df6eb6eb06b4cecc4cc38cc3))


### Performance Improvements

* **web:** cache PWA icon route responses via shared Cache-Control header ([398fb57](https://github.com/HartiganHM/concert-crawl/commit/398fb573a1896c717fe5fcc238fd8b5fdbf4a39a))

# [1.128.0](https://github.com/HartiganHM/concert-crawl/compare/v1.127.1...v1.128.0) (2026-07-17)


### Features

* **web:** supporting-artists line + tour kicker on event surfaces ([#643](https://github.com/HartiganHM/concert-crawl/issues/643)) ([#995](https://github.com/HartiganHM/concert-crawl/issues/995)) ([f1ac32e](https://github.com/HartiganHM/concert-crawl/commit/f1ac32e315a19920074ea603bbe40d37ec4d2f32))

## [1.127.1](https://github.com/HartiganHM/concert-crawl/compare/v1.127.0...v1.127.1) (2026-07-17)


### Bug Fixes

* **admin:** [#961](https://github.com/HartiganHM/concert-crawl/issues/961) reflow dispute panel two-up grid for mobile ([#991](https://github.com/HartiganHM/concert-crawl/issues/991)) ([198b855](https://github.com/HartiganHM/concert-crawl/commit/198b855d333b92c347c93f78d4bfbb9d3f88dbf0))
* **admin:** [#974](https://github.com/HartiganHM/concert-crawl/issues/974) wrap long feedback URLs and stack expanded columns on mobile ([#989](https://github.com/HartiganHM/concert-crawl/issues/989)) ([7a63e69](https://github.com/HartiganHM/concert-crawl/commit/7a63e69cc164510c30953214b41b5354e00a94c0))
* **settings:** [#979](https://github.com/HartiganHM/concert-crawl/issues/979) wrap long profile handles in card header ([#984](https://github.com/HartiganHM/concert-crawl/issues/984)) ([5f50e0c](https://github.com/HartiganHM/concert-crawl/commit/5f50e0c3a20dbc952e29aaa3ffd04cab0655a6cd))

# [1.127.0](https://github.com/HartiganHM/concert-crawl/compare/v1.126.0...v1.127.0) (2026-07-17)


### Bug Fixes

* **api:** order availability response by date ascending ([73a5b8e](https://github.com/HartiganHM/concert-crawl/commit/73a5b8ef084ff3d0311e8ffd7c3dcfe28efd895c))
* default availability window to MT + key calendar cells by ISO ([4510021](https://github.com/HartiganHM/concert-crawl/commit/451002163c3a922af549eec725f6023df5a11706))
* **events:** wrap availability error responses in success envelope ([f47efa5](https://github.com/HartiganHM/concert-crawl/commit/f47efa560bd85e0583234e1887e7d6b45339ffcb))
* server-safe availability fetch + avoid dead picker tab-stop ([39642e0](https://github.com/HartiganHM/concert-crawl/commit/39642e0e615110d08d31219c0ab1fae68110f62e))
* single Escape close + non-overlapping mobile breakpoint ([447a8c0](https://github.com/HartiganHM/concert-crawl/commit/447a8c0ebbfb4bf54de043d6767790f14818137d))
* **web+api:** address Copilot review on jump picker ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([0f3a283](https://github.com/HartiganHM/concert-crawl/commit/0f3a283843830d399ffc81183ac167a81a718606))
* **web+api:** address Copilot round 3 on jump picker ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([ac0f80f](https://github.com/HartiganHM/concert-crawl/commit/ac0f80facd1edb9bd566ca517144365e5cefefd9))
* **web:** address Copilot round 2 on jump picker ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([8bb7f6b](https://github.com/HartiganHM/concert-crawl/commit/8bb7f6b24da70123af87c878961d26a06ad1832d))
* **web:** derive WeekStrip day aria-label from ISO date ([965c0b6](https://github.com/HartiganHM/concert-crawl/commit/965c0b66faa86f90365f5cc85f0317cf9c56f8fb))
* **web:** float jump picker as popover with click-outside scrim ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([fd01717](https://github.com/HartiganHM/concert-crawl/commit/fd01717c240da9666e7f86af428da23ee6b3bf57))
* **week-strip:** expose shows-on-sale cue in day accessible name ([6a034a0](https://github.com/HartiganHM/concert-crawl/commit/6a034a034bdf7319e880da29e3efe2c916d23151))
* wrap availability response in success envelope + scope picker chevron CSS ([4050f96](https://github.com/HartiganHM/concert-crawl/commit/4050f963b684fa41c1dea1d474d9ad6ffe9a2975))


### Features

* **api:** add GET /v1/events/availability date-count endpoint ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([59b14b9](https://github.com/HartiganHM/concert-crawl/commit/59b14b92fedc2c0793a1bfd33c21f4a7d11989b0))
* **types:** add EventsAvailabilityResponse for calendar jump picker ([dae97a6](https://github.com/HartiganHM/concert-crawl/commit/dae97a68f3ba9917a99504fd3e103c8d0d43f9ef))
* **web:** add jump-picker copy strings ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([2ba6ea6](https://github.com/HartiganHM/concert-crawl/commit/2ba6ea645ffa8a474dbd7c72de489868766f32e0))
* **web:** add jump-picker date-math helpers ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([61c2466](https://github.com/HartiganHM/concert-crawl/commit/61c24666f82647127faf11e9ef8b154aef528639))
* **web:** add jump-picker month-grid component ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([ca78114](https://github.com/HartiganHM/concert-crawl/commit/ca781145993c971c5ef868935ce18ecd155babbc))
* **web:** availability react-query hook + SSR prefetch ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([70b5c85](https://github.com/HartiganHM/concert-crawl/commit/70b5c85168f6b781a703d774f0c69be9e7064ed7))
* **web:** weekstrip header cue + grid-only week strip ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([10a9043](https://github.com/HartiganHM/concert-crawl/commit/10a9043e39b14daf5730731c1688649006f4dd2c))
* **web:** wire jump picker into calendarview with cross-week nav ([#642](https://github.com/HartiganHM/concert-crawl/issues/642)) ([3c88dd1](https://github.com/HartiganHM/concert-crawl/commit/3c88dd148700cff6762eeafed6fed8dc50d4a8b5))

# [1.126.0](https://github.com/HartiganHM/concert-crawl/compare/v1.125.0...v1.126.0) (2026-07-17)


### Features

* **#643:** supportingArtists + tourName data layer (PR1 of 2) ([#994](https://github.com/HartiganHM/concert-crawl/issues/994)) ([8e8b7c4](https://github.com/HartiganHM/concert-crawl/commit/8e8b7c404eb3349fd201f946f0d656a13f33e04a)), closes [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643) [#643](https://github.com/HartiganHM/concert-crawl/issues/643)

# [1.125.0](https://github.com/HartiganHM/concert-crawl/compare/v1.124.1...v1.125.0) (2026-07-17)


### Bug Fixes

* **crawler:** address Copilot review on VenuePilot fetcher ([b554805](https://github.com/HartiganHM/concert-crawl/commit/b55480598fcf0687d7a0ad48f35cc780712883df))
* **crawler:** guard invalid venue timezone + malformed event date ([a02c52e](https://github.com/HartiganHM/concert-crawl/commit/a02c52efd15bfd84dd4b69f66d53579eb7803b54))
* **venuepilot:** round 3 — extend CrawlFetchError; trim ticketUrl ([e0c5eae](https://github.com/HartiganHM/concert-crawl/commit/e0c5eae4e5bda29ee3fa8bc3fda6a0658e7cd171))


### Features

* **crawler:** add VenuePilot GraphQL fetcher ([fa7ca0b](https://github.com/HartiganHM/concert-crawl/commit/fa7ca0bf50100edde94328ea888e86b87d5b2b2d))
* **crawler:** route venuepilot venues through dispatch ([f5e1c8c](https://github.com/HartiganHM/concert-crawl/commit/f5e1c8c1eec70fdf692a2d4d940b56a03244e1a9))

## [1.124.1](https://github.com/HartiganHM/concert-crawl/compare/v1.124.0...v1.124.1) (2026-07-17)


### Bug Fixes

* **billing:** repoint Stripe portal return_url to /me?section=plan ([#983](https://github.com/HartiganHM/concert-crawl/issues/983)) ([93c42b0](https://github.com/HartiganHM/concert-crawl/commit/93c42b08220ef49cf0fde5db35b1af2f3a4b4e10)), closes [#966](https://github.com/HartiganHM/concert-crawl/issues/966)

# [1.124.0](https://github.com/HartiganHM/concert-crawl/compare/v1.123.0...v1.124.0) (2026-07-17)


### Features

* **audit:** expand UI-audit sweep manifest to full route coverage ([#980](https://github.com/HartiganHM/concert-crawl/issues/980)) ([0c9bb6f](https://github.com/HartiganHM/concert-crawl/commit/0c9bb6f526f99b23411bd3809b7b54175e23b540))

# [1.123.0](https://github.com/HartiganHM/concert-crawl/compare/v1.122.0...v1.123.0) (2026-07-17)


### Bug Fixes

* address copilot review — drop as-casts in parseZodIssues, guard merged api-field state ([8bfa1e9](https://github.com/HartiganHM/concert-crawl/commit/8bfa1e927a3c4b89af650c7c06fddd2fb868a3d9))
* fall back to first Zod issue message for zValidator errors ([4b28384](https://github.com/HartiganHM/concert-crawl/commit/4b283846bf39ba4ee3a262ec518beb6ef4ba2a1f))
* log handled slug/apiAccountId failures in updateVenue catch ([67566b6](https://github.com/HartiganHM/concert-crawl/commit/67566b624c2377f6e98e2207c63369157a28dcd3))
* narrow apiProviderVal state to ApiProvider union ([4113e72](https://github.com/HartiganHM/concert-crawl/commit/4113e7291bba6f2da540d553d1751deffd95d17c))
* unblock next build + address copilot round 2 ([7627f5b](https://github.com/HartiganHM/concert-crawl/commit/7627f5bb7daa6ebf4f4a0d125d04c2b2eab38f3b))


### Features

* **api:** apiProvider + apiAccountId on updateVenueSchema with cross-field validation ([#506](https://github.com/HartiganHM/concert-crawl/issues/506)) ([8ec9889](https://github.com/HartiganHM/concert-crawl/commit/8ec98896f30e42a436bb5c9aff5c0cae9a6f1cc2))
* **db:** api_provider enum + api_account_id columns on venues ([#506](https://github.com/HartiganHM/concert-crawl/issues/506)) ([211e573](https://github.com/HartiganHM/concert-crawl/commit/211e5734878d05eab4cfa18ecfb5caaf3ee20040))
* **web:** add api provider + account id fields to venue edit ([dc9b102](https://github.com/HartiganHM/concert-crawl/commit/dc9b1028835b871db391885309f3c540d54a23a6))
* **web:** normalize apiProvider/apiAccountId in updateVenue action ([c17fb56](https://github.com/HartiganHM/concert-crawl/commit/c17fb565c9752a28e670a8dc2ef21016e4824119))

# [1.122.0](https://github.com/HartiganHM/concert-crawl/compare/v1.121.0...v1.122.0) (2026-07-16)


### Features

* **emails:** [#783](https://github.com/HartiganHM/concert-crawl/issues/783) monetization email brand pass — dark branded system ([#964](https://github.com/HartiganHM/concert-crawl/issues/964)) ([3bbae49](https://github.com/HartiganHM/concert-crawl/commit/3bbae49925310ef967f4752e4fd5ba6d1f09686d))

# [1.121.0](https://github.com/HartiganHM/concert-crawl/compare/v1.120.2...v1.121.0) (2026-07-16)


### Features

* **audit:** detect container-relative horizontal overflow ([#963](https://github.com/HartiganHM/concert-crawl/issues/963)) ([b322453](https://github.com/HartiganHM/concert-crawl/commit/b3224535648ce8be3e37161f83944d917e5bc5f3)), closes [#962](https://github.com/HartiganHM/concert-crawl/issues/962)

## [1.120.2](https://github.com/HartiganHM/concert-crawl/compare/v1.120.1...v1.120.2) (2026-07-16)


### Bug Fixes

* **audit:** calibrate ui-audit harness against seeded staging ([#960](https://github.com/HartiganHM/concert-crawl/issues/960)) ([61dd288](https://github.com/HartiganHM/concert-crawl/commit/61dd28870cc59aa975b791cbc807cea6bd92c22a))

## [1.120.1](https://github.com/HartiganHM/concert-crawl/compare/v1.120.0...v1.120.1) (2026-07-15)


### Bug Fixes

* **api:** [#941](https://github.com/HartiganHM/concert-crawl/issues/941) drain fire-and-forget background tasks in integration tests ([#950](https://github.com/HartiganHM/concert-crawl/issues/950)) ([6ea18fa](https://github.com/HartiganHM/concert-crawl/commit/6ea18fa24bf57f199b01abbebc1d913c8dcacd12))

# [1.120.0](https://github.com/HartiganHM/concert-crawl/compare/v1.119.1...v1.120.0) (2026-07-15)


### Bug Fixes

* **admin:** include @ in users-list detail-link aria-label (PR [#947](https://github.com/HartiganHM/concert-crawl/issues/947) R1) ([4adbb17](https://github.com/HartiganHM/concert-crawl/commit/4adbb170c6f653238977d519a3bba29e10c0248f))
* **admin:** include full visible text in users-list link name (PR [#947](https://github.com/HartiganHM/concert-crawl/issues/947) R2) ([2371e6e](https://github.com/HartiganHM/concert-crawl/commit/2371e6ead296c0b31c06630ef0e54e391a6cbbc5))


### Features

* **admin:** link users-list rows to the user detail page ([7943cc2](https://github.com/HartiganHM/concert-crawl/commit/7943cc2939e25f20b8ca3fd11a3542b09cc9baf9)), closes [#930](https://github.com/HartiganHM/concert-crawl/issues/930)

## [1.119.1](https://github.com/HartiganHM/concert-crawl/compare/v1.119.0...v1.119.1) (2026-07-15)


### Bug Fixes

* submission success surface + marketplace fee label ([#949](https://github.com/HartiganHM/concert-crawl/issues/949)) ([bf10e7b](https://github.com/HartiganHM/concert-crawl/commit/bf10e7bea1495dc6c25b6bff128b387f54df6f80)), closes [post-#935](https://github.com/post-/issues/935)

# [1.119.0](https://github.com/HartiganHM/concert-crawl/compare/v1.118.1...v1.119.0) (2026-07-15)


### Bug Fixes

* **audit:** gate naturalWidth broken-image check on img.complete ([d7a5422](https://github.com/HartiganHM/concert-crawl/commit/d7a5422f7d29a4340b51ab506a66670d6f955707))
* **audit:** isolate stale-capture failures; guard --tags <dash-prefixed> ([5bd8d37](https://github.com/HartiganHM/concert-crawl/commit/5bd8d37acf7f8f1105e4a7ac670ea87a09feaae0))
* **audit:** r1 — prod-host guard, path-safe manifest ids, stderr logging ([58115b9](https://github.com/HartiganHM/concert-crawl/commit/58115b9c65fedc247b552e765fd76c5cf74e2fc0))
* **audit:** r2 — close protocol-relative + trailing-dot bypass paths ([0355b94](https://github.com/HartiganHM/concert-crawl/commit/0355b9457caf7399fcce389e8d151f6b2f76fbfe))
* **audit:** r3 — trim creds, sharpen ROUTE_PATH_PATTERN doc, drop test-harness `as` casts ([1ee35e2](https://github.com/HartiganHM/concert-crawl/commit/1ee35e25bc509859732de097dfa63bcbba9711d5))
* **audit:** r4 — whitespace trims, test-state isolation, non-array interactions ([89cc88e](https://github.com/HartiganHM/concert-crawl/commit/89cc88e309a4e72c1505f6f021d0496d16e23c8a))
* **audit:** r5 — house-rule catch log; correct outputPathFor doc drift ([fbd7298](https://github.com/HartiganHM/concert-crawl/commit/fbd72985b7bb73e9ce4117f505fb59bec5da9f3b)), closes [#3](https://github.com/HartiganHM/concert-crawl/issues/3)
* **audit:** rename pnpm script, gitignore .superpowers/, clarify CLI guard ([def40ff](https://github.com/HartiganHM/concert-crawl/commit/def40ffb16294b6b62de3557fd76002d272ff1fa))
* **audit:** replace `as` value casts with a proper type guard ([3a9eb92](https://github.com/HartiganHM/concert-crawl/commit/3a9eb921d02c06ecce39442ba030db06c6a19574))


### Features

* **audit:** dom heuristics — overflow, offscreen, tap targets, broken images ([cc977b5](https://github.com/HartiganHM/concert-crawl/commit/cc977b5c783e02f1b10edc4ad193db7fcf646229))
* **audit:** initial route manifest — admin + consumer surfaces ([ad46199](https://github.com/HartiganHM/concert-crawl/commit/ad4619947122ba0575696624e936efeb9f471576))
* **audit:** manifest schema + validator (Zod, unique ids, non-empty tags) ([d26c6b7](https://github.com/HartiganHM/concert-crawl/commit/d26c6b77834c5811090840e51ff391f2ac4f124a))
* **audit:** mark thin renders as insufficientData for triage skip ([261bded](https://github.com/HartiganHM/concert-crawl/commit/261bded9a1ff5e2cb275e972c06e4d22719c8619))
* **audit:** pnpm --filter e2e audit wiring + audit-scoped auth state ([170d8be](https://github.com/HartiganHM/concert-crawl/commit/170d8be2d9d2a999799efcfedff8e14050d11afb))
* **audit:** sweep runner — viewport matrix, interactions, heuristics per capture ([cea24a1](https://github.com/HartiganHM/concert-crawl/commit/cea24a1b44c4acebadb6bdb01f7f7fac5027a480))

## [1.118.1](https://github.com/HartiganHM/concert-crawl/compare/v1.118.0...v1.118.1) (2026-07-15)


### Bug Fixes

* **ci:** unblock Security audit — pnpm audit hits retired npm endpoint ([#951](https://github.com/HartiganHM/concert-crawl/issues/951)) ([d51d6ca](https://github.com/HartiganHM/concert-crawl/commit/d51d6ca483377c40ac29500c05032240d4d073b3))

# [1.118.0](https://github.com/HartiganHM/concert-crawl/compare/v1.117.0...v1.118.0) (2026-07-14)


### Bug Fixes

* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R1 — escape DB identifiers + .js import suffixes ([c10f3b5](https://github.com/HartiganHM/concert-crawl/commit/c10f3b509ed1ad78e394300f5b009a321edee086))
* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R2 — escape hook JSON + document SessionStart prune ([495e1df](https://github.com/HartiganHM/concert-crawl/commit/495e1df99c282b9e2c69e72f8d37306c9b2f20b0))
* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R3 — tolerate concurrent test DB creation ([a38c614](https://github.com/HartiganHM/concert-crawl/commit/a38c6148b3036b92aa7006e3727ceaf14d75b2d7))
* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R4 — v4 single-fork shape + nested worktree paths ([f45a02c](https://github.com/HartiganHM/concert-crawl/commit/f45a02c54af857527fe3297a2833bf4141750717)), closes [797/#856](https://github.com/HartiganHM/concert-crawl/issues/856)
* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R5 — prune only the local test DB instance ([0be63fe](https://github.com/HartiganHM/concert-crawl/commit/0be63fedf62424c6060016c10603f23a2c292a2e))
* [#748](https://github.com/HartiganHM/concert-crawl/issues/748) PR [#936](https://github.com/HartiganHM/concert-crawl/issues/936) R6 — escape LIKE underscores + validate empty test DB name ([46031c4](https://github.com/HartiganHM/concert-crawl/commit/46031c4b6a766825c3ce56b980fd30d03ca6ff15))
* **api:** [#748](https://github.com/HartiganHM/concert-crawl/issues/748) explicit .js import + guard empty worktree dir ([29b3b74](https://github.com/HartiganHM/concert-crawl/commit/29b3b74ca526efe61e0b6c934c1b3f2dc07b60db))
* **scripts:** [#748](https://github.com/HartiganHM/concert-crawl/issues/748) harden clean-worktrees against SIGPIPE at scale ([4c3f523](https://github.com/HartiganHM/concert-crawl/commit/4c3f523aa03a4b0a3bc3a5c1805172ab26749e69))


### Features

* **scripts:** [#748](https://github.com/HartiganHM/concert-crawl/issues/748) worktree:prune drops orphaned test DBs ([0dc79a0](https://github.com/HartiganHM/concert-crawl/commit/0dc79a09ee30efce538022d6819177273b2122ad))

# [1.117.0](https://github.com/HartiganHM/concert-crawl/compare/v1.116.0...v1.117.0) (2026-07-14)


### Bug Fixes

* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) guard feedback issueUrl against non-http(s) schemes (PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R12) ([b0aba72](https://github.com/HartiganHM/concert-crawl/commit/b0aba7273eaa8178d5fd4826160fb9f15c6fc476))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R1 — accurate stats, 404 handling, deleted-account signal ([87108ac](https://github.com/HartiganHM/concert-crawl/commit/87108acfa804b5815293c49b34b1e0ad5cdcb20e))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R2 — primary email selection + visible user id ([6b8049e](https://github.com/HartiganHM/concert-crawl/commit/6b8049ecdda9ac4c7660126bf81877aa896762a2))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R3 — role default, badge parity, lazy list queries ([8b62129](https://github.com/HartiganHM/concert-crawl/commit/8b62129a0199884cb857bbfca23075561ba087d8))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R4 — narrow Clerk catch to 404, banner on missing token ([cf2442e](https://github.com/HartiganHM/concert-crawl/commit/cf2442ea089e9e3efa8d285dc49688cd49c02bf4))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R6 — relabel user-detail events section to match all-status data ([b51fef1](https://github.com/HartiganHM/concert-crawl/commit/b51fef1f238b677cd87b57bab8941933725b2258))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R8 — int-cast counts, rename watching→trackedEvents ([4d29544](https://github.com/HartiganHM/concert-crawl/commit/4d2954465e4b7a6f15a97b6650cde5d31fe72673))
* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R9 — render theme/avatarColor, share feedback status map ([3a92f5c](https://github.com/HartiganHM/concert-crawl/commit/3a92f5c45af42cc0ce9b18765013c8694ee049b9))
* **types:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R10 — tighten AdminUserDetail theme/avatarColor to enums ([3f60b1e](https://github.com/HartiganHM/concert-crawl/commit/3f60b1ee7a2097e51975665f191d1650704700c7))


### Features

* **admin:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) add /admin/users/:id detail page ([06f5cda](https://github.com/HartiganHM/concert-crawl/commit/06f5cda3817c8abae049cedf6c992953c4dcb5ff))


### Performance Improvements

* **api:** [#533](https://github.com/HartiganHM/concert-crawl/issues/533) parallelize user-detail list queries (PR [#930](https://github.com/HartiganHM/concert-crawl/issues/930) R14) ([98d7ce2](https://github.com/HartiganHM/concert-crawl/commit/98d7ce2a06cade714c9c4cb493727d840b23f679))

# [1.116.0](https://github.com/HartiganHM/concert-crawl/compare/v1.115.0...v1.116.0) (2026-07-14)


### Bug Fixes

* **seed-staging:** r1 — deterministic eventIds order, varchar(280) note cap, single-user safety ([5281840](https://github.com/HartiganHM/concert-crawl/commit/52818408ee4c655cd4a3cab24c266fdd8f291dfc))
* **seed-staging:** r2 — empty-array guard, unmasked cleanup errors, coherent type/category pairs ([35e7c5f](https://github.com/HartiganHM/concert-crawl/commit/35e7c5f135d09c4eeb3ac983b542942fac4bfff1))
* **seed-staging:** r3 — empty-array pick throws, runSynthetic guards, schema import path ([7f06acb](https://github.com/HartiganHM/concert-crawl/commit/7f06acbf50dcd06208d8e4e4dc8497dc15332c6f))
* **seed-staging:** r4 — confirms cleanup covers cascade-affected rows ([e3bb956](https://github.com/HartiganHM/concert-crawl/commit/e3bb9569d8ffd9de0fb8923b7b2aef68699a642b))
* **seed-staging:** r5 — collision-safe status patch, doc drift, confirms in summary ([0ecfaa8](https://github.com/HartiganHM/concert-crawl/commit/0ecfaa827252961292674a6126f3580dce03e4e4))
* **seed-staging:** r6 — accurate rng docstring, mock covers insertedConfirms ([0439958](https://github.com/HartiganHM/concert-crawl/commit/04399585a2efde9d0d581f12b675f7cc26afd2d6))


### Features

* **seed-staging:** synthetic user data for fixture Clerk users ([d220c0b](https://github.com/HartiganHM/concert-crawl/commit/d220c0b972f4849a2b648e985a8195da4db395d2)), closes [#926](https://github.com/HartiganHM/concert-crawl/issues/926)

# [1.115.0](https://github.com/HartiganHM/concert-crawl/compare/v1.114.1...v1.115.0) (2026-07-14)


### Bug Fixes

* **admin:** address Copilot review on test-email picker ([735de6d](https://github.com/HartiganHM/concert-crawl/commit/735de6da0ed14e7555117c8a54dcf4188b17cce0))
* **admin:** env-driven sample URL, DB-mock-safe key set, options-fail fallback ([67ed123](https://github.com/HartiganHM/concert-crawl/commit/67ed123686269e05d262b32a45d7a7368f708307))
* **admin:** honest options-fail fallback + Clerk-loaded gate for picker ([73c9ef3](https://github.com/HartiganHM/concert-crawl/commit/73c9ef335ca9fb60596e651d5bd86949cda51e7e))
* **scripts:** exact Copilot login match and actionable gh-failure hint ([142d26d](https://github.com/HartiganHM/concert-crawl/commit/142d26d37310f7cd15445abca9debd51ab53e26a)), closes [#failure](https://github.com/HartiganHM/concert-crawl/issues/failure)
* **scripts:** keep REPO stdout-only so gh stderr can't corrupt poll path ([196f5aa](https://github.com/HartiganHM/concert-crawl/commit/196f5aa60851c790bd0bb91ced00d3bf9404d2aa))
* **scripts:** preflight-check gh so a missing CLI fails with a clear message ([9fec7df](https://github.com/HartiganHM/concert-crawl/commit/9fec7dfa86356879ce4d7f972458bb8d0281c565))
* **scripts:** require type==Bot for the bare "copilot" reviewer match ([fe0c87e](https://github.com/HartiganHM/concert-crawl/commit/fe0c87e4dcaa08b582be0744da7c81370a0d24df))
* **scripts:** verify Copilot specifically attached, not just any reviewer ([07c48db](https://github.com/HartiganHM/concert-crawl/commit/07c48db7b5dd6de5110ee974d629f48fa647a189))
* **web:** reset optionsFailed after a successful test-email options fetch ([8964bd8](https://github.com/HartiganHM/concert-crawl/commit/8964bd8bca26362c7e726a263a9883ecf43547f4))


### Features

* **admin:** pick any email to preview via the test-email picker ([45ac617](https://github.com/HartiganHM/concert-crawl/commit/45ac617c90257eed7cfb880b0a52168a0fa43a2e))

## [1.114.1](https://github.com/HartiganHM/concert-crawl/compare/v1.114.0...v1.114.1) (2026-07-14)


### Bug Fixes

* **a11y:** concise InfoTooltip name + aria-describedby; reuse enrichment type ([52d63da](https://github.com/HartiganHM/concert-crawl/commit/52d63da954b32df8c73c5362a8a6a11916a5f2e4))
* **a11y:** use aria-controls not aria-describedby on InfoTooltip trigger ([2df713c](https://github.com/HartiganHM/concert-crawl/commit/2df713c273b33102a938a4a6f24a91225b43ce83))
* **consumer:** clarify imminent price tag copy + click tooltip ([2a85eb0](https://github.com/HartiganHM/concert-crawl/commit/2a85eb0ec83aa48cd1efd2d93cc69b06ce41e3dd))
* **copy:** pluralize imminent tooltip day/confirmation from policy values ([0348128](https://github.com/HartiganHM/concert-crawl/commit/0348128d0ffe02d587ed71650eb5a90fa8ea20cc))
* **venues:** mirror browse priceByTier so venue card shows cheapest tier ([1838d43](https://github.com/HartiganHM/concert-crawl/commit/1838d43397dd86758738768e877fc5f32a8d0dd9)), closes [#787](https://github.com/HartiganHM/concert-crawl/issues/787)

# [1.114.0](https://github.com/HartiganHM/concert-crawl/compare/v1.113.0...v1.114.0) (2026-07-14)


### Features

* **seed-staging:** prod→staging public-data sync ([2a159fa](https://github.com/HartiganHM/concert-crawl/commit/2a159fa414566d37decad27ab37f2aedce739141)), closes [#913](https://github.com/HartiganHM/concert-crawl/issues/913)

# [1.113.0](https://github.com/HartiganHM/concert-crawl/compare/v1.112.0...v1.113.0) (2026-07-13)


### Bug Fixes

* **analytics:** align node engines; document direct provider import (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R5) ([1e73d23](https://github.com/HartiganHM/concert-crawl/commit/1e73d233ba2472f5d3b1cf25ece34e6a7730998c))
* **analytics:** defensive guards + shutdown flush (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R1) ([f7a2281](https://github.com/HartiganHM/concert-crawl/commit/f7a2281490f3728d7d48af777cb34dbb51cd997e))
* **analytics:** empty-host fallback + fire-once picker view (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R2) ([400d81e](https://github.com/HartiganHM/concert-crawl/commit/400d81e82a682f0879cf265ae502b8b239e06afa))
* **analytics:** guard PostHog constructor so it never breaks billing (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R7) ([1bac6aa](https://github.com/HartiganHM/concert-crawl/commit/1bac6aacbf19fa61e5a927315d6920d0ae641f55))
* **analytics:** import PostHogProvider directly + clarify import-type comment (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R4) ([1fcc633](https://github.com/HartiganHM/concert-crawl/commit/1fcc633b43a6cbd1ea9a9e1175222fb99ed0e453))
* **analytics:** single-scan asCheckoutTier + bump node engines floor (PR [#928](https://github.com/HartiganHM/concert-crawl/issues/928) R3) ([e871bc8](https://github.com/HartiganHM/concert-crawl/commit/e871bc85cbc5e1c6adc585f5c5ed6879f1088763))


### Features

* **analytics:** wire PostHog monetization funnel instrumentation ([77c1995](https://github.com/HartiganHM/concert-crawl/commit/77c199553000021ce9b585e34d45b14b6b1682f5))

# [1.112.0](https://github.com/HartiganHM/concert-crawl/compare/v1.111.0...v1.112.0) (2026-07-13)


### Bug Fixes

* **admin:** [#519](https://github.com/HartiganHM/concert-crawl/issues/519) guard unsafe URL schemes in robots-audit (PR [#929](https://github.com/HartiganHM/concert-crawl/issues/929) R2) ([af91012](https://github.com/HartiganHM/concert-crawl/commit/af91012511a6bf371052b7a9821de99dff358fa4))
* **admin:** [#519](https://github.com/HartiganHM/concert-crawl/issues/519) harden robots-audit error + URL parsing (PR [#929](https://github.com/HartiganHM/concert-crawl/issues/929) R1) ([5fad534](https://github.com/HartiganHM/concert-crawl/commit/5fad5347a190873dfd28306b9c99aac5848f77bb))


### Features

* **admin:** [#519](https://github.com/HartiganHM/concert-crawl/issues/519) build robots.txt audit page ([2858803](https://github.com/HartiganHM/concert-crawl/commit/2858803c69a1e803c43f1bb97b6fcdada264c7a6))

# [1.111.0](https://github.com/HartiganHM/concert-crawl/compare/v1.110.0...v1.111.0) (2026-07-13)


### Bug Fixes

* **admin:** [#542](https://github.com/HartiganHM/concert-crawl/issues/542) hide inbox mark-all on read filter (PR [#927](https://github.com/HartiganHM/concert-crawl/issues/927) R1) ([60fa534](https://github.com/HartiganHM/concert-crawl/commit/60fa534f5ad355152fee773fec12347086d8d215))
* **admin:** [#542](https://github.com/HartiganHM/concert-crawl/issues/542) inbox a11y — dedupe unread dot + drop redundant mark-all label (PR [#927](https://github.com/HartiganHM/concert-crawl/issues/927) R2) ([6dcc726](https://github.com/HartiganHM/concert-crawl/commit/6dcc726ccba25e4b08c74aa67699e735f33d27e2))


### Features

* **admin:** [#542](https://github.com/HartiganHM/concert-crawl/issues/542) unified inbox — 4-category aggregation with read/unread persistence ([36e871f](https://github.com/HartiganHM/concert-crawl/commit/36e871f71a22872e2c9afc24a743953c62a48bad))

# [1.110.0](https://github.com/HartiganHM/concert-crawl/compare/v1.109.1...v1.110.0) (2026-07-13)


### Bug Fixes

* **api:** anchor email preview dir to package; non-zero exit on missing renderer ([9805ba3](https://github.com/HartiganHM/concert-crawl/commit/9805ba32ead69af92e10dd8ca328286907ea4b29))
* **api:** r7 — email preview exits non-zero when a Resend send fails or throws ([132e21d](https://github.com/HartiganHM/concert-crawl/commit/132e21d5941aa0311039edfa39058684ce9ab2ff))
* **api:** r8 — HTML-escape template keys and subjects in email preview index ([f56316c](https://github.com/HartiganHM/concert-crawl/commit/f56316cd273ff345cc40cdd652064c07bf5337e0))


### Features

* **api:** email preview/test-send dev harness + explicit review-doc steps ([6b635a2](https://github.com/HartiganHM/concert-crawl/commit/6b635a24b4a39c70a27c9880b2958ed44c807b34))

## [1.109.1](https://github.com/HartiganHM/concert-crawl/compare/v1.109.0...v1.109.1) (2026-07-13)


### Bug Fixes

* **consumer:** generalize imminent tooltip copy for all tiers ([753b5a1](https://github.com/HartiganHM/concert-crawl/commit/753b5a127660b86e31c94fe597aee77d7502ec59))
* **consumer:** stable pending card keys + focus ring on submit CTA ([68b8c96](https://github.com/HartiganHM/concert-crawl/commit/68b8c96738a7fc14c864e81d1b3f110d172baacf))
* **web:** a11y aria-label on imminent tag; correct stale PendingStack comment ([05e75df](https://github.com/HartiganHM/concert-crawl/commit/05e75df5c81233750f9b7ed0f30fc23f790aac4b))
* **web:** restore multi-tier pending visibility + clarify imminent shows ([2e95688](https://github.com/HartiganHM/concert-crawl/commit/2e9568811401d1786ed0d1d664ade4d9718bf39b)), closes [#895](https://github.com/HartiganHM/concert-crawl/issues/895)
* **web:** route pending-path submit CTA into the shared modal ([fd2689c](https://github.com/HartiganHM/concert-crawl/commit/fd2689c892619cd79ab0906b6c0119f03c6a8a23))

# [1.109.0](https://github.com/HartiganHM/concert-crawl/compare/v1.108.0...v1.109.0) (2026-07-12)


### Bug Fixes

* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R1 — sort focus outline, inactive aria, load error, hook test ([268a7f3](https://github.com/HartiganHM/concert-crawl/commit/268a7f31b3e50377a5ddc21346e4e4784ad8762b))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R10 — add archived to status filter rail ([1c9b576](https://github.com/HartiganHM/concert-crawl/commit/1c9b576d2298574f0534b841a72603ffc7ef06e6))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R11 — render six filter-pill skeletons to match rail ([9d67c13](https://github.com/HartiganHM/concert-crawl/commit/9d67c13517568dd12a8d8e849cd2e1017dbb51f0))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R12 — name archived status in page subtitle ([f73466d](https://github.com/HartiganHM/concert-crawl/commit/f73466df1de75c1cd59f4023f45620b72b353bba))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R13 — filter-aware count badge and empty state ([c424dac](https://github.com/HartiganHM/concert-crawl/commit/c424dacb36918a5edb059165ae5f4a72d0f1421d))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R14 — auth-aware banner + subset badge while loading ([4094148](https://github.com/HartiganHM/concert-crawl/commit/4094148dcfcc58eaec1fe00972d3e647a97afcdd))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R2 — surface auth error, Set membership, shared counts key ([31e0635](https://github.com/HartiganHM/concert-crawl/commit/31e06352a7f8a5cfad7a0c285e769b5ad0d7a029))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R3 — refetch full set on mount, reuse price-range helper ([a6c2f0a](https://github.com/HartiganHM/concert-crawl/commit/a6c2f0a4073bd4b72791c3dbfdfe580feb73e255))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R4 — advance offset by rows received, resync on bulk failure ([c1dcfcb](https://github.com/HartiganHM/concert-crawl/commit/c1dcfcbdc679a3fa7b8501c723e33ff8096dd5c9))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R5 — count first page only, seed stale, status union ([d622259](https://github.com/HartiganHM/concert-crawl/commit/d6222597cdbf92328c1c4871ef7d94403d26a538))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R6 — allSettled bulk PATCH, share FETCH_PAGE_SIZE with SSR seed ([ce708ac](https://github.com/HartiganHM/concert-crawl/commit/ce708accddbce06f5044dc22242a2a6707501d67))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R7 — move FETCH_PAGE_SIZE to server-safe module ([c246698](https://github.com/HartiganHM/concert-crawl/commit/c246698d9e6433ca3ec5ba7c9517520699586c54))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R8 — hide empty select-all, validate ticket URL protocol ([75afda6](https://github.com/HartiganHM/concert-crawl/commit/75afda618deb152bb48c6823330d3918d4b0d700))
* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) PR [#921](https://github.com/HartiganHM/concert-crawl/issues/921) R9 — type userId as nullable to match backend ([7145011](https://github.com/HartiganHM/concert-crawl/commit/71450110f9cad04d89ea5a8d4b4b1fdd4dd143d1))


### Features

* **admin:** [#540](https://github.com/HartiganHM/concert-crawl/issues/540) add price-submissions history page ([7f455f2](https://github.com/HartiganHM/concert-crawl/commit/7f455f25bc504e27589ca3b631761d6a824ad4c8))

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
