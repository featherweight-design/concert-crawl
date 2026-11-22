import { auth } from '@/lib/auth';
import { fetchMe, fetchMySubmissions } from '@/lib/users';
import { SettingsRouteDesktop } from '@/components/settings/SettingsRouteDesktop';
import { SubmissionsPage } from '@/components/settings/SubmissionsPage';
import { ThemeSync } from '@/components/settings/ThemeSync';

export const metadata = { title: 'Submitted prices — Concert Crawl' };

// Mobile gets the list on its own page. Desktop has no such page: it is a
// panel of the Settings shell, so the shell opens on it.
export default async function SubmittedPricesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const [profile, submissions] = await Promise.all([
    fetchMe(token),
    fetchMySubmissions(token),
  ]);

  return (
    <>
      <ThemeSync serverTheme={profile.theme} />
      <div className="mx-auto w-full max-w-[640px] lg:hidden">
        <SubmissionsPage profile={profile} submissions={submissions} />
      </div>
      <div className="hidden lg:block">
        <SettingsRouteDesktop
          profile={profile}
          submissions={submissions}
          initialSection="submissions"
        />
      </div>
    </>
  );
}
