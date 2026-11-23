import type { ArtistInfoImage } from '@concert-crawl/types';
import React from 'react';

import { ARTIST_COPY } from './definitions/copy';
import { safeHref } from './lib/safe-href';

export type CommonsImage = Extract<ArtistInfoImage, { source: 'commons' }>;

const linkStyle: React.CSSProperties = {
  color: 'var(--fg-muted)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  textDecorationColor: 'var(--border-strong)',
};

// The author and the source never shrink; only the author gives way.
const fixed: React.CSSProperties = { flex: 'none', whiteSpace: 'nowrap' };

/** A link when the URL is usable, else the same text, unlinked. */
const Part = ({
  href,
  children,
  style,
}: {
  href: string | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...linkStyle, ...style }}
    >
      {children}
    </a>
  ) : (
    <span style={{ color: 'var(--fg-muted)', ...style }}>{children}</span>
  );

/**
 * The credit under a Commons photo (addendum 12, `02/page-commons-360`):
 * `Photo: {author} · {licence} · Wikimedia Commons`, one line, mono 8.5px.
 * Each part links where it can: the licence to its deed, the source to the
 * file page. The API gives the author as plain text with no page of its own,
 * so the author is text. A null credit (public domain, CC0) drops the author;
 * a null licence link leaves the licence as text. If the line cannot fit, the
 * author ellipsises and nothing else does.
 *
 * Centred under the card and free to run wider than it: the card is 200px and
 * the line is not, so it is centred on the card's axis and capped to the
 * viewport rather than wrapped.
 */
export const PhotoCredit = ({ image }: { image: CommonsImage }) => {
  const { prefix, source, separator } = ARTIST_COPY.photoCredit;
  const dot = (
    <span aria-hidden="true" style={fixed}>
      {separator}
    </span>
  );
  return (
    <p
      data-testid="photo-credit"
      style={{
        margin: '14px 0 0',
        width: 'max-content',
        maxWidth: 'min(calc(100vw - 32px), 360px)',
        marginLeft: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: '0.5em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 8.5,
        lineHeight: 1.4,
        color: 'var(--fg-subtle)',
      }}
    >
      <span style={fixed}>{prefix}</span>
      {image.credit ? (
        <>
          <span
            data-testid="photo-credit-author"
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {image.credit}
          </span>
          {dot}
        </>
      ) : null}
      <Part href={safeHref(image.licenseUrl)} style={fixed}>
        {image.license}
      </Part>
      {dot}
      <Part href={safeHref(image.fileUrl)} style={fixed}>
        {source}
      </Part>
    </p>
  );
};
