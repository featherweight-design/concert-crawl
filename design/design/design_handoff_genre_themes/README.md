# Genre Themes — Engineering Handoff

Status: **approved** · six themes, ready to merge.
Date: 2026-05-10
Source of truth: `theme-context-additions.jsx`

## What's shipping

Six new themes that stack on top of `electric` / `jade` / `light`. Same 24-token vocabulary, plus one optional new token (`accent-2`, Drip-only).

| Key        | Label     | Mode | Genre slot       |
| ---------- | --------- | ---- | ---------------- |
| `pulse`    | Pulse     | dark | Electronic · EDM |
| `forge`    | Forge     | dark | Metal            |
| `bluenote` | Blue Note | dark | Jazz             |
| `drip`     | Drip      | dark | Hip-Hop          |
| `cedar`    | Cedar     | dark | Indie / Folk     |
| `gloss`    | Gloss     | dark | Pop              |

All six are dark-mode. Existing `light` remains the only light theme.

## Integration steps

1. **Merge** the six entries in `theme-context-additions.jsx` into `CC_THEMES` in `theme-context.jsx`.
2. **Update** `CC_THEME_KEYS`:
   ```js
   const CC_THEME_KEYS = [
     'electric',
     'jade',
     'light',
     'pulse',
     'forge',
     'bluenote',
     'drip',
     'cedar',
     'gloss',
   ]
   ```
3. **Add the new `accent-2` fallback** in two places in `browse-home.jsx`:
   - `AppBar` wordmark — the trailing `.` span:
     ```jsx
     <span style={{ color: 'var(--accent-2, var(--accent))' }}>.</span>
     ```
   - `CCMark` — the inner halo circle (`r=12`):
     ```jsx
     <circle
       cx="72"
       cy="24"
       r="12"
       fill="var(--accent-2, var(--accent))"
       opacity="0.42"
     />
     ```
     Both fall back to `--accent` for every theme that doesn't define `accent-2`, so existing themes are unaffected.

## The `accent-2` token

Drip is the only theme that introduces a third brand color (hot magenta `#FF2EC8`) on top of the two-color signal/accent system. It lives in a new optional token `accent-2`. Rules:

- Always reference it as `var(--accent-2, var(--accent))` so other themes degrade gracefully.
- Don't author components that _require_ `accent-2` — it's decorative reinforcement, never load-bearing.
- If we ship more 3-color themes later, this token is the surface to use.

## What was considered, and dropped

- **Boombox** (Hip-Hop, golden era charcoal + rope gold) — too close to Forge / Blue Note color territory.
- **Concrete** (Hip-Hop, brutalist light grey + one red) — interesting but felt detached from hip-hop visual culture.
- **Chrome** (Hip-Hop, pure black + acid green + chrome) — solid foundation, but lacked the third color needed to feel cohesive with the rest of the system. Drip is Chrome with heat added.
- **Pulp** (Indie / Folk, riso paper + terracotta + sage) — Hugh picked the dark mirror (Cedar) instead.
- **"🔥 5 left" urgency tag** — briefly added to surface magenta; pulled because it implied a feature we don't have. Magenta now only appears on existing surfaces (wordmark period, brand mark halo, photo tint, hover overlays).

## Open questions for next session

- Should themes be **user-pick** (Settings → Appearance) or **auto-apply** based on the genre of the currently focused event?
- With 9 total themes, the appearance picker needs a layout pass — grouped by mode? By genre? Or one long list?

## Files

- `Genre Themes.html` — the showcase / approved version
- `Genre Themes v1.html` — round-1 archive (Boombox + Chrome era)
- `genre-themes.jsx` — showcase component
- `theme-context-additions.jsx` — **the file engineering needs**
- `README.md` — this file
