import type { UserNotificationCategory } from './notification-categories.js'

/**
 * How each category is handed to the push service.
 *
 * The defaults were doing real harm. `web-push` sends `Urgency: normal` with a
 * four-week TTL unless told otherwise, and normal urgency is the one thing an
 * Android push service is allowed to sit on: a NATIVE app has its own handler,
 * but web push has to WAKE THE BROWSER so the service worker can run
 * `showNotification` — our code, inside Brave or Chrome. A browser in a
 * restricted App Standby bucket does not get woken for a normal-urgency
 * message, so nothing is posted at all. Observed in production: a push
 * accepted by FCM at 03:03 that surfaced roughly seventeen hours later, when
 * the app was next opened.
 *
 * `high` fixes the wake. It does NOT have to mean "buzz the phone" — that is
 * what `silent` is for, and the two are deliberately separated below.
 */
export interface DeliveryPolicy {
  /** RFC 8030 urgency. `high` asks the push service to wake the device. */
  urgency: 'very-low' | 'low' | 'normal' | 'high'
  /** Seconds the push service may hold the message before dropping it. */
  ttlSeconds: number
  /**
   * Posts to the shade without sound or vibration. Carried in the PAYLOAD
   * rather than the request, because it is an argument to `showNotification`
   * in the service worker, not a property of the delivery.
   */
  silent: boolean
}

const HOUR = 60 * 60

/**
 * A show that is cancelled, postponed, back on sale or sold out is worth an
 * interruption, and is worthless once the doors have opened. Twelve hours is
 * the compromise: long enough to survive a phone that is off for a night,
 * short enough that nothing arrives about a show that already happened.
 */
const TIME_SENSITIVE: DeliveryPolicy = {
  urgency: 'high',
  ttlSeconds: 12 * HOUR,
  silent: false,
}

/**
 * The fan-out that writes these runs on the 3 AM crawl, so EVERY new-show
 * push goes out in the middle of the night. It still needs `high` — without
 * the wake it may not be posted at all — but it must never make a sound at
 * 3 AM, which is exactly the split `silent` exists for. A day of TTL: a new
 * date is worth knowing about tomorrow, not next month.
 */
const QUIET_NEWS: DeliveryPolicy = {
  urgency: 'high',
  ttlSeconds: 24 * HOUR,
  silent: true,
}

/** A price drop is neither urgent nor worth waking a device for. */
const LOW_STAKES: DeliveryPolicy = {
  urgency: 'normal',
  ttlSeconds: 24 * HOUR,
  silent: false,
}

const POLICIES: Record<UserNotificationCategory, DeliveryPolicy> = {
  'contest.resolved': LOW_STAKES,
  'contest.needs_info': LOW_STAKES,
  'watch.cancelled': TIME_SENSITIVE,
  'watch.postponed': TIME_SENSITIVE,
  'watch.soldout': TIME_SENSITIVE,
  'watch.backonsale': TIME_SENSITIVE,
  'watch.pricedrop': LOW_STAKES,
  'artist.new_show': QUIET_NEWS,
  'crew.going': LOW_STAKES,
  'crew.joined': LOW_STAKES,
  'crew.left': LOW_STAKES,
}

/**
 * Exhaustive over the category union, so a new category is a type error here
 * rather than a silent inheritance of the library defaults that caused this.
 */
export const deliveryPolicyFor = (
  category: UserNotificationCategory,
): DeliveryPolicy => POLICIES[category]
