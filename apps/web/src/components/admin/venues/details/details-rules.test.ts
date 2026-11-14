import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  addressMapsUrl,
  applyColumns,
  changedColumns,
  detailsFieldOf,
  detailsFormData,
  draftOf,
  editedFields,
  formatPin,
  mapPinState,
  nearestCapacityType,
  parsePin,
  rebaseDraft,
  validateDetails,
  websiteHost,
  type DetailsColumns,
} from './details-rules';

const saved: DetailsColumns = {
  name: 'Ball Arena',
  slug: 'ballarena',
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

describe('nearestCapacityType (ruling f)', () => {
  it.each([
    ['Arena', 'arena'],
    ['theater', 'theater'],
    ['Amphitheater', 'outdoor'],
    ['Outdoor Pavilion', 'outdoor'],
    ['Music Hall', 'theater'],
    ['Concert Hall', 'theater'],
    ['Ballroom', 'theater'],
    ['Bar', 'club'],
    ['Nightclub', 'club'],
    ['Stadium', 'arena'],
    ['Art gallery', 'gallery'],
  ])('places %s as %s', (raw, type) => {
    expect(nearestCapacityType(raw)).toBe(type);
  });

  it.each(['Barn', 'Sparks', 'Ballpark Barbecue', 'Townhallway'])(
    'places a word only when whole: %s is unmapped',
    (raw) => {
      expect(nearestCapacityType(raw)).toBeNull();
    },
  );

  it('leaves an unplaceable or empty value unmapped', () => {
    expect(nearestCapacityType('Black box')).toBeNull();
    expect(nearestCapacityType('  ')).toBeNull();
    expect(nearestCapacityType(null)).toBeNull();
  });
});

describe('the map pin', () => {
  it('formats with the board’s minus and parses either minus back', () => {
    expect(formatPin(39.7487, -105.0077)).toBe('39.7487, −105.0077');
    expect(parsePin('39.7487, −105.0077')).toEqual({
      lat: 39.7487,
      lng: -105.0077,
    });
    expect(parsePin('39.7487 -105.0077')).toEqual({
      lat: 39.7487,
      lng: -105.0077,
    });
  });

  it('reads empty as a clear, and refuses half a pin or one out of range', () => {
    expect(parsePin(' ')).toEqual({ lat: null, lng: null });
    expect(parsePin('39.7')).toBeNull();
    expect(parsePin('91, 0')).toBeNull();
    expect(parsePin('0, 181')).toBeNull();
    expect(parsePin('north, west')).toBeNull();
  });

  it.each(['39.7487,', ',', ', -105.0077', '1e1, 2', '0x10, 0', '39.7487, .5'])(
    'refuses a missing or non-decimal half: %j',
    (text) => {
      expect(parsePin(text)).toBeNull();
    },
  );
});

describe('capacity', () => {
  const capacityError = (capacity: string) =>
    validateDetails({ ...draftOf(saved), capacity }, draftOf(saved)).capacity;

  it.each(['1e3', '0x10', '1e20', '2147483648', '12.5', '-4', '0'])(
    'refuses %s',
    (capacity) => {
      expect(capacityError(capacity)).toBeDefined();
    },
  );

  it.each(['1', '19,500', '2147483647', ' 900 '])('takes %s', (capacity) => {
    expect(capacityError(capacity)).toBeUndefined();
  });
});

describe('the draft and what a save sends', () => {
  it('an untouched draft changes nothing', () => {
    const draft = draftOf(saved);
    expect(draft.capacity).toBe('19,500');
    expect(editedFields(draft, draftOf(saved))).toEqual([]);
    expect(changedColumns(draft, saved)).toEqual([]);
  });

  it('a stored type outside the six shows as its nearest, and is not sent', () => {
    const row = { ...saved, venueType: 'Music Hall' };
    const draft = { ...draftOf(row), address: '1 Colfax Ave' };
    expect(draftOf(row).venueType).toBe('Theater');
    expect(changedColumns(draft, row)).toEqual(['address']);
    expect(applyColumns(row, draft, ['address']).venueType).toBe('Music Hall');
  });

  it('a stored type with no near setting is kept as typed', () => {
    expect(draftOf({ ...saved, venueType: 'Black box' }).venueType).toBe(
      'Black box',
    );
  });

  it('formatting alone is not an edit', () => {
    const draft = {
      ...draftOf(saved),
      capacity: '19500',
      mapPin: '39.7487,-105.0077',
    };
    expect(editedFields(draft, draftOf(saved))).toEqual([]);
    expect(changedColumns(draft, saved)).toEqual([]);
  });

  it('sends both halves of the pin when either changes', () => {
    const draft = { ...draftOf(saved), mapPin: '39.75, -105.0077' };
    const keys = changedColumns(draft, saved);
    expect(keys).toEqual(['lat', 'lng']);
    const formData = detailsFormData(applyColumns(saved, draft, keys), keys);
    expect(formData.get('lat')).toBe('39.75');
    expect(formData.get('lng')).toBe('-105.0077');
  });

  it('a cleared field sends empty, which the API stores as null', () => {
    const draft = { ...draftOf(saved), contactEmail: '', ticketVendor: '' };
    const keys = changedColumns(draft, saved);
    expect(keys).toEqual(['ticketVendor', 'contactEmail']);
    const formData = detailsFormData(applyColumns(saved, draft, keys), keys);
    expect(formData.get('contactEmail')).toBe('');
    expect(formData.get('ticketVendor')).toBe('');
  });
});

describe('rebaseDraft', () => {
  it('keeps the fields edited here and takes the rest from the newer row', () => {
    const oldSaved = draftOf(saved);
    const draft = { ...oldSaved, about: 'Edited here.' };
    const newer = draftOf({ ...saved, neighborhood: 'LoDo', about: 'Theirs.' });
    const next = rebaseDraft(draft, oldSaved, newer);
    expect(next.about).toBe('Edited here.');
    expect(next.neighborhood).toBe('LoDo');
  });
});

describe('validateDetails', () => {
  it('passes a saved row', () => {
    expect(validateDetails(draftOf(saved), draftOf(saved))).toEqual({});
  });

  it('names each bad field', () => {
    const errors = validateDetails(
      {
        ...draftOf(saved),
        name: ' ',
        slug: '',
        mapPin: '39.7',
        capacity: '0',
        priceUrl: 'javascript:alert(1)',
        contactEmail: 'not-an-email',
      },
      draftOf(saved),
    );
    expect(Object.keys(errors).sort()).toEqual([
      'capacity',
      'contactEmail',
      'mapPin',
      'name',
      'priceUrl',
      'slug',
    ]);
  });

  it('refuses an edited About over 280 characters, as the API does', () => {
    const pristine = draftOf(saved);
    expect(
      validateDetails({ ...pristine, about: 'a'.repeat(280) }, pristine),
    ).toEqual({});
    // Trimmed as it would send: surrounding spaces never count.
    expect(
      validateDetails({ ...pristine, about: ` ${'a'.repeat(280)} ` }, pristine),
    ).toEqual({});
    expect(
      validateDetails({ ...pristine, about: 'a'.repeat(281) }, pristine),
    ).toEqual({ about: ADMIN_COPY.venueDetails.errors.aboutTooLong });
  });

  it('checks only the edited fields, so a stored value it refuses never blocks another save', () => {
    const legacy = draftOf({
      ...saved,
      contactEmail: 'bookings at ballarena',
      priceUrl: 'ftp://ballarena.com/tickets',
    });
    const draft = { ...legacy, address: '1 Colfax Ave' };
    expect(validateDetails(draft, legacy)).toEqual({});
    expect(
      validateDetails({ ...draft, contactEmail: 'still bad' }, legacy),
    ).toEqual({ contactEmail: expect.any(String) });
  });
});

describe('detailsFieldOf', () => {
  it('lands the API’s field on its input, and ignores the rest', () => {
    expect(detailsFieldOf('slug')).toBe('slug');
    expect(detailsFieldOf('lat')).toBe('mapPin');
    expect(detailsFieldOf('lng')).toBe('mapPin');
    expect(detailsFieldOf('contactEmail')).toBe('contactEmail');
    expect(detailsFieldOf('websiteUrl')).toBeNull();
    expect(detailsFieldOf(undefined)).toBeNull();
  });
});

describe('websiteHost', () => {
  it('shows the site’s host, without www', () => {
    expect(websiteHost('https://www.ballarena.com/events')).toBe(
      'ballarena.com',
    );
    expect(websiteHost('not a url')).toBe('not a url');
  });
});

describe('addressMapsUrl', () => {
  it('opens the trimmed address as a Google Maps search', () => {
    expect(addressMapsUrl('  1000 Chopper Cir, Denver, CO 80204 ')).toBe(
      'https://maps.google.com/?q=1000%20Chopper%20Cir%2C%20Denver%2C%20CO%2080204',
    );
  });

  it('encodes what would break out of the query', () => {
    const url = addressMapsUrl('1 Main St #2 & Co?x=1/');
    expect(url).toBe(
      'https://maps.google.com/?q=1%20Main%20St%20%232%20%26%20Co%3Fx%3D1%2F',
    );
    expect(new URL(url ?? '').searchParams.get('q')).toBe(
      '1 Main St #2 & Co?x=1/',
    );
  });

  it('keeps a script scheme inside the query, never as the URL', () => {
    const url = addressMapsUrl('javascript:alert(1)');
    expect(url?.startsWith('https://maps.google.com/?q=')).toBe(true);
    expect(new URL(url ?? '').protocol).toBe('https:');
  });

  it('is null with no address', () => {
    expect(addressMapsUrl('')).toBeNull();
    expect(addressMapsUrl('   ')).toBeNull();
  });
});

describe('mapPinState', () => {
  it('reads set, not set and can’t read it, as drawn', () => {
    expect(mapPinState('39.7487, −105.0077', undefined)).toBe('set');
    expect(mapPinState('39.7487 -105.0077', undefined)).toBe('set');
    expect(mapPinState('', undefined)).toBe('notSet');
    expect(mapPinState('   ', undefined)).toBe('notSet');
    expect(mapPinState('39.7487 -105 1', undefined)).toBe('invalid');
    expect(mapPinState('91, 0', undefined)).toBe('invalid');
    expect(mapPinState('39.7487,', undefined)).toBe('invalid');
  });

  it('is invalid while the field shows its error', () => {
    expect(
      mapPinState(
        '39.7487, −105.0077',
        ADMIN_COPY.venueDetails.fields.mapPin.invalid,
      ),
    ).toBe('invalid');
  });
});
