// Shared state glyphs for the Spotify connect chapter (#763 PR 5).

// Muted "signal lost" glyph for the connect-failure state (from the handoff
// mock spotify-states.jsx — sound waves with a slash). Used by both the
// OAuth handoff sheet and the post-return connect flow.
export const NoAnswerGlyph = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
    <path
      d="M6 10s5-4 11-4 11 4 11 4M9 16s3.5-3 8-3 8 3 8 3M12 22s2-1.5 5-1.5 5 1.5 5 1.5"
      stroke="var(--fg-subtle)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M4 4l26 26"
      stroke="var(--fg-muted)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
)
