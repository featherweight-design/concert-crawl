'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Clock, ExternalLink, RefreshCw, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  COULDNT_LOAD_X_STROKE,
  StateMessage,
} from '@/components/admin/primitives/StateMessage';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import type { GoneReason } from './inspect-rules';

const COPY = ADMIN_COPY.inspect;

/** The block's buttons: the gradient call to action, and the outlined one. */
export const stateButton = (
  primary: boolean,
  phone: boolean,
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: phone ? 44 : 36,
  width: phone ? '100%' : undefined,
  boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 9,
  fontSize: phone ? 14 : 13,
  fontFamily: 'inherit',
  fontWeight: primary ? 700 : 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  cursor: 'pointer',
  ...(primary
    ? {
        background: 'linear-gradient(135deg, var(--signal), var(--accent))',
        color: 'var(--bg)',
        border: '1px solid transparent',
      }
    : {
        background: 'var(--surface-2)',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }),
});

/** Stacked full width on the phone (the boards), in a row on desktop. */
const Actions = ({
  phone,
  children,
}: {
  phone: boolean;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: phone ? 'column' : 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      width: phone ? '100%' : undefined,
    }}
  >
    {children}
  </div>
);

const LiveLink = ({ href, phone }: { href: string; phone: boolean }) => (
  <SafeExternalLink href={href} style={stateButton(false, phone)}>
    <ExternalLink size={14} aria-hidden />
    {COPY.openLive}
  </SafeExternalLink>
);

/** Why there is nothing to show: a 404 reason, or a run with no pages. */
export type GoneKind = GoneReason | 'no_pages';

const GONE_LINE: Record<GoneKind, string> = {
  expired: COPY.gone.expired,
  too_large: COPY.gone.tooLarge,
  not_stored: COPY.gone.notStored,
  no_pages: ADMIN_COPY.runDetail.noPages,
};

/**
 * `G2/inspect-pages-gone`, one line per reason. `not_stored` is the common
 * case while prod keeps no bodies (`CRAWL_PAGE_BODIES` off): a deliberate
 * state, not an error, and no other run kept one either, so it offers the
 * live page only. Otherwise Inspect the latest run shows when there is
 * another run to go to.
 */
export const PagesGone = ({
  kind,
  liveUrl,
  latestRunHref,
  phone,
}: {
  kind: GoneKind;
  liveUrl: string;
  latestRunHref: string | null;
  phone: boolean;
}) => (
  <StateMessage
    testId="inspect-pages-gone"
    role="status"
    icon={Clock}
    tone="var(--signal)"
    title={
      kind === 'expired' || kind === 'no_pages'
        ? COPY.gone.title
        : COPY.gone.notKeptTitle
    }
    body={<span data-reason={kind}>{GONE_LINE[kind]}</span>}
    actions={
      <Actions phone={phone}>
        {latestRunHref !== null && kind !== 'not_stored' && (
          <Link href={latestRunHref} style={stateButton(true, phone)}>
            {COPY.gone.latestRun}
          </Link>
        )}
        <LiveLink href={liveUrl} phone={phone} />
      </Actions>
    }
  />
);

/** `G2/inspect-couldnt-load`: a 500 or the network. Nothing was changed. */
export const InspectCouldntLoad = ({
  liveUrl,
  onRetry,
  phone,
}: {
  liveUrl: string;
  onRetry: () => void;
  phone: boolean;
}) => (
  <StateMessage
    testId="inspect-couldnt-load"
    role="alert"
    icon={X}
    tone="var(--danger)"
    tinted
    iconStrokeWidth={COULDNT_LOAD_X_STROKE}
    title={COPY.couldntLoad.title}
    body={COPY.couldntLoad.body}
    actions={
      <Actions phone={phone}>
        <button
          type="button"
          onClick={onRetry}
          style={stateButton(true, phone)}
        >
          <RefreshCw size={14} aria-hidden />
          {COPY.couldntLoad.tryAgain}
        </button>
        <LiveLink href={liveUrl} phone={phone} />
      </Actions>
    }
  />
);
