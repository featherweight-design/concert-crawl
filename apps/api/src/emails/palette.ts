// apps/api/src/emails/palette.ts
//
// Email-only palette (#783 §5) — CSS variables don't survive email clients,
// so these are plain hex constants inlined into template styles. The design
// brief locks the palette shape (brand primary, neutral gray, warning amber,
// success green) without exact hexes; values here are derived from the web
// Electric theme tokens, darkened where needed for WCAG AA on the light
// email background.

export const EMAIL_BRAND_PRIMARY = '#3fa3c2'
export const EMAIL_TEXT = '#1a2033'
export const EMAIL_TEXT_MUTED = '#5a6788'
export const EMAIL_WARNING_AMBER = '#b45309'
export const EMAIL_SUCCESS_GREEN = '#1a7f4e'
export const EMAIL_BACKGROUND = '#f4f6fb'
export const EMAIL_SURFACE = '#ffffff'
export const EMAIL_BORDER = '#e2e6f0'

// Per-tier accents for the welcome_paid family (#783). Brand primary is too
// light for text on white (2.9:1), so each accent is darkened to clear WCAG
// AA (≥4.5:1 on EMAIL_SURFACE): premium 5.63, supporter 5.02, founder 5.06.
export const EMAIL_ACCENT_PREMIUM = '#17708c'
export const EMAIL_ACCENT_SUPPORTER = '#b45309'
export const EMAIL_ACCENT_FOUNDER = '#8a6a11'
