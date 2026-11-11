import type { QrPath } from '@/lib/poster/poster-rule';
import { POSTER_COPY } from '@/lib/poster/definitions/copy';

interface PosterSheetProps {
  /** What the QR encodes: the invite screen with the code pre-filled. */
  url: string;
  /** The same screen without a scheme, for typing by hand. */
  typedUrl: string;
  code: string;
  qr: QrPath;
}

/**
 * The printed invite poster: US Letter (816 x 1056 CSS px) in one ink, so it
 * prints on coloured paper. Every class it styles lives in `poster.css`
 * beside the page, and nothing here reads the app's theme, so the coming
 * redesign can restyle it without touching anything else.
 */
export function PosterSheet({ url, typedUrl, code, qr }: PosterSheetProps) {
  return (
    <div className="poster-sheet" data-testid="poster-sheet" data-url={url}>
      <div className="ps-in">
        <div className="ps-wordmark">
          {POSTER_COPY.wordmark}
          <span className="ps-dot">.</span>
        </div>
        <p className="ps-kicker">{POSTER_COPY.kicker}</p>
        <h2 className="ps-headline">{POSTER_COPY.headline}</h2>
        <p className="ps-sub">{POSTER_COPY.sub}</p>

        <div className="ps-mid">
          <svg
            className="ps-qr"
            role="img"
            aria-label={POSTER_COPY.qrLabel(code)}
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            shapeRendering="crispEdges"
          >
            <path d={qr.path} />
          </svg>
          <p className="ps-scan">{POSTER_COPY.scan}</p>
        </div>

        <div className="ps-foot">
          <div className="ps-code">
            <small>{POSTER_COPY.codeLabel}</small>
            <b data-testid="poster-code">{code}</b>
          </div>
          <div className="ps-typed">
            <small>{POSTER_COPY.typed}</small>
            <b data-testid="poster-typed-url">{typedUrl}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
