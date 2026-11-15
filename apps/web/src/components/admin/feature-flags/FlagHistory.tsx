'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { FeatureFlagKey } from '@concert-crawl/entitlements';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { WhenCell, mention } from './flag-drawer-format';
import { type Stage } from './StageLadder';

const COPY = ADMIN_COPY.featureFlags;
const DRAWER = COPY.drawer;

interface HistoryRow {
  id: string;
  kind: string;
  fromStage: Stage | null;
  toStage: Stage | null;
  subjectHandle: string | null;
  actorHandle: string | null;
  createdAt: string;
}

/** One History line: "@hugh added @theo.wav", "@hugh: Me → Beta". */
const lineOf = (row: HistoryRow): string => {
  const actor = mention(row.actorHandle);
  switch (row.kind) {
    case 'person_added':
      return DRAWER.historyAdded(actor, mention(row.subjectHandle));
    case 'person_removed':
      return DRAWER.historyRemoved(actor, mention(row.subjectHandle));
    case 'verified':
      return DRAWER.historyVerified(actor);
    case 'unverified':
      return DRAWER.historyUnverified(actor);
    default: {
      // A stage change; the first row of a flag has no earlier rung.
      if (row.toStage === null) return actor;
      return row.fromStage === null
        ? DRAWER.historySet(actor, COPY.stage[row.toStage])
        : DRAWER.historyMoved(
            actor,
            COPY.stage[row.fromStage],
            COPY.stage[row.toStage],
          );
    }
  }
};

interface FlagHistoryProps {
  flagKey: FeatureFlagKey;
  /** Changes whenever the flag does, so the list reloads after a save. */
  version: string;
}

/** The History block at the foot of the drawer (`a-flag-in-staging-admin-in-flow`). */
export const FlagHistory = ({ flagKey, version }: FlagHistoryProps) => {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('no session token');
        const found = await apiClient.get<HistoryRow[]>(
          `/v1/admin/feature-flags/${flagKey}/history`,
          token,
        );
        if (cancelled) return;
        setRows(found);
        setFailed(false);
      } catch (err) {
        console.error('[admin] feature flag history failed', flagKey, err);
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [flagKey, version, getToken]);

  return (
    <section
      data-testid="flag-history"
      style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 12,
      }}
    >
      <h4
        style={{
          margin: '0 0 4px',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--fg)',
        }}
      >
        {DRAWER.history}
      </h4>
      {failed && rows === null ? (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
          {DRAWER.historyError}
        </div>
      ) : rows !== null && rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>
          {DRAWER.historyEmpty}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(rows ?? []).map((row) => (
            <li
              key={row.id}
              style={{
                display: 'flex',
                gap: 10,
                padding: '6px 0',
                fontSize: 12.5,
              }}
            >
              <span
                style={{ width: 56, flex: 'none', color: 'var(--fg-subtle)' }}
              >
                <WhenCell iso={row.createdAt} />
              </span>
              <span style={{ color: 'var(--fg-muted)', minWidth: 0 }}>
                {lineOf(row)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
