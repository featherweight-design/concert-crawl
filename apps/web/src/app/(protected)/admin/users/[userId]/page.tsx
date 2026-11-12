import { redirect } from 'next/navigation';
import { personHref } from '@/components/admin/people/people-rules';

interface PageProps {
  params: Promise<{ userId: string }>;
}

/** The person page moved to People (5a); old links land on it. */
export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  redirect(personHref(userId));
}
