import type { ReactNode } from 'react';

interface PanelHeadingProps {
  title: ReactNode;
  sub: ReactNode;
  /** Set when a section labels itself with this heading. */
  id?: string;
}

/** The desktop sub-page heading: a big title over its one-line subtitle. */
export const PanelHeading = ({ title, sub, id }: PanelHeadingProps) => (
  <div>
    <h2
      id={id}
      className="text-[30px] font-black leading-[1.1] tracking-[-0.03em] text-fg"
    >
      {title}
    </h2>
    <p className="mt-1.5 text-[14px] text-fg-muted">{sub}</p>
  </div>
);
