'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Bug, Check, Eye, Music, Tag } from 'lucide-react';
import type { PersonDetail, PersonRecent } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, useIsPhone } from '@/components/admin/primitives';
import { shortDate } from '../invite-codes/code-rules';
import { Hint } from '../invite-codes/CodeFormParts';
import type { SettableRole } from './person-api';
import { ROLE_SEGMENT, recentLine } from './person-rules';

const COPY = ADMIN_COPY.personPage;

/** A block as `07/person` draws it: r14, border, surface-1. */
export const Block = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const isPhone = useIsPhone();
  return (
    <section
      aria-label={title}
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: isPhone ? '12px 14px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 0,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
};

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  padding: '8px 0',
  borderTop: '1px solid var(--border)',
};
const MUTED: CSSProperties = { color: 'var(--fg-muted)' };
const CAPTION: CSSProperties = {
  fontSize: 12,
  color: 'var(--fg-muted)',
  marginTop: 2,
};

/** The four stat cards; two by two on the phone. */
export const Stats = ({ stats }: { stats: PersonDetail['stats'] }) => {
  const isPhone = useIsPhone();
  const cards = [
    [stats.watching, COPY.stats.watching],
    [stats.concerts, COPY.stats.concerts],
    [stats.submittedPrices, COPY.stats.submittedPrices],
    [stats.feedback, COPY.stats.feedback],
  ] as const;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isPhone ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isPhone ? 8 : 12,
      }}
    >
      {cards.map(([value, label]) => (
        <div
          key={label}
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </div>
          <div style={{ fontSize: 12.5, ...MUTED, marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

/** Member | Beta | Promoter | Admin, the chosen one raised. */
export const RoleSegment = ({
  role,
  disabled,
  onPick,
}: {
  role: string;
  disabled: boolean;
  onPick: (role: SettableRole) => void;
}) => (
  <div
    role="group"
    aria-label={COPY.role}
    style={{
      display: 'inline-flex',
      flex: 'none',
      padding: 3,
      borderRadius: 10,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      maxWidth: '100%',
      overflowX: 'auto',
    }}
  >
    {ROLE_SEGMENT.map((each) => {
      const on = each === role;
      return (
        <button
          key={each}
          type="button"
          aria-pressed={on}
          disabled={disabled}
          onClick={() => onPick(each)}
          style={{
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: 7,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: disabled ? 'default' : 'pointer',
            color: on ? 'var(--fg)' : 'var(--fg-muted)',
            background: on ? 'var(--bg-elevated)' : 'transparent',
            boxShadow: on ? '0 1px 0 var(--border-strong)' : 'none',
          }}
        >
          {ADMIN_COPY.peoplePage.roles[each]}
        </button>
      );
    })}
  </div>
);

/** The drawn 40×24 switch: signal-to-accent when on. */
export const Switch = ({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean;
  label: string;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    style={{
      width: 40,
      height: 24,
      flex: 'none',
      borderRadius: 999,
      border: 'none',
      padding: 0,
      position: 'relative',
      cursor: disabled ? 'default' : 'pointer',
      background: on
        ? 'linear-gradient(90deg, var(--signal), var(--accent))'
        : 'var(--border)',
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: on ? 19 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--fg)',
        transition: 'left var(--motion-fast) var(--motion-ease)',
      }}
    />
  </button>
);

/** A label on the left, its value on the right. */
const Pair = ({ label, value }: { label: string; value: string }) => (
  <div style={{ ...ROW, justifyContent: 'space-between', gap: 12 }}>
    <span style={MUTED}>{label}</span>
    <span style={{ textAlign: 'right', minWidth: 0 }}>{value}</span>
  </div>
);

const MONO: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12.5,
  minWidth: 0,
  overflowWrap: 'anywhere',
};

export interface AccountProps {
  emailMasked: string;
  /** The revealed email ('' when there is none), or null while hidden. */
  shownEmail: string | null;
  emailBusy: boolean;
  emailError: boolean;
  onShowEmail: () => void;
  signsInWith: string | null;
  inviteCode: string | null;
  isTest: boolean;
  testBusy: boolean;
  testError: boolean;
  onTest: (next: boolean) => void;
}

/** Account: email, how they sign in, their invite code and the Test switch. */
export const Account = (props: AccountProps) => {
  const noEmail =
    props.shownEmail === '' ||
    (props.shownEmail === null && !props.emailMasked);
  let email: ReactNode;
  if (noEmail) {
    email = <span style={MUTED}>{COPY.noEmail}</span>;
  } else if (props.shownEmail !== null) {
    email = (
      <>
        <span style={MONO}>{props.shownEmail}</span>
        <span style={{ fontSize: 11.5, color: 'var(--warning)', flex: 'none' }}>
          {COPY.emailShown}
        </span>
      </>
    );
  } else {
    email = (
      <>
        <span style={MONO}>{props.emailMasked}</span>
        <AdminButton
          type="button"
          variant="outline"
          size="sm"
          icon={Eye}
          disabled={props.emailBusy}
          onClick={props.onShowEmail}
          style={{ background: 'var(--surface-2)', fontWeight: 600 }}
        >
          {COPY.showEmail}
        </AdminButton>
      </>
    );
  }
  return (
    <Block title={COPY.account}>
      <div style={{ ...ROW, flexWrap: 'wrap' }}>
        <span style={{ ...MUTED, flex: 1 }}>{COPY.email}</span>
        {email}
      </div>
      {props.shownEmail && (
        <div style={{ ...CAPTION, marginBottom: 8 }}>{COPY.emailShownNote}</div>
      )}
      {props.emailError && (
        <Hint tone="var(--danger)" alert>
          {COPY.emailFailed}
        </Hint>
      )}
      {props.signsInWith && (
        <Pair label={COPY.signsInWith} value={props.signsInWith} />
      )}
      {props.inviteCode && (
        <Pair label={COPY.inviteCode} value={props.inviteCode} />
      )}
      <div style={ROW}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>{COPY.testAccount}</div>
          <div style={CAPTION}>{COPY.testAccountCaption}</div>
        </div>
        <Switch
          on={props.isTest}
          label={COPY.testAccount}
          disabled={props.testBusy}
          onChange={props.onTest}
        />
      </div>
      {props.testError && (
        <Hint tone="var(--danger)" alert>
          {COPY.testAccountFailed}
        </Hint>
      )}
    </Block>
  );
};

const RECENT_ICON = { price: Tag, feedback: Bug, report: Music } as const;

/** Recent: the five newest reports, prices and feedback (ruling #14). */
export const Recent = ({ items }: { items: readonly PersonRecent[] }) => (
  <Block title={COPY.recentTitle}>
    {items.map((item, i) => {
      const Icon = RECENT_ICON[item.kind];
      return (
        <div
          key={`${item.kind}-${item.at}-${i}`}
          style={{ ...ROW, padding: '9px 0' }}
        >
          <Icon
            size={15}
            strokeWidth={1.7}
            color="var(--fg-subtle)"
            aria-hidden
            style={{ flex: 'none' }}
          />
          <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {recentLine(item)}
          </span>
          <span
            style={{ color: 'var(--fg-subtle)', fontSize: 12, flex: 'none' }}
          >
            {shortDate(item.at)}
          </span>
        </div>
      );
    })}
  </Block>
);

/**
 * The bottom toast (`07/role-changed-with-undo`, `12/signed-out-everywhere-d`):
 * centred under the page on desktop, above the tab bar on the phone.
 */
export const Toast = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string | null;
  action?: ReactNode;
}) => {
  const isPhone = useIsPhone();
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        zIndex: 60,
        left: 16,
        right: 16,
        bottom: isPhone ? 'calc(76px + env(safe-area-inset-bottom))' : 24,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: isPhone ? '100%' : 420,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          border:
            '1px solid color-mix(in srgb, var(--success) 45%, transparent)',
          boxShadow: 'var(--shadow-strong)',
          pointerEvents: 'auto',
        }}
      >
        <Check
          size={16}
          strokeWidth={2.2}
          color="var(--success)"
          aria-hidden
          style={{ flex: 'none' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* A long unbroken handle ("@<50 chars> is now Beta") wraps inside
              the toast instead of running off a phone's edge (as #260). */}
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </div>
          {body && (
            <div
              style={{
                fontSize: 12.5,
                ...MUTED,
                marginTop: 2,
                overflowWrap: 'anywhere',
              }}
            >
              {body}
            </div>
          )}
        </div>
        {action}
      </div>
    </div>
  );
};
