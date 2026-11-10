import { describe, it, expect, beforeEach, vi } from 'vitest';
import { giftedComps } from '@concert-crawl/db';
import { testDb } from '../test/helpers/db.js';
import { clearTables } from '../test/helpers/seed.js';
import { apiLogger } from './logger.js';
import { loadPlanContext } from './plan.js';

const USER_ID = 'user_plan_mirror';
const DAY_MS = 86_400_000;
const MIRROR_WARNING =
  'gifted_comps and Clerk publicMetadata.plan mirror disagree — table wins';

const warned = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.some((call) => call[1] === MIRROR_WARNING);

describe('loadPlanContext gift-mirror drift warning', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(giftedComps);
    vi.restoreAllMocks();
  });

  // Nothing clears the mirror after a gift expires any more, so this case is
  // expected on every read and must not warn.
  it('stays quiet for an expired gift whose mirror still says gifted', async () => {
    await testDb.insert(giftedComps).values({
      userId: USER_ID,
      grantedBy: 'admin_test',
      expiresAt: new Date(Date.now() - DAY_MS),
    });
    const spy = vi.spyOn(apiLogger, 'warn');

    const { planState } = await loadPlanContext(USER_ID, {
      plan: 'premium_gifted',
    });

    expect(planState.plan).toBe('free');
    expect(warned(spy)).toBe(false);
  });

  it('warns for a revoked gift whose mirror still says gifted', async () => {
    await testDb.insert(giftedComps).values({
      userId: USER_ID,
      grantedBy: 'admin_test',
      expiresAt: null,
      revokedAt: new Date(Date.now() - DAY_MS),
    });
    const spy = vi.spyOn(apiLogger, 'warn');

    await loadPlanContext(USER_ID, { plan: 'premium_gifted' });

    expect(warned(spy)).toBe(true);
  });

  it('warns for a live gift the mirror misses', async () => {
    await testDb.insert(giftedComps).values({
      userId: USER_ID,
      grantedBy: 'admin_test',
      expiresAt: null,
    });
    const spy = vi.spyOn(apiLogger, 'warn');

    const { planState } = await loadPlanContext(USER_ID, {});

    expect(planState.plan).toBe('gifted');
    expect(warned(spy)).toBe(true);
  });
});
