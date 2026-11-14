'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PeopleTabs } from '../people/PeopleTabs';
import { codesApi } from './codes-api';

/**
 * The phone's People segment on the Posters page (`07/posters-mobile`), as
 * the People and Invite codes pages draw it. The Posters count is the page's
 * own list; People and Codes are fetched, and are niceties: the segment
 * links without them.
 */
export function PostersPhoneTabs({ posters }: { posters: number }) {
  const { getToken } = useAuth();
  const api = useMemo(() => codesApi(getToken), [getToken]);
  const [people, setPeople] = useState<number | null>(null);
  const [codes, setCodes] = useState<number | null>(null);

  useEffect(() => {
    api
      .peopleTotal()
      .then(setPeople)
      .catch(() => undefined);
    api
      .list()
      .then((rows) => setCodes(rows.length))
      .catch(() => undefined);
  }, [api]);

  return (
    <PeopleTabs active="posters" isPhone counts={{ people, codes, posters }} />
  );
}
