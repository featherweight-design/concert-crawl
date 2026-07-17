import { ImageResponse } from 'next/og'
import { PwaIconSvg } from '../icon-svg'

export const runtime = 'edge'

// Apple touch icons are composited on an opaque tile — use the non-maskable art.
export function GET() {
  return new ImageResponse(<PwaIconSvg size={180} />, {
    width: 180,
    height: 180,
  })
}
