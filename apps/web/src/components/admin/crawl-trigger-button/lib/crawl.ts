import type { CrawlRun } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'

export const triggerVenueCrawl = async (
  venueId: string,
  token: string,
): Promise<{ crawlRunId: string }> =>
  apiClient.post<{ crawlRunId: string }>(
    `/v1/admin/crawl/${venueId}`,
    token,
    {},
  )

export const fetchCrawlRun = async (
  crawlRunId: string,
  token: string,
): Promise<CrawlRun> =>
  apiClient.get<CrawlRun>(`/v1/admin/crawl/runs/${crawlRunId}`, token)
