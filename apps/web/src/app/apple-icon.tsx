import { ImageResponse } from 'next/og'
import { PwaIconSvg, PWA_ICON_CACHE_HEADERS } from './api/pwa/icon-svg'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<PwaIconSvg size={180} />, {
    ...size,
    headers: PWA_ICON_CACHE_HEADERS,
  })
}
