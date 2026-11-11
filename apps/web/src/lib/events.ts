import type { EventReport } from '@concert-crawl/types';
import { apiClient, publicApiClient } from './api';

export async function fetchEventReports(
  eventId: string,
  token?: string,
): Promise<EventReport[]> {
  if (token) {
    return apiClient.get<EventReport[]>(`/v1/events/${eventId}/reports`, token);
  }
  return publicApiClient.get<EventReport[]>(`/v1/events/${eventId}/reports`);
}

export async function confirmPriceSubmission(
  eventId: string,
  submissionId: string,
  method: 'same-vendor' | 'other-vendor' | 'box-office',
  token: string,
): Promise<{
  confirmed: boolean;
  submissionStatus: string;
  confirmsCount: number;
}> {
  return apiClient.post<{
    confirmed: boolean;
    submissionStatus: string;
    confirmsCount: number;
  }>(`/v1/events/${eventId}/price-submissions/${submissionId}/confirm`, token, {
    method,
  });
}

export async function fileEventReport(
  eventId: string,
  body: object,
  token: string,
): Promise<EventReport> {
  return apiClient.post<EventReport>(
    `/v1/events/${eventId}/reports`,
    token,
    body,
  );
}

export async function confirmEventReport(
  eventId: string,
  reportId: string,
  token: string,
  /**
   * How the confirmer knows; stored with the confirm (B+ A3). The one-tap
   * confirm on the pending sold-out card asks nothing, so it sends none.
   */
  method?: 'saw_same_source' | 'own_evidence' | 'heard_from_venue',
): Promise<{ confirmed: boolean; confirmsCount: number; resolved: boolean }> {
  return apiClient.post<{
    confirmed: boolean;
    confirmsCount: number;
    resolved: boolean;
  }>(
    `/v1/events/${eventId}/reports/${reportId}/confirm`,
    token,
    method ? { method } : {},
  );
}

export async function withdrawEventReport(
  eventId: string,
  reportId: string,
  token: string,
): Promise<void> {
  await apiClient.delete<void>(
    `/v1/events/${eventId}/reports/${reportId}`,
    token,
  );
}
