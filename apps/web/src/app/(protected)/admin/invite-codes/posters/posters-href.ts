import type { PosterLook } from '@/components/admin/invite-codes/PosterSheet';

export interface PosterSelection {
  code: string | null;
  look: PosterLook;
  tabs: boolean;
}

/** The Posters tab's URL for a selection; defaults stay out of the query. */
export const postersHref = ({ code, look, tabs }: PosterSelection): string => {
  const query = new URLSearchParams();
  if (code) query.set('code', code);
  if (look === 'paper') query.set('look', 'paper');
  if (tabs) query.set('tabs', '1');
  const search = query.toString();
  return `/admin/invite-codes/posters${search ? `?${search}` : ''}`;
};

/** Reads `?look=paper` and `?tabs=1`; any other value is the default. */
export const readSelection = (
  query: Record<string, string | string[] | undefined>,
): PosterSelection => ({
  code: typeof query.code === 'string' ? query.code : null,
  look: query.look === 'paper' ? 'paper' : 'night',
  tabs: query.tabs === '1',
});
