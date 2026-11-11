'use client';

import { CREW_MEMBER_CAP, type CrewMember } from '@concert-crawl/types';

import { RowMetaChip } from '@/components/consumer/event-row';
import { MemberDot } from './MemberCluster';
import { CrewNotice } from './CrewNotice';
import { joinedLabel } from './lib/format';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface CrewRosterProps {
  members: CrewMember[];
  memberCount: number;
  isKeeper: boolean;
  /** The footer's invite. Omitted, the roster draws no footer. */
  onInvite?: () => void;
  onRemove: (member: CrewMember) => void;
  onLeave: () => void;
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
};

// The open seats B+ draws under the roster. Two at most: enough to read as
// room, never a column of twelve empty rows.
const MAX_OPEN_SPOTS = 2;

const rowStyle = (first: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  minHeight: 56,
  padding: '8px 14px',
  borderTop: first ? 'none' : '1px solid var(--border)',
});

/**
 * Who's in. A member without a handle is drawn and counted but never named:
 * the app does not invent one, and the help line says so out loud rather than
 * leaving a blank row looking broken (the #762 contract).
 */
export const CrewRoster = ({
  members,
  memberCount,
  isKeeper,
  onInvite,
  onRemove,
  onLeave,
}: CrewRosterProps) => {
  const full = memberCount >= CREW_MEMBER_CAP;
  const left = Math.max(0, CREW_MEMBER_CAP - memberCount);
  const openSpots = Math.min(MAX_OPEN_SPOTS, left);

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
      {/* B+ draws the roster as one card: the members, a couple of open
          seats, and an invite footer that says how many seats are left. */}
      <div
        style={{
          borderRadius: 16,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <ul className="m-0 flex list-none flex-col p-0">
          {members.map((member, index) => {
            const named = member.handle !== null && member.handle !== '';
            return (
              <li key={member.userId} style={rowStyle(index === 0)}>
                <MemberDot member={member} size={32} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Another reader's handle: analytics autocapture skips it. */}
                  <span
                    className="ph-no-capture"
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
                          member.isKeeper ? COPY.roster.host : null,
                          COPY.roster.joined(joinedLabel(member.joinedAt)),
                        ]
                          .filter((part) => part !== null)
                          .join(' · ')
                      : COPY.roster.noHandleHelp}
                  </span>
                </span>
                {member.isKeeper && (
                  <RowMetaChip
                    label={COPY.roster.hostChip}
                    tone="warn"
                    hidden
                  />
                )}
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
            );
          })}
          {Array.from({ length: openSpots }, (_, i) => (
            <li
              key={`open-${i}`}
              aria-hidden="true"
              style={rowStyle(members.length === 0 && i === 0)}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 32,
                  flexShrink: 0,
                  border: '1.5px dashed var(--border-strong)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13.5,
                  color: 'var(--fg-subtle)',
                }}
              >
                {COPY.roster.openSpot}
              </span>
            </li>
          ))}
        </ul>
        {onInvite !== undefined && !full && (
          <button
            type="button"
            onClick={onInvite}
            className="flex w-full cursor-pointer items-center gap-1"
            style={{
              minHeight: 44,
              padding: '0 14px',
              background: 'none',
              border: 'none',
              borderTop: '1px solid var(--border)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--signal)',
              textAlign: 'left',
            }}
          >
            <span aria-hidden="true">{COPY.glyphs.add}</span>
            {COPY.roster.inviteMore(left)}
          </button>
        )}
      </div>
    </div>
  );
};
