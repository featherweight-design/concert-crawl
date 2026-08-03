import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { fetchHistory } from '@/lib/history'
import { fetchMe } from '@/lib/users'
import { isScaRegion } from '@/lib/sca-region'
import {
  passportYear,
  resolvePassportTheme,
} from '@/lib/passport/passport-request'
import { toAttendedShows } from '@/lib/passport/select-shows'
import { PassportContent } from '@/components/consumer/passport/PassportContent'

export const metadata = { title: 'Passport — Concert Crawl' }

export default async function PassportPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // The profile is fetched alongside history rather than after it because the
  // card needs the handle and the theme to draw at all — serialising the two
  // would put a second round trip in front of the first paint for nothing.
  const [{ data, locked }, profile] = await Promise.all([
    fetchHistory(token),
    fetchMe(token),
  ])

  const requestHeaders = await headers()
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  // The first-paint theme only. `PassportContent` swaps to the theme the
  // browser is actually in once it mounts — the stored profile theme can be a
  // switch behind, and the card has to match the app around it.
  const { tokens } = resolvePassportTheme({ profileTheme: profile.theme })

  return (
    <PassportContent
      shows={toAttendedShows(data?.shows ?? [])}
      tokens={tokens}
      handle={profile.handle}
      year={passportYear()}
      locked={locked}
      scaRegion={scaRegion}
    />
  )
}
