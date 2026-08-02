/**
 * Font data for the server-side share renderer.
 *
 * satori ships no system fonts: a face that fails to load does not degrade to
 * Helvetica, it renders as nothing, and the failure shows up as a blank strip
 * on a PNG nobody looks at until it is already on someone's story. So the
 * loader here is deliberately strict — one missing or empty face fails the
 * whole render, loudly, at the route boundary.
 *
 * `next/font/google` output is not reachable from a route handler, which is why
 * the TTFs are bundled under `public/fonts/share/` (see the LICENSE there).
 */

export interface ShareFontSpec {
  /** Family name as referenced by `fontFamily` in the card's inline styles. */
  name: string
  /** Path relative to the site root, i.e. what a browser would request. */
  assetPath: string
  weight: 400 | 700 | 900
}

/**
 * Inter carries every non-mono string on the poster: 900 for the artist title,
 * 700 for the wordmark and state pill, 400 for the tagline and handle.
 * JetBrains Mono 700 is the date/time stamp only.
 */
export const SHARE_FONTS: readonly ShareFontSpec[] = [
  { name: 'Inter', assetPath: '/fonts/share/inter-400.ttf', weight: 400 },
  { name: 'Inter', assetPath: '/fonts/share/inter-700.ttf', weight: 700 },
  { name: 'Inter', assetPath: '/fonts/share/inter-900.ttf', weight: 900 },
  {
    name: 'JetBrains Mono',
    assetPath: '/fonts/share/jbmono-700.ttf',
    weight: 700,
  },
]

/**
 * How the bytes are fetched. Injected so the edge route can fetch against its
 * own origin while tests read the same files off disk — the alternative is a
 * module that can only be exercised by booting a server.
 */
export type ShareFontLoader = (assetPath: string) => Promise<ArrayBuffer>

/** The shape `ImageResponse` wants in its `fonts` option. */
export interface LoadedShareFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 900
  style: 'normal'
}

/**
 * Load every declared face, or throw.
 *
 * The `assetPath` is re-thrown in the message because the useful question when
 * a share card comes back wrong is always "which face", and satori's own error
 * for a missing glyph names neither the file nor the weight.
 */
export const loadShareFonts = async (
  loader: ShareFontLoader,
): Promise<LoadedShareFont[]> =>
  Promise.all(
    SHARE_FONTS.map(async (font) => {
      let data: ArrayBuffer
      try {
        data = await loader(font.assetPath)
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        throw new Error(
          `Share font failed to load: ${font.assetPath} (${reason})`,
        )
      }
      if (data.byteLength === 0) {
        throw new Error(`Share font loaded empty: ${font.assetPath}`)
      }
      return { name: font.name, data, weight: font.weight, style: 'normal' }
    }),
  )
