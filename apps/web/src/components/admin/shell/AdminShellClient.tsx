'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar, SIDEBAR_WIDTH } from './AdminSidebar';
import { AdminPhoneHeader, AdminTopbar } from './AdminTopbar';
import { MobileBottomBar, TAB_BAR_HEIGHT } from './MobileBottomBar';
import { MOBILE_BREAKPOINT, type AdminBadgeCounts } from './nav';
import type { AdminShellUser } from './AdminAvatar';

interface AdminShellClientProps {
  badgeCounts: AdminBadgeCounts;
  user: AdminShellUser;
  children: React.ReactNode;
}

const useIsPhone = (): boolean | null => {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isPhone;
};

const PhoneShell = ({ badgeCounts, user, children }: AdminShellClientProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <main
      style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        paddingBottom: `calc(${TAB_BAR_HEIGHT + 20}px + env(safe-area-inset-bottom))`,
      }}
    >
      <AdminPhoneHeader user={user} />
      <div style={{ padding: '0 16px' }}>{children}</div>
    </main>
    <MobileBottomBar badgeCounts={badgeCounts} />
  </div>
);

const DesktopShell = ({
  badgeCounts,
  user,
  children,
}: AdminShellClientProps) => (
  <div style={{ display: 'flex', height: '100%', width: '100%' }}>
    <AdminSidebar badgeCounts={badgeCounts} user={user} />
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <AdminTopbar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {children}
      </main>
    </div>
  </div>
);

export const AdminShellClient = (props: AdminShellClientProps) => {
  const isPhone = useIsPhone();

  // Before the media query resolves, reserve the sidebar's space only where
  // the sidebar will appear (CSS knows the width before JS does), and keep the
  // page scrollable like the resolved shells.
  if (isPhone === null) {
    return (
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <div
          className="admin-shell-rail-placeholder"
          style={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {props.children}
        </main>
      </div>
    );
  }

  return (
    <div
      data-testid="admin-shell"
      style={{ display: 'flex', height: '100%', width: '100%' }}
    >
      {isPhone ? <PhoneShell {...props} /> : <DesktopShell {...props} />}
    </div>
  );
};
