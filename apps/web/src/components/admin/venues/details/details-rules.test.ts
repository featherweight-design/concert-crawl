import { describe, expect, it } from 'vitest';
import {
  applyColumns,
  changedColumns,
  detailsFieldOf,
  detailsFormData,
  draftOf,
  editedFields,
  formatPin,
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

  it('never sends a Source column or a crawl rule', () => {
    const draft = {
      ...draftOf(saved),
      name: 'Ball Arena Denver',
      about: 'New.',
    };
    const keys = changedColumns(draft, saved);
    const formData = detailsFormData(applyColumns(saved, draft, keys), keys);
    for (const key of ['websiteUrl', 'platform', 'crawlDelayMs', 'active']) {
      expect(formData.has(key)).toBe(false);
    }
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
    expect(validateDetails(draftOf(saved))).toEqual({});
  });

  it('names each bad field', () => {
    const errors = validateDetails({
      ...draftOf(saved),
      name: ' ',
      slug: '',
      mapPin: '39.7',
      capacity: '0',
      priceUrl: 'javascript:alert(1)',
      contactEmail: 'not-an-email',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'capacity',
      'contactEmail',
      'mapPin',
      'name',
      'priceUrl',
      'slug',
    ]);
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
