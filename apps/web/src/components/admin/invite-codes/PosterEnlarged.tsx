'use client';

import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useModalDialog } from '@/lib/hooks/useModalDialog';

const phoneCopy = ADMIN_COPY.inviteCodes.poster.phone;

interface PosterEnlargedProps {
  open: boolean;
  onClose: () => void;
  /** "Night · BETA-7K2M-Q9XD": the look and the code, on top. */
  title: string;
  onPrint: () => void;
  /** The fitted poster sheet. Print ignores this copy (see `poster.css`). */
  children: ReactNode;
}

/**
 * `32/poster-enlarged-m`: the real poster full screen over the page on solid
 * black, so the code and QR can be checked before a sheet goes on a wall. The
 * browser's own pinch zoom does the zooming.
 */
export function PosterEnlarged({
  open,
  onClose,
  title,
  onPrint,
  children,
}: PosterEnlargedProps) {
  const ref = useRef<HTMLDivElement>(null);
  useModalDialog(ref, open, onClose);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      data-testid="poster-enlarged"
      className="pt-enlarged"
    >
      <div className="pt-enlarged-top">
        <b>{title}</b>
        <span>{phoneCopy.paperSize}</span>
        <button
          type="button"
          className="pt-enlarged-x"
          aria-label={phoneCopy.close}
          onClick={onClose}
        >
          <X size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <div className="pt-enlarged-stage">
        {children}
        <p className="pt-enlarged-hint">{phoneCopy.pinchHint}</p>
      </div>
      <div className="pt-enlarged-bar">
        <button type="button" className="pt-enlarged-back" onClick={onClose}>
          {phoneCopy.back}
        </button>
        <button type="button" className="pt-enlarged-print" onClick={onPrint}>
          <Printer size={14} strokeWidth={1.8} aria-hidden />
          {phoneCopy.print}
        </button>
      </div>
    </div>,
    document.body,
  );
}
