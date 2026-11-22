import type {
  AvatarColor,
  UserProfileResponse,
  UserSubmissionItem,
  HandleAvailabilityResponse,
} from '@concert-crawl/types';
import { z } from 'zod';
import type { ThemeName } from '@/theme/themes';
import { apiClient } from './api';

export async function fetchMe(token: string): Promise<UserProfileResponse> {
  return apiClient.get<UserProfileResponse>('/v1/users/me', token);
}

export async function patchMe(
  token: string,
  updates: {
    handle?: string | null;
    city?: string | null;
    avatarColor?: AvatarColor | null;
    /** The avatar pair's second colour; null keeps it solid. */
    avatarSecondColor?: AvatarColor | null;
    theme?: ThemeName;
  },
): Promise<void> {
  await apiClient.patch<void>('/v1/users/me', token, updates);
}

// The row's art fields, checked at the boundary. Each falls back to null on its
// own, so an API that predates them (the web and the API deploy separately) or a
// malformed value costs the row its picture, never the page.
const submissionArtSchema = z.object({
  imageUrl: z.string().nullable().catch(null),
  artistPhotoUrl: z.string().nullable().catch(null),
  genre: z.string().nullable().catch(null),
});

export async function fetchMySubmissions(
  token: string,
): Promise<UserSubmissionItem[]> {
  const rows = await apiClient.get<UserSubmissionItem[]>(
    '/v1/users/me/submissions',
    token,
  );
  return rows.map((row) => ({ ...row, ...submissionArtSchema.parse(row) }));
}

export async function checkHandleAvailability(
  token: string,
  handle: string,
): Promise<HandleAvailabilityResponse> {
  const encodedHandle = encodeURIComponent(handle);
  return apiClient.get<HandleAvailabilityResponse>(
    `/v1/users/handle-availability?handle=${encodedHandle}`,
    token,
  );
}

export async function deleteAccount(token: string): Promise<void> {
  await apiClient.delete<void>('/v1/users/me', token);
}
