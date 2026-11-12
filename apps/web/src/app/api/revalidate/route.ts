import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Only paths we actually serve from the ISR cache may be revalidated. An
// arbitrary caller-supplied path must never reach `revalidatePath` — the token
// holder is trusted, but an allowlist keeps a leaked token from being used to
// stampede regeneration across the whole app.
const REVALIDATABLE_PATHS = ['/'] as const;

type RevalidatablePath = (typeof REVALIDATABLE_PATHS)[number];

// Single-path body today. Shaped as an object (not a bare string) so a
// `paths: string[]` variant can be added later without a breaking change.
// Hand-written rather than Zod: apps/web carries no Zod dependency, and one
// allowlisted string field does not justify adding one.
// Tags the same allowlist rule covers: only the catalog cache's own tag.
const REVALIDATABLE_TAGS = ['catalog'] as const;

type RevalidatableTag = (typeof REVALIDATABLE_TAGS)[number];

const readRevalidatableTags = (body: unknown): RevalidatableTag[] => {
  if (typeof body !== 'object' || body === null || !('tags' in body)) {
    return [];
  }
  const { tags } = body;
  if (!Array.isArray(tags)) return [];
  return REVALIDATABLE_TAGS.filter((allowed) => tags.includes(allowed));
};

const readRevalidatablePath = (body: unknown): RevalidatablePath | null => {
  if (typeof body !== 'object' || body === null || !('path' in body)) {
    return null;
  }
  const { path } = body;
  return REVALIDATABLE_PATHS.find((allowed) => allowed === path) ?? null;
};

const tokensMatch = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Comparing the provided token against itself keeps the work constant, then
  // the length check decides the result.
  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(providedBuf, providedBuf);
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
};

export async function POST(request: NextRequest) {
  const secret = process.env['REVALIDATE_SECRET'];
  // Fail closed: with no secret configured the endpoint is disabled, never open.
  if (!secret) {
    return new NextResponse(null, { status: 401 });
  }

  const token = request.headers.get('x-revalidate-token');
  if (!token || !tokensMatch(token, secret)) {
    return new NextResponse(null, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (err) {
    console.warn('[api/revalidate] unparseable JSON body', { err });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const path = readRevalidatablePath(rawBody);
  const tags = readRevalidatableTags(rawBody);
  // A body names a path, tags, or both; naming neither allowlisted is a 400.
  if (path === null && tags.length === 0) {
    return NextResponse.json(
      {
        error: 'Invalid body: name a revalidatable path or a revalidatable tag',
      },
      { status: 400 },
    );
  }

  if (path !== null) revalidatePath(path);
  // `{ expire: 0 }`: the next read refetches, rather than serving the stale
  // entry once while it revalidates (the crawler wants the new shows now).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return new NextResponse(null, { status: 204 });
}
