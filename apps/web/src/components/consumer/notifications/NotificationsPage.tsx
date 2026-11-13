'use client';

// The phone's Notifications page (`bp-s-notif_empty_m`, addendum-2 notification
// tabs): a full page with `‹ Menu` and the bottom nav in view, not a sheet.
// Desktop keeps the account-menu popover, so a wide visit hands over to it.
//
// `‹ Menu` returns to the account menu, open. It goes back in history when the
// menu's own row pushed this page, and to Browse on a deep link; either way the
// menu is asked to reopen where it lands (see menu-return.ts).

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  requestMenuReopen,
  takeCameFromMenu,
} from '@/components/consumer/user-menu/menu-return';
import { NotifMenuPanel } from './NotifMenuPanel';

const WIDE_QUERY = '(min-width: 640px)';
const BROWSE_HREF = '/events';

export const NotificationsPage = () => {
  const router = useRouter();
  // Read once on mount: the flag is a take, and a re-render must not lose it.
  const cameFromMenu = useRef<boolean | null>(null);
  if (cameFromMenu.current === null && typeof window !== 'undefined') {
    cameFromMenu.current = takeCameFromMenu();
  }

  useEffect(() => {
    if (!window.matchMedia(WIDE_QUERY).matches) return;
    requestMenuReopen();
    router.replace(BROWSE_HREF);
  }, [router]);

  const backToMenu = (): void => {
    requestMenuReopen();
    if (cameFromMenu.current === true) router.back();
    else router.push(BROWSE_HREF);
  };

  return (
    // Clears the fixed bottom nav, which stays visible on this page.
    <main className="pb-24">
      <NotifMenuPanel onBack={backToMenu} onNavigate={() => {}} />
    </main>
  );
};
