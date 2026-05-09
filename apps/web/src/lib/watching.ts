import type { WatchingShow } from '@concert-crawl/types'
import { apiClient } from './api'

export async function fetchWatching(token: string): Promise<WatchingShow[]> {
  return apiClient.get<WatchingShow[]>('/v1/watching', token)
}
