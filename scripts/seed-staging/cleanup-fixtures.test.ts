import { describe, it, expect, vi } from 'vitest'
import {
  crews,
  submissionConfirms,
  priceSubmissions,
  feedback,
  userEvents,
  notifications,
  userProfiles,
} from '../../packages/db/src/schema/index.js'
import { cleanupFixtures } from './cleanup-fixtures.js'

describe('cleanupFixtures', () => {
  const fixtureUserIds = ['user_2fixture_alpha', 'user_2fixture_bravo'] as const

  /**
   * Build a mock staging client where each delete().where().returning() call
   * resolves to an array of `rowCount` stub objects. Also mocks the
   * select().from().where() chain that cleanupFixtures now uses to look up
   * fixture-owned submission IDs before deleting confirms — returns an
   * empty array (no fixture submissions exist yet) so the confirms delete
   * takes the userId-only branch.
   *
   * We collect `returningSpies` so tests can assert call count and order.
   */
  function makeStaging(rowCountPerTable: number) {
    const returningSpies: ReturnType<typeof vi.fn>[] = []

    const staging = {
      select: (_cols: unknown) => ({
        from: (_table: unknown) => ({
          where: (_cond: unknown) => Promise.resolve([]),
        }),
      }),
      delete: (_table: unknown) => ({
        where: (_cond: unknown) => {
          const spy = vi.fn().mockResolvedValue(
            Array.from({ length: rowCountPerTable }, (_, idx) => ({
              id: `row-${idx}`,
            })),
          )
          returningSpies.push(spy)
          // returning spy is called immediately by the implementation
          return { returning: spy }
        },
      }),
    }

    return { staging, returningSpies }
  }

  it('issues one delete per table (7 total)', async () => {
    const { staging, returningSpies } = makeStaging(2)
    await cleanupFixtures({ staging: staging as any, fixtureUserIds })
    expect(returningSpies).toHaveLength(7)
    for (const spy of returningSpies) {
      expect(spy).toHaveBeenCalledOnce()
    }
  })

  it('returns deleted counts keyed by table name', async () => {
    const { staging } = makeStaging(3)
    const result = await cleanupFixtures({
      staging: staging as any,
      fixtureUserIds,
    })
    expect(Object.keys(result.deleted)).toHaveLength(7)
    for (const count of Object.values(result.deleted)) {
      expect(count).toBe(3)
    }
  })

  it('result includes all seven expected table keys', async () => {
    const { staging } = makeStaging(0)
    const result = await cleanupFixtures({
      staging: staging as any,
      fixtureUserIds,
    })
    expect(result.deleted).toHaveProperty('submissionConfirms')
    expect(result.deleted).toHaveProperty('priceSubmissions')
    expect(result.deleted).toHaveProperty('feedback')
    expect(result.deleted).toHaveProperty('userEvents')
    expect(result.deleted).toHaveProperty('notifications')
    expect(result.deleted).toHaveProperty('userProfiles')
    expect(result.deleted).toHaveProperty('crews')
  })

  it('sweeps cascading crews first, then user-scoped tables child-before-parent', async () => {
    const callOrder: string[] = []

    // Capture the actual table object passed to `.delete()` on each call,
    // then map it to its name via reference identity. This tests real order
    // — a wrong-ordered implementation would push tables in the wrong
    // sequence here. A counter-based approach (previously used) would pass
    // even if the implementation reordered, because it observed call index
    // rather than the argument.
    const tableToName = new Map<unknown, string>([
      [submissionConfirms, 'submissionConfirms'],
      [priceSubmissions, 'priceSubmissions'],
      [feedback, 'feedback'],
      [userEvents, 'userEvents'],
      [notifications, 'notifications'],
      [userProfiles, 'userProfiles'],
      [crews, 'crews'],
    ])

    const staging = {
      // Empty select result — cleanupFixtures uses this to look up
      // fixture-owned submission IDs before deleting confirms.
      select: (_cols: unknown) => ({
        from: (_table: unknown) => ({
          where: (_cond: unknown) => Promise.resolve([]),
        }),
      }),
      delete: (table: unknown) => {
        callOrder.push(tableToName.get(table) ?? 'unknown')
        return {
          where: (_cond: unknown) => ({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }
      },
    }

    await cleanupFixtures({ staging: staging as any, fixtureUserIds })

    expect(callOrder).toEqual([
      'crews',
      'submissionConfirms',
      'priceSubmissions',
      'feedback',
      'userEvents',
      'notifications',
      'userProfiles',
    ])
  })

  // Crew ids are constants, not derived from the user set, so the crew sweep
  // must not sit behind the empty-fixture-set early return.
  it('still sweeps seeded crews when the fixture set is empty', async () => {
    const deletedTables: unknown[] = []
    const staging = {
      select: (_cols: unknown) => ({
        from: (_table: unknown) => ({
          where: (_cond: unknown) => Promise.resolve([]),
        }),
      }),
      delete: (table: unknown) => {
        deletedTables.push(table)
        return {
          where: (_cond: unknown) => ({
            returning: vi.fn().mockResolvedValue([{ id: 'crew-1' }]),
          }),
        }
      },
    }

    const result = await cleanupFixtures({
      staging: staging as any,
      fixtureUserIds: [],
    })
    expect(deletedTables).toContain(crews)
    expect(result.deleted['crews']).toBe(1)
  })

  it('returns zero counts when no rows are deleted', async () => {
    const { staging } = makeStaging(0)
    const result = await cleanupFixtures({
      staging: staging as any,
      fixtureUserIds,
    })
    for (const count of Object.values(result.deleted)) {
      expect(count).toBe(0)
    }
  })

  it('looks up fixture-owned submission IDs so confirms delete matches the cascade', async () => {
    // Regression guard for R4: submission_confirms.submission_id ->
    // price_submissions.id has onDelete: 'cascade'. Deleting a fixture
    // user's submissions cascade-drops all confirms attached to those
    // submissions (regardless of confirmer identity). The confirms delete
    // MUST include those to keep the reported count accurate and the
    // "fixture-owned" scope explicit — a userId-only filter would
    // undercount cascade-affected rows.
    const selectSpy = vi.fn()
    const staging = {
      select: (_cols: unknown) => ({
        from: (_table: unknown) => ({
          where: (_cond: unknown) => {
            selectSpy()
            return Promise.resolve([
              { id: 'submission-1' },
              { id: 'submission-2' },
            ])
          },
        }),
      }),
      delete: (_table: unknown) => ({
        where: (_cond: unknown) => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    await cleanupFixtures({ staging: staging as any, fixtureUserIds })
    // The lookup must run before the confirms delete.
    expect(selectSpy).toHaveBeenCalled()
  })
})
