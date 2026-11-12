'use client';

// The signed-in person's own share code (GET /v1/me/invite). The first read
// makes it, every later one returns it, so this is cached for the session: the
// code never changes, and only the joined strip moves.
//
// ⚠ Gated by the CALLER on the launch mode. Open mode has no code and must
// never reach the API, so a component passes `enabled: false` there rather than
// this hook deciding.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { AVATAR_COLORS } from '@concert-crawl/types';
import type { AvatarColor, MeInviteResponse } from '@concert-crawl/types';
import { apiClient, ApiError } from '@/lib/api';

// Scoped by userId for the same reason as notificationsQueryKey: the app-level
// QueryClient outlives a sign-in session, and one account's code must never
// serve another's.
export const meInviteQueryKey = (userId: string | null | undefined) =>
  ['me-invite', userId ?? null] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** A face colour the avatar can draw, or null for anything else. */
export const asAvatarColor = (value: unknown): AvatarColor | null =>
  AVATAR_COLORS.find((color) => color === value) ?? null;

/**
 * Reads the response at the boundary. Hand-rolled rather than Zod for the same
 * reason `lib/notifications` is: a validator in a client bundle costs every
 * page load. Anything that does not match is a failure, not a partial code.
 */
export const parseMeInvite = (body: unknown): MeInviteResponse | null => {
  if (!isRecord(body)) return null;
  const { code, revoked, joined } = body;
  if (typeof code !== 'string' || code === '') return null;
  if (typeof revoked !== 'boolean') return null;
  if (!isRecord(joined)) return null;
  const { count, faces } = joined;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    return null;
  }
  if (!Array.isArray(faces)) return null;
  const parsed: MeInviteResponse['joined']['faces'] = [];
  for (const face of faces) {
    if (!isRecord(face)) return null;
    const { handle } = face;
    if (handle !== null && typeof handle !== 'string') return null;
    parsed.push({
      handle,
      avatarColor: asAvatarColor(face['avatarColor']),
      avatarSecondColor: asAvatarColor(face['avatarSecondColor']),
    });
  }
  return { code, revoked, joined: { count, faces: parsed } };
};

export function useMeInvite(enabled: boolean) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: meInviteQueryKey(userId),
    queryFn: async (): Promise<MeInviteResponse> => {
      const token = await getToken();
      // Throw rather than resolve empty: a token blip must show the retry, not
      // cache a code that was never read.
      if (!token)
        throw new Error('Auth token unavailable while fetching invite');
      const body = await apiClient.get<unknown>('/v1/me/invite', token);
      const invite = parseMeInvite(body);
      if (invite === null)
        throw new ApiError(502, 'Unreadable invite response');
      return invite;
    },
    enabled: enabled && !!isSignedIn && !!userId,
    // The code is for good, so it is not refetched on a timer; a minute keeps
    // the joined strip honest across reopenings.
    staleTime: 60 * 1000,
    retry: 1,
  });
}
