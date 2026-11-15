'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check, Plus, Search, X } from 'lucide-react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';
import { apiClient } from '@/lib/api';
import {
  AdminButton,
  PersonAvatar,
  useDialogKeyboard,
} from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FlagHistory } from './FlagHistory';
import { FlagPeopleSearch } from './FlagPeopleSearch';
import { StageLadder, stageOf, type Stage } from './StageLadder';
import { mention, roleLabel, shortDate } from './flag-drawer-format';

const COPY = ADMIN_COPY.featureFlags;
const DRAWER = COPY.drawer;

const SECTION_LABEL = {
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  color: 'var(--fg-subtle)',
  textTransform: 'uppercase',
} as const;

const TOAST_MS = 6000;

interface FlagDrawerProps {
  flag: AdminFeatureFlag;
  onClose: () => void;
  onPick: (stage: Stage) => void;
  /** A people change answered with the flag's new state. */
  onFlag: (flag: AdminFeatureFlag) => void;
  onMarkVerified: () => void;
  onUndoVerified: () => void;
  saving: boolean;
}

// The flag's panel: a 460px drawer on the right of the list
// (`07-people-flags-operations/a-flag-in-staging-admin-in-flow`). The boards do
// not draw what opens it; the flag's name does. Phone width is not drawn, so
// the drawer takes the full width there until the phone sheets are built.
export const FlagDrawer = ({
  flag,
  onClose,
  onPick,
  onFlag,
  onMarkVerified,
  onUndoVerified,
  saving,
}: FlagDrawerProps) => {
  const { getToken } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'panel' | 'add'>('panel');
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{
    userId: string;
    handle: string;
  } | null>(null);
  useDialogKeyboard(
    panelRef,
    view === 'add' ? () => setView('panel') : onClose,
  );

  const onStaging = flag.environment !== 'production';
  const stage = stageOf(flag);
  const people = flag.people ?? [];
  const betaCount = flag.betaCount ?? null;

  useEffect(() => {
    if (removed === null) return;
    const timer = setTimeout(() => setRemoved(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const changePeople = async (
    run: (token: string) => Promise<AdminFeatureFlag>,
  ): Promise<boolean> => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('no session token');
      onFlag(await run(token));
      return true;
    } catch (err) {
      console.error('[admin] feature flag people change failed', flag.key, err);
      setError(DRAWER.peopleError);
      return false;
    }
  };

  const add = (userId: string) =>
    changePeople((token) =>
      apiClient.post<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}/people`,
        token,
        { userId },
      ),
    );

  const remove = async (userId: string, handle: string | null) => {
    const done = await changePeople((token) =>
      apiClient.delete<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}/people/${encodeURIComponent(userId)}`,
        token,
      ),
    );
    if (done) setRemoved({ userId, handle: mention(handle) });
  };

  const undoRemove = async () => {
    if (removed === null) return;
    const { userId } = removed;
    setRemoved(null);
    await add(userId);
  };

  // What changes the History list: any save moves one of these.
  const version = [
    flag.updatedAt,
    flag.verifiedAt,
    people.map((person) => person.userId).join(','),
  ].join('|');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={flag.label}
      data-testid={`flag-drawer-${flag.key}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(4,6,16,0.55)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(evt) => {
        if (evt.target === evt.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: 460,
          maxWidth: '100%',
          height: '100%',
          overflowY: 'auto',
          padding: '22px 24px',
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-18px 0 40px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...SECTION_LABEL,
              display: 'inline-flex',
              alignItems: 'center',
              height: 18,
              padding: '0 6px',
              borderRadius: 5,
              color: 'var(--signal)',
              border:
                '1px solid color-mix(in oklab, var(--signal) 35%, transparent)',
            }}
          >
            {DRAWER.tag}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 26,
              padding: '0 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--warning)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 35%, transparent)',
            }}
          >
            {onStaging ? DRAWER.envStaging : DRAWER.envProduction}
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            aria-label={DRAWER.closeAriaLabel(flag.label)}
            data-testid="flag-drawer-close"
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              color: 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {view === 'add' ? (
          <FlagPeopleSearch
            flag={flag}
            onBack={() => setView('panel')}
            onAdd={async (userId) => {
              await add(userId);
            }}
          />
        ) : (
          <>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--fg)',
                }}
              >
                {flag.label}
              </h3>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--fg-muted)',
                }}
              >
                {flag.description}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={SECTION_LABEL}>
                {onStaging ? DRAWER.whoSeesStaging : DRAWER.whoSeesProduction}
              </span>
              <StageLadder flag={flag} onPick={onPick} scope="drawer" />
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                  marginTop: 4,
                }}
              >
                {betaCount !== null && `${DRAWER.betaIs(betaCount)} `}
                {DRAWER.alsoOn}
              </div>
              {people.length === 0 ? (
                <div
                  data-testid="flag-people-empty"
                  style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}
                >
                  {DRAWER.noPeople}
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {people.map((person) => {
                    const role = roleLabel(person.role);
                    const meta = [
                      role === null
                        ? null
                        : DRAWER.addedOn(role, shortDate(person.addedAt)),
                      person.isTest ? DRAWER.test : null,
                    ]
                      .filter((part) => part !== null)
                      .join(' · ');
                    return (
                      <li
                        key={person.userId}
                        data-testid={`flag-person-${person.userId}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 0',
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        <PersonAvatar
                          initialOf={person.handle}
                          avatarColor={null}
                          avatarSecondColor={null}
                          size={28}
                          initialSize={11}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: 'var(--fg)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {mention(person.handle)}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 12,
                              color: 'var(--fg-muted)',
                            }}
                          >
                            {meta}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void remove(person.userId, person.handle)
                          }
                          aria-label={DRAWER.removeAriaLabel(
                            mention(person.handle),
                          )}
                          data-testid={`flag-person-remove-${person.userId}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 8,
                            color: 'var(--fg-subtle)',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setView('add')}
                data-testid="flag-people-add-trigger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                  fontSize: 13,
                  color: 'var(--fg-subtle)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Search size={15} aria-hidden="true" />
                {DRAWER.addTrigger}
                <Plus
                  size={14}
                  aria-hidden="true"
                  style={{ marginLeft: 'auto' }}
                />
              </button>
              {error !== null && (
                <div
                  role="alert"
                  style={{ fontSize: 12.5, color: 'var(--danger)' }}
                >
                  {error}
                </div>
              )}
            </div>

            {flag.verifiedAt ? (
              <div
                data-testid="flag-drawer-verified"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background:
                    'color-mix(in oklab, var(--success) 8%, transparent)',
                  border:
                    '1px solid color-mix(in oklab, var(--success) 30%, transparent)',
                }}
              >
                <Check
                  size={14}
                  aria-hidden="true"
                  style={{ color: 'var(--success)', marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--fg)' }}>
                    {DRAWER.verifiedBy(
                      shortDate(flag.verifiedAt),
                      mention(flag.verifiedByHandle ?? null),
                    )}
                  </div>
                  {flag.verifiedNote && (
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {`“${flag.verifiedNote}”`}
                    </div>
                  )}
                </div>
                {onStaging && (
                  <button
                    type="button"
                    onClick={onUndoVerified}
                    disabled={saving}
                    aria-label={COPY.markVerified.undoAriaLabel(flag.label)}
                    data-testid="flag-drawer-undo-verified"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 6px',
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {COPY.markVerified.undo}
                  </button>
                )}
              </div>
            ) : (
              onStaging &&
              stage !== 'off' && (
                <div>
                  <AdminButton
                    variant="outline"
                    size="sm"
                    onClick={onMarkVerified}
                    disabled={saving}
                    data-testid="flag-drawer-mark-verified"
                  >
                    {COPY.markVerified.button}
                  </AdminButton>
                </div>
              )
            )}

            <FlagHistory flagKey={flag.key} version={version} />
          </>
        )}

        {removed !== null && (
          <div
            role="status"
            data-testid="flag-people-toast"
            style={{
              position: 'sticky',
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--fg)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <span style={{ flex: 1 }}>{DRAWER.removed(removed.handle)}</span>
            <button
              type="button"
              onClick={() => void undoRemove()}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 6px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--signal)',
                cursor: 'pointer',
              }}
            >
              {DRAWER.undoRemove}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
