import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

export const SEPARATORS = {
  middot: '·',
  bullet: '•',
  slash: '/',
  comma: ',',
} as const

export type SeparatorKey = keyof typeof SEPARATORS

export const formatMoreCount = (count: number): string =>
  `+${count} ${CONSUMER_COPY.eventTitle.moreSuffix}`

export const supportingA11yLabel = (
  lead: string,
  artists: string[],
): string => {
  const conj = CONSUMER_COPY.eventTitle.rosterConjunction
  if (artists.length === 0) return ''
  if (artists.length === 1) return `${lead} ${artists[0]}`
  if (artists.length === 2) return `${lead} ${artists[0]} ${conj} ${artists[1]}`
  const head = artists.slice(0, -1).join(', ')
  const last = artists[artists.length - 1]
  return `${lead} ${head}, ${conj} ${last}`
}
