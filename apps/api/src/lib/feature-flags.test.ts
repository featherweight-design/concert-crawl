import { beforeEach, describe, expect, it, vi } from 'vitest';

const flagRows = vi.fn();
const peopleRows = vi.fn();

// `featureFlagUsers` is told apart from `featureFlags` by identity: the loader
// reads both tables in one go.
const { featureFlagsTable, featureFlagUsersTable } = vi.hoisted(() => ({
  featureFlagsTable: { name: 'feature_flags' },
  featureFlagUsersTable: { name: 'feature_flag_users' },
}));

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) =>
        table === featureFlagUsersTable ? peopleRows() : flagRows(),
    }),
  },
  featureFlags: featureFlagsTable,
  featureFlagUsers: featureFlagUsersTable,
}));

const { clearFeatureFlagCache, isFeatureEnabled, loadFeatureFlags } =
  await import('./feature-flags.js');

const stored = (
  key: string,
  stage: 'off' | 'me' | 'beta' | 'everyone',
  ownerUserId: string | null = null,
) => ({ key, stage, ownerUserId });

const DEFAULTS = {
  crews: false,
  'release-notes': true,
};

describe('loadFeatureFlags', () => {
  beforeEach(() => {
    clearFeatureFlagCache();
    flagRows.mockReset();
    peopleRows.mockReset();
    peopleRows.mockResolvedValue([]);
  });

  it('falls back to registry defaults when the table is empty', async () => {
    flagRows.mockResolvedValue([]);
    await expect(loadFeatureFlags()).resolves.toEqual(DEFAULTS);
  });

  it('lets a stored Everyone override its registry default', async () => {
    flagRows.mockResolvedValue([stored('crews', 'everyone')]);
    const flags = await loadFeatureFlags();
    expect(flags.crews).toBe(true);
    expect(flags['release-notes']).toBe(true);
  });

  it('lets an admin stage a default-on flag down to Off', async () => {
    flagRows.mockResolvedValue([stored('release-notes', 'off')]);
    expect((await loadFeatureFlags())['release-notes']).toBe(false);
  });

  // spotify-sync left the registry in the contract step; a database that has
  // not run 0125 yet still has its row.
  it('ignores a stored row whose key left the registry', async () => {
    flagRows.mockResolvedValue([stored('spotify-sync', 'everyone')]);
    const flags = await loadFeatureFlags();
    expect(Object.keys(flags).sort()).toEqual(['crews', 'release-notes']);
  });

  // The launch animation's flag was removed 2026-11-12 but its row stays in
  // the table (contract later): it must read as an unknown key, not break the
  // loader or surface in the map.
  it('ignores the leftover launch-animation row', async () => {
    flagRows.mockResolvedValue([
      stored('launch-animation', 'everyone'),
      stored('crews', 'everyone'),
    ]);
    await expect(loadFeatureFlags()).resolves.toEqual({
      ...DEFAULTS,
      crews: true,
    });
  });

  it('answers each viewer from the one memoized state', async () => {
    flagRows.mockResolvedValue([stored('crews', 'beta', 'owner-1')]);
    peopleRows.mockResolvedValue([{ flagKey: 'crews', userId: 'named-1' }]);
    const asBeta = await loadFeatureFlags({ userId: 'u1', role: 'beta' });
    const asNamed = await loadFeatureFlags({ userId: 'named-1', role: null });
    const asOwner = await loadFeatureFlags({
      userId: 'owner-1',
      role: 'admin',
    });
    const asUser = await loadFeatureFlags({ userId: 'u2', role: 'user' });
    const signedOut = await loadFeatureFlags();
    expect([
      asBeta.crews,
      asNamed.crews,
      asOwner.crews,
      asUser.crews,
      signedOut.crews,
    ]).toEqual([true, true, true, false, false]);
    expect(flagRows).toHaveBeenCalledTimes(1);
  });

  it('serves the memo rather than re-querying', async () => {
    flagRows.mockResolvedValue([]);
    await loadFeatureFlags();
    await loadFeatureFlags();
    expect(flagRows).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the cache is cleared', async () => {
    flagRows.mockResolvedValue([]);
    await loadFeatureFlags();
    clearFeatureFlagCache();
    await loadFeatureFlags();
    expect(flagRows).toHaveBeenCalledTimes(2);
  });

  it('falls back to defaults when the query throws on a cold start', async () => {
    flagRows.mockRejectedValue(new Error('connection refused'));
    await expect(loadFeatureFlags()).resolves.toEqual(DEFAULTS);
  });

  // A failed read is cached like any other answer, so a database outage costs
  // one query and one log line per TTL window rather than one per request.
  it('memoizes the defaults it fell back to', async () => {
    flagRows.mockRejectedValue(new Error('connection refused'));
    await loadFeatureFlags();
    await loadFeatureFlags();
    expect(flagRows).toHaveBeenCalledTimes(1);
  });

  // An unreachable table must never widen a flag: a default-on flag an admin
  // staged to Off keeps its last known state through a blip.
  it('keeps the last known state when a refresh fails', async () => {
    flagRows.mockResolvedValueOnce([stored('release-notes', 'off')]);
    expect((await loadFeatureFlags())['release-notes']).toBe(false);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 60_000);
      flagRows.mockRejectedValue(new Error('connection refused'));
      expect((await loadFeatureFlags())['release-notes']).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares one query across callers that race an expired cache', async () => {
    let release: (rows: unknown[]) => void = () => {};
    flagRows.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const both = Promise.all([loadFeatureFlags(), loadFeatureFlags()]);
    release([stored('crews', 'everyone')]);
    const [first, second] = await both;
    expect(flagRows).toHaveBeenCalledTimes(1);
    expect(first.crews).toBe(second.crews);
  });

  it('answers a single key for a viewer', async () => {
    flagRows.mockResolvedValue([stored('crews', 'beta')]);
    await expect(isFeatureEnabled('crews')).resolves.toBe(false);
    await expect(
      isFeatureEnabled('crews', { userId: 'u', role: 'beta' }),
    ).resolves.toBe(true);
  });
});
