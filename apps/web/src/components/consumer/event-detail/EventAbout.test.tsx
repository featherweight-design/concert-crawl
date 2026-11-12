// @vitest-environment jsdom
// The signed-in events/[id] page is an async server component, so its About
// block is asserted through EventAbout, the component it renders.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EventAbout } from './EventAbout';

describe('EventAbout', () => {
  afterEach(cleanup);

  it('hides a "Canceled" description on a cancelled event', () => {
    render(<EventAbout description="Canceled" status="cancelled" />);
    expect(screen.queryByTestId('event-about')).toBeNull();
  });

  it('keeps "Canceled" when the status does not match', () => {
    render(<EventAbout description="Canceled" status="upcoming" />);
    expect(screen.getByTestId('event-about').textContent).toContain('Canceled');
  });

  it('keeps real text on a cancelled event', () => {
    render(
      <EventAbout description="Canceled due to illness." status="cancelled" />,
    );
    expect(screen.getByText('Canceled due to illness.')).toBeTruthy();
  });
});
