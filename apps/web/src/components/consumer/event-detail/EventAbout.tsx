import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { aboutDescription } from './about-description';

const copy = CONSUMER_COPY.eventDetail;

interface EventAboutProps {
  description: string | null | undefined;
  status: string;
}

/** The event page's About block, shared by the signed-in and public pages. */
export const EventAbout = ({ description, status }: EventAboutProps) => {
  const text = aboutDescription(description, status);
  if (text === null) return null;
  return (
    <div className="mt-4" data-testid="event-about">
      <p
        className="mb-1.5 uppercase text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.06em',
        }}
      >
        {copy.aboutLabel}
      </p>
      <p
        className="text-[13px] leading-[1.55] text-fg-muted"
        style={{ textWrap: 'pretty' }}
      >
        {text}
      </p>
    </div>
  );
};
