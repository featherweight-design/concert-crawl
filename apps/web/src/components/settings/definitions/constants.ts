import type { AvatarColor } from '@concert-crawl/types'

export const HANDLE_REGEX = /^[a-z0-9_]+$/

export const RESERVED_HANDLES = new Set([
  'admin',
  'support',
  'help',
  'settings',
  'me',
  'api',
  'auth',
  'staff',
  'crew',
  'artist',
  'fan',
  'null',
  'anonymous',
  'everyone',
  'all',
  'new',
  'create',
  'edit',
  'delete',
  'error',
  'login',
  'logout',
  'signup',
  'signin',
  'index',
  'home',
  'about',
  'contact',
  'concertcrawl',
  'denver',
  'mod',
  'moderator',
  'system',
  'bot',
])

export const AVATAR_COLORS: AvatarColor[] = [
  'signal',
  'accent',
  'success',
  'warning',
]

export const SUBMISSION_CAP_MOBILE = 3
