import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  ADD_VENUE_STEPS,
  EMPTY_BASICS,
  addVenueHref,
  basicsColumnsOf,
  basicsFormData,
  basicsOf,
  changedBasics,
  normalizeWebsite,
  saveErrorOf,
  stepNumber,
  validateBasics,
  type BasicsDraft,
} from './add-venue-rules';

const ERRORS = ADMIN_COPY.addVenue.errors;

const DAZZLE: BasicsDraft = {
  name: 'Dazzle',
  slug: 'dazzle',
  address: '1512 Curtis St, Denver',
  capacityType: 'club',
  capacity: '300',
  website: 'dazzledenver.com',
};

describe('stepNumber', () => {
  it('counts the five steps from one', () => {
    expect(ADD_VENUE_STEPS.map(stepNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('normalizeWebsite', () => {
  it.each([
    ['dazzledenver.com', 'https://dazzledenver.com'],
    ['  dazzledenver.com/events ', 'https://dazzledenver.com/events'],
    ['http://dazzledenver.com', 'http://dazzledenver.com'],
    ['dazzledenver.com:8080/events', 'https://dazzledenver.com:8080/events'],
  ])('takes %j as %j', (text, url) => {
    expect(normalizeWebsite(text)).toBe(url);
  });

  it.each([
    '',
    '   ',
    'localhost',
    'javascript:alert(1)',
    'ftp://x.com',
    'https://user:pw@dazzledenver.com',
    'mailto:hi@dazzledenver.com',
  ])('refuses %j', (text) => {
    expect(normalizeWebsite(text)).toBeNull();
  });
});

describe('validateBasics', () => {
  it('passes a full draft', () => {
    expect(validateBasics(DAZZLE)).toEqual({});
  });

  it('asks for a name, a link and a website on an empty draft', () => {
    expect(validateBasics(EMPTY_BASICS)).toEqual({
      name: ERRORS.nameRequired,
      slug: ERRORS.linkRequired,
      website: ERRORS.websiteRequired,
    });
  });

  it.each(['Dazzle', 'd', 'dazzle_denver', 'a'.repeat(61)])(
    'refuses the link %j',
    (slug) => {
      expect(validateBasics({ ...DAZZLE, slug }).slug).toBe(ERRORS.linkInvalid);
    },
  );

  it('refuses a capacity that is not a whole positive number', () => {
    expect(validateBasics({ ...DAZZLE, capacity: '3e2' }).capacity).toBe(
      ADMIN_COPY.venueDetails.fields.capacity.invalid,
    );
    expect(
      validateBasics({ ...DAZZLE, capacity: '' }).capacity,
    ).toBeUndefined();
  });

  it('refuses a website with no dotted host', () => {
    expect(validateBasics({ ...DAZZLE, website: 'dazzle' }).website).toBe(
      ERRORS.websiteInvalid,
    );
  });
});

describe('validateBasics link rule', () => {
  it.each([
    '-dazzle',
    'dazzle-',
    'd',
    'Dazzle',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ])('refuses the link %j, as the API would', (slug) => {
    expect(validateBasics({ ...DAZZLE, slug }).slug).toBe(ERRORS.linkInvalid);
  });

  it.each([
    'dz',
    'dazzle-jazz',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ])('takes the link %j', (slug) => {
    expect(validateBasics({ ...DAZZLE, slug }).slug).toBeUndefined();
  });
});

describe('saveErrorOf', () => {
  it('puts a taken link on the link', () => {
    expect(saveErrorOf({ field: 'slug', conflict: true })).toEqual({
      slug: ERRORS.linkTaken,
    });
  });

  it('puts a refused API field on its Basics input', () => {
    expect(saveErrorOf({ field: 'websiteUrl' })).toEqual({
      website: ERRORS.websiteInvalid,
    });
    expect(saveErrorOf({ field: 'slug' })).toEqual({
      slug: ERRORS.linkInvalid,
    });
  });

  it('leaves a refusal no Basics input owns to the form', () => {
    expect(saveErrorOf({})).toBeNull();
    expect(saveErrorOf({ field: 'crawlFrequency' })).toBeNull();
  });
});

describe('basicsColumnsOf', () => {
  it('writes the columns the API takes', () => {
    expect(basicsColumnsOf(DAZZLE)).toEqual({
      name: 'Dazzle',
      slug: 'dazzle',
      address: '1512 Curtis St, Denver',
      venueType: 'Club',
      capacity: 300,
      websiteUrl: 'https://dazzledenver.com',
    });
  });

  it('stores blanks as null', () => {
    expect(
      basicsColumnsOf({
        ...DAZZLE,
        address: ' ',
        capacityType: '',
        capacity: '',
      }),
    ).toMatchObject({ address: null, venueType: null, capacity: null });
  });
});

describe('basicsOf', () => {
  it('reads a saved draft back into the inputs', () => {
    expect(
      basicsOf({
        name: 'Dazzle',
        slug: 'dazzle',
        address: null,
        venueType: 'Jazz club',
        capacity: null,
        websiteUrl: 'https://dazzledenver.com/',
      }),
    ).toEqual({
      ...DAZZLE,
      address: '',
      capacity: '',
    });
  });

  it('round-trips a draft through its columns', () => {
    const cols = basicsColumnsOf(DAZZLE);
    expect(basicsColumnsOf(basicsOf({ ...cols }))).toEqual(cols);
  });
});

describe('changedBasics', () => {
  const saved = basicsColumnsOf(DAZZLE);

  it('sends every column before the first save', () => {
    expect(changedBasics(saved, null)).toHaveLength(6);
  });

  it('sends only what changed after it', () => {
    expect(changedBasics(saved, saved)).toEqual([]);
    expect(
      changedBasics(basicsColumnsOf({ ...DAZZLE, capacity: '450' }), saved),
    ).toEqual(['capacity']);
  });
});

describe('basicsFormData', () => {
  it('writes the chosen keys, an empty value for a null', () => {
    const cols = basicsColumnsOf({ ...DAZZLE, address: '' });
    const body = basicsFormData(cols, ['name', 'address']);
    expect([...body.entries()]).toEqual([
      ['name', 'Dazzle'],
      ['address', ''],
    ]);
  });
});

describe('addVenueHref', () => {
  it('points a reload back at the draft and step', () => {
    expect(addVenueHref('v-1', 'basics')).toBe(
      '/admin/venues/new?id=v-1&step=basics',
    );
  });
});
