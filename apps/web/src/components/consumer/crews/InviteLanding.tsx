'use client';

import { useEffect, useRef, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import type { PublicCrewInvite } from '@concert-crawl/types';

import { CrewPatch } from '@/components/consumer/crew-patch';
import { ApiError } from '@/lib/api';
import {
  CREW_FULL_CODE,
  isCrewInviteDeadReason,
  joinCrew,
  type CrewInviteDeadReason,
} from '@/lib/crews';
import { DeadInviteLink } from './DeadInviteLink';
import {
  BrowseInstead,
  INVITE_MARK_SIZE,
  InviteBody,
  InviteCard,
  InviteEyebrow,
  InviteShell,
  primaryButtonStyle,
} from './InviteShell';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface InviteLandingProps {
  /** The invite token from the URL, re-sent on the join. */
  inviteToken: string;
  invite: PublicCrewInvite;
}

/**
 * The invite landing and the join itself. The crew's identity is already
 * resolved on the server, so this component owns exactly one interaction — and
 * the two ways it can go wrong are both states the landing was rendered too
 * early to know about: the crew filling up, and the link being retired,
 * between this render and the tap. Both re-render this surface in place rather
 * than toasting over a button that can no longer work.
 */
export const InviteLanding = ({ inviteToken, invite }: InviteLandingProps) => {
  const router = useRouter();
  const { getToken } = useAuth();
  // Membership outranks capacity: a member arriving on a forwarded link is not
  // shut out of their own crew by it being full.
  const member = invite.viewerIsMember;
  const [full, setFull] = useState(invite.isFull && !member);
  // Mounted empty and kept mounted: a live region that already holds its text
  // when it enters the DOM goes unannounced by VoiceOver and NVDA. Only the
  // in-place swap fills it, so a landing that arrives full says nothing extra.
  const [announcement, setAnnouncement] = useState('');
  const [dead, setDead] = useState<CrewInviteDeadReason | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // The join resolves on its own schedule, which can be after this component
  // is gone (the success path navigates away). Every state write is guarded on
  // the live value in this ref rather than on the closure the click captured.
  const liveRef = useRef(true);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  const onJoin = async () => {
    // Matches the button's own disabled state, so a double-tap that beats the
    // re-render still cannot fire a second join.
    if (busy || full || dead !== null) return;
    setBusy(true);
    setFailed(false);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      const result = await joinCrew(token, inviteToken);
      // `alreadyMember` is a success: a forwarded link tapped twice lands on
      // the crew instead of erroring.
      if (result.joined || result.alreadyMember) {
        router.push(`/crews/${result.crewId}`);
        // The crews list is cached from before this membership existed.
        router.refresh();
        return;
      }
      // The API has no fourth outcome, so this is unreachable by contract —
      // and if the contract ever moves, it fails loudly rather than silently
      // stranding the user on a landing that looks unchanged.
      throw new Error('Join returned neither joined nor alreadyMember');
    } catch (err) {
      console.error('InviteLanding: join failed', err);
      if (!liveRef.current) return;
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === CREW_FULL_CODE) {
          setFull(true);
          setAnnouncement(COPY.linkDead.filledUp);
          return;
        }
        if (err.status === 404 && isCrewInviteDeadReason(err.reason)) {
          setDead(err.reason);
          return;
        }
      }
      setFailed(true);
    } finally {
      // Every exit path, including the two that swap the surface. Leaving it
      // set would disable a control the next render still shows.
      if (liveRef.current) setBusy(false);
    }
  };

  // `unknown` gets no branded dead end here either — a surface only tokens
  // that once existed can reach would confirm which tokens exist. Raised
  // during render, not from the click handler: `notFound()` works by throwing
  // for the boundary to catch, which an event handler has nobody to do.
  if (dead === 'unknown') notFound();
  if (dead !== null) return <DeadInviteLink kind={dead} />;

  return (
    <InviteShell>
      <InviteCard
        mark={
          <CrewPatch
            crewId={invite.crewId}
            patchSalt={invite.patchSalt}
            size={INVITE_MARK_SIZE}
            scale="hero"
          />
        }
      >
        <div className="flex w-full flex-col items-center gap-2.5">
          <InviteEyebrow tone={member ? 'signal' : 'accent'}>
            {member ? COPY.landing.memberEyebrow : COPY.landing.eyebrow}
          </InviteEyebrow>
          {/* Names the inviter: analytics autocapture skips it. */}
          <h1
            // A handle is one unbroken word, and a 50-character one ran
            // 822px wide in a 304px column. min-w-0 lets the item shrink in
            // the flex column; anywhere lets the handle break.
            className="ph-no-capture min-w-0 max-w-full text-[27px] [overflow-wrap:anywhere] lg:text-[30px]"
            style={{
              margin: 0,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              textWrap: 'balance',
              color: 'var(--fg)',
            }}
          >
            {member
              ? COPY.landing.memberTitle(invite.name)
              : invite.invitedByHandle === null
                ? COPY.landing.titleNoName(invite.name)
                : COPY.landing.title(invite.invitedByHandle, invite.name)}
          </h1>
          {/* The prototype's avatar cluster is deliberately absent: the payload
              is identity-lite and carries no member list, and showing a
              non-member everyone's faces is a privacy call nobody has made. */}
          {/* The count came from the server render. A 409 proves the crew
              filled between that render and the tap, so the number is known
              wrong — and leaving it up puts "4 members" directly above "12 is
              the cap". A landing that arrived full still shows it, because
              there it is true. */}
          {(!full || invite.isFull) && (
            <InviteEyebrow tone="count">
              {COPY.list.memberCount(invite.memberCount)}
            </InviteEyebrow>
          )}
          {/* Both bodies argue for joining, which this viewer has done. The
              title and the count say everything left to say. */}
          {!member && (
            <InviteBody>
              {full
                ? COPY.linkDead.fullBody
                : COPY.landing.body(invite.memberCount)}
            </InviteBody>
          )}
        </div>

        {/* The prototype drops the privacy note at capacity: there is nothing
            left to explain once there is nothing to join. A member is past the
            decision it exists to inform, so it goes there too. */}
        {!full && !member && (
          <p
            className="w-full"
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'var(--surface-2)',
              border: '1px dashed var(--border-strong)',
              fontFamily: 'var(--font-ui)',
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
              textWrap: 'pretty',
            }}
          >
            {COPY.landing.privacy}
          </p>
        )}

        <div className="flex w-full flex-col items-center gap-3">
          {member ? (
            <button
              type="button"
              onClick={() => router.push(`/crews/${invite.crewId}`)}
              className="w-full cursor-pointer"
              style={primaryButtonStyle}
            >
              {COPY.landing.memberCta(invite.name)}
            </button>
          ) : full ? (
            <BrowseInstead wide />
          ) : (
            <button
              type="button"
              onClick={() => void onJoin()}
              disabled={busy}
              className="w-full cursor-pointer disabled:cursor-default"
              style={primaryButtonStyle}
            >
              {busy ? COPY.landing.joining : COPY.landing.cta(invite.name)}
            </button>
          )}
        </div>

        {failed && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--warning)',
            }}
          >
            {COPY.net.joinFailed}
          </p>
        )}
      </InviteCard>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </InviteShell>
  );
};
