import { ImageResponse } from 'next/og';
import {
  PwaIconSvg,
  PWA_ICON_CACHE_HEADERS,
  PWA_SPLASH_BACKGROUND,
  STARTUP_TILE_CSS_PX,
  STARTUP_TILE_RADIUS_CSS_PX,
} from '../../icon-svg';
import {
  STARTUP_SIZES,
  findStartupSize,
  startupSizeKey,
} from '@/lib/pwa/startup-images';

// The iPhone launch image (B+ README rule 12): the plain icon, 128 CSS pixels,
// centred on #070A1A, so the system splash, the Android splash and frame 0 of
// the launch animation all read as the same still.
const SPLASH_BACKGROUND = PWA_SPLASH_BACKGROUND;
const ICON_CSS_PX = STARTUP_TILE_CSS_PX;
// The tile is rounded (28 at 128px) with a soft dark drop shadow, as frame 0
// of the launch board draws it (bp-s-launch_ios0_m.jpg). Shadow values are
// read off the board, not specified by it.
const TILE_RADIUS_CSS_PX = STARTUP_TILE_RADIUS_CSS_PX;
const TILE_SHADOW = (ratio: number) =>
  `0 ${8 * ratio}px ${24 * ratio}px rgba(0, 0, 0, 0.5)`;

export const dynamicParams = false;

export function generateStaticParams() {
  return STARTUP_SIZES.map((size) => ({ size: startupSizeKey(size) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: key } = await params;
  const size = findStartupSize(key);
  if (size === undefined) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: SPLASH_BACKGROUND,
      }}
    >
      {/* The shadow sits on a wrapper: Satori draws box-shadow, not SVG filters. */}
      <div
        style={{
          display: 'flex',
          width: ICON_CSS_PX * size.ratio,
          height: ICON_CSS_PX * size.ratio,
          borderRadius: TILE_RADIUS_CSS_PX * size.ratio,
          boxShadow: TILE_SHADOW(size.ratio),
        }}
      >
        <PwaIconSvg size={ICON_CSS_PX * size.ratio} rounded />
      </div>
    </div>,
    { width: size.width, height: size.height, headers: PWA_ICON_CACHE_HEADERS },
  );
}
