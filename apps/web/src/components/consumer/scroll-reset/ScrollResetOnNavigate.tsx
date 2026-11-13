'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isMyShowsPath } from '@/components/consumer/history/MyShowsShell';

// useLayoutEffect warns during server rendering; the effect only ever has work
// to do in the browser.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Puts the window back at the top when the pathname changes.
 *
 * Next's own reset is not enough here: after a navigation it skips the scroll
 * whenever the new page's top edge is already inside the viewport. Under this
 * shell the page starts below the header, so from a part-scrolled page the new
 * page's top is often still on screen (or the browser has clamped the old
 * offset to the new, shorter document) and Next leaves the window where it
 * was, landing the user part way down.
 *
 * Only a pathname change counts: a query-string change (filters, the week
 * strip, See all) keeps its place, as those links ask for. Back and Forward
 * are left to the browser's own restoration, and a `#hash` target to Next.
 */
export function ScrollResetOnNavigate(): null {
  const pathname = usePathname();
  const previous = useRef(pathname);
  // The pathname a Back/Forward landed on. A path rather than a boolean, so a
  // query-only Back (which never changes the pathname) cannot leave a stale
  // flag that swallows the next real navigation's reset.
  const historyPath = useRef<string | null>(null);

  useEffect(() => {
    // popstate fires before the router renders the restored route, and the
    // location already holds the restored URL.
    const onPopState = () => {
      historyPath.current = window.location.pathname;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (previous.current === pathname) return;
    const from = previous.current;
    previous.current = pathname;
    // A tap between My shows tabs swaps only the content under a tab row that
    // stays mounted (MyShowsShell), so it keeps its place like a filter does.
    if (isMyShowsPath(from) && isMyShowsPath(pathname)) {
      historyPath.current = null;
      return;
    }
    const restoring = historyPath.current === pathname;
    historyPath.current = null;
    if (restoring) return;
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
