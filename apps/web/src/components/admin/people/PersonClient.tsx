'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft } from 'lucide-react';
import type { PersonDetail, Role } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  ConfirmDialog,
  CouldntLoad,
  StatusBadge,
  useIsPhone,
} from '@/components/admin/primitives';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { refusedStatus } from '../invite-codes/codes-api';
import { Hint } from '../invite-codes/CodeFormParts';
import { CodeRowMenu, MENU_ICONS } from '../invite-codes/CodeRowMenu';
import { Avatar } from './PeopleClient';
import { ROLE_KIND } from './people-rules';
import { personApi, type SettableRole } from './person-api';
import {
  asksFirst,
  headLine,
  inviteCodeLabel,
  personName,
  phoneActiveLine,
  roleCaption,
  roleToastBody,
  signInLabel,
} from './person-rules';
import { Account, Recent, RoleSegment, Stats, Toast } from './PersonParts';
import { PersonSkeleton } from './PersonSkeleton';

const COPY = ADMIN_COPY.personPage;
const ROLES = ADMIN_COPY.peoplePage.roles;
/** Ruling #26: Undo stays 6 s, as the fan Undo does. */
const UNDO_MS = 6_000;

type Notice =
  | { kind: 'role'; name: string; from: Role; to: Role }
  | { kind: 'signedOut'; name: string };

/**
 * 5a person (`07/person`, `07/person-mobile`): the head, stats, role, Account
 * and Recent, with the ⋯ menu. Loads in the browser with the admin's token.
 */
export function PersonClient({ userId }: { userId: string }) {
  const { getToken } = useAuth();
  const isPhone = useIsPhone();
  const { setPageTitle } = usePageTitle();
  const api = useMemo(() => personApi(getToken), [getToken]);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [asking, setAsking] = useState<SettableRole | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shownEmail, setShownEmail] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState(false);
  const [signingOut, setSigningOut] = useState<'ask' | 'busy' | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setPerson(await api.get(userId));
    } catch (err: unknown) {
      if (refusedStatus(err) === 404) setMissing(true);
      else setFailed(true);
    }
  }, [api, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = person ? personName(person) : null;
  useEffect(() => {
    if (!name) return undefined;
    setPageTitle(name);
    return () => setPageTitle(null);
  }, [name, setPageTitle]);

  const show = useCallback((next: Notice) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(next);
    noticeTimer.current = setTimeout(() => setNotice(null), UNDO_MS);
  }, []);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  if (missing) notFound();
  if (failed)
    return <CouldntLoad page={COPY.back} onRetry={() => void load()} />;
  if (!person || !name) return <PersonSkeleton />;

  const now = new Date();

  const applyRole = async (to: SettableRole, undoable: boolean) => {
    setRoleBusy(true);
    setRoleError(null);
    try {
      const result = await api.setRole(userId, to);
      setPerson((prev) => (prev ? { ...prev, role: result.role } : prev));
      if (undoable)
        show({
          kind: 'role',
          name,
          from: result.previousRole,
          to: result.role,
        });
    } catch (err: unknown) {
      setRoleError(
        refusedStatus(err) === 403 ? COPY.roleRefused : COPY.roleFailed,
      );
    } finally {
      setRoleBusy(false);
      setAsking(null);
    }
  };

  const pickRole = (to: SettableRole) => {
    if (to === person.role) return;
    if (asksFirst(person.role, to)) setAsking(to);
    else void applyRole(to, true);
  };

  const undo = (from: Role) => {
    setNotice(null);
    // The API never hands back sub_admin as a previous role; guard anyway.
    if (from !== 'sub_admin') void applyRole(from, false);
  };

  const showEmail = async () => {
    setEmailBusy(true);
    setEmailError(false);
    try {
      setShownEmail(await api.showEmail(userId));
    } catch {
      setEmailError(true);
    } finally {
      setEmailBusy(false);
    }
  };

  const setTest = async (next: boolean) => {
    setTestBusy(true);
    setTestError(false);
    setPerson({ ...person, isTestAccount: next });
    try {
      await api.setTestAccount(userId, next);
    } catch {
      // The switch snaps back to what is still saved.
      setPerson((prev) => (prev ? { ...prev, isTestAccount: !next } : prev));
      setTestError(true);
    } finally {
      setTestBusy(false);
    }
  };

  const signOut = async () => {
    setSigningOut('busy');
    setSignOutError(false);
    try {
      await api.signOutEverywhere(userId);
      setSigningOut(null);
      show({ kind: 'signedOut', name });
    } catch {
      setSigningOut(null);
      setSignOutError(true);
    }
  };

  const menu = (
    <CodeRowMenu
      label={COPY.menu.label(name)}
      width={300}
      triggerStyle={{
        height: 36,
        padding: '0 10px',
        alignItems: 'center',
        borderRadius: 9,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-2)',
        color: 'var(--fg)',
      }}
      items={[
        {
          key: 'sign-out',
          icon: MENU_ICONS.signOut,
          label: COPY.menu.signOut,
          hint: COPY.menu.signOutHint,
          onSelect: () => setSigningOut('ask'),
        },
      ]}
    />
  );

  const roleChip = (
    <StatusBadge kind={ROLE_KIND[person.role]} dot>
      {ROLES[person.role]}
    </StatusBadge>
  );

  const head = (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: isPhone ? 12 : 14 }}
    >
      <Avatar
        handle={person.handle}
        size={isPhone ? 48 : 56}
        initialSize={isPhone ? 19 : 22}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: isPhone ? 21 : 26,
            fontWeight: 800,
            letterSpacing: isPhone ? undefined : '-0.02em',
            overflowWrap: 'anywhere',
          }}
        >
          {name}
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: isPhone ? 5 : 6,
          }}
        >
          {roleChip}
          <span
            style={{ fontSize: isPhone ? 12 : 13, color: 'var(--fg-muted)' }}
          >
            {isPhone ? phoneActiveLine(person, now) : headLine(person, now)}
          </span>
        </div>
      </div>
      {!isPhone && menu}
    </div>
  );

  const caption = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        color: 'var(--fg-muted)',
        lineHeight: 1.45,
      }}
    >
      {roleCaption(person.role)}
    </div>
  );
  const segment = (
    <RoleSegment
      role={person.role}
      disabled={roleBusy || person.role === 'sub_admin'}
      onPick={pickRole}
    />
  );
  const roleBlock = isPhone ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-muted)' }}
      >
        {COPY.role}
      </div>
      {segment}
      {caption}
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700 }}>{COPY.role}</div>
      {segment}
      {caption}
    </div>
  );

  const account = (
    <Account
      emailMasked={person.emailMasked}
      shownEmail={shownEmail}
      emailBusy={emailBusy}
      emailError={emailError}
      onShowEmail={() => void showEmail()}
      signsInWith={signInLabel(person.signInMethods)}
      inviteCode={inviteCodeLabel(person, isPhone)}
      isTest={person.isTestAccount}
      testBusy={testBusy}
      testError={testError}
      onTest={(next) => void setTest(next)}
    />
  );

  const fromLabel = ROLES[person.role];
  const toLabel = asking ? ROLES[asking] : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 14 : 16,
      }}
    >
      {isPhone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          <Link
            href="/admin/people"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft size={14} aria-hidden />
            {COPY.back}
          </Link>
          <span style={{ flex: 1 }} />
          {menu}
        </div>
      )}
      {head}
      {signOutError && (
        <Hint tone="var(--danger)" alert>
          {COPY.signOut.failed}
        </Hint>
      )}
      <Stats stats={person.stats} />
      <div>
        {roleBlock}
        {roleError && (
          <Hint tone="var(--danger)" alert>
            {roleError}
          </Hint>
        )}
      </div>
      {/* "Trying early" waits on 5c (HOLD); Account keeps its drawn half. */}
      {isPhone ? (
        account
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {account}
        </div>
      )}
      {person.recent.length > 0 && <Recent items={person.recent} />}

      {asking && (
        <ConfirmDialog
          title={
            asking === 'admin'
              ? COPY.makeAdmin.title(name)
              : COPY.removeAdmin.title(name, toLabel)
          }
          body={
            <>
              {asking === 'admin' ? COPY.makeAdmin.body : COPY.removeAdmin.body}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  color: 'var(--fg)',
                }}
              >
                <Avatar handle={person.handle} size={32} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{name}</b>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginTop: 2,
                    }}
                  >
                    {COPY.change(fromLabel, toLabel)}
                  </span>
                </span>
              </span>
            </>
          }
          confirmLabel={
            asking === 'admin'
              ? COPY.makeAdmin.confirm
              : COPY.removeAdmin.confirm(toLabel)
          }
          confirmVariant="gradient"
          buttonSize="large"
          pending={roleBusy}
          onConfirm={() => void applyRole(asking, false)}
          onCancel={() => setAsking(null)}
        />
      )}
      {signingOut && (
        <ConfirmDialog
          title={COPY.signOut.title(name)}
          body={COPY.signOut.body(name)}
          confirmLabel={COPY.signOut.confirm}
          confirmVariant="gradient"
          buttonSize="large"
          pending={signingOut === 'busy'}
          onConfirm={() => void signOut()}
          onCancel={() => setSigningOut(null)}
        />
      )}
      {notice?.kind === 'role' && (
        <Toast
          title={COPY.toast.title(notice.name, ROLES[notice.to])}
          body={roleToastBody(notice.from, notice.to)}
          action={
            <AdminButton
              type="button"
              variant="outline"
              onClick={() => undo(notice.from)}
              style={{
                height: 30,
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 600,
                background: 'var(--surface-2)',
              }}
            >
              {COPY.toast.undo}
            </AdminButton>
          }
        />
      )}
      {notice?.kind === 'signedOut' && (
        <Toast
          title={COPY.signOut.done(notice.name)}
          body={COPY.signOut.doneBody}
        />
      )}
    </div>
  );
}
