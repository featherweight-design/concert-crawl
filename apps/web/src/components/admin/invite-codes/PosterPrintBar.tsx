'use client';

import Link from 'next/link';
import type { QrPath } from '@/lib/poster/poster-rule';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/** Pixels per QR module in the PNG: sharp at table-tent size. */
const PX_PER_MODULE = 24;

interface PosterPrintBarProps {
  label: string | null;
  code: string;
  seatsLeft: number;
  qr: QrPath;
}

const copy = ADMIN_COPY.inviteCodes.poster;

/**
 * The screen-only bar above the poster: back to the code list, the code and
 * its label, Download QR (a PNG drawn from the same path the sheet's QR is)
 * and Print. `poster.css` hides it in print.
 */
export function PosterPrintBar({
  label,
  code,
  seatsLeft,
  qr,
}: PosterPrintBarProps) {
  const download = () => {
    const canvas = document.createElement('canvas');
    canvas.width = qr.size * PX_PER_MODULE;
    canvas.height = qr.size * PX_PER_MODULE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // White ground, black modules; the quiet zone is already inside `size`.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(PX_PER_MODULE, PX_PER_MODULE);
    ctx.fillStyle = '#000000';
    ctx.fill(new Path2D(qr.path));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `${code}-qr.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }, 'image/png');
  };

  return (
    <div className="poster-bar" data-testid="poster-bar">
      <Link href="/admin/invite-codes" prefetch={false}>
        ‹ {copy.back}
      </Link>
      {label ? <b>{label}</b> : null}
      <span className="pb-code">{code}</span>
      <span className="pb-seats">{copy.seatsLeft(seatsLeft)}</span>
      <small>{copy.printHint}</small>
      <span className="pb-spacer" />
      <button type="button" className="pb-ghost" onClick={download}>
        {copy.downloadQr}
      </button>
      <button type="button" className="pb-solid" onClick={() => window.print()}>
        {copy.print}
      </button>
    </div>
  );
}
