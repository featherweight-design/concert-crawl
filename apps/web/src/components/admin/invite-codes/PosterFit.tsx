'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** The sheet's own width in CSS px (US Letter at 96 dpi). */
const SHEET_WIDTH = 816;
/** Never preview larger than this, so the whole page fits a laptop screen. */
const MAX_SCALE = 0.75;

/**
 * Scales the 816 px sheet to the room it has on screen. `poster.css` paints a
 * first guess (0.42 on a phone, 0.75 from 768 px); this refines it to fit the
 * mat exactly. Print ignores it: the sheet prints at 1:1.
 */
export function PosterFit({ children }: { children: ReactNode }) {
  const mat = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mat.current;
    if (!el) return;
    const fit = () => {
      const style = getComputedStyle(el);
      const room =
        el.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      if (room > 0)
        el.style.setProperty(
          '--poster-scale',
          String(Math.min(MAX_SCALE, room / SHEET_WIDTH)),
        );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={mat} className="poster-mat">
      <div className="poster-fit">{children}</div>
    </div>
  );
}
