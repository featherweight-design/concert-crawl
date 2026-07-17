import type { CrawlRun, CrawlTrigger } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'

export const triggerVenueCrawl = async (
  venueId: string,
  token: string,
): Promise<{ triggerId: string }> =>
  apiClient.post<{ triggerId: string }>(`/v1/admin/crawl/${venueId}`, token, {})

export const fetchCrawlTrigger = async (
  triggerId: string,
  token: string,
): Promise<CrawlTrigger> =>
  apiClient.get<CrawlTrigger>(`/v1/admin/crawl/triggers/${triggerId}`, token)

export const fetchCrawlRun = async (
  crawlRunId: string,
  token: string,
): Promise<CrawlRun> =>
  apiClient.get<CrawlRun>(`/v1/admin/crawl/runs/${crawlRunId}`, token)
