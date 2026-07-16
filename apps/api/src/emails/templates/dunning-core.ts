// Shared renderer for the dunning trio (#783 brand pass). Steps 1–2 are the
// calm signal-accent "give it a refresh" nudge; step 3 flips to amber, adds an
// "If it pauses" callout, and fills the third tracker segment — but the CTA
// stays branded signal, never alarm-red. The 30-second/"a week" framing matches
// the ~7-day dunning window (reconciled from the design's "two weeks").

import {
  button,
  callout,
  footerRow,
  headerRow,
  ledeRow,
  monoEyebrow,
  row,
  statusEyebrow,
} from '../atoms.js'
import {
  EMAIL_FONT,
  EMAIL_MONO,
  ME,
  renderEmailShell,
  renderTextShell,
} from '../layout.js'
import type { RenderedEmail } from '../types.js'

const FOOTER_NOTE =
  'Already fixed it? Ignore this — the next retry will pick it up automatically.'

const TRACKER_LABELS = ['Notice', 'Retrying', 'Last try']

// Three-segment progress bar. Segments 1..step are filled with `color`; the
// rest sit muted. Labels sit under each segment, the active one brightened.
const stepTracker = (step: number, color: string): string => {
  const cells = TRACKER_LABELS.map((label, index) => {
    const filled = index < step
    const barColor = filled ? color : ME.border
    const labelColor = index === step - 1 ? color : ME.subtle
    return `<td style="width: 33.33%; padding: 0 4px;">
<div style="height: 4px; border-radius: 4px; background: ${barColor};"></div>
<div style="font-family: ${EMAIL_MONO}; font-size: 8.5px; letter-spacing: 0.12em; text-transform: uppercase; color: ${labelColor}; margin-top: 7px; text-align: center;">${label}</div>
</td>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`
}

const reassureRow = (text: string): string =>
  row(
    '16px 26px 4px',
    `<div style="font-family: ${EMAIL_MONO}; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${ME.subtle}; text-align: center;">${text}</div>`,
  )

export interface DunningCopy {
  step: 1 | 2 | 3
  subject: string
  preheader: string
  headerEyebrow: string
  statusText: string
  title: string
  sub: string
  reassure: string
  isFinal: boolean
  calloutEyebrow?: string
  calloutBody?: string
}

const CONTENT_PAD = '18px 26px 0'

export const renderDunning = (
  copy: DunningCopy,
  portalUrl: string,
): RenderedEmail => {
  const accent = copy.isFinal ? ME.amber : ME.signal

  const calloutRow =
    copy.isFinal &&
    copy.calloutEyebrow !== undefined &&
    copy.calloutBody !== undefined
      ? row(
          CONTENT_PAD,
          callout({
            inner:
              monoEyebrow({
                text: copy.calloutEyebrow,
                color: ME.amber,
                marginBottom: 8,
              }) +
              `<div style="font-family: ${EMAIL_FONT}; font-size: 13px; color: ${ME.muted}; line-height: 1.5;">${copy.calloutBody}</div>`,
            accent: ME.amber,
            soft: ME.amberSoft,
          }),
        )
      : ''

  const bodyRows = [
    headerRow(copy.headerEyebrow),
    row('22px 26px 0', statusEyebrow({ text: copy.statusText, color: accent })),
    ledeRow({ title: copy.title, sub: copy.sub }),
    row(CONTENT_PAD, stepTracker(copy.step, accent)),
    calloutRow,
    row(
      '20px 26px 6px',
      button({
        label: 'Update payment method',
        tone: 'signal',
        href: portalUrl,
      }),
    ),
    reassureRow(copy.reassure),
    footerRow({ family: 'billing', showManage: true, note: FOOTER_NOTE }),
  ]
    .filter((rowStr) => rowStr !== '')
    .join('\n')

  const textLines = [
    copy.title,
    '',
    copy.sub,
    '',
    ...(copy.isFinal &&
    copy.calloutEyebrow !== undefined &&
    copy.calloutBody !== undefined
      ? [`${copy.calloutEyebrow}: ${copy.calloutBody}`, '']
      : []),
    copy.reassure,
    '',
    `Update payment method: ${portalUrl}`,
  ]

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    html: renderEmailShell({ preheader: copy.preheader, bodyRows }),
    text: renderTextShell({
      body: textLines.join('\n'),
      family: 'billing',
      showManage: true,
    }),
  }
}
