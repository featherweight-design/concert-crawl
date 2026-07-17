import { ImageResponse } from 'next/og'
import { PwaIconSvg, PWA_ICON_CACHE_HEADERS } from '../icon-svg'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(<PwaIconSvg size={512} />, {
    width: 512,
    height: 512,
    headers: PWA_ICON_CACHE_HEADERS,
  })
}
