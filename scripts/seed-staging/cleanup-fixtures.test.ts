import { describe, it, expect, vi } from 'vitest'
import {
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
   * resolves to an array of `rowCount` stub objects.
   *
   * We collect `returningSpies` so tests can assert call count and order.
   */
  function makeStaging(rowCountPerTable: number) {
    const returningSpies: ReturnType<typeof vi.fn>[] = []

    const staging = {
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

  it('issues one delete per table (6 total)', async () => {
    const { staging, returningSpies } = makeStaging(2)
    await cleanupFixtures({ staging: staging as any, fixtureUserIds })
    expect(returningSpies).toHaveLength(6)
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
    expect(Object.keys(result.deleted)).toHaveLength(6)
    for (const count of Object.values(result.deleted)) {
      expect(count).toBe(3)
    }
  })

  it('result includes all six expected table keys', async () => {
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
  })

  it('deletes in child-before-parent order', async () => {
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
    ])

    const staging = {
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
      'submissionConfirms',
      'priceSubmissions',
      'feedback',
      'userEvents',
      'notifications',
      'userProfiles',
    ])
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
})
