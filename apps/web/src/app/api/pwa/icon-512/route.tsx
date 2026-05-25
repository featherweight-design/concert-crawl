import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    <svg
      width="512"
      height="512"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Opaque canvas fill */}
      <rect width="48" height="48" fill="#070A1A" />
      {/* Rounded background */}
      <rect width="48" height="48" rx="10" fill="#171D3A" />
      {/* Signal ring */}
      <circle cx="34" cy="14" r="9" fill="#FF7BD4" opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill="#FF7BD4" opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill="#7AE6FF" />
      {/* Dot trail */}
      <circle cx="14" cy="38" r="1.6" fill="#E8F3FF" opacity="0.45" />
      <circle cx="18" cy="34" r="1.6" fill="#E8F3FF" opacity="0.52" />
      <circle cx="22" cy="30" r="1.6" fill="#E8F3FF" opacity="0.59" />
      <circle cx="26" cy="26" r="1.6" fill="#E8F3FF" opacity="0.66" />
      <circle cx="30" cy="22" r="1.6" fill="#E8F3FF" opacity="0.73" />
      <circle cx="34" cy="18" r="1.6" fill="#E8F3FF" opacity="0.80" />
      <circle cx="14" cy="32" r="1.6" fill="#E8F3FF" opacity="0.87" />
    </svg>,
    { width: 512, height: 512 },
  )
}
