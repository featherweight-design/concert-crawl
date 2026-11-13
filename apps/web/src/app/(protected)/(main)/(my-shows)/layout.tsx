// My shows: Watching, Concerts and Artists. The sub-tab bar lives here, not in
// the three pages, so it stays mounted and in one place when a tab is tapped
// (see MyShowsShell).

import { auth } from '@/lib/auth';
import { MyShowsShell } from '@/components/consumer/history/MyShowsShell';

export default async function MyShowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = await auth();
  const token = await getToken();

  return <MyShowsShell signedIn={token !== null}>{children}</MyShowsShell>;
}
