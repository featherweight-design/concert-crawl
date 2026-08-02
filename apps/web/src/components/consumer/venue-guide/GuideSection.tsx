import {
  GUIDE_CHIP_ORDER,
  deriveGuideDensity,
  type VenueGuide,
} from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'
import { AccessPlaceholderRow } from './AccessPlaceholderRow'
import { GUIDE_ANCHOR_ID } from './FirstTimerCallout'
import { GuideAnchorScroll } from './GuideAnchorScroll'
import { GuideChipRow } from './GuideChipRow'
import { InsiderTip } from './InsiderTip'
import { StillGathering } from './StillGathering'
import { unauthoredChipKeys, venueShortName } from './lib'

const copy = CONSUMER_COPY.venueGuide

interface GuideSectionProps {
  venueName: string
  guide: VenueGuide | null
  /**
   * The callout sits directly above and already reads as the guide's opener,
   * so the gap tightens when it is present and opens up when it is not.
   */
  followsCallout?: boolean
}

export const GuideSection = ({
  venueName,
  guide,
  followsCallout = false,
}: GuideSectionProps) => {
  if (guide === null) return null

  const shortName = venueShortName(venueName)
  const insiderTip = (guide.insiderTip ?? '').trim()

  // Accessibility always leads the chip list — authored or honestly placeheld.
  // Everything else follows in GUIDE_CHIP_ORDER; the API already sorts, but
  // ordering here keeps the component correct against any caller.
  const accessibility = guide.chips.find(
    (chip) => chip.chipType === 'accessibility',
  )
  const otherChips = GUIDE_CHIP_ORDER.filter(
    (key) => key !== 'accessibility',
  ).flatMap((key) => {
    const chip = guide.chips.find((candidate) => candidate.chipType === key)
    // A non-accessibility placeholder has no authored body to show, so it
    // belongs in "still gathering" rather than as an empty row.
    if (chip === undefined || chip.isPlaceholder) return []
    if (chip.body.trim().length === 0) return []
    return [chip]
  })

  const authoredForGathering = [
    ...(accessibility === undefined ? [] : [accessibility]),
    ...otherChips,
  ]

  return (
    <section
      id={GUIDE_ANCHOR_ID}
      data-testid="venue-guide"
      // scrollMarginTop keeps the heading clear of the viewport edge when the
      // in-page jump or the cross-page #ft-guide deep link lands here.
      style={{ marginTop: followsCallout ? 16 : 22, scrollMarginTop: 12 }}
    >
      <GuideAnchorScroll />
      <div className="mb-3 flex items-center gap-2">
        <h2
          className="shrink-0 whitespace-nowrap"
          style={{
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {copy.sectionTitle}
        </h2>
        {!followsCallout && (
          <span
            className="shrink-0"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--signal)',
            }}
          >
            {copy.sectionEyebrow}
          </span>
        )}
        <div className="h-px flex-1 bg-border" />
      </div>

      {insiderTip.length > 0 && <InsiderTip body={insiderTip} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-7">
        {accessibility !== undefined &&
          (accessibility.isPlaceholder ||
          accessibility.body.trim().length === 0 ? (
            <AccessPlaceholderRow first />
          ) : (
            <GuideChipRow
              chipType="accessibility"
              body={accessibility.body}
              first
            />
          ))}
        {otherChips.map((chip, index) => (
          <GuideChipRow
            key={chip.chipType}
            chipType={chip.chipType}
            body={chip.body}
            first={accessibility === undefined && index === 0}
          />
        ))}
      </div>

      <StillGathering
        chipTypes={unauthoredChipKeys(authoredForGathering)}
        venueShortName={shortName}
        showFooter={
          deriveGuideDensity({
            chips: authoredForGathering,
            insiderTip: guide.insiderTip,
          }) === 'thin'
        }
      />
    </section>
  )
}
