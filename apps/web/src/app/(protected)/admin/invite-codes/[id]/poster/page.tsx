import { redirect } from 'next/navigation';
import { postersHref, readSelection } from '../../posters/posters-href';

/**
 * `/admin/invite-codes/[id]/poster`, the old one-code print page. The Posters
 * tab prints the same sheet, so this only forwards there with the code, look
 * and tabs kept.
 */
export default async function InviteCodePosterRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  redirect(postersHref({ ...readSelection(query), code: id }));
}
