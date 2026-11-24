import type { CrawlRun, CrawlTrigger } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';

/**
 * Queues one venue's crawl. `force` re-reads a calendar page the crawler
 * would skip as unchanged (Overview's Re-crawl anyway); the body carries it
 * only when forced.
 */
export const triggerVenueCrawl = async (
  venueId: string,
  token: string,
  force = false,
): Promise<{ triggerId: string }> =>
  apiClient.post<{ triggerId: string }>(
    `/v1/admin/crawl/${venueId}`,
    token,
    force ? { force: true } : {},
  );

/**
 * Queues a test re-crawl of a crawl-paused venue: a real crawl whose run
 * never moves the pause or the failure streak.
 */
export const triggerVenueTrial = async (
  venueId: string,
  token: string,
): Promise<{ triggerId: string }> =>
  apiClient.post<{ triggerId: string }>(`/v1/admin/crawl/${venueId}`, token, {
    trial: true,
  });

/**
 * Queues a draft venue's test crawl: the real crawler at its real pace, which
 * keeps nothing it finds (admin 3c). The result lands on the trigger.
 */
export const triggerVenueTest = async (
  venueId: string,
  token: string,
): Promise<{ triggerId: string }> =>
  apiClient.post<{ triggerId: string }>(`/v1/admin/crawl/${venueId}`, token, {
    test: true,
  });

export const fetchCrawlTrigger = async (
  triggerId: string,
  token: string,
): Promise<CrawlTrigger> =>
  apiClient.get<CrawlTrigger>(`/v1/admin/crawl/triggers/${triggerId}`, token);

export const fetchCrawlRun = async (
  crawlRunId: string,
  token: string,
): Promise<CrawlRun> =>
  apiClient.get<CrawlRun>(`/v1/admin/crawl/runs/${crawlRunId}`, token);
