import { ImageResponse } from 'next/og';
import type { HistoryResponse } from '@concert-crawl/types';
import { PassportCard } from '@/components/consumer/passport/PassportCard';
import {
  PASSPORT_PRINT_MODE,
  PASSPORT_PRINT_SCALE,
} from '@/components/consumer/passport/definitions/modes';
import { loadShareFonts } from '@/lib/share/fonts';
import {
  PASSPORT_DIMENSIONS,
  passportYear,
  resolvePassportTheme,
  type PassportRatio,
} from '@/lib/passport/passport-request';
import { passportCacheKey, renderOnce } from '@/lib/passport/render-cache';
import { toAttendedShows } from '@/lib/passport/select-shows';

/**
 * Everything the passport PNG is drawn from, and the one function that draws
 * it. The route and the page's pre-warm both go through here, so a warmed card
 * and a requested card cannot disagree on their cache key.
 */
export interface PassportCardInput {
  ratio: PassportRatio;
  userId: string;
  handle: string | null;
  /** The stored profile theme, overridden by `themeOverride` when it names one. */
  profileTheme: string | undefined;
  themeOverride: string | undefined;
  past: HistoryResponse['past'];
}

export interface PassportCardPlan {
  key: string;
  render: (origin: string) => Promise<ArrayBuffer>;
}

/**
 * Fonts come from our own origin: `next/font/google` output is unreachable
 * from a route handler and satori bundles no system fonts. A non-200 throws
 * rather than falling back: a card in a font nobody chose is worse than a 502.
 */
const originFontLoader = (origin: string) => async (assetPath: string) => {
  const response = await fetch(new URL(assetPath, origin));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.arrayBuffer();
};

export const planPassportCard = (
  input: PassportCardInput,
): PassportCardPlan => {
  const { tokens } = resolvePassportTheme({
    theme: input.themeOverride,
    profileTheme: input.profileTheme,
  });
  const shows = toAttendedShows(input.past);
  const year = passportYear();
  const key = passportCacheKey({
    userId: input.userId,
    ratio: input.ratio,
    handle: input.handle,
    year,
    tokens,
    shows,
  });
  return {
    key,
    // The cache owns the render: fonts and satori run only on a miss, and once
    // for requests that arrive for the same card together. A failure is never
    // stored.
    render: (origin) =>
      renderOnce(key, async () => {
        const fonts = await loadShareFonts(originFontLoader(origin));
        return new ImageResponse(
          <PassportCard
            mode={PASSPORT_PRINT_MODE}
            scale={PASSPORT_PRINT_SCALE}
            shows={shows}
            tokens={tokens}
            handle={input.handle}
            year={year}
          />,
          { ...PASSPORT_DIMENSIONS[input.ratio], fonts },
        ).arrayBuffer();
      }),
  };
};
