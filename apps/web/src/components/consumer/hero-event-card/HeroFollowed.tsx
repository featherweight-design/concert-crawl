'use client';

// The hero card stays a server component, so the first thing Browse paints
// carries no follows code. These two islands are the only parts that read the
// viewer's follows (Followed highlight, #750 addendum-8 section 6); both still
// render on the server, with the empty set, and fill in once the follows load.

import type { ComponentProps } from 'react';
import { EventTitleBlock } from '../event-title-block';
import { EVENT_ROW_COPY } from '../event-row/definitions/copy';
import { FollowedDisc } from '../followed-mark/FollowedDisc';
import { followedOnBill } from '@/lib/followed-on-bill';
import { useFollowedArtistNames } from '@/lib/queries/use-followed-artist-names';

type TitleBlockProps = Omit<
  ComponentProps<typeof EventTitleBlock>,
  'followedNames'
>;

/** 20px on the spotlight art; the TONIGHT star is untouched. */
export function HeroFollowedDisc({
  headliner,
  supportingArtists,
}: Pick<TitleBlockProps, 'headliner' | 'supportingArtists'>) {
  const followedNames = followedOnBill(
    useFollowedArtistNames(),
    headliner,
    supportingArtists ?? [],
  );
  if (followedNames.length === 0) return null;
  return (
    <FollowedDisc
      size={20}
      ring={2.5}
      className="absolute"
      style={{ right: -4, bottom: -4 }}
    />
  );
}

/** The title block with the signal name, plus the spoken "you follow" line. */
export function HeroTitleBlock(props: TitleBlockProps) {
  const followedNames = followedOnBill(
    useFollowedArtistNames(),
    props.headliner,
    props.supportingArtists ?? [],
  );
  return (
    <>
      <EventTitleBlock {...props} followedNames={followedNames} />
      {followedNames.length > 0 && (
        <span className="sr-only">
          {EVENT_ROW_COPY.a11y.youFollow(followedNames)}
        </span>
      )}
    </>
  );
}
