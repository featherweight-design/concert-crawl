'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { IdentityArt } from '../identity-art/IdentityArt';
import { SkeletonBlock } from '../skeleton/SkeletonBlock';

type IdentityScale = 'hero' | 'tile' | 'micro';

interface EventImageProps {
  src: string | null;
  /**
   * The headliner's portrait, tried when `src` is absent or fails to load.
   * The order lives here rather than in each caller so every event surface
   * resolves identically.
   */
  artistPhotoUrl?: string | null;
  alt: string;
  artist?: string;
  identityScale?: IdentityScale;
  className?: string;
  fill?: boolean;
  sizes?: string;
}

export function EventImage({
  src,
  artistPhotoUrl,
  alt,
  artist,
  identityScale = 'tile',
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  const sources = [src, artistPhotoUrl].filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );
  const key = sources.join('\u0000');

  // Keyed by the source list, not just by an index. An instance React reuses
  // across events — a filtered or paginated list re-rendering the same
  // position — otherwise carries its failures onto URLs that were never tried.
  // A stale entry is ignored rather than cleared in an effect, so the new
  // event never renders a frame of the previous one's fallback.
  const [failure, setFailure] = useState({ key, attempt: 0 });
  const attempt = failure.key === key ? failure.attempt : 0;
  const active = sources[attempt] ?? null;

  // A load error walks to the next source rather than to IdentityArt: a venue
  // URL that 404s should still try the artist photo before we give up on real
  // imagery.
  const onError = () => setFailure({ key, attempt: attempt + 1 });

  // Until the active source paints, the tile shows the skeleton block rather
  // than an empty pale box (B+ loading state). Keyed by the URL, like the
  // failure state, so a reused instance never inherits a loaded flag from an
  // earlier image. An error still walks the chain above, so the identity
  // fallback is untouched.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = active !== null && loadedSrc === active;
  const onLoad = () => setLoadedSrc(active);
  // A server-rendered image can settle before hydration attaches `onLoad` and
  // `onError`, and then neither event reaches React. The ref reads the settled
  // state instead: a painted image drops the skeleton, and a broken one
  // (complete with no pixels) walks the chain exactly as `onError` would, so
  // neither case strands the skeleton or skips the fallback.
  // A zero width is not proof of a failure: an SVG with no intrinsic size
  // loads with naturalWidth 0 in Firefox. `decode()` settles the question: it
  // rejects only for an image that cannot be shown. Memoized on what it reads,
  // so an unrelated re-render does not re-attach the ref and re-run the check.
  const catchCompleted = useCallback(
    (img: HTMLImageElement | null) => {
      if (img === null || !img.complete || loadedSrc === active) return;
      // A decode can settle after the chain has moved on, or after the
      // instance took a new source list. Only advance from the attempt this
      // check was made for, so a late rejection never rewinds the chain.
      const fail = () =>
        setFailure((prev) =>
          prev.key === key && prev.attempt === attempt
            ? { key, attempt: attempt + 1 }
            : prev,
        );
      if (img.naturalWidth > 0) {
        setLoadedSrc(active);
        return;
      }
      if (typeof img.decode !== 'function') {
        fail();
        return;
      }
      img.decode().then(() => setLoadedSrc(active), fail);
    },
    [active, attempt, key, loadedSrc],
  );

  if (active === null) {
    return (
      <IdentityArt
        name={artist ?? alt}
        kind="artist"
        scale={identityScale}
        aria-label={alt}
        {...(className !== undefined && { className })}
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fill ? (
        <Image
          key={active}
          src={active}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          loading="lazy"
          ref={catchCompleted}
          onLoad={onLoad}
          onError={onError}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={active}
          src={active}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          ref={catchCompleted}
          onLoad={onLoad}
          onError={onError}
        />
      )}
      {!loaded && (
        <span
          data-testid="event-image-skeleton"
          className="pointer-events-none absolute inset-0"
        >
          <SkeletonBlock height="100%" radius={0} />
        </span>
      )}
      {/* image-tint overlay — blends hotlinked images into active theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
        aria-hidden
      />
    </div>
  );
}
