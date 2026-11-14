'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PeopleTabs } from '../people/PeopleTabs';
import { codesApi } from './codes-api';

/**
 * The phone's People segment on the Posters page (`07/posters-mobile`), as
 * the People and Invite codes pages draw it. Posters and Codes are counted
 * from the list the server page already loaded; only People is fetched, and
 * it is a nicety: the segment links without it. `postersLink` is the current
 * selection's URL, so the current segment keeps it.
 */
export function PostersPhoneTabs({
  posters,
  codes,
  postersLink,
}: {
  posters: number;
  codes: number;
  postersLink: string;
}) {
  const { getToken } = useAuth();
  const api = useMemo(() => codesApi(getToken), [getToken]);
  const [people, setPeople] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    api
      .peopleTotal()
      .then((total) => {
        if (live) setPeople(total);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api]);

  return (
    <PeopleTabs
      active="posters"
      isPhone
      counts={{ people, codes, posters }}
      postersLink={postersLink}
    />
  );
}
