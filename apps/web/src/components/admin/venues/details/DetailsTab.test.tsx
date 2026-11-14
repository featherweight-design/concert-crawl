// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

const mockUpdateVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { DetailsTab, type DetailsVenue } from './DetailsTab';

const COPY = ADMIN_COPY.venueDetails;
const FIELDS = COPY.fields;

let phone = false;
const matchMediaStub = (query: string): MediaQueryList => ({
  matches: phone,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

const venue: DetailsVenue = {
  id: 'venue-1',
  websiteUrl: 'https://www.ballarena.com/events',
  name: 'Ball Arena',
  slug: 'ball-arena',
  address: '1000 Chopper Cir, Denver, CO 80204',
  neighborhood: 'Central Platte Valley',
  lat: 39.7487,
  lng: -105.0077,
  venueType: 'Arena',
  capacity: 19500,
  about: 'Denver’s big indoor arena.',
  ticketVendor: 'ticketmaster',
  priceUrl: 'https://ballarena.com/tickets',
  contactEmail: 'booking@ballarena.com',
  city: 'Denver',
};

const input = (label: string): HTMLInputElement => {
  const el = screen.getByLabelText(label);
  if (!(el instanceof HTMLInputElement)) throw new Error(`${label}: no input`);
  return el;
};
const sentForm = (): FormData => {
  const formData = mockUpdateVenue.mock.calls.at(-1)?.[1];
  if (!(formData instanceof FormData)) throw new Error('No FormData sent');
  return formData;
};
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.save }));

describe('DetailsTab', () => {
  beforeEach(() => {
    phone = false;
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
    mockRefresh.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('draws the Venue, Tickets and Contact cards, with the venue’s values', () => {
    render(<DetailsTab venue={venue} />);
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'));
    expect(titles).toEqual([
      COPY.cards.venue,
      COPY.cards.tickets,
      COPY.cards.contact,
    ]);
    expect(input(FIELDS.name).value).toBe('Ball Arena');
    expect(input(FIELDS.mapPin.label).value).toBe('39.7487, −105.0077');
    expect(input(FIELDS.capacity.label).value).toBe('19,500');
    expect(input(FIELDS.link.label).value).toBe('ball-arena');
    expect(input(FIELDS.contactEmail.label).value).toBe(
      'booking@ballarena.com',
    );
    // Ruling b: the Website is Source's calendar page, read-only here.
    expect(input(FIELDS.website).value).toBe('ballarena.com');
    expect(input(FIELDS.website).readOnly).toBe(true);
    // Ruling h: the pin is entered by hand, never "Set from the address".
    expect(screen.getByText(FIELDS.mapPin.hint)).toBeTruthy();
    expect(screen.queryByText('Set from the address.')).toBeNull();
  });

  it('offers the six capacity types, and keeps a stored one outside them', () => {
    render(<DetailsTab venue={{ ...venue, venueType: 'Black box' }} />);
    const select = screen.getByLabelText(FIELDS.capacityType.label);
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual([
      FIELDS.capacityType.none,
      ...Object.values(COPY.capacityTypes),
      FIELDS.capacityType.current('Black box'),
    ]);
  });

  it('has no Save bar until something changes, then counts the changes', () => {
    render(<DetailsTab venue={venue} />);
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeTruthy();
    fireEvent.change(input(FIELDS.neighborhood), { target: { value: 'LoDo' } });
    expect(screen.getByText(COPY.saveBar.unsaved(2))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    expect(input(FIELDS.address).value).toBe(venue.address);
  });

  it('saves only the changed columns, then refreshes', async () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.mapPin.label), {
      target: { value: '39.75, -105' },
    });
    fireEvent.change(input(FIELDS.contactEmail.label), {
      target: { value: 'hello@ballarena.com' },
    });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(mockUpdateVenue.mock.calls[0]?.[0]).toBe('venue-1');
    expect([...sentForm().keys()]).toEqual(['lat', 'lng', 'contactEmail']);
    expect(sentForm().get('lat')).toBe('39.75');
    expect(sentForm().get('lng')).toBe('-105');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
  });

  it('a capacity type pick writes the setting’s name', async () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(screen.getByLabelText(FIELDS.capacityType.label), {
      target: { value: COPY.capacityTypes.theater },
    });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(sentForm().get('venueType')).toBe(COPY.capacityTypes.theater);
  });

  it('checks the fields before sending anything', () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.mapPin.label), { target: { value: '39.7' } });
    fireEvent.change(input(FIELDS.contactEmail.label), {
      target: { value: 'nope' },
    });
    save();
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    expect(screen.getByText(FIELDS.mapPin.invalid)).toBeTruthy();
    expect(screen.getByText(FIELDS.contactEmail.invalid)).toBeTruthy();
    expect(input(FIELDS.mapPin.label).getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('a slug refusal lands on Link and keeps the edit, with no Try again', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      field: 'slug',
      error: 'Slug already in use',
    });
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.link.label), { target: { value: 'gothic' } });
    save();
    await waitFor(() =>
      expect(input(FIELDS.link.label).getAttribute('aria-invalid')).toBe(
        'true',
      ),
    );
    expect(input(FIELDS.link.label).value).toBe('gothic');
    expect(screen.getByTestId('save-failed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a failed save keeps the edit and offers Try again', async () => {
    mockUpdateVenue.mockResolvedValueOnce({ success: false, error: 'Down.' });
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.getByText(COPY.failed.title)).toBeTruthy();
    expect(input(FIELDS.address).value).toBe('1 Main St');
    expect(screen.getByTestId('details-save-bar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(2));
    expect(sentForm().get('address')).toBe('1 Main St');
  });

  it('a thrown save keeps the edit too', async () => {
    mockUpdateVenue.mockRejectedValueOnce(new Error('network'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(input(FIELDS.address).value).toBe('1 Main St');
    spy.mockRestore();
  });

  it('Try again moves the attempt onto a newer row, never writing it back', async () => {
    mockUpdateVenue.mockResolvedValueOnce({ success: false, error: 'Down.' });
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());

    // Someone else's save lands before the retry.
    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(2));
    expect([...sentForm().keys()]).toEqual(['address']);
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(input(FIELDS.address).value).toBe('1 Main St');
  });

  it('a save lays its columns over a row that landed mid-save', async () => {
    let resolve: (value: { success: true }) => void = () => undefined;
    mockUpdateVenue.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));

    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    resolve({ success: true });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    // The baseline holds both: no edit is counted against the newer row.
    expect(screen.queryByTestId('details-save-bar')).toBeNull();
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
    expect(input(FIELDS.address).value).toBe('1 Main St');
  });

  it('remakes the link from the name, with no native tooltip', () => {
    render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.name), {
      target: { value: 'Ball Arena Denver!' },
    });
    const regenerate = screen.getByRole('button', {
      name: FIELDS.link.regenerate,
    });
    expect(regenerate.hasAttribute('title')).toBe(false);
    fireEvent.click(regenerate);
    expect(input(FIELDS.link.label).value).toBe('ball-arena-denver');
  });

  it('a stored value the rules refuse never blocks saving another field', async () => {
    render(
      <DetailsTab
        venue={{ ...venue, contactEmail: 'bookings at ballarena' }}
      />,
    );
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()]).toEqual(['address']);
  });

  it('keeps an edit when a newer row arrives, and takes the rest', () => {
    const { rerender } = render(<DetailsTab venue={venue} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    rerender(<DetailsTab venue={{ ...venue, neighborhood: 'LoDo' }} />);
    expect(input(FIELDS.address).value).toBe('1 Main St');
    expect(input(FIELDS.neighborhood).value).toBe('LoDo');
  });

  it('never sends About or City, which this tab does not edit yet', async () => {
    render(<DetailsTab venue={{ ...venue, city: '' }} />);
    fireEvent.change(input(FIELDS.address), { target: { value: '1 Main St' } });
    save();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentForm().keys()]).toEqual(['address']);
  });

  it('stacks the cards in the phone order: Venue, Tickets, Contact', () => {
    phone = true;
    render(<DetailsTab venue={venue} />);
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'));
    expect(titles).toEqual([
      COPY.cards.venue,
      COPY.cards.tickets,
      COPY.cards.contact,
    ]);
    // The cards take the phone padding, as Source's do.
    for (const id of ['details-venue', 'details-tickets', 'details-contact']) {
      expect(screen.getByTestId(id).style.padding).toBe('14px');
    }
  });

  it('the cards keep the desktop padding off a phone', () => {
    render(<DetailsTab venue={venue} />);
    expect(screen.getByTestId('details-venue').style.padding).toBe('16px 18px');
  });
});
