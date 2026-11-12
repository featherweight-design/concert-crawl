import { ImageResponse } from 'next/og';
import { PwaIconSvg, PWA_ICON_CACHE_HEADERS } from '../../icon-svg';
import {
  STARTUP_SIZES,
  findStartupSize,
  startupSizeKey,
} from '@/lib/pwa/startup-images';

// The iPhone launch image (B+ README rule 12): the plain icon, 128 CSS pixels,
// centred on #070A1A, so the system splash, the Android splash and frame 0 of
// the launch animation all read as the same still.
const SPLASH_BACKGROUND = '#070A1A';
const ICON_CSS_PX = 128;

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
      <PwaIconSvg size={ICON_CSS_PX * size.ratio} />
    </div>,
    { width: size.width, height: size.height, headers: PWA_ICON_CACHE_HEADERS },
  );
}
