import { ImageResponse } from 'next/og'
import { PwaIconSvg } from '../icon-svg'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(<PwaIconSvg size={512} maskable />, {
    width: 512,
    height: 512,
  })
}
