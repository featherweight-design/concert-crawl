'use client';

// The one column the three My shows tabs share, with the sub-tab bar in it.
//
// Mounted by the `(my-shows)` route group's layout, so the tab bar persists
// across Watching, Concerts and Artists instead of each route drawing its own
// copy. It used to remount on every switch, inside three different columns
// (880, 880 widening to 960 at lg, and 940 with 30px gutters and a 28px top),
// so the row jumped sideways and down each time a tab was tapped. Now the
// column and the row are the same element on all three routes and their
// loading fallbacks, and only the content below the bar changes.

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { MyShowsTabs, type MyShowsTab } from './MyShowsTabs';

/** The shared column. Concerts' rail needs the 960 at lg, so all three take it. */
export const MY_SHOWS_COLUMN_CLASS =
  'mx-auto flex w-full max-w-[880px] flex-1 flex-col px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8 lg:max-w-[960px]';

const TAB_FOR_PREFIX: readonly (readonly [string, MyShowsTab])[] = [
  ['/watching', 'watching'],
  ['/history', 'history'],
  ['/following', 'artists'],
];

const matchTab = (pathname: string | null) =>
  TAB_FOR_PREFIX.find(
    ([prefix]) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

export const myShowsTabFor = (pathname: string | null): MyShowsTab =>
  matchTab(pathname)?.[1] ?? 'watching';

/** One of the three My shows tabs (Watching, Concerts, Artists). */
export const isMyShowsPath = (pathname: string | null): boolean =>
  matchTab(pathname) !== undefined;

// useLayoutEffect warns during server rendering; the count only matters in
// the browser.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type SetArtistCount = (count: number | undefined) => void;

const ArtistCountContext = createContext<SetArtistCount | null>(null);

/**
 * The Artists route hands its follow count up to the shared tab bar, which
 * draws it on the active Artists tab. A no-op outside the shell.
 */
export const useMyShowsArtistCount = (count: number | undefined) => {
  const setCount = useContext(ArtistCountContext);
  // Layout, not passive: the count lands before the first paint of the
  // Artists tab, so the label never paints once without it and then widens.
  useIsomorphicLayoutEffect(() => {
    setCount?.(count);
    return () => setCount?.(undefined);
  }, [setCount, count]);
};

interface MyShowsShellProps {
  signedIn: boolean;
  children: ReactNode;
}

export const MyShowsShell = ({ signedIn, children }: MyShowsShellProps) => {
  const pathname = usePathname();
  const [artistCount, setArtistCount] = useState<number | undefined>();
  const active = myShowsTabFor(pathname);
  // Signed-out Watching is a teaching state with no tabs, as before. The two
  // protected tabs keep the bar without a token: on Artists it is the way back
  // out of the error a missing token renders there.
  const showTabs = signedIn || active !== 'watching';
  return (
    <ArtistCountContext.Provider value={setArtistCount}>
      <div data-testid="my-shows-shell" className={MY_SHOWS_COLUMN_CLASS}>
        {showTabs && (
          <MyShowsTabs
            active={active}
            {...(artistCount === undefined ? {} : { artistCount })}
          />
        )}
        {children}
      </div>
    </ArtistCountContext.Provider>
  );
};
