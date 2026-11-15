'use client';

// The ONE create-a-crew affordance. Both places that offer it — the list
// header and the empty state — mount this component rather than each wiring
// its own sign-in check, so the two can never disagree.
//
// Starting a crew is free for every signed-in fan. A signed-out viewer is sent
// to sign in; everyone else gets the create sheet.

import { useSignInRedirect } from '@/lib/auth/use-sign-in-redirect';
import { useState } from 'react';
import type { CrewSummary } from '@concert-crawl/types';

import { useEntitlement } from '@/lib/queries/use-entitlement';
import { CreateCrewSheet } from './CreateCrewSheet';
import { CREW_GRADIENT } from './lib/styles';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface CreateCrewButtonProps {
  /** `header` is the trailing-edge pill; `empty` is the empty state's CTA. */
  variant: 'header' | 'empty';
  onCreated: (crew: CrewSummary) => void;
}

export const CreateCrewButton = ({
  variant,
  onCreated,
}: CreateCrewButtonProps) => {
  const { isLoading, surface } = useEntitlement('crews');
  const [createOpen, setCreateOpen] = useState(false);
  const goToSignIn = useSignInRedirect();

  // The matrix's logged-out cell: the tap is a sign-in, not a sheet.
  const signedOut = surface === 'tier-picker-on-tap';

  const onTap = () => {
    if (isLoading) return;
    if (signedOut) {
      goToSignIn();
      return;
    }
    setCreateOpen(true);
  };

  const isHeader = variant === 'header';

  return (
    <>
      <button
        type="button"
        onClick={onTap}
        disabled={isLoading}
        aria-haspopup={signedOut ? undefined : 'dialog'}
        aria-expanded={signedOut ? undefined : createOpen}
        className="flex cursor-pointer items-center justify-center gap-1.5 disabled:cursor-default"
        style={{
          minHeight: 44,
          padding: isHeader ? '0 18px' : '0 20px',
          borderRadius: 999,
          background: CREW_GRADIENT,
          color: 'var(--fg-on-accent)',
          border: 'none',
          fontFamily: 'var(--font-ui)',
          fontSize: isHeader ? 14 : 13.5,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          opacity: isLoading ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {/* B+ draws "+ Start a crew"; the glyph is decoration, so the
            accessible name stays the label. */}
        <span aria-hidden="true">{COPY.glyphs.add}</span>
        {COPY.list.create}
      </button>

      <CreateCrewSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(crew) => {
          setCreateOpen(false);
          onCreated(crew);
        }}
      />
    </>
  );
};
