'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Printer } from 'lucide-react';
import type {
  AdminInviteCode,
  InviteCodeRedemptionsResponse,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';
import {
  isPosterCode,
  seatsTaken,
  type InviteStatus,
} from '@/lib/poster/poster-rule';
import { postersHref } from '@/lib/poster/posters-href';
import type { CodesApi } from './codes-api';
import {
  codeLabel,
  isEnded,
  makerName,
  roleLabel,
  shortDate,
} from './code-rules';
import { peopleWithCodeHref } from '../people/people-rules';
import { CodeSurface, CodeTitle } from './CodeSurface';
import { SeatsBar } from './SeatsBar';

const COPY = ADMIN_COPY.codesPage;

const KV_ROW = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  padding: '6px 0',
} as const;

/** The panel's buttons as drawn: 12.5px semibold, 9px corners. */
const BUTTON = { borderRadius: 9, fontSize: 12.5, fontWeight: 600 } as const;
const SECONDARY = { ...BUTTON, background: 'var(--surface-2)' } as const;

/** `07/a-code-in-flow`: the code, its seats, and who joined with it. */
export const CodePanel = ({
  code,
  status,
  api,
  onCopy,
  onAddSeats,
  onRevoke,
  onReactivate,
  onClose,
}: {
  code: AdminInviteCode;
  status: InviteStatus;
  api: CodesApi;
  onCopy: () => void;
  /** Opens Edit with Seats in focus; omitted, Add seats isn't offered. */
  onAddSeats?: () => void;
  onRevoke: () => void;
  onReactivate: () => void;
  onClose: () => void;
}) => {
  const [joined, setJoined] = useState<InviteCodeRedemptionsResponse | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    api
      .redemptions(code.id)
      .then((res) => {
        if (live) setJoined(res);
      })
      // Undrawn: the list simply stays empty when it can't load.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api, code.id]);

  const ended = isEnded(status);
  const used = seatsTaken(code);
  const label = codeLabel(code);

  return (
    <CodeSurface
      fullScreen
      footerLayout="ruled"
      title={<CodeTitle code={code.code} />}
      label={code.code}
      subtitle={COPY.panel.byline(label, makerName(code))}
      onClose={onClose}
      footer={
        ended ? (
          <AdminButton
            type="button"
            variant="outline"
            onClick={onReactivate}
            style={SECONDARY}
          >
            {COPY.menu.reactivate}
          </AdminButton>
        ) : (
          <>
            {onAddSeats && (
              <AdminButton
                type="button"
                variant="outline"
                onClick={onAddSeats}
                style={SECONDARY}
              >
                {COPY.panel.addSeats}
              </AdminButton>
            )}
            <AdminButton
              type="button"
              variant="dangerOutline"
              onClick={onRevoke}
              style={BUTTON}
            >
              {COPY.menu.revoke}
            </AdminButton>
          </>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AdminButton
            type="button"
            icon={Copy}
            onClick={onCopy}
            style={{
              ...BUTTON,
              color: 'var(--signal)',
              background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--signal) 30%, transparent)',
            }}
          >
            {COPY.menu.copyLink}
          </AdminButton>
          {/* The Posters tab can only pick a live code with a seat left. */}
          {status === 'active' && isPosterCode(code) && (
            <Link
              href={postersHref({ code: code.id })}
              prefetch={false}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 12px',
                ...BUTTON,
                textDecoration: 'none',
                color: 'var(--fg)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
              }}
            >
              <Printer size={14} aria-hidden />
              {COPY.menu.makePoster}
            </Link>
          )}
        </div>
        <SeatsBar used={used} max={code.maxUses} full={status === 'full'} />
        <div>
          <div style={KV_ROW}>
            <span style={{ color: 'var(--fg-muted)' }}>
              {COPY.panel.expires}
            </span>
            <span>
              {code.expiresAt ? shortDate(code.expiresAt) : COPY.never}
            </span>
          </div>
          <div style={KV_ROW}>
            <span style={{ color: 'var(--fg-muted)' }}>
              {COPY.panel.lastUsed}
            </span>
            <span>
              {code.lastUsedAt ? shortDate(code.lastUsedAt) : COPY.never}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 6px' }}>
          {COPY.panel.whoJoined(joined?.total ?? used)}
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {joined?.data.map((person) => {
            const handle = person.handle ? `@${person.handle}` : null;
            return (
              <li
                key={person.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 0',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 12,
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--signal) 30%, transparent), color-mix(in srgb, var(--accent) 30%, transparent))',
                    border:
                      '1.5px solid color-mix(in srgb, var(--signal) 70%, transparent)',
                  }}
                >
                  {(person.handle ?? '?').charAt(0).toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {handle ?? COPY.panel.noHandle}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginTop: 2,
                    }}
                  >
                    {COPY.panel.joined(
                      shortDate(person.redeemedAt),
                      roleLabel(person.role),
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {/* A3 5b row 8: opens People filtered to this code. */}
        {joined && joined.total > joined.data.length && (
          <Link
            href={peopleWithCodeHref(code.code)}
            prefetch={false}
            style={{
              display: 'inline-block',
              fontSize: 12.5,
              color: 'var(--signal)',
              textDecoration: 'none',
            }}
          >
            {COPY.panel.seeAll(joined.total)}
          </Link>
        )}
      </div>
    </CodeSurface>
  );
};
