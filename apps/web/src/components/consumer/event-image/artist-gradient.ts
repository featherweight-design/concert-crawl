const HUES = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260] as const

function artistHue(artist: string): number {
  if (!artist) return HUES[0]
  const hash = artist.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return HUES[hash % HUES.length]
}

export function getArtistGradientStyle(artist: string): {
  background: string
  color: string
} {
  const hue = artistHue(artist ?? '')
  return {
    background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
    color: `oklch(0.75 0.12 ${hue})`,
  }
}
