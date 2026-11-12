// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { EventImage } from '../EventImage';

afterEach(cleanup);

// The fallback is an inline SVG that also carries role="img", so these assert
// on the <img> element itself rather than the role.
const photo = (root: HTMLElement) => root.querySelector('img');

describe('<EventImage />', () => {
  it('falls back to identity art when the photo fails', () => {
    const { container } = render(
      <EventImage src="https://example.test/a.jpg" alt="Show A" />,
    );
    const img = photo(container);
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(photo(container)).toBeNull();
  });

  // React reuses an instance when a list re-renders the same position with a
  // different event, so a failure must not outlive the URL that caused it.
  it('retries when the photo url changes', () => {
    const { container, rerender } = render(
      <EventImage src="https://example.test/a.jpg" alt="Show A" />,
    );
    fireEvent.error(photo(container)!);
    expect(photo(container)).toBeNull();

    rerender(<EventImage src="https://example.test/b.jpg" alt="Show B" />);

    expect(photo(container)?.getAttribute('src')).toBe(
      'https://example.test/b.jpg',
    );
  });

  const venue = 'https://example.test/venue.jpg';
  const portrait = 'https://example.test/artist.jpg';
  const srcOf = (root: HTMLElement) => photo(root)?.getAttribute('src') ?? null;

  it('prefers the event image over the artist photo', () => {
    const { container } = render(
      <EventImage src={venue} artistPhotoUrl={portrait} alt="Show A" />,
    );
    expect(srcOf(container)).toBe(venue);
  });

  it('uses the artist photo when there is no event image', () => {
    const { container } = render(
      <EventImage src={null} artistPhotoUrl={portrait} alt="Show A" />,
    );
    expect(srcOf(container)).toBe(portrait);
  });

  it('falls to identity art when neither source is present', () => {
    const { container } = render(
      <EventImage src={null} artistPhotoUrl={null} alt="Show A" />,
    );
    expect(photo(container)).toBeNull();
  });

  // A 404 on the venue image is the common case the chain exists for — it must
  // not skip past real imagery straight to the placeholder.
  it('walks from a failed event image to the artist photo, then identity art', () => {
    const { container } = render(
      <EventImage src={venue} artistPhotoUrl={portrait} alt="Show A" />,
    );
    fireEvent.error(photo(container)!);
    expect(srcOf(container)).toBe(portrait);

    fireEvent.error(photo(container)!);
    expect(photo(container)).toBeNull();
  });

  it('retries the whole chain when the event changes', () => {
    const { container, rerender } = render(
      <EventImage src={venue} artistPhotoUrl={portrait} alt="Show A" />,
    );
    fireEvent.error(photo(container)!);
    fireEvent.error(photo(container)!);
    expect(photo(container)).toBeNull();

    rerender(
      <EventImage
        src="https://example.test/b.jpg"
        artistPhotoUrl={portrait}
        alt="Show B"
      />,
    );

    expect(srcOf(container)).toBe('https://example.test/b.jpg');
  });

  // B+ loading state: an unloaded tile shows the skeleton block, never an
  // empty pale box.
  const skeleton = (root: HTMLElement) =>
    root.querySelector('[data-testid="event-image-skeleton"]');

  it('shows the skeleton until the photo loads', () => {
    const { container } = render(<EventImage src={venue} alt="Show A" />);
    expect(skeleton(container)).not.toBeNull();
    fireEvent.load(photo(container)!);
    expect(skeleton(container)).toBeNull();
  });

  it('brings the skeleton back for a new url on a reused instance', () => {
    const { container, rerender } = render(
      <EventImage src={venue} alt="Show A" />,
    );
    fireEvent.load(photo(container)!);
    expect(skeleton(container)).toBeNull();

    rerender(<EventImage src="https://example.test/b.jpg" alt="Show B" />);
    expect(skeleton(container)).not.toBeNull();
  });

  it('drops the skeleton for identity art once the chain runs out', () => {
    const { container } = render(<EventImage src={venue} alt="Show A" />);
    fireEvent.error(photo(container)!);
    expect(photo(container)).toBeNull();
    expect(skeleton(container)).toBeNull();
  });
});
