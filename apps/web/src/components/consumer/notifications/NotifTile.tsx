// The 28px category tile (#737). Ported from notifications-panel.jsx.
//
// Purely decorative: `aria-hidden`, because the category it encodes is already
// spelled out in the row's metadata line and in the row's accessible name.
// The ink lives here (a graphic, 3:1) and never on text.

import { categoryFor } from './definitions/categories';
import { NotifGlyph } from './glyphs';

export const NotifTile = ({
  category,
  read = false,
  size = 28,
}: {
  category: string;
  read?: boolean | undefined;
  size?: number | undefined;
}) => {
  const { ink, glyph } = categoryFor(category);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: ink,
        // B19a (`notif-shows-m`): a read row keeps its full-colour tile. The
        // glyph is the fastest scan cue in the list; read state is carried by
        // the row's title weight and the missing wash, not by the tile.
      }}
      data-read={read ? 'true' : undefined}
    >
      <NotifGlyph name={glyph} size={size * 0.57} />
    </span>
  );
};
