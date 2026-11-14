import { requireAdminUser } from '@/lib/auth';
import { PeopleClient } from '@/components/admin/people/PeopleClient';

/**
 * 5a People. The list loads in the browser with the admin's token, so search,
 * the chips and Try again refresh it without a navigation. `?code=<code id>`
 * (a code's "See all N") lists only the people who joined with it.
 */
export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const code = (await searchParams)?.['code'];
  return <PeopleClient code={typeof code === 'string' && code ? code : null} />;
}
