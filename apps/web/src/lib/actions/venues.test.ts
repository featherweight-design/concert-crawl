import { describe, expect, it } from 'vitest';

import { buildUpdateVenueBody } from './build-update-venue-body';

function formDataFrom(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe('buildUpdateVenueBody — API integration fields', () => {
  it('collapses empty apiProvider to null and forces apiAccountId null', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: '', apiAccountId: '1105' }),
    );
    expect(body.apiProvider).toBeNull();
    expect(body.apiAccountId).toBeNull();
  });

  it('leaves the browser-gate fields out when their keys are missing', () => {
    const body = buildUpdateVenueBody(formDataFrom({ crawlWaitUntil: 'load' }));
    expect(body.crawlWaitUntil).toBe('load');
    for (const key of [
      'crawlMode',
      'crawlWaitForSelector',
      'platform',
      'platformVenueId',
      'apiProvider',
      'apiAccountId',
    ]) {
      expect(body[key]).toBeUndefined();
    }
  });

  it('leaves active out when its key is missing', () => {
    expect(buildUpdateVenueBody(formDataFrom({})).active).toBeUndefined();
    expect(buildUpdateVenueBody(formDataFrom({ active: 'false' })).active).toBe(
      false,
    );
  });

  it('trims the account ID when a provider is selected', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '  1105  ' }),
    );
    expect(body.apiProvider).toBe('venuepilot');
    expect(body.apiAccountId).toBe('1105');
  });

  it('nulls the account ID when provider is set but the field is empty', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '' }),
    );
    expect(body.apiProvider).toBe('venuepilot');
    expect(body.apiAccountId).toBeNull();
  });

  // One tab's save sends only that tab's keys (3b part 6): a missing key never
  // turns into a null that would clear the column.
  it('leaves every field out when its key is missing', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ websiteUrl: ' https://gothic.example/events ' }),
    );
    expect(
      Object.entries(body).filter(([, value]) => value !== undefined),
    ).toEqual([['websiteUrl', 'https://gothic.example/events']]);
  });

  it('still clears a present, empty field to null', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ address: ' ', ticketVendor: '', extractionStrategy: '' }),
    );
    expect(body.address).toBeNull();
    expect(body.ticketVendor).toBeNull();
    expect(body.extractionStrategy).toBeNull();
  });

  it('never sends the request delay, which the crawl rules fix', () => {
    const body = buildUpdateVenueBody(formDataFrom({ crawlDelayMs: '1000' }));
    expect(body).not.toHaveProperty('crawlDelayMs');
  });

  it('nulls the account ID when provider is set but the field is whitespace', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '   ' }),
    );
    expect(body.apiProvider).toBe('venuepilot');
    expect(body.apiAccountId).toBeNull();
  });
});

describe('buildUpdateVenueBody — Details contact fields (3b part 5)', () => {
  it('sends the map pin as numbers and a trimmed contact email', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({
        lat: '39.7487',
        lng: '-105.0077',
        contactEmail: ' booking@ballarena.example ',
      }),
    );
    expect(body.lat).toBe(39.7487);
    expect(body.lng).toBe(-105.0077);
    expect(body.contactEmail).toBe('booking@ballarena.example');
  });

  it('clears both halves of the pin and the email when empty', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ lat: '', lng: '', contactEmail: '  ' }),
    );
    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
    expect(body.contactEmail).toBeNull();
  });

  it('leaves the pin and the email out when their keys are missing', () => {
    const body = buildUpdateVenueBody(formDataFrom({ name: 'Gothic' }));
    expect(body.lat).toBeUndefined();
    expect(body.lng).toBeUndefined();
    expect(body.contactEmail).toBeUndefined();
  });
});
