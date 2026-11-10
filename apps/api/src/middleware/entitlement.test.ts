import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import type { PlanState } from '@concert-crawl/types';

const { authState, planStateRef } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: unknown };
    } | null,
  },
  planStateRef: { current: null as PlanState | null },
}));

vi.mock('@hono/clerk-auth', () => ({
  getAuth: () => authState.current,
}));

const loadPlanStateMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(planStateRef.current)),
);
vi.mock('../lib/plan.js', () => ({
  loadPlanState: loadPlanStateMock,
}));

const { debugLogMock, infoLogMock } = vi.hoisted(() => ({
  debugLogMock: vi.fn(),
  infoLogMock: vi.fn(),
}));
vi.mock('../lib/logger.js', () => ({
  apiLogger: {
    debug: debugLogMock,
    info: infoLogMock,
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  requireFeature,
  ENTITLEMENT_REQUIRED_CODE,
  type EntitlementVariables,
} from './entitlement.js';

const basePlanState: PlanState = {
  plan: 'free',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
};

function setAuth(role = 'user'): void {
  authState.current = {
    userId: 'user_test123',
    sessionClaims: { metadata: { role } },
  };
}

function setPlan(overrides: Partial<PlanState>): void {
  planStateRef.current = { ...basePlanState, ...overrides };
}

function buildApp(
  feature: Parameters<typeof requireFeature>[0],
): Hono<{ Variables: EntitlementVariables }> {
  const app = new Hono<{ Variables: EntitlementVariables }>();
  app.use('/probe', requireFeature(feature));
  app.get('/probe', (ctx) =>
    ctx.json({ success: true, plan: ctx.get('planState').plan }),
  );
  return app;
}

describe('requireFeature', () => {
  beforeEach(() => {
    authState.current = null;
    planStateRef.current = basePlanState;
    loadPlanStateMock.mockClear();
    debugLogMock.mockClear();
    infoLogMock.mockClear();
  });

  it('logs denials at debug, not info (expected traffic must not flood prod logs)', async () => {
    setAuth();
    setPlan({ plan: 'free' });
    const app = buildApp('spotify-sync');
    await app.request('/probe');
    expect(debugLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'spotify-sync', plan: 'free' }),
      'entitlement gate denied',
    );
    expect(infoLogMock).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildApp('concert-history');
    const res = await app.request('/probe');
    expect(res.status).toBe(401);
    expect(loadPlanStateMock).not.toHaveBeenCalled();
  });

  // Since going free (2026-10-29) spotify-sync is the only feature the matrix
  // still denies a signed-in free or supporter account.
  it('returns 403 with a typed error code for a free user on a denied feature', async () => {
    setAuth();
    setPlan({ plan: 'free' });
    const app = buildApp('spotify-sync');
    const res = await app.request('/probe');
    expect(res.status).toBe(403);
    const body = (await res.json()) as {
      success: boolean;
      code: string;
      feature: string;
    };
    expect(body.success).toBe(false);
    expect(body.code).toBe(ENTITLEMENT_REQUIRED_CODE);
    expect(body.feature).toBe('spotify-sync');
  });

  it('passes supporter on calendar-export (a Supporter unlock since 2026-07-29)', async () => {
    setAuth();
    setPlan({ plan: 'supporter', status: 'active' });
    const app = buildApp('calendar-export');
    const res = await app.request('/probe');
    expect(res.status).toBe(200);
  });

  it('returns 403 for supporter on spotify-sync (retired, never unlocked)', async () => {
    setAuth();
    setPlan({ plan: 'supporter', status: 'active' });
    const app = buildApp('spotify-sync');
    const res = await app.request('/probe');
    expect(res.status).toBe(403);
  });

  it.each([
    'concert-history',
    'calendar-export',
    'following',
    'alerts',
    'price-drop-alerts',
    'crews',
  ] as const)(
    'passes free and supporter on %s (going free, 2026-10-29)',
    async (feature) => {
      setAuth();
      for (const plan of ['free', 'supporter'] as const) {
        setPlan({ plan });
        const res = await buildApp(feature).request('/probe');
        expect(res.status).toBe(200);
      }
    },
  );

  it('passes premium users through and exposes planState on context', async () => {
    setAuth();
    setPlan({ plan: 'premium', status: 'active' });
    const app = buildApp('concert-history');
    const res = await app.request('/probe');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { plan: string };
    expect(body.plan).toBe('premium');
  });

  it('passes gifted users through', async () => {
    setAuth();
    setPlan({ plan: 'gifted' });
    const app = buildApp('calendar-export');
    const res = await app.request('/probe');
    expect(res.status).toBe(200);
  });

  it('roleComped short-circuits even on a free plan', async () => {
    setAuth('admin');
    setPlan({ plan: 'free', roleComped: true });
    // spotify-sync, because it is the one feature free is still denied.
    const app = buildApp('spotify-sync');
    const res = await app.request('/probe');
    expect(res.status).toBe(200);
  });

  it('watching is free for all plans (locked decision)', async () => {
    setAuth();
    setPlan({ plan: 'free' });
    const app = buildApp('watching');
    const res = await app.request('/probe');
    expect(res.status).toBe(200);
  });

  it('forwards session-claim metadata to loadPlanState', async () => {
    setAuth('beta');
    setPlan({ plan: 'free', roleComped: true });
    const app = buildApp('concert-history');
    await app.request('/probe');
    expect(loadPlanStateMock).toHaveBeenCalledWith('user_test123', {
      role: 'beta',
    });
  });

  it('passes non-conforming metadata through untouched — loadPlanState owns validation', async () => {
    authState.current = {
      userId: 'user_test123',
      sessionClaims: {
        metadata: { role: 'beta', plan: 'legacy', futureKey: 42 },
      },
    };
    setPlan({ plan: 'free', roleComped: true });
    const app = buildApp('concert-history');
    await app.request('/probe');
    expect(loadPlanStateMock).toHaveBeenCalledWith('user_test123', {
      role: 'beta',
      plan: 'legacy',
      futureKey: 42,
    });
  });

  it('passes undefined metadata when the claim is absent', async () => {
    authState.current = { userId: 'user_test123', sessionClaims: {} };
    setPlan({ plan: 'free', roleComped: true });
    const app = buildApp('concert-history');
    await app.request('/probe');
    expect(loadPlanStateMock).toHaveBeenCalledWith('user_test123', undefined);
  });
});
