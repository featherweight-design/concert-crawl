// Public surface of the notification panel (#737 PR-B). The chrome PR mounts
// NotifBody inside the shipped user-menu shells; everything else is exported
// for tests and for future reuse.

export { NMono } from './NMono'
export { NotifTile } from './NotifTile'
export { NotifItem } from './NotifItem'
export { NotifDayDivider } from './NotifDayDivider'
export {
  NotifSkeletonRow,
  NotifLoading,
  NotifEmpty,
  NotifError,
} from './NotifStates'
export { NotifHeader } from './NotifHeader'
export { NotifBody } from './NotifBody'
export type { NotifPanelState } from './NotifBody'
export { NotifPip } from './NotifPip'
export { MenuNotifRow } from './MenuNotifRow'
export { InboxStrip } from './InboxStrip'
export { NotifMenuPanel, panelStateOf } from './NotifMenuPanel'
export { activateOnKey } from './lib/activate-keys'
export { NotifGlyph, GLYPH } from './glyphs'
export type { GlyphName } from './glyphs'
export {
  NOTIFICATIONS_COPY,
  NOTIFICATIONS_EMPTY_ACTION_HREF,
} from './definitions/copy'
export {
  CATEGORY_MAP,
  CATEGORY_FALLBACK,
  CATEGORY_KEYS,
  categoryFor,
} from './definitions/categories'
export type { CategoryPresentation } from './definitions/categories'
export {
  relTime,
  relTimeLong,
  dayKey,
  groupByDay,
  isUnread,
  itemLabel,
  unreadCount,
} from './lib/format-time'
export type { NotificationDayGroup } from './lib/format-time'
