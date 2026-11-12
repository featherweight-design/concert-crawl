import { splitVenueName } from './split-venue-name';

interface VenueNameProps {
  name: string;
}

/**
 * A venue's name with its distinctive words in the signal-to-accent gradient
 * (`.venue-name-gradient` in globals.css carries the light-theme variant).
 * A name with nothing distinctive renders plain.
 */
export function VenueName({ name }: VenueNameProps) {
  const parts = splitVenueName(name);
  if (parts === null) return <>{name}</>;
  return (
    <>
      {parts.before}
      <span data-venue-name-gradient className="venue-name-gradient">
        {parts.highlight}
      </span>
      {parts.after}
    </>
  );
}
