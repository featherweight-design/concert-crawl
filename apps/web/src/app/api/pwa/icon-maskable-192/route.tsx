import { ImageResponse } from 'next/og'
import { PwaIconSvg } from '../icon-svg'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(<PwaIconSvg size={192} maskable />, {
    width: 192,
    height: 192,
  })
}
