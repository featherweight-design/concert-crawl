// Global not-found: any path no route matches. Without it Next renders its
// stock white "404 | This page could not be found." outside the theme.
//
// The boards draw the 404 inside the app's chrome (header, bottom nav, the
// page glow). The root layout already wraps this in Clerk, the query client and
// the theme, and the chrome components read the session themselves (they serve
// the public routes too), so the same pieces draw the signed-out variant when
// there is no session. Left out on purpose: the install slot, the launch
// animation and the post-signup seam, which belong to a page the app opened,
// not to a path that does not exist.
import { AppHeader } from '@/components/consumer/app-header';
import { BottomNav } from '@/components/consumer/bottom-nav';
import { NotFoundSurface } from '@/components/consumer/not-found-surface';
import { SearchPaletteProvider } from '@/components/consumer/search-palette/SearchPaletteProvider';
import { AccountMenuProvider } from '@/components/consumer/user-menu';
import { OfflinePill } from '@/components/pwa/OfflinePill';

const GlobalNotFound = () => (
  <div className="page-ambient flex min-h-screen flex-col overflow-x-clip">
    <AccountMenuProvider>
      <SearchPaletteProvider>
        <AppHeader rightSlots={<OfflinePill />} />
        <NotFoundSurface />
        <BottomNav />
      </SearchPaletteProvider>
    </AccountMenuProvider>
  </div>
);

export default GlobalNotFound;
