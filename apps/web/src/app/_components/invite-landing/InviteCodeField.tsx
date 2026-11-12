'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Tag } from 'lucide-react';
import { formatInviteCodeInput } from '@/lib/invite-code';
import { LANDING_COPY } from '../definitions/copy';
import { FOCUS_RING, INVITE_GRADIENT } from './definitions/styles';

const COPY = LANDING_COPY.invite;

/**
 * The landing's inline code field. Redeem hands the code to `/auth/code`
 * pre-filled, as a poster QR does, rather than redeeming here: that
 * screen carries the Private Beta Agreement line a redemption agrees to, and
 * every error state. A visitor still presses its button to redeem.
 */
export function InviteCodeField() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    // A partial code goes too, so a visitor who pressed early keeps what
    // they typed; that screen formats it and holds its button until whole.
    router.push(
      code === ''
        ? '/auth/code'
        : `/auth/code?code=${encodeURIComponent(code)}`,
    );
  };

  return (
    <form
      onSubmit={submit}
      // Below 360 the padding tightens so Redeem keeps its width beside the
      // field (addendum 2, 15-320px/invite-320).
      className="p-1.5 pl-4 max-[360px]:pl-[14px]"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        border: '1.5px solid transparent',
        background: `linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, ${INVITE_GRADIENT} border-box`,
      }}
    >
      <Tag
        size={16}
        aria-hidden
        style={{ color: 'var(--fg-muted)', flexShrink: 0 }}
      />
      <input
        value={code}
        onChange={(ev) => setCode(formatInviteCodeInput(ev.target.value))}
        aria-label={COPY.fieldLabel}
        placeholder={COPY.placeholder}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        // The placeholder stays on one line below 360 at 12px and 0.04em, as
        // the 320 board draws it. Typed text keeps 16px (no iOS zoom).
        className="focus-visible:outline-none max-[360px]:placeholder:text-[12px] max-[360px]:placeholder:tracking-[0.04em]"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          border: 'none',
          background: 'transparent',
          color: 'var(--fg)',
          fontFamily: "'JetBrains Mono', monospace",
          // 16px stops iOS Safari zooming the page on focus.
          fontSize: 16,
          letterSpacing: '0.14em',
        }}
      />
      <button
        type="submit"
        className={`${FOCUS_RING} px-[18px] py-0 max-[360px]:px-4`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 44,
          border: 'none',
          borderRadius: 9,
          background: INVITE_GRADIENT,
          color: 'var(--fg-on-accent)',
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 15,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {COPY.redeem}
        <ArrowRight size={16} aria-hidden />
      </button>
    </form>
  );
}
