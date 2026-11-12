// Browse's one shelf slot (the follow shelf, or the Spotify taste shelf when
// the follow seed is unknown) only exists in the list view, and the crew lens
// replaces that list wholesale: a shelf above someone else's feed is a non
// sequitur. The page and its loading fallback both read this, so the skeleton
// never reserves a slot the page will not fill.

type BrowseView = 'list' | 'cal';

/** The view a Browse URL asks for. Anything but `cal` is the list. */
export const browseViewFromParam = (value: unknown): BrowseView =>
  value === 'cal' ? 'cal' : 'list';

export const isShelfSlotOpen = ({
  view,
  lensActive,
}: {
  view: BrowseView;
  lensActive: boolean;
}): boolean => view === 'list' && !lensActive;

/**
 * The loading fallback's read of the same rule, from the URL alone. It cannot
 * resolve the crew, so any `crew` param counts as a lens: a stale crew link
 * draws one paint without the shelf ghost, which is the safe direction (no
 * ghost of a shelf that never comes).
 */
export const isShelfSlotOpenForParams = (
  params: Pick<URLSearchParams, 'get'>,
): boolean =>
  isShelfSlotOpen({
    view: browseViewFromParam(params.get('view')),
    lensActive: params.get('crew') !== null,
  });
