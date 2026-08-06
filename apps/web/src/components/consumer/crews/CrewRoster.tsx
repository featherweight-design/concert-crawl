'use client'

import { CREW_MEMBER_CAP, type CrewMember } from '@concert-crawl/types'

import { MemberDot } from './MemberCluster'
import { CrewNotice } from './CrewNotice'
import { joinedLabel } from './lib/format'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface CrewRosterProps {
  members: CrewMember[]
  memberCount: number
  isKeeper: boolean
  onRemove: (member: CrewMember) => void
  onLeave: () => void
  onInvite: () => void
}

const rowAction: React.CSSProperties = {
  minHeight: 44,
  padding: '0 10px',
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  fontWeight: 700,
  color: 'var(--fg-muted)',
}

/**
 * Who's in. A member without a handle is drawn and counted but never named:
 * the app does not invent one, and the help line says so out loud rather than
 * leaving a blank row looking broken (the #762 contract).
 */
export const CrewRoster = ({
  members,
  memberCount,
  isKeeper,
  onRemove,
  onLeave,
  onInvite,
}: CrewRosterProps) => {
  const full = memberCount >= CREW_MEMBER_CAP

  return (
    <div className="flex flex-col gap-3">
      {/* A full crew is not an empty one, so this is a notice above the real
          roster rather than an EmptyState in place of it. */}
      {full && (
        <CrewNotice
          tone="warning"
          eyebrow={COPY.empty.atCapEyebrow}
          title={COPY.empty.atCapTitle}
          body={COPY.empty.atCapBody}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: full ? 'var(--warning)' : 'var(--fg-subtle)',
          }}
        >
          {COPY.detail.spots(memberCount)}
        </span>
        {/* Stays reachable at cap: the sheet is where the at-cap notice
            lives, so hiding the way in would hide the explanation with it. */}
        <button
          type="button"
          onClick={onInvite}
          className="cursor-pointer"
          style={rowAction}
        >
          {COPY.detail.invite}
        </button>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {members.map((member, index) => {
          const named = member.handle !== null && member.handle !== ''
          return (
            <li
              key={member.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                minHeight: 48,
                padding: '6px 0',
                borderTop: index === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <MemberDot member={member} size={32} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    fontWeight: named ? 700 : 600,
                    color: named ? 'var(--fg)' : 'var(--fg-subtle)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {named && member.handle !== null
                    ? member.handle
                    : COPY.roster.noHandle}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {named
                    ? [
                        member.isYou ? COPY.roster.you : null,
                        member.isKeeper ? COPY.roster.keeper : null,
                        COPY.roster.joined(joinedLabel(member.joinedAt)),
                      ]
                        .filter((part) => part !== null)
                        .join(' · ')
                    : COPY.roster.noHandleHelp}
                </span>
              </span>
              {member.isYou ? (
                <button
                  type="button"
                  onClick={onLeave}
                  className="cursor-pointer"
                  style={rowAction}
                >
                  {COPY.roster.leave}
                </button>
              ) : isKeeper ? (
                <button
                  type="button"
                  onClick={() => onRemove(member)}
                  className="cursor-pointer"
                  style={rowAction}
                >
                  {COPY.roster.remove}
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
