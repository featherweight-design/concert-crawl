// B+ B9a: a price under an open price check, with several fans' updates
// pending on it. Covers the viewer affordances and leading amount on the event
// page payload, and the shared price rule every list surface reads.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { priceSubmissions } from '@concert-crawl/db';
import type { PriceCheckFields } from '@concert-crawl/types';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import { loadPriceByTierByEventId } from '../lib/price-aggregation/index.js';
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
  seedVenue,
} from '../test/helpers/seed.js';
import { allowSeveralPendingCountersPerPrice } from '../test/helpers/pending-counter-index.js';

const app = createApp();

function setAuth(userId: string | null): void {
  authState.current =
    userId === null
      ? null
      : { userId, sessionClaims: { metadata: { role: 'user' } } };
}

interface CounterShape extends PriceCheckFields {
  id: string;
  parentSubmissionId: string;
  floor: number;
}

interface DetailBody {
  data: {
    counterSubmission: CounterShape | null;
    pendingSubmissions: Array<{ id: string }> | null;
    priceByTier: Array<{
      tier: string;
      headline: { submissionId: string; priceMin: string } | null;
      pending: Array<{ id: string }>;
      counterSubmission: CounterShape | null;
    }>;
  };
}

// The board's case: @hugh's $44 GA price, checked by @rae ($52, filed first)
// and @sam ($60, filed later). Neither update has confirmations, so @rae's,
// the earliest filed, leads.
async function seedCheckedPrice() {
  const venue = await seedVenue({ name: 'Check Venue', slug: 'check-venue' });
  const event = await seedEvent(venue.id, {
    date: '2027-08-01',
    priceSource: 'community',
    ticketPriceMin: '44',
  });
  await seedUserProfile('user_hugh', { handle: 'hugh' });
  await seedUserProfile('user_rae', { handle: 'rae' });
  await seedUserProfile('user_sam', { handle: 'sam' });
  const parent = await seedPriceSubmission(event.id, 'user_hugh', {
    tier: 'GA',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '44',
    status: 'disputed',
    corroborationCount: 3,
  });
  const rae = await seedPriceSubmission(event.id, 'user_rae', {
    tier: 'GA',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '52',
    status: 'pending',
    disputedSubmissionId: parent.id,
    createdAt: new Date('2027-01-01T10:00:00Z'),
  });
  const sam = await seedPriceSubmission(event.id, 'user_sam', {
    tier: 'GA',
    vendor: 'Ticketmaster',
    sourceCategory: 'standard',
    priceMin: '60',
    status: 'pending',
    disputedSubmissionId: parent.id,
    createdAt: new Date('2027-01-01T11:00:00Z'),
  });
  return { venue, event, parent, rae, sam };
}

async function getDetail(eventId: string): Promise<DetailBody> {
  const res = await app.request(`/v1/events/${eventId}`, {
    headers: { Authorization: 'Bearer test-token' },
  });
  expect(res.status).toBe(200);
  return (await res.json()) as DetailBody;
}

describe('GET /v1/events/:id — a price under check with several updates', () => {
  allowSeveralPendingCountersPerPrice();

  beforeEach(async () => {
    setAuth(null);
    await clearTables();
  });

  it('keeps the current price as the headline and carries the leading update amount', async () => {
    const { event, parent, rae } = await seedCheckedPrice();
    const body = await getDetail(event.id);

    const block = body.data.priceByTier[0];
    expect(block?.headline?.submissionId).toBe(parent.id);
    expect(block?.headline?.priceMin).toBe('44.00');
    // "$44 → $52?": the leading update is the earliest filed.
    expect(block?.counterSubmission?.id).toBe(rae.id);
    expect(block?.counterSubmission?.floor).toBe(52);
    expect(block?.counterSubmission?.pendingCount).toBe(2);
    expect(body.data.counterSubmission?.id).toBe(rae.id);
    expect(body.data.counterSubmission?.pendingCount).toBe(2);
  });

  it('a confirmed update leads over an earlier one', async () => {
    const { event, sam } = await seedCheckedPrice();
    await testDb
      .update(priceSubmissions)
      .set({ corroborationCount: 2 })
      .where(eq(priceSubmissions.id, sam.id));

    const body = await getDetail(event.id);
    expect(body.data.priceByTier[0]?.counterSubmission?.id).toBe(sam.id);
    expect(body.data.priceByTier[0]?.counterSubmission?.floor).toBe(60);
  });

  it('does not list the other updates as separate pending prices', async () => {
    const { event, rae, sam } = await seedCheckedPrice();
    const body = await getDetail(event.id);

    const pendingIds = [
      ...(body.data.pendingSubmissions ?? []).map((sub) => sub.id),
      ...body.data.priceByTier.flatMap((block) =>
        block.pending.map((sub) => sub.id),
      ),
    ];
    expect(pendingIds).not.toContain(rae.id);
    expect(pendingIds).not.toContain(sam.id);
  });

  it("gives the price's own submitter no action", async () => {
    const { event } = await seedCheckedPrice();
    setAuth('user_hugh');
    const body = await getDetail(event.id);

    for (const counter of [
      body.data.priceByTier[0]?.counterSubmission,
      body.data.counterSubmission,
    ]) {
      expect(counter?.viewerAction).toBe('none');
      expect(counter?.viewerCounterId).toBeNull();
    }
  });

  it("offers a non-leading update's submitter Withdraw on their own update", async () => {
    const { event, sam } = await seedCheckedPrice();
    setAuth('user_sam');
    const body = await getDetail(event.id);

    for (const counter of [
      body.data.priceByTier[0]?.counterSubmission,
      body.data.counterSubmission,
    ]) {
      expect(counter?.viewerAction).toBe('withdraw');
      expect(counter?.viewerCounterId).toBe(sam.id);
    }
  });

  it('offers any other signed-in fan Submit an update', async () => {
    const { event } = await seedCheckedPrice();
    setAuth('user_other_fan');
    const body = await getDetail(event.id);

    expect(body.data.priceByTier[0]?.counterSubmission?.viewerAction).toBe(
      'submit_update',
    );
    expect(body.data.counterSubmission?.viewerCounterId).toBeNull();
  });

  it('offers a signed-out viewer Submit an update (the sheet asks them to sign in)', async () => {
    const { event } = await seedCheckedPrice();
    const body = await getDetail(event.id);

    expect(body.data.priceByTier[0]?.counterSubmission?.viewerAction).toBe(
      'submit_update',
    );
  });
});

describe('the shared price rule while a check is open', () => {
  allowSeveralPendingCountersPerPrice();

  beforeEach(async () => {
    setAuth(null);
    await clearTables();
  });

  it('Browse keeps showing the current price, not a pricier live tier', async () => {
    const { event, parent } = await seedCheckedPrice();
    await seedPriceSubmission(event.id, 'user_vip', {
      tier: 'VIP',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '80',
      status: 'corroborated',
    });

    const res = await app.request('/v1/events');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        data: Array<{
          id: string;
          priceByTier?: Array<{
            tier: string;
            headline: { submissionId: string; priceMin: string } | null;
          }> | null;
        }>;
      };
    };
    const row = body.data.data.find((evt) => evt.id === event.id);
    expect(row?.priceByTier?.[0]?.headline?.submissionId).toBe(parent.id);
    expect(row?.priceByTier?.[0]?.headline?.priceMin).toBe('44.00');
  });

  it('the shared loader (artist page, digests, Watching) keeps the checked price', async () => {
    const { event, parent } = await seedCheckedPrice();
    const blocks = (await loadPriceByTierByEventId([event.id])).get(event.id);
    expect(blocks?.[0]?.headline?.submissionId).toBe(parent.id);
    expect(blocks?.[0]?.headline?.priceMin).toBe('44.00');
  });

  it('a live price in the same tier still outranks the checked one', async () => {
    const { event } = await seedCheckedPrice();
    const live = await seedPriceSubmission(event.id, 'user_live', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '48',
      status: 'corroborated',
    });
    const blocks = (await loadPriceByTierByEventId([event.id])).get(event.id);
    expect(blocks).toHaveLength(1);
    expect(blocks?.[0]?.headline?.submissionId).toBe(live.id);
    expect(blocks?.[0]?.alternates).toHaveLength(0);
  });

  it('a disputed price with no open check (an admin denial) stays off', async () => {
    const venue = await seedVenue({ name: 'Denied', slug: 'denied-venue' });
    const event = await seedEvent(venue.id, { date: '2027-08-02' });
    await seedPriceSubmission(event.id, 'user_denied', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '10',
      status: 'disputed',
    });
    const blocks = await loadPriceByTierByEventId([event.id]);
    expect(blocks.get(event.id)).toBeUndefined();
  });
});
