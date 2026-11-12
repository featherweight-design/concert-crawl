import { redirect } from 'next/navigation';

/** The list moved to People (5a); old links and bookmarks land there. */
export default function AdminUsersPage() {
  redirect('/admin/people');
}
