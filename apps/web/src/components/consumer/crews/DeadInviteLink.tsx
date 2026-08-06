import {
  BrowseInstead,
  DimmedMark,
  InviteBody,
  InviteEyebrow,
  InviteShell,
  InviteTitle,
} from './InviteShell'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

export type DeadInviteKind = 'expired' | 'revoked'

/**
 * A dead link, with no crew identity anywhere on it — no name, no patch, no
 * member count (locked decision 11). The API answers the same way: its 404
 * body is the reason and nothing else, so there is nothing here to leak.
 *
 * `unknown` has no surface of its own on purpose. A branded dead end for a
 * token that never existed would confirm which tokens do, so it becomes the
 * app's ordinary 404 instead.
 */
export const DeadInviteLink = ({ kind }: { kind: DeadInviteKind }) => (
  <InviteShell tightGap>
    <DimmedMark />
    <div className="flex max-w-[340px] flex-col items-center gap-[9px]">
      <InviteEyebrow tone="warning">{COPY.linkDead.eyebrow}</InviteEyebrow>
      <InviteTitle>
        {kind === 'revoked'
          ? COPY.linkDead.revokedTitle
          : COPY.linkDead.expiredTitle}
      </InviteTitle>
      <InviteBody>
        {kind === 'revoked'
          ? COPY.linkDead.revokedBody
          : COPY.linkDead.expiredBody}
      </InviteBody>
    </div>
    <BrowseInstead />
  </InviteShell>
)
