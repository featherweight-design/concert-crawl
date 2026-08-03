import { describe, it, expect, beforeEach } from 'vitest'
import { notifications } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import { clearTables, seedNotification } from '../test/helpers/seed.js'
import { pruneNotifications } from './prune-notifications.js'
import { NOTIFICATION_RETENTION_DAYS } from './definitions/notification-windows.js'

const DAY_MS = 24 * 60 * 60 * 1000
const ancient = (): Date =>
  new Date(Date.now() - (NOTIFICATION_RETENTION_DAYS + 1) * DAY_MS)

describe('pruneNotifications', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('deletes user notifications older than the retention window', async () => {
    await seedNotification({
      userId: 'user_owner',
      type: 'user_notification',
      category: 'watch.cancelled',
      title: 'Geese at Bluebird Theater: cancelled.',
      body: "The show's off. Tap for refund details.",
      createdAt: ancient(),
    })
    const result = await pruneNotifications(testDb)
    expect(result.deleted).toBe(1)
    const remaining = await testDb.select().from(notifications)
    expect(remaining).toHaveLength(0)
  })

  it('retains in-window user notifications', async () => {
    await seedNotification({
      userId: 'user_owner',
      type: 'user_notification',
      category: 'spotify.new_show',
      title: 'Big Head Todd: new Denver date',
      body: 'Fillmore · Oct 12. Added to your Watching.',
      createdAt: new Date(Date.now() - DAY_MS),
    })
    const result = await pruneNotifications(testDb)
    expect(result.deleted).toBe(0)
    const remaining = await testDb.select().from(notifications)
    expect(remaining).toHaveLength(1)
  })

  it('retains admin_alert rows of any age', async () => {
    await seedNotification({ type: 'admin_alert', createdAt: ancient() })
    const result = await pruneNotifications(testDb)
    expect(result.deleted).toBe(0)
    const remaining = await testDb.select().from(notifications)
    expect(remaining).toHaveLength(1)
  })

  it('returns the deleted count across users', async () => {
    for (const userId of ['user_a', 'user_b', 'user_c']) {
      await seedNotification({
        userId,
        type: 'user_notification',
        category: 'watch.soldout',
        title: 'Geese at Bluebird Theater is sold out.',
        body: "Official waitlist may open closer to the date. We'll watch it.",
        createdAt: ancient(),
      })
    }
    await seedNotification({
      userId: 'user_a',
      type: 'user_notification',
      category: 'watch.soldout',
      title: 'kept',
      body: 'in window',
    })
    const result = await pruneNotifications(testDb)
    expect(result.deleted).toBe(3)
    const remaining = await testDb.select().from(notifications)
    expect(remaining).toHaveLength(1)
  })
})
