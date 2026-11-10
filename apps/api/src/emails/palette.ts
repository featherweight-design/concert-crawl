// apps/api/src/emails/palette.ts
//
// Email-only palette (#783 brand pass) — CSS variables don't survive email
// clients, so these are plain inline hex constants. This is the single
// electric-derived DARK palette (`ME`) locked in the design handoff
// (design/design_handoff_monetization_emails/email-primitives.jsx); it is NOT
// per-user themed — the send pipeline stays simple by shipping one identity.

export const ME = {
  page: '#04050C',
  card: '#0B0E20',
  surf: '#11162E',
  surf2: '#171D3A',
  border: '#242C4E',
  borderSoft: '#1A2140',
  fg: '#E8F3FF',
  muted: '#9AA8C7',
  subtle: '#5A6788',
  signal: '#7AE6FF',
  accent: '#FF7BD4',
  onSignal: '#070A1A',
  onAccent: '#1A0713',
  amber: '#FFC24B',
  amberSoft: 'rgba(255,194,75,0.10)',
  signalSoft: 'rgba(122,230,255,0.09)',
  accentSoft: 'rgba(255,123,212,0.09)',
} as const;

export const EMAIL_FONT =
  "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
export const EMAIL_MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
