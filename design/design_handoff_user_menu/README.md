# User menu — Concert Crawl

Replacement for today's bare "Settings / Sign out" menu. Anchored top-right popover on desktop, bottom sheet on mobile.

## Files

- `User Menu Canvas.html` — design canvas (in-context + standalone + variations)
- `user-menu.jsx` — `<UserMenu variant="popover|sheet" user .../>` component
- `theme-context.jsx` / `ios-frame.jsx` / `design-canvas.jsx` — local copies of project primitives

## Anatomy

- **Identity card** — avatar (initial + accent halo) · plan eyebrow (`Beta · founder`) · email
- **You** — Submitted prices (with live count + `P` shortcut). Watching is in the top nav already, so it's intentionally NOT here.
- **App** — Theme (3 swatch row, current tinted with `--signal`) · Settings (`⌘,`) · Notifications
- **Operations** _(admin only)_ — Admin link with shield glyph, `⌘⇧A` shortcut. Section is hidden entirely when `user.role !== "admin"`.
- **Beta channel** — Send feedback (hot, accent dot, `BETA` meta — pulses). Removed post-beta.
- **Sign out** (warning-toned)
- **Status footer** — build version + commit, signal-pulse dot

## Variants

- `variant="popover"` — desktop, 280-wide card, shadow + tinted border
- `variant="sheet"` — mobile, full-width bottom sheet with drag handle

## Props

- `user={{ initial, email, plan, role }}` — `role: "admin"` reveals the Operations section
- `showFeedback` (default true) — toggles the beta-channel section. **Set false post-beta** when feedback graduates from the floating pill into Settings.
- `unread={{ submitted }}` — counts for the You section. Falsy hides the meta.
- `showThemeRow` (default true)

## What's intentionally NOT here

- **Watching** — already in the top nav. The menu shouldn't duplicate primary navigation.
- **Crawl history** — moved out; this is admin-only and lives in the admin sidebar (`design_handoff_admin_ui/`), not the user menu.

## Why this is the upgrade

Today's menu is just two rows. This menu:

1. **Has identity** — you can see who you're signed in as without opening Settings
2. **Is a status surface** — build version + signal pulse hint that the app is live and which version is running
3. **Carries the beta channel** — the feedback affordance has a permanent home, even when the floating pill goes away
4. **Owns navigation, not just chrome** — Watching / Submitted / Crawl history are reachable here, not buried
5. **Themes inline** — three swatches give a one-tap change, matching the rest of the app's token system

## Voice

Keys to the project voice:

- Eyebrows in monospace, uppercase, letter-spacing 0.14em
- "Beta · founder" / "Beta channel" — keeps the rail metaphor
- Sign out is danger-toned, last item, no border below

## Token contract

All color comes from theme tokens. Validated across `electric`, `jade`, `light`. No raw hex / oklch in the component.
