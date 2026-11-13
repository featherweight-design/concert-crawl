'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  CREW_INVITE_TTL_DAYS,
  CREW_MEMBER_CAP,
  type CrewInvite,
} from '@concert-crawl/types';

import { ModalShell } from '@/components/consumer/modal-shell';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { fetchCurrentInvite, mintInvite, revokeInvite } from '@/lib/crews';
import { CrewNotice } from './CrewNotice';
import { daysUntil } from './lib/format';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  crewId: string;
  crewName: string;
  patchSalt: number;
  memberCount: number;
}

const inviteUrl = (token: string): string => {
  // The origin the customer is actually on, so a staging link never says
  // production. `window` is always defined here: the sheet is client-only.
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/crew/join/${token}`;
};

// What the link box shows: the host and path in grey, the token in cyan. The
// copied and shared link keeps its scheme.
const shortLink = (): string => inviteUrl('').replace(/^https?:\/\//, '');

const GRADIENT = 'linear-gradient(90deg, var(--signal), var(--accent))';

const ghost: React.CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 999,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 700,
};

export const InviteSheet = ({
  open,
  onClose,
  crewId,
  crewName,
  patchSalt,
  memberCount,
}: InviteSheetProps) => {
  const { getToken } = useAuth();
  const [invite, setInvite] = useState<CrewInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // The clipboard write resolves on its own schedule, which can be after the
  // sheet is gone. A ref rather than the `open` prop because the handler's
  // closure still holds the value it was clicked with.
  const openRef = useRef(open);
  openRef.current = open;

  // The link is fetched (and minted if there isn't one) on open, so by the
  // time the copy button can be tapped the token is already in hand. Awaiting
  // anything inside that click handler spends the user-activation grant and
  // `writeText` silently fails in Safari — the #72 lesson.
  useEffect(() => {
    if (!open) {
      setInvite(null);
      setCopied(false);
      setRevoked(false);
      setFailed(false);
      // Including `busy`: dismissing the sheet mid-revoke otherwise leaves the
      // next open with every button disabled and nothing in flight to re-enable
      // them.
      setBusy(false);
      return;
    }
    let live = true;
    const load = async () => {
      try {
        const token = await getToken();
        if (token === null) throw new Error('Not signed in');
        const existing = await fetchCurrentInvite(token, crewId);
        const link = existing ?? (await mintInvite(token, crewId));
        if (live) setInvite(link);
      } catch (err) {
        console.error('InviteSheet: could not load the invite link', err);
        if (live) setFailed(true);
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [open, crewId, getToken]);

  const onCopy = () => {
    // Copying mid-revoke would hand out a link already on its way out.
    if (invite === null || busy) return;
    // Every action entry point clears the last failure first, so the notice
    // describes this attempt rather than the previous one.
    setFailed(false);
    // `navigator.clipboard` is undefined on insecure origins and older Safari,
    // and `writeText` throws rather than rejecting there, so the rejection
    // handler alone would not catch it.
    const { clipboard } = navigator;
    if (clipboard === undefined) {
      setFailed(true);
      return;
    }
    try {
      // Synchronous, deliberately. No await above this line.
      clipboard.writeText(inviteUrl(invite.token)).then(
        () => {
          if (!openRef.current) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2400);
        },
        (err: unknown) => {
          console.error('InviteSheet: clipboard write failed', err);
          if (openRef.current) setFailed(true);
        },
      );
    } catch (err) {
      console.error('InviteSheet: clipboard unavailable', err);
      setFailed(true);
    }
  };

  // The phone's own share sheet. Called straight from the tap, like the copy,
  // so the user-activation grant is still live; a dismissed sheet rejects with
  // AbortError, which is not a failure.
  const onShare = () => {
    if (invite === null || busy) return;
    setFailed(false);
    navigator
      .share({ title: crewName, url: inviteUrl(invite.token) })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('InviteSheet: share failed', err);
        if (openRef.current) setFailed(true);
      });
  };

  const onRevoke = async () => {
    if (invite === null || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      await revokeInvite(token, crewId, invite.id);
      setRevoked(true);
      setCopied(false);
    } catch (err) {
      console.error('InviteSheet: could not retire the link', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const onNewLink = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      const link = await mintInvite(token, crewId);
      setInvite(link);
      setRevoked(false);
      setCopied(false);
    } catch (err) {
      console.error('InviteSheet: could not mint a new link', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // The phone's share sheet where there is one; desktop browsers without it
  // keep Copy link alone rather than a button that does nothing.
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const left = CREW_MEMBER_CAP - memberCount;
  const atCap = left <= 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.invite.title}
      sheetHeight="fit"
      surface="crew"
      desktopWidth={540}
      header={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              minHeight: 44,
              padding: '0 4px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.a11y.close}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <CrewPatch
            crewId={crewId}
            patchSalt={patchSalt}
            size={56}
            scale="tile"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: 'var(--fg)',
              }}
            >
              {crewName}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: left <= 2 ? 'var(--warning)' : 'var(--signal)',
              }}
            >
              {atCap ? COPY.invite.seatsFull : COPY.invite.seatsLeft(left)}
            </span>
          </div>
        </div>

        {/* At cap the sheet still opens and still says why: a control that
            silently does nothing is worse than one that explains itself. */}
        {atCap ? (
          <CrewNotice
            tone="warning"
            eyebrow={COPY.empty.atCapEyebrow}
            title={COPY.empty.atCapTitle}
            body={COPY.empty.atCapBody}
          />
        ) : (
          <>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 13.5,
                lineHeight: 1.5,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.invite.sub(crewName)}
            </p>

            {/* The link and its two actions sit in one dashed box: the host in
                grey, the token in cyan, Copy link filled, Share… outlined. */}
            <div
              className="flex flex-col gap-3"
              style={{
                padding: 14,
                borderRadius: 16,
                border: `1.5px dashed color-mix(in srgb, var(--signal) ${copied ? 90 : 55}%, transparent)`,
                background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
              }}
            >
              <span
                data-testid="invite-link"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--fg-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: revoked ? 'line-through' : 'none',
                  opacity: revoked ? 0.5 : 1,
                }}
              >
                {shortLink()}
                <span style={{ color: 'var(--signal)' }}>
                  {invite === null ? '' : invite.token}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  disabled={invite === null || revoked || busy}
                  className="cursor-pointer disabled:cursor-default"
                  style={{
                    ...ghost,
                    flex: 1,
                    minHeight: 48,
                    fontSize: 15,
                    background: copied ? 'transparent' : GRADIENT,
                    border: copied ? ghost.border : 'none',
                    color: copied ? 'var(--signal)' : 'var(--fg-on-accent)',
                    boxShadow: copied
                      ? 'none'
                      : '0 6px 22px -8px color-mix(in srgb, var(--signal) 70%, transparent)',
                  }}
                >
                  {copied ? COPY.invite.copied : COPY.invite.copy}
                </button>
                {canShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    disabled={invite === null || revoked || busy}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 disabled:cursor-default"
                    style={{ ...ghost, flex: 1, minHeight: 48, fontSize: 15 }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="4"
                        cy="8"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <circle
                        cx="12"
                        cy="3.5"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <circle
                        cx="12"
                        cy="12.5"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M5.8 7l4.4-2.5M5.8 9l4.4 2.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    </svg>
                    {COPY.invite.share}
                  </button>
                )}
              </div>
            </div>

            {invite !== null && !revoked && (
              <div className="flex flex-col gap-1.5">
                {/* The bar is the link's remaining life: full when new, empty
                    at expiry. */}
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <div
                      data-testid="invite-expiry-bar"
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (daysUntil(invite.expiresAt) / CREW_INVITE_TTL_DAYS) * 100)}%`,
                        background: GRADIENT,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    {COPY.invite.expiry(daysUntil(invite.expiresAt))}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {COPY.invite.expiryHelp}
                </span>
              </div>
            )}

            {revoked && (
              <p
                role="status"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  color: 'var(--fg-muted)',
                }}
              >
                {COPY.invite.revoked}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!revoked && invite !== null && (
                <button
                  type="button"
                  onClick={() => void onRevoke()}
                  disabled={busy}
                  className="cursor-pointer disabled:cursor-default"
                  style={ghost}
                >
                  {COPY.invite.revoke}
                </button>
              )}
              <button
                type="button"
                onClick={() => void onNewLink()}
                disabled={busy}
                className="cursor-pointer disabled:cursor-default"
                style={
                  revoked
                    ? {
                        ...ghost,
                        background: 'var(--signal)',
                        border: 'none',
                        color: 'var(--fg-on-accent)',
                      }
                    : ghost
                }
              >
                {COPY.invite.newLink}
              </button>
            </div>

            {/* The button's own label change is not announced, so the copy
                result gets a live region of its own. */}
            <div role="status" aria-live="polite" className="sr-only">
              {copied ? COPY.invite.copied : ''}
            </div>
          </>
        )}

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
            {COPY.invite.failed}
          </p>
        )}
      </div>
    </ModalShell>
  );
};
