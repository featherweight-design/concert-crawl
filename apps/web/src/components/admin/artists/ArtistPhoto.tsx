import { PHOTO_PLACEHOLDER } from './artist-styles';

/**
 * A round artist photo. The plain tile sits behind it, so a photo that fails
 * to load still draws the tile rather than a hole.
 */
export const ArtistPhoto = ({
  url,
  size,
}: {
  url: string | null;
  size: 34 | 44;
}) => (
  <span
    aria-hidden
    style={{
      display: 'block',
      width: size,
      height: size,
      flex: 'none',
      borderRadius: '50%',
      overflow: 'hidden',
      background: PHOTO_PLACEHOLDER,
    }}
  >
    {url && (
      // A Spotify CDN photo at row size; next/image would proxy it for nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        style={{ display: 'block', objectFit: 'cover' }}
      />
    )}
  </span>
);
