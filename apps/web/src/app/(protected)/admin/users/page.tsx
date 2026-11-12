import { redirect } from 'next/navigation';

/**
 * The list moved to People (5a). The person page stays at
 * `/admin/users/<id>` until 5a part C moves it.
 */
export default function AdminUsersPage() {
  redirect('/admin/people');
}
