// The four line glyphs My shows ▸ Artists needs (nf-shared.jsx).
// All decorative: every one sits beside a real label, so none is announced.

interface GlyphProps {
  size: number
}

export const GlyphSearch = ({ size }: GlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <circle cx="8.6" cy="8.6" r="5.6" />
    <path d="M12.8 12.8L17 17" />
  </svg>
)

export const GlyphChevron = ({ size }: GlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M7.5 4l6 6-6 6" />
  </svg>
)

export const GlyphBell = ({ size }: GlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M5 8a5 5 0 0110 0c0 4 1.4 5.4 1.4 5.4H3.6S5 12 5 8z" />
    <path d="M8.2 16a2 2 0 003.6 0" />
  </svg>
)

export const GlyphPlus = ({
  size,
  width = 1.8,
}: GlyphProps & { width?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M10 3.5v13M3.5 10h13" />
  </svg>
)
