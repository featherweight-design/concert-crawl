# Design Property Table — Landing Poster v2

## Component: LandingPoster

### Root Container
| Property | Value / Formula |
|----------|----------------|
| width | `w` (equals `width` prop, default 320) |
| height | `h` = `height` prop OR `Math.round(width * 1.38)` |
| position | `relative` |
| overflow | `hidden` |
| background | `paper` (= `pal.bg` from `identityFor(artist, "artist")`) |
| border | `1px solid rgba(255,255,255,0.10)` (dark palette) / `1px solid rgba(0,0,0,0.10)` (light palette) |
| box-shadow | `0 Math.round(w*0.10)px Math.round(w*0.18)px -Math.round(w*0.08)px rgba(0,0,0,0.45), 0 Math.round(w*0.04)px Math.round(w*0.08)px -Math.round(w*0.04)px rgba(0,0,0,0.30)` |
| color | `ink` (= `pal.ink` from palette) |
| isolation | `isolate` |

### Layout Variables (derived from `width`)
| Variable | Formula |
|----------|---------|
| `padX` | `Math.round(w * 0.075)` |
| `padY` | `Math.round(w * 0.075)` |
| `innerW` | `w - padX * 2` |
| `artBottom` | `Math.round(h * 0.44)` — scrim gradient begins here |
| `ghostOffset` | `Math.max(2, Math.round(w * 0.012))` |

### Full-Bleed Identity Art Layer
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| inset | `0` |
| Component | `<IdentityArt name={artist} kind="artist" scale="hero" showInitials={false} grain={grain} width={w} height={h} />` |

### Top Chrome Row (eyebrow + state pill)
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| left | `padX` |
| right | `padX` |
| top | `padY` |
| display | `flex` |
| justify-content | `space-between` |
| align-items | `flex-start` |
| gap | `padX` |
| z-index | `2` |

### Eyebrow Chip (city label, left side of top chrome)
| Property | Value / Formula |
|----------|----------------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `Math.round(w * 0.018)` |
| padding-top | `Math.round(w * 0.014)px` |
| padding-bottom | `Math.round(w * 0.014)px` |
| padding-left | `Math.round(w * 0.028)px` |
| padding-right | `Math.round(w * 0.028)px` |
| background | `lpPaperRgb(paper, 0.85)` |
| color | `ink` |
| border-radius | `999` |
| font-family | `'JetBrains Mono', monospace` |
| font-weight | `700` |
| font-size | `eyebrowSize` = `Math.max(8, Math.round(w * 0.032))` |
| letter-spacing | `0.10em` |
| text-transform | `uppercase` |
| line-height | `1` |
| white-space | `nowrap` |
| backdrop-filter | `blur(4px)` |
| Content | First segment of `show.city` before `,` — fallback `"Denver"` |

### Bottom Paper Scrim
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| inset | `0` |
| background | `linear-gradient(180deg, ...)` — see gradient stops below |
| pointer-events | `none` |
| z-index | `1` |

#### Scrim Gradient Stops
| Stop | Opacity / Position Formula |
|------|--------------------------|
| 0% | `lpPaperRgb(paper, 0)` at `0%` |
| flat transparent | `lpPaperRgb(paper, 0)` at `Math.round((artBottom - padY * 1.5) / h * 100)%` |
| fade begins | `lpPaperRgb(paper, 0.85)` at `Math.round(artBottom / h * 100)%` |
| fully opaque | `lpPaperRgb(paper, 1)` at `Math.min(96, Math.round((artBottom + padY) / h * 100))%` |
| bottom | `lpPaperRgb(paper, 1)` at `100%` |

### Bottom Block Container
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| left | `padX` |
| right | `padX` |
| bottom | `padY` |
| display | `flex` |
| flex-direction | `column` |
| gap | `Math.round(w * 0.025)` |
| z-index | `2` |

### Date Row
| Property | Value / Formula |
|----------|----------------|
| display | `flex` |
| align-items | `baseline` |
| gap | `Math.round(w * 0.025)` |
| font-family | `'JetBrains Mono', monospace` |
| font-weight | `700` |
| font-size | `dateRowSize` = `Math.max(9, Math.round(w * 0.038))` |
| letter-spacing | `0.10em` |
| text-transform | `uppercase` |
| color | `ink` |
| opacity | `0.88` |
| line-height | `1` |
| Content | `{show.dateShort}` · `{show.showTime}` — separator dot at `opacity: 0.55` |

### Artist Title Block (wrapper)
| Property | Value / Formula |
|----------|----------------|
| position | `relative` |

#### Title Sizing Variables
| Variable | Formula |
|----------|---------|
| `lines` | Output of `lpSmartBreak(show.artist, 3)` |
| `titleMax` | `Math.round(w * 0.22)` |
| `titleMin` | `Math.max(16, Math.round(w * 0.085))` |
| `titleSize` | `lpAutoFit(lines, innerW, titleMax, titleMin)` — `Math.max(titleMin, Math.min(titleMax, Math.floor((innerW * 0.96 / longestLineLength) / 0.60)))` |
| `titleLh` | `0.86` |

#### Artist Title — Ghost Layer (mis-registered ink offset)
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| left | `ghostOffset` = `Math.max(2, Math.round(w * 0.012))` |
| top | `ghostOffset` = `Math.max(2, Math.round(w * 0.012))` |
| pointer-events | `none` |
| font-family | `Inter, system-ui` |
| font-weight | `900` |
| font-size | `titleSize` |
| line-height | `0.86` |
| letter-spacing | `-0.045em` |
| text-transform | `uppercase` |
| color | `rgba(255,255,255,0.12)` (dark palette) / `rgba(0,0,0,0.10)` (light palette) |
| word-break | `keep-all` |
| display (each line span) | `block` |

#### Artist Title — Ink Layer (foreground)
| Property | Value / Formula |
|----------|----------------|
| position | `relative` |
| font-family | `Inter, system-ui` |
| font-weight | `900` |
| font-size | `titleSize` |
| line-height | `0.86` |
| letter-spacing | `-0.045em` |
| text-transform | `uppercase` |
| color | `ink` |
| word-break | `keep-all` |
| display (each line span) | `block` |

### Venue Line
| Property | Value / Formula |
|----------|----------------|
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `venueSize` = `Math.max(10, Math.round(w * 0.052))` |
| letter-spacing | `-0.015em` |
| color | `ink` |
| line-height | `1.15` |
| opacity | `0.92` |
| text-wrap | `balance` |
| Content | `{show.venue}` + city suffix at `opacity: 0.55` |

### Opener Line (conditional)
| Property | Value / Formula |
|----------|----------------|
| Condition | `show.opener` must be truthy |
| font-family | `'JetBrains Mono', monospace` |
| font-weight | `600` |
| font-size | `Math.max(9, Math.round(w * 0.032))` |
| letter-spacing | `0.06em` |
| color | `ink` |
| opacity | `0.6` |
| text-transform | `lowercase` |
| line-height | `1` |
| margin-top | `Math.round(w * 0.005)` |
| Content | `+ {show.opener}` |

### Keyframe Animation: `lpPulse`
| Keyframe | opacity | transform |
|----------|---------|-----------|
| `0%` | `0.45` | `scale(0.85)` |
| `50%` | `1` | `scale(1.15)` |
| `100%` | `0.45` | `scale(0.85)` |

---

## Component: LPStatePill

### State Pill — Shared Properties
| Property | Value / Formula |
|----------|----------------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `Math.round(w * 0.018)` |
| padding-top/bottom | `py` = `Math.round(w * 0.018)px` |
| padding-left/right | `px` = `Math.round(w * 0.035)px` |
| border-radius | `999` |
| font-family | `'JetBrains Mono', monospace` |
| font-weight | `800` |
| font-size | `Math.max(8, Math.round(w * 0.033))` |
| letter-spacing | `0.14em` |
| line-height | `1` |
| text-transform | `uppercase` |
| white-space | `nowrap` |
| Renders | `null` if no matching state entry |

### State Pill — HOT tone (TONIGHT)
| Property | Value |
|----------|-------|
| background | `ink` |
| color | `paper` |
| border | `none` |

### State Pill — NON-HOT tones (GOING / SOLD OUT / PRICE DROP)
| Property | Value |
|----------|-------|
| background | `transparent` |
| color | `ink` |
| border | `Math.max(1, Math.round(w * 0.005))px solid ink` |

### State Pill — Dot
| Property | HOT | Non-HOT |
|----------|-----|---------|
| width | `Math.max(4, Math.round(w * 0.018))` | same |
| height | `Math.max(4, Math.round(w * 0.018))` | same |
| border-radius | `999` | `999` |
| background | `paper` | `ink` |
| animation | `lpPulse 1.4s ease-in-out infinite` | `none` |

### State Pill — Variant Labels
| State key | label | tone |
|-----------|-------|------|
| `tonight` | `TONIGHT` | `hot` |
| `going` | `GOING` | `live` |
| `soldout` | `SOLD OUT` | `warn` |
| `drop` | `PRICE DROP` | `good` |

---

## Component: LPStack

### Stage Container
| Property | Value / Formula |
|----------|----------------|
| width | `width + padX * 2` |
| height | `height + padY * 2` |
| position | `relative` |
| perspective | `1400` |
| role | `button` |
| aria-label | `"Next poster"` |

### Stage Padding Variables
| Variable | Formula |
|----------|---------|
| `off` | `width * 0.04` |
| `padX` | `Math.max(28, Math.round(width * 0.14))` |
| `padY` | `Math.max(36, Math.round(width * 0.18))` |

### Resting Layer Positions
| Layer | x | y | rotate (deg) | scale | opacity |
|-------|---|---|--------------|-------|---------|
| 0 (top) | `0` | `0` | `-1.5` | `1` | `1` |
| 1 (mid) | `off` | `off * 0.7` | `3.5` | `0.985` | `1` |
| 2 (bottom) | `-off * 0.8` | `off * 1.4` | `-5` | `0.97` | `1` |
| 3 (on-deck) | `off * 0.4` | `off * 2.4` | `1.0` | `0.94` | `0` |

### Advancing Phase Transforms
| Layer | transform | opacity |
|-------|-----------|---------|
| 0 (exiting) | `translate(x - w*0.06, y - h*0.14) rotate(r - 10deg) scale(s * 1.03)` | `0` |
| 1 → top | `translate(layers[0].x, layers[0].y) rotate(layers[0].r) scale(layers[0].scale)` | `1` |
| 2 → mid | `translate(layers[1].x, layers[1].y) rotate(layers[1].r) scale(layers[1].scale)` | `1` |
| 3 → bottom | `translate(layers[2].x, layers[2].y) rotate(layers[2].r) scale(layers[2].scale)` | `1` |

### Card Wrapper
| Property | Value |
|----------|-------|
| position | `absolute` |
| left | `padX` |
| top | `padY` |
| z-index | `10 - i` |
| transform-origin | `30% 100%` |
| cursor | `pointer` |
| will-change | `transform, opacity` |
| transition (advancing) | `transform 0.85s cubic-bezier(0.32, 0.72, 0.28, 1), opacity 0.7s ease-out` |
| transition (rest) | `transform 0.4s ease-out, opacity 0.4s ease-out` |
| pointer-events (on-deck at rest) | `none` |

### Card Brightness Filters
| Layer | filter |
|-------|--------|
| on-deck (i=3) | `brightness(0.90)` |
| bottom (i=2) | `brightness(0.92)` |
| mid (i=1) | `brightness(0.96)` |
| top (i=0) | `none` |

### Hint Dots Container
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| left | `50%` |
| bottom | `Math.round(padY * 0.25)` |
| transform | `translateX(-50%)` |
| display | `flex` |
| gap | `6` |
| z-index | `20` |
| Condition | Only renders when `shows.length > 1` |

### Hint Dot
| Property | Active | Inactive |
|----------|--------|---------|
| width | `16` | `6` |
| height | `6` | `6` |
| border-radius | `3` | `3` |
| background | `var(--fg, #fff)` | `rgba(255,255,255,0.30)` |
| cursor | `pointer` | `pointer` |
| transition | `width 0.3s` | `width 0.3s` |

### Animation Timing
| Property | Value |
|----------|-------|
| `intervalMs` default | `5200` ms |
| Advance setTimeout | `900` ms |

---

## Component: LPTicker

### Stage Container
| Property | Value / Formula |
|----------|----------------|
| width | `100%` |
| height | `height + Math.round(width * 0.10) * 2` |
| overflow | `hidden` |
| position | `relative` |
| mask-image | `linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)` |
| -webkit-mask-image | same |

### Card Strip
| Property | Value / Formula |
|----------|----------------|
| position | `absolute` |
| left | `0` |
| top | `Math.round(width * 0.10)` |
| display | `flex` |
| gap | `Math.round(width * 0.06)` |
| animation | `lpTickerSlide {durationMs}ms linear` (re-keyed on tick) |
| Cards rendered | `Math.max(shows.length, 4) + 1` |

### Individual Card Wrapper
| Property | Value |
|----------|-------|
| flex-shrink | `0` |
| transform | `rotate(-1.6deg)` even / `rotate(1.6deg)` odd |

### Keyframe: `lpTickerSlide`
| From | To |
|------|----|
| `translateX(0)` | `translateX(-(cardW + gap)px)` |

---

## Component: LPWall

### Container
| Property | Value / Formula |
|----------|----------------|
| width | `width` prop |
| height | `columnHeight` OR `(height + gap) * shows.length` |
| overflow | `hidden` |
| position | `relative` |
| mask-image | `linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)` |
| -webkit-mask-image | same |

### Scrolling Column
| Property | Value |
|----------|-------|
| position | `absolute` |
| left | `0` |
| top | `0` |
| display | `flex` |
| flex-direction | `column` |
| gap | `Math.round(width * 0.08)` |
| animation | `lpWallSlide {durationMs}ms linear infinite` |
| will-change | `transform` |
| Deck | `[...shows, ...shows]` doubled |

### Individual Card Wrapper
| Property | Value |
|----------|-------|
| transform | `rotate(-1.2deg)` even / `rotate(1.2deg)` odd |

### Keyframe: `lpWallSlide`
| From | To |
|------|----|
| `translateY(0)` | `translateY(-(tileH + gap) * shows.length px)` |

---

## Component: LandingPosterAnimation (switcher)

### Props
| Prop | Default |
|------|---------|
| `mode` | `"stack"` |
| `shows` | `[]` |
| `width` | `320` |
| `height` | `Math.round(width * 1.38)` |
| `intervalMs` | `5200` |

### Mode Routing
| mode | Component | Duration |
|------|-----------|---------|
| `"ticker"` | `LPTicker` | `intervalMs * 1.15` |
| `"wall"` | `LPWall` | `intervalMs * 4` |
| default (`"stack"`) | `LPStack` | `intervalMs` |

### Shuffle
| Behavior | Detail |
|----------|--------|
| Algorithm | Fisher-Yates, once per mount via `useMemo` |
| Returns `null` | when `ordered.length === 0` |

---

## LandingShow Data Shape

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | — |
| `artist` | string | — |
| `venue` | string | — |
| `city` | string | Format: `"City, ST"` |
| `dateShort` | string | Format: `"MMM DD"` uppercase e.g. `"MAY 23"` |
| `showTime` | string | Format: `"H:MMpm"` e.g. `"9pm"` |
| `opener` | string \| null | `null` hides opener line |
| `state` | `'tonight' \| 'soldout' \| null` | `null` renders no pill |
