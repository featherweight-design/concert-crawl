import { requireAdminUser } from '@/lib/auth';
import { PersonClient } from '@/components/admin/people/PersonClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

/**
 * 5a person. The page loads in the browser with the admin's token, so a role
 * change, Undo and Try again refresh it without a navigation.
 */
export default async function AdminPersonPage({ params }: PageProps) {
  await requireAdminUser();
  const { userId } = await params;
  // Keyed, so opening another person starts from a clean page: no revealed
  // email or late response carries over.
  return <PersonClient key={userId} userId={userId} />;
}
