import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import { HistoryContent } from '@/components/consumer/history';

export const metadata = { title: 'Concerts — Concert Crawl' };

export default async function HistoryPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const data = await fetchHistory(token);

  return <HistoryContent initialData={data} />;
}
