// spotify_digest — the Premium weekly digest (#763 spec §8.2, design mock
// design/design_handoff_spotify_sync/digest-email.jsx). Features up to 5
// matched shows then "+N more this week"; zero-match weeks send the LIGHT
// variant — a calm zero note plus up to 2 taste picks, so the email always
// earns its open (design lock). Digest family footer: the per-family link is
// the signed one-click unsubscribe URL, "all email settings" stays Settings.
//
// Deviation from the JSX mock (email-safe): the per-show gradient art tile is
// rendered as a SOLID hsl block — linear-gradient support is unreliable across
// clients, and the hue (derived from the artist name) still gives each row its
// color identity.

import { footerRow, headerRow, row } from '../atoms.js'
import {
  EMAIL_FONT,
  EMAIL_MONO,
  ME,
  appUrl,
  escapeHtml,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type {
  DigestEmailShow,
  EmailTemplateVars,
  TemplateRenderer,
} from '../types.js'
import { sanitizeInlineText } from './format.js'

const MAX_FEATURED_SHOWS = 5
const MAX_TASTE_PICKS = 2
const FOOTER_NOTE =
  'You get this because you follow artists on Spotify and turned on the weekly digest.'
const WEEK_SUB =
  'The ones you told Spotify you love: all playing Denver in the next 7 days.'
const ZERO_TITLE = 'A quiet one for your artists.'
const ZERO_SUB =
  "Nobody you follow is playing Denver this week. Here's a couple we think you'd click with anyway."

// Deterministic hue from the artist name — same trick as the mock's per-show
// `hue`, minus the randomness so re-renders are stable.
const artistHue = (artist: string): number => {
  let hash = 0
  for (let i = 0; i < artist.length; i += 1) {
    hash = (hash * 31 + artist.charCodeAt(i)) % 360
  }
  return hash
}

const showRow = (show: DigestEmailShow, last: boolean): string => {
  const artist = sanitizeInlineText(show.artist)
  const tour = show.tourName === null ? '' : sanitizeInlineText(show.tourName)
  const venue = sanitizeInlineText(show.venue)
  const hue = artistHue(artist)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;"><tr>
<td style="padding: 14px 0; ${last ? '' : `border-bottom: 1px solid ${ME.border}; `}vertical-align: top;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="56" style="vertical-align: top;"><div style="width: 56px; height: 56px; border-radius: 8px; background-color: hsl(${hue}, 45%, 33%);">&nbsp;</div></td>
<td style="vertical-align: top; padding: 0 10px;">
<div style="font-family: ${EMAIL_FONT}; font-weight: 700; font-size: 15px; color: ${ME.fg}; letter-spacing: -0.01em; line-height: 1.2;">${escapeHtml(artist)}</div>
${tour === '' ? '' : `<div style="font-family: ${EMAIL_FONT}; font-size: 12.5px; color: ${ME.muted}; margin-top: 2px;">${escapeHtml(tour)}</div>`}
<div style="font-family: ${EMAIL_MONO}; font-size: 11px; color: ${ME.muted}; margin-top: 5px; letter-spacing: 0.02em;">${escapeHtml(venue)} · ${escapeHtml(show.dateLabel)}</div>
</td>
<td width="70" style="vertical-align: top; text-align: right;">
${show.priceLabel === null ? '' : `<div style="font-family: ${EMAIL_MONO}; font-size: 12px; font-weight: 600; color: ${ME.signal};">${escapeHtml(show.priceLabel)}</div>`}
<a href="${escapeHtml(show.url)}" style="display: inline-block; margin-top: 7px; font-family: ${EMAIL_FONT}; font-size: 11px; font-weight: 700; color: ${ME.signal}; text-decoration: none; border: 1px solid ${ME.border}; border-radius: 7px; padding: 5px 10px;">View</a>
</td>
</tr></table>
</td>
</tr></table>`
}

const eyebrowLine = (text: string): string =>
  `<div style="font-family: ${EMAIL_MONO}; font-size: 10px; letter-spacing: 0.14em; color: ${ME.subtle}; text-transform: uppercase; margin-bottom: 10px;">${escapeHtml(text)}</div>`

const showTextLines = (show: DigestEmailShow): string[] => {
  const artist = sanitizeInlineText(show.artist)
  const tour = show.tourName === null ? '' : sanitizeInlineText(show.tourName)
  const venue = sanitizeInlineText(show.venue)
  const meta = [venue, show.dateLabel, show.priceLabel]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ')
  return [
    `- ${artist}${tour === '' ? '' : `: ${tour}`}`,
    `  ${meta}`,
    `  ${show.url}`,
    '',
  ]
}

export const renderSpotifyDigest: TemplateRenderer<
  EmailTemplateVars['spotify_digest']
> = ({ shows, tastePicks, unsubscribeUrl }) => {
  const zero = shows.length === 0
  const featured = shows.slice(0, MAX_FEATURED_SHOWS)
  const moreCount = shows.length - featured.length
  const picks = tastePicks.slice(0, MAX_TASTE_PICKS)
  const countLabel = `${shows.length} ${shows.length === 1 ? 'show' : 'shows'}`

  const subject = zero
    ? 'A quiet week for your artists: two picks anyway'
    : `${countLabel} this week by artists you follow`
  const preheader = zero ? ZERO_SUB : WEEK_SUB

  const ledeInner = zero
    ? `${eyebrowLine('This week in Denver')}
<div style="font-family: ${EMAIL_FONT}; font-weight: 900; font-size: 25px; color: ${ME.fg}; letter-spacing: -0.02em; line-height: 1.15;">${escapeHtml(ZERO_TITLE)}</div>
<div style="font-family: ${EMAIL_FONT}; font-size: 14px; color: ${ME.muted}; line-height: 1.5; margin-top: 8px;">${escapeHtml(ZERO_SUB)}</div>`
    : `${eyebrowLine('This week in Denver')}
<div style="font-family: ${EMAIL_FONT}; font-weight: 900; font-size: 25px; color: ${ME.fg}; letter-spacing: -0.02em; line-height: 1.15;"><span style="color: ${ME.signal};">${escapeHtml(countLabel)}</span> by artists you follow.</div>
<div style="font-family: ${EMAIL_FONT}; font-size: 14px; color: ${ME.muted}; line-height: 1.5; margin-top: 8px;">${escapeHtml(WEEK_SUB)}</div>`

  const listInner = zero
    ? `<div style="font-family: ${EMAIL_MONO}; font-size: 9.5px; letter-spacing: 0.14em; color: ${ME.subtle}; text-transform: uppercase; margin-bottom: 2px;">Based on your taste</div>
${picks.map((show, index) => showRow(show, index === picks.length - 1)).join('\n')}`
    : `${featured.map((show, index) => showRow(show, index === featured.length - 1)).join('\n')}
${
  moreCount > 0
    ? `<table role="presentation" width="100%"><tr><td style="padding: 13px 0 2px; text-align: center;"><a href="${escapeHtml(appUrl())}" style="font-family: ${EMAIL_FONT}; font-size: 13px; font-weight: 700; color: ${ME.signal}; text-decoration: none;">+${moreCount} more this week &rarr;</a></td></tr></table>`
    : ''
}`

  const ctaInner = `<a href="${escapeHtml(appUrl())}" style="display: block; background: ${ME.signal}; color: ${ME.onSignal}; font-family: ${EMAIL_FONT}; font-weight: 800; font-size: 14px; text-decoration: none; text-align: center; padding: 13px; border-radius: 12px;">Open Concert Crawl</a>`

  const bodyRows = [
    headerRow('Weekly · Spotify'),
    row('22px 26px 6px', ledeInner),
    row('6px 26px 4px', listInner),
    row('8px 26px 20px', ctaInner),
    footerRow({
      family: 'digest',
      showManage: false,
      note: FOOTER_NOTE,
      ...(unsubscribeUrl === null ? {} : { unsubscribeUrl }),
    }),
  ].join('\n')

  const textIntro = zero
    ? [ZERO_TITLE, '', ZERO_SUB, '', 'Based on your taste', '']
    : [
        'CONCERT CRAWL: This week in Denver',
        '',
        `${countLabel} by artists you follow on Spotify,`,
        'all playing Denver in the next 7 days.',
        '',
      ]
  const textShows = (zero ? picks : featured).flatMap(showTextLines)
  const textMore =
    !zero && moreCount > 0
      ? [`+${moreCount} more this week: ${appUrl()}`, '']
      : []
  const text = [
    ...textIntro,
    ...textShows,
    ...textMore,
    `Open Concert Crawl: ${appUrl()}`,
    '',
    FOOTER_NOTE,
  ].join('\n')

  return {
    subject,
    preheader,
    html: renderEmailShell({ preheader, bodyRows }),
    text: renderTextShell({
      body: text,
      family: 'digest',
      showManage: false,
      ...(unsubscribeUrl === null ? {} : { unsubscribeUrl }),
    }),
  }
}
